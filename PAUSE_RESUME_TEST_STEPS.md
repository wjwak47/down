# Pause/Resume Test Steps

## Prerequisites
- A password-protected ZIP file (e.g., `test-password.zip`)
- The app built and running

## Test Procedure

### 1. Start a Crack Operation
1. Open the File Compressor page
2. Switch to "Crack" mode
3. Add your password-protected ZIP file
4. Select "Smart" attack mode
5. Click "Start Cracking"
6. Wait for the crack to start (you should see progress updates)

### 2. Test Pause
1. Click the "Pause" button
2. **Expected behavior:**
   - Button changes to "Pausing..."
   - Progress stops updating
   - Status shows "Paused"
   - UI stays on the crack progress screen (doesn't reset to file selection)
   - Console shows:
     ```
     [FileCompressor] 📤 Sending pause request for job: <timestamp>
     [FileCompressor] 🔔 onZipCrackPaused received: <timestamp>
     [FileCompressor] Current crackJobId: <timestamp>
     [FileCompressor] Current crackSessionId: <md5-hash>
     ```

### 3. Test Resume
1. Click the "Resume" button (green button with play icon)
2. **Expected behavior:**
   - Button shows "Resuming..."
   - Crack operation resumes from where it left off
   - Progress updates continue
   - Console shows:
     ```
     [FileCompressor] Resuming session: <md5-hash>
     [Crack] Resume requested for session: <md5-hash>
     [Crack] Resuming from phase: X tested: Y
     ```
   - **NO "Session not found" error**
   - Toast notification: "✅ Session resumed"

### 4. Test Stop
1. While cracking is running, click the "Stop" button
2. **Expected behavior:**
   - Operation stops completely
   - UI resets to file selection screen
   - Session is deleted (not saved)

### 5. Test Session Dialog (Optional)
1. Start a crack operation
2. Pause it
3. Close the app
4. Reopen the app
5. Navigate to File Compressor
6. **Expected behavior:**
   - Dialog appears showing pending sessions
   - Click "Resume" on a session
   - Crack resumes from saved state

## What to Look For

### ✅ Success Indicators
- Pause button works without resetting UI
- Resume button successfully continues the crack
- Console logs show correct sessionId (MD5 hash, not timestamp)
- No "Session not found" errors
- Progress continues from where it left off

### ❌ Failure Indicators
- "Session not found" error in console
- Resume button doesn't work
- UI resets to file selection after pause
- Console shows timestamp being used for resume instead of MD5 hash

## Debug Console Commands
Open DevTools (F12) and check console for:
```javascript
// Should see sessionId being set:
[FileCompressor] Current crackSessionId: abc123def456...

// Should NOT see:
Session not found: 1768589895938
```

## Notes
- The sessionId is an MD5 hash of the file path (32 hex characters)
- The crackJobId is a timestamp (13 digits)
- Resume operations MUST use sessionId, not crackJobId
- Pause operations use crackJobId (to identify the running process)
