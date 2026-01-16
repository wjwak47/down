# 暂停/恢复功能 Bug 修复

## 问题描述

用户报告：点击 Pause 按钮后，任务立即结束，而不是保存进度等待恢复。

## 根本原因

当用户点击 Pause 按钮时：

1. `zip:crack-pause` 处理器设置 `session.active = false`
2. 破解循环检测到 `!session.active` 并退出
3. 返回到 `zip:crack-start` 或 `startCrackingWithResume` 函数
4. 检测到 `!session.active` → 认为是"用户停止" → 发送 `zip:crack-complete` 事件
5. UI 收到 `zip:crack-complete` → 任务结束

**问题**：无法区分"暂停"（pause）和"停止"（stop）两种情况，都是通过 `session.active = false` 实现的。

## 解决方案

添加 `session.paused` 标志来区分暂停和停止：

### 1. 修改 `zip:crack-pause` 处理器

```javascript
ipcMain.on('zip:crack-pause', (event, { id }) => {
    const session = crackSessions.get(id);
    if (session) {
        session.active = false;
        session.paused = true; // ✅ 添加 paused 标志
        
        // 保存会话...
        sessionManager.pauseSession(session.sessionId);
        
        // 发送 paused 事件
        event.reply('zip:crack-paused', { id });
    }
});
```

### 2. 修改任务完成逻辑

在 `zip:crack-start` 和 `startCrackingWithResume` 中：

```javascript
try {
    const result = await crackWithSmartStrategy(...);
    
    clearInterval(saveInterval);
    const elapsed = (Date.now() - startTime) / 1000;
    
    if (result.found) {
        // 找到密码 → 完成
        sessionManager.completeSession(session.sessionId, true, result.found);
        crackSessions.delete(id);
        event.reply('zip:crack-complete', { id, success: true, password: result.found });
    } else if (session.paused) {
        // ✅ 暂停 → 不发送 crack-complete，保持会话
        console.log('[Crack] Paused by user - keeping session');
        // 不删除 session，不发送 crack-complete
    } else if (!session.active) {
        // 停止 → 删除会话
        sessionManager.deleteSession(session.sessionId);
        crackSessions.delete(id);
        event.reply('zip:crack-complete', { id, success: false, stopped: true });
    } else {
        // 未找到密码 → 完成
        sessionManager.completeSession(session.sessionId, false);
        crackSessions.delete(id);
        event.reply('zip:crack-complete', { id, success: false });
    }
}
```

## 修复效果

### 修复前

```
用户点击 Pause
  ↓
session.active = false
  ↓
破解循环退出
  ↓
检测到 !session.active
  ↓
发送 zip:crack-complete (stopped: true)
  ↓
UI 显示任务结束 ❌
```

### 修复后

```
用户点击 Pause
  ↓
session.active = false
session.paused = true ✅
  ↓
破解循环退出
  ↓
检测到 session.paused ✅
  ↓
不发送 zip:crack-complete
保持会话在内存和磁盘 ✅
  ↓
UI 显示 "Paused" 状态
显示 Resume 按钮 ✅
```

## 状态流转

### Pause 流程
```
Running (active: true, paused: false)
  ↓ 点击 Pause
Paused (active: false, paused: true)
  ↓ 不发送 crack-complete
会话保持在 crackSessions Map 中
会话保存到磁盘
```

### Stop 流程
```
Running (active: true, paused: false)
  ↓ 点击 Stop
Stopped (active: false, paused: false)
  ↓ 发送 crack-complete (stopped: true)
会话从 crackSessions Map 删除
会话从磁盘删除
```

### Resume 流程
```
Paused (active: false, paused: true)
  ↓ 点击 Resume
Running (active: true, paused: false)
  ↓ 从保存的 phase 继续
tested passwords 继续累加
```

## 测试验证

### 测试场景 1：暂停和恢复
1. 启动破解任务
2. 等待几秒（让它测试一些密码）
3. 点击 Pause 按钮
4. 验证：
   - ✅ UI 显示 "Paused" 状态
   - ✅ 显示 Resume + Stop 按钮
   - ✅ 不显示 "任务结束" 消息
   - ✅ 会话文件存在于磁盘
5. 点击 Resume 按钮
6. 验证：
   - ✅ 破解继续
   - ✅ tested passwords 从暂停时的值继续累加
   - ✅ 从保存的 phase 继续

### 测试场景 2：停止
1. 启动破解任务
2. 点击 Stop 按钮
3. 验证：
   - ✅ UI 显示任务结束
   - ✅ 会话从磁盘删除
   - ✅ 无法恢复

## 修改的文件

- `src/main/modules/fileCompressor/index.js`
  - `zip:crack-pause` 处理器：添加 `session.paused = true`
  - `zip:crack-start` 处理器：检查 `session.paused` 标志
  - `startCrackingWithResume` 函数：检查 `session.paused` 标志

## 技术细节

### 标志优先级

检查顺序很重要：

```javascript
if (result.found) {
    // 1. 找到密码（最高优先级）
} else if (session.paused) {
    // 2. 暂停（不发送 complete）
} else if (!session.active) {
    // 3. 停止（发送 complete with stopped: true）
} else {
    // 4. 未找到密码（发送 complete with success: false）
}
```

### 为什么需要两个标志？

- `session.active = false`：告诉破解循环停止处理
- `session.paused = true`：告诉完成逻辑这是暂停而不是停止

如果只用一个标志，无法区分这两种情况。

## 总结

通过添加 `session.paused` 标志，我们成功区分了"暂停"和"停止"两种操作：

- **暂停**：`active = false, paused = true` → 保持会话，不发送 complete
- **停止**：`active = false, paused = false` → 删除会话，发送 complete

这样用户点击 Pause 按钮后，任务会正确暂停并保存进度，而不是立即结束。

---

**修复时间**: 2026-01-16  
**状态**: ✅ 已修复并测试
