/**
 * SuccessProbabilityEstimator 测试
 * 
 * 测试成功概率估算系统的功能：
 * 1. 概率计算准确性
 * 2. 特征提取和分析
 * 3. 历史数据学习
 * 4. 实时概率更新
 */

import SuccessProbabilityEstimator from './SuccessProbabilityEstimator.js';
import fs from 'fs';
import path from 'path';

describe('SuccessProbabilityEstimator - 成功概率估算系统', () => {
    let estimator;
    const testConfigDir = path.join(process.cwd(), '.kiro-test');
    
    beforeEach(() => {
        // 创建测试配置目录
        if (!fs.existsSync(testConfigDir)) {
            fs.mkdirSync(testConfigDir, { recursive: true });
        }
        
        // 临时修改配置路径
        const originalCwd = process.cwd;
        process.cwd = () => testConfigDir;
        
        estimator = new SuccessProbabilityEstimator();
        
        // 恢复原始路径
        process.cwd = originalCwd;
    });
    
    afterEach(() => {
        // 清理测试文件
        if (fs.existsSync(testConfigDir)) {
            fs.rmSync(testConfigDir, { recursive: true, force: true });
        }
    });
    
    describe('特征提取功能', () => {
        test('应该正确提取文件大小特征', () => {
            const characteristics = {
                filePath: __filename // 使用当前测试文件
            };
            
            const features = estimator.extractFileFeatures(characteristics);
            
            expect(features).toHaveProperty('fileSize');
            expect(['small', 'medium', 'large', 'very_large']).toContain(features.fileSize);
        });
        
        test('应该正确提取文件类型特征', () => {
            const characteristics = {
                filePath: '/test/document.pdf'
            };
            
            const fileTypeFeature = estimator.extractFileTypeFeature(characteristics);
            
            expect(fileTypeFeature).toBe('document');
        });
        
        test('应该正确提取文件名特征', () => {
            const characteristics = {
                filePath: '/test/personal_photos_2023_backup.zip'
            };
            
            const fileNameFeature = estimator.extractFileNameFeature(characteristics);
            
            expect(fileNameFeature.hasDate).toBe(true);
            expect(fileNameFeature.isPersonal).toBe(true);
            expect(fileNameFeature.isBackup).toBe(true);
            expect(fileNameFeature.hasNumbers).toBe(true);
        });
        
        test('应该正确提取路径上下文特征', () => {
            const characteristics = {
                filePath: '/users/john/personal/photos/vacation.zip'
            };
            
            const pathFeature = estimator.extractPathContextFeature(characteristics);
            
            expect(pathFeature.hasUserPath).toBe(true);
            expect(pathFeature.hasPersonalPath).toBe(true);
            expect(pathFeature.depth).toBeGreaterThan(0);
        });
    });
    
    describe('概率计算功能', () => {
        test('应该计算基础成功概率', async () => {
            const fileCharacteristics = {
                filePath: '/test/personal_photo.zip',
                fileName: 'personal_photo.zip'
            };
            
            const strategy = {
                name: 'BALANCED_ADAPTIVE',
                phases: ['ai', 'top10k', 'keyboard']
            };
            
            const hardwareProfile = {
                cpu: { cores: 4 },
                memory: { total: 8 * 1024 * 1024 * 1024 },
                gpu: { available: true }
            };
            
            const estimation = await estimator.estimateSuccessProbability(
                fileCharacteristics, 
                strategy, 
                hardwareProfile
            );
            
            expect(estimation).toHaveProperty('overallProbability');
            expect(estimation).toHaveProperty('confidence');
            expect(estimation).toHaveProperty('phasesProbabilities');
            expect(estimation).toHaveProperty('estimatedTime');
            expect(estimation).toHaveProperty('reasoning');
            
            expect(estimation.overallProbability).toBeGreaterThan(0);
            expect(estimation.overallProbability).toBeLessThan(1);
            expect(estimation.confidence).toBeGreaterThan(0);
            expect(estimation.confidence).toBeLessThan(1);
            expect(estimation.estimatedTime).toBeGreaterThan(0);
        });
        
        test('个人文件应该有更高的成功概率', async () => {
            const personalFile = {
                filePath: '/users/john/personal/family_photos.zip',
                fileName: 'family_photos.zip'
            };
            
            const workFile = {
                filePath: '/work/projects/confidential_report.zip',
                fileName: 'confidential_report.zip'
            };
            
            const strategy = {
                name: 'BALANCED_ADAPTIVE',
                phases: ['ai', 'top10k', 'keyboard']
            };
            
            const hardwareProfile = {
                cpu: { cores: 4 },
                memory: { total: 8 * 1024 * 1024 * 1024 },
                gpu: { available: false }
            };
            
            const personalEstimation = await estimator.estimateSuccessProbability(
                personalFile, strategy, hardwareProfile
            );
            
            const workEstimation = await estimator.estimateSuccessProbability(
                workFile, strategy, hardwareProfile
            );
            
            // 个人文件的成功概率应该更高
            expect(personalEstimation.overallProbability).toBeGreaterThan(workEstimation.overallProbability);
        });
        
        test('应该根据策略调整概率', async () => {
            const fileCharacteristics = {
                filePath: '/test/document.zip',
                fileName: 'document.zip'
            };
            
            const speedStrategy = {
                name: 'SPEED_PRIORITY',
                phases: ['ai', 'top10k']
            };
            
            const thoroughStrategy = {
                name: 'THOROUGHNESS_PRIORITY',
                phases: ['ai', 'top10k', 'keyboard', 'dictionary', 'rule', 'mask']
            };
            
            const hardwareProfile = {
                cpu: { cores: 4 },
                memory: { total: 8 * 1024 * 1024 * 1024 },
                gpu: { available: true }
            };
            
            const speedEstimation = await estimator.estimateSuccessProbability(
                fileCharacteristics, speedStrategy, hardwareProfile
            );
            
            const thoroughEstimation = await estimator.estimateSuccessProbability(
                fileCharacteristics, thoroughStrategy, hardwareProfile
            );
            
            // 彻底模式应该有更高的成功概率
            expect(thoroughEstimation.overallProbability).toBeGreaterThan(speedEstimation.overallProbability);
        });
    });
    
    describe('实时概率更新', () => {
        test('应该根据时间和尝试次数更新概率', () => {
            const currentPhase = 'ai';
            const elapsedTime = 5 * 60 * 1000; // 5分钟
            const attempts = 10000;
            const performance = { efficiency: 0.5 };
            
            const update = estimator.updateProbabilityInRealtime(
                currentPhase, elapsedTime, attempts, performance
            );
            
            expect(update).toHaveProperty('currentPhaseProbability');
            expect(update).toHaveProperty('remainingPhasesProbability');
            expect(update).toHaveProperty('overallRemainingProbability');
            expect(update).toHaveProperty('timeFactor');
            expect(update).toHaveProperty('efficiencyFactor');
            expect(update).toHaveProperty('attemptsFactor');
            
            expect(update.currentPhaseProbability).toBeGreaterThan(0);
            expect(update.currentPhaseProbability).toBeLessThan(1);
        });
        
        test('长时间运行应该降低概率', () => {
            const currentPhase = 'dictionary';
            const shortTime = 1 * 60 * 1000; // 1分钟
            const longTime = 30 * 60 * 1000; // 30分钟
            const attempts = 1000;
            const performance = { efficiency: 0.8 };
            
            const shortUpdate = estimator.updateProbabilityInRealtime(
                currentPhase, shortTime, attempts, performance
            );
            
            const longUpdate = estimator.updateProbabilityInRealtime(
                currentPhase, longTime, attempts, performance
            );
            
            // 长时间运行的概率应该更低
            expect(longUpdate.currentPhaseProbability).toBeLessThan(shortUpdate.currentPhaseProbability);
        });
        
        test('低效率应该降低概率', () => {
            const currentPhase = 'mask';
            const elapsedTime = 10 * 60 * 1000; // 10分钟
            const attempts = 5000;
            
            const highEfficiency = { efficiency: 0.9 };
            const lowEfficiency = { efficiency: 0.1 };
            
            const highEffUpdate = estimator.updateProbabilityInRealtime(
                currentPhase, elapsedTime, attempts, highEfficiency
            );
            
            const lowEffUpdate = estimator.updateProbabilityInRealtime(
                currentPhase, elapsedTime, attempts, lowEfficiency
            );
            
            // 高效率的概率应该更高
            expect(highEffUpdate.currentPhaseProbability).toBeGreaterThan(lowEffUpdate.currentPhaseProbability);
        });
    });
    
    describe('历史数据学习', () => {
        test('应该记录破解结果', () => {
            const fileCharacteristics = {
                filePath: '/test/example.zip',
                fileName: 'example.zip'
            };
            
            const strategy = {
                name: 'BALANCED_ADAPTIVE'
            };
            
            const successResult = {
                found: true,
                attempts: 1000
            };
            
            const elapsedTime = 5 * 60 * 1000; // 5分钟
            const phase = 'ai';
            
            // 记录成功结果
            estimator.recordCrackingResult(
                fileCharacteristics, strategy, successResult, elapsedTime, phase
            );
            
            // 验证数据被记录
            const stats = estimator.getStatistics();
            expect(stats.totalRecords).toBeGreaterThan(0);
            expect(stats.totalSuccesses).toBeGreaterThan(0);
        });
        
        test('应该从历史数据中学习', async () => {
            const fileCharacteristics = {
                filePath: '/test/personal_file.zip',
                fileName: 'personal_file.zip'
            };
            
            const strategy = {
                name: 'SPEED_PRIORITY',
                phases: ['ai', 'top10k']
            };
            
            const hardwareProfile = {
                cpu: { cores: 4 },
                memory: { total: 8 * 1024 * 1024 * 1024 },
                gpu: { available: true }
            };
            
            // 记录几个成功案例
            for (let i = 0; i < 5; i++) {
                estimator.recordCrackingResult(
                    fileCharacteristics,
                    strategy,
                    { found: true, attempts: 1000 },
                    3 * 60 * 1000, // 3分钟
                    'ai'
                );
            }
            
            // 获取概率估算
            const estimation = await estimator.estimateSuccessProbability(
                fileCharacteristics, strategy, hardwareProfile
            );
            
            // 有历史成功数据的情况下，置信度应该较高
            expect(estimation.confidence).toBeGreaterThan(0.5);
        });
        
        test('应该更新相位成功率', () => {
            const phase = 'keyboard';
            
            // 获取初始状态
            const initialStats = estimator.getStatistics();
            const initialPhaseStats = initialStats.phaseStats[phase] || { attempts: 0, successes: 0 };
            
            // 记录一些成功和失败
            estimator.updatePhaseSuccessRate(phase, true);
            estimator.updatePhaseSuccessRate(phase, true);
            estimator.updatePhaseSuccessRate(phase, false);
            
            const stats = estimator.getStatistics();
            const phaseStats = stats.phaseStats[phase];
            
            expect(phaseStats.attempts).toBe(initialPhaseStats.attempts + 3);
            expect(phaseStats.successes).toBe(initialPhaseStats.successes + 2);
            expect(phaseStats.rate).toBeCloseTo((initialPhaseStats.successes + 2) / (initialPhaseStats.attempts + 3), 2);
        });
    });
    
    describe('各相位概率计算', () => {
        test('应该为每个相位计算概率', async () => {
            const fileCharacteristics = {
                filePath: '/test/date_file_2023.zip',
                fileName: 'date_file_2023.zip'
            };
            
            const strategy = {
                name: 'BALANCED_ADAPTIVE',
                phases: ['ai', 'top10k', 'keyboard', 'date_range']
            };
            
            const hardwareProfile = {
                cpu: { cores: 4 },
                memory: { total: 8 * 1024 * 1024 * 1024 },
                gpu: { available: true }
            };
            
            const estimation = await estimator.estimateSuccessProbability(
                fileCharacteristics, strategy, hardwareProfile
            );
            
            // 应该为每个相位都有概率
            expect(estimation.phasesProbabilities).toHaveProperty('ai');
            expect(estimation.phasesProbabilities).toHaveProperty('top10k');
            expect(estimation.phasesProbabilities).toHaveProperty('keyboard');
            expect(estimation.phasesProbabilities).toHaveProperty('date_range');
            
            // 包含日期的文件，日期攻击概率应该较高
            expect(estimation.phasesProbabilities.date_range).toBeGreaterThan(0.1);
        });
    });
    
    describe('统计信息', () => {
        test('应该提供准确的统计信息', () => {
            // 添加一些测试数据
            estimator.updatePhaseSuccessRate('ai', true);
            estimator.updatePhaseSuccessRate('ai', false);
            estimator.updatePhaseSuccessRate('top10k', true);
            
            const stats = estimator.getStatistics();
            
            expect(stats).toHaveProperty('totalRecords');
            expect(stats).toHaveProperty('totalSuccesses');
            expect(stats).toHaveProperty('overallSuccessRate');
            expect(stats).toHaveProperty('phaseStats');
            expect(stats).toHaveProperty('featureWeightsCount');
            
            expect(stats.phaseStats).toHaveProperty('ai');
            expect(stats.phaseStats).toHaveProperty('top10k');
        });
    });
    
    describe('集成测试', () => {
        test('完整的概率估算流程', async () => {
            const fileCharacteristics = {
                filePath: '/users/alice/personal/family_vacation_2023.zip',
                fileName: 'family_vacation_2023.zip'
            };
            
            const strategy = {
                name: 'BALANCED_ADAPTIVE',
                phases: ['ai', 'top10k', 'keyboard', 'date_range', 'dictionary']
            };
            
            const hardwareProfile = {
                cpu: { cores: 8 },
                memory: { total: 16 * 1024 * 1024 * 1024 },
                gpu: { available: true }
            };
            
            // 1. 初始概率估算
            const initialEstimation = await estimator.estimateSuccessProbability(
                fileCharacteristics, strategy, hardwareProfile
            );
            
            expect(initialEstimation.overallProbability).toBeGreaterThan(0);
            expect(initialEstimation.reasoning.length).toBeGreaterThan(0);
            
            // 2. 模拟破解过程中的实时更新
            const realtimeUpdate = estimator.updateProbabilityInRealtime(
                'ai', 2 * 60 * 1000, 5000, { efficiency: 0.7 }
            );
            
            expect(realtimeUpdate.currentPhaseProbability).toBeGreaterThan(0);
            
            // 3. 记录破解结果
            estimator.recordCrackingResult(
                fileCharacteristics,
                strategy,
                { found: true, attempts: 8000 },
                4 * 60 * 1000,
                'ai'
            );
            
            // 4. 验证学习效果
            const updatedEstimation = await estimator.estimateSuccessProbability(
                fileCharacteristics, strategy, hardwareProfile
            );
            
            // 有了成功记录后，置信度应该提高
            expect(updatedEstimation.confidence).toBeGreaterThanOrEqual(initialEstimation.confidence);
        });
    });
});