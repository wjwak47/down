# File Compressor Stop Complete Fix - Design

## Overview

This design addresses the critical issue where the Stop button in File Compressor doesn't completely terminate password cracking processes. The current implementation only resets the UI state while leaving background processes running, which then get automatically reconnected by the wake-up detection mechanism.

The solution involves implementing a comprehensive stop mechanism that:
1. Terminates all background processes at the system level
2. Prevents session restoration for user-terminated tasks
3. Maintains UI state consistency
4. Provides force-stop capabilities for stubborn processes

## Architecture

### Current Problem Flow
```
User clicks Stop → UI resets → Background process continues → Wake-up detection → Auto-reconnect → Task appears running again
```

### Fixed Flow
```
User clicks Stop → UI shows stopping → Terminate background processes → Delete sessions → Mark as user-terminated → UI stays stopped → Wake-up ignores terminated tasks
```

## Components and Interfaces

### 1. Enhanced Stop Handler
**Location**: `src/renderer/src/pages/FileCompressor.jsx`

**Responsibilities**:
- Coordinate complete stop operation
- Provide user feedback during stop process
- Handle force-stop scenarios
- Maintain stop operation state

**Interface**:
```javascript
const handleCompleteStop = async (options = {}) => {
  // options: { force: boolean, timeout: number }
  // Returns: { success: boolean, processesTerminated: string[], error?: string }
}
```

### 2. Process Termination Manager
**Location**: Backend (Main process)

**Responsibilities**:
- Track all running crack processes
- Terminate processes by PID
- Verify termination success
- Handle zombie process cleanup

**Interface**:
```javascript
// IPC Methods
window.api.zipCrackTerminateAll(sessionId, options)
window.api.zipCrackVerifyTermination(sessionId)
window.api.zipCrackForceKill(sessionId)
```

### 3. Session Blacklist Manager
**Location**: Backend session management

**Responsibilities**:
- Track user-terminated sessions
- Prevent restoration of blacklisted sessions
- Maintain blacklist persistence
- Clean up old blacklist entries

**Interface**:
```javascript
// Session blacklist operations
window.api.zipCrackBlacklistSession(sessionId, reason)
window.api.zipCrackIsBlacklisted(sessionId)
window.api.zipCrackClearBlacklist()
```

### 4. Enhanced Wake-up Detection
**Location**: `src/renderer/src/pages/FileCompressor.jsx`

**Responsibilities**:
- Check session blacklist before restoration
- Respect user termination decisions
- Provide logging for debugging

**Modified Logic**:
```javascript
const checkAndRestoreSession = async () => {
  const sessions = await window.api.zipCrackListSessions();
  const validSessions = sessions.filter(session => 
    !await window.api.zipCrackIsBlacklisted(session.id)
  );
  // Only restore non-blacklisted sessions
}
```

## Data Models

### Stop Operation State
```javascript
const stopOperationState = {
  inProgress: boolean,
  startTime: number,
  processesFound: string[],
  processesTerminated: string[],
  sessionsCleaned: string[],
  errors: string[],
  forceUsed: boolean
}
```

### Session Blacklist Entry
```javascript
const blacklistEntry = {
  sessionId: string,
  terminatedAt: number,
  reason: 'user_stop' | 'force_stop' | 'error',
  processIds: string[],
  expiresAt: number // Auto-cleanup after 24 hours
}
```

### Process Tracking
```javascript
const processInfo = {
  pid: number,
  sessionId: string,
  startTime: number,
  command: string,
  status: 'running' | 'terminated' | 'zombie'
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

<function_calls>
<invoke name="prework">
<parameter name="featureName">file-compressor-stop-complete-fix

### Property Reflection

After reviewing all properties identified in the prework, I need to eliminate redundancy:

**Redundant Properties Identified:**
- Properties 1.1, 1.3, and 4.2 all test process termination - can be combined into one comprehensive property
- Properties 1.2, 2.1, and 2.3 all test session cleanup - can be combined  
- Properties 3.1, 3.3, and 3.4 all test UI state consistency - can be combined
- Properties 5.1, 5.2, and 5.4 all test logging behavior - can be combined

**Consolidated Properties:**

Property 1: Complete Process Termination
*For any* running crack session, when stop is requested, all associated background processes should be terminated and no zombie processes should remain
**Validates: Requirements 1.1, 1.3, 4.2**

Property 2: Session Cleanup and Blacklisting  
*For any* stopped crack session, the session data should be deleted and the session should be marked as user-terminated to prevent restoration
**Validates: Requirements 1.2, 2.1, 2.3**

Property 3: Wake-up Blacklist Filtering
*For any* blacklisted session, wake-up detection should ignore that session and not attempt restoration
**Validates: Requirements 2.2, 2.5**

Property 4: UI State Consistency
*For any* stopped task, the UI should remain in stopped state and not show reconnection messages or switch back to crack mode
**Validates: Requirements 3.1, 3.3, 3.4**

Property 5: Stop Operation Feedback
*For any* stop operation, the system should provide clear confirmation and visual feedback about the termination process
**Validates: Requirements 1.5, 3.2, 3.5**

Property 6: Force Stop Escalation
*For any* failed normal stop operation, the system should provide force-stop capability with system-level termination
**Validates: Requirements 4.1, 4.3**

Property 7: Duplicate Prevention
*For any* stop operation in progress, additional stop requests should be ignored to prevent duplicate termination attempts
**Validates: Requirements 4.5**

Property 8: Cooldown Period Enforcement
*For any* recently stopped session, reconnection attempts should be blocked during the cooldown period
**Validates: Requirements 2.4**

Property 9: Comprehensive Logging
*For any* stop operation, all process lifecycle events, termination attempts, and results should be logged with process IDs
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

## Error Handling

### Stop Operation Failures
- **Timeout Handling**: If normal stop doesn't complete within 10 seconds, offer force-stop
- **Process Not Found**: Handle cases where processes have already terminated
- **Permission Errors**: Escalate to system-level termination if needed
- **Network Issues**: Handle IPC communication failures gracefully

### Session Management Errors
- **Blacklist Persistence**: Handle storage failures for blacklist data
- **Session Corruption**: Clean up corrupted session data during stop
- **Concurrent Access**: Handle multiple stop requests safely

### UI Error States
- **Stop in Progress**: Disable stop button during operation
- **Force Stop Required**: Show force-stop dialog when needed
- **Operation Failed**: Display clear error messages with retry options

## Testing Strategy

### Unit Tests
- Test individual stop operation components
- Test session blacklist management
- Test process termination verification
- Test UI state transitions during stop

### Property-Based Tests
Each correctness property will be implemented as a property-based test with minimum 100 iterations:

- **Property 1**: Generate random crack sessions, stop them, verify all processes terminated
- **Property 2**: Generate random sessions, stop them, verify cleanup and blacklisting
- **Property 3**: Generate blacklisted sessions, run wake-up detection, verify no restoration
- **Property 4**: Generate stopped tasks, verify UI consistency across state changes
- **Property 5**: Generate stop operations, verify feedback and confirmation messages
- **Property 6**: Simulate failed stops, verify force-stop escalation works
- **Property 7**: Generate concurrent stop requests, verify only one executes
- **Property 8**: Generate recent stops, verify cooldown period enforcement
- **Property 9**: Generate stop operations, verify comprehensive logging occurs

### Integration Tests
- Test complete stop flow from UI to backend
- Test wake-up detection with blacklisted sessions
- Test force-stop scenarios with stubborn processes
- Test system recovery after failed stops

## Implementation Notes

### Backend Changes Required
1. **Process Tracking**: Maintain registry of all crack process PIDs
2. **System-level Termination**: Implement OS-specific process killing
3. **Session Blacklist**: Persistent storage for terminated sessions
4. **Enhanced Logging**: Detailed process lifecycle logging

### Frontend Changes Required
1. **Stop State Management**: Track stop operation progress
2. **Force Stop UI**: Dialog for escalated termination
3. **Blacklist Integration**: Check blacklist before session restoration
4. **Enhanced Feedback**: Progress indicators during stop operation

### Configuration
- **Stop Timeout**: Configurable timeout before force-stop (default: 10s)
- **Blacklist TTL**: How long to keep blacklist entries (default: 24h)
- **Cooldown Period**: Time to block reconnection after stop (default: 5s)
- **Debug Logging**: Enable detailed process tracking logs

This design ensures that when users click Stop, the operation is truly complete and permanent, preventing the frustrating behavior where tasks appear to stop but continue running in the background.