# Pause/Resume Stuck Issue Debug

## Problem
After clicking Resume, the password cracking gets stuck and doesn't continue running.

## Observations from Logs

### During Pause:
```
[Crack] Session found, current state: { active: true, paused: false, currentPhase: 0 }
[Crack] Flags set: { active: false, paused: true }
[Crack] Saving session state...
[Crack] Session paused successfully, sessionId: 130ebeae7b435ea3d0e4c1bd45c6f47a
```

### During Resume:
```
[Crack] Resume requested for session: 130ebeae7b435ea3d0e4c1bd45c6f47a
[SessionManager] Session loaded: 130ebeae7b435ea3d0e4c1bd45c6f47a
[Crack] Resuming from phase: 0, tested: 0
[Crack] Starting crack with resume support
[Crack] Reusing existing session: 130ebeae7b435ea3d0e4c1bd45c6f47a
```

### Then Immediately:
```
[Crack] Flags set: { active: false, paused: true }
```

This shows that **immediately after resuming, the pause handler is triggered again**!

## Root Cause Analysis

The issue is that when resuming:
1. A new session object is created with `paused: false` ✅
2. But then the pause handler (`zip:crack-pause`) is triggered again ❌
3. This sets `session.active = false` and `session.paused = true`
4. The cracking loop checks `session.active` and stops immediately

## Possible Causes

1. **Old pause request in queue**: The old pause IPC message might still be in the queue
2. **JobId mismatch**: The pause handler might be using the old jobId
3. **Race condition**: Resume and pause events are racing

## Solution

We need to ensure that when resuming:
1. The old session is completely cleaned up
2. The new session uses a NEW jobId
3. Any pending pause requests for the old jobId are ignored

## Fix Strategy

### Option 1: Clear old session before resume
Before creating a new session, delete the old one from `crackSessions` Map.

### Option 2: Ignore pause requests for non-existent sessions
In the pause handler, check if the session exists before processing.

### Option 3: Use session state to ignore stale pause requests
Check if the session is already paused before processing pause requests.

## Implementation

Let's implement Option 3 - check session state before processing pause:

```javascript
ipcMain.on('zip:crack-pause', (event, { id }) => {
    console.log('[Crack] ⏸️  Pause requested for:', id);
    const session = crackSessions.get(id);
    
    if (!session) {
        console.log('[Crack] ⚠️  No session found for id:', id, '- ignoring pause request');
        return;
    }
    
    // ✅ Check if already paused - ignore duplicate pause requests
    if (session.paused) {
        console.log('[Crack] ⚠️  Session already paused - ignoring duplicate pause request');
        return;
    }
    
    console.log('[Crack] Session found, current state:', {
        active: session.active,
        paused: session.paused || false,
        currentPhase: session.currentPhase
    });
    
    // ... rest of pause logic
});
```

This will prevent duplicate pause requests from affecting a resumed session.
