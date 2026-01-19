/**
 * EnhancedStrategyManager - 智能策略管理器
 * 
 * 扩展现有的StrategySelector，增加动态优化能力：
 * 1. 动态策略调整基于文件特征和硬件配置
 * 2. 实时性能监控和策略优化
 * 3. 自适应超时和相位跳跃
 * 4. 用户偏好学习和应用
 * 5. 成功模式记录和复用
 * 
 * 优化目标：
 * - 根据实时性能自动调整策略
 * - 学习成功模式并优先应用
 * - 减少无效尝试，提升破解效率
 */

import StrategySelector from './strategySelector.js';
import SuccessProbabilityEstimator from './SuccessProbabilityEstimator.js';
import path from 'path';
import fs from 'fs';

class EnhancedStrategyManager extends StrategySelector {
    constructor() {
        super();
        
        // Enhanced strategy configurations
        this.enhancedStrategies = {
            SPEED_PRIORITY: {
                name: 'Speed Priority',
                description: '速度优先模式 - 跳过慢速相位，专注快速攻击',
                phases: ['ai', 'top10k', 'keyboard', 'short_brute'],
                weights: {
                    ai: 0.30,           // AI生成高质量密码
                    top10k: 0.35,       // 最常见密码
                    keyboard: 0.25,     // 键盘模式
                    short_brute: 0.10   // 短密码暴力破解
                },
                timeouts: {
                    ai: 300,            // 5分钟AI生成
                    top10k: 60,         // 1分钟常见密码
                    keyboard: 120,      // 2分钟键盘模式
                    short_brute: 600    // 10分钟短暴力破解
                },
                skipSlowPhases: true,
                maxTotalTime: 1800,     // 30分钟总时间限制
                characteristics: ['快速破解', '高命中率', '时间限制']
            },
            THOROUGHNESS_PRIORITY: {
                name: 'Thoroughness Priority',
                description: '彻底性优先模式 - 穷尽搜索，不设超时',
                phases: ['ai', 'top10k', 'keyboard', 'short_brute', 'dictionary', 'rule', 'mask', 'hybrid', 'cpu'],
                weights: {
                    ai: 0.15,
                    top10k: 0.15,
                    keyboard: 0.10,
                    short_brute: 0.15,
                    dictionary: 0.15,
                    rule: 0.10,
                    mask: 0.10,
                    hybrid: 0.05,
                    cpu: 0.05
                },
                timeouts: {
                    // 无超时限制 - 让每个相位完全执行
                },
                skipSlowPhases: false,
                maxTotalTime: null,     // 无时间限制
                characteristics: ['穷尽搜索', '无时间限制', '最大覆盖']
            },
            BALANCED_ADAPTIVE: {
                name: 'Balanced Adaptive',
                description: '平衡自适应模式 - 根据实时性能动态调整',
                phases: ['ai', 'top10k', 'keyboard', 'short_brute', 'dictionary', 'rule', 'mask'],
                weights: {
                    ai: 0.20,
                    top10k: 0.20,
                    keyboard: 0.15,
                    short_brute: 0.15,
                    dictionary: 0.15,
                    rule: 0.10,
                    mask: 0.05
                },
                timeouts: {
                    ai: 600,            // 10分钟
                    top10k: 180,        // 3分钟
                    keyboard: 300,      // 5分钟
                    short_brute: 1200,  // 20分钟
                    dictionary: 1800,   // 30分钟
                    rule: 3600,         // 1小时
                    mask: 7200          // 2小时
                },
                skipSlowPhases: false,
                maxTotalTime: 14400,    // 4小时总时间限制
                adaptiveTimeouts: true,  // 启用自适应超时
                characteristics: ['平衡策略', '自适应调整', '性能优化']
            }
        };
        
        // Performance tracking
        this.performanceHistory = new Map();
        this.successPatterns = new Map();
        this.userPreferences = this.loadUserPreferences();
        
        // Initialize probability estimator
        this.probabilityEstimator = new SuccessProbabilityEstimator();
        
        // Load success patterns from disk
        this.loadSuccessPatterns();
        
        // Real-time adjustment parameters
        this.adjustmentThresholds = {
            lowEfficiency: 0.1,         // 效率低于10%时调整
            highResourceUsage: 0.9,     // 资源使用超过90%时调整
            temperatureLimit: 80,       // 温度超过80°C时调整
            memoryPressure: 0.85        // 内存压力超过85%时调整
        };
        
        console.log('[EnhancedStrategyManager] Initialized with enhanced strategies and probability estimation');
    }
    
    /**
     * 根据文件特征、硬件配置和用户偏好选择最优策略
     */
    async adjustStrategy(fileCharacteristics, hardwareProfile, userPreferences = {}) {
        console.log('[EnhancedStrategyManager] Adjusting strategy for file:', fileCharacteristics.fileName);
        
        // 1. 选择基础策略
        const baseStrategyType = this.selectStrategy(fileCharacteristics.filePath);
        const baseStrategy = this.strategies[baseStrategyType];
        
        // 2. 应用用户偏好
        const preferredMode = userPreferences.mode || this.userPreferences.defaultMode || 'BALANCED_ADAPTIVE';
        let enhancedStrategy;
        
        // 检查是否是自定义策略
        if (this.userPreferences.customStrategies && this.userPreferences.customStrategies[preferredMode]) {
            enhancedStrategy = this.userPreferences.customStrategies[preferredMode];
            console.log('[EnhancedStrategyManager] Using custom strategy:', preferredMode);
        } else {
            enhancedStrategy = this.enhancedStrategies[preferredMode] || this.enhancedStrategies.BALANCED_ADAPTIVE;
        }
        
        // 3. 应用相位过滤（启用/禁用设置）
        const filteredStrategy = this.applyPhaseFiltering(enhancedStrategy);
        
        // 4. 根据硬件配置优化
        const optimizedStrategy = this.optimizeForHardware(filteredStrategy, hardwareProfile);
        
        // 5. 应用历史成功模式
        const finalStrategy = this.applySuccessPatterns(optimizedStrategy, fileCharacteristics);
        
        // 6. 设置自适应超时
        if (finalStrategy.adaptiveTimeouts) {
            finalStrategy.timeouts = this.calculateAdaptiveTimeouts(fileCharacteristics, hardwareProfile);
        }
        
        console.log('[EnhancedStrategyManager] Final strategy:', finalStrategy.name);
        console.log('[EnhancedStrategyManager] Phases:', finalStrategy.phases);
        console.log('[EnhancedStrategyManager] Timeouts:', finalStrategy.timeouts);
        
        return finalStrategy;
    }
    
    /**
     * 根据硬件配置优化策略
     */
    optimizeForHardware(strategy, hardwareProfile) {
        const optimized = JSON.parse(JSON.stringify(strategy)); // Deep copy
        
        // GPU优化
        if (hardwareProfile.gpu && hardwareProfile.gpu.available) {
            // 有GPU时，增加GPU相关相位的权重
            if (optimized.weights.short_brute) optimized.weights.short_brute *= 1.5;
            if (optimized.weights.mask) optimized.weights.mask *= 1.3;
            if (optimized.weights.hybrid) optimized.weights.hybrid *= 1.2;
            
            // 减少CPU相关相位的权重
            if (optimized.weights.cpu) optimized.weights.cpu *= 0.7;
            
            console.log('[EnhancedStrategyManager] GPU optimization applied');
        } else {
            // 无GPU时，增加CPU和AI相关相位的权重
            if (optimized.weights.ai) optimized.weights.ai *= 1.3;
            if (optimized.weights.dictionary) optimized.weights.dictionary *= 1.2;
            if (optimized.weights.cpu) optimized.weights.cpu *= 1.5;
            
            console.log('[EnhancedStrategyManager] CPU-only optimization applied');
        }
        
        // 内存优化
        if (hardwareProfile.memory && hardwareProfile.memory.total < 4 * 1024 * 1024 * 1024) { // < 4GB
            // 低内存系统，减少内存密集型相位
            if (optimized.weights.dictionary) optimized.weights.dictionary *= 0.8;
            if (optimized.weights.rule) optimized.weights.rule *= 0.7;
            
            // 减少超时时间
            Object.keys(optimized.timeouts).forEach(phase => {
                if (optimized.timeouts[phase]) {
                    optimized.timeouts[phase] = Math.floor(optimized.timeouts[phase] * 0.8);
                }
            });
            
            console.log('[EnhancedStrategyManager] Low memory optimization applied');
        }
        
        // CPU核心数优化
        if (hardwareProfile.cpu && hardwareProfile.cpu.cores <= 2) {
            // 双核或单核系统，减少并行相位
            if (optimized.weights.cpu) optimized.weights.cpu *= 0.6;
            
            console.log('[EnhancedStrategyManager] Low CPU core optimization applied');
        }
        
        // 重新归一化权重
        this.normalizeWeights(optimized.weights);
        
        return optimized;
    }
    
    /**
     * 应用历史成功模式
     */
    applySuccessPatterns(strategy, fileCharacteristics) {
        const enhanced = JSON.parse(JSON.stringify(strategy)); // Deep copy
        
        // 查找相似文件的成功模式
        const similarPatterns = this.findSimilarSuccessPatterns(fileCharacteristics);
        
        if (similarPatterns.length > 0) {
            console.log('[EnhancedStrategyManager] Found', similarPatterns.length, 'similar success patterns');
            
            // 根据成功模式调整相位权重
            similarPatterns.forEach(pattern => {
                if (pattern.successfulPhase && enhanced.weights[pattern.successfulPhase]) {
                    enhanced.weights[pattern.successfulPhase] *= 1.5; // 增加成功相位权重
                    console.log('[EnhancedStrategyManager] Boosted weight for phase:', pattern.successfulPhase);
                }
                
                // 如果某个相位从未成功，降低其权重
                if (pattern.failedPhases) {
                    pattern.failedPhases.forEach(phase => {
                        if (enhanced.weights[phase]) {
                            enhanced.weights[phase] *= 0.8;
                        }
                    });
                }
            });
            
            // 重新归一化权重
            this.normalizeWeights(enhanced.weights);
        }
        
        return enhanced;
    }
    
    /**
     * 计算自适应超时
     */
    calculateAdaptiveTimeouts(fileCharacteristics, hardwareProfile) {
        const baseTimeouts = {
            ai: 600,
            top10k: 180,
            keyboard: 300,
            short_brute: 1200,
            dictionary: 1800,
            rule: 3600,
            mask: 7200,
            hybrid: 3600,
            cpu: 7200
        };
        
        const adaptiveTimeouts = { ...baseTimeouts };
        
        // 根据文件大小调整
        const fileSize = this.getFileSize(fileCharacteristics.filePath);
        if (fileSize > 100 * 1024 * 1024) { // > 100MB
            // 大文件可能需要更多时间
            Object.keys(adaptiveTimeouts).forEach(phase => {
                adaptiveTimeouts[phase] = Math.floor(adaptiveTimeouts[phase] * 1.5);
            });
            console.log('[EnhancedStrategyManager] Increased timeouts for large file');
        } else if (fileSize < 1024 * 1024) { // < 1MB
            // 小文件可能更快破解
            Object.keys(adaptiveTimeouts).forEach(phase => {
                adaptiveTimeouts[phase] = Math.floor(adaptiveTimeouts[phase] * 0.7);
            });
            console.log('[EnhancedStrategyManager] Decreased timeouts for small file');
        }
        
        // 根据硬件性能调整
        if (hardwareProfile.gpu && hardwareProfile.gpu.available) {
            // GPU可用时，GPU相关相位可以更快
            adaptiveTimeouts.short_brute = Math.floor(adaptiveTimeouts.short_brute * 0.6);
            adaptiveTimeouts.mask = Math.floor(adaptiveTimeouts.mask * 0.7);
            adaptiveTimeouts.hybrid = Math.floor(adaptiveTimeouts.hybrid * 0.8);
        }
        
        if (hardwareProfile.cpu && hardwareProfile.cpu.cores >= 8) {
            // 多核CPU时，CPU相关相位可以更快
            adaptiveTimeouts.dictionary = Math.floor(adaptiveTimeouts.dictionary * 0.8);
            adaptiveTimeouts.rule = Math.floor(adaptiveTimeouts.rule * 0.8);
            adaptiveTimeouts.cpu = Math.floor(adaptiveTimeouts.cpu * 0.7);
        }
        
        return adaptiveTimeouts;
    }
    
    /**
     * 实时策略调整
     */
    async adjustPhaseInRealtime(currentPhase, performance, elapsedTime, resourceUsage) {
        const adjustment = { action: 'continue' };
        
        // 检查效率
        if (performance.efficiency < this.adjustmentThresholds.lowEfficiency && elapsedTime > 30000) {
            adjustment.action = 'skip';
            adjustment.reason = `Low efficiency detected (${performance.efficiency.toFixed(3)})`;
            console.log('[EnhancedStrategyManager] Recommending phase skip due to low efficiency');
        }
        
        // 检查资源使用
        if (resourceUsage.memory > this.adjustmentThresholds.memoryPressure) {
            adjustment.action = 'reduce_batch_size';
            adjustment.factor = 0.5;
            adjustment.reason = `High memory usage (${(resourceUsage.memory * 100).toFixed(1)}%)`;
            console.log('[EnhancedStrategyManager] Recommending batch size reduction due to memory pressure');
        }
        
        // 检查CPU使用率
        if (resourceUsage.cpu > this.adjustmentThresholds.highResourceUsage) {
            adjustment.action = 'throttle_cpu';
            adjustment.factor = 0.8;
            adjustment.reason = `High CPU usage (${(resourceUsage.cpu * 100).toFixed(1)}%)`;
            console.log('[EnhancedStrategyManager] Recommending CPU throttling');
        }
        
        // 检查温度（如果可用）
        if (resourceUsage.temperature && resourceUsage.temperature.cpu > this.adjustmentThresholds.temperatureLimit) {
            adjustment.action = 'throttle_cpu';
            adjustment.factor = 0.6;
            adjustment.reason = `High CPU temperature (${resourceUsage.temperature.cpu}°C)`;
            console.log('[EnhancedStrategyManager] Recommending CPU throttling due to temperature');
        }
        
        // 记录性能数据
        this.recordPerformance(currentPhase, performance, elapsedTime, resourceUsage);
        
        return adjustment;
    }
    
    /**
     * 记录成功模式
     */
    recordSuccessPattern(fileCharacteristics, successfulPhase, attempts, elapsedTime, strategy) {
        const pattern = {
            fileName: path.basename(fileCharacteristics.filePath),
            fileSize: this.getFileSize(fileCharacteristics.filePath),
            fileType: path.extname(fileCharacteristics.filePath).toLowerCase(),
            successfulPhase,
            attempts,
            elapsedTime,
            strategy: strategy.name,
            timestamp: Date.now()
        };
        
        const key = this.generatePatternKey(fileCharacteristics);
        if (!this.successPatterns.has(key)) {
            this.successPatterns.set(key, []);
        }
        
        this.successPatterns.get(key).push(pattern);
        
        // 保持最近的10个成功记录
        if (this.successPatterns.get(key).length > 10) {
            this.successPatterns.get(key).shift();
        }
        
        console.log('[EnhancedStrategyManager] Recorded success pattern for phase:', successfulPhase);
        
        // 保存到磁盘
        this.saveSuccessPatterns();
    }
    
    /**
     * 查找相似的成功模式
     */
    findSimilarSuccessPatterns(fileCharacteristics) {
        const similar = [];
        const fileSize = this.getFileSize(fileCharacteristics.filePath);
        const fileType = path.extname(fileCharacteristics.filePath).toLowerCase();
        
        for (const [key, patterns] of this.successPatterns.entries()) {
            for (const pattern of patterns) {
                let similarity = 0;
                
                // 文件类型匹配
                if (pattern.fileType === fileType) similarity += 0.4;
                
                // 文件大小相似
                const sizeRatio = Math.min(pattern.fileSize, fileSize) / Math.max(pattern.fileSize, fileSize);
                if (sizeRatio > 0.5) similarity += 0.3 * sizeRatio;
                
                // 文件名模式匹配
                if (this.isFileNameSimilar(pattern.fileName, path.basename(fileCharacteristics.filePath))) {
                    similarity += 0.3;
                }
                
                if (similarity > 0.5) {
                    similar.push({ ...pattern, similarity });
                }
            }
        }
        
        // 按相似度排序
        return similar.sort((a, b) => b.similarity - a.similarity);
    }
    
    /**
     * 记录性能数据
     */
    recordPerformance(phase, performance, elapsedTime, resourceUsage) {
        const key = `${phase}_${Date.now()}`;
        this.performanceHistory.set(key, {
            phase,
            performance,
            elapsedTime,
            resourceUsage,
            timestamp: Date.now()
        });
        
        // 保持最近1000条记录
        if (this.performanceHistory.size > 1000) {
            const oldestKey = this.performanceHistory.keys().next().value;
            this.performanceHistory.delete(oldestKey);
        }
    }
    
    /**
     * 获取性能统计
     */
    getPerformanceStats(phase = null) {
        const entries = Array.from(this.performanceHistory.values());
        const filtered = phase ? entries.filter(entry => entry.phase === phase) : entries;
        
        if (filtered.length === 0) {
            return null;
        }
        
        const efficiencies = filtered.map(entry => entry.performance.efficiency);
        const speeds = filtered.map(entry => entry.performance.passwordsPerSecond);
        
        return {
            phase,
            count: filtered.length,
            avgEfficiency: efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length,
            maxEfficiency: Math.max(...efficiencies),
            minEfficiency: Math.min(...efficiencies),
            avgSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
            maxSpeed: Math.max(...speeds),
            minSpeed: Math.min(...speeds)
        };
    }
    
    /**
     * 工具方法
     */
    normalizeWeights(weights) {
        const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        if (total > 0) {
            Object.keys(weights).forEach(key => {
                weights[key] = weights[key] / total;
            });
        }
    }
    
    generatePatternKey(fileCharacteristics) {
        const fileType = path.extname(fileCharacteristics.filePath).toLowerCase();
        const fileSize = this.getFileSize(fileCharacteristics.filePath);
        const sizeCategory = fileSize < 1024 * 1024 ? 'small' : 
                           fileSize < 100 * 1024 * 1024 ? 'medium' : 'large';
        return `${fileType}_${sizeCategory}`;
    }
    
    getFileSize(filePath) {
        try {
            return fs.statSync(filePath).size;
        } catch (err) {
            return 0;
        }
    }
    
    isFileNameSimilar(name1, name2) {
        // 简单的文件名相似度检测
        const normalize = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const n1 = normalize(name1);
        const n2 = normalize(name2);
        
        if (n1 === n2) return true;
        if (n1.includes(n2) || n2.includes(n1)) return true;
        
        // Levenshtein距离检测
        const distance = this.levenshteinDistance(n1, n2);
        const maxLen = Math.max(n1.length, n2.length);
        return maxLen > 0 && (distance / maxLen) < 0.5;
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * 用户偏好管理
     */
    loadUserPreferences() {
        try {
            const prefsPath = path.join(process.cwd(), '.kiro', 'user-preferences.json');
            if (fs.existsSync(prefsPath)) {
                return JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
            }
        } catch (err) {
            console.log('[EnhancedStrategyManager] Failed to load user preferences:', err.message);
        }
        
        return {
            defaultMode: 'BALANCED_ADAPTIVE',
            preferGPU: true,
            maxTime: null,
            skipSlowPhases: false
        };
    }
    
    saveUserPreferences() {
        try {
            const prefsPath = path.join(process.cwd(), '.kiro', 'user-preferences.json');
            const prefsDir = path.dirname(prefsPath);
            
            if (!fs.existsSync(prefsDir)) {
                fs.mkdirSync(prefsDir, { recursive: true });
            }
            
            fs.writeFileSync(prefsPath, JSON.stringify(this.userPreferences, null, 2));
        } catch (err) {
            console.error('[EnhancedStrategyManager] Failed to save user preferences:', err.message);
        }
    }
    
    saveSuccessPatterns() {
        try {
            const patternsPath = path.join(process.cwd(), '.kiro', 'success-patterns.json');
            const patternsDir = path.dirname(patternsPath);
            
            if (!fs.existsSync(patternsDir)) {
                fs.mkdirSync(patternsDir, { recursive: true });
            }
            
            const patternsObj = {};
            for (const [key, patterns] of this.successPatterns.entries()) {
                patternsObj[key] = patterns;
            }
            
            fs.writeFileSync(patternsPath, JSON.stringify(patternsObj, null, 2));
        } catch (err) {
            console.error('[EnhancedStrategyManager] Failed to save success patterns:', err.message);
        }
    }
    
    loadSuccessPatterns() {
        try {
            const patternsPath = path.join(process.cwd(), '.kiro', 'success-patterns.json');
            if (fs.existsSync(patternsPath)) {
                const patternsObj = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
                for (const [key, patterns] of Object.entries(patternsObj)) {
                    this.successPatterns.set(key, patterns);
                }
                console.log('[EnhancedStrategyManager] Loaded', this.successPatterns.size, 'success pattern groups');
            }
        } catch (err) {
            console.log('[EnhancedStrategyManager] Failed to load success patterns:', err.message);
        }
    }
    
    /**
     * 获取增强策略信息
     */
    getEnhancedStrategyInfo(strategyType) {
        return this.enhancedStrategies[strategyType] || this.enhancedStrategies.BALANCED_ADAPTIVE;
    }
    
    /**
     * 获取所有增强策略
     */
    getAllEnhancedStrategies() {
        return Object.keys(this.enhancedStrategies).map(key => ({
            type: key,
            ...this.enhancedStrategies[key]
        }));
    }
    
    /**
     * 更新用户偏好
     */
    updateUserPreferences(preferences) {
        this.userPreferences = { ...this.userPreferences, ...preferences };
        this.saveUserPreferences();
        console.log('[EnhancedStrategyManager] Updated user preferences');
    }
    
    /**
     * 设置相位启用/禁用状态
     */
    setPhaseEnabled(phaseName, enabled) {
        if (!this.userPreferences.phaseSettings) {
            this.userPreferences.phaseSettings = {};
        }
        
        this.userPreferences.phaseSettings[phaseName] = {
            enabled,
            timestamp: Date.now()
        };
        
        this.saveUserPreferences();
        console.log(`[EnhancedStrategyManager] Phase ${phaseName} ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * 批量设置相位状态
     */
    setMultiplePhases(phaseSettings) {
        if (!this.userPreferences.phaseSettings) {
            this.userPreferences.phaseSettings = {};
        }
        
        Object.entries(phaseSettings).forEach(([phaseName, enabled]) => {
            this.userPreferences.phaseSettings[phaseName] = {
                enabled,
                timestamp: Date.now()
            };
        });
        
        this.saveUserPreferences();
        console.log('[EnhancedStrategyManager] Updated multiple phase settings:', phaseSettings);
    }
    
    /**
     * 获取相位启用状态
     */
    isPhaseEnabled(phaseName) {
        if (!this.userPreferences.phaseSettings || !this.userPreferences.phaseSettings[phaseName]) {
            return true; // 默认启用
        }
        
        return this.userPreferences.phaseSettings[phaseName].enabled;
    }
    
    /**
     * 获取所有相位设置
     */
    getAllPhaseSettings() {
        const allPhases = [
            'ai', 'top10k', 'keyboard', 'short_brute', 'dictionary', 
            'rule', 'mask', 'hybrid', 'cpu', 'bkcrack', 'date_range',
            'keyboard_walk', 'social_engineering'
        ];
        
        const settings = {};
        allPhases.forEach(phase => {
            settings[phase] = {
                enabled: this.isPhaseEnabled(phase),
                description: this.getPhaseDescription(phase)
            };
        });
        
        return settings;
    }
    
    /**
     * 获取相位描述
     */
    getPhaseDescription(phaseName) {
        const descriptions = {
            ai: 'AI密码生成 - 使用PassGPT生成高质量密码候选',
            top10k: '常见密码 - 测试最常用的10000个密码',
            keyboard: '键盘模式 - 测试键盘上的常见模式',
            short_brute: '短密码暴力破解 - GPU加速的短密码穷举',
            dictionary: '字典攻击 - 使用大型密码字典',
            rule: '规则攻击 - 基于规则的密码变换',
            mask: '掩码攻击 - 基于模式的密码生成',
            hybrid: '混合攻击 - 字典+掩码组合攻击',
            cpu: 'CPU暴力破解 - 多线程CPU密码穷举',
            bkcrack: '已知明文攻击 - 针对ZipCrypto的特殊攻击',
            date_range: '日期范围攻击 - 基于年份范围的密码生成',
            keyboard_walk: '键盘步行攻击 - 键盘上相邻按键的模式',
            social_engineering: '社会工程攻击 - 基于文件信息的上下文密码'
        };
        
        return descriptions[phaseName] || '未知相位';
    }
    
    /**
     * 应用相位过滤到策略
     */
    applyPhaseFiltering(strategy) {
        const filtered = JSON.parse(JSON.stringify(strategy)); // Deep copy
        
        // 过滤被禁用的相位
        filtered.phases = filtered.phases.filter(phase => {
            const enabled = this.isPhaseEnabled(phase);
            if (!enabled) {
                console.log(`[EnhancedStrategyManager] Skipping disabled phase: ${phase}`);
                // 从权重中移除
                delete filtered.weights[phase];
                if (filtered.timeouts && filtered.timeouts[phase]) {
                    delete filtered.timeouts[phase];
                }
            }
            return enabled;
        });
        
        // 重新归一化权重
        if (Object.keys(filtered.weights).length > 0) {
            this.normalizeWeights(filtered.weights);
        }
        
        console.log('[EnhancedStrategyManager] Filtered phases:', filtered.phases);
        
        return filtered;
    }
    
    /**
     * 创建自定义策略配置
     */
    createCustomStrategy(name, config) {
        const customStrategy = {
            name: name || 'Custom Strategy',
            description: config.description || '用户自定义策略',
            phases: config.phases || ['ai', 'top10k', 'keyboard', 'short_brute'],
            weights: config.weights || {},
            timeouts: config.timeouts || {},
            skipSlowPhases: config.skipSlowPhases !== undefined ? config.skipSlowPhases : false,
            maxTotalTime: config.maxTotalTime || null,
            adaptiveTimeouts: config.adaptiveTimeouts !== undefined ? config.adaptiveTimeouts : true,
            characteristics: config.characteristics || ['自定义配置']
        };
        
        // 确保权重归一化
        if (Object.keys(customStrategy.weights).length > 0) {
            this.normalizeWeights(customStrategy.weights);
        } else {
            // 如果没有提供权重，平均分配
            const phaseCount = customStrategy.phases.length;
            customStrategy.phases.forEach(phase => {
                customStrategy.weights[phase] = 1.0 / phaseCount;
            });
        }
        
        // 保存自定义策略
        if (!this.userPreferences.customStrategies) {
            this.userPreferences.customStrategies = {};
        }
        
        const strategyKey = name.replace(/\s+/g, '_').toUpperCase();
        this.userPreferences.customStrategies[strategyKey] = customStrategy;
        this.saveUserPreferences();
        
        console.log('[EnhancedStrategyManager] Created custom strategy:', name);
        
        return customStrategy;
    }
    
    /**
     * 获取自定义策略
     */
    getCustomStrategy(name) {
        if (!this.userPreferences.customStrategies) {
            return null;
        }
        
        const strategyKey = name.replace(/\s+/g, '_').toUpperCase();
        return this.userPreferences.customStrategies[strategyKey] || null;
    }
    
    /**
     * 获取所有可用策略（包括自定义）
     */
    getAllAvailableStrategies() {
        const strategies = [];
        
        // 添加内置增强策略
        Object.keys(this.enhancedStrategies).forEach(key => {
            strategies.push({
                type: key,
                category: 'enhanced',
                ...this.enhancedStrategies[key]
            });
        });
        
        // 添加基础策略
        Object.keys(this.strategies).forEach(key => {
            strategies.push({
                type: key,
                category: 'basic',
                ...this.strategies[key]
            });
        });
        
        // 添加自定义策略
        if (this.userPreferences.customStrategies) {
            Object.keys(this.userPreferences.customStrategies).forEach(key => {
                strategies.push({
                    type: key,
                    category: 'custom',
                    ...this.userPreferences.customStrategies[key]
                });
            });
        }
        
        return strategies;
    }
    
    /**
     * 重置相位设置为默认值
     */
    resetPhaseSettings() {
        this.userPreferences.phaseSettings = {};
        this.saveUserPreferences();
        console.log('[EnhancedStrategyManager] Reset all phase settings to default');
    }
    
    /**
     * 导出用户配置
     */
    exportUserConfiguration() {
        return {
            preferences: this.userPreferences,
            phaseSettings: this.getAllPhaseSettings(),
            customStrategies: this.userPreferences.customStrategies || {},
            exportedAt: new Date().toISOString()
        };
    }
    
    /**
     * 导入用户配置
     */
    importUserConfiguration(config) {
        try {
            if (config.preferences) {
                this.userPreferences = { ...this.userPreferences, ...config.preferences };
            }
            
            if (config.phaseSettings) {
                Object.entries(config.phaseSettings).forEach(([phase, setting]) => {
                    if (typeof setting === 'object' && setting.enabled !== undefined) {
                        this.setPhaseEnabled(phase, setting.enabled);
                    }
                });
            }
            
            if (config.customStrategies) {
                if (!this.userPreferences.customStrategies) {
                    this.userPreferences.customStrategies = {};
                }
                this.userPreferences.customStrategies = { 
                    ...this.userPreferences.customStrategies, 
                    ...config.customStrategies 
                };
            }
            
            this.saveUserPreferences();
            console.log('[EnhancedStrategyManager] Successfully imported user configuration');
            
            return { success: true, message: 'Configuration imported successfully' };
        } catch (err) {
            console.error('[EnhancedStrategyManager] Failed to import configuration:', err.message);
            return { success: false, message: err.message };
        }
    }
    
    /**
     * 估算策略成功概率和完成时间
     */
    async estimateStrategyProbability(fileCharacteristics, strategy, hardwareProfile) {
        console.log('[EnhancedStrategyManager] Estimating strategy probability for:', fileCharacteristics.fileName);
        
        const estimation = await this.probabilityEstimator.estimateSuccessProbability(
            fileCharacteristics, 
            strategy, 
            hardwareProfile
        );
        
        return {
            ...estimation,
            strategy: strategy.name,
            recommendedTimeLimit: this.calculateRecommendedTimeLimit(estimation, strategy),
            riskAssessment: this.assessRisk(estimation, strategy)
        };
    }
    
    /**
     * 实时更新概率估算
     */
    updateRealTimeProbability(currentPhase, elapsedTime, attempts, performance) {
        return this.probabilityEstimator.updateProbabilityInRealtime(
            currentPhase, 
            elapsedTime, 
            attempts, 
            performance
        );
    }
    
    /**
     * 记录破解结果用于学习
     */
    recordCrackingOutcome(fileCharacteristics, strategy, result, elapsedTime, phase) {
        // 记录到概率估算器
        this.probabilityEstimator.recordCrackingResult(
            fileCharacteristics, 
            strategy, 
            result, 
            elapsedTime, 
            phase
        );
        
        // 记录到成功模式（现有功能）
        if (result.found) {
            this.recordSuccessPattern(fileCharacteristics, phase, result.attempts, elapsedTime, strategy);
        }
        
        console.log('[EnhancedStrategyManager] Recorded cracking outcome:', {
            success: result.found,
            phase: phase,
            elapsedTime: Math.round(elapsedTime / 1000) + 's'
        });
    }
    
    /**
     * 获取策略比较分析
     */
    async compareStrategies(fileCharacteristics, hardwareProfile) {
        console.log('[EnhancedStrategyManager] Comparing strategies for:', fileCharacteristics.fileName);
        
        const strategies = ['SPEED_PRIORITY', 'BALANCED_ADAPTIVE', 'THOROUGHNESS_PRIORITY'];
        const comparisons = [];
        
        for (const strategyType of strategies) {
            const strategy = this.enhancedStrategies[strategyType];
            const estimation = await this.estimateStrategyProbability(
                fileCharacteristics, 
                strategy, 
                hardwareProfile
            );
            
            comparisons.push({
                strategy: strategyType,
                name: strategy.name,
                probability: estimation.overallProbability,
                confidence: estimation.confidence,
                estimatedTime: estimation.estimatedTime,
                riskAssessment: estimation.riskAssessment,
                characteristics: strategy.characteristics
            });
        }
        
        // 按推荐度排序
        comparisons.sort((a, b) => {
            // 综合评分：概率 * 置信度 - 时间惩罚
            const scoreA = a.probability * a.confidence - (a.estimatedTime / 3600) * 0.1;
            const scoreB = b.probability * b.confidence - (b.estimatedTime / 3600) * 0.1;
            return scoreB - scoreA;
        });
        
        console.log('[EnhancedStrategyManager] Strategy comparison completed');
        console.log('[EnhancedStrategyManager] Recommended strategy:', comparisons[0].strategy);
        
        return {
            recommended: comparisons[0],
            alternatives: comparisons.slice(1),
            fileAnalysis: {
                fileName: fileCharacteristics.fileName,
                estimatedDifficulty: this.estimateDifficulty(comparisons[0].probability),
                keyFactors: this.identifyKeyFactors(fileCharacteristics)
            }
        };
    }
    
    /**
     * 获取概率统计信息
     */
    getProbabilityStatistics() {
        return this.probabilityEstimator.getStatistics();
    }
    
    /**
     * 计算推荐时间限制
     */
    calculateRecommendedTimeLimit(estimation, strategy) {
        const baseProbability = estimation.overallProbability;
        const estimatedTime = estimation.estimatedTime;
        
        // 如果概率很高，建议较短时间
        if (baseProbability > 0.7) {
            return Math.min(estimatedTime, 1800); // 最多30分钟
        }
        
        // 如果概率中等，使用估算时间
        if (baseProbability > 0.3) {
            return estimatedTime;
        }
        
        // 如果概率较低，建议更长时间或彻底模式
        if (strategy.name === 'THOROUGHNESS_PRIORITY') {
            return null; // 无时间限制
        }
        
        return estimatedTime * 2; // 双倍时间
    }
    
    /**
     * 评估风险
     */
    assessRisk(estimation, strategy) {
        const probability = estimation.overallProbability;
        const confidence = estimation.confidence;
        const time = estimation.estimatedTime;
        
        let risk = 'medium';
        let factors = [];
        
        if (probability < 0.2) {
            risk = 'high';
            factors.push('成功概率较低');
        } else if (probability > 0.7) {
            risk = 'low';
            factors.push('成功概率较高');
        }
        
        if (confidence < 0.5) {
            if (risk === 'low') risk = 'medium';
            factors.push('预测置信度不足');
        }
        
        if (time > 7200) { // 2小时
            if (risk === 'low') risk = 'medium';
            factors.push('预计耗时较长');
        }
        
        if (strategy.name === 'SPEED_PRIORITY' && probability < 0.4) {
            factors.push('速度模式可能错过密码');
        }
        
        return {
            level: risk,
            factors,
            recommendation: this.generateRiskRecommendation(risk, factors)
        };
    }
    
    /**
     * 生成风险建议
     */
    generateRiskRecommendation(riskLevel, factors) {
        switch (riskLevel) {
            case 'low':
                return '建议使用当前策略，成功概率较高';
            case 'medium':
                return '建议监控进度，必要时切换到彻底模式';
            case 'high':
                return '建议直接使用彻底模式，或考虑其他破解方法';
            default:
                return '建议根据实际情况调整策略';
        }
    }
    
    /**
     * 估算难度
     */
    estimateDifficulty(probability) {
        if (probability > 0.7) return 'easy';
        if (probability > 0.4) return 'medium';
        if (probability > 0.2) return 'hard';
        return 'very_hard';
    }
    
    /**
     * 识别关键因素
     */
    identifyKeyFactors(fileCharacteristics) {
        const factors = [];
        
        const fileName = path.basename(fileCharacteristics.filePath).toLowerCase();
        
        if (fileName.includes('personal') || fileName.includes('photo')) {
            factors.push('个人文件 - 密码可能较简单');
        }
        
        if (fileName.includes('work') || fileName.includes('project')) {
            factors.push('工作文件 - 可能使用规则密码');
        }
        
        if (/\d{4}/.test(fileName)) {
            factors.push('包含年份 - 可能使用日期密码');
        }
        
        if (fileName.includes('backup') || fileName.includes('archive')) {
            factors.push('备份文件 - 安全性可能较高');
        }
        
        try {
            const stats = fs.statSync(fileCharacteristics.filePath);
            const size = stats.size;
            
            if (size < 1024 * 1024) {
                factors.push('小文件 - 破解速度较快');
            } else if (size > 100 * 1024 * 1024) {
                factors.push('大文件 - 可能影响破解速度');
            }
        } catch (err) {
            // 忽略文件访问错误
        }
        
        return factors;
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.saveUserPreferences();
        this.saveSuccessPatterns();
        this.performanceHistory.clear();
        
        // 清理概率估算器
        if (this.probabilityEstimator) {
            this.probabilityEstimator.dispose();
        }
        
        console.log('[EnhancedStrategyManager] Disposed');
    }
}

export default EnhancedStrategyManager;