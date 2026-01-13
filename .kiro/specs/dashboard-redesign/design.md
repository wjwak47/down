# Design Document: Dashboard Redesign

## Overview

重新设计 Dashboard 页面，采用简约、大气、清新的设计风格。作为应用入口，提供快捷功能入口和智能文件路由，同时保持与其他页面一致的设计语言。

## Architecture

### 页面结构

```
Dashboard
├── Header (标题 + 副标题)
├── Main Content Area (居中, max-w-4xl)
│   ├── Quick Actions Grid (2x2)
│   │   ├── Media Download Card
│   │   ├── Media Convert Card
│   │   ├── Document Convert Card
│   │   └── File Compress Card
│   ├── Drop Zone
│   │   ├── Icon (浅灰色背景)
│   │   ├── Title + Description
│   │   ├── File Type Tags (彩色)
│   │   └── URL Input (集成)
│   └── Feature Cards (3列)
│       ├── Fast Processing
│       ├── Secure & Local
│       └── Smart Organization
```

### 设计理念

1. **简约** - 去除多余元素，保留核心功能
2. **大气** - 充足的留白，清晰的层次
3. **清新** - 柔和的颜色，圆润的边角
4. **一致** - 与其他页面统一的设计语言

## Components and Interfaces

### 1. Header Component

```jsx
<div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
    <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">Dashboard</h1>
    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Your creative workspace</p>
</div>
```

### 2. Quick Action Cards

```jsx
const quickActions = [
    { 
        icon: 'download', 
        title: 'Media Download', 
        desc: 'Download from YouTube, Vimeo & more',
        color: 'text-[#E53935]', 
        bg: 'bg-red-50 dark:bg-red-900/20',
        page: 'video-downloader' 
    },
    { 
        icon: 'swap_horiz', 
        title: 'Media Convert', 
        desc: 'Convert video and audio formats',
        color: 'text-[#2196F3]', 
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        page: 'media-converter' 
    },
    { 
        icon: 'description', 
        title: 'Document Convert', 
        desc: 'PDF, Word, Excel conversion',
        color: 'text-[#4CAF50]', 
        bg: 'bg-green-50 dark:bg-green-900/20',
        page: 'document-converter' 
    },
    { 
        icon: 'folder_zip', 
        title: 'File Compress', 
        desc: 'Compress and extract archives',
        color: 'text-[#FF9800]', 
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        page: 'file-compressor' 
    }
];

// Card Component
<div className="grid grid-cols-2 gap-4">
    {quickActions.map(action => (
        <div 
            key={action.page}
            onClick={() => onNavigate(action.page)}
            className="p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all group"
        >
            <div className={`w-12 h-12 rounded-xl ${action.bg} flex items-center justify-center mb-4`}>
                <span className={`material-symbols-outlined text-2xl ${action.color}`}>{action.icon}</span>
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1">{action.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{action.desc}</p>
        </div>
    ))}
</div>
```

### 3. Drop Zone Component

```jsx
<div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center">
    {/* Icon */}
    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <span className="material-symbols-outlined text-slate-400 text-2xl">upload_file</span>
    </div>
    
    {/* Title */}
    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">Drop files here</h3>
    <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Files will be routed to the right tool automatically</p>
    
    {/* Colorful File Type Tags */}
    <div className="flex gap-3 justify-center mb-5">
        <span className="text-[#2196F3] text-xs font-semibold">Video</span>
        <span className="text-[#4CAF50] text-xs font-semibold">Audio</span>
        <span className="text-[#E53935] text-xs font-semibold">Document</span>
        <span className="text-[#FF9800] text-xs font-semibold">Archive</span>
    </div>
    
    {/* URL Input */}
    <div className="max-w-md mx-auto">
        <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <div className="pl-4 flex items-center">
                <span className="material-symbols-outlined text-slate-400 text-xl">link</span>
            </div>
            <input className="flex-1 h-11 px-3 bg-transparent text-sm" placeholder="Or paste a URL..." />
            <button className="h-11 px-4 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] text-white">
                <span className="material-symbols-outlined">arrow_forward</span>
            </button>
        </div>
    </div>
</div>
```

### 4. Feature Cards Component

```jsx
<div className="grid grid-cols-3 gap-4">
    {[
        { icon: 'bolt', title: 'Fast Processing', desc: 'Optimized for speed' },
        { icon: 'lock', title: 'Secure & Local', desc: 'Files never leave your device' },
        { icon: 'auto_awesome', title: 'Smart Organization', desc: 'Auto-detect file types' }
    ].map((item, i) => (
        <div key={i} className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="material-symbols-outlined text-[#2196F3] text-xl mb-2 block">{item.icon}</span>
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{item.title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
        </div>
    ))}
</div>
```

## Data Models

### Navigation State

```typescript
interface DashboardProps {
    onNavigate: (page: string) => void;
    setPendingUrl: (url: string) => void;
    setPendingFiles: (files: string[]) => void;
}

interface QuickAction {
    icon: string;
    title: string;
    desc: string;
    color: string;
    bg: string;
    page: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Quick Action Card Completeness

*For any* quick action card rendered, it SHALL contain an icon element, title text, description text, and have a click handler that navigates to the correct page.

**Validates: Requirements 2.2, 2.4**

### Property 2: File Drop Routing

*For any* file dropped on the Dashboard, the system SHALL navigate to the appropriate page based on file extension (video → media-converter, document → document-converter, archive → file-compressor).

**Validates: Requirements 3.4**

### Property 3: URL Submission Navigation

*For any* non-empty URL submitted via the input, the Dashboard SHALL navigate to the video-downloader page with the URL passed as pending data.

**Validates: Requirements 4.3**

## Error Handling

- Invalid file types: Default to media-converter
- Empty URL submission: Prevent navigation, show no error
- Navigation failures: Log error, stay on current page

## Testing Strategy

### Unit Tests

- Test file type detection logic
- Test navigation callbacks
- Test URL validation

### Property-Based Tests

- **Property 1**: Generate random quick action configs, verify all elements render
- **Property 2**: Generate random file extensions, verify correct routing
- **Property 3**: Generate random URLs, verify navigation with data

### Visual Regression Tests

- Capture screenshots of Dashboard in light/dark mode
- Compare against baseline for design consistency
