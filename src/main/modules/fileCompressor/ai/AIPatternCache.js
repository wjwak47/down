/**
 * AIPatternCache - AI模式缓存系统
 * 
 * 功能：
 * 1. 模式提取算法 - 从成功密码中学习模式
 * 2. 模式缓存存储 - 高效存储和检索模式
 * 3. 智能模式匹配 - 基于文件特征匹配模式
 * 4. 模式生成优化 - 基于学习的模式生成新密码
 * 5. 统计分析 - 模式效果分析和优化建议
 * 
 * 设计原则：
 * - 智能学习：从成功案例中自动学习
 * - 高效匹配：快速找到相关模式
 * - 自适应优化：根据效果调整策略
 * - 内存效率：合理控制缓存大小
 */

import crypto from 'crypto';
import EventEmitter from 'events';

class AIPatternCache extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            // 缓存配置
            maxPatterns: 5000,              // 最大模式数量
            maxMemoryMB: 100,               // 最大内存使用
            ttlHours: 168,                  // 模式TTL（7天）
            
            // 学习配置
            minPatternOccurrence: 3,        // 最小模式出现次数
            maxPatternLength: 20,           // 最大模式长度
            enableSemanticAnalysis: true,   // 语义分析
            enableContextLearning: true,    // 上下文学习
            
            // 匹配配置
            similarityThreshold: 0.7,       // 相似度阈值
            maxMatchResults: 100,           // 最大匹配结果数
            enableFuzzyMatching: true,      // 模糊匹配
            
            // 生成配置
            maxGeneratedVariants: 50,       // 最大生成变体数
            enablePatternCombination: true, // 模式组合
            
            ...options
        };
        
        // 模式存储
        this.patterns = new Map();          // 主模式存储
        this.patternIndex = new Map();      // 模式索引
        this.contextPatterns = new Map();   // 上下文模式
        this.semanticGroups = new Map();    // 语义分组
        
        // 统计信息
        this.statistics = {
            totalPatterns: 0,
            successfulMatches: 0,
            totalMatches: 0,
            averageConfidence: 0,
            memoryUsage: 0,
            lastCleanup: Date.now()
        };
        
        // 性能监控
        this.performanceMetrics = {
            extractionTime: [],
            matchingTime: [],
            generationTime: []
        };
        
        // 清理定时器
        this.cleanupInterval = null;
        this.startCleanupTimer();
        
        console.log('[AIPatternCache] AI模式缓存系统已初始化');
    }
    
    /**
     * 从成功密码中学习模式
     */
    async learnFromSuccess(password, context = {}) {
        const startTime = Date.now();
        
        try {
            console.log(`[AIPatternCache] 学习成功密码: ${password}`);
            
            // 提取多种类型的模式
            const patterns = await this.extractPatterns(password, context);
            
            // 存储模式
            for (const pattern of patterns) {
                await this.storePattern(pattern, context);
            }
            
            // 更新统计
            this.updateStatistics();
            
            const extractionTime = Date.now() - startTime;
            this.recordPerformance('extraction', extractionTime);
            
            this.emit('patternsLearned', {
                password,
                patternsCount: patterns.length,
                extractionTime
            });
            
            return patterns.length;
            
        } catch (error) {
            console.error('[AIPatternCache] 学习模式失败:', error);
            return 0;
        }
    }
    
    /**
     * 提取密码模式
     */
    async extractPatterns(password, context) {
        const patterns = [];
        
        // 1. 结构模式
        const structuralPatterns = this.extractStructuralPatterns(password);
        patterns.push(...structuralPatterns);
        
        // 2. 字符类型模式
        const charTypePatterns = this.extractCharTypePatterns(password);
        patterns.push(...charTypePatterns);
        
        // 3. 语义模式
        if (this.options.enableSemanticAnalysis) {
            const semanticPatterns = this.extractSemanticPatterns(password, context);
            patterns.push(...semanticPatterns);
        }
        
        // 4. 上下文模式
        if (this.options.enableContextLearning && context) {
            const contextPatterns = this.extractContextPatterns(password, context);
            patterns.push(...contextPatterns);
        }
        
        // 5. N-gram模式
        const ngramPatterns = this.extractNgramPatterns(password);
        patterns.push(...ngramPatterns);
        
        // 6. 变换模式
        const transformPatterns = this.extractTransformPatterns(password);
        patterns.push(...transformPatterns);
        
        return patterns;
    }
    
    /**
     * 提取结构模式
     */
    extractStructuralPatterns(password) {
        const patterns = [];
        
        // 长度模式
        patterns.push({
            type: 'length',
            pattern: `len:${password.length}`,
            value: password.length,
            confidence: 0.3
        });
        
        // 位置模式（数字、字母、特殊字符的位置）
        const positions = this.analyzeCharacterPositions(password);
        patterns.push({
            type: 'position',
            pattern: `pos:${positions}`,
            value: positions,
            confidence: 0.5
        });
        
        // 重复模式
        const repeats = this.findRepeatingPatterns(password);
        for (const repeat of repeats) {
            patterns.push({
                type: 'repeat',
                pattern: `repeat:${repeat.pattern}:${repeat.count}`,
                value: repeat,
                confidence: 0.6
            });
        }
        
        return patterns;
    }
    
    /**
     * 提取字符类型模式
     */
    extractCharTypePatterns(password) {
        const patterns = [];
        
        // 字符类型序列
        const charTypes = password.split('').map(char => {
            if (/[a-z]/.test(char)) return 'l';      // lowercase
            if (/[A-Z]/.test(char)) return 'u';      // uppercase
            if (/[0-9]/.test(char)) return 'd';      // digit
            if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(char)) return 's'; // special
            return 'o'; // other
        }).join('');
        
        patterns.push({
            type: 'chartype',
            pattern: `ct:${charTypes}`,
            value: charTypes,
            confidence: 0.7
        });
        
        // 字符类型统计
        const stats = {
            lowercase: (password.match(/[a-z]/g) || []).length,
            uppercase: (password.match(/[A-Z]/g) || []).length,
            digits: (password.match(/[0-9]/g) || []).length,
            special: (password.match(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/g) || []).length
        };
        
        patterns.push({
            type: 'charstats',
            pattern: `stats:${stats.lowercase}:${stats.uppercase}:${stats.digits}:${stats.special}`,
            value: stats,
            confidence: 0.4
        });
        
        return patterns;
    }
    
    /**
     * 提取语义模式
     */
    extractSemanticPatterns(password, context) {
        const patterns = [];
        
        // 常见单词检测
        const words = this.extractWords(password);
        for (const word of words) {
            patterns.push({
                type: 'word',
                pattern: `word:${word.toLowerCase()}`,
                value: word,
                confidence: 0.8
            });
        }
        
        // 数字模式（年份、日期等）
        const numbers = password.match(/\d+/g) || [];
        for (const number of numbers) {
            const numValue = parseInt(number);
            
            // 年份检测
            if (number.length === 4 && numValue >= 1900 && numValue <= 2030) {
                patterns.push({
                    type: 'year',
                    pattern: `year:${number}`,
                    value: numValue,
                    confidence: 0.9
                });
            }
            
            // 日期检测
            if (number.length === 2 && numValue >= 1 && numValue <= 31) {
                patterns.push({
                    type: 'date',
                    pattern: `date:${number}`,
                    value: numValue,
                    confidence: 0.6
                });
            }
        }
        
        // 键盘模式
        const keyboardPatterns = this.detectKeyboardPatterns(password);
        for (const kbPattern of keyboardPatterns) {
            patterns.push({
                type: 'keyboard',
                pattern: `kb:${kbPattern.pattern}`,
                value: kbPattern,
                confidence: 0.7
            });
        }
        
        return patterns;
    }
    
    /**
     * 提取上下文模式
     */
    extractContextPatterns(password, context) {
        const patterns = [];
        
        // 文件名相关模式
        if (context.fileName) {
            const fileName = context.fileName.toLowerCase();
            const baseName = fileName.replace(/\.[^.]*$/, ''); // 移除扩展名
            
            // 检查密码是否包含文件名元素
            if (password.toLowerCase().includes(baseName)) {
                patterns.push({
                    type: 'filename',
                    pattern: `fn:${baseName}`,
                    value: baseName,
                    confidence: 0.9
                });
            }
            
            // 文件名中的数字
            const fileNumbers = baseName.match(/\d+/g) || [];
            for (const num of fileNumbers) {
                if (password.includes(num)) {
                    patterns.push({
                        type: 'filenumber',
                        pattern: `fnum:${num}`,
                        value: num,
                        confidence: 0.8
                    });
                }
            }
        }
        
        // 文件大小相关模式
        if (context.fileSize) {
            const sizeCategory = this.categorizeFileSize(context.fileSize);
            patterns.push({
                type: 'filesize',
                pattern: `fsize:${sizeCategory}`,
                value: sizeCategory,
                confidence: 0.3
            });
        }
        
        // 文件类型相关模式
        if (context.fileType) {
            patterns.push({
                type: 'filetype',
                pattern: `ftype:${context.fileType}`,
                value: context.fileType,
                confidence: 0.4
            });
        }
        
        return patterns;
    }
    
    /**
     * 提取N-gram模式
     */
    extractNgramPatterns(password) {
        const patterns = [];
        
        // 2-gram (bigram)
        for (let i = 0; i < password.length - 1; i++) {
            const bigram = password.substr(i, 2);
            patterns.push({
                type: 'bigram',
                pattern: `2g:${bigram}`,
                value: bigram,
                confidence: 0.3
            });
        }
        
        // 3-gram (trigram)
        for (let i = 0; i < password.length - 2; i++) {
            const trigram = password.substr(i, 3);
            patterns.push({
                type: 'trigram',
                pattern: `3g:${trigram}`,
                value: trigram,
                confidence: 0.4
            });
        }
        
        return patterns;
    }
    
    /**
     * 提取变换模式
     */
    extractTransformPatterns(password) {
        const patterns = [];
        
        // Leet speak检测
        const leetMap = { '@': 'a', '3': 'e', '1': 'i', '0': 'o', '5': 's', '7': 't' };
        let hasLeet = false;
        let originalForm = password;
        
        for (const [leet, normal] of Object.entries(leetMap)) {
            if (password.includes(leet)) {
                hasLeet = true;
                originalForm = originalForm.replace(new RegExp(leet, 'g'), normal);
            }
        }
        
        if (hasLeet) {
            patterns.push({
                type: 'leet',
                pattern: `leet:${originalForm}`,
                value: { original: originalForm, leet: password },
                confidence: 0.8
            });
        }
        
        // 大小写变换
        const casePattern = this.analyzeCasePattern(password);
        if (casePattern !== 'mixed') {
            patterns.push({
                type: 'case',
                pattern: `case:${casePattern}`,
                value: casePattern,
                confidence: 0.5
            });
        }
        
        // 数字后缀/前缀
        const numberSuffix = password.match(/\d+$/);
        if (numberSuffix) {
            patterns.push({
                type: 'numsuffix',
                pattern: `nsuf:${numberSuffix[0]}`,
                value: numberSuffix[0],
                confidence: 0.7
            });
        }
        
        const numberPrefix = password.match(/^\d+/);
        if (numberPrefix) {
            patterns.push({
                type: 'numprefix',
                pattern: `npre:${numberPrefix[0]}`,
                value: numberPrefix[0],
                confidence: 0.7
            });
        }
        
        return patterns;
    }
    
    /**
     * 存储模式
     */
    async storePattern(pattern, context) {
        const patternKey = this.generatePatternKey(pattern);
        
        if (this.patterns.has(patternKey)) {
            // 更新现有模式
            const existing = this.patterns.get(patternKey);
            existing.count++;
            existing.lastSeen = Date.now();
            existing.contexts.push(context);
            
            // 更新置信度
            existing.confidence = Math.min(0.95, existing.confidence + 0.05);
            
        } else {
            // 创建新模式
            const newPattern = {
                ...pattern,
                key: patternKey,
                count: 1,
                created: Date.now(),
                lastSeen: Date.now(),
                contexts: [context],
                successRate: 1.0
            };
            
            this.patterns.set(patternKey, newPattern);
            
            // 更新索引
            this.updatePatternIndex(newPattern);
        }
    }
    
    /**
     * 查找匹配的模式
     */
    async findMatchingPatterns(context, options = {}) {
        const startTime = Date.now();
        
        try {
            const matches = [];
            const searchOptions = { ...this.options, ...options };
            
            // 1. 精确匹配
            const exactMatches = this.findExactMatches(context);
            matches.push(...exactMatches);
            
            // 2. 上下文匹配
            if (this.options.enableContextLearning) {
                const contextMatches = this.findContextMatches(context);
                matches.push(...contextMatches);
            }
            
            // 3. 模糊匹配
            if (this.options.enableFuzzyMatching) {
                const fuzzyMatches = this.findFuzzyMatches(context);
                matches.push(...fuzzyMatches);
            }
            
            // 排序和过滤
            const sortedMatches = this.rankMatches(matches, context);
            const topMatches = sortedMatches.slice(0, searchOptions.maxMatchResults);
            
            const matchingTime = Date.now() - startTime;
            this.recordPerformance('matching', matchingTime);
            
            this.statistics.totalMatches++;
            if (topMatches.length > 0) {
                this.statistics.successfulMatches++;
            }
            
            this.emit('patternsMatched', {
                context,
                matchesCount: topMatches.length,
                matchingTime
            });
            
            return topMatches;
            
        } catch (error) {
            console.error('[AIPatternCache] 模式匹配失败:', error);
            return [];
        }
    }
    
    /**
     * 基于模式生成密码变体
     */
    async generatePasswordVariants(patterns, context = {}) {
        const startTime = Date.now();
        
        try {
            const variants = new Set();
            
            for (const pattern of patterns) {
                const patternVariants = await this.generatePatternVariants(pattern, context);
                patternVariants.forEach(v => variants.add(v));
                
                if (variants.size >= this.options.maxGeneratedVariants) {
                    break;
                }
            }
            
            // 模式组合
            if (this.options.enablePatternCombination && patterns.length > 1) {
                const combinedVariants = this.combinePatterns(patterns, context);
                combinedVariants.forEach(v => variants.add(v));
            }
            
            const generationTime = Date.now() - startTime;
            this.recordPerformance('generation', generationTime);
            
            const result = Array.from(variants).slice(0, this.options.maxGeneratedVariants);
            
            this.emit('variantsGenerated', {
                patternsCount: patterns.length,
                variantsCount: result.length,
                generationTime
            });
            
            return result;
            
        } catch (error) {
            console.error('[AIPatternCache] 生成变体失败:', error);
            return [];
        }
    }
    
    /**
     * 生成单个模式的变体
     */
    async generatePatternVariants(pattern, context) {
        const variants = [];
        
        switch (pattern.type) {
            case 'word':
                // 单词变体：大小写、leet speak、数字后缀
                const word = pattern.value;
                variants.push(word);
                variants.push(word.toLowerCase());
                variants.push(word.toUpperCase());
                variants.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
                
                // Leet speak变体
                variants.push(this.applyLeetSpeak(word));
                
                // 数字后缀
                for (const suffix of ['1', '123', '2024', '!']) {
                    variants.push(word + suffix);
                }
                break;
                
            case 'year':
                // 年份变体：完整年份、两位年份
                const year = pattern.value;
                variants.push(year.toString());
                variants.push((year % 100).toString().padStart(2, '0'));
                break;
                
            case 'filename':
                // 文件名变体
                const fileName = pattern.value;
                variants.push(fileName);
                variants.push(fileName + '123');
                variants.push(fileName + '2024');
                break;
                
            case 'keyboard':
                // 键盘模式变体
                const kbPattern = pattern.value.pattern;
                variants.push(kbPattern);
                variants.push(kbPattern.toUpperCase());
                variants.push(kbPattern + '123');
                break;
        }
        
        return variants.filter(v => v && v.length > 0);
    }
    
    /**
     * 组合多个模式
     */
    combinePatterns(patterns, context) {
        const combinations = [];
        
        // 简单组合：将不同类型的模式值连接
        const wordPatterns = patterns.filter(p => p.type === 'word');
        const numberPatterns = patterns.filter(p => ['year', 'date', 'numsuffix'].includes(p.type));
        
        for (const wordPattern of wordPatterns) {
            for (const numberPattern of numberPatterns) {
                combinations.push(wordPattern.value + numberPattern.value);
                combinations.push(numberPattern.value + wordPattern.value);
            }
        }
        
        return combinations;
    }
    
    /**
     * 获取模式统计
     */
    getPatternStatistics() {
        const typeStats = new Map();
        let totalConfidence = 0;
        
        for (const pattern of this.patterns.values()) {
            if (!typeStats.has(pattern.type)) {
                typeStats.set(pattern.type, { count: 0, avgConfidence: 0 });
            }
            
            const stats = typeStats.get(pattern.type);
            stats.count++;
            stats.avgConfidence = (stats.avgConfidence + pattern.confidence) / 2;
            
            totalConfidence += pattern.confidence;
        }
        
        return {
            ...this.statistics,
            totalPatterns: this.patterns.size,
            averageConfidence: this.patterns.size > 0 ? totalConfidence / this.patterns.size : 0,
            typeDistribution: Object.fromEntries(typeStats),
            memoryUsage: this.calculateMemoryUsage()
        };
    }
    
    /**
     * 清理过期模式
     */
    performCleanup() {
        const now = Date.now();
        const ttlMs = this.options.ttlHours * 60 * 60 * 1000;
        let cleanedCount = 0;
        
        for (const [key, pattern] of this.patterns) {
            // 清理过期模式
            if (now - pattern.lastSeen > ttlMs) {
                this.patterns.delete(key);
                cleanedCount++;
                continue;
            }
            
            // 清理低频模式
            if (pattern.count < this.options.minPatternOccurrence && now - pattern.created > ttlMs / 2) {
                this.patterns.delete(key);
                cleanedCount++;
            }
        }
        
        // 重建索引
        this.rebuildPatternIndex();
        
        this.statistics.lastCleanup = now;
        
        if (cleanedCount > 0) {
            console.log(`[AIPatternCache] 清理了 ${cleanedCount} 个过期模式`);
            this.emit('cleanup', { cleanedCount });
        }
    }
    
    // 辅助方法
    
    analyzeCharacterPositions(password) {
        return password.split('').map(char => {
            if (/[a-z]/.test(char)) return 'l';
            if (/[A-Z]/.test(char)) return 'u';
            if (/[0-9]/.test(char)) return 'd';
            return 's';
        }).join('');
    }
    
    findRepeatingPatterns(password) {
        const repeats = [];
        
        for (let len = 2; len <= Math.floor(password.length / 2); len++) {
            for (let i = 0; i <= password.length - len * 2; i++) {
                const pattern = password.substr(i, len);
                const nextPattern = password.substr(i + len, len);
                
                if (pattern === nextPattern) {
                    let count = 2;
                    let pos = i + len * 2;
                    
                    while (pos + len <= password.length && password.substr(pos, len) === pattern) {
                        count++;
                        pos += len;
                    }
                    
                    repeats.push({ pattern, count, position: i });
                }
            }
        }
        
        return repeats;
    }
    
    extractWords(password) {
        // 简化的单词提取（实际实现可能需要更复杂的NLP）
        const commonWords = [
            'password', 'admin', 'user', 'test', 'demo', 'guest', 'root', 'login',
            'welcome', 'hello', 'world', 'love', 'baby', 'angel', 'honey', 'sweet'
        ];
        
        const words = [];
        const lowerPassword = password.toLowerCase();
        
        for (const word of commonWords) {
            if (lowerPassword.includes(word)) {
                words.push(word);
            }
        }
        
        return words;
    }
    
    detectKeyboardPatterns(password) {
        const keyboardRows = [
            '1234567890',
            'qwertyuiop',
            'asdfghjkl',
            'zxcvbnm'
        ];
        
        const patterns = [];
        
        for (const row of keyboardRows) {
            for (let start = 0; start < row.length - 2; start++) {
                for (let len = 3; len <= Math.min(8, row.length - start); len++) {
                    const pattern = row.substr(start, len);
                    if (password.toLowerCase().includes(pattern)) {
                        patterns.push({
                            pattern: pattern,
                            row: keyboardRows.indexOf(row),
                            start: start,
                            length: len
                        });
                    }
                }
            }
        }
        
        return patterns;
    }
    
    categorizeFileSize(fileSize) {
        if (fileSize < 1024 * 1024) return 'small';
        if (fileSize < 10 * 1024 * 1024) return 'medium';
        if (fileSize < 100 * 1024 * 1024) return 'large';
        return 'xlarge';
    }
    
    analyzeCasePattern(password) {
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        
        if (!hasLower && !hasUpper) return 'none';
        if (hasLower && !hasUpper) return 'lower';
        if (!hasLower && hasUpper) return 'upper';
        if (password[0] === password[0].toUpperCase() && password.slice(1) === password.slice(1).toLowerCase()) {
            return 'title';
        }
        return 'mixed';
    }
    
    applyLeetSpeak(word) {
        const leetMap = { 'a': '@', 'e': '3', 'i': '1', 'o': '0', 's': '5', 't': '7' };
        let result = word.toLowerCase();
        
        for (const [normal, leet] of Object.entries(leetMap)) {
            result = result.replace(new RegExp(normal, 'g'), leet);
        }
        
        return result;
    }
    
    generatePatternKey(pattern) {
        const keyData = `${pattern.type}:${pattern.pattern}`;
        return crypto.createHash('md5').update(keyData).digest('hex').substring(0, 16);
    }
    
    updatePatternIndex(pattern) {
        // 简化的索引更新
        if (!this.patternIndex.has(pattern.type)) {
            this.patternIndex.set(pattern.type, new Set());
        }
        this.patternIndex.get(pattern.type).add(pattern.key);
    }
    
    findExactMatches(context) {
        // 实现精确匹配逻辑
        return [];
    }
    
    findContextMatches(context) {
        // 实现上下文匹配逻辑
        return [];
    }
    
    findFuzzyMatches(context) {
        // 实现模糊匹配逻辑
        return [];
    }
    
    rankMatches(matches, context) {
        // 按置信度和相关性排序
        return matches.sort((a, b) => b.confidence - a.confidence);
    }
    
    rebuildPatternIndex() {
        this.patternIndex.clear();
        for (const pattern of this.patterns.values()) {
            this.updatePatternIndex(pattern);
        }
    }
    
    calculateMemoryUsage() {
        // 简化的内存使用计算
        return this.patterns.size * 500; // 估算每个模式500字节
    }
    
    recordPerformance(operation, time) {
        if (!this.performanceMetrics[operation + 'Time']) {
            this.performanceMetrics[operation + 'Time'] = [];
        }
        
        this.performanceMetrics[operation + 'Time'].push(time);
        
        // 保持历史记录大小
        if (this.performanceMetrics[operation + 'Time'].length > 100) {
            this.performanceMetrics[operation + 'Time'].shift();
        }
    }
    
    updateStatistics() {
        this.statistics.totalPatterns = this.patterns.size;
        this.statistics.memoryUsage = this.calculateMemoryUsage();
    }
    
    startCleanupTimer() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, 60 * 60 * 1000); // 每小时清理一次
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        this.patterns.clear();
        this.patternIndex.clear();
        this.contextPatterns.clear();
        this.semanticGroups.clear();
        this.removeAllListeners();
        
        console.log('[AIPatternCache] 资源清理完成');
    }
}

export default AIPatternCache;