/**
 * 中文密码模式生成器
 * 
 * 功能：
 * 1. 基于中国用户密码习惯生成候选密码
 * 2. 包含拼音、数字谐音、常见姓名等
 * 3. 针对中文用户的密码破解优化
 * 
 * 科学依据：
 * - 中国用户50%+使用纯数字或拼音密码
 * - 常见模式：姓名拼音+生日、520系列、手机号相关
 */

// 高频中文拼音（基于姓名和常用词）
const PINYIN_PATTERNS = {
    // === 高频姓氏拼音 ===
    surnames: [
        'wang', 'li', 'zhang', 'liu', 'chen', 'yang', 'zhao', 'huang', 'zhou', 'wu',
        'xu', 'sun', 'hu', 'zhu', 'gao', 'lin', 'he', 'guo', 'ma', 'luo',
        'liang', 'song', 'zheng', 'xie', 'han', 'tang', 'feng', 'yu', 'dong', 'xiao'
    ],

    // === 高频名字拼音 ===
    givenNames: [
        'wei', 'fang', 'na', 'min', 'jing', 'li', 'yang', 'juan', 'yong', 'jie',
        'qiang', 'ping', 'lei', 'gang', 'hua', 'jun', 'yan', 'ming', 'chao', 'ying',
        'lin', 'xia', 'hong', 'yu', 'tao', 'peng', 'xin', 'xue', 'mei', 'bo'
    ],

    // === 常用词拼音 ===
    commonWords: [
        'woaini', 'wode', 'nide', 'women', 'shabi', 'niubi', 'caonima', 'qunima',
        'mima', 'zhanghao', 'denglu', 'zhuce', 'youxiang', 'shouji', 'dianhua',
        'aiqing', 'xingfu', 'kuaile', 'yongyuan', 'baobei', 'laopo', 'laogong',
        'didi', 'meimei', 'gege', 'jiejie', 'baba', 'mama', 'erzi', 'nver',
        'zhongguo', 'beijing', 'shanghai', 'guangzhou', 'shenzhen', 'hangzhou'
    ],

    // === 流行网络用语 ===
    internetSlang: [
        'wocao', 'niuren', 'dalao', 'daniu', 'xiaobai', 'gegege', 'hahaha',
        '666', 'yyds', 'xswl', 'awsl', 'zqsg', 'dbq', 'nsdd', 'xjj',
        'emmm', 'srds', 'nbcs', 'yygq', 'yjjc'
    ]
};

// 中国吉利数字组合
const LUCKY_NUMBER_PATTERNS = [
    // 520系列（我爱你）
    '520', '521', '5201314', '1314520', '5211314', '520520', '521521',
    '520131', '5201', '5200', '5211',

    // 1314系列（一生一世）
    '1314', '131420', '13145', '13146', '131452',

    // 吉利数字
    '168', '1688', '168168', '518', '5188', '51888',
    '888', '8888', '88888', '888888',
    '666', '6666', '66666', '666666',
    '999', '9999', '99999',

    // 特殊含义
    '520694', '5201314520', '52013145', '52052052',
    '7758', '77588', '775885', // 亲亲我吧
    '3344', '1711', '1799', '1314521',
    '9527', '1573', '555', '5555', '55555',

    // 生日格式
    '0101', '0214', '0520', '1001', '1111', '1212', '1225',
    '19900101', '19950520', '20000101', '20100520',

    // 年份
    '1990', '1991', '1992', '1993', '1994', '1995', '1996', '1997', '1998', '1999',
    '2000', '2001', '2002', '2003', '2004', '2005', '2006', '2007', '2008', '2009',
    '2010', '2011', '2012', '2020', '2021', '2022', '2023', '2024', '2025'
];

// 手机号段
const PHONE_PREFIXES = [
    '138', '139', '137', '136', '135', '134', '188', '187', '186', '185',
    '159', '158', '157', '156', '155', '152', '150', '151', '133', '132',
    '181', '180', '189', '199', '198', '166', '177', '176'
];

class ChinesePasswordGenerator {
    constructor() {
        this.generatedPasswords = new Set();
        this.generationIndex = 0;
    }

    /**
     * 生成所有中文模式密码
     * @param {number} limit - 生成数量限制
     * @yields {string} 密码候选
     */
    *generate(limit = 10000) {
        let count = 0;

        // === 阶段1：直接使用高频数字 ===
        for (const num of LUCKY_NUMBER_PATTERNS) {
            if (count >= limit) return;
            if (!this.generatedPasswords.has(num)) {
                this.generatedPasswords.add(num);
                count++;
                yield num;
            }
        }

        // === 阶段2：常用词拼音 ===
        for (const word of PINYIN_PATTERNS.commonWords) {
            if (count >= limit) return;
            if (!this.generatedPasswords.has(word)) {
                this.generatedPasswords.add(word);
                count++;
                yield word;
            }

            // 拼音+常用后缀
            for (const suffix of ['123', '1234', '123456', '520', '666', '888', '111', '000']) {
                if (count >= limit) return;
                const pwd = word + suffix;
                if (!this.generatedPasswords.has(pwd)) {
                    this.generatedPasswords.add(pwd);
                    count++;
                    yield pwd;
                }
            }
        }

        // === 阶段3：姓名拼音组合 ===
        for (const surname of PINYIN_PATTERNS.surnames) {
            for (const given of PINYIN_PATTERNS.givenNames) {
                if (count >= limit) return;

                // 姓+名
                const fullName = surname + given;
                if (!this.generatedPasswords.has(fullName)) {
                    this.generatedPasswords.add(fullName);
                    count++;
                    yield fullName;
                }

                // 姓+名+数字
                for (const suffix of ['123', '520', '666', '888']) {
                    if (count >= limit) return;
                    const pwd = fullName + suffix;
                    if (!this.generatedPasswords.has(pwd)) {
                        this.generatedPasswords.add(pwd);
                        count++;
                        yield pwd;
                    }
                }
            }
        }

        // === 阶段4：网络用语 ===
        for (const slang of PINYIN_PATTERNS.internetSlang) {
            if (count >= limit) return;
            if (!this.generatedPasswords.has(slang)) {
                this.generatedPasswords.add(slang);
                count++;
                yield slang;
            }
        }

        // === 阶段5：手机号模式 ===
        for (const prefix of PHONE_PREFIXES) {
            // 常见后8位模式
            for (const suffix of ['00000000', '12345678', '88888888', '66666666']) {
                if (count >= limit) return;
                const phone = prefix + suffix;
                if (!this.generatedPasswords.has(phone)) {
                    this.generatedPasswords.add(phone);
                    count++;
                    yield phone;
                }
            }
        }

        // === 阶段6：QQ号模式（6-10位纯数字）===
        const qqPatterns = [
            '123456', '1234567', '12345678', '123456789', '1234567890',
            '654321', '87654321', '111111', '222222', '333333',
            '888888', '999999', '666666', '520520', '521521'
        ];
        for (const qq of qqPatterns) {
            if (count >= limit) return;
            if (!this.generatedPasswords.has(qq)) {
                this.generatedPasswords.add(qq);
                count++;
                yield qq;
            }
        }
    }

    /**
     * 获取下一批密码
     * @param {number} batchSize - 批量大小
     * @returns {string[]} 密码数组
     */
    getNextBatch(batchSize = 100) {
        const batch = [];
        const generator = this.generate(this.generationIndex + batchSize);

        let idx = 0;
        for (const pwd of generator) {
            if (idx >= this.generationIndex) {
                batch.push(pwd);
            }
            idx++;
            if (batch.length >= batchSize) break;
        }

        this.generationIndex += batch.length;
        return batch;
    }

    /**
     * 重置生成器
     */
    reset() {
        this.generatedPasswords.clear();
        this.generationIndex = 0;
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            generatedCount: this.generatedPasswords.size,
            surnameCount: PINYIN_PATTERNS.surnames.length,
            givenNameCount: PINYIN_PATTERNS.givenNames.length,
            commonWordCount: PINYIN_PATTERNS.commonWords.length,
            luckyNumberCount: LUCKY_NUMBER_PATTERNS.length,
            estimatedTotal:
                LUCKY_NUMBER_PATTERNS.length +
                PINYIN_PATTERNS.commonWords.length * 9 +
                PINYIN_PATTERNS.surnames.length * PINYIN_PATTERNS.givenNames.length * 5 +
                PINYIN_PATTERNS.internetSlang.length +
                PHONE_PREFIXES.length * 4
        };
    }
}

export default ChinesePasswordGenerator;
export { PINYIN_PATTERNS, LUCKY_NUMBER_PATTERNS, PHONE_PREFIXES };
