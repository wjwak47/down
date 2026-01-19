# Implementation Plan: File Compressor Stop Reconnect Fix

## Overview

修复文件压缩器中 Stop 按钮点击后 UI 卡在"Reconnecting to running session..."状态的问题。实现包括原子性状态重置、增强的前置条件检查、优化的事件监听器和改进的错误处理。

## Tasks

- [x] 1. 创建原子性状态重置函数 ✅
  - 在 FileCompressor.jsx 中创建 `resetToInitialState()` 函数
  - 使用 `ReactDOM.flushSync()` 确保所有状态同时更新
  - 重置所有会话相关状态：crackJobId, crackSessionId, processing, crackStats, crackFiles, foundPassword
  - 重置所有 refs：stopRequestedRef, isPausedRef
  - 添加 lastStopTimeRef 来跟踪最后一次 Stop 时间
  - _Requirements: 1.2, 1.3, 1.4, 2.1, 4.1, 4.2, 4.3, 4.5_

- [ ] 1.1 Write property test for state reset completeness
  - **Property 1: Stop 操作后状态完全重置**
  - **Validates: Requirements 1.2, 1.3, 1.4, 2.1**

- [ ] 1.2 Write property test for atomic state updates
  - **Property 2: Stop 操作的原子性**
  - **Validates: Requirements 4.1, 4.5**

- [x] 2. 增强 handleStop 函数 ✅
  - 修改 handleStop 函数调用 resetToInitialState()
  - 确保成功和失败路径都调用状态重置
  - 在 finally 块中重置 stopRequestedRef
  - 记录 lastStopTimeRef 时间戳
  - _Requirements: 1.1, 1.2, 1.5, 5.2_

- [ ] 2.1 Write unit tests for handleStop
  - Test successful stop scenario
  - Test stop timeout scenario
  - Test stop error scenario
  - Verify state reset in all cases
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 3. 增强 handleForceStop 函数 ✅
  - 修改 handleForceStop 函数调用 resetToInitialState()
  - 确保无论后端返回什么结果都重置状态
  - _Requirements: 5.3_

- [ ] 3.1 Write property test for force stop
  - **Property 9: 强制停止的无条件重置**
  - **Validates: Requirements 5.3**

- [x] 4. 改进 checkAndRestoreSession 函数 - 添加前置条件检查 ✅
  - 添加 API 可用性检查
  - 添加 Stop 冷却期检查（5秒）
  - 添加 processing 和 crackJobId 状态检查
  - 如果前置条件不满足，立即返回
  - _Requirements: 2.2, 2.5, 3.1, 3.2_

- [ ] 4.1 Write property test for pre-condition checks
  - **Property 3: 会话重连的前置条件检查**
  - **Validates: Requirements 2.2, 2.5, 3.1, 3.2**

- [x] 5. 改进 checkAndRestoreSession 函数 - 错误处理 ✅
  - 捕获"No session found"和"session not found"错误
  - 错误发生时调用 resetToInitialState()
  - 重试失败 3 次后调用 resetToInitialState()
  - 空会话列表时检查并重置 UI 状态
  - _Requirements: 2.3, 3.3, 3.4, 3.5_

- [ ] 5.1 Write property test for error handling
  - **Property 4: 错误响应时的状态清理**
  - **Validates: Requirements 2.3, 3.4**

- [ ] 5.2 Write property test for retry limit
  - **Property 6: 重连失败后的重试限制**
  - **Validates: Requirements 3.5**

- [ ] 5.3 Write property test for empty session list
  - **Property 10: 空会话列表时的 UI 状态**
  - **Validates: Requirements 3.3**

- [ ] 6. Checkpoint - 测试状态重置和错误处理
  - 测试 Stop 操作后状态完全重置
  - 测试各种错误场景下的状态重置
  - 测试前置条件检查逻辑
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. 优化事件监听器 - 添加条件检查 ✅
  - 修改 focus 事件监听器，只在 !processing && !crackJobId 时触发
  - 修改 visibility 事件监听器，添加相同条件
  - 修改 periodic check，添加 Stop 冷却期检查
  - 在 useEffect 依赖项中添加 processing 和 crackJobId
  - _Requirements: 2.4_

- [ ] 7.1 Write property test for event listener behavior
  - **Property 5: Stop 后事件监听器不触发重连**
  - **Validates: Requirements 2.4**

- [x] 8. 添加 Stop 冷却期常量
  - 定义 STOP_COOLDOWN_MS = 5000 常量
  - 在所有相关检查中使用此常量
  - _Requirements: 2.4_

- [ ] 9. 改进 Stop 失败时的用户反馈
  - 确保所有错误路径都显示 toast 消息
  - 超时时显示强制停止对话框
  - 添加友好的错误提示文本
  - _Requirements: 5.1, 5.2, 5.4_

- [ ] 9.1 Write unit tests for error feedback
  - Test toast messages for different error types
  - Test force stop dialog display
  - _Requirements: 5.1, 5.2_

- [ ] 10. 测试"Reconnecting"状态下的 Stop 操作
  - 确保在重连状态下点击 Stop 可以正常工作
  - 验证 Stop 会取消重连并重置 UI
  - _Requirements: 5.5_

- [ ] 10.1 Write unit test for stop during reconnection
  - Test stop button works during "Reconnecting" state
  - Verify UI resets correctly
  - _Requirements: 5.5_

- [x] 11. 添加调试日志 ✅
  - 在 resetToInitialState 中添加日志
  - 在前置条件检查中添加日志
  - 在错误处理路径中添加日志
  - 帮助调试和监控状态转换
  - _Requirements: All_

- [ ] 12. Final Integration Testing
  - 测试完整的 Stop → UI Reset → 新任务启动流程
  - 测试 Stop 后窗口焦点变化不触发重连
  - 测试后端会话删除后前端的响应
  - 测试多次快速 Stop 操作的处理
  - _Requirements: All_

- [ ] 12.1 Write integration tests
  - Test complete stop-to-restart workflow
  - Test focus changes after stop
  - Test rapid stop operations
  - _Requirements: All_

- [ ] 13. Final checkpoint - 验证所有功能
  - 验证 Stop 操作立即返回文件上传界面
  - 验证 Stop 后不会尝试重连
  - 验证错误处理正确
  - 验证事件监听器优化生效
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Focus on atomic state updates and proper error handling
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The core fix is in tasks 1-5, tasks 6-13 are enhancements and testing
