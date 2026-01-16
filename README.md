# ProFlow Studio

**v1.0.0** | Created by **jonshon**

Professional workflow tools for media and documents processing.

## Features

- 🎬 **Video Downloader** - Multi-platform video downloading
- 🎞️ **Media Converter** - Convert between audio/video formats
- 📄 **Document Converter** - Office documents & PDF conversion
- 🗜️ **File Compressor** - Archive creation and extraction
- 🎨 **Watermark Remover** - AI-powered watermark removal
- 🎙️ **AI Transcriber** - Audio/video transcription with Groq Whisper & Gemini

## Download

### Automated Builds

This project uses GitHub Actions for automated builds.

1. Visit the [Releases](../../releases) page
2. Download the installer:
   - `proflow-studio-x.x.x-setup.exe` - Windows
   - `proflow-studio-x.x.x-arm64.dmg` - macOS (Apple Silicon)
   - `proflow-studio-x.x.x-x64.dmg` - macOS (Intel)

### macOS Installation

由于应用未经 Apple 签名，首次打开时可能显示"已损坏"或无法打开。请按以下步骤操作：

**方法一：使用 ZIP 便携版（推荐）**
1. 下载 `ProFlow-Studio-xxx-portable.zip`
2. 解压到任意位置
3. 打开终端，运行：
```bash
xattr -cr "/path/to/ProFlow Studio.app"
```
4. 双击打开应用

**方法二：使用 DMG 安装包**
1. 下载并打开 DMG 文件
2. 将 ProFlow Studio 拖到 Applications 文件夹
3. 打开终端，运行：
```bash
sudo xattr -rd com.apple.quarantine "/Applications/ProFlow Studio.app"
```
4. 输入密码后，双击打开应用

**方法三：如果上述方法无效**
1. 打开"系统偏好设置" → "安全性与隐私" → "通用"
2. 点击"仍要打开"按钮（如果显示）
3. 或者：右键点击应用 → 选择"打开" → 在弹出对话框中点击"打开"

**如果仍然无法打开（无任何提示）：**
```bash
# 完全移除隔离属性
sudo xattr -d com.apple.quarantine "/Applications/ProFlow Studio.app"
# 重新签名
codesign --force --deep --sign - "/Applications/ProFlow Studio.app"
```

### Manual Build

#### Windows
```bash
npm install
npm run build:win
```

#### macOS
```bash
npm install
npm run build:mac
```

See [BUILD_MAC.md](BUILD_MAC.md) for detailed Mac build instructions.

## Development

```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build
```

## Tech Stack

- Electron + React + Vite
- TailwindCSS
- Groq Whisper API
- Google Gemini AI

---

© 2026 jonshon. All rights reserved.
