/**
 * CPU优化集成测试
 * 
 * 测试内容：
 * 1. 多核负载均衡测试
 * 2. NUMA优化效果验证
 * 3. 工作窃取队列性能测试
 * 4. 动态线程调整测试
 * 5. 内存亲和性验证
 * 6. 跨节点通信优化测试
 */

import WorkStealingQueue from './src/main/modules/fileCompressor/WorkStealingQueue.js';
import CrackWorkerThread from './src/main/modules/fileCompressor/CrackWorkerThread.js';
import NUMAThreadManager from './src/main/modules/fileCompressor/NUMAThreadManager.js';
import os from 'os';
import { Worker } from 'worker_threads';

class CPUOptimizationIntegrationTest {
    constructor() {
        this.results = {
            loadBalancingTests: [],
            numaTests: [],
            workStealingTests: [],
            threadAdjustmentTests: [],
            memoryAffinityTests: [],
            communicationTests: []
        };
        
        this.systemInfo = {
            cpuCount: os.cpus().length,
            totalMemory: os.totalmem(),
            platform: os.platform(),
            arch: os.arch()
        };
    }
    
    /**
     * 运行所有CPU优化集成测试
     */
    async runAllTests() {
        console.log('='.repeat(60));
        console.log('CPU优化集成测试开始');
        console.log('='.repeat(60));
        
        console.log(`系统信息:`);
        console.log(`  CPU核心数: ${this.systemInfo.cpuCount}`);
        console.log(`  总内存: ${Math.round(this.systemInfo.totalMemory / 1024 / 1024 / 1024)}GB`);
        console.log(`  平台: ${this.systemInfo.platform}`);
        console.log(`  架构: ${this.systemInfo.arch}`);
        
        try {
            // 1. 多核负载均衡测试
            console.log('\n1. 多核负载均衡测试');
            await this.testLoadBalancing();
            
            // 2. NUMA优化效果验证
            console.log('\n2. NUMA优化效果验证');
            await this.testNUMAOptimization();
            
            // 3. 工作窃取队列性能测试
            console.log('\n3. 工作窃取队列性能测试');
            await this.testWorkStealingPerformance();
            
            // 4. 动态线程调整测试
            console.log('\n4. 动态线程调整测试');
            await this.testDynamicThreadAdjustment();
            
            // 5. 内存亲和性验证
            console.log('\n5. 内存亲和性验证');
            await this.testMemoryAffinity();
            
            // 6. 跨节点通信优化测试
            console.log('\n6. 跨节点通信优化测试');
            await this.testCrossNodeCommunication();
            
            // 生成测试报告
            this.generateReport();
            
        } catch (error) {
            console.error('测试执行失败:', error);
        }
    }
    
    /**
     * 测试多核负载均衡
     */
    async testLoadBalancing() {
        const testCases = [
            { workers: 2, tasks: 1000, description: '双核负载均衡' },
            { workers: 4, tasks: 2000, description: '四核负载均衡' },
            { workers: Math.min(8, this.systemInfo.cpuCount), tasks: 4000, description: '多核负载均衡' }
        ];
        
        for (const testCase of testCases) {
            if (testCase.workers > this.systemInfo.cpuCount) {
                console.log(`  跳过测试: ${testCase.description} (系统核心数不足)`);
                continue;
            }
            
            console.log(`  测试: ${testCase.description} (${testCase.workers}个工作线程, ${testCase.tasks}个任务)`);
            
            const queue = new WorkStealingQueue();
            const workers = [];
            const workerStats = [];
            
            // 创建工作线程
            for (let i = 0; i < testCase.workers; i++) {
                const worker = new CrackWorkerThread({
                    workerId: i,
                    queue: queue,
                    enableLoadBalancing: true
                });
                workers.push(worker);
                workerStats.push({ id: i, tasksProcessed: 0, totalTime: 0 });
            }
            
            // 生成测试任务
            const tasks = [];
            for (let i = 0; i < testCase.tasks; i++) {
                tasks.push({
                    id: i,
                    type: 'password_test',
                    data: `password${i}`,
                    complexity: Math.random() * 100 // 模拟不同复杂度
                });
            }
            
            const startTime = Date.now();
            
            try {
                // 启动所有工作线程
                const workerPromises = workers.map(worker => worker.start());
                
                // 添加任务到队列
                for (const task of tasks) {
                    queue.addTask(task);
                }
                
                // 等待所有任务完成
                await queue.waitForCompletion();
                
                // 停止工作线程
                for (const worker of workers) {
                    worker.stop();
                }
                
                await Promise.all(workerPromises);
                
                const endTime = Date.now();
                const totalTime = endTime - startTime;
                
                // 收集统计信息
                for (let i = 0; i < workers.length; i++) {
                    const stats = workers[i].getStatistics();
                    workerStats[i].tasksProcessed = stats.tasksProcessed;
                    workerStats[i].totalTime = stats.totalTime;
                }
                
                // 计算负载均衡指标
                const tasksPerWorker = workerStats.map(s => s.tasksProcessed);
                const avgTasks = tasksPerWorker.reduce((sum, count) => sum + count, 0) / tasksPerWorker.length;
                const maxTasks = Math.max(...tasksPerWorker);
                const minTasks = Math.min(...tasksPerWorker);
                const loadBalanceRatio = minTasks / maxTasks; // 越接近1越均衡
                const throughput = testCase.tasks / (totalTime / 1000);
                
                const result = {
                    testCase: testCase.description,
                    workers: testCase.workers,
                    totalTasks: testCase.tasks,
                    totalTime,
                    throughput: Math.round(throughput),
                    avgTasksPerWorker: Math.round(avgTasks),
                    maxTasks,
                    minTasks,
                    loadBalanceRatio: Math.round(loadBalanceRatio * 100) / 100,
                    workerStats: [...workerStats]
                };
                
                this.results.loadBalancingTests.push(result);
                
                console.log(`    ✅ 完成任务: ${testCase.tasks}`);
                console.log(`    ⏱️  总耗时: ${totalTime}ms`);
                console.log(`    🚀 吞吐量: ${result.throughput} tasks/sec`);
                console.log(`    ⚖️  负载均衡比: ${result.loadBalanceRatio} (${result.loadBalanceRatio >= 0.8 ? '良好' : '需优化'})`);
                console.log(`    📊 任务分布: 最大${maxTasks}, 最小${minTasks}, 平均${result.avgTasksPerWorker}`);
                
            } catch (error) {
                console.log(`    ❌ 测试失败: ${error.message}`);
                this.results.loadBalancingTests.push({
                    testCase: testCase.description,
                    error: error.message,
                    success: false
                });
            }
            
            // 清理资源
            for (const worker of workers) {
                worker.cleanup();
            }
            queue.cleanup();
            
            await this.sleep(1000);
        }
    }
    
    /**
     * 测试NUMA优化效果
     */
    async testNUMAOptimization() {
        console.log('  检测NUMA拓扑结构');
        
        const numaManager = new NUMAThreadManager();
        
        try {
            // 检测NUMA拓扑
            const topology = await numaManager.detectTopology();
            
            console.log(`    NUMA节点数: ${topology.nodeCount}`);
            console.log(`    每节点CPU数: ${topology.cpusPerNode}`);
            console.log(`    内存分布: ${topology.memoryDistribution ? '支持' : '不支持'}`);
            
            if (topology.nodeCount <= 1) {
                console.log('    ⚠️  系统不支持NUMA或只有单节点，跳过NUMA优化测试');
                this.results.numaTests.push({
                    testCase: 'NUMA检测',
                    nodeCount: topology.nodeCount,
                    supported: false,
                    reason: '单节点系统'
                });
                return;
            }
            
            // 测试NUMA感知线程分配
            console.log('\n  测试NUMA感知线程分配');
            await this.testNUMAThreadAllocation(numaManager, topology);
            
            // 测试内存亲和性
            console.log('\n  测试内存亲和性优化');
            await this.testNUMAMemoryAffinity(numaManager, topology);
            
        } catch (error) {
            console.log(`    ❌ NUMA测试失败: ${error.message}`);
            this.results.numaTests.push({
                testCase: 'NUMA优化',
                error: error.message,
                success: false
            });
        } finally {
            numaManager.cleanup();
        }
    }
    
    /**
     * 测试NUMA线程分配
     */
    async testNUMAThreadAllocation(numaManager, topology) {
        const threadCounts = [4, 8, Math.min(16, this.systemInfo.cpuCount)];
        
        for (const threadCount of threadCounts) {
            if (threadCount > this.systemInfo.cpuCount) continue;
            
            console.log(`    测试${threadCount}线程NUMA分配`);
            
            const startTime = Date.now();
            
            // 分配线程到NUMA节点
            const allocation = await numaManager.allocateThreads(threadCount, {
                strategy: 'balanced',
                enableAffinity: true
            });
            
            const endTime = Date.now();
            const allocationTime = endTime - startTime;
            
            // 验证分配结果
            const nodeDistribution = {};
            for (const thread of allocation.threads) {
                const nodeId = thread.numaNode;
                nodeDistribution[nodeId] = (nodeDistribution[nodeId] || 0) + 1;
            }
            
            // 计算分配均衡性
            const nodeCounts = Object.values(nodeDistribution);
            const avgThreadsPerNode = nodeCounts.reduce((sum, count) => sum + count, 0) / nodeCounts.length;
            const maxThreadsPerNode = Math.max(...nodeCounts);
            const minThreadsPerNode = Math.min(...nodeCounts);
            const balanceRatio = minThreadsPerNode / maxThreadsPerNode;
            
            const result = {
                threadCount,
                allocationTime,
                nodeDistribution,
                balanceRatio: Math.round(balanceRatio * 100) / 100,
                memoryAffinity: allocation.memoryAffinity,
                success: true
            };
            
            this.results.numaTests.push(result);
            
            console.log(`      ✅ 分配完成: ${allocationTime}ms`);
            console.log(`      📊 节点分布: ${JSON.stringify(nodeDistribution)}`);
            console.log(`      ⚖️  均衡比: ${result.balanceRatio}`);
            console.log(`      💾 内存亲和性: ${allocation.memoryAffinity ? '启用' : '禁用'}`);
        }
    }
    
    /**
     * 测试NUMA内存亲和性
     */
    async testNUMAMemoryAffinity(numaManager, topology) {
        const testSizes = [1024 * 1024, 10 * 1024 * 1024, 100 * 1024 * 1024]; // 1MB, 10MB, 100MB
        
        for (const size of testSizes) {
            console.log(`    测试${Math.round(size / 1024 / 1024)}MB内存亲和性`);
            
            const startTime = Date.now();
            
            try {
                // 测试本地内存访问
                const localResult = await numaManager.testMemoryAccess({
                    size: size,
                    accessPattern: 'sequential',
                    useLocalMemory: true
                });
                
                // 测试远程内存访问
                const remoteResult = await numaManager.testMemoryAccess({
                    size: size,
                    accessPattern: 'sequential',
                    useLocalMemory: false
                });
                
                const endTime = Date.now();
                const testTime = endTime - startTime;
                
                const speedupRatio = remoteResult.accessTime / localResult.accessTime;
                
                const result = {
                    memorySize: size,
                    testTime,
                    localAccessTime: localResult.accessTime,
                    remoteAccessTime: remoteResult.accessTime,
                    speedupRatio: Math.round(speedupRatio * 100) / 100,
                    bandwidth: {
                        local: Math.round(size / localResult.accessTime * 1000 / 1024 / 1024), // MB/s
                        remote: Math.round(size / remoteResult.accessTime * 1000 / 1024 / 1024)
                    }
                };
                
                this.results.memoryAffinityTests.push(result);
                
                console.log(`      ✅ 测试完成: ${testTime}ms`);
                console.log(`      🏠 本地访问: ${localResult.accessTime}ms (${result.bandwidth.local}MB/s)`);
                console.log(`      🌐 远程访问: ${remoteResult.accessTime}ms (${result.bandwidth.remote}MB/s)`);
                console.log(`      🚀 性能提升: ${result.speedupRatio}x`);
                
            } catch (error) {
                console.log(`      ❌ 内存亲和性测试失败: ${error.message}`);
            }
        }
    }
    
    /**
     * 测试工作窃取队列性能
     */
    async testWorkStealingPerformance() {
        const testCases = [
            { workers: 2, tasks: 500, stealingEnabled: false, description: '无窃取基准' },
            { workers: 2, tasks: 500, stealingEnabled: true, description: '启用工作窃取' },
            { workers: 4, tasks: 1000, stealingEnabled: false, description: '四核无窃取' },
            { workers: 4, tasks: 1000, stealingEnabled: true, description: '四核工作窃取' }
        ];
        
        for (const testCase of testCases) {
            if (testCase.workers > this.systemInfo.cpuCount) continue;
            
            console.log(`  测试: ${testCase.description}`);
            
            const queue = new WorkStealingQueue({
                enableStealing: testCase.stealingEnabled,
                stealingThreshold: 2,
                maxStealAttempts: 3
            });
            
            const workers = [];
            
            // 创建工作线程
            for (let i = 0; i < testCase.workers; i++) {
                const worker = new CrackWorkerThread({
                    workerId: i,
                    queue: queue
                });
                workers.push(worker);
            }
            
            // 生成不均匀的任务负载（模拟真实场景）
            const tasks = [];
            for (let i = 0; i < testCase.tasks; i++) {
                const complexity = i < testCase.tasks * 0.2 ? 10 : Math.random() * 100; // 20%简单任务，80%复杂任务
                tasks.push({
                    id: i,
                    type: 'password_test',
                    complexity: complexity,
                    expectedTime: complexity * 10 // 模拟处理时间
                });
            }
            
            const startTime = Date.now();
            
            try {
                // 启动工作线程
                const workerPromises = workers.map(worker => worker.start());
                
                // 不均匀地分配初始任务（模拟负载不均）
                for (let i = 0; i < tasks.length; i++) {
                    const targetWorker = i % 2 === 0 ? 0 : Math.floor(Math.random() * testCase.workers);
                    queue.addTaskToWorker(tasks[i], targetWorker);
                }
                
                // 等待完成
                await queue.waitForCompletion();
                
                // 停止工作线程
                for (const worker of workers) {
                    worker.stop();
                }
                
                await Promise.all(workerPromises);
                
                const endTime = Date.now();
                const totalTime = endTime - startTime;
                
                // 收集统计
                const workerStats = workers.map(worker => worker.getStatistics());
                const stealingStats = queue.getStealingStatistics();
                
                const totalTasksProcessed = workerStats.reduce((sum, stats) => sum + stats.tasksProcessed, 0);
                const avgTasksPerWorker = totalTasksProcessed / testCase.workers;
                const taskDistribution = workerStats.map(stats => stats.tasksProcessed);
                const maxTasks = Math.max(...taskDistribution);
                const minTasks = Math.min(...taskDistribution);
                const balanceRatio = minTasks / maxTasks;
                
                const result = {
                    testCase: testCase.description,
                    stealingEnabled: testCase.stealingEnabled,
                    workers: testCase.workers,
                    totalTasks: testCase.tasks,
                    totalTime,
                    throughput: Math.round(totalTasksProcessed / (totalTime / 1000)),
                    balanceRatio: Math.round(balanceRatio * 100) / 100,
                    taskDistribution,
                    stealingStats: testCase.stealingEnabled ? stealingStats : null
                };
                
                this.results.workStealingTests.push(result);
                
                console.log(`    ✅ 完成: ${totalTime}ms`);
                console.log(`    🚀 吞吐量: ${result.throughput} tasks/sec`);
                console.log(`    ⚖️  负载均衡: ${result.balanceRatio}`);
                console.log(`    📊 任务分布: [${taskDistribution.join(', ')}]`);
                
                if (testCase.stealingEnabled && stealingStats) {
                    console.log(`    🔄 窃取统计: ${stealingStats.totalSteals}次窃取, ${stealingStats.successfulSteals}次成功`);
                }
                
            } catch (error) {
                console.log(`    ❌ 测试失败: ${error.message}`);
                this.results.workStealingTests.push({
                    testCase: testCase.description,
                    error: error.message,
                    success: false
                });
            }
            
            // 清理
            for (const worker of workers) {
                worker.cleanup();
            }
            queue.cleanup();
            
            await this.sleep(1000);
        }
        
        // 分析工作窃取效果
        this.analyzeWorkStealingEffectiveness();
    }
    
    /**
     * 分析工作窃取效果
     */
    analyzeWorkStealingEffectiveness() {
        const stealingTests = this.results.workStealingTests.filter(t => !t.error);
        
        if (stealingTests.length < 2) return;
        
        console.log('\n  工作窃取效果分析:');
        
        // 按工作线程数分组比较
        const groupedTests = {};
        for (const test of stealingTests) {
            const key = test.workers;
            if (!groupedTests[key]) {
                groupedTests[key] = { enabled: null, disabled: null };
            }
            
            if (test.stealingEnabled) {
                groupedTests[key].enabled = test;
            } else {
                groupedTests[key].disabled = test;
            }
        }
        
        for (const [workers, tests] of Object.entries(groupedTests)) {
            if (!tests.enabled || !tests.disabled) continue;
            
            const throughputImprovement = (tests.enabled.throughput - tests.disabled.throughput) / tests.disabled.throughput;
            const balanceImprovement = tests.enabled.balanceRatio - tests.disabled.balanceRatio;
            
            console.log(`    ${workers}线程:`);
            console.log(`      吞吐量提升: ${(throughputImprovement * 100).toFixed(1)}%`);
            console.log(`      负载均衡改善: ${(balanceImprovement * 100).toFixed(1)}%`);
        }
    }
    
    /**
     * 测试动态线程调整
     */
    async testDynamicThreadAdjustment() {
        console.log('  测试动态线程数量调整');
        
        const numaManager = new NUMAThreadManager({
            enableDynamicAdjustment: true,
            adjustmentInterval: 1000, // 1秒调整间隔
            loadThreshold: 0.8
        });
        
        try {
            // 模拟负载变化场景
            const loadScenarios = [
                { duration: 3000, load: 0.3, description: '低负载' },
                { duration: 3000, load: 0.9, description: '高负载' },
                { duration: 3000, load: 0.5, description: '中等负载' },
                { duration: 2000, load: 0.1, description: '极低负载' }
            ];
            
            const adjustmentHistory = [];
            
            // 监听线程调整事件
            numaManager.on('threadAdjustment', (event) => {
                adjustmentHistory.push({
                    timestamp: Date.now(),
                    oldCount: event.oldThreadCount,
                    newCount: event.newThreadCount,
                    reason: event.reason,
                    load: event.currentLoad
                });
                
                console.log(`    📈 线程调整: ${event.oldThreadCount} → ${event.newThreadCount} (负载: ${(event.currentLoad * 100).toFixed(1)}%)`);
            });
            
            // 启动动态调整
            await numaManager.startDynamicAdjustment();
            
            // 模拟不同负载场景
            for (const scenario of loadScenarios) {
                console.log(`    模拟${scenario.description}: ${scenario.load * 100}%负载, ${scenario.duration}ms`);
                
                // 模拟负载
                numaManager.simulateLoad(scenario.load);
                
                await this.sleep(scenario.duration);
            }
            
            // 停止动态调整
            await numaManager.stopDynamicAdjustment();
            
            const result = {
                totalAdjustments: adjustmentHistory.length,
                adjustmentHistory: [...adjustmentHistory],
                scenarios: loadScenarios.length,
                averageResponseTime: this.calculateAverageResponseTime(adjustmentHistory, loadScenarios)
            };
            
            this.results.threadAdjustmentTests.push(result);
            
            console.log(`    ✅ 动态调整测试完成`);
            console.log(`    🔄 总调整次数: ${result.totalAdjustments}`);
            console.log(`    ⏱️  平均响应时间: ${result.averageResponseTime}ms`);
            
        } catch (error) {
            console.log(`    ❌ 动态调整测试失败: ${error.message}`);
            this.results.threadAdjustmentTests.push({
                error: error.message,
                success: false
            });
        } finally {
            numaManager.cleanup();
        }
    }
    
    /**
     * 测试内存亲和性
     */
    async testMemoryAffinity() {
        console.log('  测试内存亲和性分配策略');
        
        const strategies = ['local', 'interleaved', 'preferred'];
        
        for (const strategy of strategies) {
            console.log(`    测试${strategy}策略`);
            
            const numaManager = new NUMAThreadManager({
                memoryPolicy: strategy
            });
            
            try {
                const testSize = 50 * 1024 * 1024; // 50MB
                const iterations = 10;
                
                const results = [];
                
                for (let i = 0; i < iterations; i++) {
                    const result = await numaManager.testMemoryAllocation({
                        size: testSize,
                        strategy: strategy,
                        accessPattern: 'random'
                    });
                    
                    results.push(result);
                }
                
                // 计算统计
                const avgAllocTime = results.reduce((sum, r) => sum + r.allocTime, 0) / results.length;
                const avgAccessTime = results.reduce((sum, r) => sum + r.accessTime, 0) / results.length;
                const avgBandwidth = results.reduce((sum, r) => sum + r.bandwidth, 0) / results.length;
                
                const testResult = {
                    strategy,
                    iterations,
                    avgAllocTime: Math.round(avgAllocTime),
                    avgAccessTime: Math.round(avgAccessTime),
                    avgBandwidth: Math.round(avgBandwidth),
                    consistency: this.calculateConsistency(results)
                };
                
                this.results.memoryAffinityTests.push(testResult);
                
                console.log(`      ✅ 分配时间: ${testResult.avgAllocTime}ms`);
                console.log(`      ⚡ 访问时间: ${testResult.avgAccessTime}ms`);
                console.log(`      📊 带宽: ${testResult.avgBandwidth}MB/s`);
                console.log(`      📈 一致性: ${(testResult.consistency * 100).toFixed(1)}%`);
                
            } catch (error) {
                console.log(`      ❌ ${strategy}策略测试失败: ${error.message}`);
            } finally {
                numaManager.cleanup();
            }
        }
    }
    
    /**
     * 测试跨节点通信优化
     */
    async testCrossNodeCommunication() {
        console.log('  测试跨节点通信优化');
        
        const numaManager = new NUMAThreadManager();
        
        try {
            const topology = await numaManager.detectTopology();
            
            if (topology.nodeCount <= 1) {
                console.log('    ⚠️  单节点系统，跳过跨节点通信测试');
                return;
            }
            
            const messageSizes = [1024, 64 * 1024, 1024 * 1024]; // 1KB, 64KB, 1MB
            const messageCount = 1000;
            
            for (const messageSize of messageSizes) {
                console.log(`    测试${messageSize}字节消息通信`);
                
                // 测试同节点通信
                const sameNodeResult = await numaManager.testCommunication({
                    messageSize,
                    messageCount,
                    sourceNode: 0,
                    targetNode: 0,
                    optimized: true
                });
                
                // 测试跨节点通信（未优化）
                const crossNodeUnoptimized = await numaManager.testCommunication({
                    messageSize,
                    messageCount,
                    sourceNode: 0,
                    targetNode: 1,
                    optimized: false
                });
                
                // 测试跨节点通信（优化）
                const crossNodeOptimized = await numaManager.testCommunication({
                    messageSize,
                    messageCount,
                    sourceNode: 0,
                    targetNode: 1,
                    optimized: true
                });
                
                const optimizationGain = (crossNodeUnoptimized.latency - crossNodeOptimized.latency) / crossNodeUnoptimized.latency;
                
                const result = {
                    messageSize,
                    messageCount,
                    sameNodeLatency: sameNodeResult.latency,
                    crossNodeUnoptimized: crossNodeUnoptimized.latency,
                    crossNodeOptimized: crossNodeOptimized.latency,
                    optimizationGain: Math.round(optimizationGain * 100) / 100,
                    bandwidth: {
                        sameNode: sameNodeResult.bandwidth,
                        crossNodeUnoptimized: crossNodeUnoptimized.bandwidth,
                        crossNodeOptimized: crossNodeOptimized.bandwidth
                    }
                };
                
                this.results.communicationTests.push(result);
                
                console.log(`      🏠 同节点延迟: ${sameNodeResult.latency}μs`);
                console.log(`      🌐 跨节点延迟(未优化): ${crossNodeUnoptimized.latency}μs`);
                console.log(`      ⚡ 跨节点延迟(优化): ${crossNodeOptimized.latency}μs`);
                console.log(`      📈 优化收益: ${(optimizationGain * 100).toFixed(1)}%`);
            }
            
        } catch (error) {
            console.log(`    ❌ 跨节点通信测试失败: ${error.message}`);
            this.results.communicationTests.push({
                error: error.message,
                success: false
            });
        } finally {
            numaManager.cleanup();
        }
    }
    
    /**
     * 生成测试报告
     */
    generateReport() {
        console.log('\n' + '='.repeat(60));
        console.log('CPU优化集成测试报告');
        console.log('='.repeat(60));
        
        // 负载均衡测试总结
        console.log('\n⚖️  负载均衡测试总结:');
        const loadBalancingTests = this.results.loadBalancingTests.filter(t => !t.error);
        if (loadBalancingTests.length > 0) {
            const avgBalance = loadBalancingTests.reduce((sum, t) => sum + t.loadBalanceRatio, 0) / loadBalancingTests.length;
            const avgThroughput = loadBalancingTests.reduce((sum, t) => sum + t.throughput, 0) / loadBalancingTests.length;
            
            console.log(`  平均负载均衡比: ${avgBalance.toFixed(2)} (${avgBalance >= 0.8 ? '优秀' : avgBalance >= 0.6 ? '良好' : '需改进'})`);
            console.log(`  平均吞吐量: ${Math.round(avgThroughput)} tasks/sec`);
            console.log(`  最佳性能: ${Math.max(...loadBalancingTests.map(t => t.throughput))} tasks/sec`);
        }
        
        // NUMA优化测试总结
        console.log('\n🧠 NUMA优化测试总结:');
        const numaTests = this.results.numaTests.filter(t => !t.error);
        if (numaTests.length > 0) {
            const supportedTests = numaTests.filter(t => t.success !== false);
            if (supportedTests.length > 0) {
                const avgBalance = supportedTests.reduce((sum, t) => sum + (t.balanceRatio || 0), 0) / supportedTests.length;
                console.log(`  NUMA节点均衡性: ${avgBalance.toFixed(2)}`);
                console.log(`  内存亲和性: ${supportedTests.some(t => t.memoryAffinity) ? '支持' : '不支持'}`);
            } else {
                console.log(`  系统不支持NUMA或为单节点系统`);
            }
        }
        
        // 工作窃取测试总结
        console.log('\n🔄 工作窃取测试总结:');
        const workStealingTests = this.results.workStealingTests.filter(t => !t.error);
        if (workStealingTests.length > 0) {
            const enabledTests = workStealingTests.filter(t => t.stealingEnabled);
            const disabledTests = workStealingTests.filter(t => !t.stealingEnabled);
            
            if (enabledTests.length > 0 && disabledTests.length > 0) {
                const avgThroughputEnabled = enabledTests.reduce((sum, t) => sum + t.throughput, 0) / enabledTests.length;
                const avgThroughputDisabled = disabledTests.reduce((sum, t) => sum + t.throughput, 0) / disabledTests.length;
                const throughputImprovement = (avgThroughputEnabled - avgThroughputDisabled) / avgThroughputDisabled;
                
                console.log(`  工作窃取效果: ${(throughputImprovement * 100).toFixed(1)}% 吞吐量提升`);
                
                const totalSteals = enabledTests.reduce((sum, t) => sum + (t.stealingStats?.totalSteals || 0), 0);
                const successfulSteals = enabledTests.reduce((sum, t) => sum + (t.stealingStats?.successfulSteals || 0), 0);
                const stealSuccessRate = totalSteals > 0 ? successfulSteals / totalSteals : 0;
                
                console.log(`  窃取成功率: ${(stealSuccessRate * 100).toFixed(1)}%`);
            }
        }
        
        // 动态调整测试总结
        console.log('\n📈 动态线程调整测试总结:');
        const adjustmentTests = this.results.threadAdjustmentTests.filter(t => !t.error);
        if (adjustmentTests.length > 0) {
            const test = adjustmentTests[0];
            console.log(`  调整响应性: ${test.averageResponseTime}ms 平均响应时间`);
            console.log(`  调整频率: ${test.totalAdjustments}次调整`);
            console.log(`  适应性: ${test.totalAdjustments > 0 ? '良好' : '需改进'}`);
        }
        
        // 内存亲和性测试总结
        console.log('\n💾 内存亲和性测试总结:');
        const memoryTests = this.results.memoryAffinityTests.filter(t => !t.error);
        if (memoryTests.length > 0) {
            const bestStrategy = memoryTests.reduce((best, current) => 
                current.avgBandwidth > best.avgBandwidth ? current : best
            );
            
            console.log(`  最佳策略: ${bestStrategy.strategy}`);
            console.log(`  最高带宽: ${bestStrategy.avgBandwidth}MB/s`);
            console.log(`  性能一致性: ${(bestStrategy.consistency * 100).toFixed(1)}%`);
        }
        
        // 跨节点通信测试总结
        console.log('\n🌐 跨节点通信测试总结:');
        const commTests = this.results.communicationTests.filter(t => !t.error);
        if (commTests.length > 0) {
            const avgOptimizationGain = commTests.reduce((sum, t) => sum + t.optimizationGain, 0) / commTests.length;
            console.log(`  平均优化收益: ${(avgOptimizationGain * 100).toFixed(1)}%`);
            
            const maxGain = Math.max(...commTests.map(t => t.optimizationGain));
            console.log(`  最大优化收益: ${(maxGain * 100).toFixed(1)}%`);
        }
        
        // 综合评分
        console.log('\n🏆 CPU优化综合评分:');
        const overallScore = this.calculateOverallScore();
        console.log(`  综合评分: ${overallScore.score}/100`);
        console.log(`  优化等级: ${overallScore.grade}`);
        console.log(`  评价: ${overallScore.comment}`);
        
        console.log('\n✅ CPU优化集成测试完成');
    }
    
    /**
     * 计算综合评分
     */
    calculateOverallScore() {
        let totalScore = 0;
        let maxScore = 0;
        
        // 负载均衡评分 (30分)
        const loadBalancingTests = this.results.loadBalancingTests.filter(t => !t.error);
        if (loadBalancingTests.length > 0) {
            const avgBalance = loadBalancingTests.reduce((sum, t) => sum + t.loadBalanceRatio, 0) / loadBalancingTests.length;
            const balanceScore = avgBalance * 30;
            totalScore += balanceScore;
        }
        maxScore += 30;
        
        // NUMA优化评分 (25分)
        const numaTests = this.results.numaTests.filter(t => !t.error && t.success !== false);
        if (numaTests.length > 0) {
            const avgBalance = numaTests.reduce((sum, t) => sum + (t.balanceRatio || 0.5), 0) / numaTests.length;
            const numaScore = avgBalance * 25;
            totalScore += numaScore;
        } else {
            // 如果不支持NUMA，给予部分分数
            totalScore += 15;
        }
        maxScore += 25;
        
        // 工作窃取评分 (20分)
        const workStealingTests = this.results.workStealingTests.filter(t => !t.error);
        if (workStealingTests.length > 0) {
            const enabledTests = workStealingTests.filter(t => t.stealingEnabled);
            const disabledTests = workStealingTests.filter(t => !t.stealingEnabled);
            
            if (enabledTests.length > 0 && disabledTests.length > 0) {
                const avgThroughputEnabled = enabledTests.reduce((sum, t) => sum + t.throughput, 0) / enabledTests.length;
                const avgThroughputDisabled = disabledTests.reduce((sum, t) => sum + t.throughput, 0) / disabledTests.length;
                const improvement = (avgThroughputEnabled - avgThroughputDisabled) / avgThroughputDisabled;
                const stealingScore = Math.min(20, improvement * 100); // 100%提升 = 20分
                totalScore += stealingScore;
            }
        }
        maxScore += 20;
        
        // 动态调整评分 (15分)
        const adjustmentTests = this.results.threadAdjustmentTests.filter(t => !t.error);
        if (adjustmentTests.length > 0) {
            const test = adjustmentTests[0];
            const responsiveness = Math.max(0, 15 - (test.averageResponseTime / 100)); // 响应时间越短分数越高
            totalScore += responsiveness;
        }
        maxScore += 15;
        
        // 内存亲和性评分 (10分)
        const memoryTests = this.results.memoryAffinityTests.filter(t => !t.error);
        if (memoryTests.length > 0) {
            const avgConsistency = memoryTests.reduce((sum, t) => sum + t.consistency, 0) / memoryTests.length;
            const memoryScore = avgConsistency * 10;
            totalScore += memoryScore;
        }
        maxScore += 10;
        
        const finalScore = Math.round((totalScore / maxScore) * 100);
        
        let grade, comment;
        if (finalScore >= 90) {
            grade = 'A+';
            comment = '优秀 - CPU多线程优化表现卓越';
        } else if (finalScore >= 80) {
            grade = 'A';
            comment = '良好 - CPU多线程优化表现良好';
        } else if (finalScore >= 70) {
            grade = 'B';
            comment = '中等 - CPU多线程优化基本满足要求';
        } else if (finalScore >= 60) {
            grade = 'C';
            comment = '及格 - CPU多线程优化需要改进';
        } else {
            grade = 'D';
            comment = '不及格 - CPU多线程优化存在严重问题';
        }
        
        return { score: finalScore, grade, comment };
    }
    
    // 辅助方法
    
    calculateAverageResponseTime(adjustmentHistory, scenarios) {
        if (adjustmentHistory.length === 0) return 0;
        
        let totalResponseTime = 0;
        let scenarioStart = Date.now();
        
        for (const adjustment of adjustmentHistory) {
            const responseTime = adjustment.timestamp - scenarioStart;
            totalResponseTime += responseTime;
        }
        
        return Math.round(totalResponseTime / adjustmentHistory.length);
    }
    
    calculateConsistency(results) {
        if (results.length < 2) return 1.0;
        
        const values = results.map(r => r.bandwidth);
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        
        return Math.max(0, 1 - (stdDev / avg));
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 运行测试
async function runTests() {
    const tester = new CPUOptimizationIntegrationTest();
    await tester.runAllTests();
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}

export default CPUOptimizationIntegrationTest;