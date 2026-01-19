/**
 * 社会工程攻击模式
 * 基于文件路径、名称等上下文信息生成相关密码候选
 */

import path from 'path';

class SocialEngineeringAttackMode {
    constructor(options = {}) {
        this.maxVariants = options.maxVariants || 25000;
        this.includeTransformations = options.includeTransformations !== false;
        this.includeCombinations = options.includeCombinations !== false;
        this.includeYears = options.includeYears !== false;

        // 常见的密码变换规则
        this.transformationRules = [
            // 字符替换
            { from: 'a', to: '@' },
            { from: 'e', to: '3' },
            { from: 'i', to: '1' },
            { from: 'o', to: '0' },
            { from: 's', to: '$' },
            { from: 't', to: '7' },
            { from: 'l', to: '1' },
            { from: 'g', to: '9' },

            // 大小写变换
            { type: 'capitalize' },
            { type: 'uppercase' },
            { type: 'alternating' }
        ];

        // 常见的后缀
        this.commonSuffixes = [
            '', '!', '@', '#', '$', '%', '&', '*',
            '1', '12', '123', '1234', '12345',
            '21', '321', '4321', '54321',
            '00', '01', '02', '03', '99', '88', '77',
            '2023', '2024', '2025', '2022', '2021', '2020'
        ];

        // 常见的前缀
        this.commonPrefixes = [
            '', 'my', 'the', 'new', 'old', 'best', 'love', 'i', 'we'
        ];

        // 常见的连接词
        this.connectors = ['', '_', '-', '.', '&', '+'];

        // 中文拼音映射（常见姓名）
        this.chinesePinyinMap = {
            '张': 'zhang', '王': 'wang', '李': 'li', '赵': 'zhao', '刘': 'liu',
            '陈': 'chen', '杨': 'yang', '黄': 'huang', '周': 'zhou', '吴': 'wu',
            '徐': 'xu', '孙': 'sun', '马': 'ma', '朱': 'zhu', '胡': 'hu',
            '林': 'lin', '郭': 'guo', '何': 'he', '高': 'gao', '罗': 'luo',
            '明': 'ming', '华': 'hua', '强': 'qiang', '军': 'jun', '伟': 'wei',
            '建': 'jian', '国': 'guo', '文': 'wen', '德': 'de', '成': 'cheng'
        };
    }

    /**
     * 生成社会工程攻击的密码候选
     * @param {Object} context - 攻击上下文（文件信息等）
     * @returns {Array} 密码候选数组
     */
    async generateCandidates(context = {}) {
        console.log('[SocialEngineeringAttack] 生成社会工程攻击候选密码');

        const candidates = new Set();
        let generated = 0;

        try {
            // 提取上下文信息
            const contextInfo = this.extractContextInfo(context);
            console.log('[SocialEngineeringAttack] 提取的上下文信息:', contextInfo);

            // 1. 基于文件名生成密码
            if (contextInfo.fileName) {
                const fileNameCandidates = this.generateFromFileName(contextInfo.fileName);
                for (const candidate of fileNameCandidates) {
                    if (generated >= this.maxVariants) break;
                    this.addCandidate(candidates, candidate);
                    generated++;
                }
            }

            // 2. 基于路径信息生成密码
            if (contextInfo.pathComponents && contextInfo.pathComponents.length > 0) {
                for (const component of contextInfo.pathComponents) {
                    if (generated >= this.maxVariants) break;

                    const pathCandidates = this.generateFromPathComponent(component);
                    for (const candidate of pathCandidates) {
                        if (generated >= this.maxVariants) break;
                        this.addCandidate(candidates, candidate);
                        generated++;
                    }
                }
            }

            // 3. 基于公司/组织名称生成密码
            if (contextInfo.organizationNames && contextInfo.organizationNames.length > 0) {
                for (const orgName of contextInfo.organizationNames) {
                    if (generated >= this.maxVariants) break;

                    const orgCandidates = this.generateFromOrganization(orgName);
                    for (const candidate of orgCandidates) {
                        if (generated >= this.maxVariants) break;
                        this.addCandidate(candidates, candidate);
                        generated++;
                    }
                }
            }

            // 4. 基于人名生成密码
            if (contextInfo.personNames && contextInfo.personNames.length > 0) {
                for (const personName of contextInfo.personNames) {
                    if (generated >= this.maxVariants) break;

                    const nameCandidates = this.generateFromPersonName(personName);
                    for (const candidate of nameCandidates) {
                        if (generated >= this.maxVariants) break;
                        this.addCandidate(candidates, candidate);
                        generated++;
                    }
                }
            }

            // 5. 基于日期信息生成密码
            if (contextInfo.dates && contextInfo.dates.length > 0) {
                for (const date of contextInfo.dates) {
                    if (generated >= this.maxVariants) break;

                    const dateCandidates = this.generateFromDate(date);
                    for (const candidate of dateCandidates) {
                        if (generated >= this.maxVariants) break;
                        this.addCandidate(candidates, candidate);
                        generated++;
                    }
                }
            }

            // 6. 生成组合密码
            if (this.includeCombinations && contextInfo.keywords.length > 1) {
                const combinationCandidates = this.generateCombinations(contextInfo.keywords);
                for (const candidate of combinationCandidates) {
                    if (generated >= this.maxVariants) break;
                    this.addCandidate(candidates, candidate);
                    generated++;
                }
            }

            const finalCandidates = Array.from(candidates);
            console.log(`[SocialEngineeringAttack] 生成完成，共 ${finalCandidates.length} 个候选密码`);

            return finalCandidates;

        } catch (error) {
            console.error('[SocialEngineeringAttack] 生成候选密码时发生错误:', error);
            return Array.from(candidates);
        }
    }

    /**
     * 提取上下文信息
     */
    extractContextInfo(context) {
        const info = {
            fileName: '',
            pathComponents: [],
            organizationNames: [],
            personNames: [],
            dates: [],
            keywords: []
        };

        // 提取文件名信息
        if (context.filePath) {
            const parsedPath = path.parse(context.filePath);
            info.fileName = parsedPath.name;

            // 提取路径组件
            const pathParts = context.filePath.split(/[/\\]/);
            info.pathComponents = pathParts.filter(part =>
                part && part !== '.' && part !== '..' && !part.includes(':')
            );
        }

        // 从文件名和路径中提取关键词
        const allText = [info.fileName, ...info.pathComponents].join(' ');

        // 提取可能的组织名称（常见公司后缀）
        const orgPatterns = /\b(\w+(?:corp|inc|ltd|llc|co|company|group|tech|soft|sys|net|com))\b/gi;
        let match;
        while ((match = orgPatterns.exec(allText)) !== null) {
            info.organizationNames.push(match[1]);
        }

        // 提取可能的人名（中文姓名模式）
        const chineseNamePattern = /[\u4e00-\u9fa5]{2,4}/g;
        while ((match = chineseNamePattern.exec(allText)) !== null) {
            if (match[0].length >= 2 && match[0].length <= 4) {
                info.personNames.push(match[0]);
            }
        }

        // 提取英文人名模式
        const englishNamePattern = /\b[A-Z][a-z]{2,10}\s+[A-Z][a-z]{2,10}\b/g;
        while ((match = englishNamePattern.exec(allText)) !== null) {
            info.personNames.push(match[0]);
        }

        // 提取日期信息
        const datePatterns = [
            /\b(19|20)\d{2}\b/g,  // 年份
            /\b\d{1,2}[-/]\d{1,2}[-/](19|20)?\d{2}\b/g,  // 日期格式
            /\b(19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/g   // 年-月-日格式
        ];

        for (const pattern of datePatterns) {
            while ((match = pattern.exec(allText)) !== null) {
                info.dates.push(match[0]);
            }
        }

        // 提取一般关键词（字母数字组合，长度3-15）
        const keywordPattern = /\b[a-zA-Z0-9\u4e00-\u9fa5]{3,15}\b/g;
        while ((match = keywordPattern.exec(allText)) !== null) {
            const keyword = match[0].toLowerCase();
            if (!info.keywords.includes(keyword)) {
                info.keywords.push(keyword);
            }
        }

        return info;
    }

    /**
     * 基于文件名生成密码候选
     */
    generateFromFileName(fileName) {
        const candidates = [];

        // 清理文件名（移除扩展名、特殊字符等）
        const cleanName = fileName.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');

        if (cleanName.length >= 3) {
            candidates.push(cleanName);

            // 应用变换规则
            if (this.includeTransformations) {
                const transformed = this.applyTransformations(cleanName);
                candidates.push(...transformed);
            }

            // 添加前缀后缀
            for (const prefix of this.commonPrefixes.slice(0, 5)) {
                for (const suffix of this.commonSuffixes.slice(0, 10)) {
                    if (prefix || suffix) { // 确保至少有一个前缀或后缀
                        const combined = prefix + cleanName + suffix;
                        if (combined.length >= 4 && combined.length <= 20) {
                            candidates.push(combined);
                        }
                    }
                }
            }
        }

        return candidates;
    }

    /**
     * 基于路径组件生成密码候选
     */
    generateFromPathComponent(component) {
        const candidates = [];

        // 清理路径组件
        const cleanComponent = component.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');

        if (cleanComponent.length >= 3 && cleanComponent.length <= 15) {
            candidates.push(cleanComponent);

            // 应用变换
            if (this.includeTransformations) {
                const transformed = this.applyTransformations(cleanComponent);
                candidates.push(...transformed);
            }
        }

        return candidates;
    }

    /**
     * 基于组织名称生成密码候选
     */
    generateFromOrganization(orgName) {
        const candidates = [];

        const cleanOrg = orgName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');

        if (cleanOrg.length >= 3) {
            candidates.push(cleanOrg);

            // 常见的组织密码模式
            const patterns = [
                cleanOrg + '123',
                cleanOrg + '2024',
                cleanOrg + '!',
                'my' + cleanOrg,
                cleanOrg + 'pass',
                cleanOrg + 'pwd'
            ];

            candidates.push(...patterns);

            // 应用变换
            if (this.includeTransformations) {
                const transformed = this.applyTransformations(cleanOrg);
                candidates.push(...transformed);
            }
        }

        return candidates;
    }

    /**
     * 基于人名生成密码候选
     */
    generateFromPersonName(personName) {
        const candidates = [];

        // 处理中文姓名
        if (/[\u4e00-\u9fa5]/.test(personName)) {
            // 转换为拼音
            let pinyin = '';
            for (const char of personName) {
                pinyin += this.chinesePinyinMap[char] || char;
            }

            if (pinyin.length >= 3) {
                candidates.push(pinyin);
                candidates.push(pinyin + '123');
                candidates.push(pinyin + '888');
                candidates.push(pinyin + '2024');
            }
        }

        // 处理英文姓名
        const englishName = personName.replace(/[^a-zA-Z\s]/g, '').toLowerCase();
        if (englishName.length >= 3) {
            const nameParts = englishName.split(/\s+/);

            // 全名
            const fullName = nameParts.join('');
            candidates.push(fullName);

            // 名字 + 姓氏首字母
            if (nameParts.length >= 2) {
                const firstLast = nameParts[0] + nameParts[nameParts.length - 1].charAt(0);
                candidates.push(firstLast);
            }

            // 姓氏 + 名字首字母
            if (nameParts.length >= 2) {
                const lastFirst = nameParts[nameParts.length - 1] + nameParts[0].charAt(0);
                candidates.push(lastFirst);
            }

            // 添加常见后缀
            for (const suffix of ['123', '321', '888', '2024', '!']) {
                candidates.push(fullName + suffix);
            }
        }

        return candidates;
    }

    /**
     * 基于日期生成密码候选
     */
    generateFromDate(dateStr) {
        const candidates = [];

        // 直接使用日期字符串
        candidates.push(dateStr.replace(/[^0-9]/g, ''));

        // 提取年份
        const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
            const year = yearMatch[0];
            candidates.push(year);
            candidates.push(year.slice(-2)); // 两位年份
        }

        return candidates;
    }

    /**
     * 生成关键词组合
     */
    generateCombinations(keywords) {
        const candidates = [];

        // 限制关键词数量以避免过多组合
        const limitedKeywords = keywords.slice(0, 8);

        // 两个关键词的组合
        for (let i = 0; i < limitedKeywords.length && candidates.length < 100; i++) {
            for (let j = i + 1; j < limitedKeywords.length && candidates.length < 100; j++) {
                const word1 = limitedKeywords[i];
                const word2 = limitedKeywords[j];

                if (word1.length >= 3 && word2.length >= 3) {
                    // 不同的连接方式
                    for (const connector of this.connectors.slice(0, 3)) {
                        const combined = word1 + connector + word2;
                        if (combined.length >= 6 && combined.length <= 20) {
                            candidates.push(combined);
                        }
                    }
                }
            }
        }

        return candidates;
    }

    /**
     * 应用密码变换规则
     */
    applyTransformations(text) {
        const transformed = [];

        // 字符替换变换
        let substituted = text;
        for (const rule of this.transformationRules) {
            if (rule.from && rule.to) {
                substituted = substituted.replace(new RegExp(rule.from, 'g'), rule.to);
            }
        }
        if (substituted !== text) {
            transformed.push(substituted);
        }

        // 大小写变换
        transformed.push(text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()); // 首字母大写
        transformed.push(text.toUpperCase()); // 全大写

        // 交替大小写
        if (text.length > 2) {
            let alternating = '';
            for (let i = 0; i < text.length; i++) {
                const char = text.charAt(i);
                alternating += i % 2 === 0 ? char.toUpperCase() : char.toLowerCase();
            }
            transformed.push(alternating);
        }

        return transformed.filter(t => t !== text && t.length >= 4);
    }

    /**
     * 添加候选密码到集合（避免重复）
     */
    addCandidate(candidates, password) {
        if (password && password.length >= 4 && password.length <= 20) {
            candidates.add(password);
        }
    }

    /**
     * 获取攻击模式信息
     */
    getAttackInfo() {
        return {
            name: 'Social Engineering Attack',
            description: '基于文件上下文信息的社会工程攻击',
            estimatedCandidates: this.estimateCandidateCount(),
            timeComplexity: 'O(k*t*c)，其中k为关键词数，t为变换规则数，c为组合数'
        };
    }

    /**
     * 估算候选密码数量
     */
    estimateCandidateCount() {
        // 基础估算：每个关键词生成约50个变体
        let estimate = 50;

        if (this.includeTransformations) {
            estimate *= 5; // 变换规则增加变体
        }

        if (this.includeCombinations) {
            estimate += 100; // 组合密码
        }

        return Math.min(estimate, this.maxVariants);
    }
}

export default SocialEngineeringAttackMode;