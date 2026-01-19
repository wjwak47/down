# 暂停/恢复按钮显示问题修复方案

## 🔍 问题分析

用户报告：点击暂停之后，没有看到绿色的恢复按钮。

### 根本原因分析

通过代码分析，发现了以下关键问题：

1. **按钮显示逻辑正确**：
   ```javascript
   {mode === 'crack' && crackStats.status === 'paused' ? (
       // Show Resume button when paused
       <button onClick={() => handleResume(crackSessionId, crackFiles[0])}>Resume</button>
   ) : mode === 'crack' && crackStats.status !== 'paused' && (
       // Show Pause button when running  
       <button onClick={handlePause}>Pause</button>
   )}
   ```

2. **暂停事件处理逻辑正确**：
   ```javascript
   const handlePaused = ({ id, sessionId }) => {
       // ✅ 正确设置状态
       setCrackStats(prev => ({ ...prev, status: 'paused', current: 'Paused' }));
       // ✅ 正确保存 sessionId
       if (sessionId) setCrackSessionId(sessionId);
   };
   ```

3. **后端暂停处理正确**：
   ```javascript
   ipcMain.on('zip:crack-pause', (event, { id }) => {
       // ✅ 正确发送暂停事件
       event.reply('zip:crack-paused', { id, sessionId: session.sessionId });
   });
   ```

### 🎯 可能的问题原因

经过分析，问题可能出现在以下几个方面：

#### 1. 竞态条件问题
- `onZipCrackResult` 事件可能在 `onZipCrackPaused` 之后触发
- `onZipCrackResult` 会重置 UI 状态，导致暂停状态被覆盖

#### 2. 事件监听器重复注册
- 在 `preload/index.js` 中发现重复注册：
  ```javascript
  onZipCrackPaused: (callback) => ipcRenderer.on('zip:crack-paused', (_, data) => callback(data)),
  onZipCrackPaused: (callback) => ipcRenderer.on('zip:crack-paused', (_, data) => callback(data)), // 重复！
  ```

#### 3. 状态更新时机问题
- React 状态更新可能存在批处理延迟
- 多个状态更新可能相互覆盖

## 🔧 修复方案

### 修复1: 移除重复的事件监听器注册

**文件**: `src/preload/index.js`

```javascript
// 修复前（有重复）:
onZipCrackPaused: (callback) => ipcRenderer.on('zip:crack-paused', (_, data) => callback(data)),
onZipCrackPaused: (callback) => ipcRenderer.on('zip:crack-paused', (_, data) => callback(data)),

// 修复后（移除重复）:
onZipCrackPaused: (callback) => ipcRenderer.on('zip:crack-paused', (_, data) => callback(data)),
```

### 修复2: 增强竞态条件保护

**文件**: `src/renderer/src/pages/FileCompressor.jsx`

在 `onZipCrackResult` 处理器中增加暂停状态检查：

```javascript
window.api.onZipCrackResult?.(({ success, password: pwd, error, stopped }) => {
    console.log('[FileCompressor] 🔔 onZipCrackResult received:', { success, password: !!pwd, error, stopped });
    
    // ✅ CRITICAL: 忽略暂停状态下的完成事件
    if (isPausedRef.current) {
        console.log('[FileCompressor] ⚠️  Ignoring crack-complete because isPausedRef is true');
        return;
    }
    
    // 其余处理逻辑...
    setProcessing(false); 
    setCrackJobId(null);
    // ...
});
```

### 修复3: 增强调试日志

在关键位置添加调试日志来帮助诊断问题：

```javascript
// 在按钮渲染逻辑中添加调试
console.log('[FileCompressor] Button render check:', {
    mode,
    status: crackStats.status,
    processing,
    crackJobId,
    crackSessionId,
    showResume: mode === 'crack' && crackStats.status === 'paused',
    showPause: mode === 'crack' && crackStats.status !== 'paused' && processing
});
```

### 修复4: 状态更新原子化

确保暂停状态更新是原子的：

```javascript
const handlePaused = ({ id, sessionId }) => {
    console.log('[FileCompressor] 🔔 onZipCrackPaused received:', id, 'sessionId:', sessionId);
    
    // ✅ 原子化状态更新
    setCrackStats(prev => {
        const newStats = { ...prev, status: 'paused', current: 'Paused' };
        console.log('[FileCompressor] Setting crackStats to paused:', newStats);
        return newStats;
    });
    
    // ✅ 设置暂停标志
    isPausedRef.current = true;
    
    // ✅ 保存 sessionId
    if (sessionId) {
        console.log('[FileCompressor] Setting crackSessionId:', sessionId);
        setCrackSessionId(sessionId);
    }
};
```

## 🧪 测试验证步骤

### 1. 检查控制台日志
启动密码破解任务，然后点击暂停，检查控制台是否有以下日志：

```
[FileCompressor] 📤 Sending pause request for job: <jobId>
[Crack] ⏸️  Pause requested for: <jobId>
[Crack] Session paused successfully, sessionId: <sessionId>
[FileCompressor] 🔔 onZipCrackPaused received: <jobId> sessionId: <sessionId>
[FileCompressor] Setting crackStats to paused: { status: 'paused', ... }
```

### 2. 检查按钮状态
暂停后，检查以下状态：
- `crackStats.status` 应该为 `'paused'`
- `crackSessionId` 应该有值
- `processing` 应该保持为 `true`
- Resume 按钮应该显示

### 3. 验证 Resume 功能
点击 Resume 按钮，确认：
- 使用正确的 `sessionId`
- 任务能够正确恢复
- UI 状态正确更新

## 📋 修复清单

- [ ] 移除 `preload/index.js` 中重复的事件监听器
- [ ] 增强 `onZipCrackResult` 中的竞态条件保护
- [ ] 添加调试日志到按钮渲染逻辑
- [ ] 原子化暂停状态更新
- [ ] 测试暂停/恢复功能
- [ ] 验证控制台日志输出

## 🎯 预期结果

修复后，用户点击暂停按钮应该：
1. 看到控制台输出正确的暂停日志
2. UI 立即显示绿色的 Resume 按钮
3. Resume 按钮能够正确恢复任务
4. 不会出现 UI 状态重置的问题

## 🔍 如果问题仍然存在

如果修复后问题仍然存在，请检查：
1. 浏览器开发者工具的 Console 标签页
2. 确认是否有 JavaScript 错误
3. 检查 React DevTools 中的组件状态
4. 验证 IPC 通信是否正常工作