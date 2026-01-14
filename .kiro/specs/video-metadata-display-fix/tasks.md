# Implementation Plan: Video Metadata Display Fix

## Overview

本实现计划将修复视频下载器中的元数据显示问题，按照增量方式实现，确保每个步骤都可验证。

## Tasks

- [x] 1. 增强抖音作者信息提取
  - [x] 1.1 扩展 Douyin_Extractor 的作者选择器列表
    - 在 `src/main/services/yt-dlp.js` 的 `extractDouyinNative` 方法中添加更多 DOM 选择器
    - 添加 meta 标签和 JSON-LD 数据作为 fallback
    - _Requirements: 1.1, 1.2_
  - [x] 1.2 添加作者提取的调试日志
    - 记录尝试的选择器和提取结果
    - _Requirements: 1.1_

- [x] 2. 添加抖音视频时长提取
  - [x] 2.1 在 Douyin_Extractor 中添加时长提取逻辑
    - 从 video 元素的 duration 属性获取
    - 从页面 DOM 中查找时长显示元素
    - _Requirements: 3.1_
  - [x] 2.2 格式化时长为可读字符串
    - 确保返回 duration_string 字段
    - _Requirements: 3.2_
  - [x] 2.3 编写 formatDuration 属性测试
    - **Property 2: Duration Formatting**
    - **Validates: Requirements 3.2**

- [x] 3. 改进缩略图提取和代理
  - [x] 3.1 增强 Douyin_Extractor 缩略图提取优先级
    - 按优先级尝试: video poster > og:image > twitter:image > link[rel="image_src"]
    - 规范化 "//" 开头的 URL
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 3.2 编写 URL 规范化属性测试
    - **Property 3: URL Normalization**
    - **Validates: Requirements 5.3**

- [x] 4. 修复下载列表元数据传递
  - [x] 4.1 修改 handleDownload 函数传递完整元数据
    - 在 `src/renderer/src/pages/VideoDownloader.jsx` 中修改
    - 传递 thumbnail (使用 thumbnailProxyUrl)、uploader、duration、format
    - _Requirements: 4.1, 6.1_
  - [x] 4.2 修改 handleBatchDownload 函数传递元数据
    - 确保批量下载也传递完整元数据
    - _Requirements: 6.1_

- [x] 5. 更新下载列表 UI 显示
  - [x] 5.1 在下载项中显示缩略图
    - 使用代理后的缩略图 URL
    - 添加加载失败时的占位符
    - _Requirements: 4.2, 4.4_
  - [x] 5.2 在下载项中显示作者和格式信息
    - 添加作者名称显示
    - 添加格式标签显示
    - _Requirements: 1.3, 2.2_

- [x] 6. Checkpoint - 验证基本功能
  - 测试抖音视频解析，验证作者、时长、缩略图正确显示
  - 测试下载列表显示完整元数据
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. 修复历史记录元数据保存
  - [x] 7.1 更新 saveToHistory 函数保存完整元数据
    - 添加 uploader、duration、format 字段
    - _Requirements: 6.3_
  - [x] 7.2 更新历史记录列表显示
    - 显示作者和格式信息
    - _Requirements: 6.3_

- [x] 8. 添加代理域名检测优化
  - [x] 8.1 提取代理域名检测为独立函数
    - 创建 `needsThumbnailProxy(url, platform)` 函数
    - _Requirements: 4.3_
  - [x] 8.2 编写代理域名检测属性测试
    - **Property 4: Proxy Domain Detection**
    - **Validates: Requirements 4.3**

- [x] 9. Final Checkpoint - 完整功能验证
  - 测试完整的抖音视频下载流程
  - 验证所有元数据在各个阶段正确显示
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- 所有测试任务都是必需的，确保完整的测试覆盖
- 优先修复核心显示问题（作者、缩略图）
- 每个 checkpoint 都应该验证当前功能正常工作
