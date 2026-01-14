# Requirements Document

## Introduction

本功能旨在修复视频下载器中的元数据显示问题。当前存在以下问题：
1. 抖音视频的作者信息显示为 "Unknown"
2. 视频格式显示为 "N/A"
3. 视频时长等元数据缺失
4. 下载列表中的缩略图无法正确显示

## Glossary

- **Video_Downloader**: 视频下载器前端组件，负责显示视频信息和下载列表
- **YtDlp_Service**: 后端服务，负责提取视频元数据和执行下载
- **Douyin_Extractor**: 抖音视频专用提取器，使用 BrowserWindow 提取视频信息
- **Metadata**: 视频元数据，包括标题、作者、时长、格式、缩略图等
- **Download_Item**: 下载列表中的单个下载项目
- **Thumbnail_Proxy**: 缩略图代理服务，用于绑定 Referer 头获取受保护的图片

## Requirements

### Requirement 1: 抖音作者信息提取

**User Story:** As a user, I want to see the correct author name when downloading Douyin videos, so that I can identify the content creator.

#### Acceptance Criteria

1. WHEN the Douyin_Extractor extracts video metadata, THE Douyin_Extractor SHALL attempt multiple DOM selectors to find the author name
2. WHEN the primary author selector fails, THE Douyin_Extractor SHALL use fallback selectors including meta tags and JSON-LD data
3. WHEN author information is found, THE Video_Downloader SHALL display the author name instead of "Unknown"
4. IF no author information can be extracted, THEN THE Video_Downloader SHALL display "Unknown" as fallback

### Requirement 2: 视频格式信息显示

**User Story:** As a user, I want to see the video format (MP4, WebM, etc.) in the video info panel, so that I know what format I'm downloading.

#### Acceptance Criteria

1. WHEN video metadata is retrieved, THE YtDlp_Service SHALL extract and return the video format extension
2. WHEN the Video_Downloader displays video info, THE Video_Downloader SHALL show the format badge (e.g., "MP4")
3. IF format information is unavailable, THEN THE Video_Downloader SHALL display the selected output format as fallback

### Requirement 3: 视频时长信息显示

**User Story:** As a user, I want to see the video duration, so that I can estimate download time and file size.

#### Acceptance Criteria

1. WHEN the Douyin_Extractor extracts video metadata, THE Douyin_Extractor SHALL attempt to extract video duration from the page
2. WHEN duration is available, THE Video_Downloader SHALL display it in "MM:SS" or "HH:MM:SS" format
3. IF duration cannot be extracted, THEN THE Video_Downloader SHALL hide the duration display instead of showing "N/A"

### Requirement 4: 下载列表缩略图显示

**User Story:** As a user, I want to see video thumbnails in the download list, so that I can easily identify my downloads.

#### Acceptance Criteria

1. WHEN a download is added to the list, THE Video_Downloader SHALL store the proxied thumbnail URL with the download item
2. WHEN the download list renders, THE Download_Item SHALL display the thumbnail image
3. WHEN the thumbnail requires proxy (Douyin/Bilibili), THE Video_Downloader SHALL use the Thumbnail_Proxy to fetch the image
4. IF thumbnail loading fails, THEN THE Download_Item SHALL display a video icon placeholder

### Requirement 5: 抖音缩略图提取增强

**User Story:** As a user, I want to see video thumbnails for Douyin videos, so that I can preview the content before downloading.

#### Acceptance Criteria

1. WHEN the Douyin_Extractor extracts video metadata, THE Douyin_Extractor SHALL attempt to extract thumbnail from video poster, og:image, or twitter:image meta tags
2. WHEN thumbnail URL is extracted, THE Douyin_Extractor SHALL return it with the video metadata
3. WHEN thumbnail URL starts with "//", THE Douyin_Extractor SHALL prepend "https:" to make it a valid URL

### Requirement 6: 元数据传递到下载项

**User Story:** As a user, I want all video metadata to be preserved in my download list, so that I can see complete information about each download.

#### Acceptance Criteria

1. WHEN a download is initiated, THE Video_Downloader SHALL pass all available metadata (author, format, duration, thumbnail) to the download item
2. WHEN the download completes, THE Download_Item SHALL retain all metadata for display
3. WHEN saving to history, THE Video_Downloader SHALL include all metadata fields
