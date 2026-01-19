/**
 * 高级攻击模式管理器
 * 统一管理和调度各种高级攻击模式
 */

import DateRangeAttackMode from './DateRangeAttackMode.js';
import KeyboardWalkAttackMode from './KeyboardWalkAttackMode.js';
import SocialEngineeringAttackMode from './SocialEngineeringAttackMode.js';

class AdvancedAttackModeManager {
    constructor(options = {}) {
        this.enabledModes = options.enabledModes || ['date', 'keyboard', 'social'];
        this.maxCandidatesPerMode = options.maxCandidatesPerMode || 15000;
        this.priorityMode = options.priorityMode || 'balanced'; // 'speed', 'balanced', 'thorough'

        // 初始化攻击模式
        this.attackModes = {
            date: new DateRangeAttackMode({
                maxVariants: this.maxCandidatesPerMode,
                startYear: options.dateRange?.startYear || 1990,
                endYear: options.dateRange?.endYear || 2030
            }),
            keyboard: new KeyboardWalkAttackMode({
                maxVariants: this.maxCandidatesPerMode,
                maxLength: options.keyboardWalk?.maxLength || 12,
                minLength: options.keyboardWalk?.minLength || 4
            }),
            social: new SocialEngineeringAttackMode({
                maxVariants: this.maxCandidatesPerMode,
                includeTransformations: options.socialEngineering?.includeTransformations !== false,
                includeCombinations: options.socialEngineering?.includeCombinations !== false
            })
        };

        // 模式优先级配置
        this.modePriorities = {
            speed: ['social', 'date', 'keyboard'],      // 速度优先：先尝试最可能的
            balanced: ['date', 'social', 'keyboard'],   // 平衡模式：均衡覆盖
            thorough: ['keyboard', 'date', 'social']    // 彻底模式：覆盖最全面的
        };

        this.statistics = {
            totalCandidatesGenerated: 0,
            modeUsageCount: {},
            successfulModes: {},
            averageGenerationTime: {}
        };
    }

    /**
     * 执行高级攻击模式
     * @param {Object} context - 攻击上下文
     * @param {Function} testCallback - 密码测试回调函数
     * @returns {Object} 攻击结果
     */
    async executeAdvancedAttacks(context, testCallback) {
        console.log('[AdvancedAttackManager] 开始执行高级攻击模式');
        console.log(`[AdvancedAttackManager] 启用的模式: ${this.enabledModes.join(', ')}`);
        console.log(`[AdvancedAttackManager] 优先级模式: ${this.priorityMode}`);

        const results = {
            success: false,
            password: null,
            successfulMode: null,
            totalCandidatesTested: 0,
            executionTime: 0,
            modeResults: {}
        };

        const startTime = Date.now();

        try {
            // 获取执行顺序
            const executionOrder = this.getExecutionOrder();

            // 优化攻击参数
            this.optimizeAttackParameters(context);

            // 按优先级执行各种攻击模式
            for (const modeName of executionOrder) {
                if (!this.enabledModes.includes(modeName)) {
                    continue;
                }

                console.log(`[AdvancedAttackManager] 执行 ${modeName} 攻击模式`);

                const modeResult = await this.executeAttackMode(modeName, context, testCallback);
                results.modeResults[modeName] = modeResult;
                results.totalCandidatesTested += modeResult.candidatesTested;

                // 更新统计信息
                this.updateStatistics(modeName, modeResult);

                if (modeResult.success) {
                    results.success = true;
                    results.password = modeResult.password;
                    results.successfulMode = modeName;

                    console.log(`[AdvancedAttackManager] 密码破解成功！使用模式: ${modeName}`);
                    break;
                }

                // 检查是否应该继续（基于优先级模式）
                if (this.shouldStopExecution(modeName, modeResult)) {
                    console.log(`[AdvancedAttackManager] 根据策略提前停止执行`);
                    break;
                }
            }

            results.executionTime = Date.now() - startTime;

            console.log(`[AdvancedAttackManager] 高级攻击完成`);
            console.log(`[AdvancedAttackManager] 总耗时: ${results.executionTime}ms`);
            console.log(`[AdvancedAttackManager] 总测试候选: ${results.totalCandidatesTested}`);

            return results;

        } catch (error) {
            console.error('[AdvancedAttackManager] 执行高级攻击时发生错误:', error);
            results.executionTime = Date.now() - startTime;
            return results;
        }
    }

    /**
     * 执行单个攻击模式
     */
    async executeAttackMode(modeName, context, testCallback) {
        const result = {
            success: false,
            password: null,
            candidatesTested: 0,
            candidatesGenerated: 0,
            executionTime: 0,
            error: null
        };

        const startTime = Date.now();

        try {
            const attackMode = this.attackModes[modeName];
            if (!attackMode) {
                throw new Error(`未知的攻击模式: ${modeName}`);
            }

            // 生成候选密码
            const candidates = await attackMode.generateCandidates(context);
            result.candidatesGenerated = candidates.length;

            console.log(`[AdvancedAttackManager] ${modeName} 模式生成 ${candidates.length} 个候选密码`);

            // 测试候选密码
            for (const candidate of candidates) {
                result.candidatesTested++;

                const testResult = await testCallback(candidate);
                if (testResult.success) {
                    result.success = true;
                    result.password = candidate;
                    break;
                }

                // 每测试100个候选密码输出一次进度
                if (result.candidatesTested % 100 === 0) {
                    console.log(`[AdvancedAttackManager] ${modeName} 模式已测试 ${result.candidatesTested}/${candidates.length} 个候选`);
                }
            }

        } catch (error) {
            console.error(`[AdvancedAttackManager] ${modeName} 模式执行错误:`, error);
            result.error = error.message;
        }

        result.executionTime = Date.now() - startTime;
        return result;
    }

    /**
     * 获取执行顺序
     */
    getExecutionOrder() {
        const priorityOrder = this.modePriorities[this.priorityMode] || this.modePriorities.balanced;
        return priorityOrder.filter(mode => this.enabledModes.includes(mode));
    }

    /**
     * 优化攻击参数
     */
    optimizeAttackParameters(context) {
        // 根据文件信息优化日期范围攻击
        if (this.enabledModes.includes('date') && context.fileInfo) {
            this.attackModes.date.optimizeDateRange(context.fileInfo);
        }

        // 根据文件大小调整候选数量
        if (context.fileInfo && context.fileInfo.size) {
            const fileSize = context.fileInfo.size;

            if (fileSize < 1024 * 1024) { // 小于1MB
                // 小文件可能使用简单密码，增加简单模式的候选数量
                this.attackModes.date.maxVariants = Math.min(20000, this.maxCandidatesPerMode * 1.5);
            } else if (fileSize > 100 * 1024 * 1024) { // 大于100MB
                // 大文件可能使用复杂密码，减少简单模式的候选数量
                this.attackModes.date.maxVariants = Math.max(5000, this.maxCandidatesPerMode * 0.5);
            }
        }

        // 根据优先级模式调整参数
        switch (this.priorityMode) {
            case 'speed':
                // 速度优先：减少候选数量，优先高成功率模式
                Object.values(this.attackModes).forEach(mode => {
                    mode.maxVariants = Math.min(mode.maxVariants, 8000);
                });
                break;

            case 'thorough':
                // 彻底模式：增加候选数量和覆盖范围
                Object.values(this.attackModes).forEach(mode => {
                    mode.maxVariants = Math.max(mode.maxVariants, 20000);
                });
                break;
        }
    }

    /**
     * 判断是否应该停止执行
     */
    shouldStopExecution(modeName, modeResult) {
        // 速度优先模式：如果社会工程攻击失败，可能跳过其他模式
        if (this.priorityMode === 'speed' && modeName === 'social' && !modeResult.success) {
            // 如果社会工程攻击生成的候选很少，说明上下文信息不足，其他模式成功率也不高
            if (modeResult.candidatesGenerated < 100) {
                return true;
            }
        }

        return false;
    }

    /**
     * 更新统计信息
     */
    updateStatistics(modeName, modeResult) {
        // 更新使用次数
        this.statistics.modeUsageCount[modeName] = (this.statistics.modeUsageCount[modeName] || 0) + 1;

        // 更新成功次数
        if (modeResult.success) {
            this.statistics.successfulModes[modeName] = (this.statistics.successfulModes[modeName] || 0) + 1;
        }

        // 更新平均生成时间
        const currentAvg = this.statistics.averageGenerationTime[modeName] || 0;
        const count = this.statistics.modeUsageCount[modeName];
        this.statistics.averageGenerationTime[modeName] =
            (currentAvg * (count - 1) + modeResult.executionTime) / count;

        // 更新总候选数
        this.statistics.totalCandidatesGenerated += modeResult.candidatesGenerated;
    }

    /**
     * 获取攻击模式信息
     */
    getAttackModesInfo() {
        const info = {};

        for (const [modeName, attackMode] of Object.entries(this.attackModes)) {
            if (this.enabledModes.includes(modeName)) {
                info[modeName] = attackMode.getAttackInfo();
            }
        }

        return info;
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        const stats = { ...this.statistics };

        // 计算成功率
        stats.successRates = {};
        for (const [modeName, usageCount] of Object.entries(this.statistics.modeUsageCount)) {
            const successCount = this.statistics.successfulModes[modeName] || 0;
            stats.successRates[modeName] = usageCount > 0 ? (successCount / usageCount * 100).toFixed(2) + '%' : '0%';
        }

        return stats;
    }

    /**
     * 重置统计信息
     */
    resetStatistics() {
        this.statistics = {
            totalCandidatesGenerated: 0,
            modeUsageCount: {},
            successfulModes: {},
            averageGenerationTime: {}
        };
    }

    /**
     * 配置攻击模式
     */
    configureMode(modeName, options) {
        if (this.attackModes[modeName]) {
            Object.assign(this.attackModes[modeName], options);
            console.log(`[AdvancedAttackManager] 已配置 ${modeName} 模式:`, options);
        } else {
            console.warn(`[AdvancedAttackManager] 未知的攻击模式: ${modeName}`);
        }
    }

    /**
     * 启用/禁用攻击模式
     */
    setEnabledModes(modes) {
        this.enabledModes = modes.filter(mode => this.attackModes[mode]);
        console.log(`[AdvancedAttackManager] 已设置启用模式: ${this.enabledModes.join(', ')}`);
    }

    /**
     * 设置优先级模式
     */
    setPriorityMode(mode) {
        if (this.modePriorities[mode]) {
            this.priorityMode = mode;
            console.log(`[AdvancedAttackManager] 已设置优先级模式: ${mode}`);
        } else {
            console.warn(`[AdvancedAttackManager] 未知的优先级模式: ${mode}`);
        }
    }
}

export default AdvancedAttackModeManager;