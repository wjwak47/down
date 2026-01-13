# Requirements Document

## Introduction

修复密码破解功能的所有已知问题，确保 GPU 加速、多线程 CPU、字典攻击都能正常工作。

## Glossary

- **Worker**: Node.js Worker Thread，用于多线程并行破解
- **Hash**: 从加密文件中提取的密码哈希值，用于 GPU 加速破解
- **John Tools**: John the Ripper 的 hash 提取工具 (zip2john, rar2john, 7z2john)

## Requirements

### Requirement 1: Worker 文件自动复制

**User Story:** 作为开发者，我希望 Worker 文件在构建后自动复制到输出目录，这样多线程模式能正常工作。

#### Acceptance Criteria

1. WHEN npm run build 执行完成后, THE Build_System SHALL 自动复制 crackWorker.js 到 out/main/ 目录
2. WHEN 应用启动时, THE System SHALL 能找到 Worker 文件并启用多线程模式

### Requirement 2: 下载 Hash 提取工具

**User Story:** 作为用户，我希望能使用 GPU 加速破解所有格式的加密文件。

#### Acceptance Criteria

1. THE System SHALL 包含 zip2john.exe 用于提取 ZIP 文件的 hash
2. THE System SHALL 包含 rar2john.exe 用于提取 RAR 文件的 hash
3. THE System SHALL 包含 7z2john.exe 用于提取 7z 文件的 hash
4. WHEN hash 提取工具存在时, THE System SHALL 启用 GPU 加速模式

### Requirement 3: 优化字典顺序

**User Story:** 作为用户，我希望常见密码能被优先测试，更快找到密码。

#### Acceptance Criteria

1. THE Dictionary SHALL 将最常见的密码（如 password123, a123456, 123456）放在最前面
2. THE System SHALL 先测试原始密码，再测试变体
3. WHEN 使用字典模式时, THE System SHALL 在 5 分钟内测试完所有常见密码

### Requirement 4: 改进 UI 显示

**User Story:** 作为用户，我希望密码找到后能清晰醒目地显示。

#### Acceptance Criteria

1. WHEN 密码找到时, THE UI SHALL 显示大号绿色成功提示
2. THE UI SHALL 显示完整的密码，支持一键复制
3. THE UI SHALL 显示破解耗时和尝试次数统计
