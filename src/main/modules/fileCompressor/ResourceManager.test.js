/**
 * ResourceManager Unit Tests
 * 
 * 测试资源分配算法的正确性和边界条件
 * 验证 Property 1: Resource Usage Bounds
 */

import { jest } from '@jest/globals';
import os from 'os';
import ResourceManager from './ResourceManager.js';

// Mock os module
jest.mock('os');
jest.mock('child_process');

describe('ResourceManager', () => {
    let resourceManager;
    
    beforeEach(() => {
        // Mock os functions
        os.cpus.mockReturnValue(Array(8).fill({ model: 'Test CPU', speed: 3000 }));
        os.totalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
        os.freemem.mockReturnValue(8 * 1024 * 1024 * 1024);   // 8GB free
        os.arch.mockReturnValue('x64');
        os.tmpdir.mockReturnValue('/tmp');
        
        // Mock process.platform
        Object.defineProperty(process, 'platform', {
            value: 'linux',
            writable: true
        });
        
        resourceManager = new ResourceManager();
        
        // Set up test hardware config
        resourceManager.hardwareConfig = {
            platform: 'linux',
            architecture: 'x64',
            cpus: {
                count: 8,
                model: 'Test CPU',
                speed: 3000,
                cores: 8
            },
            memory: {
                total: 16 * 1024 * 1024 * 1024,
                free: 8 * 1024 * 1024 * 1024,
                used: 8 * 1024 * 1024 * 1024
            },
            gpus: [{
                index: 0,
                name: 'Test GPU',
                memory: {
                    total: 8 * 1024 * 1024 * 1024,
                    free: 6 * 1024 * 1024 * 1024,
                    used: 2 * 1024 * 1024 * 1024
                },
                utilization: 0.2,
                temperature: 65,
                available: true
            }],
            storage: {
                temp: 100 * 1024 * 1024 * 1024 // 100GB
            }
        };
        
        resourceManager.resourceLimits = {
            cpu: {
                maxUsage: 0.9,
                maxWorkers: 7,
                throttleThreshold: 0.85
            },
            memory: {
                maxUsage: 0.8,
                maxAllocation: 12 * 1024 * 1024 * 1024, // 12GB
                batchSizeLimit: 1.6 * 1024 * 1024 * 1024, // 1.6GB
                cacheLimit: 3.2 * 1024 * 1024 * 1024      // 3.2GB
            },
            gpu: {
                maxUsage: 0.95,
                memoryReserve: 0.1,
                temperatureLimit: 85
            },
            disk: {
                tempSpaceLimit: 50 * 1024 * 1024 * 1024,
                ioThrottleThreshold: 100 * 1024 * 1024
            }
        };
        
        resourceManager.numaTopology = {
            nodes: [{
                id: 0,
                cpus: [0, 1, 2, 3, 4, 5, 6, 7],
                availableCores: 8,
                memoryBanks: ['node0']
            }],
            isNUMA: false
        };
    });
    
    afterEach(() => {
        if (resourceManager) {
            resourceManager.dispose();
        }
        jest.clearAllMocks();
    });
    
    describe('Resource Allocation', () => {
        test('should allocate resources within limits for GPU crack task', async () => {
            const allocation = await resourceManager.allocateResources('gpu_crack', 'high');
            
            // Property 1: Resource Usage Bounds - CPU
            expect(allocation.cpu.workers).toBeGreaterThan(0);
            expect(allocation.cpu.workers).toBeLessThanOrEqual(resourceManager.resourceLimits.cpu.maxWorkers);
            
            // Property 1: Resource Usage Bounds - Memory
            expect(allocation.memory.limit).toBeGreaterThan(0);
            expect(allocation.memory.limit).toBeLessThanOrEqual(resourceManager.resourceLimits.memory.maxAllocation);
            
            // GPU should be enabled for GPU crack task
            expect(allocation.gpu.enabled).toBe(true);
            
            // Task type should be preserved
            expect(allocation.taskType).toBe('gpu_crack');
            expect(allocation.priority).toBe('high');
        });
        
        test('should allocate resources within limits for CPU crack task', async () => {
            const allocation = await resourceManager.allocateResources('cpu_crack', 'high');
            
            // Property 1: Resource Usage Bounds - CPU (should get more CPU for CPU task)
            expect(allocation.cpu.workers).toBeGreaterThan(0);
            expect(allocation.cpu.workers).toBeLessThanOrEqual(resourceManager.resourceLimits.cpu.maxWorkers);
            
            // Property 1: Resource Usage Bounds - Memory
            expect(allocation.memory.limit).toBeGreaterThan(0);
            expect(allocation.memory.limit).toBeLessThanOrEqual(resourceManager.resourceLimits.memory.maxAllocation);
            
            // CPU task should get more CPU workers than GPU task
            const gpuAllocation = await resourceManager.allocateResources('gpu_crack', 'high');
            expect(allocation.cpu.workers).toBeGreaterThanOrEqual(gpuAllocation.cpu.workers);
        });
        
        test('should respect memory constraints', async () => {
            const requirements = {
                memory: 20 * 1024 * 1024 * 1024 // Request 20GB (more than limit)
            };
            
            const allocation = await resourceManager.allocateResources('ai_generation', 'medium', requirements);
            
            // Should not exceed memory limits
            expect(allocation.memory.limit).toBeLessThanOrEqual(resourceManager.resourceLimits.memory.maxAllocation);
            expect(allocation.memory.limit).toBeGreaterThan(100 * 1024 * 1024); // At least 100MB
        });
        
        test('should handle low memory scenarios', async () => {
            // Simulate low memory
            os.freemem.mockReturnValue(512 * 1024 * 1024); // Only 512MB free
            
            const allocation = await resourceManager.allocateResources('cpu_crack', 'high');
            
            // Should still allocate some memory
            expect(allocation.memory.limit).toBeGreaterThan(100 * 1024 * 1024); // At least 100MB
            expect(allocation.memory.batchSize).toBeGreaterThan(10); // At least 10 items
        });
        
        test('should handle systems without GPU', async () => {
            // Remove GPU from hardware config
            resourceManager.hardwareConfig.gpus = [];
            
            const allocation = await resourceManager.allocateResources('gpu_crack', 'high');
            
            // GPU should be disabled
            expect(allocation.gpu.enabled).toBe(false);
            expect(allocation.gpu.memoryLimit).toBe(0);
        });
        
        test('should prevent resource over-allocation', async () => {
            // Allocate multiple tasks
            const allocation1 = await resourceManager.allocateResources('gpu_crack', 'high');
            const allocation2 = await resourceManager.allocateResources('cpu_crack', 'high');
            const allocation3 = await resourceManager.allocateResources('ai_generation', 'medium');
            
            // Total allocated CPU should not exceed 100%
            const totalCPUUsage = resourceManager.totalAllocated.cpu;
            expect(totalCPUUsage).toBeLessThanOrEqual(1.0);
            
            // Total allocated memory should not exceed limits
            const totalMemoryUsage = resourceManager.totalAllocated.memory;
            expect(totalMemoryUsage).toBeLessThanOrEqual(1.0);
        });
    });
    
    describe('Resource Release', () => {
        test('should properly release allocated resources', async () => {
            const allocation = await resourceManager.allocateResources('gpu_crack', 'high');
            const initialCPU = resourceManager.totalAllocated.cpu;
            const initialMemory = resourceManager.totalAllocated.memory;
            
            resourceManager.releaseResources(allocation.taskId);
            
            // Resources should be released
            expect(resourceManager.totalAllocated.cpu).toBeLessThan(initialCPU);
            expect(resourceManager.totalAllocated.memory).toBeLessThan(initialMemory);
            expect(resourceManager.currentAllocations.has(allocation.taskId)).toBe(false);
        });
        
        test('should handle release of non-existent task', () => {
            const initialCPU = resourceManager.totalAllocated.cpu;
            const initialMemory = resourceManager.totalAllocated.memory;
            
            // Should not throw error
            expect(() => {
                resourceManager.releaseResources('non-existent-task');
            }).not.toThrow();
            
            // Totals should remain unchanged
            expect(resourceManager.totalAllocated.cpu).toBe(initialCPU);
            expect(resourceManager.totalAllocated.memory).toBe(initialMemory);
        });
        
        test('should prevent negative resource totals', async () => {
            const allocation = await resourceManager.allocateResources('gpu_crack', 'high');
            
            // Manually corrupt totals to test bounds
            resourceManager.totalAllocated.cpu = 0.1;
            resourceManager.totalAllocated.memory = 0.1;
            
            resourceManager.releaseResources(allocation.taskId);
            
            // Should not go negative
            expect(resourceManager.totalAllocated.cpu).toBeGreaterThanOrEqual(0);
            expect(resourceManager.totalAllocated.memory).toBeGreaterThanOrEqual(0);
            expect(resourceManager.totalAllocated.gpu).toBeGreaterThanOrEqual(0);
        });
    });
    
    describe('NUMA Thread Allocation', () => {
        test('should allocate threads for non-NUMA system', () => {
            const allocations = resourceManager.allocateNUMAThreads(4);
            
            expect(allocations).toHaveLength(1);
            expect(allocations[0].nodeId).toBe(0);
            expect(allocations[0].threadCount).toBe(4);
            expect(allocations[0].cpuList).toHaveLength(4);
        });
        
        test('should allocate threads across NUMA nodes', () => {
            // Set up NUMA topology
            resourceManager.numaTopology = {
                nodes: [
                    { id: 0, cpus: [0, 1, 2, 3], availableCores: 4, memoryBanks: ['node0'] },
                    { id: 1, cpus: [4, 5, 6, 7], availableCores: 4, memoryBanks: ['node1'] }
                ],
                isNUMA: true
            };
            
            const allocations = resourceManager.allocateNUMAThreads(6);
            
            expect(allocations.length).toBeGreaterThan(0);
            
            // Should distribute threads across nodes
            const totalThreads = allocations.reduce((sum, alloc) => sum + alloc.threadCount, 0);
            expect(totalThreads).toBe(6);
            
            // Each allocation should have valid node ID and CPU list
            allocations.forEach(alloc => {
                expect(alloc.nodeId).toBeGreaterThanOrEqual(0);
                expect(alloc.threadCount).toBeGreaterThan(0);
                expect(alloc.cpuList).toHaveLength(alloc.threadCount);
                expect(alloc.memoryAffinity).toContain(`node${alloc.nodeId}`);
            });
        });
        
        test('should handle thread count exceeding available cores', () => {
            const allocations = resourceManager.allocateNUMAThreads(16); // More than 8 cores
            
            const totalThreads = allocations.reduce((sum, alloc) => sum + alloc.threadCount, 0);
            expect(totalThreads).toBeLessThanOrEqual(8); // Should not exceed available cores
        });
    });
    
    describe('Resource Monitoring', () => {
        test('should monitor resource usage', async () => {
            // Allocate some resources first
            await resourceManager.allocateResources('gpu_crack', 'high');
            await resourceManager.allocateResources('cpu_crack', 'medium');
            
            const usage = await resourceManager.monitorResourceUsage();
            
            expect(usage).toHaveProperty('timestamp');
            expect(usage).toHaveProperty('cpu');
            expect(usage).toHaveProperty('memory');
            expect(usage).toHaveProperty('gpu');
            expect(usage).toHaveProperty('allocations');
            
            expect(usage.allocations).toHaveLength(2);
            usage.allocations.forEach(alloc => {
                expect(alloc).toHaveProperty('taskId');
                expect(alloc).toHaveProperty('taskType');
                expect(alloc).toHaveProperty('priority');
                expect(alloc).toHaveProperty('age');
                expect(alloc.age).toBeGreaterThanOrEqual(0);
            });
        });
        
        test('should get available resources', () => {
            const available = resourceManager.getAvailableResources();
            
            expect(available).toHaveProperty('cpu');
            expect(available).toHaveProperty('memory');
            expect(available).toHaveProperty('gpu');
            expect(available).toHaveProperty('disk');
            
            // CPU
            expect(available.cpu.total).toBe(8);
            expect(available.cpu.free).toBeGreaterThanOrEqual(0);
            expect(available.cpu.free).toBeLessThanOrEqual(1);
            
            // Memory
            expect(available.memory.total).toBeGreaterThan(0);
            expect(available.memory.free).toBeGreaterThanOrEqual(0);
            
            // GPU
            expect(available.gpu).toHaveProperty('available');
            expect(available.gpu).toHaveProperty('devices');
            
            // Disk
            expect(available.disk).toHaveProperty('free');
            expect(available.disk).toHaveProperty('tempPath');
        });
    });
    
    describe('Edge Cases and Error Handling', () => {
        test('should handle zero CPU cores gracefully', () => {
            os.cpus.mockReturnValue([]);
            
            const newManager = new ResourceManager();
            newManager.hardwareConfig = { ...resourceManager.hardwareConfig };
            newManager.hardwareConfig.cpus.count = 0;
            newManager.hardwareConfig.cpus.cores = 0;
            newManager.resourceLimits = { ...resourceManager.resourceLimits };
            newManager.resourceLimits.cpu.maxWorkers = 0;
            
            expect(() => {
                newManager.allocateResources('cpu_crack', 'high');
            }).not.toThrow();
        });
        
        test('should handle zero memory gracefully', () => {
            os.totalmem.mockReturnValue(0);
            os.freemem.mockReturnValue(0);
            
            const allocation = resourceManager.allocateResources('cpu_crack', 'high');
            
            expect(allocation).resolves.toHaveProperty('memory');
        });
        
        test('should handle invalid task types', async () => {
            const allocation = await resourceManager.allocateResources('invalid_task', 'high');
            
            // Should use default strategy
            expect(allocation.taskType).toBe('invalid_task');
            expect(allocation).toHaveProperty('cpu');
            expect(allocation).toHaveProperty('memory');
            expect(allocation).toHaveProperty('gpu');
        });
        
        test('should handle resource limits correctly', async () => {
            // Set very restrictive limits
            resourceManager.resourceLimits.cpu.maxWorkers = 1;
            resourceManager.resourceLimits.memory.maxAllocation = 100 * 1024 * 1024; // 100MB
            
            const allocation = await resourceManager.allocateResources('gpu_crack', 'high');
            
            expect(allocation.cpu.workers).toBeLessThanOrEqual(1);
            expect(allocation.memory.limit).toBeLessThanOrEqual(100 * 1024 * 1024);
        });
    });
    
    describe('Performance and Efficiency', () => {
        test('should calculate optimal batch sizes', async () => {
            const allocation = await resourceManager.allocateResources('ai_generation', 'medium');
            
            expect(allocation.memory.batchSize).toBeGreaterThan(10);
            expect(allocation.memory.batchSize).toBeLessThan(100000);
        });
        
        test('should prefer GPU for GPU-intensive tasks', async () => {
            const gpuAllocation = await resourceManager.allocateResources('gpu_crack', 'high');
            const cpuAllocation = await resourceManager.allocateResources('cpu_crack', 'high');
            
            expect(gpuAllocation.gpu.enabled).toBe(true);
            expect(cpuAllocation.cpu.workers).toBeGreaterThanOrEqual(gpuAllocation.cpu.workers);
        });
        
        test('should handle high temperature GPU gracefully', async () => {
            // Simulate overheated GPU
            resourceManager.hardwareConfig.gpus[0].temperature = 90; // Above limit
            
            const allocation = await resourceManager.allocateResources('gpu_crack', 'high');
            
            // Should disable GPU due to temperature
            expect(allocation.gpu.enabled).toBe(false);
        });
    });
    
    describe('Status and Cleanup', () => {
        test('should provide comprehensive status', () => {
            const status = resourceManager.getStatus();
            
            expect(status).toHaveProperty('hardwareConfig');
            expect(status).toHaveProperty('resourceLimits');
            expect(status).toHaveProperty('numaTopology');
            expect(status).toHaveProperty('currentAllocations');
            expect(status).toHaveProperty('totalAllocated');
            expect(status).toHaveProperty('availableResources');
        });
        
        test('should dispose properly', async () => {
            // Allocate some resources
            await resourceManager.allocateResources('gpu_crack', 'high');
            await resourceManager.allocateResources('cpu_crack', 'medium');
            
            expect(resourceManager.currentAllocations.size).toBe(2);
            
            resourceManager.dispose();
            
            expect(resourceManager.currentAllocations.size).toBe(0);
            expect(resourceManager.totalAllocated.cpu).toBe(0);
            expect(resourceManager.totalAllocated.memory).toBe(0);
            expect(resourceManager.totalAllocated.gpu).toBe(0);
        });
    });
});