/**
 * AI生成性能测试
 * 
 * 测试内容：
 * 1. 流式生成效率测试
 * 2. 去重算法正确性验证
 * 3. 模式缓存性能测试
 * 4. 并行批处理效果测试
 * 5. 内存使用效率测试
 */

import StreamingPassGPTGenerator from './src/main/modules/fileCompressor/ai/StreamingPassGPTGenerator.js';
import AIPatternCache from './src/main/modules/fileCompressor/ai/AIPatternCache.js';

class AIGenerationPerformanceTest {
    constructor() {
        this.results = {
            streamingTests: [],
            deduplicationTests: [],
            cacheTests: [],
            parallelTests: [],
            memoryTests: []
        };
    }
    
    /**
     * 运行所有性能测试
     */
    async runAllTests() {
        console.log('='.repeat(60));
        console.log('AI生成性能测试开始');
        console.log('='.repeat(60));
        
        try {
            // 1. 流式生成效率测试
            console.log('\n1. 流式生成效率测试');
            await this.testStreamingEfficiency();
            
            // 2. 去重算法正确性测试
            console.log('\n2. 去重算法正确性测试');
            await this.testDeduplicationAccuracy();
            
            // 3. 模式缓存性能测试
            console.log('\n3. 模式缓存性能测试');
            await this.testPatternCachePerformance();
            
            // 4. 并行批处理效果测试
            console.log('\n4. 并行批处理效果测试');
            await this.testParallelProcessing();
            
            // 5. 内存使用效率测试
            console.log('\n5. 内存使用效率测试');
            await this.testMemoryEfficiency();
            
            // 生成测试报告
            this.generateReport();
            
        } catch (error) {
            console.error('测试执行失败:', error);
        }
    }
    
    /**
     * 测试流式生成效率
     */
    async testStreamingEfficiency() {
        const testCases = [
            { count: 100, description: '小批量生成' },
            { count: 500, description: '中批量生成' },
            { count: 1000, description: '大批量生成' }
        ];
        
        for (const testCase of testCases) {
            console.log(`  测试: ${testCase.description} (${testCase.count}个密码)`);
            
            const generator = new StreamingPassGPTGenerator({
                batchSize: 50,
                maxConcurrentBatches: 4,
                enableDeduplication: true
            });
            
            const startTime = Date.now();
            const startMemory = process.memoryUsage();
            
            let generatedCount = 0;
            const passwords = [];
            
            try {
                // 使用流式生成
                for await (const password of generator.generatePasswordStream(testCase.count)) {
                    passwords.push(password);
                    generatedCount++;
                }
                
                const endTime = Date.now();
                const endMemory = process.memoryUsage();
                
                const duration = endTime - startTime;
                const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
                const passwordsPerSecond = (generatedCount / duration) * 1000;
                
                const result = {
                    testCase: testCase.description,
                    requestedCount: testCase.count,
                    generatedCount,
                    duration,
                    passwordsPerSecond: Math.round(passwordsPerSecond),
                    memoryUsed: Math.round(memoryDelta / 1024 / 1024 * 100) / 100, // MB
                    efficiency: generatedCount / testCase.count
                };
                
                this.results.streamingTests.push(result);
                
                console.log(`    ✅ 生成: ${generatedCount}/${testCase.count}`);
                console.log(`    ⏱️  耗时: ${duration}ms`);
                console.log(`    🚀 速度: ${result.passwordsPerSecond} passwords/sec`);
                console.log(`    💾 内存: ${result.memoryUsed}MB`);
                console.log(`    📊 效率: ${(result.efficiency * 100).toFixed(1)}%`);
                
            } catch (error) {
                console.log(`    ❌ 测试失败: ${error.message}`);
                this.results.streamingTests.push({
                    testCase: testCase.description,
                    error: error.message,
                    success: false
                });
            }
            
            // 清理资源
            generator.cleanup();
            
            // 等待垃圾回收
            if (global.gc) {
                global.gc();
            }
            await this.sleep(1000);
        }
    }
    
    /**
     * 测试去重算法正确性
     */
    async testDeduplicationAccuracy() {
        console.log('  测试去重算法的准确性和效率');
        
        const generator = new StreamingPassGPTGenerator({
            batchSize: 100,
            enableDeduplication: true,
            deduplicationMethod: 'realtime'
        });
        
        // 生成测试数据（包含重复项）
        const testPasswords = [
            'password123', 'admin123', 'test123', 'password123', // 重复
            'user123', 'demo123', 'admin123', 'guest123',       // 重复
            'hello123', 'world123', 'test123', 'love123'        // 重复
        ];
        
        const startTime = Date.now();
        
        // 测试实时去重
        const deduplicatedPasswords = generator.deduplicatePasswords(testPasswords);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // 验证结果
        const originalCount = testPasswords.length;
        const deduplicatedCount = deduplicatedPasswords.length;
        const expectedUniqueCount = new Set(testPasswords).size;
        
        const isCorrect = deduplicatedCount === expectedUniqueCount;
        const deduplicationRate = (originalCount - deduplicatedCount) / originalCount;
        
        const result = {
            originalCount,
            deduplicatedCount,
            expectedCount: expectedUniqueCount,
            isCorrect,
            deduplicationRate,
            duration,
            efficiency: isCorrect ? 1.0 : 0.0
        };
        
        this.results.deduplicationTests.push(result);
        
        console.log(`    📝 原始数量: ${originalCount}`);
        console.log(`    🔄 去重后数量: ${deduplicatedCount}`);
        console.log(`    ✅ 预期数量: ${expectedUniqueCount}`);
        console.log(`    ${isCorrect ? '✅' : '❌'} 正确性: ${isCorrect ? '通过' : '失败'}`);
        console.log(`    📉 去重率: ${(deduplicationRate * 100).toFixed(1)}%`);
        console.log(`    ⏱️  耗时: ${duration}ms`);
        
        // 测试大规模去重性能
        console.log('\n  测试大规模去重性能');
        await this.testLargeScaleDeduplication();
        
        generator.cleanup();
    }
    
    /**
     * 测试大规模去重性能
     */
    async testLargeScaleDeduplication() {
        const generator = new StreamingPassGPTGenerator({
            enableDeduplication: true
        });
        
        // 生成大量测试数据（30%重复率）
        const testSize = 10000;
        const duplicateRate = 0.3;
        const uniquePasswords = [];
        
        // 生成唯一密码
        for (let i = 0; i < testSize * (1 - duplicateRate); i++) {
            uniquePasswords.push(`password${i}_${Math.random().toString(36).substring(7)}`);
        }
        
        // 添加重复密码
        const testPasswords = [...uniquePasswords];
        const duplicateCount = Math.floor(testSize * duplicateRate);
        
        for (let i = 0; i < duplicateCount; i++) {
            const randomIndex = Math.floor(Math.random() * uniquePasswords.length);
            testPasswords.push(uniquePasswords[randomIndex]);
        }
        
        // 打乱顺序
        for (let i = testPasswords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [testPasswords[i], testPasswords[j]] = [testPasswords[j], testPasswords[i]];
        }
        
        const startTime = Date.now();
        const startMemory = process.memoryUsage();
        
        const deduplicatedPasswords = generator.deduplicatePasswords(testPasswords);
        
        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        
        const duration = endTime - startTime;
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
        const throughput = (testPasswords.length / duration) * 1000;
        
        const result = {
            testSize,
            originalCount: testPasswords.length,
            deduplicatedCount: deduplicatedPasswords.length,
            expectedUniqueCount: uniquePasswords.length,
            duration,
            throughput: Math.round(throughput),
            memoryUsed: Math.round(memoryDelta / 1024 / 1024 * 100) / 100,
            accuracy: deduplicatedPasswords.length === uniquePasswords.length ? 1.0 : 0.0
        };
        
        this.results.deduplicationTests.push(result);
        
        console.log(`    📊 测试规模: ${testSize} 密码`);
        console.log(`    🔄 去重前: ${result.originalCount}`);
        console.log(`    ✅ 去重后: ${result.deduplicatedCount}`);
        console.log(`    🎯 预期: ${result.expectedUniqueCount}`);
        console.log(`    ⏱️  耗时: ${duration}ms`);
        console.log(`    🚀 吞吐量: ${result.throughput} passwords/sec`);
        console.log(`    💾 内存: ${result.memoryUsed}MB`);
        console.log(`    ${result.accuracy === 1.0 ? '✅' : '❌'} 准确性: ${(result.accuracy * 100).toFixed(1)}%`);
        
        generator.cleanup();
    }
    
    /**
     * 测试模式缓存性能
     */
    async testPatternCachePerformance() {
        const cache = new AIPatternCache({
            maxPatterns: 1000,
            enableSemanticAnalysis: true,
            enableContextLearning: true
        });
        
        // 测试模式学习性能
        console.log('  测试模式学习性能');
        await this.testPatternLearning(cache);
        
        // 测试模式匹配性能
        console.log('\n  测试模式匹配性能');
        await this.testPatternMatching(cache);
        
        // 测试密码生成性能
        console.log('\n  测试基于模式的密码生成性能');
        await this.testPatternBasedGeneration(cache);
        
        cache.cleanup();
    }
    
    /**
     * 测试模式学习性能
     */
    async testPatternLearning(cache) {
        const testPasswords = [
            'admin123', 'password2024', 'user456', 'test789',
            'hello@world', 'love123!', 'qwerty2024', 'abc123def',
            'mypassword1', 'secret2024', 'demo123', 'guest456'
        ];
        
        const contexts = testPasswords.map((pwd, index) => ({
            fileName: `file${index}.zip`,
            fileSize: Math.random() * 1000000,
            fileType: 'zip'
        }));
        
        const startTime = Date.now();
        let totalPatterns = 0;
        
        for (let i = 0; i < testPasswords.length; i++) {
            const patternsLearned = await cache.learnFromSuccess(testPasswords[i], contexts[i]);
            totalPatterns += patternsLearned;
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        const learningRate = (testPasswords.length / duration) * 1000;
        
        const stats = cache.getPatternStatistics();
        
        const result = {
            passwordsLearned: testPasswords.length,
            totalPatterns,
            duration,
            learningRate: Math.round(learningRate),
            cacheSize: stats.totalPatterns,
            memoryUsage: stats.memoryUsage
        };
        
        this.results.cacheTests.push({
            type: 'learning',
            ...result
        });
        
        console.log(`    📚 学习密码: ${result.passwordsLearned}`);
        console.log(`    🧠 提取模式: ${totalPatterns}`);
        console.log(`    💾 缓存大小: ${stats.totalPatterns}`);
        console.log(`    ⏱️  耗时: ${duration}ms`);
        console.log(`    🚀 学习速度: ${result.learningRate} passwords/sec`);
        console.log(`    💾 内存使用: ${(stats.memoryUsage / 1024).toFixed(1)}KB`);
    }
    
    /**
     * 测试模式匹配性能
     */
    async testPatternMatching(cache) {
        const testContexts = [
            { fileName: 'admin.zip', fileSize: 1024000, fileType: 'zip' },
            { fileName: 'backup2024.zip', fileSize: 5000000, fileType: 'zip' },
            { fileName: 'user_data.zip', fileSize: 500000, fileType: 'zip' },
            { fileName: 'test123.zip', fileSize: 2000000, fileType: 'zip' }
        ];
        
        const startTime = Date.now();
        let totalMatches = 0;
        
        for (const context of testContexts) {
            const matches = await cache.findMatchingPatterns(context);
            totalMatches += matches.length;
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        const matchingRate = (testContexts.length / duration) * 1000;
        
        const result = {
            contextsMatched: testContexts.length,
            totalMatches,
            averageMatches: Math.round(totalMatches / testContexts.length),
            duration,
            matchingRate: Math.round(matchingRate)
        };
        
        this.results.cacheTests.push({
            type: 'matching',
            ...result
        });
        
        console.log(`    🔍 匹配上下文: ${result.contextsMatched}`);
        console.log(`    🎯 找到匹配: ${totalMatches}`);
        console.log(`    📊 平均匹配: ${result.averageMatches}`);
        console.log(`    ⏱️  耗时: ${duration}ms`);
        console.log(`    🚀 匹配速度: ${result.matchingRate} contexts/sec`);
    }
    
    /**
     * 测试基于模式的密码生成性能
     */
    async testPatternBasedGeneration(cache) {
        // 先学习一些模式
        const learningPasswords = [
            'admin2024', 'password123', 'user456', 'test789',
            'backup2024', 'secret123', 'demo456', 'guest789'
        ];
        
        for (const pwd of learningPasswords) {
            await cache.learnFromSuccess(pwd, { fileName: 'test.zip' });
        }
        
        // 测试生成性能
        const testContext = { fileName: 'newfile.zip', fileSize: 1000000 };
        const matches = await cache.findMatchingPatterns(testContext);
        
        if (matches.length === 0) {
            console.log('    ⚠️  没有找到匹配的模式，跳过生成测试');
            return;
        }
        
        const startTime = Date.now();
        const variants = await cache.generatePasswordVariants(matches.slice(0, 5), testContext);
        const endTime = Date.now();
        
        const duration = endTime - startTime;
        const generationRate = (variants.length / duration) * 1000;
        
        const result = {
            inputPatterns: Math.min(5, matches.length),
            generatedVariants: variants.length,
            duration,
            generationRate: Math.round(generationRate)
        };
        
        this.results.cacheTests.push({
            type: 'generation',
            ...result
        });
        
        console.log(`    🧠 输入模式: ${result.inputPatterns}`);
        console.log(`    🔄 生成变体: ${result.generatedVariants}`);
        console.log(`    ⏱️  耗时: ${duration}ms`);
        console.log(`    🚀 生成速度: ${result.generationRate} variants/sec`);
        
        // 显示一些生成的变体示例
        if (variants.length > 0) {
            console.log(`    📝 示例变体: ${variants.slice(0, 5).join(', ')}`);
        }
    }
    
    /**
     * 测试并行批处理效果
     */
    async testParallelProcessing() {
        const testCases = [
            { batchSize: 50, concurrency: 1, description: '单线程处理' },
            { batchSize: 50, concurrency: 2, description: '双线程处理' },
            { batchSize: 50, concurrency: 4, description: '四线程处理' }
        ];
        
        const totalPasswords = 500;
        
        for (const testCase of testCases) {
            console.log(`  测试: ${testCase.description}`);
            
            const generator = new StreamingPassGPTGenerator({
                batchSize: testCase.batchSize,
                maxConcurrentBatches: testCase.concurrency,
                enableDeduplication: true
            });
            
            const startTime = Date.now();
            
            let generatedCount = 0;
            const passwords = [];
            
            try {
                for await (const password of generator.generatePasswordStream(totalPasswords)) {
                    passwords.push(password);
                    generatedCount++;
                }
                
                const endTime = Date.now();
                const duration = endTime - startTime;
                const throughput = (generatedCount / duration) * 1000;
                
                const result = {
                    testCase: testCase.description,
                    batchSize: testCase.batchSize,
                    concurrency: testCase.concurrency,
                    generatedCount,
                    duration,
                    throughput: Math.round(throughput)
                };
                
                this.results.parallelTests.push(result);
                
                console.log(`    ✅ 生成数量: ${generatedCount}`);
                console.log(`    ⏱️  耗时: ${duration}ms`);
                console.log(`    🚀 吞吐量: ${result.throughput} passwords/sec`);
                
            } catch (error) {
                console.log(`    ❌ 测试失败: ${error.message}`);
                this.results.parallelTests.push({
                    testCase: testCase.description,
                    error: error.message,
                    success: false
                });
            }
            
            generator.cleanup();
            await this.sleep(1000);
        }
        
        // 分析并行效果
        this.analyzeParallelEfficiency();
    }
    
    /**
     * 分析并行处理效率
     */
    analyzeParallelEfficiency() {
        const successfulTests = this.results.parallelTests.filter(t => !t.error);
        
        if (successfulTests.length < 2) {
            console.log('    ⚠️  测试数据不足，无法分析并行效率');
            return;
        }
        
        console.log('\n  并行效率分析:');
        
        const baseline = successfulTests.find(t => t.concurrency === 1);
        if (!baseline) {
            console.log('    ⚠️  缺少单线程基准测试');
            return;
        }
        
        for (const test of successfulTests) {
            if (test.concurrency === 1) continue;
            
            const speedup = test.throughput / baseline.throughput;
            const efficiency = speedup / test.concurrency;
            
            console.log(`    ${test.concurrency}线程: 加速比 ${speedup.toFixed(2)}x, 效率 ${(efficiency * 100).toFixed(1)}%`);
        }
    }
    
    /**
     * 测试内存使用效率
     */
    async testMemoryEfficiency() {
        console.log('  测试内存使用效率和垃圾回收');
        
        const testSizes = [1000, 5000, 10000];
        
        for (const size of testSizes) {
            console.log(`    测试规模: ${size} 密码`);
            
            // 强制垃圾回收
            if (global.gc) {
                global.gc();
            }
            
            const initialMemory = process.memoryUsage();
            
            const generator = new StreamingPassGPTGenerator({
                batchSize: 100,
                maxConcurrentBatches: 2,
                enableDeduplication: true
            });
            
            const cache = new AIPatternCache({
                maxPatterns: 1000
            });
            
            const startTime = Date.now();
            
            // 生成密码并学习模式
            let generatedCount = 0;
            for await (const password of generator.generatePasswordStream(size)) {
                await cache.learnFromSuccess(password, { fileName: 'test.zip' });
                generatedCount++;
                
                // 每1000个密码检查一次内存
                if (generatedCount % 1000 === 0) {
                    const currentMemory = process.memoryUsage();
                    const memoryDelta = currentMemory.heapUsed - initialMemory.heapUsed;
                    console.log(`      ${generatedCount}: +${Math.round(memoryDelta / 1024 / 1024)}MB`);
                }
            }
            
            const endTime = Date.now();
            const finalMemory = process.memoryUsage();
            
            const duration = endTime - startTime;
            const memoryDelta = finalMemory.heapUsed - initialMemory.heapUsed;
            const memoryPerPassword = memoryDelta / generatedCount;
            
            const result = {
                testSize: size,
                generatedCount,
                duration,
                memoryUsed: Math.round(memoryDelta / 1024 / 1024 * 100) / 100,
                memoryPerPassword: Math.round(memoryPerPassword),
                cacheStats: cache.getPatternStatistics()
            };
            
            this.results.memoryTests.push(result);
            
            console.log(`      ✅ 完成: ${generatedCount} 密码`);
            console.log(`      ⏱️  耗时: ${duration}ms`);
            console.log(`      💾 内存增长: ${result.memoryUsed}MB`);
            console.log(`      📊 每密码内存: ${result.memoryPerPassword} bytes`);
            console.log(`      🧠 缓存模式: ${result.cacheStats.totalPatterns}`);
            
            // 清理资源
            generator.cleanup();
            cache.cleanup();
            
            // 强制垃圾回收
            if (global.gc) {
                global.gc();
            }
            
            await this.sleep(2000);
        }
    }
    
    /**
     * 生成测试报告
     */
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('AI生成性能测试报告');
        console.log('='.repeat(60));
        
        // 流式生成测试总结
        console.log('\n📊 流式生成测试总结:');
        const streamingTests = this.results.streamingTests.filter(t => !t.error);
        if (streamingTests.length > 0) {
            const avgSpeed = streamingTests.reduce((sum, t) => sum + t.passwordsPerSecond, 0) / streamingTests.length;
            const avgEfficiency = streamingTests.reduce((sum, t) => sum + t.efficiency, 0) / streamingTests.length;
            
            console.log(`  平均生成速度: ${Math.round(avgSpeed)} passwords/sec`);
            console.log(`  平均生成效率: ${(avgEfficiency * 100).toFixed(1)}%`);
            console.log(`  最高生成速度: ${Math.max(...streamingTests.map(t => t.passwordsPerSecond))} passwords/sec`);
        }
        
        // 去重测试总结
        console.log('\n🔄 去重测试总结:');
        const deduplicationTests = this.results.deduplicationTests;
        if (deduplicationTests.length > 0) {
            const accurateTests = deduplicationTests.filter(t => t.isCorrect || t.accuracy === 1.0);
            console.log(`  去重准确性: ${accurateTests.length}/${deduplicationTests.length} 通过`);
            
            const largeScaleTest = deduplicationTests.find(t => t.testSize);
            if (largeScaleTest) {
                console.log(`  大规模去重吞吐量: ${largeScaleTest.throughput} passwords/sec`);
                console.log(`  大规模去重准确性: ${(largeScaleTest.accuracy * 100).toFixed(1)}%`);
            }
        }
        
        // 模式缓存测试总结
        console.log('\n🧠 模式缓存测试总结:');
        const cacheTests = this.results.cacheTests;
        const learningTest = cacheTests.find(t => t.type === 'learning');
        const matchingTest = cacheTests.find(t => t.type === 'matching');
        const generationTest = cacheTests.find(t => t.type === 'generation');
        
        if (learningTest) {
            console.log(`  模式学习速度: ${learningTest.learningRate} passwords/sec`);
            console.log(`  模式提取效率: ${(learningTest.totalPatterns / learningTest.passwordsLearned).toFixed(1)} patterns/password`);
        }
        
        if (matchingTest) {
            console.log(`  模式匹配速度: ${matchingTest.matchingRate} contexts/sec`);
            console.log(`  平均匹配数量: ${matchingTest.averageMatches} patterns/context`);
        }
        
        if (generationTest) {
            console.log(`  变体生成速度: ${generationTest.generationRate} variants/sec`);
            console.log(`  生成效率: ${(generationTest.generatedVariants / generationTest.inputPatterns).toFixed(1)} variants/pattern`);
        }
        
        // 并行处理测试总结
        console.log('\n⚡ 并行处理测试总结:');
        const parallelTests = this.results.parallelTests.filter(t => !t.error);
        if (parallelTests.length > 0) {
            const baseline = parallelTests.find(t => t.concurrency === 1);
            const maxConcurrency = parallelTests.find(t => t.concurrency === Math.max(...parallelTests.map(p => p.concurrency)));
            
            if (baseline && maxConcurrency && maxConcurrency.concurrency > 1) {
                const maxSpeedup = maxConcurrency.throughput / baseline.throughput;
                const maxEfficiency = maxSpeedup / maxConcurrency.concurrency;
                
                console.log(`  最大加速比: ${maxSpeedup.toFixed(2)}x (${maxConcurrency.concurrency}线程)`);
                console.log(`  最大并行效率: ${(maxEfficiency * 100).toFixed(1)}%`);
            }
        }
        
        // 内存效率测试总结
        console.log('\n💾 内存效率测试总结:');
        const memoryTests = this.results.memoryTests;
        if (memoryTests.length > 0) {
            const avgMemoryPerPassword = memoryTests.reduce((sum, t) => sum + t.memoryPerPassword, 0) / memoryTests.length;
            const maxMemoryUsage = Math.max(...memoryTests.map(t => t.memoryUsed));
            
            console.log(`  平均内存使用: ${Math.round(avgMemoryPerPassword)} bytes/password`);
            console.log(`  最大内存使用: ${maxMemoryUsage}MB`);
            
            const largestTest = memoryTests.find(t => t.testSize === Math.max(...memoryTests.map(m => m.testSize)));
            if (largestTest) {
                console.log(`  大规模测试(${largestTest.testSize}): ${largestTest.memoryUsed}MB, ${largestTest.cacheStats.totalPatterns} patterns`);
            }
        }
        
        // 性能评级
        console.log('\n🏆 性能评级:');
        const overallScore = this.calculateOverallScore();
        console.log(`  综合评分: ${overallScore.score}/100`);
        console.log(`  性能等级: ${overallScore.grade}`);
        console.log(`  评价: ${overallScore.comment}`);
        
        console.log('\n✅ AI生成性能测试完成');
    }
    
    /**
     * 计算综合评分
     */
    calculateOverallScore() {
        let totalScore = 0;
        let maxScore = 0;
        
        // 流式生成评分 (25分)
        const streamingTests = this.results.streamingTests.filter(t => !t.error);
        if (streamingTests.length > 0) {
            const avgSpeed = streamingTests.reduce((sum, t) => sum + t.passwordsPerSecond, 0) / streamingTests.length;
            const avgEfficiency = streamingTests.reduce((sum, t) => sum + t.efficiency, 0) / streamingTests.length;
            
            const speedScore = Math.min(25, (avgSpeed / 100) * 15); // 100 passwords/sec = 15分
            const efficiencyScore = avgEfficiency * 10; // 100% efficiency = 10分
            
            totalScore += speedScore + efficiencyScore;
        }
        maxScore += 25;
        
        // 去重准确性评分 (20分)
        const deduplicationTests = this.results.deduplicationTests;
        if (deduplicationTests.length > 0) {
            const accurateTests = deduplicationTests.filter(t => t.isCorrect || t.accuracy === 1.0);
            const accuracyScore = (accurateTests.length / deduplicationTests.length) * 20;
            totalScore += accuracyScore;
        }
        maxScore += 20;
        
        // 模式缓存评分 (25分)
        const cacheTests = this.results.cacheTests;
        if (cacheTests.length > 0) {
            const learningTest = cacheTests.find(t => t.type === 'learning');
            const matchingTest = cacheTests.find(t => t.type === 'matching');
            const generationTest = cacheTests.find(t => t.type === 'generation');
            
            let cacheScore = 0;
            if (learningTest) cacheScore += Math.min(8, learningTest.learningRate / 10); // 100 passwords/sec = 8分
            if (matchingTest) cacheScore += Math.min(8, matchingTest.matchingRate / 5); // 50 contexts/sec = 8分
            if (generationTest) cacheScore += Math.min(9, generationTest.generationRate / 10); // 100 variants/sec = 9分
            
            totalScore += cacheScore;
        }
        maxScore += 25;
        
        // 并行效率评分 (15分)
        const parallelTests = this.results.parallelTests.filter(t => !t.error);
        if (parallelTests.length > 1) {
            const baseline = parallelTests.find(t => t.concurrency === 1);
            const maxConcurrency = parallelTests.find(t => t.concurrency === Math.max(...parallelTests.map(p => p.concurrency)));
            
            if (baseline && maxConcurrency && maxConcurrency.concurrency > 1) {
                const speedup = maxConcurrency.throughput / baseline.throughput;
                const efficiency = speedup / maxConcurrency.concurrency;
                const parallelScore = efficiency * 15; // 100% efficiency = 15分
                totalScore += parallelScore;
            }
        }
        maxScore += 15;
        
        // 内存效率评分 (15分)
        const memoryTests = this.results.memoryTests;
        if (memoryTests.length > 0) {
            const avgMemoryPerPassword = memoryTests.reduce((sum, t) => sum + t.memoryPerPassword, 0) / memoryTests.length;
            // 内存使用越少分数越高，500 bytes/password = 15分，1000 bytes/password = 7.5分
            const memoryScore = Math.max(0, 15 - (avgMemoryPerPassword / 500) * 15);
            totalScore += memoryScore;
        }
        maxScore += 15;
        
        const finalScore = Math.round((totalScore / maxScore) * 100);
        
        let grade, comment;
        if (finalScore >= 90) {
            grade = 'A+';
            comment = '优秀 - AI生成性能表现卓越';
        } else if (finalScore >= 80) {
            grade = 'A';
            comment = '良好 - AI生成性能表现良好';
        } else if (finalScore >= 70) {
            grade = 'B';
            comment = '中等 - AI生成性能基本满足要求';
        } else if (finalScore >= 60) {
            grade = 'C';
            comment = '及格 - AI生成性能需要优化';
        } else {
            grade = 'D';
            comment = '不及格 - AI生成性能存在严重问题';
        }
        
        return { score: finalScore, grade, comment };
    }
    
    /**
     * 辅助方法：等待
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 运行测试
async function runTests() {
    const tester = new AIGenerationPerformanceTest();
    await tester.runAllTests();
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}

export default AIGenerationPerformanceTest;