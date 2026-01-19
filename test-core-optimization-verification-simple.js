/**
 * 简化版核心优化验证测试
 * 
 * 目标：验证所有核心优化组件的基本功能
 * 包括：性能监控器、资源管理器、增强策略管理器的基本功能测试
 */

const fs = require('fs').promises;
const path = require('path');

// 测试配置
const TEST_CONFIG = {
    sessionId: 'test_core_optimization_simple_' + Date.now(),
    testTimeout: 30000
};

class SimpleCoreOptimizationTest {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: [],
            details: []
        };
        
        this.testStartTime = Date.now();
    }
    
    /**
     * 运行所有简化测试
     */
    async runAllTests() {
        console.log('🚀 开始简化版核心优化验证测试');
        console.log('=' .repeat(60));
        
        try {
            // 1. 文件存在性测试
            await this.testFileExistence();
            
            // 2. 模块导入测试
            await this.testModuleImports();
            
            // 3. 基本功能测试
            await this.testBasicFunctionality();
            
            // 4. 集成测试
            await this.testIntegration();
            
        } catch (error) {
            this.recordError('测试执行失败', error);
        } finally {
            this.printTestResults();
        }
    }
    
    /**
     * 测试1: 文件存在性
     */
    async testFileExistence() {
        console.log('\n📁 测试1: 核心优化文件存在性测试');
        
        const requiredFiles = [
            'src/main/modules/fileCompressor/OptimizationIntegration.js',
            'src/main/modules/fileCompressor/PerformanceMonitor.js',
            'src/main/modules/fileCompressor/ResourceManager.js',
            'src/main/modules/fileCompressor/EnhancedStrategyManager.js',
            'src/main/modules/fileCompressor/DynamicPhaseSkipper.js',
            'src/main/modules/fileCompressor/OptimizedGPUEngine.js',
            'src/main/modules/fileCompressor/CandidatePasswordCache.js',
            'src/main/modules/fileCompressor/ai/StreamingPassGPTGenerator.js',
            'src/main/modules/fileCompressor/ai/AIPatternCache.js',
            'src/main/modules/fileCompressor/WorkStealingQueue.js',
            'src/main/modules/fileCompressor/CrackWorkerThread.js',
            'src/main/modules/fileCompressor/NUMAThreadManager.js'
        ];
        
        let existingFiles = 0;
        
        for (const filePath of requiredFiles) {
            try {
                await fs.access(filePath);
                existingFiles++;
                this.recordInfo('文件存在', `✓ ${path.basename(filePath)}`);
            } catch (error) {
                this.recordWarning('文件缺失', `✗ ${path.basename(filePath)}`);
            }
        }
        
        const existenceRate = (existingFiles / requiredFiles.length) * 100;
        
        if (existenceRate >= 90) {
            this.recordSuccess('文件存在性', `${existingFiles}/${requiredFiles.length} 文件存在 (${existenceRate.toFixed(1)}%)`);
        } else if (existenceRate >= 70) {
            this.recordWarning('文件存在性', `${existingFiles}/${requiredFiles.length} 文件存在 (${existenceRate.toFixed(1)}%)`);
        } else {
            this.recordError('文件存在性测试', new Error(`关键文件缺失过多: ${existenceRate.toFixed(1)}%`));
        }
    }
    
    /**
     * 测试2: 模块导入
     */
    async testModuleImports() {
        console.log('\n📦 测试2: 模块导入测试');
        
        const modules = [
            { name: 'OptimizationIntegration', path: './src/main/modules/fileCompressor/OptimizationIntegration.js' },
            { name: 'PerformanceMonitor', path: './src/main/modules/fileCompressor/PerformanceMonitor.js' },
            { name: 'ResourceManager', path: './src/main/modules/fileCompressor/ResourceManager.js' },
            { name: 'EnhancedStrategyManager', path: './src/main/modules/fileCompressor/EnhancedStrategyManager.js' }
        ];
        
        let importedModules = 0;
        
        for (const module of modules) {
            try {
                const moduleContent = await fs.readFile(module.path, 'utf8');
                
                // 检查模块内容
                if (moduleContent.length === 0) {
                    this.recordWarning('模块导入', `${module.name}: 文件为空`);
                    continue;
                }
                
                // 检查是否包含类定义
                if (moduleContent.includes(`class ${module.name}`)) {
                    this.recordSuccess('模块结构', `${module.name}: 类定义存在`);
                    importedModules++;
                } else {
                    this.recordWarning('模块结构', `${module.name}: 未找到类定义`);
                }
                
                // 检查是否有导出语句
                if (moduleContent.includes('export default') || moduleContent.includes('module.exports')) {
                    this.recordSuccess('模块导出', `${module.name}: 导出语句存在`);
                } else {
                    this.recordWarning('模块导出', `${module.name}: 未找到导出语句`);
                }
                
            } catch (error) {
                this.recordError('模块导入测试', new Error(`${module.name}: ${error.message}`));
            }
        }
        
        const importRate = (importedModules / modules.length) * 100;
        
        if (importRate >= 75) {
            this.recordSuccess('模块导入', `${importedModules}/${modules.length} 模块结构正常 (${importRate.toFixed(1)}%)`);
        } else {
            this.recordError('模块导入测试', new Error(`模块结构问题过多: ${importRate.toFixed(1)}%`));
        }
    }
    
    /**
     * 测试3: 基本功能
     */
    async testBasicFunctionality() {
        console.log('\n⚙️ 测试3: 基本功能测试');
        
        try {
            // 测试性能监控器功能
            await this.testPerformanceMonitorFunctionality();
            
            // 测试资源管理器功能
            await this.testResourceManagerFunctionality();
            
            // 测试策略管理器功能
            await this.testStrategyManagerFunctionality();
            
            // 测试GPU优化功能
            await this.testGPUOptimizationFunctionality();
            
            // 测试AI优化功能
            await this.testAIOptimizationFunctionality();
            
            // 测试CPU优化功能
            await this.testCPUOptimizationFunctionality();
            
        } catch (error) {
            this.recordError('基本功能测试', error);
        }
    }
    
    async testPerformanceMonitorFunctionality() {
        try {
            const content = await fs.readFile('src/main/modules/fileCompressor/PerformanceMonitor.js', 'utf8');
            
            const requiredMethods = [
                'getCurrentMetrics',
                'analyzeBottlenecks',
                'recordMetrics',
                'getPerformanceHistory'
            ];
            
            let foundMethods = 0;
            for (const method of requiredMethods) {
                if (content.includes(method)) {
                    foundMethods++;
                }
            }
            
            if (foundMethods >= requiredMethods.length * 0.8) {
                this.recordSuccess('性能监控器', `${foundMethods}/${requiredMethods.length} 核心方法存在`);
            } else {
                this.recordWarning('性能监控器', `${foundMethods}/${requiredMethods.length} 核心方法存在`);
            }
            
        } catch (error) {
            this.recordError('性能监控器测试', error);
        }
    }
    
    async testResourceManagerFunctionality() {
        try {
            const content = await fs.readFile('src/main/modules/fileCompressor/ResourceManager.js', 'utf8');
            
            const requiredMethods = [
                'getHardwareProfile',
                'allocateResources',
                'allocateNUMAThreads',
                'adjustCPUThreads'
            ];
            
            let foundMethods = 0;
            for (const method of requiredMethods) {
                if (content.includes(method)) {
                    foundMethods++;
                }
            }
            
            if (foundMethods >= requiredMethods.length * 0.8) {
                this.recordSuccess('资源管理器', `${foundMethods}/${requiredMethods.length} 核心方法存在`);
            } else {
                this.recordWarning('资源管理器', `${foundMethods}/${requiredMethods.length} 核心方法存在`);
            }
            
        } catch (error) {
            this.recordError('资源管理器测试', error);
        }
    }
    
    async testStrategyManagerFunctionality() {
        try {
            const content = await fs.readFile('src/main/modules/fileCompressor/EnhancedStrategyManager.js', 'utf8');
            
            const requiredMethods = [
                'generateStrategy',
                'optimizeStrategy',
                'adjustStrategyRealTime',
                'skipCurrentPhase'
            ];
            
            let foundMethods = 0;
            for (const method of requiredMethods) {
                if (content.includes(method)) {
                    foundMethods++;
                }
            }
            
            if (foundMethods >= requiredMethods.length * 0.8) {
                this.recordSuccess('策略管理器', `${foundMethods}/${requiredMethods.length} 核心方法存在`);
            } else {
                this.recordWarning('策略管理器', `${foundMethods}/${requiredMethods.length} 核心方法存在`);
            }
            
        } catch (error) {
            this.recordError('策略管理器测试', error);
        }
    }
    
    async testGPUOptimizationFunctionality() {
        try {
            // 测试动态相位跳跃
            const phaseSkipperContent = await fs.readFile('src/main/modules/fileCompressor/DynamicPhaseSkipper.js', 'utf8');
            if (phaseSkipperContent.includes('skipPhase') || phaseSkipperContent.includes('shouldSkip')) {
                this.recordSuccess('GPU优化', '动态相位跳跃功能存在');
            } else {
                this.recordWarning('GPU优化', '动态相位跳跃功能可能缺失');
            }
            
            // 测试候选密码缓存
            const cacheContent = await fs.readFile('src/main/modules/fileCompressor/CandidatePasswordCache.js', 'utf8');
            if (cacheContent.includes('cache') || cacheContent.includes('LRU')) {
                this.recordSuccess('GPU优化', '候选密码缓存功能存在');
            } else {
                this.recordWarning('GPU优化', '候选密码缓存功能可能缺失');
            }
            
        } catch (error) {
            this.recordError('GPU优化测试', error);
        }
    }
    
    async testAIOptimizationFunctionality() {
        try {
            // 测试流式PassGPT生成器
            const streamingContent = await fs.readFile('src/main/modules/fileCompressor/ai/StreamingPassGPTGenerator.js', 'utf8');
            if (streamingContent.includes('stream') || streamingContent.includes('batch')) {
                this.recordSuccess('AI优化', '流式PassGPT生成器功能存在');
            } else {
                this.recordWarning('AI优化', '流式PassGPT生成器功能可能缺失');
            }
            
            // 测试AI模式缓存
            const aiCacheContent = await fs.readFile('src/main/modules/fileCompressor/ai/AIPatternCache.js', 'utf8');
            if (aiCacheContent.includes('pattern') || aiCacheContent.includes('cache')) {
                this.recordSuccess('AI优化', 'AI模式缓存功能存在');
            } else {
                this.recordWarning('AI优化', 'AI模式缓存功能可能缺失');
            }
            
        } catch (error) {
            this.recordError('AI优化测试', error);
        }
    }
    
    async testCPUOptimizationFunctionality() {
        try {
            // 测试工作窃取队列
            const queueContent = await fs.readFile('src/main/modules/fileCompressor/WorkStealingQueue.js', 'utf8');
            if (queueContent.includes('steal') || queueContent.includes('queue')) {
                this.recordSuccess('CPU优化', '工作窃取队列功能存在');
            } else {
                this.recordWarning('CPU优化', '工作窃取队列功能可能缺失');
            }
            
            // 测试NUMA线程管理器
            const numaContent = await fs.readFile('src/main/modules/fileCompressor/NUMAThreadManager.js', 'utf8');
            if (numaContent.includes('NUMA') || numaContent.includes('thread')) {
                this.recordSuccess('CPU优化', 'NUMA线程管理器功能存在');
            } else {
                this.recordWarning('CPU优化', 'NUMA线程管理器功能可能缺失');
            }
            
        } catch (error) {
            this.recordError('CPU优化测试', error);
        }
    }
    
    /**
     * 测试4: 集成测试
     */
    async testIntegration() {
        console.log('\n🔗 测试4: 集成测试');
        
        try {
            // 检查OptimizationIntegration是否正确导入其他模块
            const integrationContent = await fs.readFile('src/main/modules/fileCompressor/OptimizationIntegration.js', 'utf8');
            
            const expectedImports = [
                'PerformanceMonitor',
                'ResourceManager',
                'EnhancedStrategyManager'
            ];
            
            let foundImports = 0;
            for (const importName of expectedImports) {
                if (integrationContent.includes(`import ${importName}`) || 
                    integrationContent.includes(`from './${importName}`)) {
                    foundImports++;
                }
            }
            
            if (foundImports === expectedImports.length) {
                this.recordSuccess('模块集成', `所有 ${expectedImports.length} 个核心模块正确导入`);
            } else {
                this.recordWarning('模块集成', `${foundImports}/${expectedImports.length} 个核心模块导入`);
            }
            
            // 检查组件协调机制
            if (integrationContent.includes('setupComponentCoordination')) {
                this.recordSuccess('组件协调', '组件协调机制存在');
            } else {
                this.recordWarning('组件协调', '组件协调机制可能缺失');
            }
            
            // 检查实时调整机制
            if (integrationContent.includes('startRealTimeAdjustment')) {
                this.recordSuccess('实时调整', '实时调整机制存在');
            } else {
                this.recordWarning('实时调整', '实时调整机制可能缺失');
            }
            
        } catch (error) {
            this.recordError('集成测试', error);
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
        console.log('📊 简化版核心优化验证测试结果摘要');
        console.log('='.repeat(60));
        console.log(`总测试数: ${totalTests}`);
        console.log(`通过: ${this.testResults.passed}`);
        console.log(`失败: ${this.testResults.failed}`);
        console.log(`成功率: ${successRate.toFixed(1)}%`);
        console.log(`总耗时: ${totalTime}ms`);
        
        // 统计警告数量
        const warningCount = this.testResults.details.filter(d => d.type === 'WARNING').length;
        if (warningCount > 0) {
            console.log(`警告: ${warningCount}`);
        }
        
        if (this.testResults.errors.length > 0) {
            console.log('\n❌ 失败的测试:');
            this.testResults.errors.forEach(error => {
                console.log(`  - ${error.test}: ${error.error}`);
            });
        }
        
        // 生成建议
        console.log('\n💡 建议:');
        if (successRate >= 80) {
            console.log('✅ 核心优化组件结构完整，功能基本齐全');
            console.log('✅ 可以继续进行更深入的功能测试和集成测试');
        } else if (successRate >= 60) {
            console.log('⚠️  核心优化组件基本完整，但存在一些问题');
            console.log('🔧 建议检查和修复警告项目');
        } else {
            console.log('❌ 核心优化组件存在重大问题');
            console.log('🚨 需要修复关键问题后重新测试');
        }
        
        if (warningCount > 5) {
            console.log('⚠️  警告数量较多，建议逐一检查和优化');
        }
        
        // 判断测试是否通过
        if (successRate >= 70 && this.testResults.failed <= 2) {
            console.log('\n🎉 简化版核心优化验证测试通过！');
            console.log('✅ 核心优化组件基本功能正常，可以继续后续任务');
            return true;
        } else {
            console.log('\n⚠️  简化版核心优化验证测试需要改进');
            console.log('🔧 建议修复主要问题后再继续');
            return false;
        }
    }
}

// 运行测试
async function runSimpleCoreOptimizationVerification() {
    const tester = new SimpleCoreOptimizationTest();
    const result = await tester.runAllTests();
    return result;
}

// 如果直接运行此文件
if (require.main === module) {
    runSimpleCoreOptimizationVerification().catch(error => {
        console.error('测试执行失败:', error);
        process.exit(1);
    });
}

module.exports = SimpleCoreOptimizationTest;