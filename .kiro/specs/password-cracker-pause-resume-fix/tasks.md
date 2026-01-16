# Implementation Plan: Password Cracker Pause/Resume Fix

## Overview

修复密码破解器的暂停/恢复功能，实现真正的暂停（保存进度）和停止（删除会话）分离。

Fix the password cracker pause/resume functionality by implementing proper separation between pause (save progress) and stop (delete session).

## Tasks

- [x] 1. 创建新的 IPC 处理器 `zip:crack-pause`
  - 在 `src/main/modules/fileCompressor/index.js` 中添加新的 IPC 处理器
  - 标记 session.active = false 停止处理
  - 调用 sessionManager.pauseSession() 保存会话
  - 优雅地停止进程（SIGTERM，不是 SIGKILL）
  - **保持会话在 crackSessions Map 中（不删除）**
  - 发送 'zip:crack-paused' 事件到 renderer
  - _Requirements: 1.1, 2.1, 2.3_

- [x] 2. 修改现有的 `zip:crack-stop` 处理器
  - 确保调用 sessionManager.deleteSession() 而不是 pauseSession()
  - 强制杀死进程（SIGKILL）
  - 从 crackSessions Map 中删除会话
  - 发送 'zip:crack-stopped' 事件
  - _Requirements: 1.4_

- [x] 3. 增强 `zip:crack-resume` 处理器
  - 加载会话数据 sessionManager.loadSession()
  - 验证归档文件仍然存在
  - 标记会话为 active: sessionManager.resumeSession()
  - 生成新的 jobId
  - **调用 startCrackingWithResume() 重新启动破解任务**
  - 传递 startPhase 和 previousAttempts 参数
  - 返回 { success: true, jobId }
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. 创建 `startCrackingWithResume()` 函数
  - 接受参数: event, jobId, archivePath, options, resumeState
  - resumeState 包含: startPhase, previousAttempts, sessionId
  - 从 startPhase 开始执行破解流程
  - 跳过之前的 phases (0 到 startPhase-1)
  - 传递 previousAttempts 到每个 phase 函数
  - _Requirements: 3.3, 3.4, 6.4_

- [x] 5. 修改所有 Phase 函数支持恢复
  - [x] 5.1 修改 `runAIPhase()` 支持从指定 batch 开始
    - 接受 resumeState 参数
    - 从 resumeState.batchIndex 开始循环（默认为 1）
    - 继续使用 previousAttempts 作为起始计数
    - _Requirements: 6.4, 6.5_
  
  - [ ] 5.2 修改 `runTop10KAttack()` 支持从指定行开始
    - 接受 resumeState 参数
    - 从 resumeState.iteration 开始读取字典（默认为 0）
    - 跳过已测试的密码
    - _Requirements: 6.4, 6.5_
  
  - [ ] 5.3 修改其他 GPU phases 支持恢复
    - runShortBruteforce(), runKeyboardAttack(), runDictionaryAttack()
    - 接受 resumeState 参数
    - 从指定迭代开始
    - _Requirements: 6.4, 6.5_

- [ ] 6. 增强 SessionManager
  - [ ] 6.1 修改 `pauseSession()` 方法
    - 设置 status = 'paused'
    - 记录 pausedAt 时间戳
    - 保存到磁盘
    - **不要从 sessions Map 中删除**
    - _Requirements: 2.2, 4.1_
  
  - [ ] 6.2 修改 `resumeSession()` 方法
    - 设置 status = 'active'
    - 记录 resumedAt 时间戳
    - 保存到磁盘
    - 返回会话数据
    - _Requirements: 3.2, 4.2_
  
  - [ ] 6.3 添加 `deleteSession()` 方法
    - 从 sessions Map 中删除
    - 从磁盘删除会话文件
    - 记录日志
    - _Requirements: 1.4, 4.5_

- [ ] 7. 更新会话数据结构
  - 添加 currentPhase 字段（0-8）
  - 添加 phaseState 对象 { batchIndex, iteration }
  - 添加 testedPasswords 字段
  - 添加 currentSpeed 字段
  - 添加 pausedAt, resumedAt 时间戳
  - _Requirements: 2.2, 6.1, 6.2, 6.3_

- [x] 8. 添加 Preload API
  - 在 `src/preload/index.js` 中添加 `zipCrackPause` 方法
  - 添加 `onZipCrackPaused` 监听器
  - 确保 `zipCrackResume` 返回 jobId
  - _Requirements: 2.1, 3.1_

- [ ] 9. 更新 UI 组件
  - [x] 9.1 分离 `handlePause` 和 `handleStop` 函数
    - handlePause 调用 window.api.zipCrackPause(crackJobId)
    - handleStop 调用 window.api.zipCrackStop(crackJobId)
    - _Requirements: 1.1, 1.4, 5.1_
  
  - [x] 9.2 添加 'zip:crack-paused' 事件监听器
    - 设置 processing = false
    - 设置 crackStats.status = 'paused'
    - 保持 crackJobId（不清空）
    - _Requirements: 2.4, 5.3_
  
  - [ ] 9.3 修改按钮显示逻辑
    - 运行时显示: Pause 和 Stop 按钮
    - 暂停时显示: Resume 和 Stop 按钮
    - 使用 crackStats.status 判断状态
    - _Requirements: 5.1, 5.2_
  
  - [x] 9.4 修改 `handleResume` 函数
    - 调用 window.api.zipCrackResume(sessionId)
    - 获取返回的 jobId
    - 设置 processing = true
    - 设置 crackJobId = jobId
    - 清除 paused 状态
    - _Requirements: 3.1, 5.4_

- [ ] 10. 测试和验证
  - [ ] 10.1 测试暂停功能
    - 启动破解任务
    - 点击 Pause 按钮
    - 验证会话已保存到磁盘
    - 验证 UI 显示 "Paused" 状态
    - 验证显示 Resume 按钮
    - _Requirements: 1.1, 2.1, 2.4_
  
  - [ ] 10.2 测试恢复功能
    - 从暂停状态点击 Resume
    - 验证破解从保存的 phase 继续
    - 验证 tested passwords 计数继续累加
    - 验证速度显示正常
    - _Requirements: 3.1, 3.3, 3.5_
  
  - [ ] 10.3 测试停止功能
    - 从运行状态点击 Stop
    - 验证会话已从磁盘删除
    - 验证 UI 重置
    - _Requirements: 1.4_
  
  - [ ] 10.4 测试应用重启后恢复
    - 暂停一个任务
    - 关闭应用
    - 重新打开应用
    - 验证显示 pending sessions 对话框
    - 点击 Resume 恢复任务
    - _Requirements: 4.2, 4.3, 4.4_

- [ ] 11. Checkpoint - 确保所有测试通过
  - 确保暂停/恢复功能正常工作
  - 确保进度正确保存和恢复
  - 确保 UI 状态正确显示
  - 询问用户是否有问题

## Notes

- 任务 1-3 是核心 IPC 处理器修改（最重要）
- 任务 4-5 是破解逻辑的恢复支持
- 任务 6-7 是 SessionManager 增强
- 任务 8-9 是 UI 更新
- 任务 10 是测试验证

## Priority

**P0 (Critical)**:
- Task 1: 创建 zip:crack-pause 处理器
- Task 2: 修改 zip:crack-stop 处理器
- Task 3: 增强 zip:crack-resume 处理器
- Task 9.1: 分离 handlePause 和 handleStop

**P1 (High)**:
- Task 4: 创建 startCrackingWithResume 函数
- Task 5.1: 修改 runAIPhase 支持恢复
- Task 6: 增强 SessionManager
- Task 9.2-9.4: UI 更新

**P2 (Medium)**:
- Task 5.2-5.3: 其他 phases 支持恢复
- Task 7: 更新会话数据结构
- Task 8: Preload API

**P3 (Low)**:
- Task 10: 测试和验证
