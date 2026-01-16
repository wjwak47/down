# Design Document - Password Cracker Pause/Resume Fix

## Overview

This design document outlines the implementation of a proper pause/resume mechanism for the password cracker. The current implementation incorrectly uses the same handler for both pause and stop operations, resulting in complete task termination when the user intends to pause.

## Architecture

### Component Interaction

```
UI (FileCompressor.jsx)
    ↓ handlePause()
    ↓ window.api.zipCrackPause(id)
    ↓
Preload (index.js)
    ↓ ipcRenderer.send('zip:crack-pause', { id })
    ↓
Main Process (index.js)
    ↓ ipcMain.on('zip:crack-pause')
    ↓ sessionManager.pauseSession(sessionId)
    ↓ session.active = false
    ↓ Keep session in crackSessions Map
    ↓ event.reply('zip:crack-paused', { id })
    ↓
UI receives 'zip:crack-paused'
    ↓ setProcessing(false)
    ↓ setCrackStats({ ...prev, status: 'paused' })
    ↓ Show "Resume" button
```

### Resume Flow

```
UI (FileCompressor.jsx)
    ↓ handleResume(sessionId)
    ↓ window.api.zipCrackResume(sessionId)
    ↓
Preload (index.js)
    ↓ ipcRenderer.invoke('zip:crack-resume', { sessionId })
    ↓
Main Process (index.js)
    ↓ ipcMain.handle('zip:crack-resume')
    ↓ sessionData = sessionManager.loadSession(sessionId)
    ↓ Restart cracking from saved phase
    ↓ Pass previousAttempts to continue counting
    ↓ return { success: true, jobId }
    ↓
UI receives response
    ↓ setProcessing(true)
    ↓ setCrackJobId(jobId)
    ↓ Show "Cracking in progress"
```

## Components and Interfaces

### 1. IPC Handlers

#### New Handler: `zip:crack-pause`

```javascript
ipcMain.on('zip:crack-pause', (event, { id }) => {
    const session = crackSessions.get(id);
    if (session) {
        // Mark as inactive to stop processing
        session.active = false;
        
        // Save session state
        if (session.sessionId && session.stats) {
            sessionManager.pauseSession(session.sessionId);
        }
        
        // Clear save interval
        if (session.saveInterval) {
            clearInterval(session.saveInterval);
        }
        
        // Gracefully stop processes (don't kill forcefully)
        if (session.process) {
            session.process.kill('SIGTERM');
        }
        
        // Keep session in memory (don't delete)
        // crackSessions.delete(id); // ❌ DON'T DO THIS
        
        // Send paused event
        event.reply('zip:crack-paused', { id });
    }
});
```

#### Modified Handler: `zip:crack-stop`

```javascript
ipcMain.on('zip:crack-stop', (event, { id }) => {
    const session = crackSessions.get(id);
    if (session) {
        session.active = false;
        
        // Delete session completely (don't save)
        if (session.sessionId) {
            sessionManager.deleteSession(session.sessionId);
        }
        
        // Clear save interval
        if (session.saveInterval) {
            clearInterval(session.saveInterval);
        }
        
        // Kill processes forcefully
        if (session.process) {
            session.process.kill('SIGKILL');
        }
        
        // Cleanup workers
        if (session.cleanup) {
            session.cleanup();
        }
        
        // Remove from memory
        crackSessions.delete(id);
        
        event.reply('zip:crack-stopped', { id });
    }
});
```

#### Enhanced Handler: `zip:crack-resume`

```javascript
ipcMain.handle('zip:crack-resume', async (event, { sessionId }) => {
    const sessionData = sessionManager.loadSession(sessionId);
    
    if (!sessionData) {
        return { success: false, error: 'Session not found' };
    }
    
    // Verify archive still exists
    if (!fs.existsSync(sessionData.archivePath)) {
        return { success: false, error: 'Archive file not found' };
    }
    
    // Mark session as active
    sessionManager.resumeSession(sessionId);
    
    // Generate new job ID for this resume
    const jobId = Date.now().toString();
    
    // Restart cracking from saved phase
    const { archivePath, options, currentPhase, testedPasswords } = sessionData;
    
    // Start cracking with resume parameters
    startCrackingWithResume(event, jobId, archivePath, options, {
        startPhase: currentPhase,
        previousAttempts: testedPasswords,
        sessionId: sessionId
    });
    
    return { success: true, jobId };
});
```

### 2. SessionManager Enhancements

#### Enhanced `pauseSession()` Method

```javascript
pauseSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    // Update session data with current state
    session.status = 'paused';
    session.pausedAt = Date.now();
    
    // Save to disk
    this.saveSession(sessionId);
    
    console.log(`[SessionManager] Session ${sessionId} paused`);
}
```

#### Enhanced `resumeSession()` Method

```javascript
resumeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    // Update session status
    session.status = 'active';
    session.resumedAt = Date.now();
    
    // Save to disk
    this.saveSession(sessionId);
    
    console.log(`[SessionManager] Session ${sessionId} resumed`);
    return session;
}
```

#### New Method: `deleteSession()`

```javascript
deleteSession(sessionId) {
    // Remove from memory
    this.sessions.delete(sessionId);
    
    // Delete from disk
    const sessionFile = path.join(this.sessionsDir, `${sessionId}.json`);
    if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
    }
    
    console.log(`[SessionManager] Session ${sessionId} deleted`);
}
```

### 3. Session Data Structure

```javascript
{
    id: 'session-123456789',
    archivePath: '/path/to/archive.zip',
    status: 'paused', // 'active' | 'paused' | 'completed'
    
    // Attack configuration
    options: {
        mode: 'smart',
        charset: 'abcdefghijklmnopqrstuvwxyz0123456789',
        minLength: 1,
        maxLength: 8,
        useGpu: true,
        useCpuMultiThread: true
    },
    
    // Progress tracking
    currentPhase: 0, // 0-8 (AI, Top10K, ShortBrute, etc.)
    testedPasswords: 1500,
    currentSpeed: 50,
    
    // Phase-specific state
    phaseState: {
        batchIndex: 15, // For AI phase: which batch (0-99)
        iteration: 5000 // For other phases: which iteration
    },
    
    // Timestamps
    startedAt: 1705334400000,
    pausedAt: 1705335000000,
    resumedAt: null,
    
    // Statistics
    stats: {
        totalTime: 600, // seconds
        averageSpeed: 45,
        peakSpeed: 80
    }
}
```

### 4. UI Components

#### FileCompressor.jsx - Pause/Resume Buttons

```jsx
{processing && mode === 'crack' && (
    <div className="flex items-center gap-2">
        {crackStats.status !== 'paused' ? (
            <>
                <button onClick={handlePause} 
                    className="px-6 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white">
                    ⏸ Pause
                </button>
                <button onClick={handleStop} 
                    className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white">
                    ⏹ Stop
                </button>
            </>
        ) : (
            <>
                <button onClick={() => handleResume(crackJobId)} 
                    className="px-6 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white">
                    ▶ Resume
                </button>
                <button onClick={handleStop} 
                    className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white">
                    ⏹ Stop
                </button>
            </>
        )}
    </div>
)}
```

#### Pending Sessions Dialog

```jsx
{showSessionDialog && pendingSessions.length > 0 && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full">
            <h2 className="text-xl font-semibold mb-4">Pending Crack Sessions</h2>
            <div className="space-y-3">
                {pendingSessions.map(session => (
                    <div key={session.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">{path.basename(session.archivePath)}</p>
                                <p className="text-sm text-slate-500">
                                    Phase: {session.currentPhase} | 
                                    Tested: {session.testedPasswords.toLocaleString()} | 
                                    Paused: {formatTime(Date.now() - session.pausedAt)} ago
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleResume(session.id)}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg">
                                    Resume
                                </button>
                                <button onClick={() => handleDeleteSession(session.id)}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg">
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={() => setShowSessionDialog(false)}
                className="mt-4 w-full py-2 bg-slate-200 dark:bg-slate-600 rounded-lg">
                Close
            </button>
        </div>
    </div>
)}
```

## Data Models

### Session State Machine

```
[New Task] → [Active] → [Paused] → [Active] → [Completed]
                ↓           ↓
              [Stopped]   [Stopped]
```

States:
- **Active**: Task is currently running
- **Paused**: Task is paused, session saved, can be resumed
- **Stopped**: Task is terminated, session deleted
- **Completed**: Task finished (password found or exhausted)

## Correctness Properties

### Property 1: Pause Preserves Progress
*For any* active cracking session, when paused, the tested passwords count should be saved and restored exactly when resumed.

**Validates: Requirements 1.2, 2.2, 6.2**

### Property 2: Resume Continues from Saved Phase
*For any* paused session, when resumed, the cracking should start from the saved phase number, not from phase 0.

**Validates: Requirements 3.3, 6.4**

### Property 3: Stop Deletes Session
*For any* active or paused session, when stopped, the session data should be completely deleted from memory and disk.

**Validates: Requirements 1.4, 4.5**

### Property 4: Pause Does Not Delete Session
*For any* active session, when paused, the session should remain in memory and be saved to disk, not deleted.

**Validates: Requirements 1.3, 2.3, 4.1**

### Property 5: Resume Skips Tested Passwords
*For any* resumed session, the tested passwords count should continue incrementing from the saved value, not reset to 0.

**Validates: Requirements 3.5, 6.6**

### Property 6: Session Persistence
*For any* paused session, after application restart, the session should be loadable from disk with all state preserved.

**Validates: Requirements 4.2, 4.3**

## Error Handling

### Pause Errors

1. **Session Not Found**: If session doesn't exist when pausing, log error and do nothing
2. **Save Failure**: If session save fails, keep task running and notify user
3. **Process Kill Failure**: If process doesn't stop gracefully, use SIGKILL after timeout

### Resume Errors

1. **Session Not Found**: Display error "Session not found" and remove from pending list
2. **Archive Missing**: Display error "Archive file not found" and offer to delete session
3. **Corrupted Session Data**: Display error "Session data corrupted" and offer to delete
4. **Resume Failure**: Keep session in paused state and allow retry

### Stop Errors

1. **Session Not Found**: Log warning and send stopped event anyway
2. **Process Kill Failure**: Force kill with SIGKILL
3. **Delete Failure**: Log error but continue with cleanup

## Testing Strategy

### Unit Tests

1. Test `pauseSession()` saves session data correctly
2. Test `resumeSession()` loads session data correctly
3. Test `deleteSession()` removes session from memory and disk
4. Test session state transitions (active → paused → active)
5. Test error handling for missing/corrupted sessions

### Integration Tests

1. Test pause → resume flow preserves progress
2. Test pause → app restart → resume flow
3. Test stop completely terminates task
4. Test multiple pause/resume cycles
5. Test resume from different phases (AI, Top10K, etc.)

### Property-Based Tests

1. **Property 1**: Pause then resume should preserve tested passwords count
2. **Property 2**: Resume should start from saved phase
3. **Property 3**: Stop should delete all session data
4. **Property 4**: Pause should keep session in memory
5. **Property 5**: Multiple pause/resume cycles should accumulate tested passwords correctly

## Implementation Notes

### Phase Resume Logic

Each phase needs to support resuming from a specific point:

**AI Phase (Phase 0)**:
```javascript
async function runAIPhase(archivePath, event, id, session, previousAttempts, startTime, resumeState) {
    const startBatch = resumeState?.batchIndex || 1;
    
    for (let batchNum = startBatch; batchNum <= MAX_BATCHES; batchNum++) {
        // Generate and test batch
        // ...
    }
}
```

**Top10K Phase (Phase 1)**:
```javascript
async function runTop10KAttack(hashFile, outFile, hashMode, event, id, session, previousAttempts, resumeState) {
    const startLine = resumeState?.iteration || 0;
    
    // Skip to start line in dictionary
    const passwords = readDictionary(dictPath).slice(startLine);
    // ...
}
```

### Session Save Frequency

- Save session every 10 seconds during active cracking
- Save immediately when pausing
- Don't save when stopping (delete instead)

### Memory Management

- Keep paused sessions in `crackSessions` Map (don't delete)
- Limit to maximum 10 paused sessions in memory
- Older paused sessions can be loaded from disk on demand

## Performance Considerations

1. **Session Save Overhead**: Saving every 10 seconds adds ~10ms overhead (negligible)
2. **Resume Startup Time**: Loading session from disk takes ~50ms (acceptable)
3. **Memory Usage**: Each paused session uses ~5KB memory (10 sessions = 50KB, negligible)
4. **Disk Usage**: Each session file is ~5KB on disk (100 sessions = 500KB, acceptable)

## Security Considerations

1. **Session Files**: Store in user data directory with restricted permissions
2. **Archive Paths**: Validate paths when resuming to prevent path traversal
3. **Password Exposure**: Don't store found passwords in session files
4. **Cleanup**: Delete old sessions after 30 days to prevent disk bloat
