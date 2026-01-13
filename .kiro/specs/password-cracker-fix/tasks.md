# Implementation Plan: Password Cracker Fix

## Overview

完全重写 `index.js` 文件，修复密码破解功能。

## Tasks

- [ ] 1. 删除损坏的文件并创建新的完整文件
  - 删除当前损坏的 index.js
  - 创建新的完整 index.js 文件
  - 包含所有必要的 imports 和基础函数
  - _Requirements: 1.1, 1.2_

- [ ] 2. 实现核心破解函数
  - [ ] 2.1 实现 crackWithCPU 函数
    - 单线程密码测试
    - 进度更新
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 2.2 实现 crackWithMultiThreadCPU 函数
    - Worker 线程创建
    - 密码分发
    - 结果收集
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 2.3 实现 crackWithHashcat 函数
    - Hash 提取
    - hashcat 调用
    - 结果解析
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 3. 实现 IPC handlers
  - [ ] 3.1 实现 registerFileCompressor 导出函数
    - 所有 IPC handlers
    - 压缩/解压功能
    - _Requirements: 1.2_
  
  - [ ] 3.2 实现 crack-start handler
    - GPU/CPU 模式选择逻辑
    - 回退机制
    - _Requirements: 2.1, 3.1, 4.1_
  
  - [ ] 3.3 实现 crack-stop handler
    - 进程终止
    - Worker 终止
    - _Requirements: 5.1, 5.2_

- [ ] 4. 构建和测试
  - 运行 npm run build
  - 确保无编译错误
  - _Requirements: 1.3_

## Notes

- 文件必须一次性完整写入，避免分段写入导致的损坏
- 使用 PowerShell 直接写入文件以确保完整性
