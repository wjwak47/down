/**
 * 密码模式学习器
 * 
 * 功能：
 * 1. 记录成功破解的密码模式
 * 2. 统计各模式的成功率
 * 3. 动态调整攻击阶段优先级
 * 
 * 科学原理：
 * - 增量学习：每次成功都更新模型
 * - 贝叶斯更新：基于历史调整概率
 */

import fs from 'fs';
import path from 'path';
import { app } from 'electron';

class PasswordPatternLearner {
    constructor() {
        // 数据存储路径
        this.dataPath = path.join(
            app.getPath('userData'),
            'password_patterns.json'
        );

        // 加载历史数据
        this.patterns = this.loadPatterns();

        // 默认模式权重（基于统计研究）
        this.defaultWeights = {
            'pure_digits': 16,      // 16% of passwords
            'pure_lowercase': 41,   // 41% of passwords
            'lower_digits': 28,     // 28% of passwords
            'mixed_case': 8,        // 8% of passwords
            'with_symbols': 3.5     // <3.5% of passwords
        };

        // 长度分布权重
        this.lengthWeights = {
            8: 25,   // 25% are 8 chars
            6: 23,   // 23% are 6 chars
            7: 17,   // 17% are 7 chars
            9: 12,   // 12% are 9 chars
            10: 8,
            5: 6,
            4: 4,
            11: 3,
            12: 2
        };
    }

    /**
     * 加载历史模式数据
     */
    loadPatterns() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = fs.readFileSync(this.dataPath, 'utf-8');
                return JSON.parse(data);
            }
        } catch (err) {
            console.log('[PatternLearner] Failed to load patterns:', err.message);
        }

        return {
            patterns: {},      // 模式 -> 成功次数
            lengths: {},       // 长度 -> 成功次数
            charsets: {},      // 字符集 -> 成功次数
            positions: {},     // 位置特征 -> 成功次数
            totalSuccess: 0
        };
    }

    /**
     * 保存模式数据
     */
    savePatterns() {
        try {
            fs.writeFileSync(this.dataPath, JSON.stringify(this.patterns, null, 2));
        } catch (err) {
            console.log('[PatternLearner] Failed to save patterns:', err.message);
        }
    }

    /**
     * 记录成功破解
     * @param {string} password - 成功的密码
     * @param {object} context - 文件上下文信息
     */
    recordSuccess(password, context = {}) {
        if (!password) return;

        const analysis = this.analyzePassword(password);

        // 更新模式统计
        const pattern = analysis.pattern;
        this.patterns.patterns[pattern] = (this.patterns.patterns[pattern] || 0) + 1;

        // 更新长度统计
        const len = password.length;
        this.patterns.lengths[len] = (this.patterns.lengths[len] || 0) + 1;

        // 更新字符集统计
        const charset = analysis.charset;
        this.patterns.charsets[charset] = (this.patterns.charsets[charset] || 0) + 1;

        // 更新位置特征
        for (const pos of analysis.positions) {
            this.patterns.positions[pos] = (this.patterns.positions[pos] || 0) + 1;
        }

        this.patterns.totalSuccess++;

        // 保存到磁盘
        this.savePatterns();

        console.log(`[PatternLearner] Recorded success: ${password.substring(0, 3)}***, pattern: ${pattern}, charset: ${charset}`);
    }

    /**
     * 分析密码特征
     */
    analyzePassword(password) {
        const result = {
            pattern: '',
            charset: '',
            positions: []
        };

        // 生成hashcat风格的模式
        let pattern = '';
        for (const char of password) {
            if (/[0-9]/.test(char)) pattern += '?d';
            else if (/[a-z]/.test(char)) pattern += '?l';
            else if (/[A-Z]/.test(char)) pattern += '?u';
            else pattern += '?s';
        }
        result.pattern = pattern;

        // 判断字符集类型
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasDigit = /[0-9]/.test(password);
        const hasSymbol = /[^a-zA-Z0-9]/.test(password);

        if (hasSymbol) result.charset = 'with_symbols';
        else if (hasLower && hasUpper && hasDigit) result.charset = 'mixed_all';
        else if (hasLower && hasUpper) result.charset = 'mixed_case';
        else if (hasLower && hasDigit) result.charset = 'lower_digits';
        else if (hasUpper && hasDigit) result.charset = 'upper_digits';
        else if (hasDigit) result.charset = 'pure_digits';
        else if (hasLower) result.charset = 'pure_lowercase';
        else if (hasUpper) result.charset = 'pure_uppercase';
        else result.charset = 'unknown';

        // 位置特征
        if (/^[A-Z]/.test(password)) result.positions.push('first_upper');
        if (/[0-9]$/.test(password)) result.positions.push('ends_digit');
        if (/[!@#$%^&*]$/.test(password)) result.positions.push('ends_symbol');
        if (/^[0-9]/.test(password)) result.positions.push('starts_digit');

        return result;
    }

    /**
     * 获取按成功率排序的模式列表
     */
    getTopPatterns(limit = 50) {
        const entries = Object.entries(this.patterns.patterns);
        return entries
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([pattern, count]) => ({
                pattern,
                count,
                probability: count / Math.max(1, this.patterns.totalSuccess)
            }));
    }

    /**
     * 获取推荐的长度优先级
     * 结合默认统计和历史学习
     */
    getLengthPriority() {
        const combined = { ...this.lengthWeights };

        // 用历史数据调整（贝叶斯更新）
        const total = this.patterns.totalSuccess || 0;
        if (total > 10) {
            for (const [len, count] of Object.entries(this.patterns.lengths)) {
                const learned = (count / total) * 100;
                const prior = combined[len] || 5;
                // 加权平均：历史占60%，先验占40%
                combined[len] = learned * 0.6 + prior * 0.4;
            }
        }

        // 返回按权重排序的长度列表
        return Object.entries(combined)
            .sort((a, b) => b[1] - a[1])
            .map(([len, weight]) => parseInt(len));
    }

    /**
     * 获取推荐的字符集优先级
     */
    getCharsetPriority() {
        const combined = { ...this.defaultWeights };

        const total = this.patterns.totalSuccess || 0;
        if (total > 10) {
            for (const [charset, count] of Object.entries(this.patterns.charsets)) {
                const learned = (count / total) * 100;
                const prior = combined[charset] || 5;
                combined[charset] = learned * 0.6 + prior * 0.4;
            }
        }

        return Object.entries(combined)
            .sort((a, b) => b[1] - a[1])
            .map(([charset, weight]) => charset);
    }

    /**
     * 获取位置特征概率
     */
    getPositionProbabilities() {
        const total = this.patterns.totalSuccess || 1;
        const probs = {};

        for (const [pos, count] of Object.entries(this.patterns.positions)) {
            probs[pos] = count / total;
        }

        // 默认值（基于研究）
        if (!probs['first_upper']) probs['first_upper'] = 0.35;
        if (!probs['ends_digit']) probs['ends_digit'] = 0.45;
        if (!probs['ends_symbol']) probs['ends_symbol'] = 0.08;

        return probs;
    }

    /**
     * 生成基于学习的优先掩码
     */
    generatePriorityMasks() {
        const topPatterns = this.getTopPatterns(20);
        const masks = [];

        for (const { pattern, probability } of topPatterns) {
            if (probability > 0.01) { // 至少1%的成功率
                masks.push({
                    mask: pattern,
                    desc: `Learned pattern (${(probability * 100).toFixed(1)}% success)`,
                    prob: 'learned'
                });
            }
        }

        return masks;
    }

    /**
     * 获取统计摘要
     */
    getStats() {
        return {
            totalSuccess: this.patterns.totalSuccess,
            topCharsets: this.getCharsetPriority().slice(0, 5),
            topLengths: this.getLengthPriority().slice(0, 5),
            topPatterns: this.getTopPatterns(5),
            positionProbs: this.getPositionProbabilities()
        };
    }
}

export default PasswordPatternLearner;
