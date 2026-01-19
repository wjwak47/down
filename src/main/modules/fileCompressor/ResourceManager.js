/**
 * ResourceManager - 智能资源管理器
 * 
 * 功能：
 * 1. 检测硬件配置和资源限制
 * 2. 动态分配系统资源 (CPU, Memory, GPU)
 * 3. NUMA感知线程分配
 * 4. 资源使用监控和自动调整
 * 5. 防止系统过载和崩溃
 * 
 * 优化目标：
 * - 最大化资源利用率同时保持系统稳定
 * - 根据硬件特性自动优化配置
 * - 支持多种工作负载的资源分配策略
 */

import os from 'os';
import { execSync } from 'child_process';

class ResourceManager {
    constructor() {
        this.platform = process.platform;
        this.isWindows = this.platform === 'win32';
        this.isMac = this.platform === 'darwin';
        this.isLinux = this.platform === 'linux';
        
        // Hardware configuration
        this.hardwareConfig = null;
        this.resourceLimits = null;
        this.numaTopology = null;
        
        // Current resource allocation
        this.currentAllocations = new Map();
        this.totalAllocated = {
            cpu: 0,
            memory: 0,
            gpu: 0
        };
        
        // Resource allocation strategies
        this.strategies = {
            'gpu_crack': {
                priority: 'high',
                cpuWeight: 0.2,
                memoryWeight: 0.3,
                gpuWeight: 0.9,
                description: 'GPU密码破解 - 优先GPU资源'
            },
            'cpu_crack': {
                priority: 'high',
                cpuWeight: 0.8,
                memoryWeight: 0.6,
                gpuWeight: 0.1,
                description: 'CPU密码破解 - 优先CPU资源'
            },
            'ai_generation': {
                priority: 'medium',
                cpuWeight: 0.4,
                memoryWeight: 0.7,
                gpuWeight: 0.3,
                description: 'AI密码生成 - 平衡CPU和内存'
            },
            'batch_processing': {
                priority: 'low',
                cpuWeight: 0.3,
                memoryWeight: 0.4,
                gpuWeight: 0.1,
                description: '批量处理 - 低资源占用'
            }
        };
        
        console.log('[ResourceManager] Initialized for platform:', this.platform);
        this.initialize();
    }
    
    /**
     * 初始化资源管理器
     */
    async initialize() {
        try {
            this.hardwareConfig = await this.detectHardwareConfiguration();
            this.resourceLimits = this.calculateResourceLimits();
            this.numaTopology = await this.detectNUMATopology();
            
            console.log('[ResourceManager] Hardware configuration:', this.hardwareConfig);
            console.log('[ResourceManager] Resource limits:', this.resourceLimits);
            console.log('[ResourceManager] NUMA topology:', this.numaTopology);
            
        } catch (err) {
            console.error('[ResourceManager] Initialization error:', err);
            // Use safe defaults
            this.hardwareConfig = this.getDefaultHardwareConfig();
            this.resourceLimits = this.getDefaultResourceLimits();
            this.numaTopology = this.getDefaultNUMATopology();
        }
    }
    
    /**
     * 检测硬件配置
     */
    async detectHardwareConfiguration() {
        const config = {
            platform: this.platform,
            architecture: os.arch(),
            cpus: {
                count: os.cpus().length,
                model: os.cpus()[0]?.model || 'Unknown',
                speed: os.cpus()[0]?.speed || 0,
                cores: os.cpus().length
            },
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem()
            },
            gpus: [],
            storage: {
                temp: this.getTempDiskSpace()
            }
        };
        
        // Detect GPU configuration
        try {
            config.gpus = await this.detectGPUConfiguration();
        } catch (err) {
            console.log('[ResourceManager] GPU detection failed:', err.message);
            config.gpus = [];
        }
        
        // Detect CPU features
        try {
            config.cpus.features = await this.detectCPUFeatures();
        } catch (err) {
            config.cpus.features = [];
        }
        
        return config;
    }
    
    /**
     * 检测GPU配置
     */
    async detectGPUConfiguration() {
        const gpus = [];
        
        try {
            if (this.isWindows) {
                // Windows: Use nvidia-smi
                const result = execSync('nvidia-smi --query-gpu=index,name,memory.total,memory.free,utilization.gpu,temperature.gpu --format=csv,noheader,nounits', {
                    encoding: 'utf8',
                    timeout: 5000
                });
                
                const lines = result.trim().split('\n');
                lines.forEach((line, index) => {
                    const [idx, name, memTotal, memFree, utilization, temperature] = line.split(', ');
                    gpus.push({
                        index: parseInt(idx),
                        name: name.trim(),
                        memory: {
                            total: parseInt(memTotal) * 1024 * 1024, // Convert MB to bytes
                            free: parseInt(memFree) * 1024 * 1024,
                            used: (parseInt(memTotal) - parseInt(memFree)) * 1024 * 1024
                        },
                        utilization: parseInt(utilization) / 100,
                        temperature: parseInt(temperature),
                        available: true
                    });
                });
                
            } else {
                // Unix: Use nvidia-smi
                const result = execSync('nvidia-smi --query-gpu=index,name,memory.total,memory.free,utilization.gpu,temperature.gpu --format=csv,noheader,nounits 2>/dev/null || echo ""', {
                    encoding: 'utf8',
                    timeout: 5000
                });
                
                if (result.trim()) {
                    const lines = result.trim().split('\n');
                    lines.forEach((line) => {
                        const [idx, name, memTotal, memFree, utilization, temperature] = line.split(', ');
                        gpus.push({
                            index: parseInt(idx),
                            name: name.trim(),
                            memory: {
                                total: parseInt(memTotal) * 1024 * 1024,
                                free: parseInt(memFree) * 1024 * 1024,
                                used: (parseInt(memTotal) - parseInt(memFree)) * 1024 * 1024
                            },
                            utilization: parseInt(utilization) / 100,
                            temperature: parseInt(temperature),
                            available: true
                        });
                    });
                }
            }
        } catch (err) {
            console.log('[ResourceManager] GPU detection error:', err.message);
        }
        
        return gpus;
    }
    
    /**
     * 检测CPU特性
     */
    async detectCPUFeatures() {
        const features = [];
        
        try {
            if (this.isWindows) {
                // Windows: Use wmic
                const result = execSync('wmic cpu get Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed /format:csv', {
                    encoding: 'utf8',
                    timeout: 5000
                });
                
                // Parse CSV output
                const lines = result.split('\n').filter(line => line.trim() && !line.startsWith('Node'));
                if (lines.length > 0) {
                    const data = lines[0].split(',');
                    features.push({
                        physicalCores: parseInt(data[2]) || os.cpus().length,
                        logicalCores: parseInt(data[3]) || os.cpus().length,
                        maxSpeed: parseInt(data[1]) || os.cpus()[0]?.speed || 0
                    });
                }
                
            } else if (this.isMac) {
                // Mac: Use sysctl
                const physicalCores = execSync('sysctl -n hw.physicalcpu', { encoding: 'utf8', timeout: 3000 }).trim();
                const logicalCores = execSync('sysctl -n hw.logicalcpu', { encoding: 'utf8', timeout: 3000 }).trim();
                
                features.push({
                    physicalCores: parseInt(physicalCores) || os.cpus().length,
                    logicalCores: parseInt(logicalCores) || os.cpus().length,
                    hyperthreading: parseInt(logicalCores) > parseInt(physicalCores)
                });
                
            } else {
                // Linux: Use /proc/cpuinfo
                const result = execSync('lscpu | grep -E "^CPU\\(s\\)|^Core\\(s\\) per socket|^Socket\\(s\\)"', {
                    encoding: 'utf8',
                    timeout: 3000
                });
                
                const lines = result.split('\n');
                let totalCPUs = 0, coresPerSocket = 0, sockets = 0;
                
                lines.forEach(line => {
                    if (line.includes('CPU(s):')) {
                        totalCPUs = parseInt(line.split(':')[1].trim());
                    } else if (line.includes('Core(s) per socket:')) {
                        coresPerSocket = parseInt(line.split(':')[1].trim());
                    } else if (line.includes('Socket(s):')) {
                        sockets = parseInt(line.split(':')[1].trim());
                    }
                });
                
                features.push({
                    physicalCores: coresPerSocket * sockets || os.cpus().length,
                    logicalCores: totalCPUs || os.cpus().length,
                    sockets: sockets || 1,
                    hyperthreading: totalCPUs > (coresPerSocket * sockets)
                });
            }
            
        } catch (err) {
            console.log('[ResourceManager] CPU features detection error:', err.message);
            features.push({
                physicalCores: os.cpus().length,
                logicalCores: os.cpus().length,
                hyperthreading: false
            });
        }
        
        return features;
    }
    
    /**
     * 检测NUMA拓扑结构
     */
    async detectNUMATopology() {
        const topology = {
            nodes: [],
            isNUMA: false
        };
        
        try {
            if (this.isLinux) {
                // Linux: Use numactl
                const result = execSync('numactl --hardware 2>/dev/null || echo "NUMA not available"', {
                    encoding: 'utf8',
                    timeout: 5000
                });
                
                if (!result.includes('NUMA not available')) {
                    const lines = result.split('\n');
                    let currentNode = null;
                    
                    lines.forEach(line => {
                        if (line.startsWith('node ')) {
                            const match = line.match(/node (\d+) cpus: ([\d\s]+)/);
                            if (match) {
                                const nodeId = parseInt(match[1]);
                                const cpus = match[2].trim().split(/\s+/).map(cpu => parseInt(cpu));
                                
                                topology.nodes.push({
                                    id: nodeId,
                                    cpus: cpus,
                                    availableCores: cpus.length,
                                    memoryBanks: [`node${nodeId}`]
                                });
                            }
                        }
                    });
                    
                    topology.isNUMA = topology.nodes.length > 1;
                }
                
            } else if (this.isWindows) {
                // Windows: Use wmic to detect NUMA
                const result = execSync('wmic computersystem get NumberOfProcessors,NumberOfLogicalProcessors /format:csv', {
                    encoding: 'utf8',
                    timeout: 5000
                });
                
                // Windows NUMA detection is complex, use simple approach
                const cpuCount = os.cpus().length;
                if (cpuCount > 8) {
                    // Assume NUMA for systems with >8 cores
                    const nodesCount = Math.ceil(cpuCount / 8);
                    const coresPerNode = Math.floor(cpuCount / nodesCount);
                    
                    for (let i = 0; i < nodesCount; i++) {
                        const startCpu = i * coresPerNode;
                        const endCpu = Math.min(startCpu + coresPerNode, cpuCount);
                        const cpus = Array.from({ length: endCpu - startCpu }, (_, idx) => startCpu + idx);
                        
                        topology.nodes.push({
                            id: i,
                            cpus: cpus,
                            availableCores: cpus.length,
                            memoryBanks: [`node${i}`]
                        });
                    }
                    
                    topology.isNUMA = true;
                }
            }
            
            // Fallback: Single node
            if (topology.nodes.length === 0) {
                topology.nodes.push({
                    id: 0,
                    cpus: Array.from({ length: os.cpus().length }, (_, i) => i),
                    availableCores: os.cpus().length,
                    memoryBanks: ['node0']
                });
            }
            
        } catch (err) {
            console.log('[ResourceManager] NUMA detection error:', err.message);
            // Default single node
            topology.nodes.push({
                id: 0,
                cpus: Array.from({ length: os.cpus().length }, (_, i) => i),
                availableCores: os.cpus().length,
                memoryBanks: ['node0']
            });
        }
        
        return topology;
    }
    
    /**
     * 计算资源限制
     */
    calculateResourceLimits() {
        const totalMemory = os.totalmem();
        const totalCPUs = os.cpus().length;
        
        // Conservative limits to prevent system overload
        const limits = {
            cpu: {
                maxUsage: 0.9,              // 90% max CPU usage
                maxWorkers: Math.max(1, totalCPUs - 1), // Leave 1 core for system
                throttleThreshold: 0.85     // Start throttling at 85%
            },
            memory: {
                maxUsage: 0.8,              // 80% max memory usage
                maxAllocation: Math.floor(totalMemory * 0.8),
                batchSizeLimit: Math.floor(totalMemory * 0.1), // 10% for batch processing
                cacheLimit: Math.floor(totalMemory * 0.2)      // 20% for caching
            },
            gpu: {
                maxUsage: 0.95,             // 95% max GPU usage
                memoryReserve: 0.1,         // Reserve 10% GPU memory
                temperatureLimit: 85        // 85°C temperature limit
            },
            disk: {
                tempSpaceLimit: this.getTempDiskSpace() * 0.5, // 50% of temp space
                ioThrottleThreshold: 100 * 1024 * 1024         // 100MB/s I/O threshold
            }
        };
        
        // Adjust limits based on hardware
        if (totalMemory < 4 * 1024 * 1024 * 1024) { // < 4GB RAM
            limits.memory.maxUsage = 0.7;
            limits.cpu.maxWorkers = Math.max(1, Math.floor(totalCPUs / 2));
        }
        
        if (totalCPUs <= 2) {
            limits.cpu.maxWorkers = 1;
            limits.cpu.maxUsage = 0.8;
        }
        
        return limits;
    }
    
    /**
     * 获取临时磁盘空间
     */
    getTempDiskSpace() {
        try {
            if (this.isWindows) {
                const result = execSync('dir /-c %TEMP% 2>nul | find "bytes free"', {
                    encoding: 'utf8',
                    timeout: 3000
                });
                
                const match = result.match(/([\d,]+) bytes free/);
                if (match) {
                    return parseInt(match[1].replace(/,/g, ''));
                }
                
            } else {
                const result = execSync('df /tmp | tail -1 | awk \'{print $4}\'', {
                    encoding: 'utf8',
                    timeout: 3000
                });
                
                const kb = parseInt(result.trim());
                if (!isNaN(kb)) {
                    return kb * 1024; // Convert KB to bytes
                }
            }
        } catch (err) {
            console.log('[ResourceManager] Disk space detection error:', err.message);
        }
        
        // Default: 1GB
        return 1024 * 1024 * 1024;
    }
    
    /**
     * 动态分配资源
     */
    async allocateResources(taskType, priority = 'medium', requirements = {}) {
        const strategy = this.strategies[taskType] || this.strategies['batch_processing'];
        const taskId = `${taskType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('[ResourceManager] Allocating resources for task:', taskType, 'priority:', priority);
        
        // Calculate available resources
        const available = this.getAvailableResources();
        
        // Calculate allocation based on strategy and requirements
        const allocation = {
            taskId,
            taskType,
            priority,
            cpu: {
                workers: this.calculateCPUAllocation(strategy, available, requirements),
                affinity: this.calculateCPUAffinity(strategy, available)
            },
            memory: {
                limit: this.calculateMemoryAllocation(strategy, available, requirements),
                batchSize: this.calculateOptimalBatchSize(strategy, available)
            },
            gpu: {
                enabled: this.shouldUseGPU(strategy, available),
                memoryLimit: this.calculateGPUMemoryAllocation(strategy, available)
            },
            disk: {
                tempSpace: this.calculateDiskAllocation(strategy, available),
                cacheEnabled: available.memory.free > this.resourceLimits.memory.cacheLimit
            }
        };
        
        // Apply allocation
        this.applyAllocation(taskId, allocation);
        
        console.log('[ResourceManager] Resource allocation:', allocation);
        return allocation;
    }
    
    /**
     * 计算CPU分配
     */
    calculateCPUAllocation(strategy, available, requirements) {
        const maxWorkers = this.resourceLimits.cpu.maxWorkers;
        const requestedWorkers = requirements.cpuWorkers || Math.floor(maxWorkers * strategy.cpuWeight);
        
        // Adjust based on available resources
        const availableWorkers = Math.floor(available.cpu.free * maxWorkers);
        const allocatedWorkers = Math.min(requestedWorkers, availableWorkers, maxWorkers);
        
        return Math.max(1, allocatedWorkers);
    }
    
    /**
     * 计算CPU亲和性
     */
    calculateCPUAffinity(strategy, available) {
        if (!this.numaTopology.isNUMA) {
            return null; // No NUMA, no specific affinity needed
        }
        
        // For NUMA systems, prefer to allocate cores from the same node
        const preferredNode = this.numaTopology.nodes.find(node => 
            node.availableCores >= 2
        ) || this.numaTopology.nodes[0];
        
        return {
            numaNode: preferredNode.id,
            cpuList: preferredNode.cpus.slice(0, Math.min(4, preferredNode.availableCores))
        };
    }
    
    /**
     * 计算内存分配
     */
    calculateMemoryAllocation(strategy, available, requirements) {
        const maxMemory = this.resourceLimits.memory.maxAllocation;
        const requestedMemory = requirements.memory || Math.floor(maxMemory * strategy.memoryWeight);
        
        // Ensure we don't exceed available memory
        const availableMemory = Math.floor(available.memory.free * 0.8); // Leave 20% buffer
        const allocatedMemory = Math.min(requestedMemory, availableMemory, maxMemory);
        
        return Math.max(100 * 1024 * 1024, allocatedMemory); // Minimum 100MB
    }
    
    /**
     * 计算最优批次大小
     */
    calculateOptimalBatchSize(strategy, available) {
        const memoryLimit = this.resourceLimits.memory.batchSizeLimit;
        const availableMemory = available.memory.free;
        
        // Base batch size on available memory and task type
        let batchSize;
        if (strategy.memoryWeight > 0.6) {
            // Memory-intensive tasks
            batchSize = Math.min(1000, Math.floor(availableMemory / (1024 * 1024))); // 1MB per item
        } else {
            // CPU-intensive tasks
            batchSize = Math.min(10000, Math.floor(availableMemory / (100 * 1024))); // 100KB per item
        }
        
        return Math.max(10, batchSize);
    }
    
    /**
     * 判断是否应该使用GPU
     */
    shouldUseGPU(strategy, available) {
        if (this.hardwareConfig.gpus.length === 0) {
            return false;
        }
        
        const gpu = this.hardwareConfig.gpus[0];
        return strategy.gpuWeight > 0.3 && 
               gpu.available && 
               gpu.utilization < this.resourceLimits.gpu.maxUsage &&
               gpu.temperature < this.resourceLimits.gpu.temperatureLimit;
    }
    
    /**
     * 计算GPU内存分配
     */
    calculateGPUMemoryAllocation(strategy, available) {
        if (this.hardwareConfig.gpus.length === 0) {
            return 0;
        }
        
        const gpu = this.hardwareConfig.gpus[0];
        const reserveMemory = gpu.memory.total * this.resourceLimits.gpu.memoryReserve;
        const availableMemory = gpu.memory.free - reserveMemory;
        
        return Math.floor(availableMemory * strategy.gpuWeight);
    }
    
    /**
     * 计算磁盘分配
     */
    calculateDiskAllocation(strategy, available) {
        const maxDiskSpace = this.resourceLimits.disk.tempSpaceLimit;
        const requestedSpace = Math.floor(maxDiskSpace * 0.3); // 30% of available temp space
        
        return Math.min(requestedSpace, available.disk.free);
    }
    
    /**
     * 应用资源分配
     */
    applyAllocation(taskId, allocation) {
        this.currentAllocations.set(taskId, {
            ...allocation,
            allocatedAt: Date.now(),
            lastUpdated: Date.now()
        });
        
        // Update total allocated resources
        this.totalAllocated.cpu += allocation.cpu.workers / this.resourceLimits.cpu.maxWorkers;
        this.totalAllocated.memory += allocation.memory.limit / this.resourceLimits.memory.maxAllocation;
        this.totalAllocated.gpu += allocation.gpu.enabled ? 0.5 : 0;
    }
    
    /**
     * 释放资源分配
     */
    releaseResources(taskId) {
        const allocation = this.currentAllocations.get(taskId);
        if (!allocation) {
            console.log('[ResourceManager] No allocation found for task:', taskId);
            return;
        }
        
        // Update total allocated resources
        this.totalAllocated.cpu -= allocation.cpu.workers / this.resourceLimits.cpu.maxWorkers;
        this.totalAllocated.memory -= allocation.memory.limit / this.resourceLimits.memory.maxAllocation;
        this.totalAllocated.gpu -= allocation.gpu.enabled ? 0.5 : 0;
        
        // Ensure totals don't go negative
        this.totalAllocated.cpu = Math.max(0, this.totalAllocated.cpu);
        this.totalAllocated.memory = Math.max(0, this.totalAllocated.memory);
        this.totalAllocated.gpu = Math.max(0, this.totalAllocated.gpu);
        
        this.currentAllocations.delete(taskId);
        console.log('[ResourceManager] Released resources for task:', taskId);
    }
    
    /**
     * 获取可用资源
     */
    getAvailableResources() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        
        return {
            cpu: {
                total: os.cpus().length,
                free: Math.max(0, 1 - this.totalAllocated.cpu),
                usage: this.totalAllocated.cpu
            },
            memory: {
                total: totalMemory,
                free: freeMemory,
                used: totalMemory - freeMemory,
                allocated: this.totalAllocated.memory
            },
            gpu: {
                available: this.hardwareConfig.gpus.length > 0,
                free: this.hardwareConfig.gpus.length > 0 ? Math.max(0, 1 - this.totalAllocated.gpu) : 0,
                devices: this.hardwareConfig.gpus
            },
            disk: {
                free: this.getTempDiskSpace(),
                tempPath: os.tmpdir()
            }
        };
    }
    
    /**
     * NUMA感知线程分配
     */
    allocateNUMAThreads(threadCount) {
        if (!this.numaTopology.isNUMA) {
            // Non-NUMA system, return simple allocation
            return [{
                nodeId: 0,
                threadCount: threadCount,
                cpuList: Array.from({ length: Math.min(threadCount, os.cpus().length) }, (_, i) => i),
                memoryAffinity: ['node0']
            }];
        }
        
        const allocations = [];
        let remainingThreads = threadCount;
        
        // Distribute threads across NUMA nodes
        for (const node of this.numaTopology.nodes) {
            if (remainingThreads <= 0) break;
            
            const nodeThreads = Math.min(remainingThreads, node.availableCores);
            if (nodeThreads > 0) {
                allocations.push({
                    nodeId: node.id,
                    threadCount: nodeThreads,
                    cpuList: node.cpus.slice(0, nodeThreads),
                    memoryAffinity: node.memoryBanks
                });
                
                remainingThreads -= nodeThreads;
            }
        }
        
        return allocations;
    }
    
    /**
     * 监控资源使用情况
     */
    async monitorResourceUsage() {
        const usage = {
            timestamp: Date.now(),
            cpu: await this.getCurrentCPUUsage(),
            memory: this.getCurrentMemoryUsage(),
            gpu: await this.getCurrentGPUUsage(),
            allocations: Array.from(this.currentAllocations.entries()).map(([taskId, allocation]) => ({
                taskId,
                taskType: allocation.taskType,
                priority: allocation.priority,
                age: Date.now() - allocation.allocatedAt
            }))
        };
        
        return usage;
    }
    
    /**
     * 获取当前CPU使用率
     */
    async getCurrentCPUUsage() {
        return new Promise((resolve) => {
            const startMeasure = os.cpus();
            
            setTimeout(() => {
                const endMeasure = os.cpus();
                let totalIdle = 0;
                let totalTick = 0;
                
                for (let i = 0; i < endMeasure.length; i++) {
                    const startCpu = startMeasure[i];
                    const endCpu = endMeasure[i];
                    
                    const startTotal = Object.values(startCpu.times).reduce((a, b) => a + b);
                    const endTotal = Object.values(endCpu.times).reduce((a, b) => a + b);
                    
                    const idleDiff = endCpu.times.idle - startCpu.times.idle;
                    const totalDiff = endTotal - startTotal;
                    
                    totalIdle += idleDiff;
                    totalTick += totalDiff;
                }
                
                const usage = 1 - (totalIdle / totalTick);
                resolve(Math.max(0, Math.min(1, usage)));
            }, 100);
        });
    }
    
    /**
     * 获取当前内存使用率
     */
    getCurrentMemoryUsage() {
        const total = os.totalmem();
        const free = os.freemem();
        return {
            total,
            free,
            used: total - free,
            usage: (total - free) / total
        };
    }
    
    /**
     * 获取当前GPU使用率
     */
    async getCurrentGPUUsage() {
        if (this.hardwareConfig.gpus.length === 0) {
            return { available: false, devices: [] };
        }
        
        try {
            // Refresh GPU information
            const gpus = await this.detectGPUConfiguration();
            return { available: true, devices: gpus };
        } catch (err) {
            return { available: false, devices: [], error: err.message };
        }
    }
    
    /**
     * 获取默认硬件配置
     */
    getDefaultHardwareConfig() {
        return {
            platform: this.platform,
            architecture: os.arch(),
            cpus: {
                count: os.cpus().length,
                model: 'Unknown',
                speed: 0,
                cores: os.cpus().length
            },
            memory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem()
            },
            gpus: [],
            storage: {
                temp: 1024 * 1024 * 1024 // 1GB default
            }
        };
    }
    
    /**
     * 获取默认资源限制
     */
    getDefaultResourceLimits() {
        const totalMemory = os.totalmem();
        const totalCPUs = os.cpus().length;
        
        return {
            cpu: {
                maxUsage: 0.8,
                maxWorkers: Math.max(1, totalCPUs - 1),
                throttleThreshold: 0.7
            },
            memory: {
                maxUsage: 0.7,
                maxAllocation: Math.floor(totalMemory * 0.7),
                batchSizeLimit: Math.floor(totalMemory * 0.1),
                cacheLimit: Math.floor(totalMemory * 0.2)
            },
            gpu: {
                maxUsage: 0.9,
                memoryReserve: 0.1,
                temperatureLimit: 80
            },
            disk: {
                tempSpaceLimit: 1024 * 1024 * 1024,
                ioThrottleThreshold: 50 * 1024 * 1024
            }
        };
    }
    
    /**
     * 获取默认NUMA拓扑
     */
    getDefaultNUMATopology() {
        return {
            nodes: [{
                id: 0,
                cpus: Array.from({ length: os.cpus().length }, (_, i) => i),
                availableCores: os.cpus().length,
                memoryBanks: ['node0']
            }],
            isNUMA: false
        };
    }
    
    /**
     * 获取资源管理器状态
     */
    getStatus() {
        return {
            hardwareConfig: this.hardwareConfig,
            resourceLimits: this.resourceLimits,
            numaTopology: this.numaTopology,
            currentAllocations: Array.from(this.currentAllocations.entries()),
            totalAllocated: this.totalAllocated,
            availableResources: this.getAvailableResources()
        };
    }
    
    /**
     * 清理资源管理器
     */
    dispose() {
        // Release all allocations
        for (const taskId of this.currentAllocations.keys()) {
            this.releaseResources(taskId);
        }
        
        console.log('[ResourceManager] Disposed');
    }
}

export default ResourceManager;