# Design Document

## Overview

本设计文档解决文件压缩器中 Stop 按钮点击后 UI 卡在"Reconnecting to running session..."状态的问题。核心问题是 Stop 操作成功删除后端会话后，前端仍然保留会话 ID，导致多个事件监听器不断触发重连尝试。

解决方案包括：
1. 增强 Stop 操作的状态清理逻辑，确保所有会话相关状态被原子性地清除
2. 改进 `checkAndRestoreSession` 函数，添加前置条件检查，避免无效的重连尝试
3. 优化事件监听器逻辑，防止 Stop 后触发重连
4. 改进错误处理，当后端返回"session not found"时立即重置 UI

## Architecture

### Current Issues Analysis

1. **Stop 后状态残留**: Stop 操作虽然清除了部分状态，但可能存在时序问题导致某些状态未被清除
2. **无条件重连尝试**: `checkAndRestoreSession` 函数被多个事件触发，没有检查是否有有效会话 ID
3. **事件监听器过度活跃**: focus, visibility, periodic check 等多个监听器在 Stop 后仍然活跃
4. **错误处理不足**: 当后端返回"No session found"错误时，前端没有清除本地会话 ID

### Solution Architecture

```
Frontend State Management
├── Stop Operation Handler
│   ├── Atomic State Reset
│   │   ├── Clear crackJobId
│   │   ├── Clear crackSessionId
│   │   ├── Reset processing flag
│   │   ├── Clear crackStats
│   │   ├── Clear crackFiles
│   │   └── Reset all refs
│   ├── Backend Stop Request
│   │   ├── Normal stop (SIGTERM)
│   │   └── Force stop (SIGKILL)
│   └── UI Reset
│       ├── Return to upload interface
│       └── Clear all progress indicators
│
├── Session Reconnection Logic
│   ├── Pre-condition Checks
│   │   ├── Check crackJobId exists
│   │   ├── Check crackSessionId exists
│   │   └── Check processing flag
│   ├── Backend Session Query
│   │   ├── List active sessions
│   │   └── Handle "not found" errors
│   └── Error Handling
│       ├── Clear local state on error
│       ├── Reset UI on repeated failures
│       └── Stop retry after threshold
│
└── Event Listener Management
    ├── Conditional Triggering
    │   ├── Only trigger if has valid session
    │   └── Skip if recently stopped
    ├── Debouncing
    │   └── Prevent rapid repeated calls
    └── Cleanup on Stop
        └── Disable reconnection attempts
```

## Components and Interfaces

### 1. Enhanced Stop Handler

#### Atomic State Reset Function
```javascript
// 原子性地重置所有状态到初始值
const resetToInitialState = () => {
    console.log('[FileCompressor] Resetting to initial state');
    
    // 使用 batch 更新确保原子性（React 18+）
    ReactDOM.flushSync(() => {
        setProcessing(false);
        setCrackJobId(null);
        setCrackSessionId(null);
        setFoundPassword(null);
        setCrackStats({ 
            speed: 0, 
            attempts: 0, 
            progress: 0, 
            currentLength: minLength, 
            current: '', 
            eta: 0, 
            tested: 0, 
            total: 0,
            status: undefined 
        });
        setCrackFiles([]);
        
        // 重置所有 refs
        stopRequestedRef.current = false;
        isPausedRef.current = false;
        lastStopTimeRef.current = Date.now(); // 记录停止时间
    });
};
```

#### Enhanced Stop Handler with State Cleanup
```javascript
const handleStop = async () => {
    // 防止重复调用
    if (stopRequestedRef.current || stopInProgress) {
        console.log('[FileCompressor] Stop already in progress');
        return;
    }
    
    if (mode === 'crack' && crackJobId) {
        stopRequestedRef.current = true;
        isPausedRef.current = false;
        setStopInProgress(true);
        
        try {
            console.log('[FileCompressor] Requesting stop for job:', crackJobId);
            setCrackStats(prev => ({ ...prev, current: 'Stopping...', status: 'stopping' }));
            
            // 设置超时（5秒）
            const stopPromise = window.api?.zipCrackStop?.(crackJobId, false);
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Stop timeout')), 5000)
            );
            
            const result = await Promise.race([stopPromise, timeoutPromise]);
            
            if (result?.success) {
                console.log('[FileCompressor] Stop successful');
                // ✅ 使用原子性重置函数
                resetToInitialState();
                toast.success('✅ Task stopped successfully');
            } else {
                throw new Error(result?.error || 'Stop operation failed');
            }
            
        } catch (error) {
            console.error('[FileCompressor] Stop operation failed:', error);
            
            if (error.message === 'Stop timeout') {
                console.log('[FileCompressor] Stop timeout - offering force termination');
                setShowForceStopDialog(true);
            } else {
                toast.error('❌ Failed to stop task: ' + error.message);
                // ✅ 即使出错也重置状态
                resetToInitialState();
            }
        } finally {
            setStopInProgress(false);
            stopRequestedRef.current = false;
        }
    } else {
        // 对于 compress/extract 模式，直接重置状态
        setProcessing(false);
        setProgress({});
    }
};
```

### 2. Improved Session Reconnection Logic

#### Pre-condition Checks
```javascript
// ✅ 添加 ref 来跟踪最后一次 Stop 时间
const lastStopTimeRef = useRef(0);
const STOP_COOLDOWN_MS = 5000; // Stop 后 5 秒内不尝试重连

const checkAndRestoreSession = async () => {
    console.log('[FileCompressor] Starting session check...');
    
    // ✅ Pre-condition 1: 检查 API 是否可用
    if (!window.api?.zipCrackListSessions) {
        console.log('[FileCompressor] API not available');
        return;
    }
    
    // ✅ Pre-condition 2: 检查是否在 Stop 冷却期内
    const timeSinceStop = Date.now() - lastStopTimeRef.current;
    if (timeSinceStop < STOP_COOLDOWN_MS) {
        console.log(`[FileCompressor] In stop cooldown period (${timeSinceStop}ms), skipping session check`);
        return;
    }
    
    // ✅ Pre-condition 3: 检查是否已经在处理中
    if (processing && crackJobId) {
        console.log('[FileCompressor] Already processing, skipping session check');
        return;
    }
    
    // ✅ Pre-condition 4: 检查是否有本地会话 ID（如果没有，说明没有需要恢复的会话）
    // 注意：这里我们允许没有本地 ID 的情况下查询，因为可能有后台运行的会话
    // 但如果明确知道刚刚执行了 Stop，则跳过
    
    try {
        // ✅ 查询后端会话，带重试机制
        let sessions = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries && !sessions) {
            try {
                console.log(`[FileCompressor] Checking sessions (attempt ${retryCount + 1}/${maxRetries})...`);
                const response = await window.api.zipCrackListSessions();
                sessions = response?.sessions || [];
                break;
            } catch (error) {
                console.error(`[FileCompressor] Session check attempt ${retryCount + 1} failed:`, error);
                
                // ✅ 如果是"session not found"错误，清除本地状态并停止重试
                if (error.message?.includes('No session found') || 
                    error.message?.includes('session not found')) {
                    console.log('[FileCompressor] Session not found, clearing local state');
                    resetToInitialState();
                    return;
                }
                
                retryCount++;
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        // ✅ 如果重试失败，重置 UI
        if (!sessions) {
            console.log('[FileCompressor] Failed to get sessions after all retries, resetting UI');
            resetToInitialState();
            return;
        }
        
        console.log('[FileCompressor] Found sessions:', sessions);
        
        // ✅ 如果没有运行中的会话，确保 UI 处于初始状态
        if (sessions.length === 0) {
            console.log('[FileCompressor] No sessions found, ensuring UI is in initial state');
            if (processing || crackJobId || crackSessionId) {
                resetToInitialState();
            }
            return;
        }
        
        // 检查是否有运行中的会话
        const runningSessions = sessions.filter(s => 
            s.status === 'running' || s.status === 'active'
        );
        
        if (runningSessions.length > 0) {
            // 自动恢复运行中的会话
            const runningSession = runningSessions[0];
            console.log('[FileCompressor] Restoring running session:', runningSession.id);
            
            setMode('crack');
            setProcessing(true);
            setCrackJobId(runningSession.jobId || runningSession.id);
            setCrackSessionId(runningSession.id);
            
            // 重置 pause ref
            if (isPausedRef.current) {
                isPausedRef.current = false;
            }
            
            setCrackStats(prev => ({
                ...prev,
                status: 'running',
                current: 'Reconnected to running session...',
                attempts: runningSession.testedPasswords || 0,
                progress: runningSession.progress || 0
            }));
            
            // 添加文件到列表
            if (runningSession.filePath && !crackFiles.includes(runningSession.filePath)) {
                setCrackFiles(prev => [...prev, runningSession.filePath]);
            }
            
            toast.info('🔄 Reconnected to running session');
        }
        
    } catch (error) {
        console.error('[FileCompressor] Session check error:', error);
        // ✅ 出错时重置 UI
        resetToInitialState();
    }
};
```

### 3. Event Listener Optimization

#### Conditional Event Triggering
```javascript
useEffect(() => {
    // ✅ 优化事件监听器，添加条件检查
    const handleFocus = () => {
        // 只在没有活动任务时检查会话
        if (!processing && !crackJobId) {
            console.log('[FileCompressor] Window focused, checking for sessions...');
            setTimeout(checkAndRestoreSession, 500);
        } else {
            console.log('[FileCompressor] Window focused, but task is active, skipping check');
        }
    };
    
    const handleVisibilityChange = () => {
        if (!document.hidden && !processing && !crackJobId) {
            console.log('[FileCompressor] Page became visible, checking for sessions...');
            setTimeout(checkAndRestoreSession, 500);
        }
    };
    
    // ✅ 优化周期性检查，只在真正需要时执行
    const periodicCheck = setInterval(() => {
        // 只在以下条件都满足时检查：
        // 1. 没有正在处理的任务
        // 2. 没有活动的 job ID
        // 3. 页面可见
        // 4. 不在 Stop 冷却期内
        const timeSinceStop = Date.now() - lastStopTimeRef.current;
        if (!processing && 
            !crackJobId && 
            document.visibilityState === 'visible' &&
            timeSinceStop >= STOP_COOLDOWN_MS) {
            console.log('[FileCompressor] Periodic session check...');
            checkAndRestoreSession();
        }
    }, 30000); // 每 30 秒检查一次
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(periodicCheck);
    };
}, [processing, crackJobId]); // ✅ 添加依赖项，确保使用最新状态
```

## Data Models

### UI State Model
```typescript
interface UIState {
    mode: 'compress' | 'extract' | 'crack';
    processing: boolean;
    crackJobId: string | null;
    crackSessionId: string | null;
    crackStats: {
        speed: number;
        attempts: number;
        progress: number;
        currentLength: number;
        current: string;
        eta: number;
        tested: number;
        total: number;
        status?: 'running' | 'stopping' | 'stopped' | 'paused' | 'force_stopping';
    };
    crackFiles: string[];
    foundPassword: string | null;
}

// 初始状态
const INITIAL_UI_STATE: UIState = {
    mode: 'compress',
    processing: false,
    crackJobId: null,
    crackSessionId: null,
    crackStats: {
        speed: 0,
        attempts: 0,
        progress: 0,
        currentLength: 1,
        current: '',
        eta: 0,
        tested: 0,
        total: 0,
        status: undefined
    },
    crackFiles: [],
    foundPassword: null
};
```

### Stop Operation State
```typescript
interface StopOperationState {
    stopInProgress: boolean;
    stopRequestedRef: boolean;
    lastStopTime: number;
    showForceStopDialog: boolean;
}
```

## Correctness Properties

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### Property 1: Stop 操作后状态完全重置
*For any* 成功的 Stop 操作，所有会话相关的状态（crackJobId, crackSessionId, processing, crackStats, crackFiles）应该被重置为初始值。
**Validates: Requirements 1.2, 1.3, 1.4, 2.1**

### Property 2: Stop 操作的原子性
*For any* Stop 操作，所有状态更新应该在同一个操作中完成，不应该存在部分状态被更新而其他状态未更新的中间状态。
**Validates: Requirements 4.1, 4.5**

### Property 3: 会话重连的前置条件检查
*For any* checkAndRestoreSession 调用，如果没有有效的会话 ID 或在 Stop 冷却期内，函数应该立即返回而不进行后端查询。
**Validates: Requirements 2.2, 2.5, 3.1, 3.2**

### Property 4: 错误响应时的状态清理
*For any* 后端返回"session not found"或"No session found"错误的情况，系统应该清除本地会话 ID 并重置 UI 到初始状态。
**Validates: Requirements 2.3, 3.4**

### Property 5: Stop 后事件监听器不触发重连
*For any* Stop 操作完成后的 5 秒内，即使触发 focus 或 visibility 事件，也不应该尝试会话重连。
**Validates: Requirements 2.4**

### Property 6: 重连失败后的重试限制
*For any* 连续失败的会话重连尝试，当失败次数达到 3 次时，系统应该停止重试并重置 UI。
**Validates: Requirements 3.5**

### Property 7: Refs 的同步重置
*For any* Stop 操作完成时，stopRequestedRef 和 isPausedRef 应该都被重置为 false。
**Validates: Requirements 4.2, 4.3**

### Property 8: Stop 失败时的 UI 重置
*For any* 失败的 Stop 操作（包括超时和错误），系统应该仍然重置 UI 到初始状态，确保用户可以重新开始。
**Validates: Requirements 1.5, 5.2**

### Property 9: 强制停止的无条件重置
*For any* 强制停止操作，无论后端返回什么结果，系统都应该无条件地重置所有状态到初始值。
**Validates: Requirements 5.3**

### Property 10: 空会话列表时的 UI 状态
*For any* 后端返回空会话列表的情况，如果当前 UI 显示有活动任务（processing=true 或 crackJobId 不为 null），系统应该重置 UI 到初始状态。
**Validates: Requirements 3.3**

## Error Handling

### Stop Operation Errors
- **Timeout (5秒)**: 显示强制停止对话框，让用户选择是否强制终止
- **Backend Error**: 显示错误信息，但仍然重置 UI，确保用户可以继续使用
- **Network Error**: 视为 Stop 失败，重置 UI

### Session Reconnection Errors
- **"No session found"**: 立即清除本地会话 ID，重置 UI，停止重连尝试
- **Network Timeout**: 重试最多 3 次，失败后重置 UI
- **Repeated Failures**: 3 次失败后停止重试，重置 UI，显示友好错误提示

### State Inconsistency
- **Partial State Update**: 使用 ReactDOM.flushSync 确保原子性更新
- **Race Conditions**: 使用 refs 和时间戳防止竞态条件
- **Stale Closures**: 在 useEffect 依赖项中包含所有相关状态

## Testing Strategy

### Unit Tests
- 测试 `resetToInitialState` 函数是否正确重置所有状态
- 测试 `handleStop` 在各种场景下的行为（成功、失败、超时）
- 测试 `checkAndRestoreSession` 的前置条件检查
- 测试事件监听器的条件触发逻辑
- 测试错误处理路径

### Property-Based Tests
每个属性测试应该运行最少 100 次迭代，并使用以下标签格式：
**Feature: file-compressor-stop-reconnect-fix, Property {number}: {property_text}**

- **Property 1**: 生成随机的运行状态，执行 Stop，验证所有状态被重置
- **Property 2**: 在 Stop 过程中检查状态，确保没有中间不一致状态
- **Property 3**: 生成各种会话 ID 状态（null, undefined, valid），验证前置条件检查
- **Property 4**: 模拟"session not found"错误，验证状态清理
- **Property 5**: 在 Stop 后立即触发事件，验证不会重连
- **Property 6**: 模拟连续失败，验证重试限制
- **Property 7**: 验证 Stop 后 refs 的状态
- **Property 8**: 模拟各种 Stop 失败场景，验证 UI 重置
- **Property 9**: 测试强制停止在各种情况下的行为
- **Property 10**: 模拟空会话列表响应，验证 UI 状态

### Integration Tests
- 测试完整的 Stop → UI Reset → 新任务启动流程
- 测试 Stop 后窗口焦点变化不触发重连
- 测试后端会话删除后前端的响应
- 测试多次快速 Stop 操作的处理

### Manual Testing Scenarios
1. 启动密码破解任务，点击 Stop，验证立即返回文件上传界面
2. 启动任务，点击 Stop，然后切换窗口焦点，验证不会尝试重连
3. 启动任务，点击 Stop，等待 5 秒后切换焦点，验证可以正常检查会话
4. 模拟后端会话已删除的情况，验证前端正确处理
5. 测试 Stop 超时场景，验证强制停止功能
