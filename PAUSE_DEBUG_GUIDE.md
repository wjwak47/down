# 暂停功能调试指南
# Pause Function Debug Guide

## 当前状态 (Current Status)

用户报告：点击暂停后，UI 立即回到初始界面。

User reports: After clicking pause, UI immediately returns to initial screen.

## 需要收集的日志 (Logs to Collect)

请按照以下步骤操作并收集完整的控制台日志：

Please follow these steps and collect complete console logs:

### 步骤 1: 打开开发者工具 (Step 1: Open DevTools)

1. 在应用中按 `Ctrl+Shift+I` (Windows) 或 `Cmd+Option+I` (Mac)
2. 切换到 "Console" 标签
3. 清空控制台（右键 → Clear console）

### 步骤 2: 开始破解任务 (Step 2: Start Crack Task)

1. 选择一个加密的 ZIP 文件
2. 点击 "Start Cracking"
3. 等待 2-3 秒，让任务开始运行

### 步骤 3: 点击暂停 (Step 3: Click Pause)

1. 点击 "Pause" 按钮
2. **立即**复制控制台中的所有日志

### 步骤 4: 查找关键日志 (Step 4: Find Key Logs)

在日志中查找以下关键信息：

Look for these key log entries:

#### A. 暂停请求 (Pause Request)

```
[FileCompressor] 📤 Sending pause request for job: [jobId]
```

#### B. 后端接收暂停 (Backend Receives Pause)

```
[Crack] ⏸️  Pause requested for: [jobId]
[Crack] Session found, current state: { active: true, paused: false, currentPhase: 0 }
[Crack] Flags set: { active: false, paused: true }
[Crack] Saving session state...
[SessionManager] Session saved: [sessionId]
```

#### C. 暂停确认 (Pause Confirmation)

```
[FileCompressor] 🔔 onZipCrackPaused received: [jobId]
[FileCompressor] Setting status to paused, keeping crackJobId: [jobId]
```

#### D. 任务完成检查 (Task Completion Check)

```
[startCrackingWithResume] Task completed, checking status: {
  found: false,
  paused: true,  // ⚠️ 这个应该是 true
  active: false,
  sessionExists: true
}
```

#### E. 是否发送了 crack-complete? (Was crack-complete sent?)

查找以下任一日志：

Look for any of these logs:

```
[Crack] ✅ SENDING zip:crack-complete (password found)
[Crack] ⏸️  PAUSED - NOT sending zip:crack-complete, keeping session
[Crack] ⛔ SENDING zip:crack-complete (stopped)
[Crack] ❌ SENDING zip:crack-complete (not found)
```

#### F. UI 是否收到 crack-complete? (Did UI receive crack-complete?)

```
[FileCompressor] 🔔 onZipCrackResult received: { success: false, password: false, error: undefined, stopped: true }
[FileCompressor] isPausedRef.current: false  // ⚠️ 这个应该是 true
```

如果看到这个，说明 UI 收到了 crack-complete 事件！

If you see this, it means UI received crack-complete event!

## 可能的问题场景 (Possible Problem Scenarios)

### 场景 A: paused 标志未设置 (paused flag not set)

**症状 (Symptoms):**
```
[startCrackingWithResume] Task completed, checking status: {
  found: false,
  paused: false,  // ❌ 应该是 true
  active: false
}
[Crack] ⛔ SENDING zip:crack-complete (stopped)
```

**原因 (Cause):** 暂停处理器没有正确设置 `session.paused = true`

**解决方案 (Solution):** 已在代码中添加日志确认标志设置

### 场景 B: 时序问题 (Timing Issue)

**症状 (Symptoms):**
```
[Crack] Flags set: { active: false, paused: true }
[startCrackingWithResume] Task completed, checking status: {
  paused: false,  // ❌ 标志丢失了
  active: false
}
```

**原因 (Cause):** 破解循环在暂停处理器设置标志之前就完成了

**解决方案 (Solution):** 已添加 100ms 延迟确保标志被设置

### 场景 C: UI 忽略失败 (UI Ignore Failed)

**症状 (Symptoms):**
```
[Crack] ⏸️  PAUSED - NOT sending zip:crack-complete
[FileCompressor] 🔔 onZipCrackResult received: { ... }
[FileCompressor] isPausedRef.current: false  // ❌ 应该是 true
```

**原因 (Cause):** `isPausedRef` 没有被正确设置

**解决方案 (Solution):** 已在 `handlePaused` 中设置 `isPausedRef.current = true`

### 场景 D: 会话被删除 (Session Deleted)

**症状 (Symptoms):**
```
[startCrackingWithResume] Task completed, checking status: {
  sessionExists: false  // ❌ 会话不存在
}
```

**原因 (Cause):** 会话在检查之前被删除了

**解决方案 (Solution):** 确保暂停处理器不删除会话

## 最新修改 (Latest Changes)

### 1. 添加延迟 (Added Delay)

在检查 `session.paused` 之前添加 100ms 延迟：

```javascript
await new Promise(resolve => setTimeout(resolve, 100));
```

这确保暂停处理器有时间设置标志。

### 2. 增强日志 (Enhanced Logging)

添加了详细的状态日志：

```javascript
console.log('[Crack] Session found, current state:', {
    active: session.active,
    paused: session.paused || false,
    currentPhase: session.currentPhase
});

console.log('[Crack] Flags set:', {
    active: session.active,
    paused: session.paused
});
```

### 3. 检查会话存在 (Check Session Exists)

```javascript
console.log('[startCrackingWithResume] Task completed, checking status:', {
    found: !!result.found,
    paused: !!session.paused,
    active: !!session.active,
    sessionExists: !!crackSessions.get(id)
});
```

## 下一步 (Next Steps)

1. **重新构建应用** - 确保最新代码生效
2. **清空控制台** - 开始新的测试
3. **执行测试** - 按照上述步骤操作
4. **收集日志** - 复制完整的控制台输出
5. **分析日志** - 查找上述关键日志条目
6. **报告结果** - 告诉我看到了什么

## 预期的正确日志流程 (Expected Correct Log Flow)

```
1. [FileCompressor] 📤 Sending pause request for job: 1768484318622
2. [Crack] ⏸️  Pause requested for: 1768484318622
3. [Crack] Session found, current state: { active: true, paused: false, currentPhase: 0 }
4. [Crack] Flags set: { active: false, paused: true }
5. [Crack] Saving session state...
6. [SessionManager] Session saved: 130ebeae7bd35ea3d0e4c1bd45c6f47a
7. [Crack] Session paused successfully
8. [FileCompressor] 🔔 onZipCrackPaused received: 1768484318622
9. [FileCompressor] Setting status to paused, keeping crackJobId: 1768484318622
10. [startCrackingWithResume] Task completed, checking status: { found: false, paused: true, active: false, sessionExists: true }
11. [Crack] ⏸️  PAUSED - NOT sending zip:crack-complete, keeping session
```

**不应该看到 (Should NOT see):**
- `[Crack] ⛔ SENDING zip:crack-complete (stopped)`
- `[FileCompressor] 🔔 onZipCrackResult received`

如果看到这些，说明出现了问题！

If you see these, there's a problem!
