/**
 * EnhancedStrategyManager 测试
 * 
 * 测试智能策略配置系统的功能：
 * 1. 相位启用/禁用功能
 * 2. 用户偏好配置
 * 3. 自定义策略创建
 * 4. 策略过滤和优化
 */

import EnhancedStrategyManager from './EnhancedStrategyManager.js';
import fs from 'fs';
import path from 'path';

describe('EnhancedStrategyManager - 智能策略配置系统', () => {
    let manager;
    const testConfigDir = path.join(process.cwd(), '.kiro-test');
    
    beforeEach(() => {
        // 创建测试配置目录
        if (!fs.existsSync(testConfigDir)) {
            fs.mkdirSync(testConfigDir, { recursive: true });
        }
        
        // 临时修改配置路径
        const originalCwd = process.cwd;
        process.cwd = () => testConfigDir;
        
        manager = new EnhancedStrategyManager();
        
        // 恢复原始路径
        process.cwd = originalCwd;
    });
    
    afterEach(() => {
        // 清理测试文件
        if (fs.existsSync(testConfigDir)) {
            fs.rmSync(testConfigDir, { recursive: true, force: true });
        }
    });
    
    describe('相位启用/禁用功能', () => {
        test('应该能够禁用单个相位', () => {
            // 禁用AI相位
            manager.setPhaseEnabled('ai', false);
            
            expect(manager.isPhaseEnabled('ai')).toBe(false);
            expect(manager.isPhaseEnabled('top10k')).toBe(true); // 其他相位应该保持启用
        });
        
        test('应该能够批量设置相位状态', () => {
            const phaseSettings = {
                'ai': false,
                'dictionary': false,
                'mask': true,
                'keyboard': true
            };
            
            manager.setMultiplePhases(phaseSettings);
            
            expect(manager.isPhaseEnabled('ai')).toBe(false);
            expect(manager.isPhaseEnabled('dictionary')).toBe(false);
            expect(manager.isPhaseEnabled('mask')).toBe(true);
            expect(manager.isPhaseEnabled('keyboard')).toBe(true);
        });
        
        test('应该能够获取所有相位设置', () => {
            manager.setPhaseEnabled('ai', false);
            manager.setPhaseEnabled('cpu', false);
            
            const allSettings = manager.getAllPhaseSettings();
            
            expect(allSettings).toHaveProperty('ai');
            expect(allSettings).toHaveProperty('cpu');
            expect(allSettings).toHaveProperty('top10k');
            
            expect(allSettings.ai.enabled).toBe(false);
            expect(allSettings.cpu.enabled).toBe(false);
            expect(allSettings.top10k.enabled).toBe(true);
            
            // 检查描述
            expect(allSettings.ai.description).toContain('AI密码生成');
            expect(allSettings.cpu.description).toContain('CPU暴力破解');
        });
        
        test('应该能够重置相位设置', () => {
            // 先设置一些相位为禁用
            manager.setPhaseEnabled('ai', false);
            manager.setPhaseEnabled('dictionary', false);
            
            // 重置
            manager.resetPhaseSettings();
            
            // 所有相位应该恢复为启用
            expect(manager.isPhaseEnabled('ai')).toBe(true);
            expect(manager.isPhaseEnabled('dictionary')).toBe(true);
        });
    });
    
    describe('策略过滤功能', () => {
        test('应该过滤掉被禁用的相位', () => {
            // 禁用一些相位
            manager.setPhaseEnabled('ai', false);
            manager.setPhaseEnabled('dictionary', false);
            
            const originalStrategy = {
                name: 'Test Strategy',
                phases: ['ai', 'top10k', 'dictionary', 'keyboard'],
                weights: {
                    ai: 0.3,
                    top10k: 0.3,
                    dictionary: 0.2,
                    keyboard: 0.2
                },
                timeouts: {
                    ai: 300,
                    top10k: 180,
                    dictionary: 600,
                    keyboard: 300
                }
            };
            
            const filteredStrategy = manager.applyPhaseFiltering(originalStrategy);
            
            // 被禁用的相位应该被移除
            expect(filteredStrategy.phases).not.toContain('ai');
            expect(filteredStrategy.phases).not.toContain('dictionary');
            expect(filteredStrategy.phases).toContain('top10k');
            expect(filteredStrategy.phases).toContain('keyboard');
            
            // 权重应该被重新归一化
            expect(filteredStrategy.weights).not.toHaveProperty('ai');
            expect(filteredStrategy.weights).not.toHaveProperty('dictionary');
            expect(filteredStrategy.weights.top10k + filteredStrategy.weights.keyboard).toBeCloseTo(1.0, 5);
            
            // 超时设置也应该被移除
            expect(filteredStrategy.timeouts).not.toHaveProperty('ai');
            expect(filteredStrategy.timeouts).not.toHaveProperty('dictionary');
        });
        
        test('应该在策略调整中应用相位过滤', async () => {
            // 禁用AI和字典相位
            manager.setPhaseEnabled('ai', false);
            manager.setPhaseEnabled('dictionary', false);
            
            const fileCharacteristics = {
                filePath: '/test/document.zip',
                fileName: 'document.zip'
            };
            
            const hardwareProfile = {
                cpu: { cores: 4 },
                memory: { total: 8 * 1024 * 1024 * 1024 },
                gpu: { available: true }
            };
            
            const strategy = await manager.adjustStrategy(fileCharacteristics, hardwareProfile);
            
            // 被禁用的相位不应该出现在最终策略中
            expect(strategy.phases).not.toContain('ai');
            expect(strategy.phases).not.toContain('dictionary');
        });
    });
    
    describe('自定义策略功能', () => {
        test('应该能够创建自定义策略', () => {
            const customConfig = {
                description: '测试自定义策略',
                phases: ['top10k', 'keyboard', 'short_brute'],
                weights: {
                    top10k: 0.5,
                    keyboard: 0.3,
                    short_brute: 0.2
                },
                timeouts: {
                    top10k: 120,
                    keyboard: 180,
                    short_brute: 600
                },
                skipSlowPhases: true,
                maxTotalTime: 900
            };
            
            const strategy = manager.createCustomStrategy('My Custom Strategy', customConfig);
            
            expect(strategy.name).toBe('My Custom Strategy');
            expect(strategy.phases).toEqual(['top10k', 'keyboard', 'short_brute']);
            expect(strategy.weights.top10k).toBeCloseTo(0.5, 5);
            expect(strategy.skipSlowPhases).toBe(true);
            expect(strategy.maxTotalTime).toBe(900);
        });
        
        test('应该能够获取自定义策略', () => {
            const customConfig = {
                phases: ['top10k', 'keyboard'],
                weights: { top10k: 0.6, keyboard: 0.4 }
            };
            
            manager.createCustomStrategy('Test Strategy', customConfig);
            
            const retrieved = manager.getCustomStrategy('Test Strategy');
            
            expect(retrieved).not.toBeNull();
            expect(retrieved.name).toBe('Test Strategy');
            expect(retrieved.phases).toEqual(['top10k', 'keyboard']);
        });
        
        test('应该在策略调整中使用自定义策略', async () => {
            // 创建自定义策略
            const customConfig = {
                phases: ['top10k', 'keyboard'],
                weights: { top10k: 0.7, keyboard: 0.3 }
            };
            
            manager.createCustomStrategy('Fast Custom', customConfig);
            
            // 设置用户偏好使用自定义策略
            manager.updateUserPreferences({ defaultMode: 'FAST_CUSTOM' });
            
            const fileCharacteristics = {
                filePath: '/test/photo.zip',
                fileName: 'photo.zip'
            };
            
            const hardwareProfile = {
                cpu: { cores: 4 },
                memory: { total: 8 * 1024 * 1024 * 1024 },
                gpu: { available: false }
            };
            
            const strategy = await manager.adjustStrategy(fileCharacteristics, hardwareProfile);
            
            // 应该使用自定义策略的相位
            expect(strategy.phases).toContain('top10k');
            expect(strategy.phases).toContain('keyboard');
        });
    });
    
    describe('用户偏好管理', () => {
        test('应该能够更新用户偏好', () => {
            const preferences = {
                defaultMode: 'SPEED_PRIORITY',
                preferGPU: false,
                maxTime: 1800,
                skipSlowPhases: true
            };
            
            manager.updateUserPreferences(preferences);
            
            expect(manager.userPreferences.defaultMode).toBe('SPEED_PRIORITY');
            expect(manager.userPreferences.preferGPU).toBe(false);
            expect(manager.userPreferences.maxTime).toBe(1800);
            expect(manager.userPreferences.skipSlowPhases).toBe(true);
        });
        
        test('应该能够导出用户配置', () => {
            // 设置一些配置
            manager.updateUserPreferences({ defaultMode: 'SPEED_PRIORITY' });
            manager.setPhaseEnabled('ai', false);
            manager.createCustomStrategy('Export Test', { phases: ['top10k'] });
            
            const exported = manager.exportUserConfiguration();
            
            expect(exported).toHaveProperty('preferences');
            expect(exported).toHaveProperty('phaseSettings');
            expect(exported).toHaveProperty('customStrategies');
            expect(exported).toHaveProperty('exportedAt');
            
            expect(exported.preferences.defaultMode).toBe('SPEED_PRIORITY');
            expect(exported.phaseSettings.ai.enabled).toBe(false);
            expect(exported.customStrategies).toHaveProperty('EXPORT_TEST');
        });
        
        test('应该能够导入用户配置', () => {
            const config = {
                preferences: {
                    defaultMode: 'THOROUGHNESS_PRIORITY',
                    preferGPU: true
                },
                phaseSettings: {
                    ai: { enabled: false },
                    dictionary: { enabled: false }
                },
                customStrategies: {
                    IMPORTED_STRATEGY: {
                        name: 'Imported Strategy',
                        phases: ['keyboard', 'short_brute']
                    }
                }
            };
            
            const result = manager.importUserConfiguration(config);
            
            expect(result.success).toBe(true);
            expect(manager.userPreferences.defaultMode).toBe('THOROUGHNESS_PRIORITY');
            expect(manager.userPreferences.preferGPU).toBe(true);
            expect(manager.isPhaseEnabled('ai')).toBe(false);
            expect(manager.isPhaseEnabled('dictionary')).toBe(false);
            expect(manager.getCustomStrategy('Imported Strategy')).not.toBeNull();
        });
    });
    
    describe('策略信息获取', () => {
        test('应该能够获取所有可用策略', () => {
            // 创建一个自定义策略
            manager.createCustomStrategy('Test Custom', { phases: ['top10k'] });
            
            const allStrategies = manager.getAllAvailableStrategies();
            
            // 应该包含增强策略
            const enhancedStrategies = allStrategies.filter(s => s.category === 'enhanced');
            expect(enhancedStrategies.length).toBeGreaterThan(0);
            expect(enhancedStrategies.some(s => s.type === 'SPEED_PRIORITY')).toBe(true);
            
            // 应该包含基础策略
            const basicStrategies = allStrategies.filter(s => s.category === 'basic');
            expect(basicStrategies.length).toBeGreaterThan(0);
            expect(basicStrategies.some(s => s.type === 'PERSONAL')).toBe(true);
            
            // 应该包含自定义策略
            const customStrategies = allStrategies.filter(s => s.category === 'custom');
            expect(customStrategies.length).toBeGreaterThan(0);
            expect(customStrategies.some(s => s.type === 'TEST_CUSTOM')).toBe(true);
        });
        
        test('应该能够获取相位描述', () => {
            const aiDescription = manager.getPhaseDescription('ai');
            const unknownDescription = manager.getPhaseDescription('unknown_phase');
            
            expect(aiDescription).toContain('AI密码生成');
            expect(unknownDescription).toBe('未知相位');
        });
    });
    
    describe('集成测试', () => {
        test('完整的策略配置流程', async () => {
            // 1. 设置用户偏好
            manager.updateUserPreferences({
                defaultMode: 'SPEED_PRIORITY',
                preferGPU: true
            });
            
            // 2. 禁用一些相位
            manager.setPhaseEnabled('dictionary', false);
            manager.setPhaseEnabled('rule', false);
            
            // 3. 创建自定义策略
            manager.createCustomStrategy('Integration Test', {
                phases: ['ai', 'top10k', 'keyboard', 'dictionary'],
                weights: { ai: 0.4, top10k: 0.3, keyboard: 0.2, dictionary: 0.1 }
            });
            
            // 4. 使用自定义策略
            manager.updateUserPreferences({ defaultMode: 'INTEGRATION_TEST' });
            
            // 5. 调整策略
            const fileCharacteristics = {
                filePath: '/test/work_document.zip',
                fileName: 'work_document.zip'
            };
            
            const hardwareProfile = {
                cpu: { cores: 8 },
                memory: { total: 16 * 1024 * 1024 * 1024 },
                gpu: { available: true }
            };
            
            const strategy = await manager.adjustStrategy(fileCharacteristics, hardwareProfile);
            
            // 验证结果
            expect(strategy.phases).toContain('ai');
            expect(strategy.phases).toContain('top10k');
            expect(strategy.phases).toContain('keyboard');
            expect(strategy.phases).not.toContain('dictionary'); // 被禁用
            
            // 权重应该被重新归一化
            const totalWeight = Object.values(strategy.weights).reduce((sum, w) => sum + w, 0);
            expect(totalWeight).toBeCloseTo(1.0, 5);
        });
    });
});