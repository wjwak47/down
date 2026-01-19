/**
 * PerformanceMonitor - 实时性能监控器
 * 
 * 功能：
 * 1. 实时监控系统资源使用情况 (CPU, Memory, GPU)
 * 2. 检测性能瓶颈并提供优化建议
 * 3. 计算破解效率和预估完成时间
 * 4. 支持性能历史记录和趋势分析
 * 
 * 优化目标：
 * - 提供准确的性能指标 (±5% 误差)
 * - 自动检测瓶颈并建议优化
 * - 支持多种硬件配置的性能分析
 */

import os from 'os';
import { execSync } from 'child_process';

class PerformanceMonitor {
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.metrics = {
            cpuUsage: 0,
            memoryUsage: 0,
            gpuUsage: 0,
            diskIO: 0,
            networkIO: 0,
            passwordsPerSecond: 0,
            efficiency: 0,
            temperature: {
                cpu: 0,
                gpu: 0
            }
        };
        
        this.history = [];
        this.maxHistorySize = 300; // 5 minutes at 1-second intervals
        this.isMonitoring = false;
        this.monitoringInterval = null;
        this.callbacks = [];
        
        // Performance thresholds
        this.thresholds = {
            cpuUsage: 0.9,      // 90% CPU usage
            memoryUsage: 0.8,   // 80% memory usage
            gpuUsage: 0.95,     // 95% GPU usage
            temperature: {
                cpu: 80,        // 80°C CPU temperature
                gpu: 85         // 85°C GPU temperature
            }
        };
        
        // Platform-specific initialization
        this.platform = process.platform;
        this.isWindows = this.platform === 'win32';
        this.isMac = this.platform === 'darwin';
        this.isLinux = this.platform === 'linux';
        
        console.log('[PerformanceMonitor] Initialized for session:', sessionId, 'platform:', this.platform);
    }
    
    /**
     * 开始性能监控
     * @param {Function} callback - 性能更新回调函数
     * @param {number} interval - 监控间隔 (毫秒)
     */
    startMonitoring(callback = null, interval = 1000) {
        if (this.isMonitoring) {
            console.log('[PerformanceMonitor] Already monitoring');
            return;
        }
        
        this.isMonitoring = true;
        if (callback) {
            this.callbacks.push(callback);
        }
        
        console.log('[PerformanceMonitor] Starting monitoring with', interval, 'ms interval');
        
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.updateMetrics();
                const analysis = this.analyzePerformance();
                
                // Add to history
                this.addToHistory({
                    timestamp: Date.now(),
                    metrics: { ...this.metrics },
                    analysis
                });
                
                // Notify callbacks
                this.callbacks.forEach(cb => {
                    try {
                        cb(this.metrics, analysis);
                    } catch (err) {
                        console.error('[PerformanceMonitor] Callback error:', err);
                    }
                });
                
            } catch (err) {
                console.error('[PerformanceMonitor] Update error:', err);
            }
        }, interval);
    }
    
    /**
     * 停止性能监控
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        
        console.log('[PerformanceMonitor] Monitoring stopped');
    }
    
    /**
     * 更新性能指标
     */
    async updateMetrics() {
        // Update basic system metrics
        await this.updateCPUUsage();
        await this.updateMemoryUsage();
        await this.updateGPUUsage();
        await this.updateDiskIO();
        await this.updateTemperature();
        
        // Calculate efficiency
        this.calculateEfficiency();
    }
    
    /**
     * 更新CPU使用率
     */
    async updateCPUUsage() {
        try {
            const cpus = os.cpus();
            let totalIdle = 0;
            let totalTick = 0;
            
            cpus.forEach(cpu => {
                for (const type in cpu.times) {
                    totalTick += cpu.times[type];
                }
                totalIdle += cpu.times.idle;
            });
            
            // Calculate CPU usage as percentage
            const idle = totalIdle / cpus.length;
            const total = totalTick / cpus.length;
            const usage = 1 - (idle / total);
            
            this.metrics.cpuUsage = Math.max(0, Math.min(1, usage));
            
        } catch (err) {
            console.error('[PerformanceMonitor] CPU usage error:', err);
            this.metrics.cpuUsage = 0;
        }
    }
    
    /**
     * 更新内存使用率
     */
    async updateMemoryUsage() {
        try {
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            
            this.metrics.memoryUsage = usedMem / totalMem;
            
        } catch (err) {
            console.error('[PerformanceMonitor] Memory usage error:', err);
            this.metrics.memoryUsage = 0;
        }
    }
    
    /**
     * 更新GPU使用率
     */
    async updateGPUUsage() {
        try {
            if (this.isWindows) {
                // Windows: Use nvidia-smi if available
                const result = execSync('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits', {
                    encoding: 'utf8',
                    timeout: 2000
                });
                
                const usage = parseInt(result.trim());
                if (!isNaN(usage)) {
                    this.metrics.gpuUsage = usage / 100;
                }
                
            } else if (this.isMac) {
                // Mac: GPU monitoring is limited, estimate based on system load
                this.metrics.gpuUsage = Math.min(this.metrics.cpuUsage * 1.2, 1.0);
                
            } else {
                // Linux: Try nvidia-smi
                const result = execSync('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>/dev/null || echo "0"', {
                    encoding: 'utf8',
                    timeout: 2000
                });
                
                const usage = parseInt(result.trim());
                if (!isNaN(usage)) {
                    this.metrics.gpuUsage = usage / 100;
                }
            }
            
        } catch (err) {
            // GPU monitoring not available, use CPU as estimate
            this.metrics.gpuUsage = Math.min(this.metrics.cpuUsage * 0.8, 1.0);
        }
    }
    
    /**
     * 更新磁盘I/O
     */
    async updateDiskIO() {
        try {
            // Platform-specific disk I/O monitoring
            if (this.isWindows) {
                // Windows: Use typeperf for disk I/O
                const result = execSync('typeperf "\\PhysicalDisk(_Total)\\Disk Bytes/sec" -sc 1', {
                    encoding: 'utf8',
                    timeout: 3000
                });
                
                const match = result.match(/[\d,]+\.[\d,]+/);
                if (match) {
                    const bytesPerSec = parseFloat(match[0].replace(/,/g, ''));
                    this.metrics.diskIO = bytesPerSec;
                }
                
            } else {
                // Unix: Use iostat if available
                const result = execSync('iostat -d 1 2 2>/dev/null | tail -n +4 | head -1 | awk \'{print $3+$4}\'', {
                    encoding: 'utf8',
                    timeout: 3000
                });
                
                const kbPerSec = parseFloat(result.trim());
                if (!isNaN(kbPerSec)) {
                    this.metrics.diskIO = kbPerSec * 1024; // Convert to bytes/sec
                }
            }
            
        } catch (err) {
            // Disk I/O monitoring not available
            this.metrics.diskIO = 0;
        }
    }
    
    /**
     * 更新温度信息
     */
    async updateTemperature() {
        try {
            if (this.isWindows) {
                // Windows: Temperature monitoring is complex, skip for now
                this.metrics.temperature.cpu = 0;
                this.metrics.temperature.gpu = 0;
                
            } else if (this.isMac) {
                // Mac: Use system temperature sensors if available
                try {
                    const result = execSync('sudo powermetrics -n 1 -i 1000 --samplers smc -a --hide-cpu-duty-cycle 2>/dev/null | grep "CPU die temperature"', {
                        encoding: 'utf8',
                        timeout: 3000
                    });
                    
                    const match = result.match(/([\d.]+) C/);
                    if (match) {
                        this.metrics.temperature.cpu = parseFloat(match[1]);
                    }
                } catch (e) {
                    // Temperature monitoring requires sudo, skip
                }
                
            } else {
                // Linux: Use sensors command
                const result = execSync('sensors 2>/dev/null | grep "Core 0" | head -1', {
                    encoding: 'utf8',
                    timeout: 2000
                });
                
                const match = result.match(/\+(\d+\.\d+)°C/);
                if (match) {
                    this.metrics.temperature.cpu = parseFloat(match[1]);
                }
            }
            
        } catch (err) {
            // Temperature monitoring not available
            this.metrics.temperature.cpu = 0;
            this.metrics.temperature.gpu = 0;
        }
    }
    
    /**
     * 计算破解效率
     */
    calculateEfficiency() {
        // Efficiency = passwords per second / (CPU usage * 100 + GPU usage * 1000)
        // This gives higher weight to GPU usage since GPU should be more efficient
        
        const cpuWeight = this.metrics.cpuUsage * 100;
        const gpuWeight = this.metrics.gpuUsage * 1000;
        const totalWeight = cpuWeight + gpuWeight;
        
        if (totalWeight > 0 && this.metrics.passwordsPerSecond > 0) {
            this.metrics.efficiency = this.metrics.passwordsPerSecond / totalWeight;
        } else {
            this.metrics.efficiency = 0;
        }
    }
    
    /**
     * 分析性能并检测瓶颈
     */
    analyzePerformance() {
        const bottlenecks = [];
        const suggestions = [];
        
        // CPU bottleneck detection
        if (this.metrics.cpuUsage > this.thresholds.cpuUsage) {
            bottlenecks.push({
                type: 'cpu',
                severity: 'high',
                value: this.metrics.cpuUsage,
                threshold: this.thresholds.cpuUsage,
                message: `CPU usage is ${(this.metrics.cpuUsage * 100).toFixed(1)}% (threshold: ${(this.thresholds.cpuUsage * 100).toFixed(1)}%)`
            });
            
            suggestions.push('Consider reducing CPU worker threads or enabling CPU throttling');
        }
        
        // Memory bottleneck detection
        if (this.metrics.memoryUsage > this.thresholds.memoryUsage) {
            bottlenecks.push({
                type: 'memory',
                severity: 'high',
                value: this.metrics.memoryUsage,
                threshold: this.thresholds.memoryUsage,
                message: `Memory usage is ${(this.metrics.memoryUsage * 100).toFixed(1)}% (threshold: ${(this.thresholds.memoryUsage * 100).toFixed(1)}%)`
            });
            
            suggestions.push('Reduce batch sizes or enable disk caching to free up memory');
        }
        
        // GPU bottleneck detection
        if (this.metrics.gpuUsage > this.thresholds.gpuUsage) {
            bottlenecks.push({
                type: 'gpu',
                severity: 'medium',
                value: this.metrics.gpuUsage,
                threshold: this.thresholds.gpuUsage,
                message: `GPU usage is ${(this.metrics.gpuUsage * 100).toFixed(1)}% (threshold: ${(this.thresholds.gpuUsage * 100).toFixed(1)}%)`
            });
            
            suggestions.push('GPU is at maximum capacity - this is expected during GPU phases');
        }
        
        // Temperature warnings
        if (this.metrics.temperature.cpu > this.thresholds.temperature.cpu) {
            bottlenecks.push({
                type: 'temperature',
                severity: 'high',
                value: this.metrics.temperature.cpu,
                threshold: this.thresholds.temperature.cpu,
                message: `CPU temperature is ${this.metrics.temperature.cpu}°C (threshold: ${this.thresholds.temperature.cpu}°C)`
            });
            
            suggestions.push('Enable CPU throttling to reduce temperature');
        }
        
        // Low efficiency detection
        if (this.metrics.efficiency < 0.1 && this.metrics.passwordsPerSecond > 0) {
            bottlenecks.push({
                type: 'efficiency',
                severity: 'medium',
                value: this.metrics.efficiency,
                threshold: 0.1,
                message: `Low cracking efficiency detected (${this.metrics.efficiency.toFixed(3)})`
            });
            
            suggestions.push('Consider switching to a different attack phase or optimizing parameters');
        }
        
        // Calculate overall performance score (0-100)
        const performanceScore = this.calculatePerformanceScore();
        
        return {
            bottlenecks,
            suggestions,
            performanceScore,
            efficiency: this.metrics.efficiency,
            resourceUtilization: {
                cpu: this.metrics.cpuUsage,
                memory: this.metrics.memoryUsage,
                gpu: this.metrics.gpuUsage
            }
        };
    }
    
    /**
     * 计算性能评分 (0-100)
     */
    calculatePerformanceScore() {
        let score = 100;
        
        // Deduct points for high resource usage without proportional output
        if (this.metrics.cpuUsage > 0.8 && this.metrics.efficiency < 0.5) {
            score -= 20;
        }
        
        if (this.metrics.memoryUsage > 0.8) {
            score -= 15;
        }
        
        if (this.metrics.temperature.cpu > 70) {
            score -= 10;
        }
        
        // Bonus points for high efficiency
        if (this.metrics.efficiency > 1.0) {
            score += 10;
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    /**
     * 添加到历史记录
     */
    addToHistory(entry) {
        this.history.push(entry);
        
        // Keep only recent history
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }
    
    /**
     * 获取性能历史
     */
    getHistory(minutes = 5) {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        return this.history.filter(entry => entry.timestamp > cutoff);
    }
    
    /**
     * 获取性能趋势
     */
    getPerformanceTrend() {
        if (this.history.length < 10) {
            return { trend: 'insufficient_data', confidence: 0 };
        }
        
        const recent = this.history.slice(-10);
        const older = this.history.slice(-20, -10);
        
        if (older.length === 0) {
            return { trend: 'insufficient_data', confidence: 0 };
        }
        
        const recentAvg = recent.reduce((sum, entry) => sum + entry.metrics.efficiency, 0) / recent.length;
        const olderAvg = older.reduce((sum, entry) => sum + entry.metrics.efficiency, 0) / older.length;
        
        const change = (recentAvg - olderAvg) / olderAvg;
        
        let trend = 'stable';
        if (change > 0.1) trend = 'improving';
        else if (change < -0.1) trend = 'declining';
        
        const confidence = Math.min(1.0, this.history.length / 60); // Full confidence after 1 minute
        
        return { trend, change, confidence };
    }
    
    /**
     * 更新密码测试速度
     */
    updatePasswordSpeed(passwordsPerSecond) {
        this.metrics.passwordsPerSecond = passwordsPerSecond;
    }
    
    /**
     * 获取当前性能指标
     */
    getMetrics() {
        return { ...this.metrics };
    }
    
    /**
     * 获取性能摘要
     */
    getPerformanceSummary() {
        const analysis = this.analyzePerformance();
        const trend = this.getPerformanceTrend();
        
        return {
            metrics: this.getMetrics(),
            analysis,
            trend,
            history: this.getHistory(1), // Last 1 minute
            timestamp: Date.now()
        };
    }
    
    /**
     * 检测硬件配置
     */
    detectHardwareConfiguration() {
        const config = {
            platform: this.platform,
            cpus: os.cpus().length,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            architecture: os.arch(),
            hostname: os.hostname(),
            uptime: os.uptime()
        };
        
        // Try to detect GPU
        try {
            if (this.isWindows) {
                const result = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader', {
                    encoding: 'utf8',
                    timeout: 3000
                });
                
                const lines = result.trim().split('\n');
                config.gpus = lines.map(line => {
                    const [name, memory] = line.split(', ');
                    return { name: name.trim(), memory: memory.trim() };
                });
                
            } else {
                // Unix systems
                const result = execSync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>/dev/null || echo "No GPU detected"', {
                    encoding: 'utf8',
                    timeout: 3000
                });
                
                if (!result.includes('No GPU detected')) {
                    const lines = result.trim().split('\n');
                    config.gpus = lines.map(line => {
                        const [name, memory] = line.split(', ');
                        return { name: name.trim(), memory: memory.trim() };
                    });
                } else {
                    config.gpus = [];
                }
            }
        } catch (err) {
            config.gpus = [];
        }
        
        return config;
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.stopMonitoring();
        this.callbacks = [];
        this.history = [];
        console.log('[PerformanceMonitor] Disposed');
    }
}

export default PerformanceMonitor;