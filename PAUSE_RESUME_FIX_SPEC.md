# Password Cracker Pause/Resume Fix - Spec Created

## 问题描述

用户报告：点击"暂停"按钮时，破解任务直接结束了，无法保留当前的破解进度和恢复进度。

**根本原因**：
1. `handlePause` 和 `handleCancel` 都调用了 `zipCrackStop`
2. `zipCrackStop` 会删除会话 (`crackSessions.delete(id)`)
3. `zipCrackResume` 只加载会话数据，但不重新启动破解任务

## Spec 文件位置

已创建完整的 spec 文档：

- **Requirements**: `.kiro/specs/password-cracker-pause-resume-fix/requirements.md`
- **Design**: `.kiro/specs/password-cracker-pause-resume-fix/design.md`
- **Tasks**: `.kiro/specs/password-cracker-pause-resume-fix/tasks.md`

## 核心需求

### Requirement 1: 分离暂停和停止功能
- 暂停：保存会话，停止进程，**不删除会话**
- 停止：删除会话，强制杀死进程

### Requirement 2: 实现暂停功能
- 创建专用的 `zip:crack-pause` IPC 处理器
- 保存会话状态：phase, tested passwords, speed
- 优雅停止进程（SIGTERM）
- UI 显示 "Paused" 状态和 "Resume" 按钮

### Requirement 3: 实现恢复功能
- 加载保存的会话数据
- 验证归档文件存在
- **重新启动破解任务**从保存的 phase 继续
- 跳过已测试的密码
- 继续累加 tested passwords 计数

### Requirement 4: 会话持久化
- 暂停时保存到磁盘
- 应用重启后加载 pending sessions
- 显示对话框让用户选择恢复或删除

### Requirement 5: UI 状态管理
- 运行时：显示 Pause + Stop 按钮
- 暂停时：显示 Resume + Stop 按钮
- 清晰的状态指示

### Requirement 6: 进度保存和恢复
- 保存：currentPhase, testedPasswords, batchIndex
- 恢复：从保存的 phase 和 batch 继续
- 不重复测试已测试的密码

### Requirement 7: 错误处理
- 暂停失败：保持任务运行
- 恢复失败：保持暂停状态
- 归档文件丢失：通知用户

## 设计要点

### 1. 新的 IPC 处理器

```javascript
// 暂停：保存会话，不删除
ipcMain.on('zip:crack-pause', (event, { id }) => {
    session.active = false;
    sessionManager.pauseSession(sessionId);
    // 不删除: crackSessions.delete(id)
    event.reply('zip:crack-paused', { id });
});

// 停止：删除会话
ipcMain.on('zip:crack-stop', (event, { id }) => {
    session.active = false;
    sessionManager.deleteSession(sessionId);
    crackSessions.delete(id); // 删除
    event.reply('zip:crack-stopped', { id });
});

// 恢复：重新启动破解
ipcMain.handle('zip:crack-resume', async (event, { sessionId }) => {
    const sessionData = sessionManager.loadSession(sessionId);
    sessionManager.resumeSession(sessionId);
    
    // 重新启动破解任务
    const jobId = Date.now().toString();
    startCrackingWithResume(event, jobId, sessionData.archivePath, 
        sessionData.options, {
            startPhase: sessionData.currentPhase,
            previousAttempts: sessionData.testedPasswords,
            sessionId: sessionId
        });
    
    return { success: true, jobId };
});
```

### 2. SessionManager 增强

```javascript
// 暂停：保存，不删除
pauseSession(sessionId) {
    session.status = 'paused';
    session.pausedAt = Date.now();
    this.saveSession(sessionId);
    // 不删除: this.sessions.delete(sessionId)
}

// 恢复：标记为 active
resumeSession(sessionId) {
    session.status = 'active';
    session.resumedAt = Date.now();
    this.saveSession(sessionId);
    return session;
}

// 删除：从内存和磁盘删除
deleteSession(sessionId) {
    this.sessions.delete(sessionId);
    fs.unlinkSync(sessionFile);
}
```

### 3. Phase 恢复支持

每个 phase 函数需要支持从指定点恢复：

```javascript
async function runAIPhase(archivePath, event, id, session, 
    previousAttempts, startTime, resumeState) {
    
    const startBatch = resumeState?.batchIndex || 1;
    
    for (let batchNum = startBatch; batchNum <= MAX_BATCHES; batchNum++) {
        // 从 startBatch 开始，不是从 1 开始
        // ...
    }
}
```

### 4. UI 更新

```jsx
// 分离 handlePause 和 handleStop
const handlePause = () => {
    window.api.zipCrackPause(crackJobId);
};

const handleStop = () => {
    window.api.zipCrackStop(crackJobId);
};

// 根据状态显示不同按钮
{crackStats.status !== 'paused' ? (
    <>
        <button onClick={handlePause}>⏸ Pause</button>
        <button onClick={handleStop}>⏹ Stop</button>
    </>
) : (
    <>
        <button onClick={() => handleResume(crackJobId)}>▶ Resume</button>
        <button onClick={handleStop}>⏹ Stop</button>
    </>
)}
```

## 实现任务

总共 11 个主要任务，分为 4 个优先级：

**P0 (Critical)** - 核心功能：
1. 创建 `zip:crack-pause` 处理器
2. 修改 `zip:crack-stop` 处理器
3. 增强 `zip:crack-resume` 处理器
4. UI: 分离 `handlePause` 和 `handleStop`

**P1 (High)** - 恢复逻辑：
5. 创建 `startCrackingWithResume()` 函数
6. 修改 `runAIPhase()` 支持恢复
7. 增强 SessionManager
8. UI 更新（状态显示、按钮切换）

**P2 (Medium)** - 完善功能：
9. 其他 phases 支持恢复
10. 更新会话数据结构
11. Preload API

**P3 (Low)** - 测试验证：
12. 测试暂停/恢复/停止功能
13. 测试应用重启后恢复

## 预期效果

修复后：
- ✅ 点击 Pause：任务暂停，进度保存，显示 Resume 按钮
- ✅ 点击 Resume：从暂停的 phase 继续，tested passwords 继续累加
- ✅ 点击 Stop：任务完全停止，会话删除
- ✅ 应用重启：显示 pending sessions，可以恢复
- ✅ 进度不丢失：暂停/恢复多次，进度正确累加

## 下一步

Spec 已创建完成，可以开始实现：

1. 查看 requirements.md 了解详细需求
2. 查看 design.md 了解设计方案
3. 查看 tasks.md 了解实现步骤
4. 按照 P0 → P1 → P2 → P3 的顺序实现

**建议从 P0 任务开始**，这些是核心功能，实现后就能基本解决用户的问题。

---

**创建日期**: 2026-01-15  
**状态**: ✅ Spec 已完成，等待实现
