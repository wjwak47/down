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


### 6. History Dialog Component

```jsx
const HistoryDialog = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  co


### 6. History Dialog Component

```jsx
const HistoryDialog = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [filter, setFilter] = useState('all'); // all, video, audio
  
  const filteredHistory = history.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || item.type === filter;
    return matchesSearch && matchesFilter;
  });
  
  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Download History">
      {/* 搜索和筛选 */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search downloads..."
            className="w-full h-10 pl-10 pr-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm"
          />
        </div>
        <select 
          value={filter} 
          onChange={e => setFilter(e.target.value)}
          className="px-4 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm"
        >
          <option value="all">All</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
        </select>
      </div>
      
      {/* 历史列表 */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {filteredHistory.map(item => (
          <HistoryItem 
            key={item.id} 
            item={item}
            onRedownload={() => handleRedownload(item)}
            onOpenFolder={() => window.api.openFolder(item.filePath)}
            onDelete={() => handleDelete(item.id)}
          />
        ))}
      </div>
      
      {/* 清空按钮 */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between">
        <button className="text-sm text-red-500 hover:text-red-600">Clear All History</button>
        <button onClick={onClose} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm">Close</button>
      </div>
    </Dialog>
  );
};
```

### 7. Playlist Selection Component

```jsx
const PlaylistSelector = ({ playlist, onDownload }) => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(playlist.entries.map(e => e.id)));
    }
    setSelectAll(!selectAll);
  };
  
  const toggleItem = (id) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
    setSelectAll(newSet.size === playlist.entries.length);
  };
  
  return (
    <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      {/* 播放列表头部 */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{playlist.title}</h3>
            <p className="text-sm text-slate-500">{playlist.entries.length} videos</p>
          </div>
          <PlatformBadge platform={playlist.platform} />
        </div>
      </div>
      
      {/* 选择控制 */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={selectAll}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Select All ({selectedItems.size}/{playlist.entries.length})
          </span>
        </label>
        <button
          onClick={() => onDownload(Array.from(selectedItems))}
          disabled={selectedItems.size === 0}
          className="px-4 py-2 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          Download Selected
        </button>
      </div>
      
      {/* 视频列表 */}
      <div className="max-h-80 overflow-y-auto">
        {playlist.entries.map((entry, index) => (
          <div 
            key={entry.id}
            className="flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30"
          >
            <input 
              type="checkbox"
              checked={selectedItems.has(entry.id)}
              onChange={() => toggleItem(entry.id)}
              className="w-4 h-4 rounded border-slate-300"
            />
            <span className="text-sm text-slate-400 w-8">{index + 1}</span>
            <img src={entry.thumbnail} className="w-20 h-12 object-cover rounded" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{entry.title}</p>
              <p className="text-xs text-slate-500">{entry.duration}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Data Models

### Download State Model

```typescript
// 下载任务状态
interface DownloadTask {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  platform: 'youtube' | 'bilibili' | 'vimeo' | 'douyin' | 'tiktok' | 'twitter' | 'soundcloud' | 'generic';
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  progress: number;           // 0-100
  speed: number;              // bytes/s
  downloadedSize: number;     // bytes
  totalSize: number;          // bytes
  eta: number;                // seconds remaining
  quality: string;            // '4k' | '1080p' | '720p' | '480p' | 'audio'
  format: string;             // 'mp4' | 'mkv' | 'webm' | 'mp3' | 'aac'
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  filePath?: string;
  error?: string;
  type: 'video' | 'audio' | 'subtitle';
}

// 视频信息
interface VideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;           // seconds
  durationFormatted: string;  // "12:34"
  viewCount: number;
  uploadDate: string;
  channelName: string;
  channelUrl: string;
  platform: string;
  webpage_url: string;
  formats: Format[];
  subtitles: SubtitleInfo[];
  chapters?: Chapter[];
  isPlaylist: boolean;
  playlistInfo?: PlaylistInfo;
}

// 格式信息
interface Format {
  formatId: string;
  ext: string;
  resolution: string;
  fps: number;
  vcodec: string;
  acodec: string;
  filesize: number;
  tbr: number;                // total bitrate
  quality: string;
}

// 字幕信息
interface SubtitleInfo {
  language: string;
  languageCode: string;
  isAutoGenerated: boolean;
  formats: string[];          // ['srt', 'vtt', 'ass']
}

// 播放列表信息
interface PlaylistInfo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelName: string;
  videoCount: number;
  entries: PlaylistEntry[];
}

interface PlaylistEntry {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  url: string;
}

// 下载历史
interface DownloadHistory {
  id: string;
  title: string;
  thumbnail: string;
  platform: string;
  type: 'video' | 'audio' | 'subtitle';
  quality: string;
  format: string;
  fileSize: number;
  filePath: string;
  downloadedAt: Date;
  url: string;
}

// 用户设置
interface DownloadSettings {
  downloadPath: string;
  maxConcurrent: number;
  autoRetry: boolean;
  retryCount: number;
  speedLimit: number;
  openFolderAfterDownload: boolean;
  showNotifications: boolean;
  clipboardMonitoring: boolean;
  preferredVideoQuality: string;
  preferredAudioQuality: string;
  preferredVideoFormat: string;
  preferredAudioFormat: string;
  subtitleLanguages: string[];
  embedSubtitles: boolean;
}
```

## State Management Architecture

### Global Task Context

```jsx
// contexts/GlobalTaskContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';

const GlobalTaskContext = createContext(null);

const initialState = {
  downloads: {},           // Map<id, DownloadTask>
  crackJobs: {},          // Map<id, CrackJob>
  history: [],            // DownloadHistory[]
  settings: {
    downloadPath: '',
    maxConcurrent: 3,
    autoRetry: true,
    retryCount: 3,
    speedLimit: 0,
    openFolderAfterDownload: false,
    showNotifications: true,
    clipboardMonitoring: false,
    preferredVideoQuality: '1080p',
    preferredAudioQuality: '320kbps',
    preferredVideoFormat: 'mp4',
    preferredAudioFormat: 'mp3',
  },
  notifications: [],
};

function taskReducer(state, action) {
  switch (action.type) {
    case 'ADD_DOWNLOAD':
      return { ...state, downloads: { ...state.downloads, [action.payload.id]: action.payload } };
    case 'UPDATE_DOWNLOAD':
      return { ...state, downloads: { ...state.downloads, [action.payload.id]: { ...state.downloads[action.payload.id], ...action.payload } } };
    case 'REMOVE_DOWNLOAD':
      const { [action.payload]: _, ...remainingDownloads } = state.downloads;
      return { ...state, downloads: remainingDownloads };
    case 'ADD_CRACK_JOB':
      return { ...state, crackJobs: { ...state.crackJobs, [action.payload.id]: action.payload } };
    case 'UPDATE_CRACK_JOB':
      return { ...state, crackJobs: { ...state.crackJobs, [action.payload.id]: { ...state.crackJobs[action.payload.id], ...action.payload } } };
    case 'ADD_TO_HISTORY':
      return { ...state, history: [action.payload, ...state.history].slice(0, 100) };
    case 'CLEAR_HISTORY':
      return { ...state, history: [] };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };
    case 'REMOVE_NOTIFICATION':
      return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
    default:
      return state;
  }
}

export function GlobalTaskProvider({ children }) {
  const [state, dispatch] = useReducer(taskReducer, initialState);
  
  // 从 localStorage 恢复设置
  useEffect(() => {
    const savedSettings = localStorage.getItem('downloadSettings');
    if (savedSettings) {
      dispatch({ type: 'UPDATE_SETTINGS', payload: JSON.parse(savedSettings) });
    }
    const savedHistory = localStorage.getItem('downloadHistory');
    if (savedHistory) {
      dispatch({ type: 'LOAD_HISTORY', payload: JSON.parse(savedHistory) });
    }
  }, []);
  
  // 保存设置到 localStorage
  useEffect(() => {
    localStorage.setItem('downloadSettings', JSON.stringify(state.settings));
  }, [state.settings]);
  
  // 保存历史到 localStorage
  useEffect(() => {
    localStorage.setItem('downloadHistory', JSON.stringify(state.history));
  }, [state.history]);
  
  return (
    <GlobalTaskContext.Provider value={{ state, dispatch }}>
      {children}
    </GlobalTaskContext.Provider>
  );
}

export const useGlobalTasks = () => useContext(GlobalTaskContext);
```

## Error Handling

### Error Types and Messages

```typescript
const ERROR_MESSAGES = {
  // 网络错误
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  TIMEOUT: '连接超时，请稍后重试',
  
  // 视频错误
  VIDEO_NOT_FOUND: '视频不存在或已被删除',
  VIDEO_PRIVATE: '该视频为私密视频，无法下载',
  VIDEO_AGE_RESTRICTED: '该视频有年龄限制，需要登录',
  VIDEO_GEO_BLOCKED: '该视频在您的地区不可用',
  VIDEO_REMOVED: '该视频已被版权方移除',
  
  // 平台错误
  PLATFORM_NOT_SUPPORTED: '暂不支持该平台',
  COOKIE_REQUIRED: '需要登录才能下载高清视频',
  RATE_LIMITED: '请求过于频繁，请稍后重试',
  
  // 下载错误
  DOWNLOAD_FAILED: '下载失败，请重试',
  DISK_FULL: '磁盘空间不足',
  PERMISSION_DENIED: '没有写入权限，请检查下载目录',
  FILE_EXISTS: '文件已存在',
  
  // 解析错误
  PARSE_FAILED: '解析失败，请检查链接是否正确',
  INVALID_URL: '无效的链接格式',
};

const getErrorMessage = (error) => {
  if (error.message.includes('404')) return ERROR_MESSAGES.VIDEO_NOT_FOUND;
  if (error.message.includes('403')) return ERROR_MESSAGES.VIDEO_PRIVATE;
  if (error.message.includes('timeout')) return ERROR_MESSAGES.TIMEOUT;
  if (error.message.includes('geo')) return ERROR_MESSAGES.VIDEO_GEO_BLOCKED;
  if (error.message.includes('age')) return ERROR_MESSAGES.VIDEO_AGE_RESTRICTED;
  if (error.message.includes('ENOSPC')) return ERROR_MESSAGES.DISK_FULL;
  if (error.message.includes('EACCES')) return ERROR_MESSAGES.PERMISSION_DENIED;
  return ERROR_MESSAGES.DOWNLOAD_FAILED;
};
```

## Testing Strategy

### Unit Tests

1. **URL 解析测试**: 测试各平台 URL 识别
2. **格式选择器测试**: 测试质量/格式选择逻辑
3. **进度计算测试**: 测试下载进度、速度、ETA 计算
4. **历史管理测试**: 测试历史记录的增删改查

### Integration Tests

1. **完整下载流程**: URL 输入 → 解析 → 选择质量 → 下载 → 完成
2. **播放列表下载**: 播放列表解析 → 选择视频 → 批量下载
3. **错误恢复**: 下载失败 → 自动重试 → 成功/最终失败

### Property-Based Tests

1. **下载队列排序**: 任意顺序的任务添加后，队列顺序应保持一致
2. **进度计算**: 任意下载大小和已下载大小，进度百分比应在 0-100 之间
3. **历史记录**: 任意数量的历史记录，搜索结果应包含所有匹配项


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Download Queue Ordering Invariant

*For any* sequence of download tasks added to the queue, the queue SHALL maintain FIFO ordering unless explicitly reordered by the user, and the number of active downloads SHALL never exceed the configured concurrent limit.

**Validates: Requirements 1.1, 1.3, 1.4, 1.5**

### Property 2: Download Progress Calculation Correctness

*For any* download task with known total size and downloaded size, the progress percentage SHALL equal `(downloadedSize / totalSize) * 100`, the speed SHALL equal `bytesDownloadedInInterval / intervalSeconds`, and the ETA SHALL equal `remainingBytes / currentSpeed`.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 3: Platform Detection Accuracy

*For any* valid URL from a supported platform (YouTube, Bilibili, Vimeo, Douyin, TikTok, Twitter, SoundCloud), the Platform_Detector SHALL correctly identify the platform and return the appropriate platform configuration (name, color, icon).

**Validates: Requirements 10.3, 10.5**

### Property 4: Quality Format Completeness

*For any* successfully parsed video, the Quality_Selector SHALL display all available formats from the parsed info, and each format option SHALL include resolution, file size estimate, and codec information.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 5: History Search Correctness

*For any* search query on the download history, the returned results SHALL contain all and only items whose title contains the search query (case-insensitive), and the results SHALL be ordered by download date (newest first).

**Validates: Requirements 4.1, 4.3**

### Property 6: Settings Persistence Round-Trip

*For any* valid settings object, saving to localStorage and then loading SHALL produce an equivalent settings object.

**Validates: Requirements 3.4, 11.4, 13.1**

### Property 7: Retry Mechanism Bounds

*For any* failed download, the retry count SHALL increment by 1 on each failure, and automatic retries SHALL stop when retry count reaches the configured maximum (default 3).

**Validates: Requirements 7.1, 7.4, 7.5**

### Property 8: Clipboard URL Deduplication

*For any* URL copied to clipboard, the notification system SHALL show at most one notification per unique URL within a configurable time window (default 5 seconds).

**Validates: Requirements 5.1, 5.4**

### Property 9: Playlist Selection State Consistency

*For any* playlist with N videos, the "Select All" checkbox state SHALL be true if and only if all N videos are selected, and the selected count display SHALL always equal the actual number of selected items.

**Validates: Requirements 2.2, 2.3**

### Property 10: Task State Persistence Across Navigation

*For any* running background task (download or crack), navigating away from and back to the task's page SHALL restore the exact task state including progress, speed, and status.

**Validates: Requirements 15.1, 15.2, 15.3**

### Property 11: Notification Trigger Completeness

*For any* background task that completes (success or failure), the system SHALL generate exactly one notification containing the task type, result status, and action button.

**Validates: Requirements 16.1, 16.2, 16.3**

### Property 12: Active Task Badge Accuracy

*For any* state of the application, the sidebar badge count SHALL equal the sum of active downloads plus running crack jobs.

**Validates: Requirements 17.1, 17.2**

---

## App.jsx Modification for Task Persistence

为了解决密码破解任务切换页面时丢失的问题，需要修改 App.jsx 中的组件渲染方式：

```jsx
// 修改前 (条件渲染 - 会导致组件卸载)
{currentPage === 'file-compressor' && <FileCompressor />}

// 修改后 (始终挂载，使用 display 控制可见性)
<div style={{ display: currentPage === 'file-compressor' ? 'flex' : 'none', height: '100%' }} className="flex-col">
  <FileCompressor pendingFiles={pendingFiles} onClearPending={() => setPendingFiles([])} />
</div>

// 同样修改 VideoDownloader
<div style={{ display: currentPage === 'video-downloader' ? 'flex' : 'none', height: '100%' }} className="flex-col">
  <VideoDownloader pendingUrl={pendingUrl} onClearPendingUrl={() => setPendingUrl('')} />
</div>
```

这样可以确保：
1. 组件在页面切换时不会被卸载
2. 所有状态（包括正在进行的任务）都会被保留
3. IPC 事件监听器保持活跃
4. 用户返回页面时可以看到任务的最新状态
