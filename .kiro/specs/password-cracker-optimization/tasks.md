# Implementation Plan: Password Cracker Optimization

## Overview

优化密码破解功能，实现多策略智能选择，速度提升 10,000x+。

## Tasks

- [x] 1. 实现加密类型检测
  - [x] 1.1 创建 detectEncryption 函数
    - 使用 7z l -slt 解析加密方法
    - 支持 ZIP/RAR/7z 格式检测
    - 返回 method, format, hashcatMode, canUseBkcrack, canUseHashcat
    - _Requirements: 1.1, 1.2_
  
  - [x] 1.2 更新 UI 显示加密类型
    - 在破解界面显示检测到的加密类型和格式
    - 不同格式使用不同颜色标签
    - _Requirements: 1.2, 1.3_

- [x] 2. 集成 bkcrack 已知明文攻击
  - [x] 2.1 下载并配置 bkcrack
    - 添加 bkcrack.exe 到 resources
    - _Requirements: 2.1_
  
  - [x] 2.2 实现 crackWithBkcrack 函数
    - 检测文件类型获取已知明文
    - 调用 bkcrack 进行攻击
    - _Requirements: 2.1, 2.2, 2.4_

- [x] 3. 修复 Hashcat GPU 加速
  - [x] 3.1 修复 Hashcat 运行环境
    - 确保在 hashcat 目录下运行
    - 正确设置工作目录
    - _Requirements: 3.1_
  
  - [x] 3.2 优化 hash 提取
    - 支持 ZIP/RAR/7z hash 提取
    - 使用 zip2john/rar2john/7z2john
    - _Requirements: 3.1_
  
  - [x] 3.3 实现实时速度显示
    - 解析 hashcat 输出获取速度
    - 支持 K/M/G 单位转换
    - _Requirements: 3.2_
  
  - [x] 3.4 多格式 Hashcat 模式支持
    - ZIP AES: 13600
    - ZIP PKZIP: 17200
    - RAR5: 13000
    - RAR3: 12500
    - 7z: 11600
    - _Requirements: 3.1_

- [ ] 4. 优化 CPU 多线程破解
  - [x] 4.1 优化 Worker 线程池
    - 使用 NUM_WORKERS = CPU核心数 - 1
    - 批量密码测试
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 4.2 实现内存验证模式 (可选优化)
    - 使用 node-7z 库直接验证
    - 避免频繁启动 7z 进程
    - _Requirements: 4.3_

- [x] 5. 实现智能策略选择
  - [x] 5.1 创建 crackWithSmartStrategy
    - 检测加密类型
    - 选择最优方法
    - 自动回退
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. 构建和测试
  - 运行 npm run build ✓
  - 测试各种加密类型的 ZIP 文件
  - 验证速度提升
  - _Requirements: 3.2, 4.3_

## Notes

- bkcrack 仅适用于 ZipCrypto，AES 必须用 Hashcat 或 CPU
- Hashcat 必须在其目录下运行才能找到 OpenCL 文件
- 优先级：bkcrack > Hashcat > CPU
- RAR 和 7z 需要 john 工具提取 hash，如果不存在则回退到 CPU

## 待办事项

- [ ] 下载 John the Ripper 工具 (zip2john, rar2john, 7z2john) 到 resources/john/
- [ ] 测试 RAR 文件的 GPU 加速
