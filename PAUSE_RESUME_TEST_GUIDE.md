# 暂停/恢复功能测试指南
# Pause/Resume Feature Test Guide

## 测试前准备 (Prerequisites)

1. 准备一个加密的 ZIP 文件用于测试
2. 确保应用已重新构建并运行
3. 打开开发者工具查看控制台日志

1. Prepare an encrypted ZIP file for testing
2. Ensure app is rebuilt and running
3. Open DevTools to view console logs

## 测试场景 (Test Scenarios)

### 场景 1: 基本暂停/恢复流程 (Basic Pause/Resume Flow)

**步骤 (Steps):**

1. 打开 File Compressor 页面
2. 切换到 "Crack" 模式
3. 选择一个加密的 ZIP 文件
4. 点击 "Start Cracking" 开始破解
5. 等待几秒钟，让破解进行一段时间
6. 点击 "Pause" 按钮

**预期结果 (Expected Results):**

✅ UI 显示 "Paused" 状态
✅ 显示 "Resume" 按钮（绿色）
✅ 显示 "Stop" 按钮（红色）
✅ 不显示 "Pause" 按钮
✅ 进度信息保持显示（尝试次数、速度等）
✅ `crackJobId` 保持不变

**控制台日志检查 (Console Log Checks):**

Backend:
```
[Crack] Pause requested for: [jobId]
[Crack] Saving session state...
[SessionManager] Session saved: [sessionId]
[Crack] ⏸️  PAUSED - NOT sending zip:crack-complete, keeping session
```

Frontend:
```
[FileCompressor] 📤 Sending pause request for job: [jobId]
[FileCompressor] 🔔 onZipCrackPaused received: [jobId]
[FileCompressor] Setting status to paused, keeping crackJobId: [jobId]
```

❌ **不应该看到** (Should NOT see):
```
[Crack] ✅ SENDING zip:crack-complete
[FileCompressor] 🔔 onZipCrackResult received
```

---

### 场景 2: 从暂停状态恢复 (Resume from Paused State)

**前提条件 (Prerequisites):**
- 完成场景 1，任务处于暂停状态

**步骤 (Steps):**

1. 点击 "Resume" 按钮

**预期结果 (Expected Results):**

✅ UI 显示 "Resuming..." 状态
✅ 破解任务继续执行
✅ 显示 "Pause" 按钮
✅ 显示 "Stop" 按钮
✅ 进度从暂停点继续（不从头开始）
✅ 尝试次数累加（不重置为 0）

**控制台日志检查 (Console Log Checks):**

Frontend:
```
[FileCompressor] Resuming session: [sessionId]
[FileCompressor] isPausedRef.current: false (after reset)
```

Backend:
```
[Crack] Resume requested for: [sessionId]
[Crack] Reusing existing session: [sessionId]
[Crack] Resume state: { startPhase: X, previousAttempts: Y, phaseState: {...} }
[Crack] Starting from phase: X
```

---

### 场景 3: 暂停后停止 (Stop After Pause)

**前提条件 (Prerequisites):**
- 完成场景 1，任务处于暂停状态

**步骤 (Steps):**

1. 点击 "Stop" 按钮

**预期结果 (Expected Results):**

✅ UI 重置到初始状态
✅ 不显示 Resume 按钮
✅ 会话被删除
✅ `crackJobId` 被清除

**控制台日志检查 (Console Log Checks):**

Frontend:
```
[FileCompressor] Requesting stop for job: [jobId]
[FileCompressor] isPausedRef.current: false (after reset)
```

Backend:
```
[Crack] Stop requested for: [jobId]
[SessionManager] Session deleted: [sessionId]
[Crack] ⛔ SENDING zip:crack-complete (stopped)
```

---

### 场景 4: 竞态条件测试 (Race Condition Test)

**目的 (Purpose):**
验证即使 `zip:crack-complete` 事件在暂停后到达，UI 也不会重置

**步骤 (Steps):**

1. 开始破解任务
2. 在破解刚开始时（1-2秒内）快速点击 "Pause"
3. 观察 UI 和日志

**预期结果 (Expected Results):**

✅ UI 保持在 "Paused" 状态
✅ 即使日志中出现 `zip:crack-complete`，UI 也应该忽略它
✅ Resume 按钮保持可见

**控制台日志检查 (Console Log Checks):**

如果出现竞态条件，应该看到：

Frontend:
```
[FileCompressor] 🔔 onZipCrackResult received: {...}
[FileCompressor] isPausedRef.current: true
[FileCompressor] ⚠️  Ignoring crack-complete because isPausedRef is true
```

---

### 场景 5: 应用重启后恢复会话 (Resume Session After App Restart)

**步骤 (Steps):**

1. 开始破解任务
2. 点击 "Pause"
3. 关闭应用
4. 重新打开应用
5. 打开 File Compressor 页面

**预期结果 (Expected Results):**

✅ 显示 "Resume Cracking Session" 对话框
✅ 列出未完成的会话
✅ 显示会话信息（文件名、进度、时间等）
✅ 可以点击 "Resume" 恢复会话
✅ 可以点击 "Delete" 删除会话

---

### 场景 6: 多次暂停/恢复循环 (Multiple Pause/Resume Cycles)

**步骤 (Steps):**

1. 开始破解任务
2. 暂停 → 恢复 → 暂停 → 恢复（重复 3-5 次）
3. 最后让任务完成或手动停止

**预期结果 (Expected Results):**

✅ 每次暂停/恢复都正常工作
✅ 进度持续累加
✅ 没有内存泄漏或性能问题
✅ 日志显示正确的状态转换

---

## 常见问题排查 (Troubleshooting)

### 问题 1: 点击暂停后 UI 仍然重置

**检查 (Check):**
1. 确认 `isPausedRef` 已正确导入和初始化
2. 检查 `handlePaused` 是否设置了 `isPausedRef.current = true`
3. 检查 `onZipCrackResult` 是否检查了 `isPausedRef.current`
4. 查看控制台日志，确认是否有 "Ignoring crack-complete" 消息

### 问题 2: Resume 按钮不显示

**检查 (Check):**
1. 确认 `crackStats.status === 'paused'`
2. 确认 `crackJobId` 不为 null
3. 检查 UI 渲染逻辑（line 887-895）

### 问题 3: 恢复后从头开始

**检查 (Check):**
1. 确认会话已正确保存（查看 SessionManager 日志）
2. 确认 `resumeState` 包含正确的 `startPhase` 和 `previousAttempts`
3. 检查 `crackWithHashcatResume` 是否跳过了已完成的阶段

---

## 性能监控 (Performance Monitoring)

在测试过程中，监控以下指标：

During testing, monitor these metrics:

1. **内存使用** (Memory Usage): 暂停/恢复不应导致内存泄漏
2. **CPU 使用** (CPU Usage): 暂停后 CPU 应该降到接近 0%
3. **会话文件大小** (Session File Size): 检查 `.kiro/sessions/` 目录
4. **日志文件大小** (Log File Size): 确保日志不会无限增长

---

## 成功标准 (Success Criteria)

所有测试场景都应该通过，并且：

All test scenarios should pass, and:

- ✅ 暂停后 UI 保持在 "Paused" 状态
- ✅ Resume 按钮可见且功能正常
- ✅ 进度正确保存和恢复
- ✅ 没有竞态条件导致的 UI 重置
- ✅ 日志清晰显示状态转换
- ✅ 没有内存泄漏或性能问题
- ✅ 应用重启后可以恢复会话

---

## 报告问题 (Reporting Issues)

如果发现问题，请提供：

If you find issues, please provide:

1. 详细的重现步骤 (Detailed reproduction steps)
2. 控制台日志（前端和后端）(Console logs - frontend and backend)
3. 会话文件内容（如果相关）(Session file content if relevant)
4. 屏幕截图或录屏 (Screenshots or screen recording)
5. 系统信息（OS, Node 版本等）(System info - OS, Node version, etc.)
