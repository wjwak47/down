/**
 * 文件上下文分析器
 * 
 * 功能：
 * 1. 分析文件路径/名称推测密码复杂度
 * 2. 根据加密类型调整策略
 * 3. 返回优化建议
 * 
 * 科学原理：
 * - 启发式分析：基于文件特征推断用户行为
 * - 概率推断：不同场景的密码复杂度分布不同
 */

import path from 'path';

class FileContextAnalyzer {
    constructor() {
        // 复杂度指示词
        this.simpleIndicators = [
            'personal', '个人', 'photo', '照片', 'temp', '临时',
            'test', '测试', 'backup', 'desktop', '桌面',
            'download', '下载', 'movie', '电影', 'music', '音乐'
        ];

        this.complexIndicators = [
            'work', '工作', 'company', '公司', 'confidential', '机密',
            'secret', '秘密', 'finance', '财务', 'contract', '合同',
            'project', '项目', 'client', '客户', 'legal', '法律',
            'bank', '银行', 'password', 'secure', 'private', 'encrypt'
        ];

        // 加密类型复杂度映射
        this.encryptionComplexity = {
            'ZipCrypto': -20,      // 老旧方式，用户可能不太懂安全
            'AES-128': 0,          // 标准
            'AES-256': 15,         // 安全意识强
            'RAR5': 10,            // 技术用户
            'RAR3': -5,            // 老版本
            '7z': 10               // 技术用户
        };
    }

    /**
     * 分析文件上下文
     * @param {string} filePath - 文件路径
     * @param {object} encryption - 加密信息
     * @returns {object} 分析结果
     */
    analyze(filePath, encryption = {}) {
        const result = {
            score: 50,                    // 基准分50
            complexity: 'medium',         // simple/medium/complex
            recommendations: [],          // 策略建议
            skipPhases: [],               // 建议跳过的阶段
            priorityPhases: [],           // 建议优先的阶段
            estimatedDifficulty: 'normal' // easy/normal/hard/extreme
        };

        // 1. 路径分析
        const pathScore = this.analyzeFilePath(filePath);
        result.score += pathScore.adjustment;
        result.recommendations.push(...pathScore.recommendations);

        // 2. 文件名分析
        const nameScore = this.analyzeFileName(filePath);
        result.score += nameScore.adjustment;
        result.recommendations.push(...nameScore.recommendations);

        // 3. 加密类型分析
        const encScore = this.analyzeEncryption(encryption);
        result.score += encScore.adjustment;
        result.recommendations.push(...encScore.recommendations);

        // 4. 确定复杂度级别
        if (result.score < 35) {
            result.complexity = 'simple';
            result.estimatedDifficulty = 'easy';
            result.priorityPhases = ['Top10K', 'DigitBrute', 'Keyboard'];
            result.skipPhases = ['Hybrid', 'Mask'];
        } else if (result.score < 65) {
            result.complexity = 'medium';
            result.estimatedDifficulty = 'normal';
        } else {
            result.complexity = 'complex';
            result.estimatedDifficulty = 'hard';
            result.priorityPhases = ['Rule', 'Dictionary', 'Mask'];
            result.skipPhases = ['ShortBrute'];
        }

        // 5. 生成策略建议
        result.strategy = this.generateStrategy(result);

        console.log(`[FileContext] Analysis complete: score=${result.score}, complexity=${result.complexity}`);

        return result;
    }

    /**
     * 分析文件路径
     */
    analyzeFilePath(filePath) {
        const result = { adjustment: 0, recommendations: [] };
        const lowerPath = filePath.toLowerCase();

        // 检查简单指示词
        for (const indicator of this.simpleIndicators) {
            if (lowerPath.includes(indicator.toLowerCase())) {
                result.adjustment -= 10;
                result.recommendations.push(`路径含"${indicator}"，可能是个人文件`);
                break;
            }
        }

        // 检查复杂指示词
        for (const indicator of this.complexIndicators) {
            if (lowerPath.includes(indicator.toLowerCase())) {
                result.adjustment += 15;
                result.recommendations.push(`路径含"${indicator}"，可能是重要文件`);
                break;
            }
        }

        // 检查是否在桌面/下载目录
        if (lowerPath.includes('desktop') || lowerPath.includes('桌面')) {
            result.adjustment -= 5;
            result.recommendations.push('文件在桌面，可能是临时文件');
        }

        if (lowerPath.includes('download') || lowerPath.includes('下载')) {
            result.adjustment -= 5;
            result.recommendations.push('文件在下载目录');
        }

        return result;
    }

    /**
     * 分析文件名
     */
    analyzeFileName(filePath) {
        const result = { adjustment: 0, recommendations: [] };
        const fileName = path.basename(filePath).toLowerCase();

        // 检查是否包含日期
        if (/\d{4}[-_]?\d{2}[-_]?\d{2}/.test(fileName) ||
            /\d{8}/.test(fileName)) {
            result.adjustment -= 5;
            result.recommendations.push('文件名含日期，密码可能与日期相关');
        }

        // 检查是否包含中文
        if (/[\u4e00-\u9fa5]/.test(fileName)) {
            result.recommendations.push('文件名含中文，优先尝试拼音密码');
        }

        // 检查是否是备份文件
        if (/backup|bak|备份/.test(fileName)) {
            result.adjustment += 5;
            result.recommendations.push('备份文件，可能有一定保护');
        }

        // 检查是否是测试文件
        if (/test|tmp|temp|测试|临时/.test(fileName)) {
            result.adjustment -= 15;
            result.recommendations.push('测试/临时文件，密码可能很简单');
        }

        return result;
    }

    /**
     * 分析加密类型
     */
    analyzeEncryption(encryption) {
        const result = { adjustment: 0, recommendations: [] };

        if (!encryption || !encryption.method) return result;

        const method = encryption.method;

        // 根据加密方式调整
        if (method.includes('ZipCrypto')) {
            result.adjustment = this.encryptionComplexity['ZipCrypto'];
            result.recommendations.push('ZipCrypto加密，用户可能不熟悉安全');
        } else if (method.includes('AES-256')) {
            result.adjustment = this.encryptionComplexity['AES-256'];
            result.recommendations.push('AES-256加密，用户安全意识较强');
        } else if (method.includes('AES')) {
            result.adjustment = this.encryptionComplexity['AES-128'];
        } else if (method.includes('RAR5')) {
            result.adjustment = this.encryptionComplexity['RAR5'];
            result.recommendations.push('RAR5格式，可能是技术用户');
        }

        return result;
    }

    /**
     * 生成策略建议
     */
    generateStrategy(analysis) {
        const strategy = {
            bruteforceMaxLength: 8,
            dictionaryFirst: false,
            extendedTimeout: false,
            suggestGiveUp: false
        };

        switch (analysis.complexity) {
            case 'simple':
                strategy.bruteforceMaxLength = 10;
                strategy.dictionaryFirst = false;  // 暴力更可能成功
                break;
            case 'medium':
                strategy.bruteforceMaxLength = 8;
                strategy.dictionaryFirst = true;
                break;
            case 'complex':
                strategy.bruteforceMaxLength = 6;  // 减少暴力范围
                strategy.dictionaryFirst = true;
                strategy.extendedTimeout = true;
                break;
        }

        return strategy;
    }

    /**
     * 估算成功概率
     * @param {number} attemptsSoFar - 已尝试次数
     * @param {string} complexity - 复杂度
     */
    estimateSuccessProbability(attemptsSoFar, complexity = 'medium') {
        // 基于统计的成功概率衰减模型
        // P(success) = base_rate * decay_factor

        const baseRates = {
            'simple': 0.7,    // 70% 的简单密码能破解
            'medium': 0.4,    // 40% 的中等密码能破解
            'complex': 0.1    // 10% 的复杂密码能破解
        };

        const baseRate = baseRates[complexity] || 0.4;

        // 衰减因子：尝试越多，剩余成功概率越低
        // 使用对数衰减
        const decayFactor = 1 / (1 + Math.log10(Math.max(1, attemptsSoFar / 1000000)));

        return Math.max(0.001, baseRate * decayFactor);
    }

    /**
     * 判断是否应该建议放弃
     */
    shouldSuggestGiveUp(attemptsSoFar, elapsedSeconds, complexity) {
        const probability = this.estimateSuccessProbability(attemptsSoFar, complexity);

        // 条件：
        // 1. 成功概率 < 1%
        // 2. 已尝试 > 100亿
        // 3. 已运行 > 1小时

        if (probability < 0.01 && attemptsSoFar > 10_000_000_000 && elapsedSeconds > 3600) {
            return {
                suggest: true,
                reason: `成功概率已降至 ${(probability * 100).toFixed(2)}%，建议考虑其他方法`,
                probability
            };
        }

        return { suggest: false, probability };
    }
}

export default FileContextAnalyzer;
