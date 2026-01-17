# ProFlow Studio v1.2.0 发布说明

## 🍎 Mac 密码破解修复版本

### 主要修复

#### Mac 密码破解崩溃问题
- **修复 GPU 模式崩溃**：改进了 Mac 上的 hashcat GPU 检测，避免因 GPU 检测失败导致的程序崩溃
- **修复 CPU 模式问题**：增强了 Mac 上的 7z 工具路径检测，支持多种安装路径
- **修复字典路径问题**：改进了 rockyou 字典的查找逻辑，支持多个可能的安装位置

#### 具体改进

1. **更安全的 GPU 检测**
   - 移除了可能导致崩溃的 `--backend-info` 检测
   - 改用更安全的 `--version` 检查
   - 增加了超时保护和错误处理

2. **增强的 7z 工具支持**
   - 自动检测多个可能的 7z 安装路径：
     - `/opt/homebrew/bin/7z` (Apple Silicon Mac)
     - `/usr/local/bin/7z` (Intel Mac)
     - `/usr/bin/7z` (系统安装)
   - 提供详细的错误信息和路径搜索日志

3. **改进的字典查找**
   - 支持多个 rockyou 字典位置：
     - Hashcat 目录
     - 系统 wordlists 目录
     - Homebrew 安装目录
     - 应用资源目录
   - 提供详细的搜索路径日志

4. **更好的错误处理**
   - GPU 模式出错时自动回退到 CPU 模式
   - 提供更详细的错误信息和调试日志
   - 增加了 Mac 特定的错误处理逻辑

### 技术改进

- **平台特定优化**：针对 Mac 平台的特殊处理逻辑
- **路径检测增强**：支持 Homebrew、MacPorts 等多种包管理器安装的工具
- **错误恢复机制**：GPU 失败时自动降级到 CPU 模式
- **调试信息增强**：提供更详细的工具检测和路径搜索日志

### 用户体验改进

- **更稳定的密码破解**：Mac 用户不再遇到启动即崩溃的问题
- **更好的进度反馈**：提供详细的工具检测状态和错误信息
- **自动回退机制**：GPU 不可用时自动使用 CPU 模式，保证功能可用

### 兼容性

- **macOS**: ✅ 修复了所有已知的崩溃问题
- **Windows**: ✅ 保持完全兼容
- **架构支持**: x64 (Intel Mac 和 Apple Silicon Mac 通过 Rosetta)

### 安装说明

1. 下载 `ProFlow-Studio-1.2.0-x64.dmg`
2. 双击安装 DMG 文件
3. 如果遇到 "应用程序已损坏" 提示，请在终端运行：
   ```bash
   sudo xattr -rd com.apple.quarantine /Applications/ProFlow\ Studio.app
   ```

### 已知问题

- Mac 上的 GPU 模式可能仍然受限于 OpenCL/Metal 支持
- 建议 Mac 用户优先使用 CPU 模式以获得最佳稳定性

### 下一步计划

- 进一步优化 Mac GPU 支持
- 添加更多密码破解算法
- 改进 AI 密码生成功能

---

**完整更新日志**: [查看所有更改](https://github.com/wjwak47/down/compare/v1.1.9...v1.2.0)