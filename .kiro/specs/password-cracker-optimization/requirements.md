# Requirements Document

## Introduction

优化密码破解功能，将破解速度从当前的 37/秒 提升到 50万+/秒（GPU）或 1000+/秒（CPU），支持多种加密类型的智能检测和最优破解策略选择。

## Glossary

- **Cracker**: 密码破解系统
- **ZipCrypto**: 传统 ZIP 加密算法，可被已知明文攻击
- **AES-256**: 高级加密标准，需要暴力破解
- **bkcrack**: 已知明文攻击工具，可秒级破解 ZipCrypto
- **Hashcat**: GPU 加速密码破解工具
- **Known_Plaintext_Attack**: 已知明文攻击，利用已知文件内容破解

## Requirements

### Requirement 1: 加密类型检测

**User Story:** As a user, I want the system to automatically detect the encryption type of ZIP files, so that it can choose the optimal cracking strategy.

#### Acceptance Criteria

1. WHEN a ZIP file is selected for cracking, THE Cracker SHALL detect the encryption method (ZipCrypto Store, ZipCrypto Deflate, AES-128, AES-256)
2. WHEN the encryption type is detected, THE Cracker SHALL display the encryption type to the user
3. WHEN the encryption type is ZipCrypto, THE Cracker SHALL recommend using known plaintext attack

### Requirement 2: 已知明文攻击 (bkcrack)

**User Story:** As a user, I want to use known plaintext attack for ZipCrypto encrypted files, so that I can crack passwords in seconds instead of hours.

#### Acceptance Criteria

1. WHEN the encryption type is ZipCrypto, THE Cracker SHALL attempt known plaintext attack using file signatures
2. WHEN known plaintext attack succeeds, THE Cracker SHALL extract the password or internal keys within 60 seconds
3. WHEN known plaintext attack fails, THE Cracker SHALL fall back to dictionary/bruteforce attack
4. THE Cracker SHALL support common file signatures (PNG, JPEG, PDF, XML, ZIP, DOCX, XLSX)

### Requirement 3: GPU 加速破解 (Hashcat)

**User Story:** As a user, I want to use GPU acceleration for AES encrypted files, so that I can achieve 500,000+ passwords per second.

#### Acceptance Criteria

1. WHEN GPU is available and encryption is AES, THE Cracker SHALL use Hashcat for GPU-accelerated cracking
2. WHEN using Hashcat, THE Cracker SHALL display real-time speed (passwords/second)
3. WHEN Hashcat finds the password, THE Cracker SHALL report it immediately
4. IF Hashcat is not available, THEN THE Cracker SHALL fall back to CPU multi-thread mode

### Requirement 4: CPU 多线程优化

**User Story:** As a user, I want optimized CPU multi-threading, so that I can achieve 1000+ passwords per second without GPU.

#### Acceptance Criteria

1. WHEN using CPU mode, THE Cracker SHALL utilize all available CPU cores
2. WHEN using CPU mode, THE Cracker SHALL use batch password testing to reduce process overhead
3. WHEN using CPU mode, THE Cracker SHALL achieve at least 1000 passwords per second
4. THE Cracker SHALL display real-time progress with speed, attempts, and current password

### Requirement 5: 智能策略选择

**User Story:** As a user, I want the system to automatically choose the best cracking strategy, so that I get the fastest results.

#### Acceptance Criteria

1. WHEN starting a crack, THE Cracker SHALL evaluate available methods (bkcrack, Hashcat, CPU)
2. THE Cracker SHALL prioritize methods in order: bkcrack > Hashcat GPU > CPU Multi-thread
3. WHEN a method fails or is unavailable, THE Cracker SHALL automatically try the next method
4. THE Cracker SHALL inform the user which method is being used and why
