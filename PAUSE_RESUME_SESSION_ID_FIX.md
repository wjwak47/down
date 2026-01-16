# Pause/Resume Session ID Fix - COMPLETE

## Problem
When clicking the Resume button after pausing a crack operation, the session was not found, causing the error:
```
[Crack] Resume requested for session: null
[SessionManager] Session not found: null
```

## Root Cause Analysis

### Issue 1: ID Type Mismatch
There was a mismatch between the ID used for pause/resume operations:

1. **crackJobId** (timestamp like `1768589895938`) - Used to identify the running crack process
2. **sessionId** (MD5 hash like `130ebeae7b435ea3d0e4c1bd45c6f47a`) - Used to save/load session state from disk

### Issue 2: SessionId Not Sent in Pause Event
The backend was NOT sending the `sessionId` in the pause confirmation event:
```javascript
// Before (WRONG):
event.reply('zip:crack-paused', { id }); // Only sends jobId

// After (CORRECT):
event.reply('zip:crack-paused', { id, sessionId: session.sessionId }); // Sends both
```

This meant the frontend had no way to know the sessionId when the pause event arrived!

## Solution

### Backend Changes (`src/main/modules/fileCompressor/index.js`)

1. **Include sessionId in progress events**:
```javascript
event.reply('zip:crack-progress', {
    id,
    sessionId: session.sessionId, // ✅ Added
    // ... other fields
});
```

2. **Include sessionId in pause confirmation event** (CRITICAL FIX):
```javascript
event.reply('zip:crack-paused', { 
    id, 
    sessionId: session.sessionId // ✅ Added - this was missing!
});
```

### Frontend Changes (`src/renderer/src/pages/FileCompressor.jsx`)

1. **Added new state variable** to track sessionId:
```javascript
const [crackJobId, setCrackJobId] = useState(null);
const [crackSessionId, setCrackSessionId] = useState(null); // ✅ New
```

2. **Capture sessionId from progress events**:
```javascript
window.api.onZipCrackProgress(({ ..., sessionId }) => {
    if (sessionId) {
        setCrackSessionId(sessionId);
    }
    // ...
});
```

3. **Capture sessionId from pause event** (CRITICAL FIX):
```javascript
const handlePaused = ({ id, sessionId }) => {
    // ✅ Store sessionId from pause event
    if (sessionId) {
        setCrackSessionId(sessionId);
    }
    // ...
};
```

4. **Use sessionId for Resume button**:
```javascript
<button onClick={() => handleResume(crackSessionId)}>Resume</button>
```

## Why Two Sources for SessionId?

The sessionId is now sent in TWO places:

1. **Progress events** - Sent continuously during cracking
   - Advantage: Gets sessionId early
   - Disadvantage: Might not arrive if crack is very fast

2. **Pause event** - Sent when pause is confirmed (NEW!)
   - Advantage: Guaranteed to have sessionId when paused
   - Disadvantage: Only available after pause

By capturing from BOTH sources, we ensure the sessionId is always available when needed.

## Testing
1. Start a crack operation on a password-protected file
2. Click Pause button → Should pause successfully
3. Check console - should see:
   ```
   [FileCompressor] 🔔 onZipCrackPaused received: <jobId> sessionId: <md5-hash>
   [FileCompressor] Setting crackSessionId from pause event: <md5-hash>
   ```
4. Click Resume button → Should resume successfully (no "Session not found" error)

## Key Points
- **crackJobId** (timestamp) = Process identifier for IPC communication
- **sessionId** (MD5 hash) = Persistent session identifier for disk storage
- Resume operations must use **sessionId**, not crackJobId
- The sessionId is sent in BOTH progress events AND pause events for reliability
