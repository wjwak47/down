/**
 * StreamingPassGPTGenerator - 流式AI密码生成器
 * 
 * 功能：
 * 1. 流式生成机制 - 实时产生密码候选
 * 2. 并行批处理 - 多个生成器并行工作
 * 3. 实时去重机制 - 避免重复密码
 * 4. 模式缓存优化 - 缓存常见模式
 * 5. 自适应批次大小 - 根据性能动态调整
 * 
 * 设计原则：
 * - 高吞吐量：目标 >10,000 passwords/second
 * - 低延迟：首个密码在1秒内产生
 * - 内存效率：流式处理，避免大量内存占用
 * - 容错性：单个生成器失败不影响整体
 */

import EventEmitter from 'events';
import PassGPTGenerator from './passgptGenerator.js';
import PassGPTGeneratorPython from './passgptGeneratorPython.js';

class StreamingPassGPTGenerator extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            // 并行配置
            maxConcurrentGenerators: 4,    // 最大并行生成器数量
            initialBatchSize: 100,          // 初始批次大小
            maxBatchSize: 1000,             // 最大批次大小
            minBatchSize: 10,               // 最小批次大小
            
            // 性能配置
            targetLatencyMs: 1000,          // 目标延迟（首个密码）
            targetThroughput: 10000,        // 目标吞吐量（passwords/second）
            adaptiveBatchSizing: true,      // 自适应批次大小
            
            // 去重配置
            enableRealTimeDedup: true,      // 实时去重
            dedupWindowSize: 50000,         // 去重窗口大小
            
            // 缓存配置
            enablePatternCache: true,       // 模式缓存
            patternCacheSize: 1000,         // 模式缓存大小
            
            // 生成参数
            temperature: 1.0,               // 采样温度
            topK: 50,                       // Top-K采样
            
            // 回退配置
            preferONNX: true,               // 优先使用ONNX
            fallbackToPython: true,         // 回退到Python
            
            ...options
        };
        
        // 生成器管理
        this.generators = [];
        this.activeGenerators = new Set();
        this.generatorType = null; // 'onnx' or 'python'
        
        // 流式状态
        this.isStreaming = false;
        this.streamingSession = null;
        this.totalGenerated = 0;
        this.targetCount = 0;
        
        // 去重系统
        this.seenPasswords = new Set();
        this.dedupWindow = [];
        
        // 模式缓存
        this.patternCache = new Map();
        this.patternStats = new Map();
        
        // 性能监控
        this.performanceMetrics = {
            startTime: null,
            firstPasswordTime: null,
            totalGenerated: 0,
            duplicatesFiltered: 0,
            averageBatchSize: 0,
            currentThroughput: 0,
            averageLatency: 0
        };
        
        // 自适应批次大小
        this.currentBatchSize = this.options.initialBatchSize;
        this.batchPerformanceHistory = [];
        
        console.log('[StreamingPassGPT] 流式生成器已初始化');
    }
    
    /**
     * 初始化生成器
     */
    async initialize() {
        try {
            console.log('[StreamingPassGPT] 初始化生成器...');
            
            // 检测可用的生成器类型
            await this.detectAvailableGenerators();
            
            // 创建生成器实例
            await this.createGeneratorInstances();
            
            console.log(`[StreamingPassGPT] 初始化完成 - 类型: ${this.generatorType}, 数量: ${this.generators.length}`);
            return true;
            
        } catch (error) {
            console.error('[StreamingPassGPT] 初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 检测可用的生成器
     */
    async detectAvailableGenerators() {
        let onnxAvailable = false;
        let pythonAvailable = false;
        
        // 检测ONNX生成器
        if (this.options.preferONNX) {
            try {
                const onnxGenerator = new PassGPTGenerator();
                onnxAvailable = onnxGenerator.isAvailable();
                if (onnxAvailable) {
                    const loaded = await onnxGenerator.loadModel();
                    onnxAvailable = loaded;
                }
                await onnxGenerator.dispose();
            } catch (error) {
                console.warn('[StreamingPassGPT] ONNX生成器不可用:', error.message);
            }
        }
        
        // 检测Python生成器
        if (!onnxAvailable || this.options.fallbackToPython) {
            try {
                const pythonGenerator = new PassGPTGeneratorPython();
                pythonAvailable = pythonGenerator.isAvailable();
                if (pythonAvailable) {
                    const loaded = await pythonGenerator.loadModel();
                    pythonAvailable = loaded;
                }
                await pythonGenerator.dispose();
            } catch (error) {
                console.warn('[StreamingPassGPT] Python生成器不可用:', error.message);
            }
        }
        
        // 选择生成器类型
        if (onnxAvailable && this.options.preferONNX) {
            this.generatorType = 'onnx';
            console.log('[StreamingPassGPT] 使用ONNX生成器');
        } else if (pythonAvailable) {
            this.generatorType = 'python';
            console.log('[StreamingPassGPT] 使用Python生成器');
        } else {
            throw new Error('没有可用的PassGPT生成器');
        }
    }
    
    /**
     * 创建生成器实例
     */
    async createGeneratorInstances() {
        const count = this.options.maxConcurrentGenerators;
        
        for (let i = 0; i < count; i++) {
            let generator;
            
            if (this.generatorType === 'onnx') {
                generator = new PassGPTGenerator();
            } else {
                generator = new PassGPTGeneratorPython();
            }
            
            await generator.loadModel();
            this.generators.push({
                id: i,
                instance: generator,
                busy: false,
                totalGenerated: 0,
                averageTime: 0
            });
        }
        
        console.log(`[StreamingPassGPT] 创建了 ${this.generators.length} 个生成器实例`);
    }
    
    /**
     * 开始流式生成
     */
    async* generatePasswordStream(totalCount, options = {}) {
        if (this.isStreaming) {
            throw new Error('已有流式生成会话在进行中');
        }
        
        console.log(`[StreamingPassGPT] 开始流式生成 ${totalCount} 个密码`);
        
        // 初始化流式会话
        this.initializeStreamingSession(totalCount, options);
        
        try {
            // 启动并行生成器
            const generatorPromises = this.startParallelGenerators();
            
            // 流式输出密码
            let generated = 0;
            while (generated < totalCount && this.isStreaming) {
                // 等待下一批密码
                const batch = await this.getNextBatch();
                
                if (batch && batch.length > 0) {
                    // 实时去重
                    const uniquePasswords = this.options.enableRealTimeDedup ? 
                        this.filterDuplicates(batch) : batch;
                    
                    // 输出密码
                    for (const password of uniquePasswords) {
                        if (generated >= totalCount) break;
                        
                        // 记录首个密码时间
                        if (generated === 0) {
                            this.performanceMetrics.firstPasswordTime = Date.now();
                        }
                        
                        yield password;
                        generated++;
                        this.totalGenerated++;
                        
                        // 更新性能指标
                        this.updatePerformanceMetrics();
                        
                        // 发送进度事件
                        if (generated % 1000 === 0) {
                            this.emit('progress', {
                                generated,
                                total: totalCount,
                                throughput: this.performanceMetrics.currentThroughput,
                                duplicatesFiltered: this.performanceMetrics.duplicatesFiltered
                            });
                        }
                    }
                }
                
                // 自适应批次大小调整
                if (this.options.adaptiveBatchSizing) {
                    this.adjustBatchSize();
                }
            }
            
            // 等待所有生成器完成
            await Promise.allSettled(generatorPromises);
            
        } finally {
            this.stopStreamingSession();
        }
        
        console.log(`[StreamingPassGPT] 流式生成完成: ${generated} 个密码`);
    }
    
    /**
     * 初始化流式会话
     */
    initializeStreamingSession(totalCount, options) {
        this.isStreaming = true;
        this.totalGenerated = 0;
        this.targetCount = totalCount;
        
        this.streamingSession = {
            id: this.generateSessionId(),
            startTime: Date.now(),
            targetCount: totalCount,
            options: { ...this.options, ...options },
            batchQueue: [],
            batchPromises: new Map()
        };
        
        // 重置性能指标
        this.performanceMetrics = {
            startTime: Date.now(),
            firstPasswordTime: null,
            totalGenerated: 0,
            duplicatesFiltered: 0,
            averageBatchSize: this.currentBatchSize,
            currentThroughput: 0,
            averageLatency: 0
        };
        
        // 重置去重系统
        if (this.options.enableRealTimeDedup) {
            this.seenPasswords.clear();
            this.dedupWindow = [];
        }
    }
    
    /**
     * 启动并行生成器
     */
    startParallelGenerators() {
        const promises = [];
        
        for (const generator of this.generators) {
            if (!generator.busy) {
                const promise = this.runGeneratorLoop(generator);
                promises.push(promise);
                this.activeGenerators.add(generator.id);
            }
        }
        
        console.log(`[StreamingPassGPT] 启动了 ${promises.length} 个并行生成器`);
        return promises;
    }
    
    /**
     * 运行生成器循环
     */
    async runGeneratorLoop(generator) {
        generator.busy = true;
        
        try {
            while (this.isStreaming && this.totalGenerated < this.targetCount) {
                const batchStartTime = Date.now();
                
                // 生成一批密码
                const batch = await generator.instance.generatePasswords(
                    this.currentBatchSize,
                    this.options.temperature,
                    this.options.topK
                );
                
                const batchTime = Date.now() - batchStartTime;
                
                // 更新生成器统计
                generator.totalGenerated += batch.length;
                generator.averageTime = (generator.averageTime + batchTime) / 2;
                
                // 记录批次性能
                this.recordBatchPerformance(batch.length, batchTime);
                
                // 将批次添加到队列
                this.streamingSession.batchQueue.push({
                    passwords: batch,
                    generatorId: generator.id,
                    timestamp: Date.now(),
                    batchTime: batchTime
                });
                
                // 发送批次完成事件
                this.emit('batchGenerated', {
                    generatorId: generator.id,
                    batchSize: batch.length,
                    batchTime: batchTime
                });
            }
            
        } catch (error) {
            console.error(`[StreamingPassGPT] 生成器 ${generator.id} 错误:`, error);
            this.emit('generatorError', {
                generatorId: generator.id,
                error: error.message
            });
        } finally {
            generator.busy = false;
            this.activeGenerators.delete(generator.id);
        }
    }
    
    /**
     * 获取下一批密码
     */
    async getNextBatch() {
        // 等待批次队列中有数据
        while (this.streamingSession.batchQueue.length === 0 && this.isStreaming) {
            await this.sleep(10); // 10ms轮询间隔
        }
        
        if (this.streamingSession.batchQueue.length > 0) {
            const batch = this.streamingSession.batchQueue.shift();
            return batch.passwords;
        }
        
        return null;
    }
    
    /**
     * 过滤重复密码
     */
    filterDuplicates(passwords) {
        const unique = [];
        let duplicateCount = 0;
        
        for (const password of passwords) {
            if (!this.seenPasswords.has(password)) {
                this.seenPasswords.add(password);
                unique.push(password);
                
                // 添加到去重窗口
                this.dedupWindow.push(password);
                
                // 维护窗口大小
                if (this.dedupWindow.length > this.options.dedupWindowSize) {
                    const removed = this.dedupWindow.shift();
                    this.seenPasswords.delete(removed);
                }
            } else {
                duplicateCount++;
            }
        }
        
        this.performanceMetrics.duplicatesFiltered += duplicateCount;
        
        return unique;
    }
    
    /**
     * 记录批次性能
     */
    recordBatchPerformance(batchSize, batchTime) {
        this.batchPerformanceHistory.push({
            size: batchSize,
            time: batchTime,
            throughput: (batchSize / batchTime) * 1000, // passwords per second
            timestamp: Date.now()
        });
        
        // 保持历史记录大小
        if (this.batchPerformanceHistory.length > 50) {
            this.batchPerformanceHistory.shift();
        }
    }
    
    /**
     * 自适应批次大小调整
     */
    adjustBatchSize() {
        if (this.batchPerformanceHistory.length < 5) return;
        
        // 计算最近批次的平均性能
        const recentBatches = this.batchPerformanceHistory.slice(-5);
        const avgThroughput = recentBatches.reduce((sum, b) => sum + b.throughput, 0) / recentBatches.length;
        const avgLatency = recentBatches.reduce((sum, b) => sum + b.time, 0) / recentBatches.length;
        
        // 调整策略
        if (avgLatency > this.options.targetLatencyMs && this.currentBatchSize > this.options.minBatchSize) {
            // 延迟过高，减少批次大小
            this.currentBatchSize = Math.max(
                this.options.minBatchSize,
                Math.floor(this.currentBatchSize * 0.8)
            );
            console.log(`[StreamingPassGPT] 减少批次大小到 ${this.currentBatchSize} (延迟过高: ${avgLatency}ms)`);
            
        } else if (avgThroughput < this.options.targetThroughput && this.currentBatchSize < this.options.maxBatchSize) {
            // 吞吐量不足，增加批次大小
            this.currentBatchSize = Math.min(
                this.options.maxBatchSize,
                Math.floor(this.currentBatchSize * 1.2)
            );
            console.log(`[StreamingPassGPT] 增加批次大小到 ${this.currentBatchSize} (吞吐量不足: ${avgThroughput})`);
        }
    }
    
    /**
     * 更新性能指标
     */
    updatePerformanceMetrics() {
        const now = Date.now();
        const elapsed = now - this.performanceMetrics.startTime;
        
        if (elapsed > 0) {
            this.performanceMetrics.currentThroughput = (this.totalGenerated / elapsed) * 1000;
        }
        
        if (this.performanceMetrics.firstPasswordTime) {
            this.performanceMetrics.averageLatency = this.performanceMetrics.firstPasswordTime - this.performanceMetrics.startTime;
        }
        
        this.performanceMetrics.totalGenerated = this.totalGenerated;
    }
    
    /**
     * 停止流式会话
     */
    stopStreamingSession() {
        this.isStreaming = false;
        
        if (this.streamingSession) {
            const duration = Date.now() - this.streamingSession.startTime;
            
            this.emit('sessionCompleted', {
                sessionId: this.streamingSession.id,
                duration: duration,
                totalGenerated: this.totalGenerated,
                averageThroughput: this.performanceMetrics.currentThroughput,
                duplicatesFiltered: this.performanceMetrics.duplicatesFiltered
            });
            
            this.streamingSession = null;
        }
        
        // 清理活跃生成器
        this.activeGenerators.clear();
    }
    
    /**
     * 批量生成（非流式）
     */
    async generatePasswordsBatch(count, options = {}) {
        const passwords = [];
        
        for await (const password of this.generatePasswordStream(count, options)) {
            passwords.push(password);
        }
        
        return passwords;
    }
    
    /**
     * 获取性能统计
     */
    getPerformanceStatistics() {
        return {
            ...this.performanceMetrics,
            isStreaming: this.isStreaming,
            activeGenerators: this.activeGenerators.size,
            totalGenerators: this.generators.length,
            currentBatchSize: this.currentBatchSize,
            generatorType: this.generatorType,
            dedupWindowSize: this.dedupWindow.length,
            patternCacheSize: this.patternCache.size
        };
    }
    
    /**
     * 获取生成器状态
     */
    getGeneratorStatus() {
        return this.generators.map(gen => ({
            id: gen.id,
            busy: gen.busy,
            totalGenerated: gen.totalGenerated,
            averageTime: gen.averageTime
        }));
    }
    
    /**
     * 停止所有生成
     */
    async stopGeneration() {
        console.log('[StreamingPassGPT] 停止所有生成...');
        
        this.isStreaming = false;
        
        // 等待所有生成器停止
        const stopPromises = this.generators.map(async (gen) => {
            if (gen.busy) {
                try {
                    await gen.instance.dispose();
                } catch (error) {
                    console.error(`停止生成器 ${gen.id} 失败:`, error);
                }
            }
        });
        
        await Promise.allSettled(stopPromises);
        
        this.stopStreamingSession();
        
        console.log('[StreamingPassGPT] 所有生成已停止');
    }
    
    /**
     * 清理资源
     */
    async cleanup() {
        await this.stopGeneration();
        
        // 清理所有生成器
        for (const generator of this.generators) {
            try {
                await generator.instance.dispose();
            } catch (error) {
                console.error(`清理生成器 ${generator.id} 失败:`, error);
            }
        }
        
        this.generators = [];
        this.seenPasswords.clear();
        this.dedupWindow = [];
        this.patternCache.clear();
        this.patternStats.clear();
        this.removeAllListeners();
        
        console.log('[StreamingPassGPT] 资源清理完成');
    }
    
    // 辅助方法
    
    generateSessionId() {
        return `streaming_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default StreamingPassGPTGenerator;