# Requirements Document

## Introduction

抖音视频下载功能，支持从抖音平台下载视频和音频。核心目标是稳定可靠地获取视频URL并完成下载，元数据获取为次要目标。

## Glossary

- **Douyin_Extractor**: 抖音视频信息提取模块
- **Video_URL**: 可直接下载的视频地址
- **Short_URL**: v.douyin.com 短链接
- **Video_ID**: 抖音视频唯一标识符

## Requirements

### Requirement 1: 短链接解析

**User Story:** 作为用户，我想粘贴抖音分享的短链接，系统能自动解析为完整URL。

#### Acceptance Criteria

1. WHEN 用户输入 v.douyin.com 短链接 THEN THE Douyin_Extractor SHALL 解析重定向获取完整URL
2. WHEN 用户输入完整 douyin.com URL THEN THE Douyin_Extractor SHALL 直接使用该URL
3. WHEN 短链接解析超时(5秒) THEN THE Douyin_Extractor SHALL 使用原始URL继续处理

### Requirement 2: 视频ID提取

**User Story:** 作为系统，我需要从URL中提取视频ID用于后续处理。

#### Acceptance Criteria

1. THE Douyin_Extractor SHALL 从 /video/ID 格式URL中提取视频ID
2. THE Douyin_Extractor SHALL 从 modal_id=ID 参数中提取视频ID
3. WHEN 无法提取视频ID THEN THE Douyin_Extractor SHALL 继续处理（ID为可选）

### Requirement 3: 视频URL获取

**User Story:** 作为用户，我想获取可下载的视频地址。

#### Acceptance Criteria

1. THE Douyin_Extractor SHALL 通过网络请求拦截捕获视频URL
2. WHEN 捕获到视频URL THEN THE Douyin_Extractor SHALL 处理URL（去水印、转H264）
3. WHEN 25秒内未获取到视频URL THEN THE Douyin_Extractor SHALL 返回错误
4. THE Douyin_Extractor SHALL 在后台静默运行，不显示任何窗口

### Requirement 4: 视频下载

**User Story:** 作为用户，我想下载抖音视频到本地。

#### Acceptance Criteria

1. WHEN 用户点击下载 THEN THE System SHALL 使用获取的视频URL下载文件
2. THE System SHALL 支持MP4格式视频下载
3. THE System SHALL 在下载时携带必要的请求头(Cookie, Referer, User-Agent)

### Requirement 5: 音频提取

**User Story:** 作为用户，我想只下载视频的音频部分。

#### Acceptance Criteria

1. WHEN 用户选择"仅音频" THEN THE System SHALL 提取视频中的音频
2. THE System SHALL 支持M4A格式音频输出

### Requirement 6: 错误处理

**User Story:** 作为用户，当下载失败时我想看到清晰的错误提示。

#### Acceptance Criteria

1. WHEN 视频URL获取失败 THEN THE System SHALL 显示"无法获取视频地址"
2. WHEN 页面加载失败 THEN THE System SHALL 显示"页面加载失败"
3. WHEN 下载失败 THEN THE System SHALL 显示具体错误原因
