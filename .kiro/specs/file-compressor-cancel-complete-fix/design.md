# File Compressor Cancel Complete Fix - Design

## Overview

This design provides a comprehensive solution to completely terminate all password cracking processes when the user clicks Cancel. The current issue is that multiple layers of processes (BatchTestManager, Workers, Hashcat, 7za.exe) continue running even after the Cancel button is clicked. This design implements a multi-layered termination strategy that ensures complete process cleanup.

## Architecture

### Termination Strategy Layers

1. **Immediate UI Response**: Cancel button immediately disables and shows canceling status
2. **Session Flag Setting**: Set global cancellation flags to stop all loops and operations
3. **BatchTestManager Termination**: Terminate all batch testing processes first
4. **Process Registry Cleanup**: Terminate all registered processes and workers
5. **System-Level Cleanup**: Use OS commands to kill any remaining processes
6. **State Reset**: Complete UI and session state cleanup

## Components and Interfaces

### Enhanced Cancel Handler (Frontend)
```javascript
const handleCancel = async () => {
    // 1. Immediate UI feedback
    setProcessing(false);
    setCancelInProgress(true);
    setCrackStats(prev => ({ ...prev, current: 'Canceling all processes...' }));
    
    // 2. Call backend termination
    const result = await window.api.zipCrackForceStop(crackJobId);
    
    // 3. Complete UI reset
    resetToInitialState();
    setCancelInProgress(false);
};
```

### Force Stop API (Backend)
```javascript
ipcMain.handle('zip:crack-force-stop', async (event, { id }) => {
    console.log('[ForceStop] Initiating complete termination for:', id);
    
    // 1. Set global stop flags
    const session = crackSessions.get(id);
    if (session) {
        session.active = false;
        session.forceStop = true;
    }
    
    // 2. Terminate BatchTestManager processes
    await terminateBatchManagers(id);
    
    // 3. Terminate all registered processes
    await terminateAllProcesses(id, true);
    
    // 4. System-level cleanup
    await systemLevelCleanup();
    
    // 5. Session cleanup
    await cleanupSession(session, id, 'force_stop');
    
    return { success: true, message: 'All processes terminated' };
});
```

### BatchTestManager Termination
```javascript
async function terminateBatchManagers(sessionId) {
    const session = crackSessions.get(sessionId);
    if (!session || !session.batchManagers) return;
    
    console.log('[ForceStop] Terminating BatchTestManager processes...');
    
    for (const batchManager of session.batchManagers) {
        try {
            // Terminate all active processes in BatchTestManager
            batchManager.terminateAllProcesses();
            
            // Clear password queues
            batchManager.clearQueue();
            
            // Reset manager state
            batchManager.reset();
        } catch (error) {
            console.error('[ForceStop] BatchTestManager termination error:', error);
        }
    }
    
    // Clear the array
    session.batchManagers = [];
}
```

### System-Level Process Cleanup
```javascript
async function systemLevelCleanup() {
    console.log('[ForceStop] Starting system-level process cleanup...');
    
    try {
        if (isWindows) {
            // Windows: Use multiple termination methods
            const processNames = ['7za.exe', '7z.exe', 'hashcat.exe', 'python.exe'];
            
            for (const name of processNames) {
                // Method 1: taskkill
                try {
                    execSync(`taskkill /F /IM ${name}`, { timeout: 5000 });
                    console.log(`[ForceStop] Killed all ${name} processes`);
                } catch (e) {}
                
                // Method 2: wmic (more thorough)
                try {
                    execSync(`wmic process where "name='${name}'" delete`, { timeout: 5000 });
                    console.log(`[ForceStop] WMIC killed ${name} processes`);
                } catch (e) {}
            }
            
            // Method 3: PowerShell (most thorough)
            try {
                const psCommand = `Get-Process | Where-Object {$_.ProcessName -match '7za|7z|hashcat|python'} | Stop-Process -Force`;
                execSync(`powershell -Command "${psCommand}"`, { timeout: 5000 });
                console.log('[ForceStop] PowerShell cleanup completed');
            } catch (e) {}
            
        } else {
            // Mac/Linux: Use pkill with various patterns
            const patterns = ['7za', '7z', 'hashcat', 'python.*crack'];
            
            for (const pattern of patterns) {
                try {
                    execSync(`pkill -f ${pattern}`, { timeout: 5000 });
                    console.log(`[ForceStop] Killed processes matching: ${pattern}`);
                } catch (e) {}
            }
            
            // Also try killall
            try {
                execSync('killall 7za 7z hashcat', { timeout: 5000 });
                console.log('[ForceStop] Killall cleanup completed');
            } catch (e) {}
        }
    } catch (error) {
        console.error('[ForceStop] System cleanup error:', error);
    }
}
```

## Data Models

### Session State Enhancement
```javascript
const session = {
    id: 'session-id',
    active: true,
    forceStop: false,  // New flag for force termination
    batchManagers: [], // Array of BatchTestManager instances
    processes: new Set(), // All spawned processes
    workers: new Set(),   // All worker threads
    cleanup: []          // Cleanup functions
};
```

### Cancel State (Frontend)
```javascript
const [cancelInProgress, setCancelInProgress] = useState(false);
const [forceStopAvailable, setForceStopAvailable] = useState(false);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Complete Process Termination
*For any* active password cracking session, when force stop is called, all related processes should be terminated within 5 seconds
**Validates: Requirements 1.1, 1.2**

### Property 2: No Orphaned Processes
*For any* canceled session, no 7za.exe, hashcat.exe, or python.exe processes should remain running after termination completes
**Validates: Requirements 1.2, 2.2**

### Property 3: UI State Consistency
*For any* cancel operation, the UI should return to initial state regardless of whether process termination succeeds or fails
**Validates: Requirements 3.1, 3.2**

### Property 4: Termination Idempotence
*For any* session, calling force stop multiple times should have the same effect as calling it once
**Validates: Requirements 4.1, 4.2**

### Property 5: Background Activity Cessation
*For any* active password testing loop, setting the forceStop flag should cause the loop to exit within one iteration
**Validates: Requirements 2.1, 2.2**

## Error Handling

### Graceful Degradation
- If individual process termination fails, escalate to system-level termination
- If system-level termination fails, still reset UI to allow user to continue
- Log all failures for debugging but don't block UI reset

### Timeout Handling
- Each termination method has a 5-second timeout
- If timeout is reached, move to next termination method
- Total operation should complete within 15 seconds maximum

### User Feedback
- Show progress of termination steps
- Display specific error messages if termination fails
- Provide "Force Stop" button as last resort

## Testing Strategy

### Unit Tests
- Test individual termination functions
- Test session state management
- Test UI state transitions
- Test error handling scenarios

### Integration Tests
- Test complete cancel flow from UI to backend
- Test system-level process cleanup
- Test multiple concurrent sessions
- Test termination under various system conditions

### Property Tests
- Verify complete process termination across different system states
- Test termination idempotence with random session configurations
- Verify UI consistency across various failure scenarios