# Requirements Document

## Introduction

This specification covers bug fixes and feature enhancements for the Media Downloader module in ProFlow Studio. The module allows users to download videos and audio from popular platforms including YouTube, Bilibili, and Douyin (TikTok China).

## Glossary

- **Media_Downloader**: The video/audio download module in ProFlow Studio
- **yt-dlp**: The backend tool used for extracting and downloading media
- **YouTube**: Google's video sharing platform (youtube.com)
- **Bilibili**: Chinese video sharing platform (bilibili.com)
- **Douyin**: Chinese short video platform (douyin.com), also known as TikTok in China
- **Subtitle**: Text captions for video content
- **Progress_Bar**: Visual indicator showing download completion percentage
- **Quality_Selector**: UI component for choosing video resolution
- **Download_History**: Record of previously completed downloads

## Requirements

### Requirement 1: Multi-Platform Support

**User Story:** As a user, I want to download videos from YouTube, Bilibili, and Douyin, so that I can save content from my favorite platforms.

#### Acceptance Criteria

1. WHEN a YouTube URL is entered, THE Media_Downloader SHALL parse and display video information
2. WHEN a Bilibili URL is entered, THE Media_Downloader SHALL parse and display video information including BV/AV number
3. WHEN a Douyin URL is entered, THE Media_Downloader SHALL parse and display video information
4. THE Media_Downloader SHALL auto-detect the platform from the URL
5. THE Media_Downloader SHALL display a platform indicator icon (YouTube/Bilibili/Douyin) after parsing
6. IF the URL is not from a supported platform, THEN THE Media_Downloader SHALL display an error message

### Requirement 2: Fix Subtitle Parsing

**User Story:** As a user, I want to download subtitles from videos, so that I can have captions for offline viewing.

#### Acceptance Criteria

1. WHEN a video with subtitles is parsed, THE Media_Downloader SHALL display all available subtitle languages in the subtitle dialog
2. WHEN a video has auto-generated captions, THE Media_Downloader SHALL include them with an "[Auto]" label
3. WHEN the user selects a subtitle language, THE Media_Downloader SHALL download the subtitle file to the download directory
4. IF no subtitles are available, THEN THE Media_Downloader SHALL display "No subtitles available" message
5. FOR Bilibili videos, THE Media_Downloader SHALL support downloading danmaku (bullet comments) as subtitles

### Requirement 3: Fix Download Progress Display

**User Story:** As a user, I want to see real-time download progress, so that I know how much time remains.

#### Acceptance Criteria

1. WHEN a download starts, THE Media_Downloader SHALL display progress percentage from 0% to 100%
2. WHILE downloading, THE Media_Downloader SHALL update the progress bar in real-time
3. WHEN progress is received from yt-dlp, THE Media_Downloader SHALL parse and display the percentage correctly
4. THE Media_Downloader SHALL display download speed in MB/s format
5. THE Media_Downloader SHALL display estimated time remaining (ETA)

### Requirement 4: Fix File Size Display

**User Story:** As a user, I want to see the file size before downloading, so that I can manage my storage.

#### Acceptance Criteria

1. WHEN a video is parsed, THE Media_Downloader SHALL display the file size in MB or GB format
2. IF file size is not available from the primary source, THEN THE Media_Downloader SHALL attempt to get it from format metadata
3. IF file size cannot be determined, THEN THE Media_Downloader SHALL hide the size field instead of showing "Unknown"

### Requirement 5: Quality Selection

**User Story:** As a user, I want to choose video quality before downloading, so that I can balance file size and quality.

#### Acceptance Criteria

1. WHEN a video is parsed, THE Media_Downloader SHALL display available quality options (e.g., 360p, 480p, 720p, 1080p, 4K)
2. WHEN the user selects a quality, THE Media_Downloader SHALL download the video in that resolution
3. THE Media_Downloader SHALL show file size estimate for each quality option
4. THE Media_Downloader SHALL default to the highest available quality
5. FOR Bilibili videos, THE Media_Downloader SHALL support quality levels (流畅/清晰/高清/超清/4K)

### Requirement 6: Format Selection

**User Story:** As a user, I want to choose the output format, so that I can ensure compatibility with my devices.

#### Acceptance Criteria

1. WHEN downloading video, THE Media_Downloader SHALL offer format options (MP4, WebM, MKV)
2. WHEN downloading audio, THE Media_Downloader SHALL offer format options (MP3, M4A, WAV)
3. THE Media_Downloader SHALL default to MP4 for video and M4A for audio

### Requirement 7: Download History Persistence

**User Story:** As a user, I want to see my download history, so that I can find previously downloaded files.

#### Acceptance Criteria

1. WHEN a download completes successfully, THE Media_Downloader SHALL save it to history
2. THE Media_Downloader SHALL persist history across application restarts
3. THE Media_Downloader SHALL display history with thumbnail, title, platform, date, and file location
4. WHEN the user clicks a history item, THE Media_Downloader SHALL open the file location
5. THE Media_Downloader SHALL allow clearing history

### Requirement 8: Batch Download Support

**User Story:** As a user, I want to download multiple videos at once, so that I can save time.

#### Acceptance Criteria

1. WHEN a playlist URL is entered (YouTube playlist, Bilibili collection), THE Media_Downloader SHALL detect and list all videos
2. THE Media_Downloader SHALL allow selecting which videos to download
3. THE Media_Downloader SHALL show progress for each video in the batch
4. THE Media_Downloader SHALL allow canceling individual items in a batch

### Requirement 9: Platform-Specific Features

**User Story:** As a user, I want platform-specific features to work correctly, so that I get the best experience for each platform.

#### Acceptance Criteria

1. FOR YouTube videos, THE Media_Downloader SHALL support downloading chapters as separate files
2. FOR Bilibili videos, THE Media_Downloader SHALL support multi-part videos (分P)
3. FOR Bilibili videos, THE Media_Downloader SHALL handle login cookies for higher quality downloads
4. FOR Douyin videos, THE Media_Downloader SHALL remove watermarks when possible
5. FOR Douyin videos, THE Media_Downloader SHALL support downloading user profile videos
