/**
 * StatsCollector - 统计信息收集器
 * 
 * 功能：
 * 1. 收集破解过程中的实时统计信息
 * 2. 计算速度、进度、预估时间
 * 3. 记录每个Phase的性能数据
 * 4. 提供统计信息查询接口
 * 
 * 使用方法：
 * const stats = new StatsCollector(sessionId);
 * stats.updateProgress(testedPasswords, totalPasswords);
 * stats.updateSpeed(currentSpeed);
 * const info = stats.getStats();
 */

class StatsCollector {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.startTime = Date.now();
        this.lastUpdateTime = Date.now();

        // 进度信息
        this.currentPhase = null;
        this.totalPhases = 0;
        this.testedPasswords = 0;
        this.totalPasswords = 0;

        // 速度信息
        this.currentSpeed = 0;
        this.speedHistory = [];
        this.maxSpeedHistorySize = 10;

        // Phase统计
        this.phaseStats = new Map();
        this.currentPhaseStartTime = null;
        this.currentPhaseTestedPasswords = 0;

        // 历史记录
        this.speedSamples = [];
        this.maxSamples = 100;
    }

    /**
     * 更新进度信息
     * @param {number} testedPasswords - 已测试密码数
     * @param {number} totalPasswords - 总密码数
     */
    updateProgress(testedPasswords, totalPasswords) {
        this.testedPasswords = testedPasswords;
        this.totalPasswords = totalPasswords;
        this.lastUpdateTime = Date.now();
    }

    /**
     * 更新当前速度
     * @param {number} speed - 当前速度（pwd/s）
     */
    updateSpeed(speed) {
        this.currentSpeed = speed;
        this.lastUpdateTime = Date.now();

        // 添加到速度历史
        this.speedHistory.push(speed);
        if (this.speedHistory.length > this.maxSpeedHistorySize) {
            this.speedHistory.shift();
        }

        // 添加到采样历史
        this.speedSamples.push({
            time: Date.now(),
            speed: speed
        });
        if (this.speedSamples.length > this.maxSamples) {
            this.speedSamples.shift();
        }
    }

    /**
     * 开始新的Phase
     * @param {string} phaseName - Phase名称
     * @param {number} totalPhases - 总Phase数
     */
    startPhase(phaseName, totalPhases = 0) {
        // 结束当前Phase
        if (this.currentPhase) {
            this.endPhase();
        }

        this.currentPhase = phaseName;
        this.totalPhases = totalPhases;
        this.currentPhaseStartTime = Date.now();
        this.currentPhaseTestedPasswords = 0;

        console.log(`[StatsCollector] Started phase: ${phaseName}`);
    }

    /**
     * 结束当前Phase
     */
    endPhase() {
        if (!this.currentPhase) return;

        const duration = Date.now() - this.currentPhaseStartTime;
        const avgSpeed = this.currentPhaseTestedPasswords / (duration / 1000);

        this.phaseStats.set(this.currentPhase, {
            name: this.currentPhase,
            duration,
            testedPasswords: this.currentPhaseTestedPasswords,
            averageSpeed: Math.round(avgSpeed),
            startTime: this.currentPhaseStartTime,
            endTime: Date.now()
        });

        console.log(`[StatsCollector] Ended phase: ${this.currentPhase}, tested: ${this.currentPhaseTestedPasswords}, avg speed: ${Math.round(avgSpeed)} pwd/s`);
    }

    /**
     * 更新当前Phase的测试数量
     * @param {number} count - 测试数量
     */
    updatePhaseProgress(count) {
        this.currentPhaseTestedPasswords += count;
    }

    /**
     * 获取统计信息
     * @returns {object} 统计信息对象
     */
    getStats() {
        const now = Date.now();
        const elapsed = (now - this.startTime) / 1000; // 秒

        return {
            sessionId: this.sessionId,
            startTime: this.startTime,
            lastUpdateTime: this.lastUpdateTime,
            elapsedTime: elapsed,

            // 进度信息
            currentPhase: this.currentPhase,
            totalPhases: this.totalPhases,
            testedPasswords: this.testedPasswords,
            totalPasswords: this.totalPasswords,
            progress: this._calculateProgress(),

            // 速度信息
            currentSpeed: this.currentSpeed,
            averageSpeed: this._calculateAverageSpeed(),
            peakSpeed: this._calculatePeakSpeed(),

            // 预估信息
            estimatedTimeRemaining: this._estimateTimeRemaining(),
            estimatedCompletion: this._estimateCompletionTime(),

            // Phase统计
            phaseStats: Array.from(this.phaseStats.values()),
            currentPhaseProgress: this._calculatePhaseProgress()
        };
    }

    /**
     * 获取简化的统计信息（用于UI显示）
     * @returns {object} 简化的统计信息
     */
    getSimpleStats() {
        const stats = this.getStats();

        return {
            speed: this._formatSpeed(stats.currentSpeed),
            progress: `${stats.progress}%`,
            phase: stats.currentPhase || 'Initializing',
            eta: this._formatTime(stats.estimatedTimeRemaining),
            tested: this._formatNumber(stats.testedPasswords),
            total: this._formatNumber(stats.totalPasswords)
        };
    }

    /**
     * 重置统计信息
     */
    reset() {
        this.startTime = Date.now();
        this.lastUpdateTime = Date.now();
        this.currentPhase = null;
        this.totalPhases = 0;
        this.testedPasswords = 0;
        this.totalPasswords = 0;
        this.currentSpeed = 0;
        this.speedHistory = [];
        this.phaseStats.clear();
        this.speedSamples = [];
    }

    /**
     * 计算进度百分比
     * @private
     */
    _calculateProgress() {
        if (this.totalPasswords === 0) return 0;
        return Math.round((this.testedPasswords / this.totalPasswords) * 100);
    }

    /**
     * 计算平均速度
     * @private
     */
    _calculateAverageSpeed() {
        const elapsed = (Date.now() - this.startTime) / 1000;
        if (elapsed === 0) return 0;
        return Math.round(this.testedPasswords / elapsed);
    }

    /**
     * 计算峰值速度
     * @private
     */
    _calculatePeakSpeed() {
        if (this.speedHistory.length === 0) return 0;
        return Math.max(...this.speedHistory);
    }

    /**
     * 估算剩余时间（秒）- 使用加权移动平均提高准确性
     * @private
     */
    _estimateTimeRemaining() {
        // 优先使用最近的速度数据（更准确）
        const recentSpeed = this._getRecentAverageSpeed();
        const overallAvgSpeed = this._calculateAverageSpeed();

        // 加权平均：最近速度占70%，整体平均占30%
        const weightedSpeed = recentSpeed > 0
            ? (recentSpeed * 0.7) + (overallAvgSpeed * 0.3)
            : overallAvgSpeed;

        if (weightedSpeed === 0) return 0;

        // 如果有总密码数，基于剩余密码计算
        if (this.totalPasswords > 0) {
            const remaining = this.totalPasswords - this.testedPasswords;
            return Math.max(0, Math.round(remaining / weightedSpeed));
        }

        // 如果没有总密码数（常见于GPU攻击），基于当前阶段估算
        // 使用启发式方法：根据当前阶段进度和历史阶段耗时估算
        return this._estimatePhaseBasedTime(weightedSpeed);
    }

    /**
     * 获取最近的平均速度（使用最近5个样本）
     * @private
     */
    _getRecentAverageSpeed() {
        if (this.speedHistory.length === 0) return 0;

        // 使用最近5个速度样本，给最新的样本更高权重
        const recentSamples = this.speedHistory.slice(-5);
        if (recentSamples.length === 0) return 0;

        // 指数加权移动平均 (EWMA)
        const alpha = 0.5; // 平滑因子
        let ewma = recentSamples[0];
        for (let i = 1; i < recentSamples.length; i++) {
            ewma = alpha * recentSamples[i] + (1 - alpha) * ewma;
        }

        return Math.round(ewma);
    }

    /**
     * 基于阶段估算剩余时间
     * @private
     */
    _estimatePhaseBasedTime(currentSpeed) {
        if (!this.currentPhaseStartTime || currentSpeed === 0) return 0;

        // 当前阶段已运行时间
        const phaseElapsed = (Date.now() - this.currentPhaseStartTime) / 1000;

        // 基于历史阶段耗时估算
        const completedPhases = this.phaseStats.size;
        const remainingPhases = Math.max(0, this.totalPhases - completedPhases - 1);

        // 计算已完成阶段的平均耗时
        let avgPhaseDuration = 0;
        if (completedPhases > 0) {
            let totalDuration = 0;
            this.phaseStats.forEach(stat => {
                totalDuration += stat.duration / 1000; // 转换为秒
            });
            avgPhaseDuration = totalDuration / completedPhases;
        } else {
            // 没有历史数据，假设每个阶段平均30秒
            avgPhaseDuration = 30;
        }

        // 估算：当前阶段剩余 + 未来阶段
        // 启发式：假设当前阶段完成度基于已运行时间 vs 平均阶段时间
        const currentPhaseRemaining = Math.max(0, avgPhaseDuration - phaseElapsed);
        const futurePhaseTime = remainingPhases * avgPhaseDuration;

        return Math.round(currentPhaseRemaining + futurePhaseTime);
    }

    /**
     * 估算完成时间戳
     * @private
     */
    _estimateCompletionTime() {
        const remaining = this._estimateTimeRemaining();
        if (remaining === 0) return null;
        return Date.now() + (remaining * 1000);
    }

    /**
     * 计算当前Phase进度
     * @private
     */
    _calculatePhaseProgress() {
        if (!this.currentPhaseStartTime) return 0;

        const elapsed = Date.now() - this.currentPhaseStartTime;
        const speed = this.currentPhaseTestedPasswords / (elapsed / 1000);

        return {
            tested: this.currentPhaseTestedPasswords,
            speed: Math.round(speed),
            elapsed: Math.round(elapsed / 1000)
        };
    }

    /**
     * 格式化速度显示
     * @private
     */
    _formatSpeed(speed) {
        if (speed >= 1000000) {
            return `${(speed / 1000000).toFixed(1)}M pwd/s`;
        } else if (speed >= 1000) {
            return `${(speed / 1000).toFixed(1)}K pwd/s`;
        } else {
            return `${speed} pwd/s`;
        }
    }

    /**
     * 格式化时间显示
     * @private
     */
    _formatTime(seconds) {
        // 刚开始时，显示"Calculating..."
        if (seconds === 0 || !seconds || !isFinite(seconds)) {
            const elapsed = (Date.now() - this.startTime) / 1000;
            if (elapsed < 5) {
                return 'Calculating...';
            }
            return 'Unknown';
        }

        // 超过24小时显示天数
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (days > 0) {
            return `${days}d ${hours}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else if (secs > 0) {
            return `${secs}s`;
        } else {
            return '< 1s';
        }
    }

    /**
     * 格式化数字显示
     * @private
     */
    _formatNumber(num) {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        } else {
            return num.toString();
        }
    }

    /**
     * 导出统计数据（用于日志或分析）
     * @returns {object} 完整的统计数据
     */
    exportData() {
        return {
            sessionId: this.sessionId,
            startTime: this.startTime,
            endTime: Date.now(),
            totalDuration: Date.now() - this.startTime,
            testedPasswords: this.testedPasswords,
            totalPasswords: this.totalPasswords,
            averageSpeed: this._calculateAverageSpeed(),
            peakSpeed: this._calculatePeakSpeed(),
            phases: Array.from(this.phaseStats.values()),
            speedSamples: this.speedSamples
        };
    }
}

export default StatsCollector;
