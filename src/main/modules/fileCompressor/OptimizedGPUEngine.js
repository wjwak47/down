/**
 * OptimizedGPUEngine - 优化的GPU破解引擎
 * 
 * 功能：
 * 1. 集成动态相位跳跃机制
 * 2. 候选密码缓存系统
 * 3. 批量处理优化
 * 4. 效率检测算法
 * 
 * 设计原则：
 * - 向后兼容现有GPU破解流程
 * - 最小化性能开销
 * - 智能优化决策
 * - 错误隔离和恢复
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import EventEmitter from 'events';
import DynamicPhaseSkipper from './DynamicPhaseSkipper.js';

class OptimizedGPUEngine extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            enablePhaseSkipping: true,
            enableCandidateCache: true,
            enableBatchOptimization: true,
            cacheSize: 10000,
            batchSize: 1000,
            maxConcurrentProcesses: 2,
            ...options
        };
        
        // 组件初始化
        this.phaseSkipper = null;
        this.candidateCache = new Map();
        this.batchQueue = [];
        this.activeProcesses = new Map();
        
        // 状态管理
        this.isInitialized = false;
        this.currentSession = null;
        this.performanceMetrics = {
            totalPasswordsTested: 0,
            totalTimeSpent: 0,
            phasesSkipped: 0,
            cacheHits: 0,
            averageEfficiency: 0
        };
        
        // GPU工具路径
        this.hashcatPath = null;
        this.gpuAvailable = false;
        
        console.log('[OptimizedGPUEngine] 初始化优化GPU引擎');
    }
    
    /**
     * 初始化引擎
     */
    async initialize() {
        try {
            console.log('[OptimizedGPUEngine] 开始初始化...');
            
            // 检测GPU和工具可用性
            await this.detectGPUCapabilities();
            
            // 初始化动态相位跳跃器
            if (this.options.enablePhaseSkipping) {
                this.phaseSkipper = new DynamicPhaseSkipper({
                    learningEnabled: true,
                    baseTimeouts: {
                        short_passwords: 30000,
                        common_passwords: 60000,
                        dictionary_attack: 120000,
                        ai_generation: 300000,
                        mask_attack: 600000,
                        bruteforce: 1800000
                    }
                });
                
                // 监听相位跳跃事件
                this.phaseSkipper.on('phaseSkipped', (data) => {
                    this.performanceMetrics.phasesSkipped++;
                    this.emit('phaseSkipped', data);
                });
                
                this.phaseSkipper.on('phaseCompleted', (data) => {
                    this.emit('phaseCompleted', data);
                });
                
                console.log('[OptimizedGPUEngine] 动态相位跳跃器已初始化');
            }
            
            // 初始化候选密码缓存
            if (this.options.enableCandidateCache) {
                this.initializeCandidateCache();
                console.log('[OptimizedGPUEngine] 候选密码缓存已初始化');
            }
            
            this.isInitialized = true;
            console.log('[OptimizedGPUEngine] 初始化完成');
            
            return { success: true, gpuAvailable: this.gpuAvailable };
            
        } catch (error) {
            console.error('[OptimizedGPUEngine] 初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 检测GPU能力
     */
    async detectGPUCapabilities() {
        try {
            // 检测Hashcat
            const hashcatPaths = this.getHashcatPaths();
            
            for (const hashcatPath of hashcatPaths) {
                try {
                    await fs.access(hashcatPath);
                    this.hashcatPath = hashcatPath;
                    break;
                } catch (e) {
                    continue;
                }
            }
            
            if (!this.hashcatPath) {
                console.warn('[OptimizedGPUEngine] Hashcat未找到，GPU功能不可用');
                this.gpuAvailable = false;
                return;
            }
            
            // 测试GPU可用性
            const gpuTest = await this.testGPUAvailability();
            this.gpuAvailable = gpuTest.success;
            
            if (this.gpuAvailable) {
                console.log(`[OptimizedGPUEngine] GPU可用 - ${gpuTest.deviceCount} 个设备`);
            } else {
                console.warn('[OptimizedGPUEngine] GPU不可用，将回退到CPU模式');
            }
            
        } catch (error) {
            console.error('[OptimizedGPUEngine] GPU检测失败:', error);
            this.gpuAvailable = false;
        }
    }
    
    /**
     * 获取Hashcat路径
     */
    getHashcatPaths() {
        const platform = os.platform();
        const paths = [];
        
        if (platform === 'win32') {
            paths.push('C:\\Program Files\\hashcat\\hashcat.exe');
            paths.push('C:\\hashcat\\hashcat.exe');
            paths.push('hashcat.exe');
        } else if (platform === 'darwin') {
            paths.push('/opt/homebrew/bin/hashcat');
            paths.push('/usr/local/bin/hashcat');
            paths.push('/usr/bin/hashcat');
            paths.push('hashcat');
        } else {
            paths.push('/usr/bin/hashcat');
            paths.push('/usr/local/bin/hashcat');
            paths.push('hashcat');
        }
        
        return paths;
    }
    
    /**
     * 测试GPU可用性
     */
    async testGPUAvailability() {
        return new Promise((resolve) => {
            const proc = spawn(this.hashcatPath, ['--help'], {
                stdio: ['ignore', 'pipe', 'pipe'],
                windowsHide: true
            });
            
            let output = '';
            proc.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            proc.on('close', (code) => {
                if (code === 0) {
                    // 简单检测：如果help命令成功，假设GPU可用
                    resolve({ success: true, deviceCount: 1 });
                } else {
                    resolve({ success: false, deviceCount: 0 });
                }
            });
            
            proc.on('error', () => {
                resolve({ success: false, deviceCount: 0 });
            });
            
            // 超时处理
            setTimeout(() => {
                try { proc.kill(); } catch (e) {}
                resolve({ success: false, deviceCount: 0 });
            }, 5000);
        });
    }
    
    /**
     * 开始优化的GPU破解会话
     */
    async startOptimizedCrackingSession(context) {
        if (!this.isInitialized) {
            throw new Error('引擎未初始化');
        }
        
        console.log('[OptimizedGPUEngine] 开始优化破解会话');
        
        this.currentSession = {
            id: this.generateSessionId(),
            context,
            startTime: Date.now(),
            phases: [],
            currentPhase: null,
            status: 'running'
        };
        
        // 分析破解上下文
        const analysis = await this.analyzeContext(context);
        
        // 生成优化的相位序列
        const optimizedPhases = this.generateOptimizedPhases(analysis);
        
        this.currentSession.phases = optimizedPhases;
        
        this.emit('sessionStarted', {
            sessionId: this.currentSession.id,
            phases: optimizedPhases,
            analysis
        });
        
        return {
            sessionId: this.currentSession.id,
            phases: optimizedPhases,
            gpuAvailable: this.gpuAvailable
        };
    }
    
    /**
     * 执行优化的相位破解
     */
    async runOptimizedPhase(phaseName, phaseConfig) {
        if (!this.currentSession) {
            throw new Error('没有活跃的破解会话');
        }
        
        console.log(`[OptimizedGPUEngine] 开始执行优化相位: ${phaseName}`);
        
        this.currentSession.currentPhase = phaseName;
        
        // 启动相位监控
        let skipperResult = null;
        if (this.phaseSkipper) {
            skipperResult = this.phaseSkipper.startPhaseMonitoring(phaseName, {
                ...this.currentSession.context,
                phaseConfig
            });
        }
        
        try {
            // 检查缓存
            const cachedResult = await this.checkCandidateCache(phaseName, phaseConfig);
            if (cachedResult.found) {
                console.log(`[OptimizedGPUEngine] 缓存命中: ${cachedResult.password}`);
                this.performanceMetrics.cacheHits++;
                
                if (this.phaseSkipper) {
                    this.phaseSkipper.completeCurrentPhase(true, cachedResult.password);
                }
                
                return {
                    success: true,
                    password: cachedResult.password,
                    source: 'cache',
                    duration: 0
                };
            }
            
            // 执行实际的GPU破解
            const result = await this.executeGPUPhase(phaseName, phaseConfig);
            
            // 更新缓存
            if (result.success && this.options.enableCandidateCache) {
                this.updateCandidateCache(phaseName, phaseConfig, result.password);
            }
            
            // 完成相位监控
            if (this.phaseSkipper) {
                this.phaseSkipper.completeCurrentPhase(result.success, result.password);
            }
            
            // 更新性能指标
            this.updatePerformanceMetrics(result);
            
            return result;
            
        } catch (error) {
            console.error(`[OptimizedGPUEngine] 相位执行失败: ${phaseName}`, error);
            
            if (this.phaseSkipper) {
                this.phaseSkipper.completeCurrentPhase(false);
            }
            
            throw error;
        }
    }
    
    /**
     * 执行GPU相位
     */
    async executeGPUPhase(phaseName, phaseConfig) {
        const startTime = Date.now();
        
        if (!this.gpuAvailable) {
            throw new Error('GPU不可用');
        }
        
        return new Promise((resolve, reject) => {
            const args = this.buildHashcatArgs(phaseName, phaseConfig);
            
            console.log(`[OptimizedGPUEngine] 执行Hashcat命令: ${this.hashcatPath} ${args.join(' ')}`);
            
            const proc = spawn(this.hashcatPath, args, {
                stdio: ['ignore', 'pipe', 'pipe'],
                windowsHide: true
            });
            
            let output = '';
            let errorOutput = '';
            let passwordsTested = 0;
            let lastProgressUpdate = Date.now();
            
            // 处理输出
            proc.stdout.on('data', (data) => {
                output += data.toString();
                
                // 解析进度信息
                const progress = this.parseHashcatProgress(data.toString());
                if (progress.passwordsTested > passwordsTested) {
                    passwordsTested = progress.passwordsTested;
                    
                    // 更新相位跳跃器
                    if (this.phaseSkipper && Date.now() - lastProgressUpdate > 1000) {
                        this.phaseSkipper.updatePhaseProgress(passwordsTested, progress.currentPassword);
                        lastProgressUpdate = Date.now();
                    }
                    
                    // 发送进度事件
                    this.emit('progress', {
                        phase: phaseName,
                        passwordsTested,
                        currentPassword: progress.currentPassword,
                        elapsed: Date.now() - startTime
                    });
                }
            });
            
            proc.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });
            
            proc.on('close', (code) => {
                const duration = Date.now() - startTime;
                
                // 检查是否找到密码
                const foundPassword = this.extractPasswordFromOutput(output);
                
                if (foundPassword) {
                    resolve({
                        success: true,
                        password: foundPassword,
                        source: 'gpu',
                        duration,
                        passwordsTested,
                        exitCode: code
                    });
                } else if (code === 0) {
                    resolve({
                        success: false,
                        reason: 'exhausted',
                        duration,
                        passwordsTested,
                        exitCode: code
                    });
                } else {
                    resolve({
                        success: false,
                        reason: 'error',
                        error: errorOutput,
                        duration,
                        passwordsTested,
                        exitCode: code
                    });
                }
            });
            
            proc.on('error', (error) => {
                reject(new Error(`Hashcat进程错误: ${error.message}`));
            });
            
            // 监听相位跳跃事件
            if (this.phaseSkipper) {
                const skipHandler = (data) => {
                    if (data.phase === phaseName) {
                        console.log(`[OptimizedGPUEngine] 相位被跳过，终止Hashcat进程`);
                        try {
                            proc.kill('SIGTERM');
                        } catch (e) {
                            console.error('终止进程失败:', e);
                        }
                        this.phaseSkipper.off('phaseSkipped', skipHandler);
                    }
                };
                
                this.phaseSkipper.on('phaseSkipped', skipHandler);
            }
        });
    }
    
    /**
     * 构建Hashcat参数
     */
    buildHashcatArgs(phaseName, phaseConfig) {
        const args = [];
        
        // 基础参数
        args.push('-m', '0'); // MD5 (示例，实际应根据文件类型确定)
        args.push('--force'); // 强制执行
        args.push('--potfile-disable'); // 禁用pot文件
        args.push('--quiet'); // 安静模式
        
        // 根据相位类型添加特定参数
        switch (phaseName) {
            case 'short_passwords':
                args.push('-a', '3'); // 掩码攻击
                args.push('?d?d?d?d?d?d'); // 6位数字
                break;
                
            case 'common_passwords':
                args.push('-a', '0'); // 字典攻击
                args.push(phaseConfig.dictionaryPath || 'common.txt');
                break;
                
            case 'dictionary_attack':
                args.push('-a', '0'); // 字典攻击
                args.push(phaseConfig.dictionaryPath || 'rockyou.txt');
                if (phaseConfig.rulesPath) {
                    args.push('-r', phaseConfig.rulesPath);
                }
                break;
                
            case 'mask_attack':
                args.push('-a', '3'); // 掩码攻击
                args.push(phaseConfig.mask || '?a?a?a?a?a?a?a?a');
                break;
                
            case 'bruteforce':
                args.push('-a', '3'); // 掩码攻击
                args.push('?a?a?a?a?a?a?a?a?a'); // 9位全字符
                break;
        }
        
        // 添加哈希文件
        if (phaseConfig.hashFile) {
            args.push(phaseConfig.hashFile);
        }
        
        return args;
    }
    
    /**
     * 解析Hashcat进度
     */
    parseHashcatProgress(output) {
        const progress = {
            passwordsTested: 0,
            currentPassword: '',
            speed: 0
        };
        
        // 简化的进度解析（实际实现需要更复杂的正则表达式）
        const lines = output.split('\n');
        for (const line of lines) {
            // 查找进度信息
            const progressMatch = line.match(/Progress\.+:\s*(\d+)/);
            if (progressMatch) {
                progress.passwordsTested = parseInt(progressMatch[1]);
            }
            
            // 查找当前密码
            const passwordMatch = line.match(/Candidates\.+:\s*(.+)/);
            if (passwordMatch) {
                progress.currentPassword = passwordMatch[1].trim();
            }
            
            // 查找速度信息
            const speedMatch = line.match(/Speed\.+:\s*(\d+)/);
            if (speedMatch) {
                progress.speed = parseInt(speedMatch[1]);
            }
        }
        
        return progress;
    }
    
    /**
     * 从输出中提取密码
     */
    extractPasswordFromOutput(output) {
        // 简化的密码提取（实际实现需要更精确的解析）
        const lines = output.split('\n');
        for (const line of lines) {
            if (line.includes('Cracked') || line.includes(':')) {
                const match = line.match(/:(.+)$/);
                if (match) {
                    return match[1].trim();
                }
            }
        }
        return null;
    }
    
    /**
     * 初始化候选密码缓存
     */
    initializeCandidateCache() {
        this.candidateCache = new Map();
        
        // 实现LRU缓存逻辑
        this.cacheAccessOrder = [];
    }
    
    /**
     * 检查候选密码缓存
     */
    async checkCandidateCache(phaseName, phaseConfig) {
        if (!this.options.enableCandidateCache) {
            return { found: false };
        }
        
        const cacheKey = this.generateCacheKey(phaseName, phaseConfig);
        
        if (this.candidateCache.has(cacheKey)) {
            // 更新访问顺序
            const index = this.cacheAccessOrder.indexOf(cacheKey);
            if (index > -1) {
                this.cacheAccessOrder.splice(index, 1);
            }
            this.cacheAccessOrder.push(cacheKey);
            
            const cachedData = this.candidateCache.get(cacheKey);
            return {
                found: true,
                password: cachedData.password,
                timestamp: cachedData.timestamp
            };
        }
        
        return { found: false };
    }
    
    /**
     * 更新候选密码缓存
     */
    updateCandidateCache(phaseName, phaseConfig, password) {
        if (!this.options.enableCandidateCache) return;
        
        const cacheKey = this.generateCacheKey(phaseName, phaseConfig);
        
        // 添加到缓存
        this.candidateCache.set(cacheKey, {
            password,
            timestamp: Date.now(),
            phase: phaseName
        });
        
        this.cacheAccessOrder.push(cacheKey);
        
        // 维护缓存大小
        while (this.candidateCache.size > this.options.cacheSize) {
            const oldestKey = this.cacheAccessOrder.shift();
            this.candidateCache.delete(oldestKey);
        }
    }
    
    /**
     * 生成缓存键
     */
    generateCacheKey(phaseName, phaseConfig) {
        const keyData = {
            phase: phaseName,
            fileSize: this.currentSession?.context?.fileSize || 0,
            fileName: this.currentSession?.context?.fileName || '',
            config: phaseConfig
        };
        
        return Buffer.from(JSON.stringify(keyData)).toString('base64');
    }
    
    /**
     * 分析破解上下文
     */
    async analyzeContext(context) {
        return {
            fileCharacteristics: {
                size: context.fileSize || 0,
                name: context.fileName || '',
                type: context.fileType || 'unknown'
            },
            recommendedPhases: this.getRecommendedPhases(context),
            estimatedDifficulty: this.estimateDifficulty(context)
        };
    }
    
    /**
     * 生成优化的相位序列
     */
    generateOptimizedPhases(analysis) {
        const phases = [];
        
        // 基于文件特征优化相位顺序
        if (analysis.fileCharacteristics.size < 1024 * 1024) {
            // 小文件，优先短密码
            phases.push({ name: 'short_passwords', priority: 'high', timeout: 30000 });
        }
        
        phases.push({ name: 'common_passwords', priority: 'high', timeout: 60000 });
        phases.push({ name: 'dictionary_attack', priority: 'medium', timeout: 120000 });
        
        if (analysis.fileCharacteristics.name.match(/\d{4}/)) {
            // 包含年份，添加日期攻击
            phases.push({ name: 'date_patterns', priority: 'high', timeout: 90000 });
        }
        
        phases.push({ name: 'mask_attack', priority: 'low', timeout: 600000 });
        phases.push({ name: 'bruteforce', priority: 'lowest', timeout: 1800000 });
        
        return phases;
    }
    
    /**
     * 获取推荐相位
     */
    getRecommendedPhases(context) {
        const phases = ['short_passwords', 'common_passwords', 'dictionary_attack'];
        
        if (context.fileName && context.fileName.match(/\d{4}/)) {
            phases.push('date_patterns');
        }
        
        phases.push('mask_attack', 'bruteforce');
        
        return phases;
    }
    
    /**
     * 估算难度
     */
    estimateDifficulty(context) {
        let difficulty = 1.0;
        
        if (context.fileSize > 100 * 1024 * 1024) {
            difficulty *= 1.2;
        }
        
        if (context.fileName && context.fileName.length > 20) {
            difficulty *= 1.1;
        }
        
        return Math.min(difficulty, 2.0);
    }
    
    /**
     * 更新性能指标
     */
    updatePerformanceMetrics(result) {
        this.performanceMetrics.totalPasswordsTested += result.passwordsTested || 0;
        this.performanceMetrics.totalTimeSpent += result.duration || 0;
        
        if (this.performanceMetrics.totalTimeSpent > 0) {
            this.performanceMetrics.averageEfficiency = 
                this.performanceMetrics.totalPasswordsTested / this.performanceMetrics.totalTimeSpent * 1000;
        }
    }
    
    /**
     * 生成会话ID
     */
    generateSessionId() {
        return `gpu_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 获取性能统计
     */
    getPerformanceStatistics() {
        const stats = {
            ...this.performanceMetrics,
            cacheSize: this.candidateCache.size,
            gpuAvailable: this.gpuAvailable,
            currentSession: this.currentSession?.id || null
        };
        
        if (this.phaseSkipper) {
            stats.phaseSkipperStats = this.phaseSkipper.getPhaseStatistics();
        }
        
        return stats;
    }
    
    /**
     * 停止当前会话
     */
    async stopCurrentSession() {
        if (this.currentSession) {
            this.currentSession.status = 'stopped';
            this.currentSession.endTime = Date.now();
            
            // 停止所有活跃进程
            for (const [processId, process] of this.activeProcesses) {
                try {
                    process.kill('SIGTERM');
                } catch (e) {
                    console.error(`停止进程失败 ${processId}:`, e);
                }
            }
            this.activeProcesses.clear();
            
            // 停止相位跳跃器
            if (this.phaseSkipper) {
                this.phaseSkipper.stopRealTimeMonitoring();
            }
            
            this.emit('sessionStopped', {
                sessionId: this.currentSession.id,
                duration: this.currentSession.endTime - this.currentSession.startTime
            });
            
            this.currentSession = null;
        }
    }
    
    /**
     * 清理资源
     */
    async cleanup() {
        await this.stopCurrentSession();
        
        if (this.phaseSkipper) {
            this.phaseSkipper.cleanup();
        }
        
        this.candidateCache.clear();
        this.cacheAccessOrder = [];
        this.removeAllListeners();
        
        console.log('[OptimizedGPUEngine] 资源清理完成');
    }
}

export default OptimizedGPUEngine;