# Requirements Document: 抖音下载修复与UI重设计

## Introduction

修复抖音视频下载功能的问题（视频预览不可用、元数据不完整、下载失败），并重新设计Media Downloader的UI界面，使其更加大气、简约、美观，符合整体软件风格和用户体验。

## Glossary

- **Douyin_Extractor**: 抖音视频提取模块，负责从抖音页面提取视频URL和元数据
- **VideoInfo**: 视频信息对象，包含URL、标题、作者、封面、时长等
- **Cookie_Dialog**: Cookie输入对话框，用于用户输入平台登录Cookie
- **Download_Card**: 下载项卡片组件，展示下载进度和状态
- **Video_Preview**: 视频预览区域，展示视频封面和播放器

## Requirements

### Requirement 1: 抖音Cookie认证支持

**User Story:** 作为用户，我想要能够输入抖音登录Cookie，以便能够下载需要认证的视频。

#### Acceptance Criteria

1. WHEN 用户点击抖音Cookie设置按钮 THEN 系统 SHALL 显示Cookie输入对话框
2. WHEN 用户输入Cookie并保存 THEN 系统 SHALL 将Cookie存储到localStorage
3. WHEN 提取抖音视频信息 THEN Douyin_Extractor SHALL 使用保存的Cookie进行请求
4. WHEN 下载抖音视频 THEN 下载服务 SHALL 在请求头中包含Cookie
5. IF Cookie无效或过期 THEN 系统 SHALL 提示用户更新Cookie

### Requirement 2: 抖音元数据提取优化

**User Story:** 作为用户，我想要获取完整的抖音视频元数据（标题、作者、时长），以便了解视频信息。

#### Acceptance Criteria

1. WHEN 提取视频信息 THEN Douyin_Extractor SHALL 返回完整的作者名称（非默认值）
2. WHEN 提取视频信息 THEN Douyin_Extractor SHALL 返回视频时长（秒数和格式化字符串）
3. WHEN 提取视频信息 THEN Douyin_Extractor SHALL 返回有效的封面图URL
4. WHEN 元数据提取失败 THEN 系统 SHALL 显示具体的错误原因
5. THE 返回的VideoInfo SHALL 包含extractor字段标识来源平台

### Requirement 3: 抖音下载功能修复

**User Story:** 作为用户，我想要能够成功下载抖音视频和音频，以便离线观看或使用。

#### Acceptance Criteria

1. WHEN 用户点击下载视频 THEN 系统 SHALL 成功下载MP4格式视频文件
2. WHEN 用户点击下载音频 THEN 系统 SHALL 成功提取并下载音频文件
3. WHEN 下载进行中 THEN 系统 SHALL 显示准确的下载进度和速度
4. WHEN 下载完成 THEN 系统 SHALL 显示正确的文件路径和大小
5. IF 下载失败 THEN 系统 SHALL 显示具体的失败原因和建议

### Requirement 4: 视频信息展示区重设计

**User Story:** 作为用户，我想要看到清晰美观的视频信息展示，以便快速了解视频内容。

#### Acceptance Criteria

1. WHEN 视频信息加载完成 THEN Video_Preview SHALL 显示视频封面或播放器
2. WHEN 显示视频信息 THEN 系统 SHALL 展示标题、作者、平台标签、时长
3. WHEN 视频预览不可用 THEN 系统 SHALL 显示封面图和友好提示
4. THE 视频信息区 SHALL 采用卡片式布局，左侧预览右侧信息
5. THE 平台标签 SHALL 使用对应平台的品牌颜色

### Requirement 5: 下载选项区重设计

**User Story:** 作为用户，我想要简洁直观的下载选项，以便快速选择下载类型和格式。

#### Acceptance Criteria

1. WHEN 显示下载选项 THEN 系统 SHALL 提供醒目的视频下载主按钮
2. WHEN 显示下载选项 THEN 系统 SHALL 提供格式选择器（MP4/MKV）
3. WHEN 显示下载选项 THEN 系统 SHALL 提供音频下载按钮和格式选择
4. WHEN 显示下载选项 THEN 系统 SHALL 提供字幕下载选项（如可用）
5. THE 下载按钮 SHALL 使用渐变色和阴影效果，视觉突出

### Requirement 6: 下载列表区重设计

**User Story:** 作为用户，我想要清晰美观的下载列表，以便监控下载进度和管理下载任务。

#### Acceptance Criteria

1. WHEN 有下载任务 THEN Download_Card SHALL 显示缩略图、标题、状态
2. WHEN 下载进行中 THEN Download_Card SHALL 显示进度条、速度、剩余时间
3. WHEN 下载完成 THEN Download_Card SHALL 显示完成状态和打开位置按钮
4. WHEN 下载失败 THEN Download_Card SHALL 显示失败状态和错误信息
5. THE Download_Card SHALL 提供暂停、继续、取消操作按钮

### Requirement 7: 整体UI风格统一

**User Story:** 作为用户，我想要Media Downloader的UI风格与软件整体一致，以获得统一的视觉体验。

#### Acceptance Criteria

1. THE 页面 SHALL 使用软件统一的蓝色主题色（#2196F3）
2. THE 卡片组件 SHALL 使用圆角边框和轻微阴影
3. THE 按钮 SHALL 使用渐变色背景和hover效果
4. THE 布局 SHALL 保持适当的间距和视觉层次
5. THE 组件 SHALL 支持深色模式

### Requirement 8: 错误处理和用户反馈

**User Story:** 作为用户，我想要在操作失败时获得清晰的错误提示和解决建议。

#### Acceptance Criteria

1. WHEN 需要Cookie认证 THEN 系统 SHALL 提示用户设置Cookie
2. WHEN 网络请求失败 THEN 系统 SHALL 显示网络错误提示
3. WHEN 视频不存在 THEN 系统 SHALL 显示视频已删除提示
4. WHEN 格式不支持 THEN 系统 SHALL 显示格式不支持提示
5. THE 错误提示 SHALL 包含可操作的解决建议

