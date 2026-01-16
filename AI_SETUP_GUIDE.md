# AI 模块安装指南

本指南帮助你快速设置 PassGPT AI 模块用于密码破解。

## 快速开始

### 步骤 1: 安装 Python 依赖

```bash
# 确保你已安装 Python 3.8+
python --version

# 安装依赖
pip install -r scripts/requirements-ai.txt
```

### 步骤 2: 下载 PassGPT 模型

```bash
# 运行自动化脚本
python scripts/download_passgpt.py

# 等待下载完成（约 5-10 分钟，取决于网速）
# 模型大小约 500MB
```

### 步骤 3: 安装 Node.js 依赖

```bash
# 安装 ONNX Runtime
npm install

# 或单独安装
npm install onnxruntime-node
```

### 步骤 4: 验证安装

```bash
# 检查模型文件
ls -lh resources/models/

# 应该看到以下文件:
# passgpt.onnx          (~500MB)
# passgpt_vocab.json    (~1-2MB)
# passgpt_metadata.json (~1KB)
```

## 详细说明

### Python 依赖说明

- **torch**: PyTorch 深度学习框架，用于加载和转换模型
- **transformers**: Hugging Face 库，用于下载 PassGPT 模型
- **onnx**: ONNX 模型格式支持
- **onnxruntime**: ONNX 运行时，用于模型推理

### 模型下载说明

脚本会自动执行以下操作：

1. 从 Hugging Face 下载 PassGPT 模型
2. 转换为 ONNX 格式（跨平台兼容）
3. 导出词汇表为 JSON
4. 验证模型完整性
5. 创建元数据文件

### 文件结构

```
resources/models/
├── passgpt.onnx              # ONNX 模型文件
├── passgpt_vocab.json        # 词汇表（token -> id 映射）
└── passgpt_metadata.json     # 模型元数据
```

## 故障排除

### 问题 1: pip install 失败

**错误**: `Could not find a version that satisfies the requirement torch`

**解决方案**:
```bash
# 升级 pip
pip install --upgrade pip

# 重新安装
pip install -r scripts/requirements-ai.txt
```

### 问题 2: 模型下载失败

**错误**: `Connection timeout` 或 `Unable to download`

**解决方案**:
1. 检查网络连接
2. 使用代理或 VPN
3. 手动从 Hugging Face 下载: https://huggingface.co/javirandor/passgpt-10characters

### 问题 3: ONNX 转换失败

**错误**: `ONNX export failed`

**解决方案**:
```bash
# 升级相关包
pip install --upgrade torch transformers onnx

# 重新运行脚本
python scripts/download_passgpt.py
```

### 问题 4: npm install 失败

**错误**: `Failed to install onnxruntime-node`

**解决方案**:
```bash
# 清理缓存
npm cache clean --force

# 重新安装
npm install onnxruntime-node
```

## 性能优化

### CPU 优化

默认使用 CPU 推理，速度约 50,000 密码/秒。

### GPU 加速（可选）

如果你有 NVIDIA GPU，可以使用 GPU 加速：

```bash
# 安装 CUDA 版本的 ONNX Runtime
pip install onnxruntime-gpu

# 修改代码使用 GPU
# executionProviders: ['cuda', 'cpu']
```

## 使用示例

安装完成后，AI 模块会自动集成到密码破解流程中：

1. 打开应用
2. 选择加密文件
3. 点击"破解"
4. AI Phase 会自动运行（如果模型可用）

## 模型信息

- **名称**: PassGPT
- **版本**: 1.0
- **来源**: javirandor/passgpt-10characters
- **架构**: GPT-2 (Transformer)
- **训练数据**: RockYou 数据集
- **最大长度**: 10 个字符
- **预期命中率**: 55-60%
- **生成速度**: 50,000+ 密码/秒

## 下一步

安装完成后，继续开发：

1. 实现 AI Phase 集成 (Task 13)
2. 测试命中率和性能 (Task 14)
3. 实现本地 LSTM 学习 (Task 15-18)

## 参考资料

- [PassGPT 详细设置指南](scripts/README_PASSGPT.md)
- [Phase 3 实现状态](PHASE_3_AI_STATUS.md)
- [任务清单](.kiro/specs/password-cracker-complete-upgrade/tasks.md)

---

**注意**: 模型下载需要约 500MB 空间和稳定的网络连接。首次运行可能需要 5-10 分钟。
