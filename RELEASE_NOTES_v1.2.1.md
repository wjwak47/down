# ProFlow Studio v1.2.1 发布说明

## 🚀 Mac GPU 模式优化版本

### 主要改进

#### Mac GPU 模式增强
- **改进 GPU 检测**：增强了 Mac 上的 GPU 检测逻辑，能够正确识别 OpenCL 和 Metal 后端
- **GPU 状态反馈**：添加了详细的 GPU 状态信息，用户可以清楚了解当前使用的加速模式
- **智能模式选择**：Mac 系统会自动检测并选择最佳的加速模式（GPU/CPU）

#### 具体优化

1. **增强的 GPU 检测**
   - 新增 `checkMacGPUSupport()` 函数，专门检测 Mac GPU 能力
   - 支持检测 OpenCL 和 Metal 后端
   - 能够识别 Apple Silicon、Intel、AMD、NVIDIA GPU
   - 提供详细的后端信息和错误诊断

2. **改进的用户反馈**
   - 显示当前使用的 GPU 后端类型（OpenCL/Metal/CPU）
   - 显示检测到的 GPU 类型（Apple Silicon/Intel/AMD/NVIDIA）
   - 提供更清晰的模式切换提示

3. **优化的决策逻辑**
   - Mac 系统优先尝试 GPU 模式，即使在边界情况下
   - 改进了 GPU 不可用时的自动降级机制
   - 保持了 AI 密码生成的独立性

4. **更好的错误处理**
   - GPU 检测失败时提供详细的错误信息
   - 自动回退机制更加智能和用户友好
   - 增加了超时保护，避免检测过程卡死

### 技术改进

- **平台特定优化**：针对 Mac 平台的 GPU 检测和使用逻辑
- **后端兼容性**：支持 OpenCL 和 Metal 两种 GPU 后端
- **性能监控**：增加了 GPU 状态监控和性能反馈
- **调试增强**：提供更详细的 GPU 检测和使用日志

### 用户体验改进

- **透明的 GPU 状态**：用户可以清楚看到当前使用的加速模式
- **更快的密码破解**：Mac 用户现在可以充分利用 GPU 加速
- **智能模式切换**：系统自动选择最佳的处理模式
- **更好的进度反馈**：显示具体的 GPU 后端和加速状态

### Mac GPU 支持状态

| GPU 类型 | OpenCL 支持 | Metal 支持 | 推荐模式 |
|---------|------------|-----------|---------|
| Apple Silicon (M1/M2/M3) | ✅ | ✅ | GPU 模式 |
| Intel 集成显卡 | ✅ | ✅ | GPU 模式 |
| AMD 独立显卡 | ✅ | ✅ | GPU 模式 |
| NVIDIA 显卡 | ✅ | ❌ | GPU 模式 (OpenCL) |

### 使用说明

1. **自动检测**：应用会自动检测您的 Mac GPU 并选择最佳模式
2. **GPU 模式**：如果检测到 GPU 支持，会显示 "Hashcat GPU (OpenCL)" 或 "Hashcat GPU (Metal)"
3. **CPU 模式**：如果 GPU 不可用，会自动切换到 "Hashcat CPU" 模式
4. **状态查看**：在密码破解界面可以看到当前使用的加速模式

### 性能提升

- **Apple Silicon Mac**：GPU 模式可提供 2-5x 的性能提升
- **Intel Mac + 独立显卡**：GPU 模式可提供 3-10x 的性能提升
- **所有 Mac**：AI 密码生成功能保持高效运行

### 兼容性

- **macOS**: ✅ 全面优化，支持所有 GPU 类型
- **Windows**: ✅ 保持完全兼容
- **架构支持**: x64 (Intel Mac 和 Apple Silicon Mac)

### 安装说明

1. 下载 `ProFlow-Studio-1.2.1-x64.dmg`
2. 双击安装 DMG 文件
3. 如果遇到 "应用程序已损坏" 提示，请在终端运行：
   ```bash
   sudo xattr -rd com.apple.quarantine /Applications/ProFlow\ Studio.app
   ```

### 验证 GPU 模式

启动密码破解后，查看进度信息：
- 看到 "Hashcat GPU (OpenCL)" 或 "Hashcat GPU (Metal)" = GPU 模式已启用
- 看到 "Hashcat CPU" = 使用 CPU 模式
- 看到具体的 GPU 类型信息 = 检测成功

### 故障排除

如果 GPU 模式未启用：
1. 检查系统是否有可用的 GPU
2. 确保 macOS 版本支持 OpenCL/Metal
3. 查看应用日志中的 GPU 检测信息
4. 尝试重启应用重新检测

### 下一步计划

- 进一步优化 Apple Silicon 的 Metal 性能
- 添加 GPU 性能基准测试
- 支持更多 GPU 加速的密码破解算法

---

**完整更新日志**: [查看所有更改](https://github.com/wjwak47/down/compare/v1.2.0...v1.2.1)