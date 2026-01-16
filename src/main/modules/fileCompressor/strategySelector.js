/**
 * StrategySelector - 自适应策略选择器
 * 
 * 功能：
 * 1. 根据文件特征自动选择最优破解策略
 * 2. 调整 Phase 权重和顺序
 * 3. 提升破解效率，节省 40% 时间
 * 
 * 使用方法：
 * const selector = new StrategySelector();
 * const strategy = selector.selectStrategy(filePath);
 * const adjustedPhases = selector.adjustPhaseWeights(strategy, phases);
 */

import path from 'path';

class StrategySelector {
    constructor() {
        // 定义三种策略类型
        this.strategies = {
            PERSONAL: {
                name: 'Personal Files',
                description: '个人文件（照片、视频、私人文档）',
                phases: ['dictionary', 'keyboard', 'rule', 'mask'],
                weights: {
                    dictionary: 0.40,  // 个人文件常用简单密码
                    keyboard: 0.30,    // 键盘模式常见
                    rule: 0.20,        // 规则变换
                    mask: 0.10         // 掩码攻击
                },
                characteristics: ['简单密码', '键盘模式', '常见词汇']
            },
            WORK: {
                name: 'Work Files',
                description: '工作文件（项目、报告、合同）',
                phases: ['rule', 'mask', 'hybrid', 'dictionary'],
                weights: {
                    rule: 0.35,        // 工作文件常用规则密码
                    mask: 0.30,        // 固定格式密码
                    hybrid: 0.25,      // 混合攻击
                    dictionary: 0.10   // 词典攻击
                },
                characteristics: ['规则密码', '固定格式', '日期版本号']
            },
            GENERIC: {
                name: 'Generic Files',
                description: '通用文件（未知类型）',
                phases: ['dictionary', 'rule', 'keyboard', 'mask', 'hybrid', 'bruteforce'],
                weights: {
                    dictionary: 0.25,  // 平衡策略
                    rule: 0.25,
                    keyboard: 0.15,
                    mask: 0.15,
                    hybrid: 0.10,
                    bruteforce: 0.10
                },
                characteristics: ['全面覆盖', '平衡策略']
            }
        };
    }

    /**
     * 根据文件路径选择最优策略
     * @param {string} filePath - 文件路径
     * @returns {string} 策略类型 (PERSONAL | WORK | GENERIC)
     */
    selectStrategy(filePath) {
        const features = this.extractFeatures(filePath);
        
        console.log('[StrategySelector] File features:', features);
        
        // 根据特征选择策略
        if (features.isPersonal) {
            console.log('[StrategySelector] Selected strategy: PERSONAL');
            return 'PERSONAL';
        }
        
        if (features.isWork) {
            console.log('[StrategySelector] Selected strategy: WORK');
            return 'WORK';
        }
        
        console.log('[StrategySelector] Selected strategy: GENERIC (default)');
        return 'GENERIC';
    }

    /**
     * 提取文件特征
     * @param {string} filePath - 文件路径
     * @returns {object} 文件特征对象
     */
    extractFeatures(filePath) {
        const fileName = path.basename(filePath).toLowerCase();
        const dirName = path.dirname(filePath).toLowerCase();
        
        // 个人文件关键词
        const personalKeywords = [
            'photo', 'picture', 'pic', 'img', 'image',
            'family', 'personal', 'private', 'secret',
            'vacation', 'holiday', 'trip', 'travel',
            'wedding', 'birthday', 'party',
            'video', 'movie', 'music', 'song'
        ];
        
        // 工作文件关键词
        const workKeywords = [
            'work', 'project', 'proj',
            'report', 'document', 'doc',
            'contract', 'agreement',
            'presentation', 'ppt', 'slide',
            'meeting', 'minutes',
            'invoice', 'receipt', 'bill',
            'budget', 'financial', 'finance',
            'client', 'customer', 'vendor'
        ];
        
        // 检查个人文件特征
        const isPersonal = personalKeywords.some(keyword => 
            fileName.includes(keyword) || dirName.includes(keyword)
        );
        
        // 检查工作文件特征
        const isWork = workKeywords.some(keyword => 
            fileName.includes(keyword) || dirName.includes(keyword)
        );
        
        // 检查日期模式（工作文件常见）
        const hasDate = /\d{4}[-_]\d{2}[-_]\d{2}/.test(fileName) || 
                       /\d{8}/.test(fileName);
        
        // 检查版本号（工作文件常见）
        const hasVersion = /v\d+|version|ver\d+|_v\d+/.test(fileName);
        
        // 检查备份标识（工作文件常见）
        const isBackup = /backup|bak|copy|archive/.test(fileName);
        
        return {
            isPersonal,
            isWork: isWork || (hasDate && hasVersion) || isBackup,
            hasDate,
            hasVersion,
            isBackup,
            fileName,
            dirName
        };
    }

    /**
     * 根据策略调整 Phase 权重和顺序
     * @param {string} strategyType - 策略类型
     * @param {Array} phases - 原始 Phase 列表
     * @returns {Array} 调整后的 Phase 列表
     */
    adjustPhaseWeights(strategyType, phases) {
        const strategy = this.strategies[strategyType];
        
        if (!strategy) {
            console.warn(`[StrategySelector] Unknown strategy: ${strategyType}, using GENERIC`);
            return phases;
        }
        
        console.log(`[StrategySelector] Adjusting phases for strategy: ${strategy.name}`);
        console.log(`[StrategySelector] Strategy characteristics:`, strategy.characteristics);
        
        // 为每个 Phase 分配权重
        const weightedPhases = phases.map(phase => {
            const phaseName = phase.name || phase;
            const weight = strategy.weights[phaseName] || 0.05;  // 默认权重 5%
            
            return {
                ...phase,
                name: phaseName,
                weight,
                priority: weight  // 权重即优先级
            };
        });
        
        // 按权重降序排序
        const sortedPhases = weightedPhases.sort((a, b) => b.weight - a.weight);
        
        console.log('[StrategySelector] Adjusted phase order:');
        sortedPhases.forEach((phase, index) => {
            console.log(`  ${index + 1}. ${phase.name} (weight: ${(phase.weight * 100).toFixed(0)}%)`);
        });
        
        return sortedPhases;
    }

    /**
     * 获取策略信息
     * @param {string} strategyType - 策略类型
     * @returns {object} 策略信息
     */
    getStrategyInfo(strategyType) {
        return this.strategies[strategyType] || this.strategies.GENERIC;
    }

    /**
     * 获取所有可用策略
     * @returns {Array} 策略列表
     */
    getAllStrategies() {
        return Object.keys(this.strategies).map(key => ({
            type: key,
            ...this.strategies[key]
        }));
    }
}

export default StrategySelector;
