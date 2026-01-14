# Requirements Document

## Introduction

优化 GPU 密码破解模块，实现世界顶尖的 7 层递进破解策略。当前系统只有内置字典和纯暴力两种模式，需要添加规则攻击、智能掩码、混合攻击等高级策略，大幅提升破解成功率。

## Glossary

- **Hashcat**: 世界最快的 GPU 密码破解工具
- **Dictionary_Attack**: 字典攻击，使用预定义密码列表
- **Rule_Attack**: 规则攻击，对字典词应用变形规则
- **Mask_Attack**: 掩码攻击，按模式生成密码
- **Hybrid_Attack**: 混合攻击，字典+掩码组合
- **Rockyou**: 最著名的密码泄露字典，1400万真实密码
- **Best64_Rule**: Hashcat 内置最高效的 64 条变形规则
- **Markov_Chain**: 马尔可夫链，基于字符概率生成密码

## Requirements

### Requirement 1: 大型密码字典

**User Story:** As a user, I want the system to use comprehensive password dictionaries, so that common passwords can be cracked quickly.

#### Acceptance Criteria

1. THE System SHALL include rockyou.txt dictionary (14 million passwords)
2. THE System SHALL include SecLists top passwords (already done: 19k combined)
3. WHEN GPU mode starts, THE System SHALL first try the combined dictionary
4. THE System SHALL store dictionaries in resources/hashcat/hashcat-6.2.6/

### Requirement 2: 规则攻击模式

**User Story:** As a user, I want the system to apply transformation rules to dictionary words, so that password variations can be cracked.

#### Acceptance Criteria

1. WHEN dictionary attack exhausts, THE System SHALL start rule-based attack
2. THE System SHALL use best64.rule for efficient transformations
3. THE System SHALL apply rules like: capitalize, leet speak, add numbers, add symbols
4. WHEN rule attack runs, THE System SHALL display "Rule Attack" in UI

### Requirement 3: 智能掩码攻击

**User Story:** As a user, I want the system to try common password patterns, so that human-created passwords can be cracked efficiently.

#### Acceptance Criteria

1. WHEN rule attack exhausts, THE System SHALL start smart mask attack
2. THE System SHALL try these patterns in order:
   - `?d?d?d?d?d?d` (6-digit PIN)
   - `?l?l?l?l?l?l?d?d` (6 lowercase + 2 digits)
   - `?u?l?l?l?l?l?d?d` (Capital + 5 lowercase + 2 digits)
   - `?l?l?l?l?l?l?d?d?d?d` (6 lowercase + 4 digits/year)
   - `?u?l?l?l?l?l?d?d?d?s` (Capital + lowercase + digits + symbol)
3. WHEN mask attack runs, THE System SHALL display current pattern in UI

### Requirement 4: 混合攻击模式

**User Story:** As a user, I want the system to combine dictionary words with patterns, so that compound passwords can be cracked.

#### Acceptance Criteria

1. WHEN mask attack exhausts, THE System SHALL start hybrid attack
2. THE System SHALL try: dictionary + `?d?d?d?d` (word + 4 digits)
3. THE System SHALL try: dictionary + `?d?d?s` (word + 2 digits + symbol)
4. THE System SHALL try: `?d?d?d?d` + dictionary (4 digits + word)

### Requirement 5: 短密码暴力破解

**User Story:** As a user, I want the system to bruteforce short passwords, so that simple passwords can be cracked.

#### Acceptance Criteria

1. WHEN hybrid attack exhausts, THE System SHALL start short bruteforce
2. THE System SHALL bruteforce 1-6 character passwords only
3. THE System SHALL use incremental mode (short to long)
4. THE System SHALL limit to lowercase + digits for efficiency

### Requirement 6: CPU 智能字典回退

**User Story:** As a user, I want the system to fall back to CPU when GPU fails, so that all options are exhausted.

#### Acceptance Criteria

1. WHEN GPU attacks all fail, THE System SHALL fall back to CPU mode
2. THE CPU_Mode SHALL only try smart dictionary (not bruteforce)
3. THE CPU_Mode SHALL use multi-threaded workers
4. WHEN CPU mode starts, THE System SHALL display "CPU Smart Dictionary" in UI

### Requirement 7: 进度显示优化

**User Story:** As a user, I want to see detailed progress information, so that I know what the system is doing.

#### Acceptance Criteria

1. THE System SHALL display current attack phase name
2. THE System SHALL display current attack method (Dictionary/Rule/Mask/Hybrid/Bruteforce)
3. THE System SHALL display estimated time remaining when available
4. THE System SHALL display total attempts across all phases
