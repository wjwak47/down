# Requirements Document

## Introduction

全面升级 FileCompressor 文件压缩工具，添加密码加密、压缩级别选择、分卷压缩、多格式支持、密码破解等高级功能，打造一个功能完整、性能强大的压缩工具，对标 7-Zip 和 WinRAR。

## Glossary

- **FileCompressor**: 文件压缩/解压页面组件
- **Password_Encryption**: 密码加密功能，使用 AES-256 加密
- **Compression_Level**: 压缩级别，控制压缩率和速度的平衡
- **Split_Archive**: 分卷压缩，将大文件分割成多个小文件
- **Password_Cracker**: 密码破解器，使用多线程破解加密压缩包
- **Dictionary_Attack**: 字典攻击，使用常见密码列表尝试
- **Brute_Force**: 暴力破解，尝试所有可能的字符组合

## Requirements

### Requirement 1: 密码加密功能

**User Story:** As a user, I want to set a password when compressing files, so that my archives are protected from unauthorized access.

#### Acceptance Criteria

1. WHEN user enables password protection, THE FileCompressor SHALL display a password input field
2. THE FileCompressor SHALL require password confirmation to prevent typos
3. WHEN compressing with password, THE FileCompressor SHALL use AES-256 encryption
4. THE FileCompressor SHALL show a password strength indicator
5. IF password is empty but encryption is enabled, THE FileCompressor SHALL show a warning

### Requirement 2: 压缩级别选择

**User Story:** As a user, I want to choose compression level, so that I can balance between speed and file size.

#### Acceptance Criteria

1. THE FileCompressor SHALL provide 3 compression levels: Fast, Normal, Maximum
2. WHEN user selects Fast, THE FileCompressor SHALL prioritize speed over compression ratio
3. WHEN user selects Maximum, THE FileCompressor SHALL prioritize smallest file size
4. THE FileCompressor SHALL display estimated compression ratio for each level
5. THE FileCompressor SHALL remember user's last selected compression level

### Requirement 3: 分卷压缩

**User Story:** As a user, I want to split large archives into smaller parts, so that I can easily transfer them via email or USB.

#### Acceptance Criteria

1. THE FileCompressor SHALL provide option to split archive into volumes
2. THE FileCompressor SHALL allow user to specify volume size (MB)
3. THE FileCompressor SHALL provide preset sizes: 100MB, 500MB, 1GB, 2GB, Custom
4. WHEN splitting, THE FileCompressor SHALL name files as archive.zip.001, archive.zip.002, etc.
5. THE FileCompressor SHALL be able to extract split archives back to original

### Requirement 4: 多格式支持

**User Story:** As a user, I want to compress and extract various archive formats, so that I can work with any file type.

#### Acceptance Criteria

1. THE FileCompressor SHALL support creating: ZIP, 7Z, TAR, TAR.GZ formats
2. THE FileCompressor SHALL support extracting: ZIP, 7Z, RAR, TAR, TAR.GZ, TAR.BZ2
3. WHEN user selects output format, THE FileCompressor SHALL show format-specific options
4. THE FileCompressor SHALL auto-detect archive format when extracting

### Requirement 5: 密码破解功能

**User Story:** As a user, I want to recover forgotten passwords from my encrypted archives, so that I can access my own files.

#### Acceptance Criteria

1. THE FileCompressor SHALL provide a "Crack Password" mode
2. THE Password_Cracker SHALL support Dictionary Attack using wordlists
3. THE Password_Cracker SHALL support Brute Force with customizable character sets
4. THE Password_Cracker SHALL support Mask Attack for partial password knowledge
5. THE Password_Cracker SHALL use multi-threading for maximum performance
6. THE Password_Cracker SHALL display real-time statistics: speed, attempts, progress
7. WHEN password is found, THE Password_Cracker SHALL display it prominently
8. THE Password_Cracker SHALL allow user to pause and resume cracking
9. THE Password_Cracker SHALL support ZIP, RAR, 7Z encrypted archives

### Requirement 6: 用户界面优化

**User Story:** As a user, I want a clean and intuitive interface for all compression features.

#### Acceptance Criteria

1. THE FileCompressor SHALL have a mode selector: Compress, Extract, Crack Password
2. THE FileCompressor SHALL show advanced options in a collapsible panel
3. THE FileCompressor SHALL display file list with size, type, and status
4. THE FileCompressor SHALL show detailed progress with speed and ETA
5. THE FileCompressor SHALL support dark mode with consistent styling
