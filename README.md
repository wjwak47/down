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

1. Visit the [Actions](../../actions) page
2. Click on the latest build
3. Download the installer from Artifacts:
   - `ProFlowStudio-Mac` - macOS (.dmg)
   - `ProFlowStudio-Windows` - Windows (.zip)

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
