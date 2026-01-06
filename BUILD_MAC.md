# Mac 版本构建指南

## 前置准备

在构建 Mac 版本之前，需要准备以下二进制文件：

### 1. 下载 yt-dlp (macOS)

```bash
# 方法一：直接下载
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -o resources/bin-mac/yt-dlp
chmod +x resources/bin-mac/yt-dlp

# 方法二：使用 Homebrew
brew install yt-dlp
cp $(which yt-dlp) resources/bin-mac/yt-dlp
```

### 2. 下载 ffmpeg (macOS)

```bash
# 方法一：从 Evermeet 下载静态构建版本
# 访问 https://evermeet.cx/ffmpeg/ 下载最新版本
# 解压后复制到 resources/bin-mac/ffmpeg

# 方法二：使用 Homebrew
brew install ffmpeg
cp $(which ffmpeg) resources/bin-mac/ffmpeg
```

### 3. 设置执行权限

```bash
chmod +x resources/bin-mac/yt-dlp
chmod +x resources/bin-mac/ffmpeg
```

## 构建步骤

```bash
# 安装依赖
npm install

# 开发模式测试
npm run dev

# 构建 Mac 安装包
npm run build:mac
```

## 输出文件

构建完成后，安装包位于 `dist/` 目录：
- `Video Downloader-1.0.0-x64.dmg` (Intel Mac)
- `Video Downloader-1.0.0-arm64.dmg` (Apple Silicon Mac)

## 注意事项

1. **代码签名**：如果没有 Apple Developer 账号，用户首次打开时需要在"系统偏好设置 → 安全性与隐私"中允许打开
2. **公证**：发布到网上需要进行 Apple 公证，否则用户会收到"无法验证开发者"警告
