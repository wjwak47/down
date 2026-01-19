/**
 * WorkStealingQueue - 工作窃取队列系统
 * 
 * 功能：
 * 1. 负载均衡算法 - 动态分配任务到各个工作线程
 * 2. 工作窃取机制 - 空闲线程从繁忙线程窃取任务
 * 3. 动态任务分配 - 根据线程性能调整任务分配策略
 * 4. 线程池管理 - 智能管理工作线程生命周期
 * 5. 性能监控 - 实时监控各线程工作负载和效率
 * 
 * 设计原则：
 * - 负载均衡：确保所有CPU核心得到充分利用
 * - 低延迟：最小化任务调度开销
 * - 容错性：处理线程异常和任务失败
 * - 可扩展：支持动态调整线程数量
 */

import { Worker } from 'worker_threads';
import EventEmitter from 'events';
import os from 'os';
import path from 'path';

class WorkStealingQueue extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            // 线程池配置
            minWorkers: Math.max(1, Math.floor(os.cpus().length / 2)),
            maxWorkers: os.cpus().length,
            idleTimeout: 30000,         // 空闲线程超时时间
            
            // 队列配置
            maxQueueSize: 10000,        // 最大队列大小
            stealThreshold: 5,          // 窃取阈值
            balanceInterval: 1000,      // 负载均衡间隔
            
            // 任务配置
            taskTimeout: 60000,         // 任务超时时间
            retryAttempts: 3,           // 重试次数
            batchSize: 100,             // 批处理大小
            
            // 性能配置
            enableStealing: true,       // 启用工作窃取
            enableDynamicScaling: true, // 启用动态扩缩容
            enablePerformanceTracking: true, // 启用性能跟踪
            
            ...options
        };
        
        // 工作线程池
        this.workers = new Map();           // 工作线程映射
        this.workerQueues = new Map();      // 每个线程的任务队列
        this.workerStats = new Map();       // 线程性能统计
        this.workerStates = new Map();      // 线程状态
        
        // 全局任务队列
        this.globalQueue = [];              // 全局任务队列
        this.completedTasks = new Map();    // 已完成任务
        this.failedTasks = new Map();       // 失败任务
        
        // 调度器状态
        this.isRunning = false;
        this.totalTasks = 0;
        this.completedCount = 0;
        this.failedCount = 0;
        
        // 定时器
        this.balanceTimer = null;
        this.cleanupTimer = null;
        
        // 性能监控
        this.performanceMetrics = {
            throughput: 0,              // 吞吐量
            averageLatency: 0,          // 平均延迟
            loadBalance: 0,             // 负载均衡度
            stealingEvents: 0,          // 窃取事件数
            scalingEvents: 0            // 扩缩容事件数
        };
        
        console.log('[WorkStealingQueue] 工作窃取队列系统已初始化');
        console.log(`[WorkStealingQueue] 线程池配置: ${this.options.minWorkers}-${this.options.maxWorkers} 线程`);
    }
    
    /**
     * 启动工作窃取队列系统
     */
    async start() {
        if (this.isRunning) {
            console.log('[WorkStealingQueue] 系统已在运行中');
            return;
        }
        
        console.log('[WorkStealingQueue] 启动工作窃取队列系统');
        
        try {
            // 初始化最小数量的工作线程
            await this.initializeWorkers();
            
            // 启动负载均衡器
            this.startLoadBalancer();
            
            // 启动清理器
            this.startCleanupTimer();
            
            this.isRunning = true;
            
            this.emit('started', {
                workerCount: this.workers.size,
                queueSize: this.globalQueue.length
            });
            
            console.log(`[WorkStealingQueue] 系统启动完成，${this.workers.size} 个工作线程就绪`);
            
        } catch (error) {
            console.error('[WorkStealingQueue] 启动失败:', error);
            throw error;
        }
    }
    
    /**
     * 停止工作窃取队列系统
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        
        console.log('[WorkStealingQueue] 停止工作窃取队列系统');
        
        this.isRunning = false;
        
        // 停止定时器
        if (this.balanceTimer) {
            clearInterval(this.balanceTimer);
            this.balanceTimer = null;
        }
        
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        
        // 终止所有工作线程
        await this.terminateAllWorkers();
        
        this.emit('stopped', {
            completedTasks: this.completedCount,
            failedTasks: this.failedCount
        });
        
        console.log('[WorkStealingQueue] 系统已停止');
    }
    
    /**
     * 提交任务到队列
     */
    async submitTask(task) {
        if (!this.isRunning) {
            throw new Error('工作窃取队列系统未启动');
        }
        
        if (this.globalQueue.length >= this.options.maxQueueSize) {
            throw new Error('队列已满，无法提交新任务');
        }
        
        // 生成任务ID
        const taskId = this.generateTaskId();
        const wrappedTask = {
            id: taskId,
            data: task,
            submittedAt: Date.now(),
            attempts: 0,
            maxAttempts: this.options.retryAttempts
        };
        
        // 添加到全局队列
        this.globalQueue.push(wrappedTask);
        this.totalTasks++;
        
        // 触发任务分配
        await this.distributeTask(wrappedTask);
        
        this.emit('taskSubmitted', { taskId, queueSize: this.globalQueue.length });
        
        return taskId;
    }
    
    /**
     * 批量提交任务
     */
    async submitBatch(tasks) {
        const taskIds = [];
        
        for (const task of tasks) {
            const taskId = await this.submitTask(task);
            taskIds.push(taskId);
        }
        
        console.log(`[WorkStealingQueue] 批量提交 ${tasks.length} 个任务`);
        
        return taskIds;
    }
    
    /**
     * 初始化工作线程
     */
    async initializeWorkers() {
        const workerCount = this.options.minWorkers;
        
        for (let i = 0; i < workerCount; i++) {
            await this.createWorker(i);
        }
        
        console.log(`[WorkStealingQueue] 初始化 ${workerCount} 个工作线程`);
    }
    
    /**
     * 创建工作线程
     */
    async createWorker(workerId) {
        const workerScript = path.join(__dirname, 'CrackWorkerThread.js');
        
        const worker = new Worker(workerScript, {
            workerData: {
                workerId,
                options: this.options
            }
        });
        
        // 设置工作线程状态
        this.workers.set(workerId, worker);
        this.workerQueues.set(workerId, []);
        this.workerStats.set(workerId, {
            tasksCompleted: 0,
            tasksAssigned: 0,
            averageTime: 0,
            lastActivity: Date.now(),
            isIdle: true,
            performance: 1.0
        });
        this.workerStates.set(workerId, 'idle');
        
        // 监听工作线程消息
        worker.on('message', (message) => {
            this.handleWorkerMessage(workerId, message);
        });
        
        // 监听工作线程错误
        worker.on('error', (error) => {
            console.error(`[WorkStealingQueue] Worker ${workerId} 错误:`, error);
            this.handleWorkerError(workerId, error);
        });
        
        // 监听工作线程退出
        worker.on('exit', (code) => {
            console.log(`[WorkStealingQueue] Worker ${workerId} 退出，代码: ${code}`);
            this.handleWorkerExit(workerId, code);
        });
        
        console.log(`[WorkStealingQueue] 创建工作线程 ${workerId}`);
        
        return workerId;
    }
    
    /**
     * 处理工作线程消息
     */
    handleWorkerMessage(workerId, message) {
        const { type, data } = message;
        
        switch (type) {
            case 'taskCompleted':
                this.handleTaskCompleted(workerId, data);
                break;
                
            case 'taskFailed':
                this.handleTaskFailed(workerId, data);
                break;
                
            case 'workerReady':
                this.handleWorkerReady(workerId);
                break;
                
            case 'performanceUpdate':
                this.handlePerformanceUpdate(workerId, data);
                break;
                
            default:
                console.warn(`[WorkStealingQueue] 未知消息类型: ${type}`);
        }
    }
    
    /**
     * 处理任务完成
     */
    handleTaskCompleted(workerId, data) {
        const { taskId, result, executionTime } = data;
        
        // 更新统计信息
        this.completedCount++;
        this.completedTasks.set(taskId, {
            result,
            completedAt: Date.now(),
            executionTime,
            workerId
        });
        
        // 更新工作线程统计
        const stats = this.workerStats.get(workerId);
        if (stats) {
            stats.tasksCompleted++;
            stats.averageTime = (stats.averageTime + executionTime) / 2;
            stats.lastActivity = Date.now();
            stats.isIdle = true;
        }
        
        // 从工作线程队列中移除任务
        const queue = this.workerQueues.get(workerId);
        if (queue) {
            const taskIndex = queue.findIndex(task => task.id === taskId);
            if (taskIndex !== -1) {
                queue.splice(taskIndex, 1);
            }
        }
        
        this.emit('taskCompleted', { taskId, result, workerId, executionTime });
        
        // 尝试分配新任务
        this.tryAssignTask(workerId);
    }
    
    /**
     * 处理任务失败
     */
    handleTaskFailed(workerId, data) {
        const { taskId, error, executionTime } = data;
        
        // 查找任务
        let task = null;
        const queue = this.workerQueues.get(workerId);
        if (queue) {
            const taskIndex = queue.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                task = queue[taskIndex];
                queue.splice(taskIndex, 1);
            }
        }
        
        if (!task) {
            console.warn(`[WorkStealingQueue] 未找到失败的任务: ${taskId}`);
            return;
        }
        
        task.attempts++;
        
        // 检查是否需要重试
        if (task.attempts < task.maxAttempts) {
            console.log(`[WorkStealingQueue] 任务 ${taskId} 重试 (${task.attempts}/${task.maxAttempts})`);
            
            // 重新加入全局队列
            this.globalQueue.push(task);
            
            // 尝试重新分配
            setTimeout(() => {
                this.distributeTask(task);
            }, 1000 * task.attempts); // 指数退避
            
        } else {
            // 任务最终失败
            this.failedCount++;
            this.failedTasks.set(taskId, {
                error,
                failedAt: Date.now(),
                attempts: task.attempts,
                workerId
            });
            
            this.emit('taskFailed', { taskId, error, workerId, attempts: task.attempts });
        }
        
        // 更新工作线程统计
        const stats = this.workerStats.get(workerId);
        if (stats) {
            stats.lastActivity = Date.now();
            stats.isIdle = true;
        }
        
        // 尝试分配新任务
        this.tryAssignTask(workerId);
    }
    
    /**
     * 处理工作线程就绪
     */
    handleWorkerReady(workerId) {
        this.workerStates.set(workerId, 'ready');
        
        const stats = this.workerStats.get(workerId);
        if (stats) {
            stats.isIdle = true;
            stats.lastActivity = Date.now();
        }
        
        // 尝试分配任务
        this.tryAssignTask(workerId);
    }
    
    /**
     * 处理性能更新
     */
    handlePerformanceUpdate(workerId, data) {
        const stats = this.workerStats.get(workerId);
        if (stats) {
            Object.assign(stats, data);
        }
    }
    
    /**
     * 分配任务到工作线程
     */
    async distributeTask(task) {
        // 查找最适合的工作线程
        const bestWorker = this.findBestWorker();
        
        if (bestWorker !== null) {
            await this.assignTaskToWorker(bestWorker, task);
        } else {
            // 所有线程都忙，检查是否需要扩容
            if (this.options.enableDynamicScaling && this.workers.size < this.options.maxWorkers) {
                const newWorkerId = await this.scaleUp();
                if (newWorkerId !== null) {
                    await this.assignTaskToWorker(newWorkerId, task);
                }
            }
        }
    }
    
    /**
     * 查找最佳工作线程
     */
    findBestWorker() {
        let bestWorker = null;
        let minLoad = Infinity;
        
        for (const [workerId, stats] of this.workerStats) {
            if (stats.isIdle) {
                return workerId; // 优先选择空闲线程
            }
            
            const queue = this.workerQueues.get(workerId);
            const currentLoad = queue ? queue.length : 0;
            
            if (currentLoad < minLoad) {
                minLoad = currentLoad;
                bestWorker = workerId;
            }
        }
        
        // 检查最佳线程是否超过阈值
        if (bestWorker !== null) {
            const queue = this.workerQueues.get(bestWorker);
            if (queue && queue.length >= this.options.stealThreshold * 2) {
                return null; // 所有线程都太忙
            }
        }
        
        return bestWorker;
    }
    
    /**
     * 将任务分配给工作线程
     */
    async assignTaskToWorker(workerId, task) {
        const worker = this.workers.get(workerId);
        const queue = this.workerQueues.get(workerId);
        const stats = this.workerStats.get(workerId);
        
        if (!worker || !queue || !stats) {
            console.error(`[WorkStealingQueue] 工作线程 ${workerId} 不存在`);
            return false;
        }
        
        // 添加到线程队列
        queue.push(task);
        
        // 更新统计
        stats.tasksAssigned++;
        stats.isIdle = false;
        stats.lastActivity = Date.now();
        
        // 发送任务到工作线程
        worker.postMessage({
            type: 'executeTask',
            data: {
                taskId: task.id,
                task: task.data,
                timeout: this.options.taskTimeout
            }
        });
        
        this.workerStates.set(workerId, 'busy');
        
        console.log(`[WorkStealingQueue] 任务 ${task.id} 分配给工作线程 ${workerId}`);
        
        return true;
    }
    
    /**
     * 尝试为工作线程分配新任务
     */
    tryAssignTask(workerId) {
        if (this.globalQueue.length === 0) {
            return;
        }
        
        const stats = this.workerStats.get(workerId);
        if (!stats || !stats.isIdle) {
            return;
        }
        
        // 从全局队列取出任务
        const task = this.globalQueue.shift();
        if (task) {
            this.assignTaskToWorker(workerId, task);
        }
    }
    
    /**
     * 启动负载均衡器
     */
    startLoadBalancer() {
        this.balanceTimer = setInterval(() => {
            this.performLoadBalancing();
        }, this.options.balanceInterval);
        
        console.log('[WorkStealingQueue] 负载均衡器已启动');
    }
    
    /**
     * 执行负载均衡
     */
    performLoadBalancing() {
        if (!this.options.enableStealing) {
            return;
        }
        
        // 查找负载不均衡的线程
        const workloads = new Map();
        
        for (const [workerId, queue] of this.workerQueues) {
            workloads.set(workerId, queue.length);
        }
        
        // 找出最忙和最闲的线程
        let maxLoad = 0;
        let minLoad = Infinity;
        let busiestWorker = null;
        let idlestWorker = null;
        
        for (const [workerId, load] of workloads) {
            if (load > maxLoad) {
                maxLoad = load;
                busiestWorker = workerId;
            }
            
            if (load < minLoad) {
                minLoad = load;
                idlestWorker = workerId;
            }
        }
        
        // 检查是否需要工作窃取
        if (busiestWorker && idlestWorker && 
            maxLoad - minLoad >= this.options.stealThreshold) {
            
            this.performWorkStealing(busiestWorker, idlestWorker);
        }
        
        // 更新性能指标
        this.updatePerformanceMetrics();
    }
    
    /**
     * 执行工作窃取
     */
    performWorkStealing(fromWorkerId, toWorkerId) {
        const fromQueue = this.workerQueues.get(fromWorkerId);
        const toQueue = this.workerQueues.get(toWorkerId);
        
        if (!fromQueue || !toQueue || fromQueue.length === 0) {
            return;
        }
        
        // 计算窃取数量（一半任务）
        const stealCount = Math.floor(fromQueue.length / 2);
        
        if (stealCount === 0) {
            return;
        }
        
        // 窃取任务
        const stolenTasks = fromQueue.splice(-stealCount, stealCount);
        
        for (const task of stolenTasks) {
            this.assignTaskToWorker(toWorkerId, task);
        }
        
        this.performanceMetrics.stealingEvents++;
        
        console.log(`[WorkStealingQueue] 工作窃取: Worker ${toWorkerId} 从 Worker ${fromWorkerId} 窃取 ${stealCount} 个任务`);
        
        this.emit('workStealing', {
            fromWorker: fromWorkerId,
            toWorker: toWorkerId,
            taskCount: stealCount
        });
    }
    
    /**
     * 扩容（增加工作线程）
     */
    async scaleUp() {
        if (this.workers.size >= this.options.maxWorkers) {
            return null;
        }
        
        const newWorkerId = this.workers.size;
        
        try {
            await this.createWorker(newWorkerId);
            
            this.performanceMetrics.scalingEvents++;
            
            console.log(`[WorkStealingQueue] 扩容: 新增工作线程 ${newWorkerId}`);
            
            this.emit('scaleUp', { workerId: newWorkerId, totalWorkers: this.workers.size });
            
            return newWorkerId;
            
        } catch (error) {
            console.error('[WorkStealingQueue] 扩容失败:', error);
            return null;
        }
    }
    
    /**
     * 缩容（移除空闲工作线程）
     */
    async scaleDown() {
        if (this.workers.size <= this.options.minWorkers) {
            return;
        }
        
        // 查找长时间空闲的线程
        const now = Date.now();
        const idleWorkers = [];
        
        for (const [workerId, stats] of this.workerStats) {
            if (stats.isIdle && 
                now - stats.lastActivity > this.options.idleTimeout &&
                this.workerQueues.get(workerId).length === 0) {
                idleWorkers.push(workerId);
            }
        }
        
        // 移除一个空闲线程
        if (idleWorkers.length > 0) {
            const workerToRemove = idleWorkers[0];
            await this.terminateWorker(workerToRemove);
            
            this.performanceMetrics.scalingEvents++;
            
            console.log(`[WorkStealingQueue] 缩容: 移除工作线程 ${workerToRemove}`);
            
            this.emit('scaleDown', { workerId: workerToRemove, totalWorkers: this.workers.size });
        }
    }
    
    /**
     * 终止工作线程
     */
    async terminateWorker(workerId) {
        const worker = this.workers.get(workerId);
        
        if (!worker) {
            return;
        }
        
        // 将未完成的任务重新加入全局队列
        const queue = this.workerQueues.get(workerId);
        if (queue && queue.length > 0) {
            this.globalQueue.push(...queue);
            console.log(`[WorkStealingQueue] 重新分配 ${queue.length} 个任务`);
        }
        
        // 清理资源
        this.workers.delete(workerId);
        this.workerQueues.delete(workerId);
        this.workerStats.delete(workerId);
        this.workerStates.delete(workerId);
        
        // 终止线程
        await worker.terminate();
        
        console.log(`[WorkStealingQueue] 工作线程 ${workerId} 已终止`);
    }
    
    /**
     * 终止所有工作线程
     */
    async terminateAllWorkers() {
        const terminatePromises = [];
        
        for (const workerId of this.workers.keys()) {
            terminatePromises.push(this.terminateWorker(workerId));
        }
        
        await Promise.all(terminatePromises);
        
        console.log('[WorkStealingQueue] 所有工作线程已终止');
    }
    
    /**
     * 启动清理定时器
     */
    startCleanupTimer() {
        this.cleanupTimer = setInterval(() => {
            this.performCleanup();
        }, 60000); // 每分钟清理一次
    }
    
    /**
     * 执行清理操作
     */
    performCleanup() {
        // 清理已完成的任务（保留最近1小时的）
        const oneHourAgo = Date.now() - 60 * 60 * 1000;
        
        for (const [taskId, task] of this.completedTasks) {
            if (task.completedAt < oneHourAgo) {
                this.completedTasks.delete(taskId);
            }
        }
        
        // 清理失败的任务
        for (const [taskId, task] of this.failedTasks) {
            if (task.failedAt < oneHourAgo) {
                this.failedTasks.delete(taskId);
            }
        }
        
        // 检查是否需要缩容
        if (this.options.enableDynamicScaling) {
            this.scaleDown();
        }
    }
    
    /**
     * 更新性能指标
     */
    updatePerformanceMetrics() {
        const now = Date.now();
        
        // 计算吞吐量
        const recentTasks = Array.from(this.completedTasks.values())
            .filter(task => now - task.completedAt < 60000); // 最近1分钟
        
        this.performanceMetrics.throughput = recentTasks.length;
        
        // 计算平均延迟
        if (recentTasks.length > 0) {
            const totalLatency = recentTasks.reduce((sum, task) => sum + task.executionTime, 0);
            this.performanceMetrics.averageLatency = totalLatency / recentTasks.length;
        }
        
        // 计算负载均衡度
        const loads = Array.from(this.workerQueues.values()).map(queue => queue.length);
        if (loads.length > 0) {
            const maxLoad = Math.max(...loads);
            const minLoad = Math.min(...loads);
            this.performanceMetrics.loadBalance = maxLoad > 0 ? (1 - (maxLoad - minLoad) / maxLoad) : 1;
        }
    }
    
    /**
     * 获取系统状态
     */
    getStatus() {
        const workerStatus = [];
        
        for (const [workerId, stats] of this.workerStats) {
            const queue = this.workerQueues.get(workerId);
            const state = this.workerStates.get(workerId);
            
            workerStatus.push({
                id: workerId,
                state,
                queueSize: queue ? queue.length : 0,
                tasksCompleted: stats.tasksCompleted,
                tasksAssigned: stats.tasksAssigned,
                averageTime: stats.averageTime,
                isIdle: stats.isIdle,
                performance: stats.performance
            });
        }
        
        return {
            isRunning: this.isRunning,
            totalWorkers: this.workers.size,
            globalQueueSize: this.globalQueue.length,
            totalTasks: this.totalTasks,
            completedTasks: this.completedCount,
            failedTasks: this.failedCount,
            performanceMetrics: { ...this.performanceMetrics },
            workers: workerStatus
        };
    }
    
    /**
     * 处理工作线程错误
     */
    handleWorkerError(workerId, error) {
        console.error(`[WorkStealingQueue] Worker ${workerId} 发生错误:`, error);
        
        // 重启工作线程
        this.restartWorker(workerId);
    }
    
    /**
     * 处理工作线程退出
     */
    handleWorkerExit(workerId, code) {
        if (code !== 0) {
            console.error(`[WorkStealingQueue] Worker ${workerId} 异常退出，代码: ${code}`);
            
            // 重启工作线程
            this.restartWorker(workerId);
        }
    }
    
    /**
     * 重启工作线程
     */
    async restartWorker(workerId) {
        try {
            // 清理旧的工作线程
            await this.terminateWorker(workerId);
            
            // 创建新的工作线程
            await this.createWorker(workerId);
            
            console.log(`[WorkStealingQueue] Worker ${workerId} 已重启`);
            
        } catch (error) {
            console.error(`[WorkStealingQueue] 重启 Worker ${workerId} 失败:`, error);
        }
    }
    
    /**
     * 生成任务ID
     */
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }
    
    /**
     * 清理资源
     */
    async cleanup() {
        await this.stop();
        this.removeAllListeners();
        
        console.log('[WorkStealingQueue] 资源清理完成');
    }
}

export default WorkStealingQueue;