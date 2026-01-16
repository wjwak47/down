# Requirements Document - Password Cracker Pause/Resume Fix

## Introduction

修复密码破解器的暂停/恢复功能。当前实现中，点击"暂停"按钮会完全停止任务并删除会话，导致无法恢复破解进度。

Fix the password cracker pause/resume functionality. Currently, clicking the "Pause" button completely stops the task and deletes the session, making it impossible to resume cracking progress.

## Glossary

- **Session**: 破解任务的会话，包含当前进度、统计信息和配置
- **Pause**: 暂停破解任务，保存当前进度，但不删除会话
- **Stop**: 完全停止破解任务，删除会话和所有进度
- **Resume**: 从暂停的会话恢复破解任务，继续之前的进度
- **SessionManager**: 管理破解会话的持久化和恢复
- **StatsCollector**: 收集和跟踪破解统计信息

## Requirements

### Requirement 1: 分离暂停和停止功能

**User Story:** As a user, I want to pause a cracking task without losing progress, so that I can resume it later from where I left off.

#### Acceptance Criteria

1. WHEN a user clicks the "Pause" button THEN the system SHALL save the current session state and stop the cracking process
2. WHEN a session is paused THEN the system SHALL preserve the session data including current phase, tested passwords count, and current speed
3. WHEN a session is paused THEN the system SHALL NOT delete the session from memory or storage
4. WHEN a user clicks the "Stop" button THEN the system SHALL completely stop the task and delete the session

### Requirement 2: 实现暂停功能

**User Story:** As a user, I want the pause button to save my progress, so that I don't lose hours of cracking work.

#### Acceptance Criteria

1. WHEN a user pauses a cracking task THEN the system SHALL call a dedicated pause handler (not the stop handler)
2. WHEN pausing THEN the system SHALL save session state including: archive path, current phase, tested passwords, current speed, attack options
3. WHEN pausing THEN the system SHALL gracefully stop the cracking process without killing it forcefully
4. WHEN pausing THEN the system SHALL update the UI to show "Paused" status
5. WHEN pausing THEN the system SHALL display a "Resume" button instead of "Start" button

### Requirement 3: 实现恢复功能

**User Story:** As a user, I want to resume a paused cracking task, so that I can continue from where I left off.

#### Acceptance Criteria

1. WHEN a user clicks "Resume" on a paused session THEN the system SHALL load the saved session data
2. WHEN resuming THEN the system SHALL restore the session state including current phase, tested passwords count, and statistics
3. WHEN resuming THEN the system SHALL restart the cracking process from the saved phase
4. WHEN resuming THEN the system SHALL skip already-tested passwords in the current phase
5. WHEN resuming THEN the system SHALL update the UI to show "Cracking in progress" status

### Requirement 4: 会话持久化

**User Story:** As a user, I want my paused sessions to persist across app restarts, so that I can resume them even after closing the application.

#### Acceptance Criteria

1. WHEN a session is paused THEN the system SHALL save session data to disk using SessionManager
2. WHEN the application starts THEN the system SHALL load all pending sessions from disk
3. WHEN pending sessions exist THEN the system SHALL display a dialog showing all paused sessions
4. WHEN a user selects a pending session THEN the system SHALL allow resuming or deleting it
5. WHEN a session is completed or stopped THEN the system SHALL delete the session data from disk

### Requirement 5: UI 状态管理

**User Story:** As a user, I want clear visual feedback about the task status, so that I know whether it's running, paused, or stopped.

#### Acceptance Criteria

1. WHEN a task is running THEN the system SHALL display "Pause" and "Stop" buttons
2. WHEN a task is paused THEN the system SHALL display "Resume" and "Stop" buttons
3. WHEN a task is paused THEN the system SHALL show "Paused" status in the UI
4. WHEN a task is resumed THEN the system SHALL show "Cracking in progress" status
5. WHEN displaying paused sessions THEN the system SHALL show session details: archive name, phase, progress, elapsed time

### Requirement 6: 进度保存和恢复

**User Story:** As a developer, I want the system to accurately track and restore progress, so that users don't waste time re-testing passwords.

#### Acceptance Criteria

1. WHEN saving session state THEN the system SHALL record the current phase number (0-8)
2. WHEN saving session state THEN the system SHALL record the total tested passwords count
3. WHEN saving session state THEN the system SHALL record the current batch/iteration within the phase
4. WHEN resuming THEN the system SHALL start from the saved phase
5. WHEN resuming THEN the system SHALL skip to the saved batch/iteration within the phase
6. WHEN resuming THEN the system SHALL continue incrementing the tested passwords count from the saved value

### Requirement 7: 错误处理

**User Story:** As a user, I want the system to handle errors gracefully during pause/resume, so that I don't lose my progress due to unexpected issues.

#### Acceptance Criteria

1. WHEN pausing fails THEN the system SHALL display an error message and keep the task running
2. WHEN resuming fails THEN the system SHALL display an error message and keep the session in paused state
3. WHEN session data is corrupted THEN the system SHALL notify the user and offer to delete the session
4. WHEN the archive file is moved or deleted THEN the system SHALL notify the user when attempting to resume
5. WHEN multiple resume attempts fail THEN the system SHALL offer to restart the task from the beginning

## Technical Notes

### Current Implementation Issues

1. **Shared Handler**: `handlePause` and `handleCancel` both call `zipCrackStop`, which deletes the session
2. **Incomplete Resume**: `zip:crack-resume` only loads session data but doesn't restart the cracking task
3. **No Phase Tracking**: Current implementation doesn't track which phase was running when paused
4. **No Batch Tracking**: Within each phase, there's no tracking of which batch/iteration was being processed

### Proposed Solution

1. **Create separate IPC handlers**:
   - `zip:crack-pause` - Pause task, save session, keep in memory
   - `zip:crack-stop` - Stop task, delete session completely
   - `zip:crack-resume` - Load session and restart cracking from saved phase

2. **Enhance SessionManager**:
   - Add `pauseSession()` method to save without deleting
   - Add `resumeSession()` method to load and mark as active
   - Store phase number, batch index, and tested passwords count

3. **Modify Cracking Logic**:
   - Each phase should support resuming from a specific batch/iteration
   - Pass `previousAttempts` parameter to continue counting from saved value
   - Skip already-tested passwords when resuming

4. **Update UI**:
   - Add separate `handlePause` and `handleStop` functions
   - Show different buttons based on task status (running/paused)
   - Display pending sessions dialog on app startup

## Success Criteria

1. ✅ User can pause a cracking task and see "Paused" status
2. ✅ User can resume a paused task and continue from the same phase
3. ✅ Tested passwords count continues from where it left off
4. ✅ Paused sessions persist across app restarts
5. ✅ User can delete unwanted paused sessions
6. ✅ Stop button completely terminates the task
7. ✅ No progress is lost when pausing and resuming
