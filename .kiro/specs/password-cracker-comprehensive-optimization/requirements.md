# Requirements Document: 压缩包密码破解板块全面优化

## Introduction

全面分析和优化压缩包密码破解功能，从效率和选项两个维度进行深度优化。当前系统已具备7层递进破解策略、GPU加速、AI密码生成等先进功能，但仍存在效率瓶颈和用户体验问题需要优化。

## Glossary

- **Smart_Cracker**: 智能密码破解器，使用7层递进策略
- **PassGPT**: AI密码生成模型，基于GPT-2架构
- **Hashcat**: GPU加速密码破解工具
- **Bkcrack**: 已知明文攻击工具，专门破解ZipCrypto
- **Strategy_Selector**: 自适应策略选择器，根据文件特征选择最优策略
- **Batch_Manager**: 批量测试管理器，优化CPU破解效率
- **Session_Manager**: 会话管理器，支持暂停恢复功能

## Requirements

### Requirement 1: 效率优化 - GPU破解策略优化

**User Story:** As a user, I want optimized GPU cracking strategies, so that I can achieve maximum cracking efficiency with minimal time waste.

#### Acceptance Criteria

1. WHEN GPU is available, THE System SHALL implement dynamic phase skipping based on file characteristics
2. WHEN a phase runs for more than 30 seconds without progress, THE System SHALL automatically skip to next phase
3. WHEN file size is less than 1MB, THE System SHALL prioritize short password phases (1-6 chars)
4. WHEN file name contains personal keywords, THE System SHALL prioritize dictionary and keyboard patterns
5. THE System SHALL implement adaptive timeout based on password complexity estimation

### Requirement 2: 效率优化 - AI密码生成优化

**User Story:** As a user, I want optimized AI password generation, so that I can get high-quality password candidates faster.

#### Acceptance Criteria

1. WHEN using PassGPT, THE System SHALL implement streaming generation (100 passwords per batch)
2. WHEN PassGPT generates duplicates, THE System SHALL filter them in real-time
3. WHEN PassGPT generation is slow, THE System SHALL implement parallel batch processing
4. THE System SHALL cache frequently generated patterns to avoid regeneration
5. WHEN AI phase exceeds 5 minutes, THE System SHALL automatically transition to next phase

### Requirement 3: 效率优化 - CPU多线程优化

**User Story:** As a user, I want optimized CPU multi-threading, so that I can achieve maximum CPU utilization.

#### Acceptance Criteria

1. WHEN using CPU mode, THE System SHALL implement work-stealing queue for load balancing
2. WHEN CPU cores are underutilized, THE System SHALL dynamically adjust worker count
3. WHEN memory usage exceeds 80%, THE System SHALL reduce batch sizes automatically
4. THE System SHALL implement NUMA-aware thread allocation on multi-socket systems
5. WHEN CPU temperature is high, THE System SHALL throttle worker threads

### Requirement 4: 效率优化 - 内存和I/O优化

**User Story:** As a user, I want optimized memory and I/O usage, so that the system runs efficiently without resource waste.

#### Acceptance Criteria

1. THE System SHALL implement password candidate caching to reduce regeneration
2. WHEN testing passwords, THE System SHALL use memory-mapped files for large archives
3. THE System SHALL implement lazy loading for dictionary files
4. WHEN available RAM is low, THE System SHALL use disk-based temporary storage
5. THE System SHALL compress session data to reduce storage requirements

### Requirement 5: 选项扩展 - 高级破解模式

**User Story:** As a user, I want advanced cracking modes, so that I can handle specialized password patterns.

#### Acceptance Criteria

1. THE System SHALL provide "Date Range Attack" mode for year-based passwords (1990-2030)
2. THE System SHALL provide "Company Name Attack" mode using extracted metadata
3. THE System SHALL provide "Keyboard Walk Attack" mode for adjacent key patterns
4. THE System SHALL provide "Social Engineering Attack" mode using file path analysis
5. THE System SHALL provide "Custom Rule Attack" mode allowing user-defined transformation rules

### Requirement 6: 选项扩展 - 智能策略配置

**User Story:** As a user, I want intelligent strategy configuration, so that I can customize cracking behavior based on my needs.

#### Acceptance Criteria

1. THE System SHALL provide "Speed Priority" mode (skip slow phases, focus on fast attacks)
2. THE System SHALL provide "Thoroughness Priority" mode (exhaustive search, no timeouts)
3. THE System SHALL provide "Balanced Mode" (current default behavior)
4. THE System SHALL allow users to enable/disable specific attack phases
5. THE System SHALL provide estimated time and success probability for each mode

### Requirement 7: 选项扩展 - 批量处理功能

**User Story:** As a user, I want batch processing capabilities, so that I can crack multiple archives efficiently.

#### Acceptance Criteria

1. THE System SHALL support batch cracking of multiple archives in queue
2. WHEN batch processing, THE System SHALL share learned patterns between files
3. THE System SHALL provide batch progress reporting with individual file status
4. THE System SHALL allow priority reordering of files in batch queue
5. WHEN one file is cracked, THE System SHALL apply successful password to remaining files

### Requirement 8: 选项扩展 - 密码分析和统计

**User Story:** As a user, I want password analysis and statistics, so that I can understand password patterns and improve future attacks.

#### Acceptance Criteria

1. THE System SHALL collect statistics on successful password patterns
2. THE System SHALL provide password strength analysis for cracked passwords
3. THE System SHALL generate reports on most effective attack phases
4. THE System SHALL maintain a local database of successful passwords (hashed)
5. THE System SHALL provide recommendations for improving attack strategies

### Requirement 9: 选项扩展 - 外部工具集成

**User Story:** As a user, I want integration with external tools, so that I can leverage additional cracking capabilities.

#### Acceptance Criteria

1. THE System SHALL support custom wordlist import (txt, csv formats)
2. THE System SHALL integrate with John the Ripper for additional hash formats
3. THE System SHALL support custom mask patterns with user-defined character sets
4. THE System SHALL allow integration with external password generators
5. THE System SHALL provide API endpoints for third-party tool integration

### Requirement 10: 用户体验优化 - 实时反馈增强

**User Story:** As a user, I want enhanced real-time feedback, so that I can monitor cracking progress effectively.

#### Acceptance Criteria

1. THE System SHALL display estimated completion time for each phase
2. THE System SHALL show password candidate quality scores in real-time
3. THE System SHALL provide visual progress indicators for each attack phase
4. THE System SHALL display resource utilization (CPU, GPU, Memory) in real-time
5. THE System SHALL show success probability updates based on current progress

### Requirement 11: 用户体验优化 - 错误处理和恢复

**User Story:** As a user, I want robust error handling and recovery, so that cracking sessions are reliable and resumable.

#### Acceptance Criteria

1. WHEN system crashes, THE System SHALL automatically save session state
2. WHEN resuming sessions, THE System SHALL restore exact progress and continue from last position
3. WHEN hardware errors occur, THE System SHALL gracefully degrade to alternative methods
4. THE System SHALL provide detailed error logs with suggested solutions
5. WHEN network interruptions occur, THE System SHALL continue offline operations

### Requirement 12: 性能监控和调优

**User Story:** As a user, I want performance monitoring and tuning capabilities, so that I can optimize system performance.

#### Acceptance Criteria

1. THE System SHALL provide real-time performance metrics dashboard
2. THE System SHALL detect and report performance bottlenecks automatically
3. THE System SHALL suggest optimal settings based on hardware configuration
4. THE System SHALL provide benchmark mode for testing different configurations
5. THE System SHALL maintain performance history for trend analysis
