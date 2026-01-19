# 密码破解攻击顺序优化设计

## 概述

基于密码学专家分析和实际破解统计数据，重新设计7层密码破解逻辑的执行顺序，以实现最优的时间-成功率比例。

## 架构

### 核心优化原则

1. **ROI优先**: 投资回报率 = 成功率增量 / 时间成本
2. **累积效应**: 考虑前序阶段的累积成功率
3. **资源效率**: 优先使用GPU加速的快速攻击
4. **用户体验**: 前5分钟内达到80%+成功率

### 新的攻击顺序设计

```javascript
const OPTIMIZED_ATTACK_PHASES = {
    // 第一梯队：超高ROI阶段 (0-5分钟)
    0: { 
        name: 'FastCombo', 
        method: 'Combined Fast Attack',
        description: 'Top10K + Keyboard Patterns (Combined)',
        estimatedTime: '1-2分钟',
        successRate: '60%',
        roi: 30.0
    },
    1: { 
        name: 'AI', 
        method: 'PassGPT AI Generator',
        description: 'AI Password Generation (Optimized)',
        estimatedTime: '2-3分钟',
        successRate: '15%增量',
        roi: 5.0
    },
    2: { 
        name: 'ShortBrute', 
        method: 'Hashcat GPU Short Bruteforce',
        description: 'Ultra-short Bruteforce (1-3 chars)',
        estimatedTime: '1-2分钟',
        successRate: '10%增量',
        roi: 5.0
    },
    
    // 第二梯队：中等ROI阶段 (5-30分钟)
    3: { 
        name: 'SmartDict', 
        method: 'Hashcat GPU Smart Dictionary',
        description: 'Curated Dictionary (5M most common)',
        estimatedTime: '5-10分钟',
        successRate: '7%增量',
        roi: 0.7
    },
    4: { 
        name: 'RuleTransform', 
        method: 'Hashcat GPU Rule Attack',
        description: 'Optimized Rule Transformations',
        estimatedTime: '10-15分钟',
        successRate: '4%增量',
        roi: 0.27
    },
    
    // 第三梯队：低ROI但必要阶段 (30分钟+)
    5: { 
        name: 'Hybrid', 
        method: 'Hashcat GPU Hybrid Attack',
        description: 'Word + Number Combinations',
        estimatedTime: '30-60分钟',
        successRate: '2%增量',
        roi: 0.03
    },
    6: { 
        name: 'DeepMask', 
        method: 'Hashcat GPU Deep Mask',
        description: 'Comprehensive Mask Attack',
        estimatedTime: '2-24小时',
        successRate: '1%增量',
        roi: 0.001
    },
    
    // CPU回退
    7: { 
        name: 'CPUFallback', 
        method: 'CPU Smart Dictionary',
        description: 'CPU-based comprehensive search',
        estimatedTime: '变长',
        successRate: '变长',
        roi: 0.1
    }
};
```

## 组件和接口

### 1. 攻击调度器 (AttackScheduler)

```javascript
class AttackScheduler {
    constructor(options = {}) {
        this.mode = options.mode || 'standard'; // 'fast', 'standard', 'deep'
        this.timeLimit = options.timeLimit || null;
        this.phases = this.selectPhases();
    }
    
    selectPhases() {
        switch(this.mode) {
            case 'fast': return [0, 1, 2]; // 5分钟内
            case 'standard': return [0, 1, 2, 3, 4]; // 30分钟内
            case 'deep': return [0, 1, 2, 3, 4, 5, 6]; // 无限制
            default: return [0, 1, 2, 3, 4];
        }
    }
}
```

### 2. 组合攻击执行器 (ComboAttackExecutor)

```javascript
class ComboAttackExecutor {
    async executeFastCombo(hashFile, outFile, hashMode) {
        // 并行执行Top10K和键盘模式
        const attacks = [
            this.runTop10K(hashFile, outFile, hashMode),
            this.runKeyboardPatterns(hashFile, outFile, hashMode)
        ];
        
        // 使用Promise.race，任一成功即返回
        return Promise.race(attacks);
    }
}
```

### 3. ROI计算器 (ROICalculator)

```javascript
class ROICalculator {
    calculateROI(phase, historicalData) {
        const successRate = historicalData.getSuccessRate(phase.name);
        const avgTime = historicalData.getAverageTime(phase.name);
        const complexity = this.getComplexityWeight(phase);
        
        return successRate / (avgTime + complexity);
    }
    
    updatePhaseOrder(phases, historicalData) {
        return phases.sort((a, b) => {
            const roiA = this.calculateROI(a, historicalData);
            const roiB = this.calculateROI(b, historicalData);
            return roiB - roiA; // 降序排列
        });
    }
}
```

## 数据模型

### 攻击阶段模型

```javascript
class AttackPhase {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.method = config.method;
        this.description = config.description;
        this.estimatedTime = config.estimatedTime;
        this.baseSuccessRate = config.successRate;
        this.roi = config.roi;
        this.requirements = config.requirements || [];
        this.canParallel = config.canParallel || false;
    }
    
    canExecute(systemCapabilities) {
        return this.requirements.every(req => 
            systemCapabilities.has(req)
        );
    }
}
```

### 统计数据模型

```javascript
class AttackStatistics {
    constructor() {
        this.phaseStats = new Map();
        this.globalStats = {
            totalAttempts: 0,
            successfulCracks: 0,
            averageTime: 0
        };
    }
    
    recordPhaseResult(phaseName, success, timeSpent, attempts) {
        if (!this.phaseStats.has(phaseName)) {
            this.phaseStats.set(phaseName, {
                attempts: 0,
                successes: 0,
                totalTime: 0,
                successRate: 0,
                avgTime: 0
            });
        }
        
        const stats = this.phaseStats.get(phaseName);
        stats.attempts++;
        if (success) stats.successes++;
        stats.totalTime += timeSpent;
        stats.successRate = stats.successes / stats.attempts;
        stats.avgTime = stats.totalTime / stats.attempts;
    }
}
```

## 正确性属性

### 属性 1: ROI排序正确性
*对于任意* 两个攻击阶段A和B，如果ROI(A) > ROI(B)，那么A应该在B之前执行
**验证: 需求 1.1**

### 属性 2: 时间预算遵守
*对于任意* 设定的时间预算T，所选择的攻击阶段的总预期时间不应超过T
**验证: 需求 3.1, 3.2, 3.3**

### 属性 3: 累积成功率单调性
*对于任意* 攻击序列，累积成功率应该随着阶段数量的增加而单调递增
**验证: 需求 1.1**

### 属性 4: 资源利用效率
*对于任意* 系统资源配置，攻击调度应该最大化资源利用率而不产生冲突
**验证: 需求 5.1, 5.2, 5.3**

### 属性 5: 统计数据一致性
*对于任意* 攻击结果，统计数据的更新应该保持一致性和准确性
**验证: 需求 4.1, 4.2, 4.3**

## 错误处理

### 1. 阶段执行失败
- **检测**: 监控每个阶段的执行状态
- **处理**: 记录失败原因，跳转到下一阶段
- **恢复**: 更新该阶段的成功率统计

### 2. 资源不足
- **检测**: 监控GPU/CPU/内存使用率
- **处理**: 动态调整并行度或切换到低资源消耗的阶段
- **恢复**: 资源释放后恢复正常调度

### 3. 超时处理
- **检测**: 每个阶段设置合理的超时时间
- **处理**: 强制终止当前阶段，保存进度
- **恢复**: 跳转到下一阶段或进入CPU回退模式

## 测试策略

### 单元测试
- 测试ROI计算的准确性
- 测试攻击阶段选择逻辑
- 测试统计数据更新机制
- 测试错误处理流程

### 属性测试
- 验证ROI排序的正确性
- 验证时间预算的遵守
- 验证累积成功率的单调性
- 验证资源利用的效率

### 集成测试
- 测试完整的攻击流程
- 测试不同模式下的行为
- 测试并行攻击的协调
- 测试统计数据的持久化

### 性能测试
- 基准测试各阶段的实际执行时间
- 对比优化前后的成功率
- 测试不同硬件配置下的表现
- 测试大规模并发场景

## 实施计划

### 阶段1: 核心重构
1. 重新定义攻击阶段常量
2. 实现ROI计算器
3. 实现攻击调度器
4. 更新现有的攻击函数

### 阶段2: 组合攻击
1. 实现FastCombo攻击
2. 优化AI生成策略
3. 限制短密码暴力破解范围
4. 测试并行执行能力

### 阶段3: 统计和优化
1. 实现统计数据收集
2. 实现动态ROI调整
3. 添加用户模式选择
4. 完善错误处理机制

### 阶段4: 测试和调优
1. 进行全面的性能测试
2. 收集真实使用数据
3. 根据反馈调整参数
4. 文档化最佳实践

## 预期效果

### 性能提升
- **5分钟成功率**: 60% → 85% (+42%)
- **30分钟成功率**: 85% → 96% (+13%)
- **平均破解时间**: 减少40-50%
- **GPU利用率**: 提升30%

### 用户体验
- 更快的初始反馈
- 更清晰的进度指示
- 更智能的时间预估
- 更高的整体满意度

### 技术指标
- 代码复杂度降低
- 维护成本减少
- 扩展性增强
- 测试覆盖率提升