/**
 * SuccessProbabilityEstimator - 成功概率估算器
 * 
 * 功能：
 * 1. 基于历史数据计算破解成功概率
 * 2. 实时更新概率估算
 * 3. 提供不同策略模式的成功率预测
 * 4. 学习文件特征与成功率的关联
 * 
 * 算法：
 * - 贝叶斯概率模型
 * - 文件特征权重学习
 * - 时间衰减因子
 * - 多维度特征匹配
 */

import path from 'path';
import fs from 'fs';

class SuccessProbabilityEstimator {
    constructor() {
        // 历史数据存储
        this.historicalData = new Map();
        this.featureWeights = new Map();
        this.phaseSuccessRates = new Map();
        
        // 概率计算参数
        this.config = {
            minSampleSize: 5,           // 最小样本数量
            timeDecayFactor: 0.95,      // 时间衰减因子（每天）
            confidenceThreshold: 0.7,   // 置信度阈值
            maxHistoryDays: 90,         // 最大历史天数
            featureLearningRate: 0.1    // 特征学习率
        };
        
        // 文件特征提取器
        this.featureExtractors = {
            fileSize: this.extractFileSizeFeature.bind(this),
            fileType: this.extractFileTypeFeature.bind(this),
            fileName: this.extractFileNameFeature.bind(this),
            pathContext: this.extractPathContextFeature.bind(this),
            timeContext: this.extractTimeContextFeature.bind(this)
        };
        
        // 初始化默认成功率
        this.initializeDefaultRates();
        
        // 加载历史数据
        this.loadHistoricalData();
        
        console.log('[SuccessProbabilityEstimator] Initialized with probability estimation');
    }
    
    /**
     * 估算文件破解成功概率
     */
    async estimateSuccessProbability(fileCharacteristics, strategy, hardwareProfile) {
        console.log('[SuccessProbabilityEstimator] Estimating success probability for:', fileCharacteristics.fileName);
        
        // 1. 提取文件特征
        const features = this.extractFileFeatures(fileCharacteristics);
        
        // 2. 计算基础概率
        const baseProbability = this.calculateBaseProbability(features, strategy);
        
        // 3. 应用策略调整
        const strategyAdjustedProbability = this.applyStrategyAdjustment(baseProbability, strategy);
        
        // 4. 应用硬件调整
        const hardwareAdjustedProbability = this.applyHardwareAdjustment(strategyAdjustedProbability, hardwareProfile);
        
        // 5. 计算各相位概率
        const phasesProbabilities = this.calculatePhasesProbabilities(features, strategy);
        
        // 6. 估算时间
        const estimatedTime = this.estimateCompletionTime(features, strategy, hardwareProfile);
        
        const result = {
            overallProbability: Math.max(0.01, Math.min(0.99, hardwareAdjustedProbability)),
            confidence: this.calculateConfidence(features),
            phasesProbabilities,
            estimatedTime,
            features,
            reasoning: this.generateReasoning(features, strategy, baseProbability)
        };
        
        console.log('[SuccessProbabilityEstimator] Estimated probability:', (result.overallProbability * 100).toFixed(1) + '%');
        console.log('[SuccessProbabilityEstimator] Confidence:', (result.confidence * 100).toFixed(1) + '%');
        
        return result;
    }
    
    /**
     * 实时更新概率估算
     */
    updateProbabilityInRealtime(currentPhase, elapsedTime, attempts, performance) {
        const phaseKey = currentPhase.name || currentPhase;
        const currentRate = this.phaseSuccessRates.get(phaseKey) || { attempts: 0, successes: 0 };
        
        // 计算当前相位的实时成功率
        const currentPhaseRate = currentRate.successes / Math.max(currentRate.attempts, 1);
        
        // 基于已尝试次数和性能调整概率
        let adjustedProbability = currentPhaseRate;
        
        // 时间因子：时间越长，概率可能下降
        const timeFactor = Math.exp(-elapsedTime / (10 * 60 * 1000)); // 10分钟半衰期
        adjustedProbability *= timeFactor;
        
        // 性能因子：效率越低，概率越低
        if (performance && performance.efficiency) {
            const efficiencyFactor = Math.pow(performance.efficiency, 0.5);
            adjustedProbability *= efficiencyFactor;
        }
        
        // 尝试次数因子：尝试越多，剩余概率越低
        const attemptsFactor = Math.exp(-attempts / 1000000); // 100万次尝试半衰期
        adjustedProbability *= attemptsFactor;
        
        const result = {
            currentPhaseProbability: Math.max(0.001, Math.min(0.999, adjustedProbability)),
            remainingPhasesProbability: this.calculateRemainingPhasesProbability(currentPhase),
            overallRemainingProbability: Math.max(0.001, adjustedProbability * 0.7 + this.calculateRemainingPhasesProbability(currentPhase) * 0.3),
            timeFactor,
            efficiencyFactor: performance?.efficiency || 1,
            attemptsFactor
        };
        
        console.log('[SuccessProbabilityEstimator] Real-time probability update:', {
            phase: phaseKey,
            probability: (result.currentPhaseProbability * 100).toFixed(2) + '%',
            overall: (result.overallRemainingProbability * 100).toFixed(2) + '%'
        });
        
        return result;
    }
    
    /**
     * 记录破解结果，用于学习
     */
    recordCrackingResult(fileCharacteristics, strategy, result, elapsedTime, phase) {
        const features = this.extractFileFeatures(fileCharacteristics);
        const featureKey = this.generateFeatureKey(features);
        
        const record = {
            features,
            strategy: strategy.name,
            success: result.found,
            elapsedTime,
            successfulPhase: result.found ? phase : null,
            attempts: result.attempts || 0,
            timestamp: Date.now()
        };
        
        // 存储到历史数据
        if (!this.historicalData.has(featureKey)) {
            this.historicalData.set(featureKey, []);
        }
        
        this.historicalData.get(featureKey).push(record);
        
        // 限制历史记录数量
        const records = this.historicalData.get(featureKey);
        if (records.length > 100) {
            records.shift(); // 移除最旧的记录
        }
        
        // 更新相位成功率
        this.updatePhaseSuccessRate(phase, result.found);
        
        // 更新特征权重
        this.updateFeatureWeights(features, result.found);
        
        console.log('[SuccessProbabilityEstimator] Recorded result:', {
            success: result.found,
            phase: phase,
            features: Object.keys(features).length
        });
        
        // 保存到磁盘
        this.saveHistoricalData();
    }
    
    /**
     * 提取文件特征
     */
    extractFileFeatures(fileCharacteristics) {
        const features = {};
        
        // 应用所有特征提取器
        for (const [name, extractor] of Object.entries(this.featureExtractors)) {
            try {
                features[name] = extractor(fileCharacteristics);
            } catch (err) {
                console.warn(`[SuccessProbabilityEstimator] Feature extraction failed for ${name}:`, err.message);
                features[name] = null;
            }
        }
        
        return features;
    }
    
    /**
     * 文件大小特征
     */
    extractFileSizeFeature(fileCharacteristics) {
        const size = this.getFileSize(fileCharacteristics.filePath);
        
        if (size < 1024 * 1024) return 'small';           // < 1MB
        if (size < 10 * 1024 * 1024) return 'medium';     // < 10MB
        if (size < 100 * 1024 * 1024) return 'large';     // < 100MB
        return 'very_large';                               // >= 100MB
    }
    
    /**
     * 文件类型特征
     */
    extractFileTypeFeature(fileCharacteristics) {
        const ext = path.extname(fileCharacteristics.filePath).toLowerCase();
        
        const typeMap = {
            '.zip': 'archive',
            '.rar': 'archive',
            '.7z': 'archive',
            '.tar': 'archive',
            '.gz': 'archive',
            '.pdf': 'document',
            '.doc': 'document',
            '.docx': 'document',
            '.xls': 'document',
            '.xlsx': 'document',
            '.ppt': 'document',
            '.pptx': 'document'
        };
        
        return typeMap[ext] || 'unknown';
    }
    
    /**
     * 文件名特征
     */
    extractFileNameFeature(fileCharacteristics) {
        const fileName = path.basename(fileCharacteristics.filePath, path.extname(fileCharacteristics.filePath)).toLowerCase();
        
        const features = {
            hasDate: /\d{4}[-_]\d{2}[-_]\d{2}|\d{8}|\d{4}/.test(fileName),
            hasVersion: /v\d+|version|ver\d+|_v\d+/.test(fileName),
            isBackup: /backup|bak|copy|archive/.test(fileName),
            isPersonal: /photo|picture|family|personal|private/.test(fileName),
            isWork: /work|project|report|document|contract/.test(fileName),
            hasNumbers: /\d+/.test(fileName),
            length: fileName.length
        };
        
        return features;
    }
    
    /**
     * 路径上下文特征
     */
    extractPathContextFeature(fileCharacteristics) {
        const dirPath = path.dirname(fileCharacteristics.filePath).toLowerCase();
        const pathComponents = dirPath.split(/[/\\]/).filter(c => c.length > 0);
        
        return {
            depth: pathComponents.length,
            hasUserPath: pathComponents.some(c => ['users', 'user', 'home'].includes(c)),
            hasWorkPath: pathComponents.some(c => ['work', 'project', 'documents', 'desktop'].includes(c)),
            hasPersonalPath: pathComponents.some(c => ['personal', 'private', 'photos', 'pictures'].includes(c))
        };
    }
    
    /**
     * 时间上下文特征
     */
    extractTimeContextFeature(fileCharacteristics) {
        try {
            const stats = fs.statSync(fileCharacteristics.filePath);
            const now = Date.now();
            const created = stats.birthtime.getTime();
            const modified = stats.mtime.getTime();
            
            const ageInDays = (now - created) / (24 * 60 * 60 * 1000);
            const modifiedAgeInDays = (now - modified) / (24 * 60 * 60 * 1000);
            
            return {
                ageCategory: ageInDays < 30 ? 'recent' : ageInDays < 365 ? 'medium' : 'old',
                isRecentlyModified: modifiedAgeInDays < 7,
                creationYear: new Date(created).getFullYear()
            };
        } catch (err) {
            return {
                ageCategory: 'unknown',
                isRecentlyModified: false,
                creationYear: new Date().getFullYear()
            };
        }
    }
    
    /**
     * 计算基础概率
     */
    calculateBaseProbability(features, strategy) {
        let baseProbability = 0.3; // 默认30%基础概率
        
        // 文件大小影响
        const sizeMultipliers = {
            'small': 1.2,      // 小文件更容易破解
            'medium': 1.0,     // 中等文件标准概率
            'large': 0.8,      // 大文件稍难
            'very_large': 0.6  // 超大文件更难
        };
        
        if (features.fileSize && sizeMultipliers[features.fileSize]) {
            baseProbability *= sizeMultipliers[features.fileSize];
        }
        
        // 文件类型影响
        const typeMultipliers = {
            'document': 1.3,   // 文档类文件通常密码较简单
            'archive': 1.0,    // 压缩包标准
            'unknown': 0.9     // 未知类型稍低
        };
        
        if (features.fileType && typeMultipliers[features.fileType]) {
            baseProbability *= typeMultipliers[features.fileType];
        }
        
        // 文件名特征影响
        if (features.fileName) {
            if (features.fileName.isPersonal) baseProbability *= 1.4; // 个人文件密码通常简单
            if (features.fileName.isWork) baseProbability *= 1.1;     // 工作文件稍简单
            if (features.fileName.hasDate) baseProbability *= 1.2;    // 有日期的文件可能用日期做密码
            if (features.fileName.isBackup) baseProbability *= 0.9;   // 备份文件可能更安全
        }
        
        // 路径上下文影响
        if (features.pathContext) {
            if (features.pathContext.hasPersonalPath) baseProbability *= 1.3;
            if (features.pathContext.hasWorkPath) baseProbability *= 1.1;
        }
        
        // 时间上下文影响
        if (features.timeContext) {
            if (features.timeContext.ageCategory === 'old') baseProbability *= 1.2; // 老文件密码可能较简单
            if (features.timeContext.isRecentlyModified) baseProbability *= 0.9;    // 最近修改的可能更安全
        }
        
        // 查找相似历史记录
        const similarRecords = this.findSimilarHistoricalRecords(features);
        if (similarRecords.length >= this.config.minSampleSize) {
            const historicalRate = this.calculateHistoricalSuccessRate(similarRecords);
            // 历史数据权重70%，特征分析权重30%
            baseProbability = historicalRate * 0.7 + baseProbability * 0.3;
        }
        
        return Math.max(0.01, Math.min(0.95, baseProbability));
    }
    
    /**
     * 应用策略调整
     */
    applyStrategyAdjustment(baseProbability, strategy) {
        const strategyMultipliers = {
            'SPEED_PRIORITY': 0.7,        // 速度优先牺牲一些成功率
            'THOROUGHNESS_PRIORITY': 1.4, // 彻底性优先提高成功率
            'BALANCED_ADAPTIVE': 1.0      // 平衡模式标准
        };
        
        const strategyName = strategy.name || 'BALANCED_ADAPTIVE';
        const multiplier = strategyMultipliers[strategyName] || 1.0;
        
        return baseProbability * multiplier;
    }
    
    /**
     * 应用硬件调整
     */
    applyHardwareAdjustment(probability, hardwareProfile) {
        let adjustment = 1.0;
        
        // GPU可用性影响
        if (hardwareProfile.gpu && hardwareProfile.gpu.available) {
            adjustment *= 1.2; // GPU可以提高成功率
        }
        
        // CPU核心数影响
        if (hardwareProfile.cpu && hardwareProfile.cpu.cores) {
            const coreMultiplier = Math.min(1.3, 1.0 + (hardwareProfile.cpu.cores - 2) * 0.05);
            adjustment *= coreMultiplier;
        }
        
        // 内存影响
        if (hardwareProfile.memory && hardwareProfile.memory.total) {
            const memoryGB = hardwareProfile.memory.total / (1024 * 1024 * 1024);
            if (memoryGB >= 16) adjustment *= 1.1;
            else if (memoryGB < 4) adjustment *= 0.9;
        }
        
        return probability * adjustment;
    }
    
    /**
     * 计算各相位概率
     */
    calculatePhasesProbabilities(features, strategy) {
        const phasesProbabilities = {};
        
        if (!strategy.phases) return phasesProbabilities;
        
        for (const phase of strategy.phases) {
            const phaseRate = this.phaseSuccessRates.get(phase) || { attempts: 0, successes: 0 };
            let phaseProbability = phaseRate.successes / Math.max(phaseRate.attempts, 1);
            
            // 如果没有历史数据，使用默认概率
            if (phaseRate.attempts === 0) {
                phaseProbability = this.getDefaultPhaseRate(phase);
            }
            
            // 根据文件特征调整相位概率
            phaseProbability = this.adjustPhaseByFeatures(phase, phaseProbability, features);
            
            phasesProbabilities[phase] = Math.max(0.001, Math.min(0.999, phaseProbability));
        }
        
        return phasesProbabilities;
    }
    
    /**
     * 根据特征调整相位概率
     */
    adjustPhaseByFeatures(phase, baseProbability, features) {
        let adjusted = baseProbability;
        
        // AI相位调整
        if (phase === 'ai') {
            if (features.fileName?.isPersonal) adjusted *= 1.3;
            if (features.fileName?.hasNumbers) adjusted *= 1.2;
        }
        
        // 字典攻击调整
        if (phase === 'dictionary' || phase === 'top10k') {
            if (features.fileName?.isPersonal) adjusted *= 1.4;
            if (features.pathContext?.hasPersonalPath) adjusted *= 1.2;
        }
        
        // 键盘模式调整
        if (phase === 'keyboard') {
            if (features.fileName?.isPersonal) adjusted *= 1.3;
            if (features.timeContext?.ageCategory === 'old') adjusted *= 1.2;
        }
        
        // 日期攻击调整
        if (phase === 'date_range') {
            if (features.fileName?.hasDate) adjusted *= 2.0;
            if (features.fileName?.isWork) adjusted *= 1.5;
        }
        
        // 暴力破解调整
        if (phase === 'short_brute' || phase === 'cpu') {
            if (features.fileSize === 'small') adjusted *= 1.2;
            if (features.fileName?.length && features.fileName.length < 10) adjusted *= 1.1;
        }
        
        return adjusted;
    }
    
    /**
     * 估算完成时间
     */
    estimateCompletionTime(features, strategy, hardwareProfile) {
        let baseTime = 3600; // 1小时基础时间
        
        // 根据策略调整
        const strategyTimeMultipliers = {
            'SPEED_PRIORITY': 0.5,
            'THOROUGHNESS_PRIORITY': 3.0,
            'BALANCED_ADAPTIVE': 1.0
        };
        
        const strategyName = strategy.name || 'BALANCED_ADAPTIVE';
        baseTime *= strategyTimeMultipliers[strategyName] || 1.0;
        
        // 根据文件特征调整
        if (features.fileSize === 'large' || features.fileSize === 'very_large') {
            baseTime *= 1.5;
        }
        
        if (features.fileName?.isPersonal) {
            baseTime *= 0.7; // 个人文件通常更快
        }
        
        // 根据硬件调整
        if (hardwareProfile.gpu?.available) {
            baseTime *= 0.6; // GPU加速
        }
        
        if (hardwareProfile.cpu?.cores >= 8) {
            baseTime *= 0.8; // 多核加速
        }
        
        return Math.max(300, baseTime); // 最少5分钟
    }
    
    /**
     * 计算置信度
     */
    calculateConfidence(features) {
        const featureKey = this.generateFeatureKey(features);
        const similarRecords = this.findSimilarHistoricalRecords(features);
        
        if (similarRecords.length === 0) {
            return 0.3; // 无历史数据，低置信度
        }
        
        if (similarRecords.length < this.config.minSampleSize) {
            return 0.5; // 样本不足，中等置信度
        }
        
        // 基于样本数量和时间新鲜度计算置信度
        const sampleFactor = Math.min(1.0, similarRecords.length / 20);
        const avgAge = similarRecords.reduce((sum, r) => sum + (Date.now() - r.timestamp), 0) / similarRecords.length;
        const ageFactor = Math.exp(-avgAge / (30 * 24 * 60 * 60 * 1000)); // 30天衰减
        
        return Math.max(0.3, Math.min(0.95, sampleFactor * 0.6 + ageFactor * 0.4));
    }
    
    /**
     * 生成推理说明
     */
    generateReasoning(features, strategy, baseProbability) {
        const reasons = [];
        
        if (features.fileName?.isPersonal) {
            reasons.push('个人文件通常使用较简单的密码');
        }
        
        if (features.fileName?.hasDate) {
            reasons.push('文件名包含日期，可能使用日期相关密码');
        }
        
        if (features.fileSize === 'small') {
            reasons.push('小文件破解速度较快');
        }
        
        if (strategy.name === 'SPEED_PRIORITY') {
            reasons.push('速度优先模式专注于快速攻击');
        } else if (strategy.name === 'THOROUGHNESS_PRIORITY') {
            reasons.push('彻底性模式提供更全面的攻击覆盖');
        }
        
        const similarRecords = this.findSimilarHistoricalRecords(features);
        if (similarRecords.length >= this.config.minSampleSize) {
            const historicalRate = this.calculateHistoricalSuccessRate(similarRecords);
            reasons.push(`基于${similarRecords.length}个相似案例，历史成功率${(historicalRate * 100).toFixed(1)}%`);
        }
        
        return reasons;
    }
    
    /**
     * 工具方法
     */
    
    getFileSize(filePath) {
        try {
            return fs.statSync(filePath).size;
        } catch (err) {
            return 0;
        }
    }
    
    generateFeatureKey(features) {
        const keyParts = [
            features.fileSize || 'unknown',
            features.fileType || 'unknown',
            features.fileName?.isPersonal ? 'personal' : 'not_personal',
            features.fileName?.isWork ? 'work' : 'not_work'
        ];
        return keyParts.join('_');
    }
    
    findSimilarHistoricalRecords(features) {
        const similar = [];
        const targetKey = this.generateFeatureKey(features);
        
        for (const [key, records] of this.historicalData.entries()) {
            // 简单的相似度匹配
            if (key === targetKey) {
                similar.push(...records);
            } else {
                // 部分匹配
                const keyParts = key.split('_');
                const targetParts = targetKey.split('_');
                let matches = 0;
                
                for (let i = 0; i < Math.min(keyParts.length, targetParts.length); i++) {
                    if (keyParts[i] === targetParts[i]) matches++;
                }
                
                if (matches >= 2) { // 至少2个特征匹配
                    similar.push(...records);
                }
            }
        }
        
        // 按时间排序，最新的在前
        return similar.sort((a, b) => b.timestamp - a.timestamp).slice(0, 50);
    }
    
    calculateHistoricalSuccessRate(records) {
        if (records.length === 0) return 0.3;
        
        let totalWeight = 0;
        let weightedSuccesses = 0;
        const now = Date.now();
        
        for (const record of records) {
            // 时间衰减权重
            const ageInDays = (now - record.timestamp) / (24 * 60 * 60 * 1000);
            const weight = Math.pow(this.config.timeDecayFactor, ageInDays);
            
            totalWeight += weight;
            if (record.success) {
                weightedSuccesses += weight;
            }
        }
        
        return totalWeight > 0 ? weightedSuccesses / totalWeight : 0.3;
    }
    
    calculateRemainingPhasesProbability(currentPhase) {
        // 简化计算：假设剩余相位有30%的总体成功概率
        return 0.3;
    }
    
    updatePhaseSuccessRate(phase, success) {
        if (!this.phaseSuccessRates.has(phase)) {
            this.phaseSuccessRates.set(phase, { attempts: 0, successes: 0 });
        }
        
        const rate = this.phaseSuccessRates.get(phase);
        rate.attempts++;
        if (success) rate.successes++;
        
        // 限制历史记录，避免过度偏向旧数据
        if (rate.attempts > 1000) {
            rate.attempts = Math.floor(rate.attempts * 0.9);
            rate.successes = Math.floor(rate.successes * 0.9);
        }
    }
    
    updateFeatureWeights(features, success) {
        for (const [featureName, featureValue] of Object.entries(features)) {
            if (featureValue === null || featureValue === undefined) continue;
            
            const key = `${featureName}_${JSON.stringify(featureValue)}`;
            
            if (!this.featureWeights.has(key)) {
                this.featureWeights.set(key, { weight: 0.5, samples: 0 });
            }
            
            const fw = this.featureWeights.get(key);
            const target = success ? 1.0 : 0.0;
            
            // 使用指数移动平均更新权重
            fw.weight = fw.weight * (1 - this.config.featureLearningRate) + target * this.config.featureLearningRate;
            fw.samples++;
        }
    }
    
    initializeDefaultRates() {
        // 初始化默认相位成功率
        const defaultRates = {
            'ai': 0.25,
            'top10k': 0.35,
            'keyboard': 0.20,
            'short_brute': 0.15,
            'dictionary': 0.30,
            'rule': 0.25,
            'mask': 0.20,
            'hybrid': 0.15,
            'cpu': 0.10,
            'bkcrack': 0.05,
            'date_range': 0.15,
            'keyboard_walk': 0.12,
            'social_engineering': 0.18
        };
        
        for (const [phase, rate] of Object.entries(defaultRates)) {
            this.phaseSuccessRates.set(phase, {
                attempts: 10, // 虚拟样本
                successes: Math.round(rate * 10)
            });
        }
    }
    
    getDefaultPhaseRate(phase) {
        const rate = this.phaseSuccessRates.get(phase);
        return rate ? rate.successes / rate.attempts : 0.2;
    }
    
    /**
     * 数据持久化
     */
    saveHistoricalData() {
        try {
            const dataPath = path.join(process.cwd(), '.kiro', 'probability-data.json');
            const dataDir = path.dirname(dataPath);
            
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            
            const data = {
                historicalData: Object.fromEntries(this.historicalData),
                featureWeights: Object.fromEntries(this.featureWeights),
                phaseSuccessRates: Object.fromEntries(this.phaseSuccessRates),
                lastUpdated: Date.now()
            };
            
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        } catch (err) {
            console.error('[SuccessProbabilityEstimator] Failed to save data:', err.message);
        }
    }
    
    loadHistoricalData() {
        try {
            const dataPath = path.join(process.cwd(), '.kiro', 'probability-data.json');
            
            if (fs.existsSync(dataPath)) {
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                
                if (data.historicalData) {
                    for (const [key, records] of Object.entries(data.historicalData)) {
                        this.historicalData.set(key, records);
                    }
                }
                
                if (data.featureWeights) {
                    for (const [key, weight] of Object.entries(data.featureWeights)) {
                        this.featureWeights.set(key, weight);
                    }
                }
                
                if (data.phaseSuccessRates) {
                    for (const [key, rate] of Object.entries(data.phaseSuccessRates)) {
                        this.phaseSuccessRates.set(key, rate);
                    }
                }
                
                console.log('[SuccessProbabilityEstimator] Loaded historical data:', {
                    records: this.historicalData.size,
                    weights: this.featureWeights.size,
                    phases: this.phaseSuccessRates.size
                });
            }
        } catch (err) {
            console.log('[SuccessProbabilityEstimator] Failed to load historical data:', err.message);
        }
    }
    
    /**
     * 获取统计信息
     */
    getStatistics() {
        const totalRecords = Array.from(this.historicalData.values()).reduce((sum, records) => sum + records.length, 0);
        const totalSuccesses = Array.from(this.historicalData.values())
            .flat()
            .filter(record => record.success).length;
        
        const overallSuccessRate = totalRecords > 0 ? totalSuccesses / totalRecords : 0;
        
        const phaseStats = {};
        for (const [phase, rate] of this.phaseSuccessRates.entries()) {
            phaseStats[phase] = {
                attempts: rate.attempts,
                successes: rate.successes,
                rate: rate.attempts > 0 ? rate.successes / rate.attempts : 0
            };
        }
        
        return {
            totalRecords,
            totalSuccesses,
            overallSuccessRate,
            phaseStats,
            featureWeightsCount: this.featureWeights.size
        };
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.saveHistoricalData();
        this.historicalData.clear();
        this.featureWeights.clear();
        this.phaseSuccessRates.clear();
        console.log('[SuccessProbabilityEstimator] Disposed');
    }
}

export default SuccessProbabilityEstimator;