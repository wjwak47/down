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

由于应用未经 Apple 签名，首次打开时可能显示"已损坏"提示。请按以下步骤操作：

1. 下载并安装 DMG 文件
2. 打开终端，运行以下命令：
```bash
sudo xattr -rd com.apple.quarantine /Applications/ProFlow\ Studio.app
```
3. 输入密码后，即可正常打开应用

或者：右键点击应用 → 选择"打开" → 在弹出对话框中点击"打开"

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
