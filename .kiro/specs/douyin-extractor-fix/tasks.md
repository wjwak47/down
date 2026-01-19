# Implementation Plan: 抖音提取器修复

## Overview

修复抖音视频提取器，实现多层提取策略，解决2026年抖音结构变化导致的问题。

## Tasks

- [x] 1. 修复extractDouyinVideo主函数
  - [x] 1.1 恢复使用Mobile UA和内存Session
    - 使用 `partition: 'in-memory-extraction'`
    - 使用Android Mobile UA获取单文件MP4（视频+音频合并）
    - _Requirements: 1.2, 5.1, 7.1_
  
  - [x] 1.2 实现页面内嵌数据提取（策略1）
    - 从 `window.__RENDER_DATA__` 提取
    - 从 `script` 标签中的JSON提取
    - 解析aweme_detail获取视频URL、标题、作者、时长
    - 尝试提取音乐信息（music字段）
    - _Requirements: 3.1, 3.2, 3.3, 6.3_
  
  - [x] 1.3 优化网络拦截逻辑（策略2）
    - 使用 `onResponseStarted` 检查content-type
    - 捕获视频URL和封面URL
    - 实现早期退出机制
    - _Requirements: 1.2_

  - [x] 1.4 更新DOM提取选择器（策略3）
    - 更新2026年抖音页面的CSS选择器
    - 添加多个备选选择器
    - 从HTML正则匹配作为最后手段
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. 改进元数据提取
  - [x] 2.1 实现标题提取
    - 从页面title提取
    - 从meta[og:title]提取
    - 从__RENDER_DATA__提取
    - _Requirements: 2.1, 2.2_
  
  - [x] 2.2 实现作者提取
    - 更新CSS选择器列表
    - 从API数据提取
    - _Requirements: 2.3_
  
  - [x] 2.3 实现时长提取
    - 从API数据提取duration字段
    - 转换毫秒为秒和时长字符串
    - _Requirements: 2.5_

  - [x] 2.4 实现音乐信息提取
    - 从API数据提取music字段
    - 获取音乐标题和作者
    - _Requirements: 6.3_

- [x] 3. 视频URL处理优化
  - [x] 3.1 优化processVideoUrl函数
    - 去水印：playwm -> play
    - 转H264：_265 -> _264, hevc -> h264
    - 确保返回完整视频URL
    - _Requirements: 7.2, 7.3, 7.4_

- [x] 4. 错误处理和重试
  - [x] 4.1 实现重试机制
    - 首次失败后自动重试一次
    - 重试时使用不同策略
    - _Requirements: 4.4_
  
  - [x] 4.2 改进错误消息
    - 提供具体失败原因
    - 区分超时、加载失败、提取失败
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. 双阶段提取优化 (2026-01-14)
  - [x] 5.1 实现Desktop UA元数据提取
    - 新增 `extractMetadataDesktop()` 函数
    - 使用Desktop UA加载页面获取完整元数据
    - 从页面title、og:title、description、DOM元素提取标题
    - 从多个CSS选择器提取作者
    - 从video.duration和script标签提取时长
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  
  - [x] 5.2 重构为双阶段流程
    - 阶段1: Desktop UA提取元数据（标题、作者、时长、封面）
    - 阶段2: Mobile UA提取视频URL（网络拦截）
    - 合并两阶段结果，优先使用Desktop元数据
    - _Requirements: 1.2, 2.1-2.5_

- [x] 6. 修复下载功能 (2026-01-14)
  - [x] 6.1 修复export语句位置
    - 将export语句移到extractDouyinVideo函数定义之后
    - 确保函数正确导出
    - _Requirements: 1.1_
  
  - [x] 6.2 实现抖音直接HTTP下载
    - 新增 `downloadDouyinDirect()` 方法
    - 检测抖音CDN URL（douyinvod.com, douyinstatic.com等）
    - 使用Node.js https模块直接下载
    - 支持进度回调、取消、超时处理
    - 绕过yt-dlp（yt-dlp无法处理直接视频URL）
    - _Requirements: 1.1, 5.1_

- [x] 7. Checkpoint - 测试验证
  - 手动测试抖音短链接
  - 手动测试抖音视频页URL
  - 验证元数据提取完整性（标题、作者、时长）
  - 测试视频下载功能
  - 测试音频下载功能
  - 确保下载功能正常

## Notes

- 关键修复：使用Mobile UA + 内存Session + onResponseStarted
- 优先从页面内嵌数据提取，比DOM更可靠
- 保持向后兼容，不影响其他平台的下载功能
- **2026-01-14更新**: 
  - 实现双阶段提取，解决Mobile UA页面元数据不完整的问题
  - 修复export语句位置问题
  - 实现抖音直接HTTP下载，绕过yt-dlp的404错误
