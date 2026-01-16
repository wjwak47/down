# PassGPT Model Setup Guide

本指南说明如何下载和设置 PassGPT 模型用于密码破解。

## 什么是 PassGPT？

PassGPT 是基于 GPT-2 Transformer 架构的密码生成模型，在 RockYou 数据集上训练。相比传统的 PassGAN（GAN 架构），PassGPT 具有以下优势：

- **更高命中率**: 55-60% vs PassGAN 的 45-50%
- **更快速度**: 50,000+ 密码/秒
- **更好质量**: 生成的密码更符合真实用户习惯
- **开源可用**: Hugging Face 上有预训练模型

## 前置要求

### 1. 安装 Python 依赖

```bash
# 安装 Python 依赖
pip install -r scripts/requirements-ai.txt
```

需要的包：
- `torch>=2.0.0` - PyTorch 深度学习框架
- `transformers>=4.30.0` - Hugging Face Transformers 库
- `onnx>=1.14.0` - ONNX 模型格式
- `onnxruntime>=1.15.0` - ONNX 运行时

### 2. 安装 Node.js 依赖

```bash
# 安装 ONNX Runtime for Node.js
npm install onnxruntime-node
```

## 下载和转换模型

### 方法 1: 使用自动化脚本（推荐）

```bash
# 运行下载脚本
python scripts/download_passgpt.py

# 或指定输出目录
python scripts/download_passgpt.py --output-dir resources/models
```

脚本会自动：
1. 从 Hugging Face 下载 PassGPT 模型
2. 转换为 ONNX 格式
3. 导出词汇表
4. 验证模型完整性
5. 创建元数据文件

### 方法 2: 手动下载

如果自动脚本失败，可以手动下载：

1. 访问 Hugging Face: https://huggingface.co/javirandor/passgpt-10characters
2. 下载模型文件
3. 使用 PyTorch 加载并转换为 ONNX

## 生成的文件

脚本会在 `resources/models/` 目录下创建以下文件：

```
resources/models/
├── passgpt.onnx              # ONNX 模型文件 (~500MB)
├── passgpt_vocab.json        # 词汇表文件
└── passgpt_metadata.json     # 模型元数据
```

## 验证安装

运行以下命令验证模型是否正确安装：

```bash
# 检查文件是否存在
ls -lh resources/models/

# 应该看到：
# passgpt.onnx (约 500MB)
# passgpt_vocab.json (约 1-2MB)
# passgpt_metadata.json (约 1KB)
```

## 使用示例

在 Node.js 代码中使用 PassGPT：

```javascript
import PassGPTGenerator from './ai/passgptGenerator.js';

// 创建生成器实例
const generator = new PassGPTGenerator();

// 加载模型
await generator.loadModel();

// 生成密码
const passwords = await generator.generatePasswords(
    10000,    // 生成 10,000 个密码
    1.0,      // temperature (0.8-1.2)
    50        // top-K sampling
);

console.log(`Generated ${passwords.length} passwords`);
console.log('Sample:', passwords.slice(0, 10));

// 释放资源
await generator.dispose();
```

## 性能优化

### Temperature 参数

- **0.8**: 更保守，生成常见密码（更高命中率）
- **1.0**: 平衡（推荐）
- **1.2**: 更多样化，生成罕见密码（更低命中率）

### Top-K 参数

- **0**: 禁用 Top-K，从所有 token 采样
- **50**: 默认值，平衡速度和质量
- **100**: 更多样化，但速度稍慢

### 批量大小

- 默认批量大小: 100
- 可以根据内存调整
- 更大批量 = 更快速度，但占用更多内存

## 故障排除

### 问题 1: 模型下载失败

**原因**: 网络问题或 Hugging Face 访问受限

**解决方案**:
1. 使用代理或 VPN
2. 手动从 Hugging Face 下载模型文件
3. 使用国内镜像（如果有）

### 问题 2: ONNX 转换失败

**原因**: PyTorch 或 ONNX 版本不兼容

**解决方案**:
```bash
# 升级到最新版本
pip install --upgrade torch transformers onnx
```

### 问题 3: 模型加载失败

**原因**: 文件路径错误或文件损坏

**解决方案**:
1. 检查文件是否存在: `ls resources/models/`
2. 检查文件大小是否正确（~500MB）
3. 重新下载模型

### 问题 4: 生成速度慢

**原因**: CPU 性能不足

**解决方案**:
1. 减少批量大小
2. 使用更小的 top-K 值
3. 考虑使用 GPU 加速（需要 CUDA）

## 模型信息

- **模型名称**: PassGPT
- **架构**: GPT-2 (Transformer)
- **训练数据**: RockYou 数据集
- **最大长度**: 10 个字符
- **词汇表大小**: ~50,000 tokens
- **模型大小**: ~500MB (ONNX)
- **预期命中率**: 55-60%
- **生成速度**: 50,000+ 密码/秒

## 参考资料

- PassGPT 论文: https://arxiv.org/abs/2306.01545
- Hugging Face 模型: https://huggingface.co/javirandor/passgpt-10characters
- ONNX Runtime: https://onnxruntime.ai/
- Transformers 库: https://huggingface.co/docs/transformers/

## 下一步

模型设置完成后，继续实现：
1. 集成 PassGPT 到破解流程 (Task 13)
2. 添加 AI Phase 到 GPU 攻击管道
3. 测试命中率和性能

---

**注意**: PassGPT 模型仅用于合法的密码恢复和安全研究目的。请勿用于非法活动。
