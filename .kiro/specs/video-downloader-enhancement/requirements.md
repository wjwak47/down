# Requirements Document

## Introduction

本规格文档涵盖两个核心优化目标：
1. **视频下载区 UI/UX 全面优化** - 作为顶级 UI 设计师、产品经理和程序员的视角，对视频下载模块进行深度优化
2. **密码破解任务持久化修复** - 解决切换页面时任务状态丢失的问题

## 产品分析：当前痛点

通过代码分析，我发现以下核心问题：

### UI/UX 问题
1. **空状态设计单调** - 缺少引导性设计，用户不知道支持哪些平台
2. **下载列表功能单一** - 只有基础的暂停/继续/取消，缺少批量操作
3. **没有下载历史** - 下载完成后无法追溯
4. **缺少质量选择** - 只有"最佳视频"和"仅音频"两个选项
5. **没有下载速度显示** - 用户无法了解下载进度详情
6. **缺少平台特定功能** - 如 B站需要 Cookie、YouTube 需要代理等

### 功能缺失
1. **无播放列表支持** - 无法批量下载整个播放列表
2. **无格式选择器** - 无法选择具体的视频/音频格式
3. **无字幕语言选择** - 字幕下载功能不够完善
4. **无下载限速** - 可能占满带宽影响其他应用
5. **无定时下载** - 无法设置在特定时间下载
6. **无下载完成后操作** - 如自动打开文件夹、发送通知等

### 技术问题（密码破解相关）
1. **组件卸载导致状态丢失** - FileCompressor 使用条件渲染，切换页面时组件被卸载
2. **后台任务无通知** - 任务完成时用户可能在其他页面

## Glossary

- **Video_Downloader**: 视频下载器页面组件
- **Download_Manager**: 下载管理器，负责管理所有下载任务
- **Task_Persistence**: 任务持久化机制，确保页面切换时任务状态不丢失
- **Media_Card**: 媒体信息卡片组件
- **Download_Queue**: 下载队列，支持多任务管理
- **Batch_Download**: 批量下载功能
- **History_Manager**: 下载历史管理器
- **Quality_Selector**: 质量选择器组件
- **Format_Selector**: 格式选择器组件
- **Platform_Detector**: 平台检测器，识别视频来源平台

---

## Part 1: 视频下载区 UI/UX 优化

### Requirement 1: 下载队列管理系统

**User Story:** As a user, I want to manage multiple downloads in a queue, so that I can download multiple videos efficiently without waiting for each one to complete.

#### Acceptance Criteria

1. WHEN user parses multiple URLs, THE Download_Manager SHALL add them to a download queue
2. THE Download_Queue SHALL display queue position, estimated time, and priority for each item
3. WHEN user drags a queue item, THE Download_Manager SHALL allow reordering of download priority
4. THE Download_Manager SHALL support configurable concurrent download limit (1-5 simultaneous downloads)
5. WHEN a download completes, THE Download_Manager SHALL automatically start the next queued item

### Requirement 2: 批量下载与播放列表支持

**User Story:** As a user, I want to download entire playlists or channels, so that I can batch download content efficiently.

#### Acceptance Criteria

1. WHEN user pastes a playlist URL, THE Video_Downloader SHALL detect and display playlist information
2. THE Video_Downloader SHALL allow selecting specific videos from a playlist to download
3. THE Video_Downloader SHALL display "Select All" and "Deselect All" options for playlist items
4. WHEN downloading a playlist, THE Video_Downloader SHALL show overall progress and individual item progress
5. THE Video_Downloader SHALL support downloading from YouTube channels, Bilibili collections, and similar sources

### Requirement 3: 高级格式与质量选择器

**User Story:** As a user, I want granular control over download format and quality, so that I can optimize for my specific needs.

#### Acceptance Criteria

1. WHEN media is parsed, THE Video_Downloader SHALL display all available quality options (4K, 1080p, 720p, etc.)
2. THE Video_Downloader SHALL show estimated file size for each quality option
3. THE Video_Downloader SHALL support format selection (MP4, MKV, WebM, MP3, AAC, etc.)
4. THE Video_Downloader SHALL remember user's preferred quality and format settings
5. WHEN user selects "Audio Only", THE Video_Downloader SHALL show audio-specific format options (MP3, AAC, FLAC, WAV)

### Requirement 4: 下载历史与收藏管理

**User Story:** As a user, I want to view my download history and re-download items, so that I can easily access previously downloaded content.

#### Acceptance Criteria

1. THE History_Manager SHALL maintain a searchable list of all downloaded items
2. WHEN user clicks a history item, THE Video_Downloader SHALL allow re-downloading or opening the file location
3. THE History_Manager SHALL display download date, file size, and source platform for each item
4. THE Video_Downloader SHALL support "favorite" marking for frequently accessed sources
5. THE History_Manager SHALL support clearing history (all or selected items)

### Requirement 5: 智能剪贴板监听

**User Story:** As a user, I want the app to automatically detect video URLs in my clipboard, so that I can quickly start downloads.

#### Acceptance Criteria

1. WHEN user copies a supported video URL, THE Video_Downloader SHALL show a notification offering to parse it
2. THE clipboard monitoring SHALL be toggleable in settings
3. WHEN notification is clicked, THE Video_Downloader SHALL automatically navigate and start parsing
4. THE Video_Downloader SHALL not show duplicate notifications for the same URL

### Requirement 6: 下载速度与网络优化显示

**User Story:** As a user, I want to see detailed download statistics, so that I can monitor performance and troubleshoot issues.

#### Acceptance Criteria

1. THE Download_Manager SHALL display real-time download speed (MB/s)
2. THE Download_Manager SHALL show estimated time remaining for each download
3. THE Download_Manager SHALL display total downloaded size and remaining size
4. WHEN download speed drops significantly, THE Video_Downloader SHALL show a warning indicator
5. THE Video_Downloader SHALL support speed limiting configuration

### Requirement 7: 增强的错误处理与重试机制

**User Story:** As a user, I want robust error handling and automatic retry, so that downloads complete successfully even with network issues.

#### Acceptance Criteria

1. WHEN a download fails, THE Download_Manager SHALL automatically retry up to 3 times
2. THE Video_Downloader SHALL display specific error messages (network error, geo-blocked, age-restricted, etc.)
3. WHEN a video is geo-blocked, THE Video_Downloader SHALL suggest proxy/VPN solutions
4. THE Download_Manager SHALL support manual retry for failed downloads
5. THE Video_Downloader SHALL support resuming interrupted downloads

### Requirement 8: UI 视觉优化

**User Story:** As a user, I want a beautiful and intuitive interface, so that the download experience is pleasant and efficient.

#### Acceptance Criteria

1. THE Video_Downloader SHALL use consistent styling with other app pages (gradient buttons, rounded corners, shadows)
2. THE Media_Card SHALL display high-quality thumbnails with hover preview
3. THE progress bars SHALL use smooth animations and gradient colors
4. THE Video_Downloader SHALL support both light and dark mode with appropriate color schemes
5. THE empty state SHALL display helpful tips and supported platforms with colorful icons
6. THE Video_Downloader SHALL use micro-animations for state transitions (loading, success, error)

### Requirement 9: 快捷操作与键盘支持

**User Story:** As a user, I want keyboard shortcuts and quick actions, so that I can work more efficiently.

#### Acceptance Criteria

1. WHEN user presses Ctrl+V in the app, THE Video_Downloader SHALL automatically paste and parse clipboard URL
2. THE Video_Downloader SHALL support Ctrl+Enter to start download after parsing
3. THE Download_Manager SHALL support Delete key to cancel selected download
4. THE Video_Downloader SHALL display keyboard shortcut hints in tooltips

### Requirement 10: 平台特定功能支持

**User Story:** As a user, I want platform-specific features, so that I can download from various platforms without issues.

#### Acceptance Criteria

1. WHEN user pastes a Bilibili URL, THE Video_Downloader SHALL prompt for Cookie if needed for high quality
2. WHEN user pastes a YouTube URL, THE Video_Downloader SHALL support age-restricted video handling
3. THE Video_Downloader SHALL display platform-specific icons and colors (YouTube red, Bilibili pink, etc.)
4. WHEN a platform requires login, THE Video_Downloader SHALL guide user to configure credentials
5. THE Platform_Detector SHALL identify and display the source platform name and icon

### Requirement 11: 下载后自动操作

**User Story:** As a user, I want automatic actions after download completes, so that I can streamline my workflow.

#### Acceptance Criteria

1. THE Video_Downloader SHALL support "Open folder after download" option
2. THE Video_Downloader SHALL support desktop notification on download complete
3. THE Video_Downloader SHALL support auto-convert to MP3 after video download (optional)
4. THE Video_Downloader SHALL remember user's post-download preferences

### Requirement 12: 视频预览与信息增强

**User Story:** As a user, I want to preview video and see detailed information, so that I can make informed download decisions.

#### Acceptance Criteria

1. WHEN media is parsed, THE Media_Card SHALL display: thumbnail, title, duration, view count, upload date, channel name
2. THE Media_Card SHALL support thumbnail hover to show larger preview
3. THE Video_Downloader SHALL display video description (expandable)
4. THE Video_Downloader SHALL show available subtitle languages before download
5. WHEN video has chapters, THE Video_Downloader SHALL display chapter list with timestamps

### Requirement 13: 下载路径管理

**User Story:** As a user, I want flexible download path management, so that I can organize my downloads efficiently.

#### Acceptance Criteria

1. THE Video_Downloader SHALL allow setting default download folder
2. THE Video_Downloader SHALL support "Ask where to save" option per download
3. THE Video_Downloader SHALL support folder templates (e.g., by platform, by date, by channel)
4. THE Video_Downloader SHALL display remaining disk space in download folder
5. IF disk space is low, THEN THE Video_Downloader SHALL warn user before starting download

### Requirement 14: 多语言字幕增强

**User Story:** As a user, I want comprehensive subtitle options, so that I can get subtitles in my preferred language.

#### Acceptance Criteria

1. THE Video_Downloader SHALL display all available subtitle languages
2. THE Video_Downloader SHALL support downloading multiple subtitle languages at once
3. THE Video_Downloader SHALL support auto-generated vs manual subtitle distinction
4. THE Video_Downloader SHALL support embedding subtitles into video file (optional)
5. THE Video_Downloader SHALL support SRT, VTT, ASS subtitle format selection

---

## Part 2: 密码破解任务持久化修复

### Requirement 10: 页面切换时任务状态保持

**User Story:** As a user, I want my password cracking task to continue running when I switch to other pages, so that I don't lose progress.

#### Acceptance Criteria

1. WHEN user switches away from File Compressor page during a crack operation, THE Task_Persistence SHALL maintain the task state
2. WHEN user returns to File Compressor page, THE Video_Downloader SHALL restore the crack progress display
3. THE Task_Persistence SHALL preserve: current attempt count, speed, current password being tried, and elapsed time
4. IF a crack completes while on another page, THEN THE system SHALL show a notification with the result
5. THE File Compressor component SHALL remain mounted (hidden) during crack operations to preserve state

### Requirement 11: 后台任务通知系统

**User Story:** As a user, I want to be notified of task completion regardless of which page I'm on, so that I don't miss important results.

#### Acceptance Criteria

1. WHEN a background task completes, THE system SHALL display a toast notification
2. THE notification SHALL include task type, result (success/failure), and action button
3. WHEN user clicks the notification, THE system SHALL navigate to the relevant page
4. THE notification SHALL support "Dismiss" and "View Details" actions

### Requirement 12: 全局任务状态指示器

**User Story:** As a user, I want to see active background tasks from any page, so that I know what's running.

#### Acceptance Criteria

1. THE Sidebar SHALL display a badge indicator when background tasks are running
2. THE badge SHALL show the count of active tasks
3. WHEN user hovers over the badge, THE system SHALL show a tooltip with task summaries
4. THE indicator SHALL use different colors for different task types (download: blue, crack: orange)

---

## 技术实现建议

### 架构改进

1. **全局状态管理**: 使用 React Context 或状态管理库管理跨页面任务状态
2. **组件持久化**: 对有长时间运行任务的组件使用 `display: none` 而非条件渲染
3. **事件总线**: 实现全局事件系统用于跨组件通信

### UI 组件库

1. **下载队列组件**: 可拖拽排序的队列列表
2. **进度环组件**: 圆形进度指示器用于紧凑显示
3. **通知组件**: 全局 Toast 通知系统
4. **格式选择器**: 下拉式格式/质量选择器

### 性能优化

1. **虚拟列表**: 对长列表使用虚拟滚动
2. **缩略图懒加载**: 延迟加载非可视区域的缩略图
3. **状态持久化**: 使用 localStorage 保存用户偏好设置
