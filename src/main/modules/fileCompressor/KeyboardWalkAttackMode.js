/**
 * 键盘步行攻击模式
 * 生成基于键盘布局的相邻按键密码模式
 */

class KeyboardWalkAttackMode {
    constructor(options = {}) {
        this.maxLength = options.maxLength || 12;
        this.minLength = options.minLength || 4;
        this.maxVariants = options.maxVariants || 30000;
        this.includeShifted = options.includeShifted !== false;
        this.includeReverse = options.includeReverse !== false;

        // QWERTY键盘布局映射（相邻键位）
        this.keyboardLayout = {
            // 数字行
            '1': ['2', 'q'],
            '2': ['1', '3', 'q', 'w'],
            '3': ['2', '4', 'w', 'e'],
            '4': ['3', '5', 'e', 'r'],
            '5': ['4', '6', 'r', 't'],
            '6': ['5', '7', 't', 'y'],
            '7': ['6', '8', 'y', 'u'],
            '8': ['7', '9', 'u', 'i'],
            '9': ['8', '0', 'i', 'o'],
            '0': ['9', 'o', 'p'],

            // 第一行字母
            'q': ['1', '2', 'w', 'a'],
            'w': ['2', '3', 'q', 'e', 'a', 's'],
            'e': ['3', '4', 'w', 'r', 's', 'd'],
            'r': ['4', '5', 'e', 't', 'd', 'f'],
            't': ['5', '6', 'r', 'y', 'f', 'g'],
            'y': ['6', '7', 't', 'u', 'g', 'h'],
            'u': ['7', '8', 'y', 'i', 'h', 'j'],
            'i': ['8', '9', 'u', 'o', 'j', 'k'],
            'o': ['9', '0', 'i', 'p', 'k', 'l'],
            'p': ['0', 'o', 'l'],

            // 第二行字母
            'a': ['q', 'w', 's', 'z'],
            's': ['w', 'e', 'a', 'd', 'z', 'x'],
            'd': ['e', 'r', 's', 'f', 'x', 'c'],
            'f': ['r', 't', 'd', 'g', 'c', 'v'],
            'g': ['t', 'y', 'f', 'h', 'v', 'b'],
            'h': ['y', 'u', 'g', 'j', 'b', 'n'],
            'j': ['u', 'i', 'h', 'k', 'n', 'm'],
            'k': ['i', 'o', 'j', 'l', 'm'],
            'l': ['o', 'p', 'k'],

            // 第三行字母
            'z': ['a', 's', 'x'],
            'x': ['s', 'd', 'z', 'c'],
            'c': ['d', 'f', 'x', 'v'],
            'v': ['f', 'g', 'c', 'b'],
            'b': ['g', 'h', 'v', 'n'],
            'n': ['h', 'j', 'b', 'm'],
            'm': ['j', 'k', 'n']
        };

        // Shift键对应的字符映射
        this.shiftMap = {
            '1': '!', '2': '@', '3': '#', '4': '$', '5': '%',
            '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
            'q': 'Q', 'w': 'W', 'e': 'E', 'r': 'R', 't': 'T',
            'y': 'Y', 'u': 'U', 'i': 'I', 'o': 'O', 'p': 'P',
            'a': 'A', 's': 'S', 'd': 'D', 'f': 'F', 'g': 'G',
            'h': 'H', 'j': 'J', 'k': 'K', 'l': 'L',
            'z': 'Z', 'x': 'X', 'c': 'C', 'v': 'V', 'b': 'B',
            'n': 'N', 'm': 'M'
        };

        // 常见的键盘步行起始点
        this.commonStartKeys = [
            'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p',
            'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
            'z', 'x', 'c', 'v', 'b', 'n', 'm',
            '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'
        ];

        // 常见的步行方向
        this.walkDirections = [
            'horizontal_right',  // 水平向右
            'horizontal_left',   // 水平向左
            'vertical_down',     // 垂直向下
            'vertical_up',       // 垂直向上
            'diagonal_down_right', // 对角线右下
            'diagonal_up_left'   // 对角线左上
        ];
    }

    /**
     * 生成键盘步行攻击的密码候选
     * @param {Object} context - 攻击上下文
     * @returns {Array} 密码候选数组
     */
    async generateCandidates(context = {}) {
        console.log('[KeyboardWalkAttack] 生成键盘步行攻击候选密码');

        const candidates = new Set();
        let generated = 0;

        try {
            // 1. 首先生成常见的键盘模式（优先级最高）
            const commonPatterns = this.generateCommonKeyboardPatterns();
            for (const pattern of commonPatterns) {
                if (generated >= this.maxVariants) break;
                this.addCandidate(candidates, pattern);
                generated++;

                // 生成反向步行
                if (this.includeReverse) {
                    const reversed = pattern.split('').reverse().join('');
                    this.addCandidate(candidates, reversed);
                    generated++;
                }

                // 生成Shift变体
                if (this.includeShifted) {
                    const shifted = this.applyShift(pattern);
                    if (shifted !== pattern) {
                        this.addCandidate(candidates, shifted);
                        generated++;
                    }

                    // 混合大小写变体
                    const mixedCase = this.generateMixedCase(pattern);
                    for (const variant of mixedCase) {
                        if (generated >= this.maxVariants) break;
                        this.addCandidate(candidates, variant);
                        generated++;
                    }
                }
            }

            // 2. 生成基础键盘步行模式
            for (const startKey of this.commonStartKeys) {
                if (generated >= this.maxVariants) break;

                // 尝试不同长度的步行
                for (let length = this.minLength; length <= this.maxLength && generated < this.maxVariants; length++) {
                    const walks = this.generateWalksFromKey(startKey, length);

                    for (const walk of walks) {
                        if (generated >= this.maxVariants) break;

                        this.addCandidate(candidates, walk);
                        generated++;

                        // 生成反向步行
                        if (this.includeReverse) {
                            const reversed = walk.split('').reverse().join('');
                            this.addCandidate(candidates, reversed);
                            generated++;
                        }

                        // 生成Shift变体
                        if (this.includeShifted) {
                            const shifted = this.applyShift(walk);
                            if (shifted !== walk) {
                                this.addCandidate(candidates, shifted);
                                generated++;
                            }

                            // 混合大小写变体
                            const mixedCase = this.generateMixedCase(walk);
                            for (const variant of mixedCase) {
                                if (generated >= this.maxVariants) break;
                                this.addCandidate(candidates, variant);
                                generated++;
                            }
                        }
                    }
                }
            }

            // 3. 生成数字键盘步行
            const numpadWalks = this.generateNumpadWalks();
            for (const walk of numpadWalks) {
                if (generated >= this.maxVariants) break;
                this.addCandidate(candidates, walk);
                generated++;
            }

            const finalCandidates = Array.from(candidates);
            console.log(`[KeyboardWalkAttack] 生成完成，共 ${finalCandidates.length} 个候选密码`);

            return finalCandidates;

        } catch (error) {
            console.error('[KeyboardWalkAttack] 生成候选密码时发生错误:', error);
            return Array.from(candidates);
        }
    }

    /**
     * 从指定键开始生成步行模式
     */
    generateWalksFromKey(startKey, length) {
        const walks = [];
        const visited = new Set();

        // 深度优先搜索生成步行路径
        const dfs = (currentKey, path, remaining) => {
            if (remaining === 0) {
                if (path.length >= this.minLength) {
                    walks.push(path);
                }
                return;
            }

            const neighbors = this.keyboardLayout[currentKey] || [];
            for (const neighbor of neighbors) {
                const newPath = path + neighbor;
                const pathKey = `${currentKey}-${neighbor}-${remaining}`;

                if (!visited.has(pathKey) && newPath.length <= this.maxLength) {
                    visited.add(pathKey);
                    dfs(neighbor, newPath, remaining - 1);
                }
            }
        };

        dfs(startKey, startKey, length - 1);
        return walks.slice(0, 20); // 限制每个起始键的步行数量
    }

    /**
     * 生成常见的键盘模式
     */
    generateCommonKeyboardPatterns() {
        return [
            // 水平行
            'qwerty', 'qwertyui', 'asdf', 'asdfgh', 'zxcv', 'zxcvbn',
            'yuiop', 'hjkl', 'nm',

            // 垂直列
            'qaz', 'wsx', 'edc', 'rfv', 'tgb', 'yhn', 'ujm', 'ik', 'ol',

            // 对角线
            'qwe', 'asd', 'zxc', 'wer', 'sdf', 'xcv', 'ert', 'dfg', 'cvb',

            // 数字行
            '123', '1234', '12345', '123456', '1234567', '12345678', '123456789', '1234567890',
            '098', '0987', '09876', '098765', '0987654', '09876543', '098765432', '0987654321',

            // 常见步行模式
            'qwer', 'asdf', 'zxcv', 'qaz', 'wsx', 'edc',
            'rfv', 'tgb', 'yhn', 'ujm', 'ik', 'ol', 'p',

            // 反向模式
            'trewq', 'fdsa', 'vcxz', 'zaq', 'xsw', 'cde',

            // L形和其他形状
            'qweasd', 'qazwsx', 'plokij', 'mnbvcx'
        ];
    }

    /**
     * 生成数字键盘步行模式
     */
    generateNumpadWalks() {
        const numpadLayout = {
            '7': ['4', '8'],
            '8': ['7', '5', '9'],
            '9': ['8', '6'],
            '4': ['7', '1', '5'],
            '5': ['4', '8', '2', '6'],
            '6': ['5', '9', '3'],
            '1': ['4', '2'],
            '2': ['1', '5', '3'],
            '3': ['2', '6']
        };

        const walks = [];

        // 生成数字键盘的步行模式
        for (let start = 1; start <= 9; start++) {
            const startKey = start.toString();
            let current = startKey;
            let walk = current;

            // 生成不同长度的步行
            for (let i = 1; i < 6; i++) {
                const neighbors = numpadLayout[current];
                if (neighbors && neighbors.length > 0) {
                    // 选择第一个邻居继续步行
                    current = neighbors[0];
                    walk += current;

                    if (walk.length >= this.minLength) {
                        walks.push(walk);
                    }
                }
            }
        }

        // 添加一些常见的数字键盘模式
        walks.push('147', '258', '369', '159', '357', '741', '852', '963', '951', '753');
        walks.push('1472', '2583', '3694', '1596', '3574', '7412', '8523', '9634');

        return walks;
    }

    /**
     * 应用Shift变体
     */
    applyShift(text) {
        return text.split('').map(char => this.shiftMap[char] || char).join('');
    }

    /**
     * 生成混合大小写变体
     */
    generateMixedCase(text) {
        const variants = [];
        const length = text.length;

        // 生成几种常见的大小写模式
        if (length > 0) {
            // 首字母大写
            variants.push(text.charAt(0).toUpperCase() + text.slice(1).toLowerCase());

            // 全大写
            variants.push(text.toUpperCase());

            // 交替大小写
            if (length > 2) {
                let alternating = '';
                for (let i = 0; i < length; i++) {
                    const char = text.charAt(i);
                    alternating += i % 2 === 0 ? char.toUpperCase() : char.toLowerCase();
                }
                variants.push(alternating);
            }
        }

        return variants.filter(v => v !== text); // 排除原始文本
    }

    /**
     * 添加候选密码到集合（避免重复）
     */
    addCandidate(candidates, password) {
        if (password && password.length >= this.minLength && password.length <= this.maxLength) {
            candidates.add(password);
        }
    }

    /**
     * 获取攻击模式信息
     */
    getAttackInfo() {
        return {
            name: 'Keyboard Walk Attack',
            description: '基于键盘布局的相邻按键步行攻击',
            estimatedCandidates: this.estimateCandidateCount(),
            timeComplexity: 'O(k*l*d)，其中k为起始键数，l为步行长度，d为方向数'
        };
    }

    /**
     * 估算候选密码数量
     */
    estimateCandidateCount() {
        const startKeys = this.commonStartKeys.length;
        const avgWalksPerKey = 20;
        const lengthVariants = this.maxLength - this.minLength + 1;

        let estimate = startKeys * avgWalksPerKey * lengthVariants;

        if (this.includeReverse) {
            estimate *= 2;
        }

        if (this.includeShifted) {
            estimate *= 3; // 原始 + Shift + 混合大小写
        }

        // 加上常见模式和数字键盘
        estimate += 100;

        return Math.min(estimate, this.maxVariants);
    }
}

export default KeyboardWalkAttackMode;