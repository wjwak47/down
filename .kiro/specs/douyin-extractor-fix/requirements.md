# Requirements Document: 抖音提取器修复

## Introduction

修复抖音视频提取器，解决2026年抖音网站结构变化导致的提取失败问题。当前问题包括：视频URL提取失败、元数据（标题、作者、时长）获取不完整、回退到yt-dlp后也失败。

## Glossary

- **Douyin_Extractor**: 抖音视频提取模块，负责从抖音页面提取视频URL和元数据
- **BrowserWindow**: Electron隐藏浏览器窗口，用于加载抖音页面
- **Mobile_UA**: 移动端User-Agent，用于获取单个MP4文件而非分离流
- **VideoInfo**: 视频信息对象，包含URL、标题、作者、封面等

## Requirements

### Requirement 1: 视频URL提取

**User Story:** 作为用户，我想要可靠地提取抖音视频的下载URL，以便能够下载视频。

#### Acceptance Criteria

1. WHEN 用户输入抖音短链接(v.douyin.com) THEN Douyin_Extractor SHALL 解析重定向获取完整URL
2. WHEN 用户输入抖音视频页URL THEN Douyin_Extractor SHALL 通过网络拦截获取视频URL
3. WHEN 网络拦截未能获取视频URL THEN Douyin_Extractor SHALL 尝试从页面DOM提取
4. WHEN DOM提取失败 THEN Douyin_Extractor SHALL 尝试从页面HTML中正则匹配
5. IF 所有方法都失败 THEN Douyin_Extractor SHALL 返回明确的错误信息

### Requirement 2: 元数据提取

**User Story:** 作为用户，我想要获取视频的完整元数据（标题、作者、时长、封面），以便了解视频信息。

#### Acceptance Criteria

1. WHEN 提取视频信息 THEN Douyin_Extractor SHALL 尝试从页面title标签提取标题
2. WHEN 页面title不可用 THEN Douyin_Extractor SHALL 从meta标签或JSON-LD提取标题
3. WHEN 提取视频信息 THEN Douyin_Extractor SHALL 从多个CSS选择器尝试提取作者名
4. WHEN 提取视频信息 THEN Douyin_Extractor SHALL 从video标签poster或meta标签提取封面
5. WHEN 提取视频信息 THEN Douyin_Extractor SHALL 尝试从页面脚本数据提取时长

### Requirement 3: 抖音API数据提取

**User Story:** 作为用户，我想要通过抖音内部API获取更完整的视频信息。

#### Acceptance Criteria

1. WHEN 页面加载完成 THEN Douyin_Extractor SHALL 尝试从window.__RENDER_DATA__提取数据
2. WHEN __RENDER_DATA__不可用 THEN Douyin_Extractor SHALL 尝试从script标签中的JSON提取
3. WHEN 找到API数据 THEN Douyin_Extractor SHALL 解析出视频URL、标题、作者、时长
4. IF API数据解析失败 THEN Douyin_Extractor SHALL 回退到DOM提取方式

### Requirement 4: 错误处理和重试

**User Story:** 作为用户，我想要在提取失败时有清晰的错误提示和自动重试机制。

#### Acceptance Criteria

1. WHEN 页面加载超时(20秒) THEN Douyin_Extractor SHALL 返回超时错误
2. WHEN 页面加载失败 THEN Douyin_Extractor SHALL 返回加载失败错误
3. WHEN 视频URL提取失败 THEN Douyin_Extractor SHALL 提供具体失败原因
4. WHEN 首次提取失败 THEN Douyin_Extractor SHALL 自动重试一次（使用不同策略）

### Requirement 5: 请求头和Cookie处理

**User Story:** 作为用户，我想要提取器正确处理请求头，以便视频能够正常下载。

#### Acceptance Criteria

1. WHEN 提取成功 THEN Douyin_Extractor SHALL 返回包含User-Agent的headers
2. WHEN 提取成功 THEN Douyin_Extractor SHALL 返回包含Referer的headers
3. WHEN 提取成功 THEN Douyin_Extractor SHALL 返回从页面获取的Cookie
4. THE headers对象 SHALL 包含所有下载所需的认证信息

### Requirement 6: 音频下载支持

**User Story:** 作为用户，我想要能够只下载抖音视频的音频部分，以便提取背景音乐或语音内容。

#### Acceptance Criteria

1. WHEN 用户选择仅下载音频 THEN 下载服务 SHALL 使用ffmpeg从视频中提取音频
2. WHEN 提取音频 THEN 下载服务 SHALL 支持mp3、m4a、wav等格式输出
3. WHEN 抖音视频包含音乐信息 THEN Douyin_Extractor SHALL 尝试提取音乐标题和作者
4. THE 音频提取 SHALL 保持原始音质不进行有损转码（除非用户指定格式）

### Requirement 7: 视频格式和质量

**User Story:** 作为用户，我想要获取最高质量的视频，并且是兼容性好的格式。

#### Acceptance Criteria

1. WHEN 使用Mobile UA THEN Douyin_Extractor SHALL 获取单个MP4文件（视频+音频合并）
2. WHEN 视频URL包含H.265编码标记 THEN processVideoUrl SHALL 转换为H.264请求
3. WHEN 视频URL包含水印标记 THEN processVideoUrl SHALL 请求无水印版本
4. THE 返回的视频URL SHALL 是可直接下载的完整视频文件（非分离流）
