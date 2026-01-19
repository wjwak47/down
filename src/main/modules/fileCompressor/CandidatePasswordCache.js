/**
 * CandidatePasswordCache - 候选密码缓存系统
 * 
 * 功能：
 * 1. LRU缓存算法实现
 * 2. 智能缓存键生成
 * 3. 模式识别和预测
 * 4. 缓存一致性保证
 * 5. 性能监控和统计
 * 
 * 设计原则：
 * - 高性能访问（O(1)查找）
 * - 内存效率优化
 * - 智能缓存策略
 * - 线程安全
 */

import crypto from 'crypto';
import EventEmitter from 'events';

class CandidatePasswordCache extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            maxSize: 10000,              // 最大缓存条目数
            maxMemoryMB: 50,             // 最大内存使用（MB）
            ttlMs: 24 * 60 * 60 * 1000, // 24小时TTL
            enablePatternLearning: true,  // 启用模式学习
            enableStatistics: true,      // 启用统计
            compressionEnabled: true,    // 启用压缩
            persistToDisk: false,        // 持久化到磁盘
            ...options
        };
        
        // 核心缓存存储
        this.cache = new Map();
        this.accessOrder = new Map(); // 用于LRU跟踪
        this.accessCounter = 0;
        
        // 模式学习
        this.patternCache = new Map();
        this.patternStats = new Map();
        
        // 统计信息
        this.statistics = {
            hits: 0,
            misses: 0,
            evictions: 0,
            totalRequests: 0,
            memoryUsage: 0,
            patternMatches: 0,
            averageAccessTime: 0
        };
        
        // 性能监控
        this.performanceWindow = [];
        this.windowSize = 100;
        
        // 清理定时器
        this.cleanupInterval = null;
        this.startCleanupTimer();
        
        console.log('[CandidatePasswordCache] 缓存系统已初始化');
    }
    
    /**
     * 获取缓存条目
     */
    get(key, context = {}) {
        const startTime = Date.now();
        this.statistics.totalRequests++;
        
        try {
            // 生成标准化的缓存键
            const cacheKey = this.generateCacheKey(key, context);
            
            if (this.cache.has(cacheKey)) {
                const entry = this.cache.get(cacheKey);
                
                // 检查TTL
                if (this.isExpired(entry)) {
                    this.cache.delete(cacheKey);
                    this.accessOrder.delete(cacheKey);
                    this.statistics.misses++;
                    this.recordPerformance(startTime, false);
                    return null;
                }
                
                // 更新访问顺序
                this.updateAccessOrder(cacheKey);
                
                // 更新统计
                this.statistics.hits++;
                entry.accessCount++;
                entry.lastAccessed = Date.now();
                
                this.recordPerformance(startTime, true);
                
                this.emit('cacheHit', {
                    key: cacheKey,
                    value: entry.value,
                    accessCount: entry.accessCount
                });
                
                return {
                    value: entry.value,
                    metadata: {
                        created: entry.created,
                        lastAccessed: entry.lastAccessed,
                        accessCount: entry.accessCount,
                        source: entry.source
                    }
                };
            }
            
            // 尝试模式匹配
            if (this.options.enablePatternLearning) {
                const patternMatch = this.findPatternMatch(key, context);
                if (patternMatch) {
                    this.statistics.patternMatches++;
                    this.recordPerformance(startTime, true);
                    
                    this.emit('patternMatch', {
                        key,
                        pattern: patternMatch.pattern,
                        value: patternMatch.value
                    });
                    
                    return {
                        value: patternMatch.value,
                        metadata: {
                            source: 'pattern',
                            pattern: patternMatch.pattern,
                            confidence: patternMatch.confidence
                        }
                    };
                }
            }
            
            this.statistics.misses++;
            this.recordPerformance(startTime, false);
            
            this.emit('cacheMiss', { key: cacheKey });
            
            return null;
            
        } catch (error) {
            console.error('[CandidatePasswordCache] 获取缓存失败:', error);
            this.statistics.misses++;
            return null;
        }
    }
    
    /**
     * 设置缓存条目
     */
    set(key, value, context = {}) {
        try {
            const cacheKey = this.generateCacheKey(key, context);
            const now = Date.now();
            
            // 创建缓存条目
            const entry = {
                key: cacheKey,
                value: value,
                created: now,
                lastAccessed: now,
                accessCount: 1,
                size: this.calculateEntrySize(key, value),
                source: context.source || 'manual',
                context: { ...context }
            };
            
            // 检查是否需要清理空间
            this.ensureCapacity(entry.size);
            
            // 添加到缓存
            this.cache.set(cacheKey, entry);
            this.updateAccessOrder(cacheKey);
            
            // 更新内存使用统计
            this.updateMemoryUsage();
            
            // 学习模式
            if (this.options.enablePatternLearning) {
                this.learnPattern(key, value, context);
            }
            
            this.emit('cacheSet', {
                key: cacheKey,
                value: value,
                size: entry.size
            });
            
            return true;
            
        } catch (error) {
            console.error('[CandidatePasswordCache] 设置缓存失败:', error);
            return false;
        }
    }
    
    /**
     * 批量设置缓存条目
     */
    setBatch(entries) {
        const results = [];
        
        for (const entry of entries) {
            const result = this.set(entry.key, entry.value, entry.context || {});
            results.push({
                key: entry.key,
                success: result
            });
        }
        
        return results;
    }
    
    /**
     * 删除缓存条目
     */
    delete(key, context = {}) {
        const cacheKey = this.generateCacheKey(key, context);
        
        if (this.cache.has(cacheKey)) {
            this.cache.delete(cacheKey);
            this.accessOrder.delete(cacheKey);
            this.updateMemoryUsage();
            
            this.emit('cacheDelete', { key: cacheKey });
            return true;
        }
        
        return false;
    }
    
    /**
     * 清空缓存
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.accessOrder.clear();
        this.patternCache.clear();
        this.patternStats.clear();
        this.statistics.memoryUsage = 0;
        
        this.emit('cacheCleared', { entriesCleared: size });
        
        console.log(`[CandidatePasswordCache] 缓存已清空，清理了 ${size} 个条目`);
    }
    
    /**
     * 生成缓存键
     */
    generateCacheKey(key, context) {
        // 创建标准化的键数据
        const keyData = {
            primary: key,
            fileSize: context.fileSize || 0,
            fileName: this.normalizeFileName(context.fileName || ''),
            fileType: context.fileType || 'unknown',
            phase: context.phase || 'unknown',
            algorithm: context.algorithm || 'default'
        };
        
        // 生成哈希键
        const keyString = JSON.stringify(keyData);
        return crypto.createHash('sha256').update(keyString).digest('hex').substring(0, 32);
    }
    
    /**
     * 标准化文件名
     */
    normalizeFileName(fileName) {
        // 移除路径，只保留文件名
        const baseName = fileName.split(/[/\\]/).pop() || '';
        
        // 移除扩展名
        const nameWithoutExt = baseName.replace(/\.[^.]*$/, '');
        
        // 标准化：小写，移除特殊字符
        return nameWithoutExt.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
    
    /**
     * 检查条目是否过期
     */
    isExpired(entry) {
        if (!this.options.ttlMs) return false;
        return (Date.now() - entry.created) > this.options.ttlMs;
    }
    
    /**
     * 更新访问顺序
     */
    updateAccessOrder(cacheKey) {
        this.accessOrder.set(cacheKey, ++this.accessCounter);
    }
    
    /**
     * 确保缓存容量
     */
    ensureCapacity(newEntrySize) {
        // 检查条目数量限制
        while (this.cache.size >= this.options.maxSize) {
            this.evictLRU();
        }
        
        // 检查内存限制
        const maxMemoryBytes = this.options.maxMemoryMB * 1024 * 1024;
        while (this.statistics.memoryUsage + newEntrySize > maxMemoryBytes && this.cache.size > 0) {
            this.evictLRU();
        }
    }
    
    /**
     * 驱逐最少使用的条目
     */
    evictLRU() {
        if (this.cache.size === 0) return;
        
        // 找到最少使用的条目
        let lruKey = null;
        let lruOrder = Infinity;
        
        for (const [key, order] of this.accessOrder) {
            if (order < lruOrder) {
                lruOrder = order;
                lruKey = key;
            }
        }
        
        if (lruKey) {
            const entry = this.cache.get(lruKey);
            this.cache.delete(lruKey);
            this.accessOrder.delete(lruKey);
            this.statistics.evictions++;
            
            this.emit('cacheEviction', {
                key: lruKey,
                entry: entry,
                reason: 'lru'
            });
        }
    }
    
    /**
     * 计算条目大小
     */
    calculateEntrySize(key, value) {
        // 简化的大小计算
        const keySize = JSON.stringify(key).length * 2; // UTF-16
        const valueSize = JSON.stringify(value).length * 2;
        return keySize + valueSize + 200; // 额外的对象开销
    }
    
    /**
     * 更新内存使用统计
     */
    updateMemoryUsage() {
        let totalSize = 0;
        for (const entry of this.cache.values()) {
            totalSize += entry.size;
        }
        this.statistics.memoryUsage = totalSize;
    }
    
    /**
     * 学习模式
     */
    learnPattern(key, value, context) {
        try {
            // 提取模式
            const patterns = this.extractPatterns(key, value, context);
            
            for (const pattern of patterns) {
                if (!this.patternStats.has(pattern.type)) {
                    this.patternStats.set(pattern.type, {
                        count: 0,
                        successRate: 0,
                        examples: []
                    });
                }
                
                const stats = this.patternStats.get(pattern.type);
                stats.count++;
                stats.examples.push({
                    key,
                    value,
                    pattern: pattern.pattern,
                    timestamp: Date.now()
                });
                
                // 保持示例数量限制
                if (stats.examples.length > 100) {
                    stats.examples.shift();
                }
                
                // 更新模式缓存
                this.patternCache.set(pattern.pattern, {
                    value,
                    confidence: this.calculatePatternConfidence(pattern.type),
                    lastUsed: Date.now()
                });
            }
            
        } catch (error) {
            console.error('[CandidatePasswordCache] 模式学习失败:', error);
        }
    }
    
    /**
     * 提取模式
     */
    extractPatterns(key, value, context) {
        const patterns = [];
        
        // 文件名模式
        if (context.fileName) {
            const fileName = this.normalizeFileName(context.fileName);
            if (fileName.length > 0) {
                patterns.push({
                    type: 'filename',
                    pattern: `filename:${fileName}`,
                    confidence: 0.7
                });
            }
        }
        
        // 密码长度模式
        if (typeof value === 'string') {
            patterns.push({
                type: 'length',
                pattern: `length:${value.length}`,
                confidence: 0.3
            });
            
            // 字符类型模式
            const charTypes = this.analyzeCharacterTypes(value);
            patterns.push({
                type: 'chartype',
                pattern: `chartype:${charTypes}`,
                confidence: 0.5
            });
        }
        
        // 文件大小模式
        if (context.fileSize) {
            const sizeCategory = this.categorizeSizeCategory(context.fileSize);
            patterns.push({
                type: 'filesize',
                pattern: `filesize:${sizeCategory}`,
                confidence: 0.4
            });
        }
        
        return patterns;
    }
    
    /**
     * 查找模式匹配
     */
    findPatternMatch(key, context) {
        if (!this.options.enablePatternLearning) return null;
        
        const patterns = this.extractPatterns(key, null, context);
        
        for (const pattern of patterns) {
            if (this.patternCache.has(pattern.pattern)) {
                const cached = this.patternCache.get(pattern.pattern);
                
                // 检查置信度
                if (cached.confidence >= 0.6) {
                    return {
                        pattern: pattern.pattern,
                        value: cached.value,
                        confidence: cached.confidence
                    };
                }
            }
        }
        
        return null;
    }
    
    /**
     * 分析字符类型
     */
    analyzeCharacterTypes(password) {
        const types = [];
        
        if (/[a-z]/.test(password)) types.push('lower');
        if (/[A-Z]/.test(password)) types.push('upper');
        if (/[0-9]/.test(password)) types.push('digit');
        if (/[^a-zA-Z0-9]/.test(password)) types.push('special');
        
        return types.sort().join('');
    }
    
    /**
     * 分类文件大小
     */
    categorizeSizeCategory(fileSize) {
        if (fileSize < 1024 * 1024) return 'small';      // < 1MB
        if (fileSize < 10 * 1024 * 1024) return 'medium'; // < 10MB
        if (fileSize < 100 * 1024 * 1024) return 'large'; // < 100MB
        return 'xlarge';
    }
    
    /**
     * 计算模式置信度
     */
    calculatePatternConfidence(patternType) {
        if (!this.patternStats.has(patternType)) return 0;
        
        const stats = this.patternStats.get(patternType);
        
        // 基于使用频率计算置信度
        const baseConfidence = Math.min(stats.count / 10, 1.0);
        
        // 基于成功率调整
        const adjustedConfidence = baseConfidence * (stats.successRate || 0.5);
        
        return Math.max(0.1, Math.min(0.9, adjustedConfidence));
    }
    
    /**
     * 记录性能数据
     */
    recordPerformance(startTime, hit) {
        const duration = Date.now() - startTime;
        
        this.performanceWindow.push({
            timestamp: Date.now(),
            duration,
            hit
        });
        
        // 保持窗口大小
        if (this.performanceWindow.length > this.windowSize) {
            this.performanceWindow.shift();
        }
        
        // 更新平均访问时间
        const totalDuration = this.performanceWindow.reduce((sum, p) => sum + p.duration, 0);
        this.statistics.averageAccessTime = totalDuration / this.performanceWindow.length;
    }
    
    /**
     * 开始清理定时器
     */
    startCleanupTimer() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, 5 * 60 * 1000); // 每5分钟清理一次
    }
    
    /**
     * 执行清理
     */
    performCleanup() {
        let cleanedCount = 0;
        const now = Date.now();
        
        // 清理过期条目
        for (const [key, entry] of this.cache) {
            if (this.isExpired(entry)) {
                this.cache.delete(key);
                this.accessOrder.delete(key);
                cleanedCount++;
            }
        }
        
        // 清理过期模式
        for (const [pattern, data] of this.patternCache) {
            if (now - data.lastUsed > this.options.ttlMs) {
                this.patternCache.delete(pattern);
            }
        }
        
        // 更新内存使用
        this.updateMemoryUsage();
        
        if (cleanedCount > 0) {
            console.log(`[CandidatePasswordCache] 清理了 ${cleanedCount} 个过期条目`);
            this.emit('cleanup', { cleanedCount });
        }
    }
    
    /**
     * 获取缓存统计
     */
    getStatistics() {
        const hitRate = this.statistics.totalRequests > 0 ? 
            (this.statistics.hits / this.statistics.totalRequests) : 0;
        
        return {
            ...this.statistics,
            hitRate: hitRate,
            size: this.cache.size,
            patternCacheSize: this.patternCache.size,
            memoryUsageMB: this.statistics.memoryUsage / (1024 * 1024),
            patternTypes: this.patternStats.size
        };
    }
    
    /**
     * 获取缓存信息
     */
    getCacheInfo() {
        return {
            size: this.cache.size,
            maxSize: this.options.maxSize,
            memoryUsage: this.statistics.memoryUsage,
            maxMemory: this.options.maxMemoryMB * 1024 * 1024,
            hitRate: this.statistics.totalRequests > 0 ? 
                (this.statistics.hits / this.statistics.totalRequests) : 0,
            patternCacheSize: this.patternCache.size,
            averageAccessTime: this.statistics.averageAccessTime
        };
    }
    
    /**
     * 导出缓存数据
     */
    exportCache() {
        const data = {
            cache: Array.from(this.cache.entries()),
            patterns: Array.from(this.patternCache.entries()),
            statistics: this.statistics,
            timestamp: Date.now()
        };
        
        return JSON.stringify(data);
    }
    
    /**
     * 导入缓存数据
     */
    importCache(data) {
        try {
            const parsed = JSON.parse(data);
            
            // 导入缓存条目
            this.cache.clear();
            this.accessOrder.clear();
            
            for (const [key, entry] of parsed.cache) {
                if (!this.isExpired(entry)) {
                    this.cache.set(key, entry);
                    this.updateAccessOrder(key);
                }
            }
            
            // 导入模式
            this.patternCache.clear();
            for (const [pattern, data] of parsed.patterns) {
                this.patternCache.set(pattern, data);
            }
            
            // 更新统计
            this.updateMemoryUsage();
            
            console.log(`[CandidatePasswordCache] 导入了 ${this.cache.size} 个缓存条目`);
            return true;
            
        } catch (error) {
            console.error('[CandidatePasswordCache] 导入缓存失败:', error);
            return false;
        }
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        this.clear();
        this.removeAllListeners();
        
        console.log('[CandidatePasswordCache] 资源清理完成');
    }
}

export default CandidatePasswordCache;