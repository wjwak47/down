# Requirements Document

## Introduction

修复文件压缩器的密码破解功能。当前问题：密码破解启动后立即结束，显示 "Found: null"。根本原因是 `index.js` 文件损坏，需要完全重写并确保 GPU 和 CPU 模式都能正常工作。

## Glossary

- **Crack_System**: 密码破解系统，负责尝试破解加密压缩文件的密码
- **GPU_Mode**: 使用 hashcat 进行 GPU 加速破解
- **CPU_Mode**: 使用 7z 命令行工具进行 CPU 破解
- **Multi_Thread_Mode**: 使用 Worker Threads 进行多线程 CPU 破解
- **Smart_Cracker**: 智能密码生成器，使用 Markov Chain 和常见密码词典

## Requirements

### Requirement 1: 文件完整性

**User Story:** As a developer, I want the index.js file to be complete and syntactically correct, so that the application can build and run.

#### Acceptance Criteria

1. THE Crack_System SHALL have a complete index.js file without any corrupted content
2. THE Crack_System SHALL export the registerFileCompressor function correctly
3. WHEN the application builds, THE Crack_System SHALL compile without errors

### Requirement 2: CPU 单线程破解

**User Story:** As a user, I want to crack passwords using CPU, so that I can recover forgotten passwords.

#### Acceptance Criteria

1. WHEN CPU mode is enabled and multi-thread is disabled, THE Crack_System SHALL use single-threaded cracking
2. WHEN cracking starts, THE Crack_System SHALL send progress updates to the UI
3. WHEN a password is found, THE Crack_System SHALL return the password immediately
4. WHEN all passwords are exhausted, THE Crack_System SHALL return null with attempt count

### Requirement 3: CPU 多线程破解

**User Story:** As a user, I want to use multiple CPU cores for faster cracking.

#### Acceptance Criteria

1. WHEN CPU multi-thread mode is enabled, THE Crack_System SHALL create worker threads
2. THE Crack_System SHALL distribute passwords evenly across workers
3. WHEN a worker finds the password, THE Crack_System SHALL terminate all other workers
4. IF worker creation fails, THEN THE Crack_System SHALL fall back to single-threaded mode

### Requirement 4: GPU 破解 (hashcat)

**User Story:** As a user, I want to use GPU acceleration for faster cracking.

#### Acceptance Criteria

1. WHEN GPU mode is enabled and hashcat is available, THE Crack_System SHALL use hashcat
2. THE Crack_System SHALL extract hash from ZIP file correctly
3. WHEN hashcat finds the password, THE Crack_System SHALL return it
4. IF hashcat fails, THEN THE Crack_System SHALL fall back to CPU mode

### Requirement 5: 停止功能

**User Story:** As a user, I want to stop the cracking process at any time.

#### Acceptance Criteria

1. WHEN user clicks stop, THE Crack_System SHALL terminate all processes and workers
2. THE Crack_System SHALL return a cancelled status to the UI
