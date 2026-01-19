# Stop Button with Paused Session Conflict Fix

## 问题描述

用户报告："还是不行我觉得应该是处在保存状态里问题，就是冲突了"

**根本原因**：当密码破解任务处于 **Paused（暂停）状态** 时，点击 Stop 按钮会导致冲突：

1. 用户点击 Pause 按钮暂停任务
2. 后端保存 session 到数据库（status = 'paused'）
3. 前端 UI 显示 "Cracking paused" 和 Resume 按钮
4. 用户点击 Stop 按钮
5. **问题**：Stop 调用 `zipCrackStop` API，但任务已经暂停，没有运行中的进程
6. **问题**：Stop 后 `resetToInitialState()` 清除前端状态，但后端 paused session 仍然存在
7. **问题**：`checkAndRestoreSession` 检测到 paused session，弹出恢复对话框
8. **结果**：用户无法正常返回文件上传界面

## 修复方案

### 1. 增强 handleStop 函数 - 区分 Paused 和 Running 状态

```javascript
const handleStop = async () => {
    if (mode === 'crack' && (crackJobId || crackSessionId)) { 
        const idToStop = crackSessionId || crackJobId;
        
        // ✅ 检测任务是否处于 paused 状态
        if (crackStats.status === 'paused') {
            console.log('[FileCompressor] Task is paused, deleting session instead of stopping');
            
            try {
                // ✅ 删除 paused session（不调用 stop API）
                if (window.api?.zipCrackDeleteSession) {
                    await window.api.zipCrackDeleteSession(idToStop);
                    console.log('[FileCompressor] Paused session deleted successfully');
                }
            } catch (error) {
                console.error('[FileCompressor] Failed to delete paused session:', error);
                // 即使删除失败也继续重置 UI
            }
            
            // ✅ 立即重置 UI
            resetToInitialState();
            toast.success('✅ Paused task cancelled');
            return;
        }
        
        // ✅ 对于运行中的任务，使用 stop API
        const result = await window.api?.zipCrackStop?.(idToStop, false);
        // ... 其余逻辑
    }
};
```

**关键改进**：
- ✅ 检测 `crackStats.status === 'paused'`
- ✅ Paused 状态：调用 `zipCrackDeleteSession` 删除 session
- ✅ Running 状态：调用 `zipCrackStop` 停止任务
- ✅ 两种情况都调用 `resetToInitialState()` 重置 UI

### 2. 增强 checkAndRestoreSession 函数 - 防止显示 Paused Sessions 对话框

```javascript
const checkAndRestoreSession = async () => {
    // ... 前置条件检查 ...
    
    if (runningSessions.length > 0) {
        // 自动恢复运行中的 session
        // ...
    } else {
        // ✅ 检查是否在 Stop 冷却期内
        const timeSinceStop = Date.now() - lastStopTimeRef.current;
        if (timeSinceStop < STOP_COOLDOWN_MS) {
            console.log('[FileCompressor] ⏳ In stop cooldown, not showing paused sessions dialog');
            return;
        }
        
        // 显示 paused sessions 对话框
        setPendingSessions(sessions);
        setShowSessionDialog(true);
    }
};
```

**关键改进**：
- ✅ 在显示 paused sessions 对话框前检查 Stop 冷却期
- ✅ 如果在 5 秒冷却期内，不显示对话框
- ✅ 防止 Stop 后立即弹出恢复对话框

## 修复效果

### Before (修复前)

1. 用户点击 Pause → 任务暂停 ✅
2. 用户点击 Stop → 调用 `zipCrackStop` ❌
3. 后端返回错误（任务未运行） ❌
4. 前端清除状态，但后端 session 仍存在 ❌
5. `checkAndRestoreSession` 检测到 paused session ❌
6. 弹出恢复对话框 ❌
7. 用户无法返回文件上传界面 ❌

### After (修复后)

1. 用户点击 Pause → 任务暂停 ✅
2. 用户点击 Stop → 检测到 paused 状态 ✅
3. 调用 `zipCrackDeleteSession` 删除 session ✅
4. 前端调用 `resetToInitialState()` 重置 UI ✅
5. UI 立即返回文件上传界面 ✅
6. 5 秒冷却期内不检查 sessions ✅
7. 不会弹出恢复对话框 ✅
8. 用户可以立即开始新任务 ✅

## 测试步骤

### 手动测试

1. **启动任务**
   - 进入 File Compressor 的 Crack 模式
   - 上传加密的 ZIP 文件
   - 点击 "Start Crack"
   - ✅ 验证任务开始运行

2. **暂停任务**
   - 点击 "Pause" 按钮
   - ✅ 验证 UI 显示 "Cracking paused"
   - ✅ 验证显示 "Resume" 按钮
   - ✅ 验证 Stop 按钮仍然可见

3. **停止暂停的任务**
   - 点击 "Stop" 按钮
   - ✅ 验证 UI 立即返回文件上传界面
   - ✅ 验证控制台显示 "Task is paused, deleting session instead of stopping"
   - ✅ 验证控制台显示 "Paused session deleted successfully"
   - ✅ 验证控制台显示 "State reset complete"
   - ✅ 验证没有 "session not found" 错误
   - ✅ 验证没有弹出恢复会话对话框

4. **验证可以开始新任务**
   - 上传新的 ZIP 文件
   - 点击 "Start Crack"
   - ✅ 验证新任务正常启动

### 预期控制台输出

**Stop Paused Task 成功：**
```
[FileCompressor] Requesting stop for: { crackJobId: xxx, crackSessionId: yyy, idToStop: yyy }
[FileCompressor] Task is paused, deleting session instead of stopping
[FileCompressor] Paused session deleted successfully
[FileCompressor] 🔄 Resetting to initial state
[FileCompressor] ✅ State reset complete
```

**不应该看到：**
```
[FileCompressor] 🔍 Window focused, checking for sessions...
[FileCompressor] Reconnecting to running session...
[Crack] No session found for id: xxx
```

## 成功标准

- ✅ Stop 按钮在 Paused 状态下正常工作
- ✅ Stop Paused Task 时调用 `zipCrackDeleteSession`
- ✅ Stop Running Task 时调用 `zipCrackStop`
- ✅ Stop 后立即返回文件上传界面
- ✅ Paused session 被正确删除
- ✅ 不会尝试重连到已删除的 session
- ✅ 不会弹出恢复会话对话框
- ✅ UI 状态完全重置
- ✅ 用户可以立即开始新任务

## 相关文件

- `src/renderer/src/pages/FileCompressor.jsx` - 主要修改文件
- `.kiro/specs/file-compressor-stop-reconnect-fix/requirements.md` - 需求文档
- `.kiro/specs/file-compressor-stop-reconnect-fix/design.md` - 设计文档
- `.kiro/specs/file-compressor-stop-reconnect-fix/tasks.md` - 任务列表
- `test-stop-paused-conflict.js` - 测试脚本
- `STOP_PAUSED_CONFLICT_FIX.md` - 本文档

## 技术细节

### 状态转换图

```
[Running] --Pause--> [Paused] --Resume--> [Running]
    |                    |
    |                    |
  Stop                 Stop
    |                    |
    v                    v
[Stopped/Initial] <-- Delete Session
```

### API 调用对比

| 任务状态 | Stop 操作 | API 调用 | 后端行为 |
|---------|----------|---------|---------|
| Running | Stop | `zipCrackStop(id, false)` | 停止运行中的进程 |
| Paused  | Stop | `zipCrackDeleteSession(id)` | 删除保存的 session |

### 冷却期机制

```javascript
const STOP_COOLDOWN_MS = 5000; // 5 秒

// Stop 时记录时间
lastStopTimeRef.current = Date.now();

// 检查会话时验证冷却期
const timeSinceStop = Date.now() - lastStopTimeRef.current;
if (timeSinceStop < STOP_COOLDOWN_MS) {
    return; // 跳过会话检查
}
```

## 总结

这次修复解决了 Stop 按钮与 Paused 状态的冲突问题：

1. **区分状态** - Stop 根据任务状态（Running/Paused）调用不同的 API
2. **正确清理** - Paused 任务调用 `zipCrackDeleteSession` 删除 session
3. **防止重连** - 冷却期内不显示 paused sessions 对话框
4. **原子重置** - 所有情况都调用 `resetToInitialState()` 确保 UI 一致

修复后，用户可以在任何状态下（Running 或 Paused）点击 Stop 按钮，UI 都会正确返回到文件上传界面，不会出现冲突或卡住的情况。
