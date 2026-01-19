/**
 * GPU 优化器
 * 
 * 功能：
 * 1. 检测GPU型号和性能
 * 2. 自动设置最优hashcat参数
 * 3. 多GPU支持检测
 * 4. 温度和负载监控
 * 
 * 科学原理：
 * - 硬件感知优化：根据实际硬件调整参数
 * - 自适应调节：运行时动态调整
 */

import { execSync, spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

class GPUOptimizer {
    constructor(hashcatPath) {
        this.hashcatPath = hashcatPath;
        this.gpuInfo = null;
        this.optimalParams = null;

        // GPU型号性能映射（基准速度，单位：MH/s for MD5）
        this.gpuPerformanceMap = {
            // NVIDIA RTX 40 系列
            'RTX 4090': { tier: 'ultra', workload: 4, batchSize: 1024 },
            'RTX 4080': { tier: 'ultra', workload: 4, batchSize: 1024 },
            'RTX 4070': { tier: 'high', workload: 4, batchSize: 512 },
            'RTX 4060': { tier: 'high', workload: 3, batchSize: 512 },

            // NVIDIA RTX 30 系列
            'RTX 3090': { tier: 'ultra', workload: 4, batchSize: 1024 },
            'RTX 3080': { tier: 'ultra', workload: 4, batchSize: 1024 },
            'RTX 3070': { tier: 'high', workload: 4, batchSize: 512 },
            'RTX 3060': { tier: 'high', workload: 3, batchSize: 512 },
            'RTX 3050': { tier: 'medium', workload: 3, batchSize: 256 },

            // NVIDIA RTX 20 系列
            'RTX 2080': { tier: 'high', workload: 4, batchSize: 512 },
            'RTX 2070': { tier: 'high', workload: 3, batchSize: 512 },
            'RTX 2060': { tier: 'medium', workload: 3, batchSize: 256 },

            // NVIDIA GTX 系列
            'GTX 1080': { tier: 'medium', workload: 3, batchSize: 256 },
            'GTX 1070': { tier: 'medium', workload: 3, batchSize: 256 },
            'GTX 1060': { tier: 'low', workload: 2, batchSize: 128 },
            'GTX 1050': { tier: 'low', workload: 2, batchSize: 128 },

            // AMD 系列
            'RX 7900': { tier: 'ultra', workload: 4, batchSize: 1024 },
            'RX 7800': { tier: 'high', workload: 4, batchSize: 512 },
            'RX 7700': { tier: 'high', workload: 3, batchSize: 512 },
            'RX 6900': { tier: 'ultra', workload: 4, batchSize: 1024 },
            'RX 6800': { tier: 'high', workload: 4, batchSize: 512 },
            'RX 6700': { tier: 'high', workload: 3, batchSize: 512 },
            'RX 6600': { tier: 'medium', workload: 3, batchSize: 256 },

            // 默认
            'default': { tier: 'medium', workload: 3, batchSize: 256 }
        };

        // 工作负载级别说明
        // -w 1: 低负载，适合同时使用电脑
        // -w 2: 中等负载
        // -w 3: 高负载，推荐用于破解
        // -w 4: 极限负载，可能导致系统卡顿
    }

    /**
     * 检测GPU信息
     */
    async detectGPU() {
        try {
            // 使用hashcat检测
            const result = execSync(`"${this.hashcatPath}" -I 2>&1`, {
                encoding: 'utf-8',
                timeout: 10000,
                windowsHide: true
            });

            this.gpuInfo = this.parseHashcatOutput(result);
            console.log('[GPUOptimizer] Detected GPUs:', this.gpuInfo);

            return this.gpuInfo;
        } catch (err) {
            console.log('[GPUOptimizer] GPU detection failed:', err.message);

            // 尝试使用系统命令
            return this.detectGPUFallback();
        }
    }

    /**
     * 解析hashcat输出
     */
    parseHashcatOutput(output) {
        const gpus = [];
        const lines = output.split('\n');

        let currentDevice = null;

        for (const line of lines) {
            // 解析设备信息
            if (line.includes('Device #')) {
                if (currentDevice) gpus.push(currentDevice);
                currentDevice = {
                    id: gpus.length,
                    name: '',
                    memory: 0,
                    type: 'Unknown'
                };
            }

            if (currentDevice) {
                if (line.includes('Name')) {
                    const match = line.match(/Name[.:]+\s*(.+)/i);
                    if (match) currentDevice.name = match[1].trim();
                }
                if (line.includes('Memory')) {
                    const match = line.match(/(\d+)\s*MB/i);
                    if (match) currentDevice.memory = parseInt(match[1]);
                }
                if (line.includes('Type')) {
                    if (line.toLowerCase().includes('gpu')) currentDevice.type = 'GPU';
                    else if (line.toLowerCase().includes('cpu')) currentDevice.type = 'CPU';
                }
            }
        }

        if (currentDevice) gpus.push(currentDevice);

        return gpus.filter(g => g.type === 'GPU');
    }

    /**
     * 备用GPU检测（使用系统命令）
     */
    detectGPUFallback() {
        try {
            // Windows: wmic
            if (process.platform === 'win32') {
                const result = execSync('wmic path win32_VideoController get name', {
                    encoding: 'utf-8',
                    windowsHide: true
                });

                const lines = result.split('\n').filter(l => l.trim() && !l.includes('Name'));
                return lines.map((name, id) => ({
                    id,
                    name: name.trim(),
                    memory: 0,
                    type: name.toLowerCase().includes('nvidia') || name.toLowerCase().includes('amd') ? 'GPU' : 'Unknown'
                })).filter(g => g.type === 'GPU');
            }

            // macOS/Linux: 使用其他命令
            return [];
        } catch (err) {
            console.log('[GPUOptimizer] Fallback detection failed:', err.message);
            return [];
        }
    }

    /**
     * 获取GPU最优参数
     */
    getOptimalParams(gpuName = null) {
        const name = gpuName || (this.gpuInfo && this.gpuInfo[0]?.name) || '';

        // 查找匹配的GPU配置
        let config = this.gpuPerformanceMap['default'];

        for (const [model, params] of Object.entries(this.gpuPerformanceMap)) {
            if (name.toLowerCase().includes(model.toLowerCase())) {
                config = params;
                break;
            }
        }

        this.optimalParams = {
            workload: config.workload,
            batchSize: config.batchSize,
            tier: config.tier,
            args: [
                '-w', config.workload.toString(),
                '--force'  // 忽略警告
            ]
        };

        console.log(`[GPUOptimizer] Optimal params for "${name}":`, this.optimalParams);

        return this.optimalParams;
    }

    /**
     * 获取多GPU参数
     */
    getMultiGPUParams() {
        if (!this.gpuInfo || this.gpuInfo.length <= 1) {
            return null;
        }

        // 使用所有检测到的GPU
        const deviceIds = this.gpuInfo.map(g => g.id).join(',');

        return {
            deviceCount: this.gpuInfo.length,
            args: [
                '-d', deviceIds,  // 使用指定的设备
                '--force'
            ]
        };
    }

    /**
     * 自动调优 - 运行基准测试
     */
    async runBenchmark(hashMode = '0') {
        try {
            console.log('[GPUOptimizer] Running benchmark for hash mode', hashMode);

            const result = execSync(
                `"${this.hashcatPath}" -b -m ${hashMode} --machine-readable 2>&1`,
                {
                    encoding: 'utf-8',
                    timeout: 60000,
                    windowsHide: true
                }
            );

            // 解析基准测试结果
            const speedMatch = result.match(/Speed[^:]*:\s*([\d.]+)\s*([kMGT]?)H\/s/i);
            if (speedMatch) {
                let speed = parseFloat(speedMatch[1]);
                const unit = speedMatch[2].toUpperCase();
                if (unit === 'K') speed *= 1000;
                else if (unit === 'M') speed *= 1000000;
                else if (unit === 'G') speed *= 1000000000;
                else if (unit === 'T') speed *= 1000000000000;

                return { speed, raw: result };
            }

            return null;
        } catch (err) {
            console.log('[GPUOptimizer] Benchmark failed:', err.message);
            return null;
        }
    }

    /**
     * 获取推荐的阶段超时时间
     */
    getPhaseTimeouts(tier = null) {
        const t = tier || this.optimalParams?.tier || 'medium';

        // 根据GPU性能等级调整超时
        const multipliers = {
            'ultra': 0.5,   // 高性能GPU，超时减半
            'high': 0.75,
            'medium': 1.0,
            'low': 1.5      // 低性能GPU，超时延长
        };

        const mult = multipliers[t] || 1.0;

        return {
            top10k: Math.round(30 * mult),
            keyboard: Math.round(60 * mult),
            shortBrute: Math.round(300 * mult),
            dictionary: Math.round(600 * mult),
            mask: Math.round(900 * mult)
        };
    }

    /**
     * 获取完整的优化配置
     */
    async getFullOptimization() {
        // 1. 检测GPU
        await this.detectGPU();

        // 2. 获取最优参数
        const params = this.getOptimalParams();

        // 3. 检查多GPU
        const multiGPU = this.getMultiGPUParams();

        // 4. 获取超时配置
        const timeouts = this.getPhaseTimeouts();

        return {
            gpus: this.gpuInfo,
            params,
            multiGPU,
            timeouts,
            recommendations: this.generateRecommendations()
        };
    }

    /**
     * 生成优化建议
     */
    generateRecommendations() {
        const recs = [];

        if (!this.gpuInfo || this.gpuInfo.length === 0) {
            recs.push('未检测到GPU，将使用CPU模式（速度较慢）');
        } else if (this.gpuInfo.length > 1) {
            recs.push(`检测到 ${this.gpuInfo.length} 个GPU，启用多GPU并行`);
        }

        if (this.optimalParams?.tier === 'low') {
            recs.push('GPU性能较低，建议关闭其他程序以提高速度');
        }

        if (this.optimalParams?.tier === 'ultra') {
            recs.push('检测到高性能GPU，已启用最大负载模式');
        }

        return recs;
    }
}

export default GPUOptimizer;
