# Design Document: 抖音视频下载器

## Overview

抖音视频下载模块，通过Electron隐藏窗口加载抖音页面，拦截网络请求获取视频URL，支持视频和音频下载。

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    VideoDownloader.jsx                   │
│                      (前端UI组件)                        │
└─────────────────────────┬───────────────────────────────┘
                          │ IPC调用
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      yt-dlp.js                          │
│                   (下载服务入口)                         │
│  - getVideoInfo() 检测抖音URL并调用extractDouyinNative  │
│  - downloadVideo() 执行下载                             │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 douyin-extractor.js                     │
│                  (抖音专用提取器)                        │
│  - resolveShortUrl() 解析短链接                         │
│  - extractVideoId() 提取视频ID                          │
│  - extractDouyinVideo() 主提取函数                      │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. douyin-extractor.js

主要导出函数：

```javascript
// 提取视频ID
function extractVideoId(url: string): string | null

// 解析短链接
async function resolveShortUrl(url: string): Promise<string>

// 主提取函数
async function extractDouyinVideo(url: string): Promise<VideoInfo>

// VideoInfo 结构
interface VideoInfo {
  title: string;           // 视频标题
  thumbnail: string | null; // 封面图URL
  uploader: string | null;  // 上传者
  duration: number | null;  // 时长(秒)
  duration_string: string | null; // 时长字符串
  url: string;             // 视频下载URL
  webpage_url: string;     // 原始页面URL
  ext: string;             // 文件扩展名
  extractor: string;       // 提取器标识
  videoId: string | null;  // 视频ID
  headers: {               // 请求头
    'User-Agent': string;
    'Cookie': string;
    'Referer': string;
  }
}
```

### 2. URL处理函数

```javascript
// 处理视频URL - 去水印、转H264
function processVideoUrl(url: string): string {
  let result = url;
  // 去水印
  if (result.includes('playwm')) {
    result = result.replace('playwm', 'play');
  }
  // 转H264
  if (result.includes('_265') || result.includes('hevc')) {
    result = result.replace(/_265/g, '_264').replace(/hevc/g, 'h264');
  }
  return result;
}
```

## Data Models

### URL类型

| 类型 | 格式 | 示例 |
|------|------|------|
| 短链接 | v.douyin.com/xxx | https://v.douyin.com/iRNBho5/ |
| 视频页 | douyin.com/video/ID | https://www.douyin.com/video/7123456789 |
| 精选页 | douyin.com/jingxuan?modal_id=ID | https://www.douyin.com/jingxuan?modal_id=7123456789 |

### 请求头配置

```javascript
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Cookie': '<从页面获取>',
  'Referer': 'https://www.douyin.com/'
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: URL解析正确性

*For any* URL输入，如果是v.douyin.com短链接则解析重定向，否则直接返回原URL
**Validates: Requirements 1.1, 1.2**

### Property 2: 视频ID提取正确性

*For any* 包含视频ID的URL（/video/ID 或 modal_id=ID格式），extractVideoId应返回正确的数字ID
**Validates: Requirements 2.1, 2.2**

### Property 3: 视频URL处理正确性

*For any* 视频URL，processVideoUrl应正确替换playwm为play，_265为_264，hevc为h264
**Validates: Requirements 3.2**

### Property 4: 请求头完整性

*For any* 成功提取的VideoInfo，headers对象应包含User-Agent、Cookie、Referer三个字段
**Validates: Requirements 4.3**

## Error Handling

| 错误场景 | 错误消息 | 处理方式 |
|---------|---------|---------|
| 视频URL获取失败 | "无法获取视频地址" | reject Promise |
| 页面加载失败 | "页面加载失败" | reject Promise |
| 短链接解析超时 | 无 | 使用原始URL继续 |
| 提取超时(25秒) | "无法获取视频地址" | reject Promise |

## Testing Strategy

### 单元测试

- extractVideoId() 函数测试
- processVideoUrl() 函数测试
- resolveShortUrl() 超时处理测试

### 属性测试

使用 fast-check 进行属性测试：
- 视频ID提取属性测试（生成各种URL格式）
- URL处理属性测试（生成包含各种标记的URL）

### 集成测试

- 完整提取流程测试（需要网络环境）
- 下载流程测试
