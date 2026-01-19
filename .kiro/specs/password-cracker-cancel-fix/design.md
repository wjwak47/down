# Design Document: Password Cracker Cancel Fix

## Overview

This design addresses the critical issue where clicking the cancel button doesn't completely terminate all password cracking processes. The solution implements a comprehensive multi-layered termination strategy with process verification and enhanced user feedback.

## Architecture

The cancel system uses a hierarchical approach:

```
User Click Cancel
    ↓
Frontend handleStop()
    ↓
Backend zipCrackForceStop()
    ↓
Multi-Layer Termination
    ↓
Process Verification
    ↓
UI Reset & Feedback
```

## Components and Interfaces

### 1. Enhanced Frontend Cancel Handler

**Location**: `src/renderer/src/pages/FileCompressor.jsx`

**Key Improvements**:
- Immediate UI feedback with progress indicators
- Process verification after termination attempts
- Fallback to stronger termination methods
- Enhanced error handling and user messaging

```javascript
const handleStop = async () => {
    // Phase 1: Immediate UI feedback
    setCrackStats(prev => ({ ...prev, current: 'Stopping all processes...', status: 'canceling' }));
    
    // Phase 2: Multi-layer termination
    const result = await window.api.zipCrackForceStop(idToStop);
    
    // Phase 3: Process verification
    const verification = await window.api.zipCrackVerifyTermination();
    
    // Phase 4: UI reset and feedback
    if (verification.success) {
        resetToInitialState();
        toast.success('✅ All processes terminated');
    } else {
        // Offer nuclear option
        setShowForceStopDialog(true);
    }
};
```

### 2. Enhanced Backend Termination System

**Location**: `src/main/modules/fileCompressor/index.js`

**New Components**:

#### A. Process Registry System
```javascript
const processRegistry = new Map(); // Track all spawned processes
const registerProcess = (sessionId, process, type) => {
    if (!processRegistry.has(sessionId)) {
        processRegistry.set(sessionId, []);
    }
    processRegistry.get(sessionId).push({ process, type, pid: process.pid });
};
```

#### B. Enhanced Force Stop Handler
```javascript
ipcMain.handle('zip:crack-force-stop', async (event, { id }) => {
    const results = {
        sessionCleanup: false,
        processTermination: false,
        systemCleanup: false,
        verification: false
    };
    
    // Step 1: Session-level cleanup
    results.sessionCleanup = await cleanupSession(id);
    
    // Step 2: Process-level termination
    results.processTermination = await terminateRegisteredProcesses(id);
    
    // Step 3: System-level cleanup
    results.systemCleanup = await systemLevelCleanup();
    
    // Step 4: Verification
    results.verification = await verifyProcessTermination();
    
    return {
        success: results.verification,
        details: results,
        message: generateStatusMessage(results)
    };
});
```

#### C. Process Verification System
```javascript
async function verifyProcessTermination() {
    const processNames = ['7za.exe', 'hashcat.exe', 'python.exe', 'bkcrack.exe'];
    const runningProcesses = [];
    
    for (const name of processNames) {
        try {
            if (isWindows) {
                const result = execSync(`tasklist /FI "IMAGENAME eq ${name}"`, { encoding: 'utf8' });
                if (result.includes(name)) {
                    runningProcesses.push(name);
                }
            } else {
                const result = execSync(`pgrep -f ${name}`, { encoding: 'utf8' });
                if (result.trim()) {
                    runningProcesses.push(name);
                }
            }
        } catch (e) {
            // Process not found (good)
        }
    }
    
    return {
        success: runningProcesses.length === 0,
        runningProcesses,
        message: runningProcesses.length === 0 
            ? 'All processes terminated' 
            : `Still running: ${runningProcesses.join(', ')}`
    };
}
```

### 3. Nuclear Termination System

For cases where standard termination fails:

```javascript
async function nuclearTermination() {
    console.log('🚨 NUCLEAR TERMINATION INITIATED');
    
    const commands = isWindows ? [
        'taskkill /F /IM 7za.exe',
        'taskkill /F /IM hashcat.exe', 
        'taskkill /F /IM python.exe',
        'taskkill /F /IM bkcrack.exe',
        'wmic process where "name like \'%7za%\'" delete',
        'wmic process where "name like \'%hashcat%\'" delete',
        'powershell "Get-Process | Where-Object {$_.ProcessName -match \'7za|hashcat|python|bkcrack\'} | Stop-Process -Force"'
    ] : [
        'pkill -9 -f 7za',
        'pkill -9 -f hashcat',
        'pkill -9 -f python.*passgpt',
        'pkill -9 -f bkcrack',
        'killall -9 7za hashcat python bkcrack'
    ];
    
    for (const cmd of commands) {
        try {
            execSync(cmd, { timeout: 2000 });
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
            console.log(`Command failed (may be expected): ${cmd}`);
        }
    }
    
    return await verifyProcessTermination();
}
```

## Data Models

### Process Registry Entry
```javascript
{
    sessionId: string,
    processes: [{
        process: ChildProcess,
        type: 'hashcat' | '7za' | 'python' | 'bkcrack',
        pid: number,
        startTime: Date,
        command: string
    }]
}
```

### Termination Result
```javascript
{
    success: boolean,
    details: {
        sessionCleanup: boolean,
        processTermination: boolean,
        systemCleanup: boolean,
        verification: boolean
    },
    runningProcesses: string[],
    message: string,
    timestamp: Date
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cancel Termination Completeness
*For any* active password cracking session, when cancel is requested, all related processes should be terminated within 10 seconds
**Validates: Requirements 1.1, 1.2**

### Property 2: Process Verification Accuracy  
*For any* termination attempt, the verification system should correctly identify whether processes are still running
**Validates: Requirements 2.1, 2.2**

### Property 3: Multi-layer Escalation
*For any* failed termination attempt, the system should automatically escalate to stronger termination methods
**Validates: Requirements 3.1, 3.2**

### Property 4: Session Cleanup Completeness
*For any* cancelled session, all session files, temporary data, and memory state should be completely cleared
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 5: UI State Consistency
*For any* cancel operation, the UI should reflect the current termination status and reset to initial state upon completion
**Validates: Requirements 5.1, 5.2, 5.3**

## Error Handling

### Termination Failure Scenarios
1. **Process Access Denied**: Escalate to administrator-level termination
2. **Process Not Found**: Continue with cleanup (process may have already exited)
3. **System Command Failure**: Try alternative termination methods
4. **Timeout**: Proceed with UI reset but warn user

### Recovery Strategies
- **Graceful Degradation**: If some processes can't be terminated, reset UI anyway
- **User Notification**: Clear messaging about what succeeded/failed
- **Logging**: Comprehensive logging for debugging stubborn processes
- **Manual Override**: Provide nuclear option for extreme cases

## Testing Strategy

### Unit Tests
- Test individual termination methods
- Test process registry management
- Test verification logic
- Test error handling paths

### Property-Based Tests
- Generate random process configurations and verify termination
- Test termination under various system load conditions
- Verify cleanup completeness across different session states
- Test UI state consistency across all termination scenarios

### Integration Tests
- End-to-end cancel flow testing
- Multi-process termination scenarios
- System-level cleanup verification
- Cross-platform termination testing

### Manual Testing
- Test with actual password cracking sessions
- Verify no processes remain after cancel
- Test under high system load
- Test with permission restrictions