# Pause/Resume Race Condition Fix

## 问题描述 (Problem Description)

用户点击暂停按钮后，UI 立即重置到初始状态，即使后端日志显示会话已正确保存。

When user clicks pause button, UI immediately resets to initial state, even though backend logs show session is saved correctly.

## 根本原因 (Root Cause)

存在竞态条件 (Race Condition):

1. 用户点击暂停 → User clicks Pause
2. 后端设置 `session.paused = true` 并保存会话 → Backend sets `session.paused = true` and saves session
3. 后端发送 `zip:crack-paused` 事件 → Backend sends `zip:crack-paused` event
4. **但是** UI 的 `onZipCrackResult` 事件监听器（监听 `zip:crack-complete`）可能在暂停事件之后触发
5. `onZipCrackResult` 处理器**总是**调用 `setCrackJobId(null)`，导致 UI 重置

The issue is a race condition:

1. User clicks Pause
2. Backend sets `session.paused = true` and saves session
3. Backend sends `zip:crack-paused` event
4. **BUT** UI's `onZipCrackResult` event listener (listening to `zip:crack-complete`) might be triggered after pause
5. `onZipCrackResult` handler **always** calls `setCrackJobId(null)`, causing UI reset

### 闭包问题 (Closure Issue)

`onZipCrackResult` 处理器在 `useEffect` 中定义，它捕获了定义时的 `crackStats` 值。这意味着即使状态已更新为 'paused'，处理器仍然看到旧值。

The `onZipCrackResult` handler is defined inside `useEffect`, which captures the `crackStats` value at definition time. This means even if state is updated to 'paused', the handler still sees the old value.

## 解决方案 (Solution)

### 1. 使用 useRef 跟踪暂停状态 (Use useRef to Track Pause State)

添加 `isPausedRef` 来跟踪暂停状态，避免闭包问题：

Added `isPausedRef` to track pause state and avoid closure issues:

```javascript
const isPausedRef = useRef(false);
```

### 2. 在 onZipCrackResult 中检查暂停状态 (Check Pause State in onZipCrackResult)

修改 `onZipCrackResult` 处理器，如果处于暂停状态则忽略事件：

Modified `onZipCrackResult` handler to ignore event if in paused state:

```javascript
window.api.onZipCrackResult?.(({ success, password: pwd, error, stopped }) => {
    console.log('[FileCompressor] 🔔 onZipCrackResult received:', { success, password: !!pwd, error, stopped });
    console.log('[FileCompressor] isPausedRef.current:', isPausedRef.current);
    
    // ✅ CRITICAL: Ignore this event if we're in paused state
    if (isPausedRef.current) {
        console.log('[FileCompressor] ⚠️  Ignoring crack-complete because isPausedRef is true');
        return;
    }
    
    setProcessing(false); setCrackJobId(null);
    // ... rest of handler
});
```

### 3. 在暂停时设置 Ref (Set Ref on Pause)

```javascript
const handlePaused = ({ id }) => {
    isPausedRef.current = true; // ✅ Set ref to prevent crack-complete from resetting
    setProcessing(false);
    setCrackStats(prev => ({ ...prev, status: 'paused', current: 'Paused' }));
};
```

### 4. 在开始/恢复时重置 Ref (Reset Ref on Start/Resume)

```javascript
const handleCrack = () => {
    isPausedRef.current = false; // ✅ Reset on new crack
    // ... start crack
};

const handleResume = async (sessionId) => {
    isPausedRef.current = false; // ✅ Reset on resume
    // ... resume crack
};

const handleStop = () => {
    isPausedRef.current = false; // ✅ Reset on stop
    // ... stop crack
};
```

### 5. 增强日志记录 (Enhanced Logging)

添加详细日志以跟踪事件流：

Added detailed logging to track event flow:

**Backend (src/main/modules/fileCompressor/index.js):**
- ✅ SENDING zip:crack-complete (password found)
- ⏸️  PAUSED - NOT sending zip:crack-complete
- ⛔ SENDING zip:crack-complete (stopped)
- ❌ SENDING zip:crack-complete (not found)

**Frontend (src/renderer/src/pages/FileCompressor.jsx):**
- 🔔 onZipCrackResult received
- 🔔 onZipCrackPaused received
- 📤 Sending pause request
- ⚠️  Ignoring crack-complete because isPausedRef is true

## 修改的文件 (Modified Files)

1. **src/renderer/src/pages/FileCompressor.jsx**
   - Added `useRef` import
   - Added `isPausedRef` ref
   - Modified `onZipCrackResult` to check ref before processing
   - Modified `handlePaused` to set ref
   - Modified `handleCrack`, `handleResume`, `handleStop` to reset ref
   - Enhanced logging

2. **src/main/modules/fileCompressor/index.js**
   - Enhanced logging in `startCrackingWithResume` completion handler
   - Enhanced logging in `zip:crack-start` completion handler
   - Added emoji indicators for different event types

## 测试步骤 (Testing Steps)

1. 启动破解任务 → Start crack task
2. 点击暂停 → Click Pause
3. 验证 UI 显示 "Paused" 状态和 Resume 按钮 → Verify UI shows "Paused" status with Resume button
4. 检查日志确认没有发送 `zip:crack-complete` → Check logs confirm no `zip:crack-complete` sent
5. 点击 Resume → Click Resume
6. 验证任务从保存的进度继续 → Verify task continues from saved progress
7. 点击 Stop → Click Stop
8. 验证会话被删除 → Verify session is deleted

## 预期结果 (Expected Results)

- ✅ 点击暂停后，UI 保持在 "Paused" 状态
- ✅ Resume 按钮可见且可点击
- ✅ `crackJobId` 保持不变（不被清除）
- ✅ 后端不发送 `zip:crack-complete` 事件
- ✅ 即使有竞态条件，UI 也会忽略 `zip:crack-complete` 事件

- ✅ After clicking pause, UI stays in "Paused" state
- ✅ Resume button is visible and clickable
- ✅ `crackJobId` remains set (not cleared)
- ✅ Backend does not send `zip:crack-complete` event
- ✅ Even if race condition occurs, UI ignores `zip:crack-complete` event

## 技术细节 (Technical Details)

### 为什么使用 useRef 而不是 useState?

Why use useRef instead of useState?

1. **避免闭包问题** - `useRef` 的 `.current` 值总是最新的，不会被闭包捕获
2. **不触发重新渲染** - 更新 ref 不会导致组件重新渲染
3. **同步访问** - 可以立即读取和写入，没有 setState 的异步延迟

1. **Avoid closure issues** - `useRef`'s `.current` value is always current, not captured by closures
2. **No re-renders** - Updating ref doesn't cause component re-render
3. **Synchronous access** - Can read/write immediately, no async delay from setState

### 防御性编程 (Defensive Programming)

这个修复采用了防御性编程策略：

This fix uses defensive programming:

- **后端防御**: 检查 `session.paused` 标志，不发送 `zip:crack-complete`
- **前端防御**: 即使收到 `zip:crack-complete`，也检查 `isPausedRef` 并忽略

- **Backend defense**: Check `session.paused` flag, don't send `zip:crack-complete`
- **Frontend defense**: Even if `zip:crack-complete` received, check `isPausedRef` and ignore

这种双重防御确保即使有竞态条件或意外事件，UI 也不会错误地重置。

This double defense ensures UI won't incorrectly reset even with race conditions or unexpected events.
