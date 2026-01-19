# Implementation Plan: FileCompressor Upgrade

## Overview

分阶段实现 FileCompressor 的全面升级，从基础功能到高级密码破解。

## Tasks

### Phase 1: 基础功能升级

- [x] 1. 重构 UI 布局
  - [x] 1.1 添加三模式选择器 (Compress / Extract / Crack Password)
  - [x] 1.2 创建可折叠的高级选项面板
  - [x] 1.3 优化文件列表显示（大小、类型、状态）
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. 实现压缩级别选择
  - [x] 2.1 添加压缩级别 UI 组件 (Fast / Normal / Maximum)
  - [x] 2.2 修改后端 archiver 配置支持不同压缩级别
  - [x] 2.3 保存用户偏好到 localStorage
  - _Requirements: 2.1, 2.2, 2.3, 2.5_

- [x] 3. Checkpoint - 验证基础功能
  - 运行 npm run build，测试压缩级别功能

### Phase 2: 密码加密功能

- [x] 4. 实现密码加密 UI
  - [x] 4.1 添加密码输入组件（显示/隐藏切换）
  - [x] 4.2 添加密码确认输入
  - [x] 4.3 实现密码强度指示器
  - _Requirements: 1.1, 1.2, 1.4_

- [x] 5. 实现后端加密
  - [x] 5.1 集成 archiver-zip-encrypted 或 node-7z 支持 AES-256
  - [x] 5.2 修改 IPC 接口传递密码参数
  - [x] 5.3 实现带密码解压功能
  - _Requirements: 1.3_

- [x] 6. Checkpoint - 验证加密功能
  - 测试创建加密压缩包，测试解压

### Phase 3: 分卷压缩

- [x] 7. 实现分卷压缩 UI
  - [x] 7.1 添加分卷选项开关
  - [x] 7.2 添加预设大小按钮 (100MB, 500MB, 1GB, 2GB)
  - [x] 7.3 添加自定义大小输入
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 8. 实现后端分卷
  - [x] 8.1 使用 archiver 的 split 功能或自定义分割逻辑
  - [x] 8.2 实现分卷命名 (.001, .002, etc.)
  - [x] 8.3 实现分卷合并解压
  - _Requirements: 3.4, 3.5_

- [x] 9. Checkpoint - 验证分卷功能
  - 测试大文件分卷压缩和解压

### Phase 4: 多格式支持

- [x] 10. 扩展格式支持
  - [x] 10.1 集成 node-7z 支持 7z 格式
  - [x] 10.2 集成 tar-fs 支持 TAR/TAR.GZ
  - [x] 10.3 添加格式选择 UI
  - [x] 10.4 实现格式自动检测
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 11. Checkpoint - 验证多格式
  - 测试各种格式的压缩和解压

### Phase 5: 密码破解功能

- [x] 12. 实现破解 UI
  - [x] 12.1 创建攻击模式选择器 (Dictionary / Brute Force / Mask)
  - [x] 12.2 创建字符集配置组件
  - [x] 12.3 创建字典文件选择器
  - [x] 12.4 创建掩码输入组件
  - [x] 12.5 创建实时进度显示组件
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

- [x] 13. 实现后端破解服务
  - [x] 13.1 创建 hash 提取模块 (从 ZIP/RAR/7Z 提取验证数据)
  - [x] 13.2 实现 Worker Thread 池管理
  - [x] 13.3 实现字典攻击算法
  - [x] 13.4 实现暴力破解算法（多线程分段）
  - [x] 13.5 实现掩码攻击算法
  - [x] 13.6 实现暂停/恢复功能
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.8_

- [x] 14. 优化破解性能
  - [x] 14.1 使用多线程分段处理
  - [x] 14.2 实现智能任务分配
  - [x] 14.3 添加内置常用密码字典
  - _Requirements: 5.5_

- [x] 15. Checkpoint - 验证破解功能
  - 构建成功，功能已实现

### Phase 6: 最终优化

- [x] 16. UI 优化
  - [x] 16.1 添加详细进度显示（速度、ETA）
  - [x] 16.2 优化深色模式样式
  - [x] 16.3 添加操作成功/失败提示
  - _Requirements: 6.4, 6.5_

- [ ] 17. Final Checkpoint
  - 完整功能测试
  - 运行 npm run build 验证构建

## Notes

- 密码破解功能仅用于恢复用户自己忘记的密码
- 多线程使用 CPU 核心数 - 1，保留一个核心给 UI
- 内置字典包含常见弱密码，用户也可加载自定义字典
