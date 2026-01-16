# AI Phase Speed Display Fix

## 问题描述 (Problem Description)

用户报告在破解阶段，速度显示一直是 "0 per second"，即使 Python 脚本测试正常（2秒生成100个密码）。

User reported that during the cracking phase, the speed display shows "0 per second" even though the Python script tests successfully (generates 100 passwords in ~2 seconds).

## 根本原因 (Root Cause)

在 AI Phase 的流式生成过程中，我们在 "Generating" 和 "Testing" 阶段发送了 `speed: 0` 的进度更新：

```javascript
// 问题代码 (Problem Code)
sendCrackProgress(event, id, session, {
    attempts: totalAttempts,
    speed: 0,  // ❌ 这会重置速度显示
    current: 'AI Batch 1/100: Generating...',
    method: 'PassGPT AI Streaming'
});
```

这导致每次生成新批次时，UI 显示的速度都被重置为 0，即使实际测试速度很快。

This caused the UI speed display to be reset to 0 every time a new batch was generated, even though the actual testing speed was fast.

## 解决方案 (Solution)

### 1. 修改 `sendCrackProgress` 函数

只在速度大于 0 时更新速度统计：

```javascript
// 修复后 (Fixed)
function sendCrackProgress(event, id, session, updates = {}) {
    // ...
    // Only update speed if it's a positive number (don't reset to 0)
    if (speed !== undefined && speed > 0) {
        session.stats.updateSpeed(speed);
    }
    // ...
}
```

### 2. 移除 AI Phase 中的 `speed: 0` 调用

在生成和测试阶段不发送 speed 参数，保持之前的速度显示：

```javascript
// 修复后 (Fixed)
sendCrackProgress(event, id, session, {
    attempts: totalAttempts,
    // 不发送 speed: 0，保持之前的速度显示
    current: `AI Batch ${batchNum}/${MAX_BATCHES}: Generating...`,
    method: 'PassGPT AI Streaming'
});
```

## 修改的文件 (Modified Files)

- `src/main/modules/fileCompressor/index.js`
  - Line ~33-60: `sendCrackProgress` 函数 - 添加 `speed > 0` 检查
  - Line ~950: 移除 "Loading AI model" 阶段的 `speed: 0`
  - Line ~975: 移除 "Generating" 阶段的 `speed: 0`
  - Line ~990: 移除 "Testing" 阶段的 `speed: 0`

## 预期效果 (Expected Result)

修复后，速度显示应该：

1. ✅ 在测试密码时显示实际速度（例如：50 pwd/s）
2. ✅ 在生成密码时保持之前的速度显示（不重置为 0）
3. ✅ 在批次之间平滑过渡，不会闪烁或跳变

After the fix, the speed display should:

1. ✅ Show actual speed during password testing (e.g., 50 pwd/s)
2. ✅ Maintain previous speed display during password generation (not reset to 0)
3. ✅ Smoothly transition between batches without flickering

## 测试建议 (Testing Recommendations)

1. 启动一个加密文件的破解任务
2. 观察 AI Phase 的速度显示
3. 确认速度不会在 "Generating" 和 "Testing" 之间重置为 0
4. 确认速度显示反映实际的测试速度

1. Start a crack task on an encrypted file
2. Observe the speed display during AI Phase
3. Confirm speed doesn't reset to 0 between "Generating" and "Testing"
4. Confirm speed display reflects actual testing speed

## 技术细节 (Technical Details)

### 速度计算逻辑 (Speed Calculation Logic)

速度在每次批量测试完成后计算：

```javascript
const elapsed = (Date.now() - startTime) / 1000;
const speed = elapsed > 0 ? Math.round((totalAttempts - previousAttempts) / elapsed) : 0;
sendCrackProgress(event, id, session, {
    attempts: totalAttempts,
    speed,  // 只在这里发送实际速度
    current: `AI Batch ${batchNum}/${MAX_BATCHES}: ${totalAttempts - previousAttempts}/${totalGenerated} tested`,
    method: 'PassGPT AI Streaming'
});
```

### UI 显示逻辑 (UI Display Logic)

UI 直接显示 `crackStats.speed` 的数值：

```jsx
<p className="text-xl font-semibold text-slate-800 dark:text-white">
    {crackStats.speed?.toLocaleString() || 0}
</p>
<p className="text-xs text-slate-500">per second</p>
```

## 相关文档 (Related Documentation)

- `AI_STREAMING_IMPLEMENTATION.md` - 流式生成实现详情
- `AI_PHASE_PERFORMANCE_FIX.md` - 性能优化历史
- `STREAMING_GENERATION_SUMMARY.md` - 流式生成总结

---

**修复日期 (Fix Date)**: 2026-01-15  
**修复版本 (Fix Version)**: v1.1.5  
**状态 (Status)**: ✅ 已完成 (Completed)
