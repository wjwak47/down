/**
 * CrackWorkerThread - 密码破解工作线程
 * 
 * 功能：
 * 1. 执行密码破解任务
 * 2. 性能监控和报告
 * 3. 错误处理和恢复
 * 4. 资源管理
 */

import { parentPort, workerData } from 'worker_threads';
import crypto from 'crypto';

class CrackWorkerThread {
    constructor(workerId, options) {
        this.workerId = workerId;
        this.options = options;
        
        // 工作线程状态
        this.isReady = false;
        this.currentTask = null;
        this.taskStartTime = null;
        
        // 性能统计
        this.stats = {
            tasksCompleted: 0,
            totalExecutionTime: 0,
            averageExecutionTime: 0,
            passwordsPerSecond: 0,
            lastUpdate: Date.now()
        };
        
        // 初始化
        this.initialize();
    }
    
    /**
     * 初始化工作线程
     */
    initialize() {
        console.log(`[CrackWorker ${this.workerId}] 工作线程初始化`);
        
        // 监听主线程消息
        parentPort.on('message', (message) => {
            this.handleMessage(message);
        });
        
        // 发送就绪信号
        this.sendMessage('workerReady', { workerId: this.workerId });
        this.isReady = true;
        
        // 启动性能监控
        this.startPerformanceMonitoring();
    }
    
    /**
     * 处理主线程消息
     */
    async handleMessage(message) {
        const { type, data } = message;
        
        try {
            switch (type) {
                case 'executeTask':
                    await this.executeTask(data);
                    break;
                    
                case 'terminate':
                    this.terminate();
                    break;
                    
                default:
                    console.warn(`[CrackWorker ${this.workerId}] 未知消息类型: ${type}`);
            }
        } catch (error) {
            console.error(`[CrackWorker ${this.workerId}] 处理消息失败:`, error);
        }
    }
    
    /**
     * 执行密码破解任务
     */
    async executeTask(data) {
        const { taskId, task, timeout } = data;
        
        console.log(`[CrackWorker ${this.workerId}] 开始执行任务 ${taskId}`);
        
        this.currentTask = taskId;
        this.taskStartTime = Date.now();
        
        try {
            // 设置超时
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('任务超时')), timeout);
            });
            
            // 执行任务
            const taskPromise = this.performPasswordCracking(task);
            
            // 等待任务完成或超时
            const result = await Promise.race([taskPromise, timeoutPromise]);
            
            const executionTime = Date.now() - this.taskStartTime;
            
            // 更新统计
            this.updateStats(executionTime, result.passwordsTested || 0);
            
            // 发送完成消息
            this.sendMessage('taskCompleted', {
                taskId,
                result,
                executionTime
            });
            
            console.log(`[CrackWorker ${this.workerId}] 任务 ${taskId} 完成，耗时 ${executionTime}ms`);
            
        } catch (error) {
            const executionTime = Date.now() - this.taskStartTime;
            
            // 发送失败消息
            this.sendMessage('taskFailed', {
                taskId,
                error: error.message,
                executionTime
            });
            
            console.error(`[CrackWorker ${this.workerId}] 任务 ${taskId} 失败:`, error.message);
            
        } finally {
            this.currentTask = null;
            this.taskStartTime = null;
        }
    }
    
    /**
     * 执行密码破解
     */
    async performPasswordCracking(task) {
        const { type, data } = task;
        
        switch (type) {
            case 'bruteforce':
                return await this.bruteForceCrack(data);
                
            case 'dictionary':
                return await this.dictionaryCrack(data);
                
            case 'mask':
                return await this.maskCrack(data);
                
            case 'ai_generated':
                return await this.aiGeneratedCrack(data);
                
            default:
                throw new Error(`不支持的任务类型: ${type}`);
        }
    }
    
    /**
     * 暴力破解
     */
    async bruteForceCrack(data) {
        const { charset, minLength, maxLength, target, batchSize = 1000 } = data;
        
        let passwordsTested = 0;
        let found = false;
        let foundPassword = null;
        
        for (let length = minLength; length <= maxLength && !found; length++) {
            const combinations = this.generateCombinations(charset, length);
            
            for (let i = 0; i < combinations.length && !found; i += batchSize) {
                const batch = combinations.slice(i, i + batchSize);
                
                for (const password of batch) {
                    passwordsTested++;
                    
                    if (await this.testPassword(password, target)) {
                        found = true;
                        foundPassword = password;
                        break;
                    }
                    
                    // 检查是否需要让出CPU
                    if (passwordsTested % 10000 === 0) {
                        await this.yield();
                    }
                }
            }
        }
        
        return {
            found,
            password: foundPassword,
            passwordsTested,
            method: 'bruteforce'
        };
    }
    
    /**
     * 字典攻击
     */
    async dictionaryCrack(data) {
        const { passwords, target, transformations = [] } = data;
        
        let passwordsTested = 0;
        let found = false;
        let foundPassword = null;
        
        for (const basePassword of passwords) {
            // 测试原始密码
            passwordsTested++;
            if (await this.testPassword(basePassword, target)) {
                found = true;
                foundPassword = basePassword;
                break;
            }
            
            // 测试变换后的密码
            for (const transform of transformations) {
                const transformedPassword = this.applyTransformation(basePassword, transform);
                passwordsTested++;
                
                if (await this.testPassword(transformedPassword, target)) {
                    found = true;
                    foundPassword = transformedPassword;
                    break;
                }
            }
            
            if (found) break;
            
            // 检查是否需要让出CPU
            if (passwordsTested % 1000 === 0) {
                await this.yield();
            }
        }
        
        return {
            found,
            password: foundPassword,
            passwordsTested,
            method: 'dictionary'
        };
    }
    
    /**
     * 掩码攻击
     */
    async maskCrack(data) {
        const { mask, target, customCharsets = {} } = data;
        
        const passwords = this.generateMaskPasswords(mask, customCharsets);
        let passwordsTested = 0;
        let found = false;
        let foundPassword = null;
        
        for (const password of passwords) {
            passwordsTested++;
            
            if (await this.testPassword(password, target)) {
                found = true;
                foundPassword = password;
                break;
            }
            
            // 检查是否需要让出CPU
            if (passwordsTested % 1000 === 0) {
                await this.yield();
            }
        }
        
        return {
            found,
            password: foundPassword,
            passwordsTested,
            method: 'mask'
        };
    }
    
    /**
     * AI生成密码攻击
     */
    async aiGeneratedCrack(data) {
        const { passwords, target } = data;
        
        let passwordsTested = 0;
        let found = false;
        let foundPassword = null;
        
        for (const password of passwords) {
            passwordsTested++;
            
            if (await this.testPassword(password, target)) {
                found = true;
                foundPassword = password;
                break;
            }
            
            // 检查是否需要让出CPU
            if (passwordsTested % 100 === 0) {
                await this.yield();
            }
        }
        
        return {
            found,
            password: foundPassword,
            passwordsTested,
            method: 'ai_generated'
        };
    }
    
    /**
     * 测试密码
     */
    async testPassword(password, target) {
        // 模拟密码测试（实际实现会调用具体的破解工具）
        const hash = crypto.createHash('md5').update(password).digest('hex');
        
        // 模拟一些计算延迟
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2));
        
        return hash === target.hash;
    }
    
    /**
     * 生成字符组合
     */
    generateCombinations(charset, length) {
        const combinations = [];
        
        function generate(current, remaining) {
            if (remaining === 0) {
                combinations.push(current);
                return;
            }
            
            for (const char of charset) {
                generate(current + char, remaining - 1);
            }
        }
        
        generate('', length);
        return combinations;
    }
    
    /**
     * 应用密码变换
     */
    applyTransformation(password, transformation) {
        switch (transformation.type) {
            case 'uppercase':
                return password.toUpperCase();
                
            case 'lowercase':
                return password.toLowerCase();
                
            case 'capitalize':
                return password.charAt(0).toUpperCase() + password.slice(1).toLowerCase();
                
            case 'append':
                return password + transformation.value;
                
            case 'prepend':
                return transformation.value + password;
                
            case 'leet':
                return this.applyLeetSpeak(password);
                
            default:
                return password;
        }
    }
    
    /**
     * 应用Leet Speak变换
     */
    applyLeetSpeak(password) {
        const leetMap = {
            'a': '@', 'A': '@',
            'e': '3', 'E': '3',
            'i': '1', 'I': '1',
            'o': '0', 'O': '0',
            's': '5', 'S': '5',
            't': '7', 'T': '7'
        };
        
        return password.split('').map(char => leetMap[char] || char).join('');
    }
    
    /**
     * 生成掩码密码
     */
    generateMaskPasswords(mask, customCharsets) {
        const charsets = {
            '?l': 'abcdefghijklmnopqrstuvwxyz',
            '?u': 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            '?d': '0123456789',
            '?s': '!@#$%^&*()_+-=[]{}|;:,.<>?',
            '?a': 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?',
            ...customCharsets
        };
        
        const passwords = [];
        
        function generate(pattern, current) {
            if (pattern.length === 0) {
                passwords.push(current);
                return;
            }
            
            if (pattern.startsWith('?')) {
                const placeholder = pattern.substring(0, 2);
                const charset = charsets[placeholder];
                
                if (charset) {
                    for (const char of charset) {
                        generate(pattern.substring(2), current + char);
                    }
                } else {
                    // 未知占位符，跳过
                    generate(pattern.substring(2), current + pattern[0]);
                }
            } else {
                // 固定字符
                generate(pattern.substring(1), current + pattern[0]);
            }
        }
        
        generate(mask, '');
        return passwords;
    }
    
    /**
     * 更新统计信息
     */
    updateStats(executionTime, passwordsTested) {
        this.stats.tasksCompleted++;
        this.stats.totalExecutionTime += executionTime;
        this.stats.averageExecutionTime = this.stats.totalExecutionTime / this.stats.tasksCompleted;
        
        if (executionTime > 0) {
            this.stats.passwordsPerSecond = (passwordsTested / executionTime) * 1000;
        }
        
        this.stats.lastUpdate = Date.now();
    }
    
    /**
     * 启动性能监控
     */
    startPerformanceMonitoring() {
        setInterval(() => {
            this.sendMessage('performanceUpdate', {
                workerId: this.workerId,
                stats: { ...this.stats },
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            });
        }, 5000); // 每5秒报告一次
    }
    
    /**
     * 让出CPU时间
     */
    async yield() {
        return new Promise(resolve => setImmediate(resolve));
    }
    
    /**
     * 发送消息到主线程
     */
    sendMessage(type, data) {
        parentPort.postMessage({ type, data });
    }
    
    /**
     * 终止工作线程
     */
    terminate() {
        console.log(`[CrackWorker ${this.workerId}] 工作线程终止`);
        process.exit(0);
    }
}

// 启动工作线程
const { workerId, options } = workerData;
new CrackWorkerThread(workerId, options);