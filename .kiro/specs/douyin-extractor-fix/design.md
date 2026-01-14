# Design Document: 抖音提取器修复

## Overview

修复抖音视频提取器，采用多层提取策略：优先从页面内嵌数据提取，其次网络拦截，最后DOM/正则提取。解决2026年抖音结构变化导致的问题。

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 extractDouyinVideo()                     │
│                    (主入口函数)                          │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ 策略1: API数据  │ │ 策略2: 网络拦截 │ │ 策略3: DOM提取  │
│ __RENDER_DATA__ │ │ onResponseStart │ │ CSS选择器/正则  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
          │               │               │
          └───────────────┼───────────────┘
                          ▼
              ┌─────────────────────┐
              │   合并结果 + 验证   │
              └─────────────────────┘
```

## Components and Interfaces

### 1. 主提取函数

```javascript
async function extractDouyinVideo(url: string): Promise<VideoInfo>
```

### 2. 策略1: 页面内嵌数据提取

```javascript
// 从页面脚本中提取__RENDER_DATA__或类似数据
async function extractFromPageData(webContents): Promise<Partial<VideoInfo>> {
    return await webContents.executeJavaScript(`
        (function() {
            // 尝试多种数据源
            // 1. window.__RENDER_DATA__
            // 2. script[id="RENDER_DATA"]
            // 3. script type="application/json"
            // 4. window._ROUTER_DATA
        })()
    `);
}
```

### 3. 策略2: 网络请求拦截

```javascript
// 使用onResponseStarted拦截视频请求
session.webRequest.onResponseStarted({ urls: ['*://*/*'] }, (details) => {
    // 检查content-type和URL模式
    // 捕获视频URL和封面URL
});
```

### 4. 策略3: DOM元素提取

```javascript
// 从DOM元素提取元数据
async function extractFromDOM(webContents): Promise<Partial<VideoInfo>> {
    return await webContents.executeJavaScript(`
        (function() {
            // 标题: document.title, meta[og:title], h1
            // 作者: [data-e2e="user-info"], .author-name, etc.
            // 封面: video.poster, meta[og:image]
            // 视频: video.src (非blob)
        })()
    `);
}
```

## Data Models

### VideoInfo 结构

```javascript
interface VideoInfo {
    title: string;           // 视频标题
    thumbnail: string | null; // 封面图URL
    uploader: string | null;  // 上传者
    duration: number | null;  // 时长(秒)
    duration_string: string | null; // 时长字符串
    url: string;             // 视频下载URL
    webpage_url: string;     // 原始页面URL
    ext: string;             // 文件扩展名 'mp4'
    extractor: string;       // 'douyin_native'
    videoId: string | null;  // 视频ID
    headers: {
        'User-Agent': string;
        'Cookie': string;
        'Referer': string;
    }
}
```

### 2026年抖音页面数据结构（预期）

```javascript
// window.__RENDER_DATA__ 或类似结构
{
    aweme_detail: {
        aweme_id: "7565487470096272703",
        desc: "视频描述/标题",
        author: {
            nickname: "作者名",
            uid: "123456"
        },
        video: {
            play_addr: {
                url_list: ["https://...mp4"]
            },
            cover: {
                url_list: ["https://...jpg"]
            },
            duration: 15000  // 毫秒
        }
    }
}
```

## 关键修复点

### 1. 使用Mobile UA获取单文件MP4

```javascript
const mobileUA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
```

### 2. 内存Session避免Cookie问题

```javascript
partition: 'in-memory-extraction'  // 不是 'persist:douyin'
```

### 3. 多源数据提取脚本

```javascript
const extractionScript = `
(function() {
    const result = { title: null, uploader: null, videoUrl: null, thumbnail: null, duration: null };
    
    // 1. 尝试从__RENDER_DATA__提取
    try {
        const renderData = window.__RENDER_DATA__;
        if (renderData) {
            const decoded = JSON.parse(decodeURIComponent(renderData));
            // 解析数据...
        }
    } catch(e) {}
    
    // 2. 尝试从script标签提取
    try {
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            if (script.textContent.includes('aweme_detail')) {
                // 解析JSON...
            }
        }
    } catch(e) {}
    
    // 3. 从DOM提取
    // 标题
    result.title = document.title?.split('-')[0]?.trim() ||
                   document.querySelector('meta[property="og:title"]')?.content ||
                   document.querySelector('h1')?.textContent?.trim();
    
    // 作者 - 2026年可能的选择器
    const authorSelectors = [
        '[data-e2e="user-info"] span',
        '[class*="author"] [class*="name"]',
        '[class*="nickname"]',
        '[class*="user-name"]',
        '.author-card .name'
    ];
    for (const sel of authorSelectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) {
            result.uploader = el.textContent.trim();
            break;
        }
    }
    
    // 封面
    const video = document.querySelector('video');
    result.thumbnail = video?.poster ||
                       document.querySelector('meta[property="og:image"]')?.content;
    
    // 视频URL (非blob)
    if (video?.src && !video.src.startsWith('blob:')) {
        result.videoUrl = video.src;
    }
    
    return result;
})()
`;
```

## Correctness Properties

### Property 1: 视频URL必须有效

*For any* 成功返回的VideoInfo，url字段必须是以https://开头的有效URL，不能是blob:或空值
**Validates: Requirements 1.2, 1.3, 1.4**

### Property 2: Headers完整性

*For any* 成功返回的VideoInfo，headers对象必须包含User-Agent、Cookie、Referer三个字段
**Validates: Requirements 5.1, 5.2, 5.3**

### Property 3: 标题非空

*For any* 成功返回的VideoInfo，title字段不能为空，至少应该有默认值"抖音视频"
**Validates: Requirements 2.1, 2.2**

## Error Handling

| 错误场景 | 错误消息 | 处理方式 |
|---------|---------|---------|
| 页面加载超时 | "超时：20秒内无法加载页面" | reject Promise |
| 页面加载失败 | "页面加载失败: {原因}" | reject Promise |
| 视频URL未找到 | "无法获取视频URL：所有提取策略均失败" | reject Promise |
| 短链接解析失败 | 无 | 使用原始URL继续 |

## Testing Strategy

### 单元测试

- extractVideoId() 各种URL格式测试
- processVideoUrl() URL处理测试
- resolveShortUrl() 超时处理测试

### 集成测试

- 完整提取流程测试（需要网络）
- 各种抖音URL格式测试
