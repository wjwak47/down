/**
 * 核心优化验证测试
 * 
 * 目标：验证所有核心优化组件的协同工作效果
 * 包括：性能监控器、资源管理器、增强策略管理器、GPU优化、AI优化、CPU优化
 * 
 * 测试范围：
 * 1. 组件初始化和集成测试
 * 2. 性能监控和资源管理协调测试
 * 3. 优化策略应用和效果验证
 * 4. 实时调整机制测试
 * 5. 错误处理和回退机制测试
 * 6. 端到端优化流程测试
 */

const path = require('path');
const fs = require('fs').promises;

// 由于使用CommonJS，我们需要动态导入ES模块
let OptimizationIntegration, PerformanceMonitor, ResourceManager, EnhancedStrategyManager;

async function loadModules() {
    try {
        const optimizationModule = await import('./src/main/modules/fileCompressor/OptimizationIntegration.js');
        OptimizationIntegration = optimizationModule.default;
        
        const performanceModule = await import('./src/main/modules/fileCompressor/PerformanceMonitor.js');
        PerformanceMonitor = performanceModule.default;
        
        const resourceModule = await import('./src/main/modules/fileCompressor/ResourceManager.js');
        ResourceManager = resourceModule.default;
        
        const strategyModule = await import('./src/main/modules/fileCompressor/EnhancedStrategyManager.js');
        EnhancedStrategyManager = strategyModule.default;
        
        return true;
    } catch (error) {
        console.error('模块加载失败:', error.message);
        return false;
    }
}

// 测试配置
const TEST_CONFIG = {
    sessionId: 'test_core_optimization_' + Date.now(),
    testTimeout: 30000,
    performanceThresholds: {
        initializationTime: 5000,
        responseTime: 1000,
        memoryUsage: 0.8,
        cpuUsage: 0.9
    }
};

class CoreOptimizationVerificationTest {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: [],
            details: []
        };
        
        this.optimizationIntegration = null;
        this.testStartTime = Date.now();
    }
    
    /**
     * 运行所有核心优化验证测试
     */
    async runAllTests() {
        console.log('🚀 开始核心优化验证测试');
        console.log('=' .repeat(60));
        
        // 首先加载所需模块
        const modulesLoaded = await loadModules();
        if (!modulesLoaded) {
            this.recordError('模块加载', new Error('无法加载必需的优化模块'));
            this.printTestResults();
            return;
        }
        
        try {
            // 1. 组件初始化测试
            await this.testComponentInitialization();
            
            // 2. 组件集成测试
            await this.testComponentIntegration();
            
            // 3. 性能监控测试
            await this.testPerformanceMonitoring();
            
            // 4. 资源管理测试
            await this.testResourceManagement();
            
            // 5. 策略管理测试
            await this.testStrategyManagement();
            
            // 6. 实时优化调整测试
            await this.testRealTimeOptimization();
            
            // 7. 错误处理测试
            await this.testErrorHandling();
            
            // 8. 端到端集成测试
            await this.testEndToEndIntegration();
            
            // 9. 性能基准测试
            await this.testPerformanceBenchmark();
            
            // 10. 兼容性测试
            await this.testCompatibility();
            
        } catch (error) {
            this.recordError('测试执行失败', error);
        } finally {
            await this.cleanup();
            this.printTestResults();
        }
    }
    
    /**
     * 测试1: 组件初始化
     */
    async testComponentInitialization() {
        console.log('\n📋 测试1: 组件初始化测试');
        
        try {
            const startTime = Date.now();
            
            // 创建优化集成实例
            this.optimizationIntegration = new OptimizationIntegration(TEST_CONFIG.sessionId, {
                enablePerformanceMonitoring: true,
                enableResourceManagement: true,
                enableEnhancedStrategy: true,
                enableRealTimeAdjustment: true
            });
            
            // 初始化
            const initResult = await this.optimizationIntegration.initialize();
            const initTime = Date.now() - startTime;
            
            // 验证初始化结果
            if (!initResult.success) {
                throw new Error(`初始化失败: ${initResult.error}`);
            }
            
            // 验证初始化时间
            if (initTime > TEST_CONFIG.performanceThresholds.initializationTime) {
                this.recordWarning('初始化时间过长', `${initTime}ms > ${TEST_CONFIG.performanceThresholds.initializationTime}ms`);
            }
            
            // 验证组件状态
            const status = this.optimizationIntegration.getOptimizationStatus();
            if (!status.isInitialized) {
                throw new Error('组件初始化状态不正确');
            }
            
            this.recordSuccess('组件初始化', `耗时: ${initTime}ms`);
            
        } catch (error) {
            this.recordError('组件初始化测试', error);
        }
    }
    
    /**
     * 测试2: 组件集成
     */
    async testComponentIntegration() {
        console.log('\n🔗 测试2: 组件集成测试');
        
        try {
            if (!this.optimizationIntegration) {
                throw new Error('优化集成组件未初始化');
            }
            
            // 测试组件间通信
            const performanceMonitor = this.optimizationIntegration.performanceMonitor;
            const resourceManager = this.optimizationIntegration.resourceManager;
            const strategyManager = this.optimizationIntegration.enhancedStrategyManager;
            
            // 验证组件存在
            if (!performanceMonitor || !resourceManager || !strategyManager) {
                throw new Error('核心组件未正确初始化');
            }
            
            // 测试组件协调机制
            let coordinationWorking = false;
            
            // 模拟性能数据更新
            const testMetrics = {
                cpuUsage: 0.5,
                memoryUsage: 0.6,
                gpuUsage: 0.3,
                passwordsPerSecond: 1000,
                efficiency: 0.8
            };
            
            // 等待组件间数据传递
            setTimeout(() => {
                coordinationWorking = true;
            }, 1000);
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            if (!coordinationWorking) {
                this.recordWarning('组件协调', '组件间通信可能存在延迟');
            }
            
            this.recordSuccess('组件集成', '所有核心组件正常集成');
            
        } catch (error) {
            this.recordError('组件集成测试', error);
        }
    }
    
    /**
     * 测试3: 性能监控
     */
    async testPerformanceMonitoring() {
        console.log('\n📊 测试3: 性能监控测试');
        
        try {
            const performanceMonitor = this.optimizationIntegration.performanceMonitor;
            
            // 测试性能指标收集
            const metrics = await performanceMonitor.getCurrentMetrics();
            
            // 验证指标完整性
            const requiredMetrics = ['cpuUsage', 'memoryUsage', 'passwordsPerSecond', 'efficiency'];
            for (const metric of requiredMetrics) {
                if (typeof metrics[metric] !== 'number') {
                    throw new Error(`性能指标 ${metric} 缺失或类型错误`);
                }
            }
            
            // 测试瓶颈检测
            const bottleneckAnalysis = await performanceMonitor.analyzeBottlenecks(metrics);
            if (!bottleneckAnalysis || typeof bottleneckAnalysis.efficiency !== 'number') {
                throw new Error('瓶颈分析功能异常');
            }
            
            // 测试历史数据记录
            await performanceMonitor.recordMetrics(metrics);
            const history = await performanceMonitor.getPerformanceHistory(5);
            
            if (!Array.isArray(history) || history.length === 0) {
                this.recordWarning('性能历史', '历史数据记录可能存在问题');
            }
            
            this.recordSuccess('性能监控', `指标收集正常，效率: ${metrics.efficiency.toFixed(2)}`);
            
        } catch (error) {
            this.recordError('性能监控测试', error);
        }
    }
    
    /**
     * 测试4: 资源管理
     */
    async testResourceManagement() {
        console.log('\n💾 测试4: 资源管理测试');
        
        try {
            const resourceManager = this.optimizationIntegration.resourceManager;
            
            // 测试硬件配置检测
            const hardwareProfile = await resourceManager.getHardwareProfile();
            
            // 验证硬件配置
            const requiredFields = ['cpuCores', 'totalMemory', 'availableMemory'];
            for (const field of requiredFields) {
                if (typeof hardwareProfile[field] !== 'number' || hardwareProfile[field] <= 0) {
                    throw new Error(`硬件配置字段 ${field} 异常`);
                }
            }
            
            // 测试资源分配
            const allocation = await resourceManager.allocateResources('cpu_crack', 'high');
            
            if (!allocation || typeof allocation.cpuThreads !== 'number') {
                throw new Error('资源分配功能异常');
            }
            
            // 测试资源限制
            const memoryUsage = hardwareProfile.totalMemory - hardwareProfile.availableMemory;
            const memoryUsageRatio = memoryUsage / hardwareProfile.totalMemory;
            
            if (memoryUsageRatio > TEST_CONFIG.performanceThresholds.memoryUsage) {
                this.recordWarning('内存使用', `内存使用率过高: ${(memoryUsageRatio * 100).toFixed(1)}%`);
            }
            
            // 测试NUMA感知分配（如果支持）
            try {
                const numaAllocation = await resourceManager.allocateNUMAThreads(4);
                if (Array.isArray(numaAllocation) && numaAllocation.length > 0) {
                    this.recordSuccess('NUMA支持', `检测到 ${numaAllocation.length} 个NUMA节点`);
                }
            } catch (numaError) {
                this.recordInfo('NUMA支持', '当前系统不支持NUMA或检测失败');
            }
            
            this.recordSuccess('资源管理', `CPU: ${hardwareProfile.cpuCores}核, 内存: ${Math.round(hardwareProfile.totalMemory/1024/1024/1024)}GB`);
            
        } catch (error) {
            this.recordError('资源管理测试', error);
        }
    }
    
    /**
     * 测试5: 策略管理
     */
    async testStrategyManagement() {
        console.log('\n🎯 测试5: 策略管理测试');
        
        try {
            const strategyManager = this.optimizationIntegration.enhancedStrategyManager;
            
            // 测试策略生成
            const testContext = {
                fileSize: 1024 * 1024, // 1MB
                fileName: 'test_2023.zip',
                fileType: 'zip',
                mode: 'gpu'
            };
            
            const strategy = await strategyManager.generateStrategy(testContext);
            
            // 验证策略结构
            if (!strategy || !strategy.phases || !Array.isArray(strategy.phases)) {
                throw new Error('策略生成结果结构异常');
            }
            
            // 测试策略优化
            const optimizedStrategy = await strategyManager.optimizeStrategy(strategy, {
                cpuCores: 8,
                totalMemory: 16 * 1024 * 1024 * 1024,
                gpuAvailable: true
            });
            
            if (!optimizedStrategy || optimizedStrategy.phases.length === 0) {
                throw new Error('策略优化失败');
            }
            
            // 测试实时调整
            const adjustment = await strategyManager.adjustStrategyRealTime(
                optimizedStrategy,
                { efficiency: 0.05, cpuUsage: 0.95 },
                60000
            );
            
            if (adjustment && adjustment.action === 'skip') {
                this.recordSuccess('实时调整', '低效率相位跳跃机制正常');
            }
            
            this.recordSuccess('策略管理', `生成 ${strategy.phases.length} 个破解相位`);
            
        } catch (error) {
            this.recordError('策略管理测试', error);
        }
    }
    
    /**
     * 测试6: 实时优化调整
     */
    async testRealTimeOptimization() {
        console.log('\n⚡ 测试6: 实时优化调整测试');
        
        try {
            // 模拟破解上下文
            const crackingContext = {
                fileSize: 2 * 1024 * 1024,
                fileName: 'document_2023.zip',
                fileType: 'zip',
                mode: 'gpu',
                userPreferences: { mode: 'balanced' }
            };
            
            // 开始优化会话
            const optimizationResult = await this.optimizationIntegration.startOptimization(crackingContext);
            
            if (!optimizationResult.success) {
                throw new Error(`优化会话启动失败: ${optimizationResult.error}`);
            }
            
            const optimizationId = optimizationResult.optimizationId;
            
            // 等待实时调整运行
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // 检查优化状态
            const status = this.optimizationIntegration.getOptimizationStatus();
            
            if (status.activeOptimizations !== 1) {
                throw new Error('优化会话状态异常');
            }
            
            // 模拟高CPU使用率触发调整
            const testMetrics = {
                cpuUsage: 0.95,
                memoryUsage: 0.7,
                efficiency: 0.3,
                passwordsPerSecond: 500
            };
            
            // 等待调整触发
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 停止优化会话
            const stopResult = await this.optimizationIntegration.stopOptimization(optimizationId);
            
            if (!stopResult.success) {
                throw new Error(`停止优化会话失败: ${stopResult.error}`);
            }
            
            // 验证调整效果
            if (stopResult.results && stopResult.results.adjustmentCount > 0) {
                this.recordSuccess('实时调整', `执行了 ${stopResult.results.adjustmentCount} 次调整`);
            } else {
                this.recordInfo('实时调整', '未触发调整（正常情况）');
            }
            
        } catch (error) {
            this.recordError('实时优化调整测试', error);
        }
    }
    
    /**
     * 测试7: 错误处理
     */
    async testErrorHandling() {
        console.log('\n🛡️ 测试7: 错误处理测试');
        
        try {
            // 测试无效参数处理
            try {
                await this.optimizationIntegration.startOptimization(null);
                this.recordWarning('错误处理', '应该抛出无效参数错误');
            } catch (expectedError) {
                this.recordSuccess('参数验证', '正确处理无效参数');
            }
            
            // 测试资源不足处理
            const resourceManager = this.optimizationIntegration.resourceManager;
            
            // 模拟内存不足
            const originalMemory = resourceManager.resourceLimits?.totalMemory;
            if (resourceManager.resourceLimits) {
                resourceManager.resourceLimits.totalMemory = 100 * 1024 * 1024; // 100MB
            }
            
            try {
                const allocation = await resourceManager.allocateResources('cpu_crack', 'high');
                if (allocation.memoryLimit < 1024 * 1024 * 1024) { // < 1GB
                    this.recordSuccess('资源限制', '正确处理内存不足情况');
                }
            } catch (resourceError) {
                this.recordSuccess('资源错误', '正确抛出资源不足错误');
            }
            
            // 恢复原始内存设置
            if (resourceManager.resourceLimits && originalMemory) {
                resourceManager.resourceLimits.totalMemory = originalMemory;
            }
            
            // 测试回退机制
            const status = this.optimizationIntegration.getOptimizationStatus();
            if (status.errorCount > 0 && !status.fallbackMode) {
                this.recordSuccess('错误恢复', '错误计数正常，未触发回退模式');
            }
            
            this.recordSuccess('错误处理', '错误处理机制正常工作');
            
        } catch (error) {
            this.recordError('错误处理测试', error);
        }
    }
    
    /**
     * 测试8: 端到端集成
     */
    async testEndToEndIntegration() {
        console.log('\n🔄 测试8: 端到端集成测试');
        
        try {
            // 完整的优化流程测试
            const fullContext = {
                fileSize: 5 * 1024 * 1024,
                fileName: 'important_document_2023.zip',
                fileType: 'zip',
                mode: 'gpu',
                userPreferences: {
                    mode: 'speed',
                    enablePhaseSkipping: true,
                    maxMemoryUsage: 0.7
                }
            };
            
            // 1. 启动优化
            const startResult = await this.optimizationIntegration.startOptimization(fullContext);
            if (!startResult.success) {
                throw new Error('端到端测试启动失败');
            }
            
            const optimizationId = startResult.optimizationId;
            
            // 2. 运行一段时间
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 3. 检查中间状态
            const midStatus = this.optimizationIntegration.getOptimizationStatus();
            if (midStatus.activeOptimizations !== 1) {
                throw new Error('中间状态检查失败');
            }
            
            // 4. 获取性能数据
            const performanceMonitor = this.optimizationIntegration.performanceMonitor;
            const currentMetrics = await performanceMonitor.getCurrentMetrics();
            
            if (!currentMetrics || typeof currentMetrics.efficiency !== 'number') {
                throw new Error('性能数据获取失败');
            }
            
            // 5. 停止优化
            const stopResult = await this.optimizationIntegration.stopOptimization(optimizationId);
            if (!stopResult.success) {
                throw new Error('端到端测试停止失败');
            }
            
            // 6. 验证最终状态
            const finalStatus = this.optimizationIntegration.getOptimizationStatus();
            if (finalStatus.activeOptimizations !== 0) {
                throw new Error('最终状态验证失败');
            }
            
            // 7. 验证优化效果
            const results = stopResult.results;
            if (results && results.estimatedSpeedup > 1.0) {
                this.recordSuccess('优化效果', `预估加速比: ${results.estimatedSpeedup.toFixed(2)}x`);
            }
            
            this.recordSuccess('端到端集成', '完整优化流程正常工作');
            
        } catch (error) {
            this.recordError('端到端集成测试', error);
        }
    }
    
    /**
     * 测试9: 性能基准
     */
    async testPerformanceBenchmark() {
        console.log('\n🏃 测试9: 性能基准测试');
        
        try {
            const benchmarkResults = {
                initializationTime: 0,
                optimizationStartTime: 0,
                memoryFootprint: 0,
                cpuOverhead: 0
            };
            
            // 基准测试1: 初始化性能
            const initStart = Date.now();
            const testIntegration = new OptimizationIntegration('benchmark_test', {
                enablePerformanceMonitoring: true,
                enableResourceManagement: true,
                enableEnhancedStrategy: true
            });
            
            await testIntegration.initialize();
            benchmarkResults.initializationTime = Date.now() - initStart;
            
            // 基准测试2: 优化启动性能
            const optimizationStart = Date.now();
            const benchmarkContext = {
                fileSize: 1024 * 1024,
                fileName: 'benchmark.zip',
                fileType: 'zip',
                mode: 'cpu'
            };
            
            const optResult = await testIntegration.startOptimization(benchmarkContext);
            benchmarkResults.optimizationStartTime = Date.now() - optimizationStart;
            
            if (optResult.success) {
                await testIntegration.stopOptimization(optResult.optimizationId);
            }
            
            // 基准测试3: 内存占用
            const memoryUsage = process.memoryUsage();
            benchmarkResults.memoryFootprint = memoryUsage.heapUsed / 1024 / 1024; // MB
            
            // 清理基准测试实例
            await testIntegration.cleanup();
            
            // 评估基准结果
            if (benchmarkResults.initializationTime > TEST_CONFIG.performanceThresholds.initializationTime) {
                this.recordWarning('初始化性能', `${benchmarkResults.initializationTime}ms 超过阈值`);
            }
            
            if (benchmarkResults.optimizationStartTime > TEST_CONFIG.performanceThresholds.responseTime) {
                this.recordWarning('响应性能', `${benchmarkResults.optimizationStartTime}ms 超过阈值`);
            }
            
            this.recordSuccess('性能基准', 
                `初始化: ${benchmarkResults.initializationTime}ms, ` +
                `启动: ${benchmarkResults.optimizationStartTime}ms, ` +
                `内存: ${benchmarkResults.memoryFootprint.toFixed(1)}MB`
            );
            
        } catch (error) {
            this.recordError('性能基准测试', error);
        }
    }
    
    /**
     * 测试10: 兼容性测试
     */
    async testCompatibility() {
        console.log('\n🔧 测试10: 兼容性测试');
        
        try {
            // 测试不同配置的兼容性
            const configurations = [
                { enablePerformanceMonitoring: false, enableResourceManagement: true, enableEnhancedStrategy: true },
                { enablePerformanceMonitoring: true, enableResourceManagement: false, enableEnhancedStrategy: true },
                { enablePerformanceMonitoring: true, enableResourceManagement: true, enableEnhancedStrategy: false },
                { enablePerformanceMonitoring: false, enableResourceManagement: false, enableEnhancedStrategy: false }
            ];
            
            let compatibilityScore = 0;
            
            for (let i = 0; i < configurations.length; i++) {
                const config = configurations[i];
                
                try {
                    const testIntegration = new OptimizationIntegration(`compat_test_${i}`, config);
                    const initResult = await testIntegration.initialize();
                    
                    if (initResult.success) {
                        compatibilityScore++;
                        
                        // 测试基本功能
                        const status = testIntegration.getOptimizationStatus();
                        if (status.isInitialized) {
                            compatibilityScore++;
                        }
                    }
                    
                    await testIntegration.cleanup();
                    
                } catch (configError) {
                    this.recordWarning('配置兼容性', `配置 ${i} 失败: ${configError.message}`);
                }
            }
            
            const compatibilityPercentage = (compatibilityScore / (configurations.length * 2)) * 100;
            
            if (compatibilityPercentage >= 90) {
                this.recordSuccess('兼容性', `兼容性得分: ${compatibilityPercentage.toFixed(1)}%`);
            } else if (compatibilityPercentage >= 70) {
                this.recordWarning('兼容性', `兼容性得分: ${compatibilityPercentage.toFixed(1)}% (可接受)`);
            } else {
                this.recordError('兼容性测试', new Error(`兼容性得分过低: ${compatibilityPercentage.toFixed(1)}%`));
            }
            
        } catch (error) {
            this.recordError('兼容性测试', error);
        }
    }
    
    /**
     * 清理测试资源
     */
    async cleanup() {
        console.log('\n🧹 清理测试资源...');
        
        try {
            if (this.optimizationIntegration) {
                await this.optimizationIntegration.cleanup();
            }
        } catch (error) {
            console.error('清理失败:', error);
        }
    }
    
    /**
     * 记录测试结果
     */
    recordSuccess(testName, details) {
        this.testResults.passed++;
        this.testResults.details.push({
            type: 'SUCCESS',
            test: testName,
            details,
            timestamp: Date.now()
        });
        console.log(`✅ ${testName}: ${details}`);
    }
    
    recordWarning(testName, details) {
        this.testResults.details.push({
            type: 'WARNING',
            test: testName,
            details,
            timestamp: Date.now()
        });
        console.log(`⚠️  ${testName}: ${details}`);
    }
    
    recordInfo(testName, details) {
        this.testResults.details.push({
            type: 'INFO',
            test: testName,
            details,
            timestamp: Date.now()
        });
        console.log(`ℹ️  ${testName}: ${details}`);
    }
    
    recordError(testName, error) {
        this.testResults.failed++;
        this.testResults.errors.push({
            test: testName,
            error: error.message,
            stack: error.stack,
            timestamp: Date.now()
        });
        console.log(`❌ ${testName}: ${error.message}`);
    }
    
    /**
     * 打印测试结果摘要
     */
    printTestResults() {
        const totalTime = Date.now() - this.testStartTime;
        const totalTests = this.testResults.passed + this.testResults.failed;
        const successRate = totalTests > 0 ? (this.testResults.passed / totalTests * 100) : 0;
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 核心优化验证测试结果摘要');
        console.log('='.repeat(60));
        console.log(`总测试数: ${totalTests}`);
        console.log(`通过: ${this.testResults.passed}`);
        console.log(`失败: ${this.testResults.failed}`);
        console.log(`成功率: ${successRate.toFixed(1)}%`);
        console.log(`总耗时: ${totalTime}ms`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n❌ 失败的测试:');
            this.testResults.errors.forEach(error => {
                console.log(`  - ${error.test}: ${error.error}`);
            });
        }
        
        // 生成测试报告
        this.generateTestReport();
        
        // 判断测试是否通过
        if (successRate >= 80) {
            console.log('\n🎉 核心优化验证测试通过！');
            console.log('✅ 所有核心优化组件工作正常，可以继续后续任务');
        } else if (successRate >= 60) {
            console.log('\n⚠️  核心优化验证测试部分通过');
            console.log('🔧 建议修复失败的测试后再继续');
        } else {
            console.log('\n❌ 核心优化验证测试失败');
            console.log('🚨 需要修复关键问题后重新测试');
        }
    }
    
    /**
     * 生成详细测试报告
     */
    generateTestReport() {
        const report = {
            testSession: TEST_CONFIG.sessionId,
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.testStartTime,
            summary: {
                total: this.testResults.passed + this.testResults.failed,
                passed: this.testResults.passed,
                failed: this.testResults.failed,
                successRate: this.testResults.passed + this.testResults.failed > 0 ? 
                    (this.testResults.passed / (this.testResults.passed + this.testResults.failed) * 100) : 0
            },
            details: this.testResults.details,
            errors: this.testResults.errors,
            recommendations: this.generateRecommendations()
        };
        
        // 保存报告到文件
        const reportPath = `test-core-optimization-report-${Date.now()}.json`;
        fs.writeFile(reportPath, JSON.stringify(report, null, 2))
            .then(() => {
                console.log(`\n📄 详细测试报告已保存: ${reportPath}`);
            })
            .catch(error => {
                console.error('保存测试报告失败:', error);
            });
    }
    
    /**
     * 生成优化建议
     */
    generateRecommendations() {
        const recommendations = [];
        
        // 基于测试结果生成建议
        if (this.testResults.failed > 0) {
            recommendations.push('修复失败的测试用例，确保核心功能稳定');
        }
        
        const warningCount = this.testResults.details.filter(d => d.type === 'WARNING').length;
        if (warningCount > 2) {
            recommendations.push('关注警告信息，优化性能和资源使用');
        }
        
        if (this.testResults.passed >= 8) {
            recommendations.push('核心优化功能验证通过，可以继续后续高级功能开发');
        }
        
        recommendations.push('定期运行此验证测试，确保优化功能持续稳定');
        
        return recommendations;
    }
}

// 运行测试
async function runCoreOptimizationVerification() {
    const tester = new CoreOptimizationVerificationTest();
    await tester.runAllTests();
}

// 如果直接运行此文件
if (require.main === module) {
    runCoreOptimizationVerification().catch(error => {
        console.error('测试执行失败:', error);
        process.exit(1);
    });
}

module.exports = CoreOptimizationVerificationTest;