# Design Document: Video Downloader Enhancement

## Overview

本设计文档详细描述视频下载器的全面优化方案，包括 UI/UX 重构、功能增强以及密码破解任务持久化修复。设计遵循项目现有的视觉风格（现代简约、渐变按钮、圆角卡片），同时引入更专业的下载管理体验。

## Architecture

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        App.jsx                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              GlobalTaskContext                       │    │
│  │  - downloads: Map<id, DownloadTask>                 │    │
│  │  - crackJobs: Map<id, CrackJob>                     │    │
│  │  - notifications: Notification[]                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                            │                                 │
│  ┌─────────────┬───────────┴───────────┬─────────────┐     │
│  │  Sidebar    │    VideoDownloader    │FileCompressor│     │
│  │  (badges)   │    (always mounted)   │(always mount)│     │
│  └─────────────┴───────────────────────┴─────────────┘     │
│                            │                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              ToastNotificationSystem                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 页面结构

```
VideoDownloader
├── Header (标题 + 副标题 + 快捷操作)
│   ├── Title: "Media Downloader"
│   ├── Subtitle: "Download videos and audio from popular platforms"
│   └── Actions: [History] [Settings] [Open Folder]
│
├── Main Content Area
│   ├── URL Input Section
│   │   ├── Smart Input Bar (支持粘贴检测)
│   │   └── Platform Tags (彩色平台标识)
│   │
│   ├── Media Preview Section (解析成功后显示)
│   │   ├── Enhanced Media Card
│   │   │   ├── Thumbnail (可悬停放大)
│   │   │   ├── Video Info (标题、时长、播放量、上传日期、频道)
│   │   │   ├── Platform Badge (平台图标+名称)
│   │   │   └── Description (可展开)
│   │   │
│   │   ├── Quality Selector
│   │   │   ├── Video Quality Options (4K/1080p/720p/480p)
│   │   │   ├── Audio Quality Options (320kbps/256kbps/128kbps)
│   │   │   └── File Size Estimates
│   │   │
│   │   ├── Format Selector
│   │   │   ├── Video Formats (MP4/MKV/WebM)
│   │   │   └── Audio Formats (MP3/AAC/FLAC/WAV)
│   │   │
│   │   ├── Subtitle Options
│   │   │   ├── Language Selection (多选)
│   │   │   ├── Format Selection (SRT/VTT/ASS)
│   │   │   └── Embed Option
│   │   │
│   │   └── Download Actions
│   │       ├── Primary: "Download Video" (渐变按钮)
│   │       ├── Secondary: "Audio Only"
│   │       └── Tertiary: "Subtitles Only"
│   │
│   ├── Playlist Section (播放列表时显示)
│   │   ├── Playlist Header (名称、视频数量)
│   │   ├── Select Controls (全选/取消全选)
│   │   ├── Video List (可选择的视频列表)
│   │   └── Batch Download Button
│   │
│   └── Download Queue Section
│       ├── Queue Header (活跃数/总数)
│       ├── Active Downloads (进行中)
│       │   └── DownloadItem (可拖拽排序)
│       │       ├── Thumbnail
│       │       ├── Title + Platform
│       │       ├── Progress Bar (带速度和剩余时间)
│       │       └── Actions (暂停/继续/取消)
│       ├── Queued Downloads (等待中)
│       └── Completed Downloads (已完成)
│
├── Empty State (无任务时)
│   ├── Icon + Title + Description
│   ├── Supported Platforms (彩色图标)
│   └── Feature Cards (3列)
│
└── Dialogs
    ├── History Dialog
    ├── Settings Dialog
    ├── Bilibili Cookie Dialog
    └── Subtitle Selection Dialog
```

## Components and Interfaces

### 1. GlobalTaskContext (全局任务状态)

```typescript
interface GlobalTaskState {
  // 下载任务
  downloads: Map<string, DownloadTask>;
  // 密码破解任务
  crackJobs: Map<string, CrackJob>;
  // 通知队列
  notifications: Notification[];
  // 设置
  settings: DownloadSettings;
}

interface DownloadTask {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  platform: Platform;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  progress: number;
  speed: number;           // bytes/s
  downloadedSize: number;
  totalSize: number;
  eta: number;             // seconds
  quality: string;
  format: string;
  retryCount: number;
  createdAt: Date;
  completedAt?: Date;
  filePath?: string;
  error?: string;
}

interface CrackJob {
  id: string;
  filePath: string;
  fileName: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  attempts: number;
  speed: number;
  currentPassword: string;
  foundPassword?: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

interface DownloadSettings {
  downloadPath: string;
  maxConcurrent: number;      // 1-5
  autoRetry: boolean;
  retryCount: number;
  speedLimit: number;         // 0 = unlimited
  openFolderAfterDownload: boolean;
  showNotifications: boolean;
  clipboardMonitoring: boolean;
  preferredQuality: string;
  preferredFormat: string;
}
```

### 2. Enhanced Media Card Component

```jsx
const EnhancedMediaCard = ({ videoInfo, onDownload, onQualityChange, onFormatChange }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('best');
  const [selectedFormat, setSelectedFormat] = useState('mp4');
  
  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      {/* 主信息区 */}
      <div className="flex gap-5 p-5">
        {/* 缩略图 - 支持悬停放大 */}
        <div className="relative group">
          <img 
            src={videoInfo.thumbnail} 
            className="w-56 h-32 object-cover rounded-xl flex-shrink-0 transition-transform group-hover:scale-105"
          />
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
            {videoInfo.duration}
          </div>
          {/* 平台徽章 */}
          <div className="absolute top-2 left-2">
            <PlatformBadge platform={videoInfo.platform} />
          </div>
        </div>
        
        {/* 信息区 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
            {videoInfo.title}
          </h3>
          
          {/* 元信息 */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mb-3">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">visibility</span>
              {formatViewCount(videoInfo.viewCount)}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">calendar_today</span>
              {formatDate(videoInfo.uploadDate)}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-base">person</span>
              {videoInfo.channelName}
            </span>
          </div>
          
          {/* 质量选择器 */}
          <QualitySelector 
            formats={videoInfo.formats}
            selected={selectedQuality}
            onChange={setSelectedQuality}
          />
        </div>
      </div>
      
      {/* 描述区 (可展开) */}
      {videoInfo.description && (
        <div className="px-5 pb-4">
          <p className={`text-sm text-slate-600 dark:text-slate-400 ${!showFullDescription && 'line-clamp-2'}`}>
            {videoInfo.description}
          </p>
          <button 
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="text-xs text-[#2196F3] mt-1"
          >
            {showFullDescription ? 'Show less' : 'Show more'}
          </button>
        </div>
      )}
      
      {/* 操作区 */}
      <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          {/* 格式选择 */}
          <FormatSelector 
            selected={selectedFormat}
            onChange={setSelectedFormat}
            audioOnly={selectedQuality === 'audio'}
          />
          
          {/* 下载按钮 */}
          <div className="flex gap-3">
            <button 
              onClick={() => onDownload('video', selectedQuality, selectedFormat)}
              className="px-6 py-2.5 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] text-white rounded-xl font-medium transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Download Video
            </button>
            <button 
              onClick={() => onDownload('audio')}
              className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              Audio Only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 3. Quality Selector Component

```jsx
const QualitySelector = ({ formats, selected, onChange }) => {
  const videoQualities = [
    { id: '4k', label: '4K', resolution: '2160p', icon: '4k' },
    { id: '1080p', label: '1080p', resolution: '1080p', icon: 'hd' },
    { id: '720p', label: '720p', resolution: '720p', icon: 'sd' },
    { id: '480p', label: '480p', resolution: '480p', icon: 'sd' },
  ];
  
  return (
    <div className="flex gap-2">
      {videoQualities.map(q => {
        const format = formats.find(f => f.resolution === q.resolution);
        const available = !!format;
        const size = format?.filesize ? formatFileSize(format.filesize) : '';
        
        return (
          <button
            key={q.id}
            onClick={() => available && onChange(q.id)}
            disabled={!available}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              selected === q.id
                ? 'bg-[#2196F3] text-white'
                : available
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <div>{q.label}</div>
            {size && <div className="text-xs opacity-70">{size}</div>}
          </button>
        );
      })}
    </div>
  );
};
```

### 4. Download Queue Item Component

```jsx
const DownloadQueueItem = ({ task, onPause, onResume, onCancel, onRetry }) => {
  const progressPercent = task.totalSize > 0 
    ? Math.round((task.downloadedSize / task.totalSize) * 100) 
    : task.progress;
  
  return (
    <div className="p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 mb-3">
      <div className="flex items-center gap-4">
        {/* 缩略图 */}
        <img src={task.thumbnail} className="w-16 h-10 object-cover rounded-lg flex-shrink-0" />
        
        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <PlatformBadge platform={task.platform} size="sm" />
            <h4 className="text-sm font-medium text-slate-800 dark:text-white truncate">
              {task.title}
            </h4>
          </div>
          
          {/* 进度条 */}
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-1">
            <div 
              className={`h-full rounded-full transition-all ${
                task.status === 'failed' 
                  ? 'bg-red-500' 
                  : task.status === 'completed'
                    ? 'bg-green-500'
                    : 'bg-gradient-to-r from-[#2196F3] to-[#42A5F5]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          {/* 状态信息 */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              {task.status === 'downloading' && (
                <>
                  {formatFileSize(task.downloadedSize)} / {formatFileSize(task.totalSize)}
                  <span className="mx-2">•</span>
                  {formatSpeed(task.speed)}
                  <span className="mx-2">•</span>
                  {formatETA(task.eta)} remaining
                </>
              )}
              {task.status === 'queued' && 'Waiting...'}
              {task.status === 'paused' && 'Paused'}
              {task.status === 'completed' && 'Completed'}
              {task.status === 'failed' && (
                <span className="text-red-500">{task.error || 'Download failed'}</span>
              )}
            </span>
            <span>{progressPercent}%</span>
          </div>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {task.status === 'downloading' && (
            <button onClick={onPause} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <span className="material-symbols-outlined">pause</span>
            </button>
          )}
          {task.status === 'paused' && (
            <button onClick={onResume} className="p-2 text-[#2196F3] hover:text-[#1E88E5] transition-colors">
              <span className="material-symbols-outlined">play_arrow</span>
            </button>
          )}
          {task.status === 'failed' && (
            <button onClick={onRetry} className="p-2 text-orange-500 hover:text-orange-600 transition-colors">
              <span className="material-symbols-outlined">refresh</span>
            </button>
          )}
          {task.status === 'completed' && (
            <button onClick={() => window.api.openFolder(task.filePath)} className="p-2 text-green-500 hover:text-green-600 transition-colors">
              <span className="material-symbols-outlined">folder_open</span>
            </button>
          )}
          {task.status !== 'completed' && (
            <button onClick={onCancel} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
```

### 5. Platform Badge Component

```jsx
const PLATFORM_CONFIG = {
  youtube: { name: 'YouTube', color: '#FF0000', icon: 'smart_display' },
  bilibili: { name: 'Bilibili', color: '#00A1D6', icon: 'play_circle' },
  vimeo: { name: 'Vimeo', color: '#1AB7EA', icon: 'videocam' },
  douyin: { name: '抖音', color: '#000000', icon: 'music_note' },
  tiktok: { name: 'TikTok', color: '#000000', icon: 'music_note' },
  twitter: { name: 'Twitter/X', color: '#1DA1F2', icon: 'tag' },
  soundcloud: { name: 'SoundCloud', color: '#FF5500', icon: 'graphic_eq' },
  generic: { name: 'Direct Link', color: '#6B7280', icon: 'link' },
};

const PlatformBadge = ({ platform, size = 'md' }) => {
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.generic;
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  
  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses}`}
      style={{ backgroundColor: `${config.color}20`, color: config.color }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: size === 'sm' ? '12px' : '16px' }}>
        {config.icon}
      </span>
      {config.name}
    </span>
  );
};
```
