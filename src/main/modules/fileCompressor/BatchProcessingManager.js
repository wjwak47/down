/**
 * BatchProcessingManager - 多文件批量处理管理器
 * 
 * 功能：
 * 1. 管理多文件队列处理
 * 2. 实现模式学习和共享
 * 3. 支持优先级调整
 * 4. 提供并发控制机制
 * 5. 跟踪处理进度和统计
 * 
 * Task 8.1: 创建批量处理管理器
 * - 设计文件队列系统
 * - 实现并发控制机制
 * - 添加进度跟踪功能
 */

import EventEmitter from 'events';
import path from 'path';
import fs from 'fs';

class BatchProcessingManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // 配置选项
        this.maxConcurrent = options.maxConcurrent || 2; // 最大并发处理数
        this.retryAttempts = options.retryAttempts || 3; // 重试次数
        this.timeout = options.timeout || 30 * 60 * 1000; // 30分钟超时
        
        // 队列管理
        this.queue = []; // 待处理文件队列
        this.processing = new Map(); // 正在处理的文件
        this.completed = []; // 已完成的文件
        this.failed = []; // 失败的文件
        
        // 统计信息
        this.stats = {
            totalFiles: 0,
            processedFiles: 0,
            successfulFiles: 0,
            failedFiles: 0,
            totalPasswords: 0,
            foundPasswords: 0,
            startTime: null,
            endTime: null
        };
        
        // 模式学习系统
        this.learnedPatterns = new Map(); // 学习到的密码模式
        this.patternSuccess = new Map(); // 模式成功率统计
        
        // 状态管理
        this.isRunning = false;
        this.isPaused = false;
        this.shouldStop = false;
    }

    /**
     * 添加文件到处理队列
     * @param {string} filePath - 文件路径
     * @param {Object} options - 处理选项
     * @param {number} priority - 优先级 (1-10, 10最高)
     */
    addFile(filePath, options = {}, priority = 5) {
        const fileItem = {
            id: this._generateId(),
            filePath,
            fileName: path.basename(filePath),
            options: {
                attackMode: 'smart',
                charset: ['lowercase', 'numbers'],
                minLength: 1,
                maxLength: 8,
                useGpu: false,
                useCpuMultiThread: true,
                ...options
            },
            priority,
            status: 'queued',
            addedAt: new Date(),
            startedAt: null,
            completedAt: null,
            result: null,
            error: null,
            retryCount: 0,
            progress: {
                phase: 'queued',
                percent: 0,
                speed: 0,
                eta: 0,
                tested: 0,
                total: 0
            }
        };

        // 按优先级插入队列
        this._insertByPriority(fileItem);
        this.stats.totalFiles++;
        
        this.emit('fileAdded', fileItem);
        
        // 如果正在运行，尝试开始处理
        if (this.isRunning && !this.isPaused) {
            this._processNext();
        }
        
        return fileItem.id;
    }

    /**
     * 批量添加文件
     * @param {Array} files - 文件数组 [{filePath, options, priority}]
     */
    addFiles(files) {
        const ids = [];
        for (const file of files) {
            const id = this.addFile(file.filePath, file.options, file.priority);
            ids.push(id);
        }
        return ids;
    }

    /**
     * 开始批量处理
     */
    async start() {
        if (this.isRunning) {
            throw new Error('Batch processing is already running');
        }
        
        this.isRunning = true;
        this.isPaused = false;
        this.shouldStop = false;
        this.stats.startTime = new Date();
        
        this.emit('started');
        
        // 开始处理队列
        for (let i = 0; i < this.maxConcurrent; i++) {
            this._processNext();
        }
    }

    /**
     * 暂停批量处理
     */
    pause() {
        if (!this.isRunning || this.isPaused) {
            return;
        }
        
        this.isPaused = true;
        this.emit('paused');
        
        // 暂停所有正在处理的任务
        for (const [id, task] of this.processing) {
            if (task.crackProcess && task.crackProcess.pause) {
                task.crackProcess.pause();
            }
        }
    }

    /**
     * 恢复批量处理
     */
    resume() {
        if (!this.isRunning || !this.isPaused) {
            return;
        }
        
        this.isPaused = false;
        this.emit('resumed');
        
        // 恢复所有正在处理的任务
        for (const [id, task] of this.processing) {
            if (task.crackProcess && task.crackProcess.resume) {
                task.crackProcess.resume();
            }
        }
        
        // 继续处理队列
        this._processNext();
    }

    /**
     * 停止批量处理
     */
    async stop() {
        this.shouldStop = true;
        this.isPaused = false;
        
        // 停止所有正在处理的任务
        const stopPromises = [];
        for (const [id, task] of this.processing) {
            if (task.crackProcess && task.crackProcess.stop) {
                stopPromises.push(task.crackProcess.stop());
            }
        }
        
        await Promise.all(stopPromises);
        
        this.isRunning = false;
        this.stats.endTime = new Date();
        
        this.emit('stopped');
    }

    /**
     * 移除队列中的文件
     * @param {string} fileId - 文件ID
     */
    removeFile(fileId) {
        // 从队列中移除
        const queueIndex = this.queue.findIndex(item => item.id === fileId);
        if (queueIndex !== -1) {
            const removed = this.queue.splice(queueIndex, 1)[0];
            this.stats.totalFiles--;
            this.emit('fileRemoved', removed);
            return true;
        }
        
        // 如果正在处理，停止处理
        if (this.processing.has(fileId)) {
            const task = this.processing.get(fileId);
            if (task.crackProcess && task.crackProcess.stop) {
                task.crackProcess.stop();
            }
            this.processing.delete(fileId);
            this.emit('fileRemoved', task.fileItem);
            return true;
        }
        
        return false;
    }

    /**
     * 调整文件优先级
     * @param {string} fileId - 文件ID
     * @param {number} newPriority - 新优先级
     */
    setPriority(fileId, newPriority) {
        const queueIndex = this.queue.findIndex(item => item.id === fileId);
        if (queueIndex !== -1) {
            const item = this.queue.splice(queueIndex, 1)[0];
            item.priority = newPriority;
            this._insertByPriority(item);
            this.emit('priorityChanged', item);
            return true;
        }
        return false;
    }

    /**
     * 获取队列状态
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            queue: this.queue.map(item => ({
                id: item.id,
                fileName: item.fileName,
                priority: item.priority,
                status: item.status,
                addedAt: item.addedAt
            })),
            processing: Array.from(this.processing.values()).map(task => ({
                id: task.fileItem.id,
                fileName: task.fileItem.fileName,
                progress: task.fileItem.progress,
                startedAt: task.fileItem.startedAt
            })),
            completed: this.completed.map(item => ({
                id: item.id,
                fileName: item.fileName,
                result: item.result,
                completedAt: item.completedAt
            })),
            failed: this.failed.map(item => ({
                id: item.id,
                fileName: item.fileName,
                error: item.error,
                completedAt: item.completedAt
            })),
            stats: { ...this.stats }
        };
    }

    /**
     * 获取学习到的模式
     */
    getLearnedPatterns() {
        const patterns = [];
        for (const [pattern, data] of this.learnedPatterns) {
            const successRate = this.patternSuccess.get(pattern) || { attempts: 0, successes: 0 };
            patterns.push({
                pattern,
                ...data,
                successRate: successRate.attempts > 0 ? successRate.successes / successRate.attempts : 0,
                attempts: successRate.attempts,
                successes: successRate.successes
            });
        }
        return patterns.sort((a, b) => b.successRate - a.successRate);
    }

    /**
     * 应用学习到的模式到新文件
     * @param {Object} fileItem - 文件项
     */
    _applyLearnedPatterns(fileItem) {
        const fileName = fileItem.fileName.toLowerCase();
        const patterns = this.getLearnedPatterns();
        
        // 基于文件名特征匹配模式
        for (const pattern of patterns) {
            if (pattern.successRate > 0.3) { // 成功率超过30%的模式
                // 根据模式调整攻击参数
                if (pattern.type === 'length') {
                    fileItem.options.minLength = Math.max(1, pattern.minLength - 1);
                    fileItem.options.maxLength = Math.min(20, pattern.maxLength + 1);
                } else if (pattern.type === 'charset') {
                    fileItem.options.charset = [...pattern.charset];
                } else if (pattern.type === 'format') {
                    // 应用格式模式（如日期、数字等）
                    fileItem.options.customPatterns = pattern.patterns;
                }
            }
        }
    }

    /**
     * 学习成功的密码模式
     * @param {Object} fileItem - 文件项
     * @param {string} password - 找到的密码
     */
    _learnFromSuccess(fileItem, password) {
        // 分析密码特征
        const patterns = this._analyzePassword(password, fileItem.fileName);
        
        for (const pattern of patterns) {
            const key = pattern.type + ':' + pattern.signature;
            
            // 更新模式数据
            if (!this.learnedPatterns.has(key)) {
                this.learnedPatterns.set(key, pattern);
            }
            
            // 更新成功率统计
            const stats = this.patternSuccess.get(key) || { attempts: 0, successes: 0 };
            stats.successes++;
            this.patternSuccess.set(key, stats);
        }
        
        this.emit('patternLearned', { fileItem, password, patterns });
    }

    /**
     * 分析密码模式
     * @private
     */
    _analyzePassword(password, fileName) {
        const patterns = [];
        
        // 长度模式
        patterns.push({
            type: 'length',
            signature: `len_${password.length}`,
            minLength: password.length,
            maxLength: password.length,
            confidence: 0.8
        });
        
        // 字符集模式
        const charset = [];
        if (/[a-z]/.test(password)) charset.push('lowercase');
        if (/[A-Z]/.test(password)) charset.push('uppercase');
        if (/[0-9]/.test(password)) charset.push('numbers');
        if (/[^a-zA-Z0-9]/.test(password)) charset.push('special');
        
        patterns.push({
            type: 'charset',
            signature: charset.sort().join('_'),
            charset,
            confidence: 0.7
        });
        
        // 格式模式（日期、数字等）
        if (/^\d{4}$/.test(password)) {
            patterns.push({
                type: 'format',
                signature: 'year_4digit',
                patterns: ['YYYY'],
                confidence: 0.9
            });
        } else if (/^\d{6}$/.test(password)) {
            patterns.push({
                type: 'format',
                signature: 'date_6digit',
                patterns: ['YYMMDD', 'DDMMYY'],
                confidence: 0.8
            });
        }
        
        return patterns;
    }

    /**
     * 按优先级插入队列
     * @private
     */
    _insertByPriority(item) {
        let inserted = false;
        for (let i = 0; i < this.queue.length; i++) {
            if (item.priority > this.queue[i].priority) {
                this.queue.splice(i, 0, item);
                inserted = true;
                break;
            }
        }
        if (!inserted) {
            this.queue.push(item);
        }
    }

    /**
     * 处理下一个文件
     * @private
     */
    async _processNext() {
        if (this.shouldStop || this.isPaused || this.processing.size >= this.maxConcurrent) {
            return;
        }
        
        if (this.queue.length === 0) {
            // 检查是否所有任务都完成
            if (this.processing.size === 0 && this.isRunning) {
                this.isRunning = false;
                this.stats.endTime = new Date();
                this.emit('completed');
            }
            return;
        }
        
        const fileItem = this.queue.shift();
        fileItem.status = 'processing';
        fileItem.startedAt = new Date();
        
        // 应用学习到的模式
        this._applyLearnedPatterns(fileItem);
        
        const task = {
            fileItem,
            crackProcess: null
        };
        
        this.processing.set(fileItem.id, task);
        this.emit('fileStarted', fileItem);
        
        try {
            const result = await this._processFile(fileItem);
            await this._handleFileComplete(fileItem, result);
        } catch (error) {
            await this._handleFileError(fileItem, error);
        }
        
        // 继续处理下一个文件
        this._processNext();
    }

    /**
     * 处理单个文件
     * @private
     */
    async _processFile(fileItem) {
        // 这里需要集成到现有的密码破解系统
        // 返回一个Promise，当破解完成时resolve
        return new Promise((resolve, reject) => {
            // 模拟破解过程
            // 实际实现中需要调用现有的破解API
            const mockCrackProcess = {
                pause: () => console.log(`Paused ${fileItem.fileName}`),
                resume: () => console.log(`Resumed ${fileItem.fileName}`),
                stop: () => {
                    clearTimeout(timer);
                    reject(new Error('Stopped by user'));
                }
            };
            
            const task = this.processing.get(fileItem.id);
            if (task) {
                task.crackProcess = mockCrackProcess;
            }
            
            // 模拟进度更新
            let progress = 0;
            const updateProgress = () => {
                if (this.shouldStop || !this.processing.has(fileItem.id)) {
                    return;
                }
                
                progress += Math.random() * 10;
                fileItem.progress = {
                    phase: 'cracking',
                    percent: Math.min(progress, 100),
                    speed: Math.floor(Math.random() * 1000),
                    eta: Math.max(0, (100 - progress) * 2),
                    tested: Math.floor(progress * 100),
                    total: 10000
                };
                
                this.emit('fileProgress', fileItem);
                
                if (progress < 100 && !this.shouldStop) {
                    setTimeout(updateProgress, 1000);
                } else if (progress >= 100) {
                    // 模拟找到密码
                    const foundPassword = Math.random() > 0.5 ? 'password123' : null;
                    resolve({
                        success: !!foundPassword,
                        password: foundPassword,
                        tested: fileItem.progress.tested
                    });
                }
            };
            
            const timer = setTimeout(updateProgress, 1000);
        });
    }

    /**
     * 处理文件完成
     * @private
     */
    async _handleFileComplete(fileItem, result) {
        fileItem.status = result.success ? 'completed' : 'failed';
        fileItem.completedAt = new Date();
        fileItem.result = result;
        
        this.processing.delete(fileItem.id);
        this.stats.processedFiles++;
        
        if (result.success) {
            this.stats.successfulFiles++;
            this.stats.foundPasswords++;
            this.completed.push(fileItem);
            
            // 学习成功的模式
            if (result.password) {
                this._learnFromSuccess(fileItem, result.password);
            }
            
            this.emit('fileCompleted', fileItem);
        } else {
            this.stats.failedFiles++;
            this.failed.push(fileItem);
            this.emit('fileFailed', fileItem);
        }
        
        this.stats.totalPasswords += result.tested || 0;
    }

    /**
     * 处理文件错误
     * @private
     */
    async _handleFileError(fileItem, error) {
        fileItem.retryCount++;
        
        if (fileItem.retryCount < this.retryAttempts) {
            // 重试
            fileItem.status = 'queued';
            fileItem.error = null;
            this._insertByPriority(fileItem);
            this.processing.delete(fileItem.id);
            this.emit('fileRetry', fileItem);
        } else {
            // 失败
            fileItem.status = 'failed';
            fileItem.completedAt = new Date();
            fileItem.error = error.message;
            
            this.processing.delete(fileItem.id);
            this.stats.processedFiles++;
            this.stats.failedFiles++;
            this.failed.push(fileItem);
            
            this.emit('fileFailed', fileItem);
        }
    }

    /**
     * 生成唯一ID
     * @private
     */
    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

export default BatchProcessingManager;