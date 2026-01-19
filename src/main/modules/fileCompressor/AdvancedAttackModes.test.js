/**
 * 高级攻击模式单元测试
 * 测试日期范围攻击、键盘步行攻击、社会工程攻击的功能正确性
 */

import { vi } from 'vitest';
const DateRangeAttackMode = require('./DateRangeAttackMode');
const KeyboardWalkAttackMode = require('./KeyboardWalkAttackMode');
const SocialEngineeringAttackMode = require('./SocialEngineeringAttackMode');
const AdvancedAttackModeManager = require('./AdvancedAttackModeManager');

describe('高级攻击模式测试', () => {
    
    describe('DateRangeAttackMode - 日期范围攻击', () => {
        let dateAttack;
        
        beforeEach(() => {
            dateAttack = new DateRangeAttackMode({
                startYear: 2020,
                endYear: 2024,
                maxVariants: 1000
            });
        });
        
        test('应该生成基础年份密码', async () => {
            const candidates = await dateAttack.generateCandidates();
            
            expect(candidates).toContain('2020');
            expect(candidates).toContain('2021');
            expect(candidates).toContain('2022');
            expect(candidates).toContain('2023');
            expect(candidates).toContain('2024');
            
            // 两位年份
            expect(candidates).toContain('20');
            expect(candidates).toContain('21');
            expect(candidates).toContain('22');
            expect(candidates).toContain('23');
            expect(candidates).toContain('24');
        });
        
        test('应该生成年月组合密码', async () => {
            const candidates = await dateAttack.generateCandidates();
            
            // 年月组合
            expect(candidates).toContain('202001');
            expect(candidates).toContain('2020-01');
            expect(candidates).toContain('012020');
            expect(candidates).toContain('01-2020');
        });
        
        test('应该生成特殊日期密码', async () => {
            const candidates = await dateAttack.generateCandidates();
            
            // 新年日期
            expect(candidates.some(c => c.includes('0101'))).toBe(true);
            // 国庆日期
            expect(candidates.some(c => c.includes('1001'))).toBe(true);
        });
        
        test('应该添加前缀后缀变体', async () => {
            const candidates = await dateAttack.generateCandidates();
            
            // 检查是否有带后缀的变体
            expect(candidates.some(c => c.endsWith('!'))).toBe(true);
            expect(candidates.some(c => c.endsWith('123'))).toBe(true);
        });
        
        test('应该根据文件信息优化日期范围', () => {
            const fileInfo = {
                creationDate: new Date('2022-06-15'),
                fileName: 'report_2021.zip'
            };
            
            dateAttack.optimizeDateRange(fileInfo);
            
            // 应该调整到文件创建年份附近
            expect(dateAttack.startYear).toBeLessThanOrEqual(2021);
            expect(dateAttack.endYear).toBeGreaterThanOrEqual(2022);
        });
        
        test('应该正确估算候选密码数量', () => {
            const info = dateAttack.getAttackInfo();
            expect(info.estimatedCandidates).toBeGreaterThan(0);
            expect(info.estimatedCandidates).toBeLessThanOrEqual(dateAttack.maxVariants);
        });
    });
    
    describe('KeyboardWalkAttackMode - 键盘步行攻击', () => {
        let keyboardAttack;
        
        beforeEach(() => {
            keyboardAttack = new KeyboardWalkAttackMode({
                minLength: 4,
                maxLength: 8,
                maxVariants: 1000
            });
        });
        
        test('应该生成基础键盘步行密码', async () => {
            const candidates = await keyboardAttack.generateCandidates();
            
            // 常见的键盘步行模式
            expect(candidates).toContain('qwer');
            expect(candidates).toContain('asdf');
            expect(candidates).toContain('zxcv');
            expect(candidates).toContain('1234');
        });
        
        test('应该生成垂直和对角线步行', async () => {
            const candidates = await keyboardAttack.generateCandidates();
            
            // 垂直步行
            expect(candidates).toContain('qaz');
            expect(candidates).toContain('wsx');
            expect(candidates).toContain('edc');
        });
        
        test('应该生成反向步行', async () => {
            const candidates = await keyboardAttack.generateCandidates();
            
            // 反向模式
            expect(candidates).toContain('trewq');
            expect(candidates).toContain('fdsa');
            expect(candidates).toContain('vcxz');
        });
        
        test('应该生成Shift变体', async () => {
            const candidates = await keyboardAttack.generateCandidates();
            
            // 应该包含大写和符号变体
            expect(candidates.some(c => /[A-Z]/.test(c))).toBe(true);
            expect(candidates.some(c => /[!@#$%^&*()]/.test(c))).toBe(true);
        });
        
        test('应该生成数字键盘步行', async () => {
            const candidates = await keyboardAttack.generateCandidates();
            
            // 数字键盘模式
            expect(candidates).toContain('147');
            expect(candidates).toContain('258');
            expect(candidates).toContain('369');
        });
        
        test('应该遵守长度限制', async () => {
            const candidates = await keyboardAttack.generateCandidates();
            
            for (const candidate of candidates) {
                expect(candidate.length).toBeGreaterThanOrEqual(keyboardAttack.minLength);
                expect(candidate.length).toBeLessThanOrEqual(keyboardAttack.maxLength);
            }
        });
    });
    
    describe('SocialEngineeringAttackMode - 社会工程攻击', () => {
        let socialAttack;
        
        beforeEach(() => {
            socialAttack = new SocialEngineeringAttackMode({
                maxVariants: 1000
            });
        });
        
        test('应该从文件名提取关键词', async () => {
            const context = {
                filePath: '/users/john/documents/company_report_2023.zip'
            };
            
            const candidates = await socialAttack.generateCandidates(context);
            
            // 应该包含从文件名提取的关键词
            expect(candidates.some(c => c.includes('company'))).toBe(true);
            expect(candidates.some(c => c.includes('report'))).toBe(true);
            expect(candidates.some(c => c.includes('2023'))).toBe(true);
        });
        
        test('应该从路径提取组织信息', async () => {
            const context = {
                filePath: '/projects/microsoft/office/backup.zip'
            };
            
            const candidates = await socialAttack.generateCandidates(context);
            
            // 应该包含路径中的组织信息
            expect(candidates.some(c => c.includes('microsoft'))).toBe(true);
            expect(candidates.some(c => c.includes('office'))).toBe(true);
        });
        
        test('应该处理中文姓名', async () => {
            const context = {
                filePath: '/users/张三/personal/photos.zip'
            };
            
            const candidates = await socialAttack.generateCandidates(context);
            
            // 应该包含拼音转换
            expect(candidates.some(c => c.includes('zhang'))).toBe(true);
        });
        
        test('应该应用密码变换规则', async () => {
            const context = {
                filePath: '/test/password.zip'
            };
            
            const candidates = await socialAttack.generateCandidates(context);
            
            // 应该包含字符替换变体
            expect(candidates.some(c => c.includes('@'))).toBe(true); // a -> @
            expect(candidates.some(c => c.includes('3'))).toBe(true);  // e -> 3
            expect(candidates.some(c => c.includes('0'))).toBe(true);  // o -> 0
        });
        
        test('应该生成组合密码', async () => {
            const context = {
                filePath: '/company/project/data.zip'
            };
            
            const candidates = await socialAttack.generateCandidates(context);
            
            // 应该包含关键词组合
            expect(candidates.some(c => c.includes('company') && c.includes('project'))).toBe(true);
        });
        
        test('应该添加常见前缀后缀', async () => {
            const context = {
                filePath: '/test/file.zip'
            };
            
            const candidates = await socialAttack.generateCandidates(context);
            
            // 应该包含常见后缀
            expect(candidates.some(c => c.endsWith('123'))).toBe(true);
            expect(candidates.some(c => c.endsWith('!'))).toBe(true);
            expect(candidates.some(c => c.endsWith('2024'))).toBe(true);
        });
    });
    
    describe('AdvancedAttackModeManager - 高级攻击模式管理器', () => {
        let manager;
        let mockTestCallback;
        
        beforeEach(() => {
            manager = new AdvancedAttackModeManager({
                enabledModes: ['date', 'keyboard', 'social'],
                maxCandidatesPerMode: 100,
                priorityMode: 'balanced'
            });
            
            mockTestCallback = vi.fn().mockResolvedValue({ success: false });
        });
        
        test('应该正确初始化所有攻击模式', () => {
            expect(manager.attackModes.date).toBeInstanceOf(DateRangeAttackMode);
            expect(manager.attackModes.keyboard).toBeInstanceOf(KeyboardWalkAttackMode);
            expect(manager.attackModes.social).toBeInstanceOf(SocialEngineeringAttackMode);
        });
        
        test('应该按优先级顺序执行攻击模式', () => {
            const speedOrder = manager.modePriorities.speed;
            const balancedOrder = manager.modePriorities.balanced;
            const thoroughOrder = manager.modePriorities.thorough;
            
            expect(speedOrder).toEqual(['social', 'date', 'keyboard']);
            expect(balancedOrder).toEqual(['date', 'social', 'keyboard']);
            expect(thoroughOrder).toEqual(['keyboard', 'date', 'social']);
        });
        
        test('应该执行高级攻击并返回结果', async () => {
            const context = {
                filePath: '/test/file.zip',
                fileInfo: { size: 1024 }
            };
            
            const result = await manager.executeAdvancedAttacks(context, mockTestCallback);
            
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('totalCandidatesTested');
            expect(result).toHaveProperty('executionTime');
            expect(result).toHaveProperty('modeResults');
            
            // 应该测试了一些候选密码
            expect(result.totalCandidatesTested).toBeGreaterThan(0);
        });
        
        test('应该在找到密码时停止执行', async () => {
            // 模拟第二次调用成功
            mockTestCallback
                .mockResolvedValueOnce({ success: false })
                .mockResolvedValueOnce({ success: true });
            
            const context = { filePath: '/test/file.zip' };
            const result = await manager.executeAdvancedAttacks(context, mockTestCallback);
            
            expect(result.success).toBe(true);
            expect(result.password).toBeDefined();
            expect(result.successfulMode).toBeDefined();
        });
        
        test('应该正确更新统计信息', async () => {
            const context = { filePath: '/test/file.zip' };
            await manager.executeAdvancedAttacks(context, mockTestCallback);
            
            const stats = manager.getStatistics();
            
            expect(stats.modeUsageCount).toBeDefined();
            expect(stats.averageGenerationTime).toBeDefined();
            expect(stats.successRates).toBeDefined();
        });
        
        test('应该支持配置攻击模式', () => {
            manager.configureMode('date', { startYear: 2000, endYear: 2025 });
            
            expect(manager.attackModes.date.startYear).toBe(2000);
            expect(manager.attackModes.date.endYear).toBe(2025);
        });
        
        test('应该支持启用/禁用攻击模式', () => {
            manager.setEnabledModes(['date', 'social']);
            
            expect(manager.enabledModes).toEqual(['date', 'social']);
            expect(manager.enabledModes).not.toContain('keyboard');
        });
        
        test('应该支持设置优先级模式', () => {
            manager.setPriorityMode('speed');
            expect(manager.priorityMode).toBe('speed');
            
            const executionOrder = manager.getExecutionOrder();
            expect(executionOrder[0]).toBe('social'); // 速度模式优先社会工程
        });
        
        test('应该根据文件大小优化参数', () => {
            const smallFileContext = {
                fileInfo: { size: 500 * 1024 } // 500KB
            };
            
            const originalMaxVariants = manager.attackModes.date.maxVariants;
            manager.optimizeAttackParameters(smallFileContext);
            
            // 小文件应该增加日期攻击的候选数量
            expect(manager.attackModes.date.maxVariants).toBeGreaterThan(originalMaxVariants);
        });
        
        test('应该提供攻击模式信息', () => {
            const info = manager.getAttackModesInfo();
            
            expect(info.date).toBeDefined();
            expect(info.keyboard).toBeDefined();
            expect(info.social).toBeDefined();
            
            expect(info.date.name).toBe('Date Range Attack');
            expect(info.keyboard.name).toBe('Keyboard Walk Attack');
            expect(info.social.name).toBe('Social Engineering Attack');
        });
    });
    
    describe('集成测试 - 高级攻击模式协同工作', () => {
        test('所有攻击模式应该生成不重复的候选密码', async () => {
            const context = {
                filePath: '/users/john/work/project_2023.zip',
                fileInfo: { 
                    size: 1024 * 1024,
                    creationDate: new Date('2023-06-15')
                }
            };
            
            const dateAttack = new DateRangeAttackMode({ maxVariants: 500 });
            const keyboardAttack = new KeyboardWalkAttackMode({ maxVariants: 500 });
            const socialAttack = new SocialEngineeringAttackMode({ maxVariants: 500 });
            
            const dateCandidates = await dateAttack.generateCandidates(context);
            const keyboardCandidates = await keyboardAttack.generateCandidates(context);
            const socialCandidates = await socialAttack.generateCandidates(context);
            
            // 检查是否有重叠（应该很少）
            const allCandidates = [...dateCandidates, ...keyboardCandidates, ...socialCandidates];
            const uniqueCandidates = [...new Set(allCandidates)];
            
            // 重叠率应该很低（小于10%）
            const overlapRate = (allCandidates.length - uniqueCandidates.length) / allCandidates.length;
            expect(overlapRate).toBeLessThan(0.1);
        });
        
        test('高级攻击模式应该覆盖不同的密码类型', async () => {
            const context = {
                filePath: '/company/hr/employee_data_2023.zip'
            };
            
            const manager = new AdvancedAttackModeManager({
                maxCandidatesPerMode: 200
            });
            
            // 收集所有生成的候选密码
            const allCandidates = [];
            const mockTestCallback = vi.fn().mockImplementation((password) => {
                allCandidates.push(password);
                return Promise.resolve({ success: false });
            });
            
            await manager.executeAdvancedAttacks(context, mockTestCallback);
            
            // 检查是否覆盖了不同类型的密码
            const hasDatePasswords = allCandidates.some(p => /\b(19|20)\d{2}\b/.test(p));
            const hasKeyboardWalk = allCandidates.some(p => /qwer|asdf|zxcv|1234/.test(p));
            const hasContextual = allCandidates.some(p => /company|employee|data/.test(p));
            
            expect(hasDatePasswords).toBe(true);
            expect(hasKeyboardWalk).toBe(true);
            expect(hasContextual).toBe(true);
        });
    });
});

// 性能测试
describe('高级攻击模式性能测试', () => {
    test('日期范围攻击应该在合理时间内完成', async () => {
        const dateAttack = new DateRangeAttackMode({
            startYear: 2020,
            endYear: 2024,
            maxVariants: 5000
        });
        
        const startTime = Date.now();
        const candidates = await dateAttack.generateCandidates();
        const executionTime = Date.now() - startTime;
        
        expect(candidates.length).toBeGreaterThan(0);
        expect(executionTime).toBeLessThan(5000); // 应该在5秒内完成
    });
    
    test('键盘步行攻击应该在合理时间内完成', async () => {
        const keyboardAttack = new KeyboardWalkAttackMode({
            maxLength: 10,
            maxVariants: 5000
        });
        
        const startTime = Date.now();
        const candidates = await keyboardAttack.generateCandidates();
        const executionTime = Date.now() - startTime;
        
        expect(candidates.length).toBeGreaterThan(0);
        expect(executionTime).toBeLessThan(3000); // 应该在3秒内完成
    });
    
    test('社会工程攻击应该在合理时间内完成', async () => {
        const socialAttack = new SocialEngineeringAttackMode({
            maxVariants: 5000
        });
        
        const context = {
            filePath: '/very/long/path/with/many/components/company_project_data_2023_final.zip'
        };
        
        const startTime = Date.now();
        const candidates = await socialAttack.generateCandidates(context);
        const executionTime = Date.now() - startTime;
        
        expect(candidates.length).toBeGreaterThan(0);
        expect(executionTime).toBeLessThan(2000); // 应该在2秒内完成
    });
});