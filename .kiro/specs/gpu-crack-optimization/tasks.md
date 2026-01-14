# Implementation Plan: GPU Crack Optimization

## Overview

实现 7 层递进 GPU 密码破解策略，按优先级依次尝试各种攻击模式。

## Tasks

- [x] 1. 下载和配置密码字典资源
  - [x] 1.1 下载 rockyou.txt 字典 (或使用精简版)
    - 从 SecLists 下载 rockyou.txt
    - 存放到 resources/hashcat/hashcat-6.2.6/
    - _Requirements: 1.1, 1.4_
  - [x] 1.2 验证 best64.rule 规则文件存在
    - 检查 hashcat 内置 rules/best64.rule
    - _Requirements: 2.2_

- [x] 2. 重构 crackWithHashcat 函数为流水线架构
  - [x] 2.1 创建 runHashcatPhase 通用函数
    - 封装 hashcat 执行逻辑
    - 支持不同攻击模式参数
    - 返回 PhaseResult
    - _Requirements: 2.1, 3.1, 4.1, 5.1_
  - [x] 2.2 实现阶段状态管理
    - 跟踪当前阶段
    - 累计总尝试次数
    - _Requirements: 7.1, 7.4_

- [x] 3. 实现 Phase 2: 规则攻击
  - [x] 3.1 添加 runRuleAttack 函数
    - 使用 -a 0 -r rules/best64.rule
    - 字典用完后自动调用
    - _Requirements: 2.1, 2.2_
  - [x] 3.2 更新 UI 显示规则攻击状态
    - 显示 "Rule Attack (best64)"
    - _Requirements: 2.4_

- [x] 4. 实现 Phase 3: 智能掩码攻击
  - [x] 4.1 添加 runMaskAttack 函数
    - 使用 -a 3 掩码模式
    - 按顺序尝试 7 种常见模式
    - _Requirements: 3.1, 3.2_
  - [x] 4.2 更新 UI 显示当前掩码模式
    - 显示 "Mask Attack (?u?l?l?l?l?l?d?d)"
    - _Requirements: 3.3_

- [x] 5. 实现 Phase 4: 混合攻击
  - [x] 5.1 添加 runHybridAttack 函数
    - 使用 -a 6 (字典+掩码) 和 -a 7 (掩码+字典)
    - 尝试 word+?d?d?d?d, word+?d?d?s 等组合
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. 优化 Phase 5: 短密码暴力
  - [x] 6.1 修改 runHashcatBruteforce 函数
    - 限制为 1-6 位
    - 使用 ?l?d (小写+数字) 提高效率
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 7. 优化 Phase 6: CPU 智能字典回退
  - [x] 7.1 修改 crackWithMultiThreadCPU 函数
    - 只使用智能字典，禁用暴力模式
    - 使用 smartCracker.js 的 SMART_DICTIONARY
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 7.2 更新 UI 显示 CPU 回退状态
    - 显示 "CPU Smart Dictionary"
    - _Requirements: 6.4_

- [x] 8. 整合测试
  - [x] 8.1 测试完整流水线
    - 创建测试压缩包
    - 验证各阶段按顺序执行
    - _Requirements: 2.1, 3.1, 4.1, 5.1, 6.1_
  - [x] 8.2 构建并验证
    - npm run build
    - 测试 GPU 模式破解

## Notes

- 任务按顺序执行，每个阶段依赖前一阶段
- rockyou.txt 较大 (~140MB)，可考虑使用精简版
- best64.rule 是 hashcat 内置的，无需额外下载
- 测试时使用简单密码验证各阶段工作正常
