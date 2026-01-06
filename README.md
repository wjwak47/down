# Video Downloader

多功能视频下载工具，支持 Windows 和 macOS。

## 功能

- 视频下载（支持多平台）
- 媒体格式转换
- 字幕下载
- 音频提取

## 下载安装包

### 自动构建

本项目使用 GitHub Actions 自动构建安装包。

1. 前往 [Actions](../../actions) 页面
2. 点击最新的构建任务
3. 在 Artifacts 区域下载对应平台的安装包：
   - `VideoDownloader-Mac` - macOS 版本 (.dmg)
   - `VideoDownloader-Windows` - Windows 版本 (.zip)

### 手动构建

#### Windows
```bash
npm install
npm run build:win
```

#### macOS
```bash
# 需要先下载 Mac 版二进制文件
npm install
npm run build:mac
```

详细 Mac 构建说明请参阅 [BUILD_MAC.md](BUILD_MAC.md)

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build
```

## 技术栈

- Electron
- React
- Vite
- TailwindCSS
