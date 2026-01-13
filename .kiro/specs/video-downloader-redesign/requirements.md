# Requirements Document

## Introduction

重新设计 VideoDownloader 页面，打造一个美观、简约、大气且用户体验优秀的媒体下载界面。参考项目中其他页面（如 AI Audio Transcriber、WatermarkRemover）的设计风格，保持整体 UI 一致性。

## Glossary

- **Video_Downloader**: 视频下载器组件，负责解析和下载网络媒体
- **URL_Input**: URL 输入框组件，用于粘贴媒体链接
- **Media_Card**: 媒体信息卡片，展示解析后的视频/音频信息
- **Download_List**: 下载列表组件，展示当前下载任务
- **Drop_Zone**: 拖放区域，支持拖放 URL 或文件

## Requirements

### Requirement 1: 简约大气的空状态设计

**User Story:** As a user, I want to see a clean and inviting empty state, so that I know how to start using the downloader.

#### Acceptance Criteria

1. WHEN the page loads with no active downloads, THE Video_Downloader SHALL display a centered drop zone with a subtle icon
2. THE Drop_Zone SHALL use a light gray background icon (not solid blue) matching the project's design language
3. THE Drop_Zone SHALL display colorful format tags (YouTube red, Vimeo blue, SoundCloud orange, etc.)
4. WHEN user hovers over the drop zone, THE Video_Downloader SHALL provide subtle visual feedback

### Requirement 2: 优雅的 URL 输入体验

**User Story:** As a user, I want a seamless URL input experience, so that I can quickly paste and parse media links.

#### Acceptance Criteria

1. THE URL_Input SHALL be integrated into the drop zone area for a cohesive design
2. WHEN user pastes a URL, THE Video_Downloader SHALL automatically start parsing
3. WHEN parsing is in progress, THE Video_Downloader SHALL show a subtle loading animation
4. IF parsing fails, THEN THE Video_Downloader SHALL display a friendly error message with suggestions

### Requirement 3: 精美的媒体信息展示

**User Story:** As a user, I want to see media information displayed beautifully, so that I can make informed download decisions.

#### Acceptance Criteria

1. WHEN media is parsed successfully, THE Media_Card SHALL display thumbnail, title, duration, and source
2. THE Media_Card SHALL use a clean card design with subtle shadows and rounded corners
3. THE download buttons SHALL use gradient styling consistent with other pages
4. THE Video_Downloader SHALL display format options (Video, Audio, Subtitles) with distinct visual styles

### Requirement 4: 清晰的下载进度展示

**User Story:** As a user, I want to see download progress clearly, so that I can track my downloads.

#### Acceptance Criteria

1. WHEN downloads are active, THE Download_List SHALL display in a dedicated section below the input area
2. THE Download_List SHALL show file icon, title, progress bar, and status for each download
3. WHEN download completes, THE Video_Downloader SHALL show a success state with "Open Folder" action
4. THE progress bar SHALL use smooth animations and match the primary color scheme

### Requirement 5: 响应式布局和一致性

**User Story:** As a user, I want the interface to be consistent with other pages, so that the app feels cohesive.

#### Acceptance Criteria

1. THE Video_Downloader SHALL use the same header style as other pages (title + subtitle)
2. THE Video_Downloader SHALL use consistent spacing, colors, and typography
3. THE Video_Downloader SHALL support dark mode with appropriate color adjustments
4. THE layout SHALL be responsive and work well at different window sizes

### Requirement 6: 功能特性展示

**User Story:** As a user, I want to understand the downloader's capabilities, so that I can use it effectively.

#### Acceptance Criteria

1. THE Video_Downloader SHALL display feature cards (Secure Transfer, Multi-threaded, Auto-organize) in the empty state
2. THE feature cards SHALL use the same style as other pages (icon + title + description)
3. THE feature cards SHALL be positioned below the drop zone for visual balance
