/**
 * DynamicPhaseSkipper - 动态相位跳跃优化器
 * 
 * 功能：
 * 1. 实时监控破解相位效率
 * 2. 基于文件特征和性能指标自动跳过低效相位
 * 3. 自适应超时机制
 * 4. 智能效率检测算法
 * 
 * 设计原则：
 * - 最小化无效尝试时间
 * - 保持高成功率
 * - 自适应学习机制
 * - 错误隔离和回退
 */

import EventEmitter from 'events';

class DynamicPhaseSkipper extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            // 基础超时设置（毫秒）
            baseTimeouts: {
                short_passwords: 30000,      // 30秒
                common_passwords: 60000,     // 1分钟
                dictionary_attack: 120000,   // 2分钟
                ai_generation: 300000,       // 5分钟
                mask_attack: 600000,         // 10分钟
                bruteforce: 1800000         // 30分钟
            },
            
            // 效率阈值
            efficiencyThresholds: {
                critical: 0.01,    // 1% - 立即跳过
                low: 0.05,         // 5% - 考虑跳过
                acceptable: 0.1    // 10% - 继续执行
            },
            
            // 自适应因子
            adaptiveFactors: {
                fileSize: true,
                fileName: true,
                previousSuccess: true,
                hardwareProfile: true
            },
            
            // 学习机制
            learningEnabled: true,
            maxHistorySize: 1000,
            
            ...options
        };
        
        // 状态管理
        this.currentPhase = null;
        this.phaseStartTime = null;
        this.phaseMetrics = new Map();
        this.skipHistory = [];
        this.learningData = new Map();
        
        // 性能监控
        this.performanceWindow = [];
        this.windowSize = 10; // 监控窗口大小
        this.monitoringInterval = null;
        
        // 文件特征缓存
        this.fileCharacteristics = null;
        this.adaptiveTimeouts = new Map();
        
        console.log('[DynamicPhaseSkipper] 初始化完成');
    }
    
    /**
     * 开始监控相位
     */
    startPhaseMonitoring(phaseName, context = {}) {
        console.log(`[DynamicPhaseSkipper] 开始监控相位: ${phaseName}`);
        
        this.currentPhase = phaseName;
        this.phaseStartTime = Date.now();
        this.performanceWindow = [];
        
        // 分析文件特征
        this.fileCharacteristics = this.analyzeFileCharacteristics(context);
        
        // 计算自适应超时
        const adaptiveTimeout = this.calculateAdaptiveTimeout(phaseName, this.fileCharacteristics);
        this.adaptiveTimeouts.set(phaseName, adaptiveTimeout);
        
        // 初始化相位指标
        this.phaseMetrics.set(phaseName, {
            startTime: this.phaseStartTime,
            timeout: adaptiveTimeout,
            passwordsTested: 0,
            efficiency: 0,
            skipped: false,
            skipReason: null
        });
        
        // 开始实时监控
        this.startRealTimeMonitoring();
        
        this.emit('phaseStarted', {
            phase: phaseName,
            timeout: adaptiveTimeout,
            characteristics: this.fileCharacteristics
        });
        
        return {
            phase: phaseName,
            timeout: adaptiveTimeout,
            shouldContinue: true
        };
    }
    
    /**
     * 更新相位进度
     */
    updatePhaseProgress(passwordsTested, currentPassword = '') {
        if (!this.currentPhase) return;
        
        const metrics = this.phaseMetrics.get(this.currentPhase);
        if (!metrics) return;
        
        const elapsed = Date.now() - metrics.startTime;
        const efficiency = passwordsTested > 0 ? (passwordsTested / elapsed) * 1000 : 0; // passwords per second
        
        // 更新指标
        metrics.passwordsTested = passwordsTested;
        metrics.efficiency = efficiency;
        
        // 添加到性能窗口
        this.performanceWindow.push({
            timestamp: Date.now(),
            passwordsTested,
            efficiency,
            currentPassword
        });
        
        // 保持窗口大小
        if (this.performanceWindow.length > this.windowSize) {
            this.performanceWindow.shift();
        }
        
        // 检查是否需要跳过
        const skipDecision = this.shouldSkipPhase(elapsed, efficiency, passwordsTested);
        
        if (skipDecision.shouldSkip) {
            this.skipCurrentPhase(skipDecision.reason);
        }
        
        this.emit('progressUpdate', {
            phase: this.currentPhase,
            elapsed,
            passwordsTested,
            efficiency,
            skipDecision
        });
    }
    
    /**
     * 判断是否应该跳过当前相位
     */
    shouldSkipPhase(elapsed, efficiency, passwordsTested) {
        if (!this.currentPhase) {
            return { shouldSkip: false };
        }
        
        const metrics = this.phaseMetrics.get(this.currentPhase);
        const timeout = metrics.timeout;
        
        // 1. 超时检查
        if (elapsed >= timeout) {
            return {
                shouldSkip: true,
                reason: 'timeout',
                details: `相位超时 (${elapsed}ms >= ${timeout}ms)`
            };
        }
        
        // 2. 效率检查（需要至少运行10秒才开始检查效率）
        if (elapsed > 10000 && passwordsTested > 100) {
            if (efficiency < this.options.efficiencyThresholds.critical) {
                return {
                    shouldSkip: true,
                    reason: 'critical_low_efficiency',
                    details: `效率过低 (${efficiency.toFixed(4)} < ${this.options.efficiencyThresholds.critical})`
                };
            }
            
            // 基于历史数据的智能跳过
            if (this.options.learningEnabled) {
                const historicalDecision = this.checkHistoricalPattern();
                if (historicalDecision.shouldSkip) {
                    return historicalDecision;
                }
            }
        }
        
        // 3. 动态效率检查（基于性能窗口）
        if (this.performanceWindow.length >= 5) {
            const recentEfficiency = this.calculateRecentEfficiency();
            const trend = this.calculateEfficiencyTrend();
            
            if (recentEfficiency < this.options.efficiencyThresholds.low && trend < -0.1) {
                return {
                    shouldSkip: true,
                    reason: 'declining_efficiency',
                    details: `效率下降趋势 (${recentEfficiency.toFixed(4)}, 趋势: ${trend.toFixed(4)})`
                };
            }
        }
        
        // 4. 文件特征相关的跳过逻辑
        const characteristicDecision = this.checkFileCharacteristicSkip(elapsed, passwordsTested);
        if (characteristicDecision.shouldSkip) {
            return characteristicDecision;
        }
        
        return { shouldSkip: false };
    }
    
    /**
     * 跳过当前相位
     */
    skipCurrentPhase(reason) {
        if (!this.currentPhase) return;
        
        console.log(`[DynamicPhaseSkipper] 跳过相位: ${this.currentPhase} - 原因: ${reason}`);
        
        const metrics = this.phaseMetrics.get(this.currentPhase);
        if (metrics) {
            metrics.skipped = true;
            metrics.skipReason = reason;
            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;
        }
        
        // 记录跳过历史
        this.recordSkipHistory(this.currentPhase, reason, metrics);
        
        // 停止监控
        this.stopRealTimeMonitoring();
        
        this.emit('phaseSkipped', {
            phase: this.currentPhase,
            reason,
            metrics: metrics
        });
        
        // 学习机制
        if (this.options.learningEnabled) {
            this.updateLearningData(this.currentPhase, reason, metrics);
        }
        
        this.currentPhase = null;
        this.phaseStartTime = null;
    }
    
    /**
     * 完成当前相位
     */
    completeCurrentPhase(success = false, password = null) {
        if (!this.currentPhase) return;
        
        console.log(`[DynamicPhaseSkipper] 完成相位: ${this.currentPhase} - 成功: ${success}`);
        
        const metrics = this.phaseMetrics.get(this.currentPhase);
        if (metrics) {
            metrics.completed = true;
            metrics.success = success;
            metrics.foundPassword = password;
            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;
        }
        
        // 停止监控
        this.stopRealTimeMonitoring();
        
        this.emit('phaseCompleted', {
            phase: this.currentPhase,
            success,
            password,
            metrics: metrics
        });
        
        // 学习机制
        if (this.options.learningEnabled) {
            this.updateLearningData(this.currentPhase, success ? 'success' : 'completed', metrics);
        }
        
        this.currentPhase = null;
        this.phaseStartTime = null;
    }
    
    /**
     * 分析文件特征
     */
    analyzeFileCharacteristics(context) {
        const characteristics = {
            fileSize: context.fileSize || 0,
            fileName: context.fileName || '',
            fileType: context.fileType || 'unknown',
            hasPersonalInfo: false,
            hasDatePattern: false,
            hasNumberPattern: false,
            complexity: 1.0
        };
        
        // 分析文件名
        if (characteristics.fileName) {
            const fileName = characteristics.fileName.toLowerCase();
            
            // 检查个人信息
            const personalPatterns = ['name', 'photo', 'document', 'resume', 'cv', 'personal'];
            characteristics.hasPersonalInfo = personalPatterns.some(pattern => fileName.includes(pattern));
            
            // 检查日期模式
            characteristics.hasDatePattern = /\d{4}|\d{2}-\d{2}|\d{2}_\d{2}/.test(fileName);
            
            // 检查数字模式
            characteristics.hasNumberPattern = /\d+/.test(fileName);
        }
        
        // 计算复杂度
        let complexity = 1.0;
        if (characteristics.fileSize > 100 * 1024 * 1024) complexity *= 1.2; // 大文件
        if (characteristics.fileName.length > 20) complexity *= 1.1; // 长文件名
        if (characteristics.hasPersonalInfo) complexity *= 0.8; // 个人文件通常密码简单
        if (characteristics.hasDatePattern) complexity *= 0.9; // 包含日期的文件密码相对简单
        
        characteristics.complexity = Math.max(0.5, Math.min(2.0, complexity));
        
        return characteristics;
    }
    
    /**
     * 计算自适应超时
     */
    calculateAdaptiveTimeout(phaseName, characteristics) {
        let baseTimeout = this.options.baseTimeouts[phaseName] || 60000;
        
        // 基于文件特征调整
        if (characteristics) {
            // 小文件，短密码可能性高，减少超时
            if (characteristics.fileSize < 1024 * 1024) { // < 1MB
                baseTimeout *= 0.5;
            }
            
            // 包含个人信息，密码可能简单
            if (characteristics.hasPersonalInfo) {
                baseTimeout *= 0.7;
            }
            
            // 包含日期模式，可能使用日期密码
            if (characteristics.hasDatePattern) {
                baseTimeout *= 0.8;
            }
            
            // 基于复杂度调整
            baseTimeout *= characteristics.complexity;
        }
        
        // 基于历史学习数据调整
        if (this.options.learningEnabled && this.learningData.has(phaseName)) {
            const learningInfo = this.learningData.get(phaseName);
            if (learningInfo.averageSuccessTime > 0) {
                // 如果历史上这个相位平均成功时间较短，减少超时
                const successTimeoutFactor = Math.min(2.0, learningInfo.averageSuccessTime / baseTimeout);
                baseTimeout *= (1 + successTimeoutFactor) / 2;
            }
        }
        
        return Math.max(10000, Math.min(1800000, Math.round(baseTimeout))); // 10秒到30分钟之间
    }
    
    /**
     * 开始实时监控
     */
    startRealTimeMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        this.monitoringInterval = setInterval(() => {
            if (this.currentPhase && this.phaseStartTime) {
                const elapsed = Date.now() - this.phaseStartTime;
                const metrics = this.phaseMetrics.get(this.currentPhase);
                
                if (metrics) {
                    // 检查超时
                    if (elapsed >= metrics.timeout) {
                        this.skipCurrentPhase('timeout');
                    }
                }
            }
        }, 5000); // 每5秒检查一次
    }
    
    /**
     * 停止实时监控
     */
    stopRealTimeMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }
    
    /**
     * 计算最近效率
     */
    calculateRecentEfficiency() {
        if (this.performanceWindow.length < 2) return 0;
        
        const recent = this.performanceWindow.slice(-3); // 最近3个数据点
        const totalEfficiency = recent.reduce((sum, point) => sum + point.efficiency, 0);
        return totalEfficiency / recent.length;
    }
    
    /**
     * 计算效率趋势
     */
    calculateEfficiencyTrend() {
        if (this.performanceWindow.length < 3) return 0;
        
        const recent = this.performanceWindow.slice(-5); // 最近5个数据点
        if (recent.length < 3) return 0;
        
        // 简单线性回归计算趋势
        const n = recent.length;
        const sumX = recent.reduce((sum, _, i) => sum + i, 0);
        const sumY = recent.reduce((sum, point) => sum + point.efficiency, 0);
        const sumXY = recent.reduce((sum, point, i) => sum + i * point.efficiency, 0);
        const sumX2 = recent.reduce((sum, _, i) => sum + i * i, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        return isNaN(slope) ? 0 : slope;
    }
    
    /**
     * 检查历史模式
     */
    checkHistoricalPattern() {
        if (!this.currentPhase || this.skipHistory.length < 3) {
            return { shouldSkip: false };
        }
        
        // 检查相同相位的历史跳过率
        const phaseHistory = this.skipHistory.filter(h => h.phase === this.currentPhase);
        if (phaseHistory.length >= 3) {
            const recentSkips = phaseHistory.slice(-3);
            const skipRate = recentSkips.filter(h => h.skipped).length / recentSkips.length;
            
            if (skipRate >= 0.8) { // 80%的历史记录都被跳过
                return {
                    shouldSkip: true,
                    reason: 'historical_pattern',
                    details: `历史跳过率过高 (${(skipRate * 100).toFixed(1)}%)`
                };
            }
        }
        
        return { shouldSkip: false };
    }
    
    /**
     * 检查文件特征相关的跳过逻辑
     */
    checkFileCharacteristicSkip(elapsed, passwordsTested) {
        if (!this.fileCharacteristics) {
            return { shouldSkip: false };
        }
        
        // 小文件且已经测试了很多密码，可能密码不在当前相位
        if (this.fileCharacteristics.fileSize < 1024 * 1024 && passwordsTested > 10000 && elapsed > 60000) {
            return {
                shouldSkip: true,
                reason: 'small_file_extensive_testing',
                details: `小文件已测试大量密码 (${passwordsTested})`
            };
        }
        
        // 包含日期模式的文件，在非日期相位运行过久
        if (this.fileCharacteristics.hasDatePattern && 
            !['date_patterns', 'short_passwords'].includes(this.currentPhase) && 
            elapsed > 120000) {
            return {
                shouldSkip: true,
                reason: 'date_file_wrong_phase',
                details: '日期文件在非日期相位运行过久'
            };
        }
        
        return { shouldSkip: false };
    }
    
    /**
     * 记录跳过历史
     */
    recordSkipHistory(phase, reason, metrics) {
        const record = {
            phase,
            reason,
            timestamp: Date.now(),
            duration: metrics.duration,
            passwordsTested: metrics.passwordsTested,
            efficiency: metrics.efficiency,
            skipped: true,
            fileCharacteristics: { ...this.fileCharacteristics }
        };
        
        this.skipHistory.push(record);
        
        // 保持历史记录大小
        if (this.skipHistory.length > this.options.maxHistorySize) {
            this.skipHistory.shift();
        }
    }
    
    /**
     * 更新学习数据
     */
    updateLearningData(phase, outcome, metrics) {
        if (!this.learningData.has(phase)) {
            this.learningData.set(phase, {
                totalRuns: 0,
                successCount: 0,
                skipCount: 0,
                averageSuccessTime: 0,
                averageSkipTime: 0,
                totalSuccessTime: 0,
                totalSkipTime: 0
            });
        }
        
        const data = this.learningData.get(phase);
        data.totalRuns++;
        
        if (outcome === 'success') {
            data.successCount++;
            data.totalSuccessTime += metrics.duration;
            data.averageSuccessTime = data.totalSuccessTime / data.successCount;
        } else if (metrics.skipped) {
            data.skipCount++;
            data.totalSkipTime += metrics.duration;
            data.averageSkipTime = data.totalSkipTime / data.skipCount;
        }
    }
    
    /**
     * 获取相位统计信息
     */
    getPhaseStatistics() {
        const stats = {
            currentPhase: this.currentPhase,
            totalPhases: this.phaseMetrics.size,
            skipHistory: this.skipHistory.length,
            learningData: Object.fromEntries(this.learningData),
            adaptiveTimeouts: Object.fromEntries(this.adaptiveTimeouts)
        };
        
        if (this.currentPhase) {
            const metrics = this.phaseMetrics.get(this.currentPhase);
            if (metrics) {
                stats.currentPhaseMetrics = {
                    elapsed: Date.now() - metrics.startTime,
                    timeout: metrics.timeout,
                    passwordsTested: metrics.passwordsTested,
                    efficiency: metrics.efficiency
                };
            }
        }
        
        return stats;
    }
    
    /**
     * 重置学习数据
     */
    resetLearningData() {
        this.learningData.clear();
        this.skipHistory = [];
        console.log('[DynamicPhaseSkipper] 学习数据已重置');
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        this.stopRealTimeMonitoring();
        this.removeAllListeners();
        this.phaseMetrics.clear();
        this.adaptiveTimeouts.clear();
        this.performanceWindow = [];
        this.currentPhase = null;
        this.phaseStartTime = null;
        
        console.log('[DynamicPhaseSkipper] 资源清理完成');
    }
}

export default DynamicPhaseSkipper;