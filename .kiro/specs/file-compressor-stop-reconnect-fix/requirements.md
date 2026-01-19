# Requirements Document

## Introduction

修复文件压缩器（File Compressor）中点击 Stop 按钮后 UI 卡在"Reconnecting to running session..."状态的问题。用户点击 Stop 后应该立即返回到文件上传界面，而不是持续尝试重连已停止的会话。

## Glossary

- **Stop_Operation**: 用户点击 Stop 按钮终止正在运行的密码破解任务的操作
- **Session_Reconnection**: 系统尝试重新连接到后台运行会话的过程
- **UI_Reset**: 将用户界面重置到初始状态（文件上传界面）的过程
- **Session_Cleanup**: 清理前端保存的会话 ID 和状态信息的过程
- **Event_Listener**: 监听窗口焦点、可见性等事件的处理器

## Requirements

### Requirement 1: Stop 操作后立即重置 UI

**User Story:** 作为用户，当我点击 Stop 按钮时，我希望界面立即返回到文件上传状态，这样我可以开始新的任务。

#### Acceptance Criteria

1. WHEN 用户点击 Stop 按钮 THEN 系统应该立即开始停止操作并显示"Stopping..."反馈
2. WHEN Stop 操作成功完成 THEN 系统应该将 UI 重置到初始文件上传界面
3. WHEN Stop 操作完成 THEN 系统应该清除所有会话相关的状态（crackJobId, crackSessionId, processing 等）
4. WHEN Stop 操作完成 THEN 系统应该清空当前文件列表，允许用户上传新文件
5. WHEN Stop 操作失败 THEN 系统应该显示错误信息并仍然重置 UI 到初始状态

### Requirement 2: 防止 Stop 后的会话重连尝试

**User Story:** 作为用户，当我停止一个任务后，我不希望系统继续尝试重连已停止的会话。

#### Acceptance Criteria

1. WHEN Stop 操作成功 THEN 系统应该清除所有保存的会话 ID（crackJobId 和 crackSessionId）
2. WHEN checkAndRestoreSession 函数被调用 THEN 系统应该检查是否有有效的会话 ID 才尝试重连
3. WHEN 后端返回"No session found"错误 THEN 系统应该停止重连尝试并重置 UI
4. WHEN Stop 操作完成后 THEN 所有事件监听器（focus, visibility 等）不应该触发会话重连
5. WHEN 会话 ID 为 null 或 undefined THEN checkAndRestoreSession 应该立即返回而不进行任何操作

### Requirement 3: 改进会话重连逻辑

**User Story:** 作为用户，我希望系统只在真正有运行中的会话时才尝试重连，避免无意义的重连尝试。

#### Acceptance Criteria

1. WHEN checkAndRestoreSession 被调用 THEN 系统应该首先检查本地是否有有效的会话 ID
2. WHEN 本地没有会话 ID THEN 系统应该跳过会话列表查询
3. WHEN 后端返回空会话列表 THEN 系统应该确保 UI 处于初始状态
4. WHEN 后端返回"session not found"错误 THEN 系统应该清除本地会话 ID 并重置 UI
5. WHEN 会话重连失败超过 3 次 THEN 系统应该停止重试并重置 UI

### Requirement 4: Stop 操作的原子性

**User Story:** 作为开发者，我希望 Stop 操作是原子性的，确保所有相关状态同时更新，避免状态不一致。

#### Acceptance Criteria

1. WHEN Stop 操作执行 THEN 所有状态更新（processing, crackJobId, crackSessionId, crackStats, crackFiles）应该在同一个操作中完成
2. WHEN Stop 操作完成 THEN stopRequestedRef 应该被重置为 false
3. WHEN Stop 操作完成 THEN isPausedRef 应该被重置为 false
4. WHEN Stop 操作完成 THEN 不应该有任何残留的定时器或事件监听器尝试重连
5. WHEN Stop 操作完成 THEN 系统应该处于完全干净的初始状态

### Requirement 5: 错误处理和用户反馈

**User Story:** 作为用户，当 Stop 操作遇到问题时，我希望看到清晰的错误信息和恢复选项。

#### Acceptance Criteria

1. WHEN Stop 操作超时（5秒）THEN 系统应该提供强制停止选项
2. WHEN Stop 操作失败 THEN 系统应该显示具体的错误信息
3. WHEN 强制停止被触发 THEN 系统应该无条件重置所有状态
4. WHEN 会话重连失败 THEN 系统应该显示友好的错误提示而不是持续重试
5. WHEN 用户在"Reconnecting"状态下点击 Stop THEN 系统应该立即取消重连并重置 UI
