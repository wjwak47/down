/**
 * 日期范围攻击模式
 * 生成基于日期的密码候选，支持多种日期格式和变体
 */

class DateRangeAttackMode {
    constructor(options = {}) {
        this.startYear = options.startYear || 1990;
        this.endYear = options.endYear || 2030;
        this.includeMonths = options.includeMonths !== false;
        this.includeDays = options.includeDays !== false;
        this.includeSpecialDates = options.includeSpecialDates !== false;
        this.maxVariants = options.maxVariants || 50000;

        // 日期格式模板
        this.dateFormats = [
            // 年份格式
            'YYYY', 'YY',
            // 年月格式
            'YYYYMM', 'YYMMM', 'YYYY-MM', 'YY-MM',
            // 年月日格式
            'YYYYMMDD', 'YYMMDD', 'YYYY-MM-DD', 'YY-MM-DD',
            'DD-MM-YYYY', 'DD-MM-YY', 'MM-DD-YYYY', 'MM-DD-YY',
            'DD/MM/YYYY', 'DD/MM/YY', 'MM/DD/YYYY', 'MM/DD/YY',
            'DDMMYYYY', 'DDMMYY', 'MMDDYYYY', 'MMDDYY'
        ];

        // 特殊日期（生日、节日等常见日期）
        this.specialDates = [
            // 常见生日月份
            { month: 1, day: 1, name: 'New Year' },
            { month: 2, day: 14, name: 'Valentine' },
            { month: 3, day: 8, name: 'Women Day' },
            { month: 5, day: 1, name: 'Labor Day' },
            { month: 6, day: 1, name: 'Children Day' },
            { month: 10, day: 1, name: 'National Day' },
            { month: 12, day: 25, name: 'Christmas' },
            // 常见生日日期
            { month: 1, day: 15 }, { month: 2, day: 20 }, { month: 3, day: 15 },
            { month: 4, day: 10 }, { month: 5, day: 20 }, { month: 6, day: 15 },
            { month: 7, day: 10 }, { month: 8, day: 15 }, { month: 9, day: 20 },
            { month: 10, day: 15 }, { month: 11, day: 10 }, { month: 12, day: 20 }
        ];

        // 常见前缀后缀
        this.commonPrefixes = ['', 'birth', 'birthday', 'date', 'year'];
        this.commonSuffixes = ['', '!', '@', '#', '123', '321', '000', '888'];
    }

    /**
     * 生成日期范围攻击的密码候选
     * @param {Object} context - 攻击上下文（文件信息等）
     * @returns {Array} 密码候选数组
     */
    async generateCandidates(context = {}) {
        console.log(`[DateRangeAttack] 生成日期范围攻击候选密码 (${this.startYear}-${this.endYear})`);

        const candidates = new Set();
        let generated = 0;

        try {
            // 1. 基础年份密码
            for (let year = this.startYear; year <= this.endYear; year++) {
                if (generated >= this.maxVariants) break;

                // 四位年份
                this.addCandidate(candidates, year.toString());
                // 两位年份
                const twoDigitYear = (year % 100).toString().padStart(2, '0');
                this.addCandidate(candidates, twoDigitYear);

                generated += 2;
            }

            // 2. 年月组合
            if (this.includeMonths) {
                for (let year = this.startYear; year <= this.endYear && generated < this.maxVariants; year++) {
                    for (let month = 1; month <= 12 && generated < this.maxVariants; month++) {
                        const monthStr = month.toString().padStart(2, '0');
                        const yearStr = year.toString();
                        const yearShort = (year % 100).toString().padStart(2, '0');

                        // 不同格式组合
                        this.addCandidate(candidates, `${yearStr}${monthStr}`);
                        this.addCandidate(candidates, `${yearShort}${monthStr}`);
                        this.addCandidate(candidates, `${yearStr}-${monthStr}`);
                        this.addCandidate(candidates, `${monthStr}${yearStr}`);
                        this.addCandidate(candidates, `${monthStr}-${yearStr}`);

                        generated += 5;
                    }
                }
            }

            // 3. 特殊日期组合
            if (this.includeSpecialDates) {
                for (const specialDate of this.specialDates) {
                    if (generated >= this.maxVariants) break;

                    for (let year = this.startYear; year <= this.endYear && generated < this.maxVariants; year++) {
                        const dayStr = specialDate.day.toString().padStart(2, '0');
                        const monthStr = specialDate.month.toString().padStart(2, '0');
                        const yearStr = year.toString();
                        const yearShort = (year % 100).toString().padStart(2, '0');

                        // 生成多种日期格式
                        const dateVariants = [
                            `${dayStr}${monthStr}${yearStr}`,
                            `${dayStr}${monthStr}${yearShort}`,
                            `${monthStr}${dayStr}${yearStr}`,
                            `${monthStr}${dayStr}${yearShort}`,
                            `${yearStr}${monthStr}${dayStr}`,
                            `${yearShort}${monthStr}${dayStr}`,
                            `${dayStr}-${monthStr}-${yearStr}`,
                            `${dayStr}/${monthStr}/${yearStr}`,
                            `${monthStr}-${dayStr}-${yearStr}`,
                            `${monthStr}/${dayStr}/${yearStr}`
                        ];

                        for (const variant of dateVariants) {
                            this.addCandidate(candidates, variant);
                            generated++;
                        }
                    }
                }
            }

            // 4. 添加前缀后缀变体
            const baseCandidates = Array.from(candidates).slice(0, 200); // 限制基础候选数量以避免过多组合
            for (const candidate of baseCandidates) {
                if (generated >= this.maxVariants) break;

                // 添加常见前缀
                for (const prefix of this.commonPrefixes) {
                    if (prefix && generated < this.maxVariants) {
                        this.addCandidate(candidates, `${prefix}${candidate}`);
                        generated++;
                    }
                }

                // 添加常见后缀
                for (const suffix of this.commonSuffixes) {
                    if (suffix && generated < this.maxVariants) {
                        this.addCandidate(candidates, `${candidate}${suffix}`);
                        generated++;
                    }
                }
            }

            const finalCandidates = Array.from(candidates);
            console.log(`[DateRangeAttack] 生成完成，共 ${finalCandidates.length} 个候选密码`);

            return finalCandidates;

        } catch (error) {
            console.error('[DateRangeAttack] 生成候选密码时发生错误:', error);
            return Array.from(candidates);
        }
    }

    /**
     * 添加候选密码到集合（避免重复）
     */
    addCandidate(candidates, password) {
        if (password && password.length >= 2 && password.length <= 20) {
            candidates.add(password);
        }
    }

    /**
     * 根据文件信息优化日期范围
     * @param {Object} fileInfo - 文件信息
     */
    optimizeDateRange(fileInfo) {
        if (fileInfo.creationDate) {
            const creationYear = new Date(fileInfo.creationDate).getFullYear();
            // 以文件创建年份为中心，扩展前后10年
            this.startYear = Math.max(1990, creationYear - 10);
            this.endYear = Math.min(2030, creationYear + 10);

            console.log(`[DateRangeAttack] 根据文件创建时间优化日期范围: ${this.startYear}-${this.endYear}`);
        }

        if (fileInfo.fileName) {
            // 从文件名中提取可能的年份信息
            const yearMatches = fileInfo.fileName.match(/\b(19|20)\d{2}\b/g);
            if (yearMatches && yearMatches.length > 0) {
                const extractedYears = yearMatches.map(y => parseInt(y));
                const minYear = Math.min(...extractedYears);
                const maxYear = Math.max(...extractedYears);

                // 调整范围以包含提取的年份
                this.startYear = Math.max(1990, Math.min(this.startYear, minYear - 5));
                this.endYear = Math.min(2030, Math.max(this.endYear, maxYear + 5));

                console.log(`[DateRangeAttack] 从文件名提取年份信息，调整范围: ${this.startYear}-${this.endYear}`);
            }
        }
    }

    /**
     * 获取攻击模式信息
     */
    getAttackInfo() {
        return {
            name: 'Date Range Attack',
            description: `基于日期范围的密码攻击 (${this.startYear}-${this.endYear})`,
            estimatedCandidates: this.estimateCandidateCount(),
            timeComplexity: 'O(n*m*f)，其中n为年份范围，m为日期格式数，f为前缀后缀数'
        };
    }

    /**
     * 估算候选密码数量
     */
    estimateCandidateCount() {
        const yearRange = this.endYear - this.startYear + 1;
        let estimate = yearRange * 2; // 基础年份

        if (this.includeMonths) {
            estimate += yearRange * 12 * 5; // 年月组合
        }

        if (this.includeSpecialDates) {
            estimate += this.specialDates.length * yearRange * 10; // 特殊日期
        }

        // 前缀后缀变体
        estimate *= (this.commonPrefixes.length + this.commonSuffixes.length);

        return Math.min(estimate, this.maxVariants);
    }
}

export default DateRangeAttackMode;