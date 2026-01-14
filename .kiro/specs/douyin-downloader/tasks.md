# Implementation Plan: 抖音视频下载器

## Overview

重写抖音视频下载模块，实现稳定可靠的视频URL获取和下载功能。

## Tasks

- [x] 1. 重构 douyin-extractor.js 核心模块
  - [x] 1.1 实现 extractVideoId 函数
    - 支持 /video/ID 格式
    - 支持 modal_id=ID 参数格式
    - 支持 note_id=ID 参数格式
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 1.2 实现 resolveShortUrl 函数
    - HTTP重定向解析
    - 5秒超时处理
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.3 实现 processVideoUrl 函数
    - playwm 替换为 play（去水印）
    - _265 替换为 _264（转H264）
    - hevc 替换为 h264
    - _Requirements: 3.2_
  - [x] 1.4 编写属性测试 - 视频ID提取
    - **Property 2: 视频ID提取正确性**
    - **Validates: Requirements 2.1, 2.2**
  - [x] 1.5 编写属性测试 - URL处理
    - **Property 3: 视频URL处理正确性**
    - **Validates: Requirements 3.2**

- [x] 2. 实现视频提取主函数
  - [x] 2.1 实现 extractDouyinVideo 函数
    - 创建隐藏BrowserWindow
    - 设置User-Agent
    - 网络请求拦截
    - _Requirements: 3.1, 3.4_
  - [x] 2.2 实现网络拦截逻辑
    - 拦截视频URL（.mp4, mime_type=video, douyinvod.com）
    - 拦截封面图URL（douyinpic.com）
    - _Requirements: 3.1_
  - [x] 2.3 实现超时和错误处理
    - 25秒超时
    - 页面加载失败处理
    - _Requirements: 3.3, 6.1, 6.2_
  - [x] 2.4 编写属性测试 - 请求头完整性
    - **Property 4: 请求头完整性**
    - **Validates: Requirements 4.3**

- [x] 3. Checkpoint - 核心功能验证
  - 确保所有测试通过
  - 手动测试抖音链接解析

- [x] 4. 集成到下载服务
  - [x] 4.1 更新 yt-dlp.js 中的 extractDouyinNative 调用
    - 确保正确调用 douyin-extractor
    - _Requirements: 4.1_
  - [x] 4.2 确保下载时携带正确请求头
    - User-Agent, Cookie, Referer
    - _Requirements: 4.3_
  - [x] 4.3 支持音频提取选项
    - 仅音频下载时提取音频（通过 yt-dlp --extract-audio）
    - _Requirements: 5.1, 5.2_

- [x] 5. 错误处理完善
  - [x] 5.1 实现统一错误消息
    - "无法获取视频地址"
    - "页面加载失败"
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 6. Final Checkpoint
  - 确保所有测试通过
  - 构建并测试完整流程

## Status: ✅ COMPLETE

所有任务已完成。实现状态：

- `douyin-extractor.js` - 完整实现所有核心函数
- `yt-dlp.js` - 已集成抖音提取器
- 属性测试 - 14个测试用例全部通过
- 错误处理 - 统一错误消息已实现

## Notes

- 任务标记 `*` 为可选测试任务
- 核心功能优先，测试可后续补充
- 属性测试使用 fast-check 库
- 所有14个测试用例已通过验证（2026-01-14验证）
