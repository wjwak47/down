# Design Document: 抖音下载修复与UI重设计

## Overview

本设计文档涵盖两个主要部分：
1. **功能修复**：修复抖音视频下载功能，添加Cookie认证支持，优化元数据提取
2. **UI重设计**：重新设计Media Downloader页面，使其更加大气、简约、美观

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     VideoDownloader.jsx                          │
│                      (主页面组件)                                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
    ┌─────────────────────┼─────────────────────┐
    ▼                     ▼                     ▼
┌─────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ URL输入区   │   │ 视频信息卡片    │   │ 下载列表区      │
│ (简洁输入框) │   │ (预览+信息+操作) │   │ (进度卡片列表)  │
└─────────────┘   └─────────────────┘   └─────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ DouyinCookie    │ │ FormatSelector  │ │ QualitySelector │
│ Dialog          │ │ (格式选择)      │ │ (质量选择)      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Components and Interfaces

### 1. DouyinCookieDialog 组件

```jsx
// 新增组件：抖音Cookie输入对话框
interface DouyinCookieDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (cookie: string) => void;
    currentCookie?: string;
}
```

### 2. 视频信息卡片布局

```
┌────────────────────────────────────────────────────────────┐
│ ┌──────────────────────┐  ┌──────────────────────────────┐ │
│ │                      │  │ 视频标题（最多2行）          │ │
│ │    视频预览区域      │  │                              │ │
│ │    (16:9 比例)       │  │ 👤 作者名  [DOUYIN]          │ │
│ │                      │  │                              │ │
│ │    封面图/播放器     │  │ ⏱ 03:45  •  12.5 MB  •  MP4  │ │
│ │                      │  │                              │ │
│ └──────────────────────┘  │ ─────────────────────────────│ │
│                           │                              │ │
│                           │ [▼ MP4] [████ Download Video]│ │
│                           │                              │ │
│                           │ [▼ M4A] [🎵 Audio] [📝 Subs] │ │
│                           └──────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 3. 下载卡片布局

```
┌────────────────────────────────────────────────────────────┐
│ ┌────────┐  视频标题（截断显示）                    [⏸][✕] │
│ │ 缩略图 │  ● Active  •  12.5 MB                          │
│ └────────┘  ████████████████░░░░░░░░  75%  •  2.5 MB/s    │
│             已下载: 9.4 MB / 12.5 MB  •  ETA: 00:12       │
└────────────────────────────────────────────────────────────┘
```

## Data Models

### VideoInfo 扩展

```typescript
interface VideoInfo {
    id: string;
    title: string;
    thumbnail: string | null;
    uploader: string | null;
    duration: number | null;
    duration_string: string | null;
    filesize: number | null;
    url: string;
    webpage_url: string;
    ext: string;
    extractor: string;
    headers: {
        'User-Agent': string;
        'Cookie'?: string;
        'Referer': string;
    };
    // 新增字段
    publishDate?: string;      // 发布日期
    viewCount?: number;        // 播放量
    likeCount?: number;        // 点赞数
}
```

### Cookie存储

```typescript
// localStorage key: 'douyinCookie'
interface CookieStorage {
    cookie: string;
    savedAt: number;  // timestamp
}
```

## UI设计规范

### 颜色系统

```css
/* 主题色 */
--primary: #2196F3;
--primary-hover: #1E88E5;
--primary-gradient: linear-gradient(135deg, #2196F3, #42A5F5);

/* 状态色 */
--success: #4CAF50;
--warning: #FF9800;
--error: #F44336;

/* 平台色 */
--douyin: #000000;
--bilibili: #00A1D6;
--youtube: #FF0000;
```

### 组件样式

```css
/* 卡片 */
.card {
    background: white;
    border-radius: 16px;
    border: 1px solid rgba(0,0,0,0.08);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

/* 主按钮 */
.btn-primary {
    background: linear-gradient(135deg, #2196F3, #42A5F5);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
    transition: all 0.2s;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(33, 150, 243, 0.4);
}

/* 次要按钮 */
.btn-secondary {
    background: #f1f5f9;
    border-radius: 10px;
    transition: all 0.2s;
}
```

## 抖音提取器修复

### Cookie注入流程

```javascript
// 1. 从localStorage读取Cookie
const savedCookie = localStorage.getItem('douyinCookie');

// 2. 在BrowserWindow中设置Cookie
if (savedCookie) {
    const cookies = parseCookieString(savedCookie);
    for (const cookie of cookies) {
        await session.cookies.set({
            url: 'https://www.douyin.com',
            name: cookie.name,
            value: cookie.value
        });
    }
}

// 3. 在下载请求中包含Cookie
const headers = {
    'User-Agent': mobileUA,
    'Cookie': savedCookie,
    'Referer': 'https://www.douyin.com/'
};
```

### 元数据提取优化

```javascript
// 增强的元数据提取脚本
const extractionScript = `
(function() {
    const result = {
        title: null,
        uploader: null,
        duration: null,
        thumbnail: null
    };
    
    // 1. 从__RENDER_DATA__提取
    try {
        const renderDataEl = document.getElementById('RENDER_DATA');
        if (renderDataEl) {
            const data = JSON.parse(decodeURIComponent(renderDataEl.textContent));
            const aweme = data?.app?.videoDetail?.awemeDetail || 
                         data?.aweme?.detail || 
                         data?.videoDetail;
            if (aweme) {
                result.title = aweme.desc;
                result.uploader = aweme.author?.nickname;
                result.duration = aweme.video?.duration / 1000;
                result.thumbnail = aweme.video?.cover?.url_list?.[0];
            }
        }
    } catch(e) {}
    
    // 2. 从DOM提取（备用）
    if (!result.title) {
        result.title = document.title?.split(' - ')?.[0]?.trim();
    }
    
    if (!result.uploader) {
        const authorEl = document.querySelector('[data-e2e="user-info"]') ||
                        document.querySelector('[class*="author"]');
        result.uploader = authorEl?.textContent?.trim();
    }
    
    return result;
})()
`;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Cookie存储和读取一致性

*For any* 用户输入的Cookie字符串，保存到localStorage后再读取，应该得到相同的值
**Validates: Requirements 1.2**

### Property 2: VideoInfo完整性

*For any* 成功提取的抖音视频信息，返回的VideoInfo对象必须包含：
- title字段不为空（至少有默认值）
- uploader字段不为"Douyin User"（如果能提取到）
- extractor字段值为"douyin_native"
- headers对象包含User-Agent和Referer
**Validates: Requirements 2.1, 2.2, 2.5**

### Property 3: 下载进度回调正确性

*For any* 进行中的下载任务，进度回调应该包含：
- percent字段为0-100之间的数值
- 如果有speed字段，应该是格式化的速度字符串
**Validates: Requirements 3.3, 3.4**

### Property 4: 平台颜色映射正确性

*For any* 已知平台（douyin, bilibili, youtube等），getPlatformInfo函数应该返回正确的品牌颜色
**Validates: Requirements 4.5**

## Error Handling

| 错误场景 | 错误消息 | 处理方式 |
|---------|---------|---------|
| 需要Cookie | "需要登录Cookie才能下载此视频" | 显示Cookie设置按钮 |
| Cookie无效 | "Cookie已过期，请重新设置" | 提示更新Cookie |
| 网络超时 | "连接超时，请检查网络" | 提供重试按钮 |
| 视频不存在 | "视频不存在或已被删除" | 显示错误状态 |
| 下载失败 | "下载失败: {具体原因}" | 显示重试按钮 |

## Testing Strategy

### 单元测试

- Cookie解析和存储测试
- VideoInfo字段验证测试
- 平台颜色映射测试
- 进度数据格式化测试

### 集成测试

- 完整的抖音视频提取流程（需要网络）
- 下载流程测试（需要网络）

### UI测试

- 组件渲染测试
- 用户交互测试
- 响应式布局测试

