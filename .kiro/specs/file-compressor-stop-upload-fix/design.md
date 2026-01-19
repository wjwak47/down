# Design Document

## Overview

This design addresses critical issues in the File Compressor where users cannot stop running crack tasks and cannot upload new files during operations. The solution involves improving process management, UI state handling, and implementing proper task queuing.

## Architecture

### Current Issues Analysis

1. **Stop Button Hanging**: The stop operation gets stuck in "Stopping..." state
2. **File Upload Blocked**: UI prevents file uploads during active tasks
3. **State Inconsistency**: UI state doesn't properly reflect backend process status
4. **Process Management**: Backend processes may not respond to termination signals

### Solution Architecture

```
Frontend (React)
├── UI State Manager
│   ├── Task Status Tracking
│   ├── Button State Management
│   └── Progress Indicators
├── Process Controller
│   ├── Stop Command Handler
│   ├── Force Termination Logic
│   └── Timeout Management
└── File Queue Manager
    ├── Upload During Active Tasks
    ├── Queue Display
    └── Auto-processing

Backend (Electron Main)
├── Process Manager
│   ├── Graceful Termination
│   ├── Force Kill Mechanism
│   └── Resource Cleanup
├── Session Manager
│   ├── State Persistence
│   ├── Recovery Logic
│   └── Queue Management
└── IPC Communication
    ├── Stop Commands
    ├── Status Updates
    └── Error Handling
```

## Components and Interfaces

### 1. Enhanced Stop Mechanism

#### Frontend Stop Handler
```javascript
const handleStop = async () => {
    setStopInProgress(true);
    
    try {
        // Set timeout for stop operation
        const stopPromise = window.api.zipCrackStop(crackJobId);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Stop timeout')), 5000)
        );
        
        await Promise.race([stopPromise, timeoutPromise]);
        
    } catch (error) {
        if (error.message === 'Stop timeout') {
            // Offer force termination
            setShowForceStopDialog(true);
        } else {
            // Handle other errors
            toast.error('Failed to stop task: ' + error.message);
        }
    } finally {
        setStopInProgress(false);
    }
};
```

#### Backend Process Termination
```javascript
// Enhanced stop with escalation
async function stopCrackProcess(id, force = false) {
    const session = crackSessions.get(id);
    if (!session) return { success: false, error: 'Session not found' };
    
    try {
        if (force) {
            // Force termination
            if (session.process) {
                session.process.kill('SIGKILL');
            }
            // Clean up immediately
            await cleanupSession(session);
        } else {
            // Graceful termination
            session.active = false;
            if (session.process) {
                session.process.kill('SIGTERM');
                
                // Wait for graceful exit
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Process did not exit gracefully'));
                    }, 3000);
                    
                    session.process.on('exit', () => {
                        clearTimeout(timeout);
                        resolve();
                    });
                });
            }
        }
        
        return { success: true };
    } catch (error) {
        console.error('[Stop] Error stopping process:', error);
        return { success: false, error: error.message };
    }
}
```

### 2. File Upload During Active Tasks

#### Queue-Based File Management
```javascript
// Frontend queue state
const [fileQueue, setFileQueue] = useState([]);
const [processingQueue, setProcessingQueue] = useState(false);

const handleFileUpload = (newFiles) => {
    if (processing) {
        // Add to queue if task is running
        setFileQueue(prev => [...prev, ...newFiles]);
        toast.info(`Added ${newFiles.length} files to queue`);
    } else {
        // Process immediately if no task running
        setCrackFiles(prev => [...prev, ...newFiles]);
    }
};

// Auto-process queue when current task completes
useEffect(() => {
    if (!processing && fileQueue.length > 0 && !processingQueue) {
        setProcessingQueue(true);
        const nextFiles = fileQueue.splice(0, 1);
        setCrackFiles(prev => [...prev, ...nextFiles]);
        setFileQueue(prev => prev.slice(1));
        setProcessingQueue(false);
    }
}, [processing, fileQueue]);
```

### 3. UI State Management

#### State Machine Implementation
```javascript
const TASK_STATES = {
    IDLE: 'idle',
    RUNNING: 'running', 
    STOPPING: 'stopping',
    STOPPED: 'stopped',
    ERROR: 'error'
};

const [taskState, setTaskState] = useState(TASK_STATES.IDLE);

// State-based UI rendering
const getButtonState = () => {
    switch (taskState) {
        case TASK_STATES.IDLE:
            return { showStart: true, showStop: false, showUpload: true };
        case TASK_STATES.RUNNING:
            return { showStart: false, showStop: true, showUpload: true };
        case TASK_STATES.STOPPING:
            return { showStart: false, showStop: false, showUpload: true };
        default:
            return { showStart: true, showStop: false, showUpload: true };
    }
};
```

## Data Models

### Task State Model
```javascript
interface TaskState {
    id: string;
    status: 'idle' | 'running' | 'stopping' | 'stopped' | 'error';
    progress: number;
    currentFile: string;
    startTime: number;
    stopRequested: boolean;
    forceStopAvailable: boolean;
}
```

### File Queue Model
```javascript
interface FileQueue {
    files: string[];
    currentIndex: number;
    totalFiles: number;
    processingFile: string | null;
    queueStatus: 'waiting' | 'processing' | 'paused';
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Stop Operation Completion
*For any* running crack task, when a stop command is issued, the task should either complete the stop operation within 5 seconds or offer force termination options.
**Validates: Requirements 1.1, 1.4**

### Property 2: File Upload Availability
*For any* system state, file upload functionality should remain accessible and provide appropriate feedback about queuing or immediate processing.
**Validates: Requirements 2.1, 2.3**

### Property 3: UI State Consistency
*For any* backend process state change, the UI should update within 1 second to reflect the current system status accurately.
**Validates: Requirements 3.1, 3.4**

### Property 4: Process Cleanup
*For any* terminated crack process, all associated resources, temporary files, and memory should be properly cleaned up within 10 seconds.
**Validates: Requirements 4.3, 4.5**

### Property 5: Queue Processing Order
*For any* queued files, they should be processed in the order they were added, with proper status updates for each file.
**Validates: Requirements 2.4, 2.5**

## Error Handling

### Stop Operation Errors
- **Timeout Handling**: If stop doesn't complete in 5 seconds, offer force termination
- **Process Unresponsive**: Escalate to SIGKILL if SIGTERM fails
- **Resource Cleanup**: Ensure cleanup even if process termination fails

### File Upload Errors
- **Queue Full**: Implement maximum queue size with user notification
- **File Access**: Handle locked or inaccessible files gracefully
- **Disk Space**: Check available space before queuing large files

### UI State Errors
- **State Corruption**: Implement state reset mechanism
- **IPC Failures**: Retry communication with exponential backoff
- **Memory Leaks**: Proper cleanup of event listeners and timers

## Testing Strategy

### Unit Tests
- Test stop operation timeout handling
- Test file queue management logic
- Test UI state transitions
- Test process cleanup verification

### Property-Based Tests
- **Stop Completion Property**: Test stop operations complete within time limits
- **Queue Order Property**: Test files are processed in correct order
- **State Consistency Property**: Test UI reflects backend state accurately
- **Resource Cleanup Property**: Test all resources are properly cleaned up

### Integration Tests
- Test complete stop-to-restart workflow
- Test file upload during active operations
- Test queue processing after task completion
- Test error recovery scenarios

Each property test should run minimum 100 iterations and be tagged with:
**Feature: file-compressor-stop-upload-fix, Property {number}: {property_text}**