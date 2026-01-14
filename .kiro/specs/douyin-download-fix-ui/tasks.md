# Implementation Plan: 抖音下载修复与UI重设计

## Overview

本实现计划分为两个阶段：
1. **阶段一**：修复抖音下载功能（Cookie支持、元数据提取、下载流程）
2. **阶段二**：重新设计Media Downloader UI界面

## Tasks

- [x] 1. 创建抖音Cookie对话框组件
  - [x] 1.1 创建DouyinCookieDialog.jsx组件
    - 参考BilibiliCookieDialog.jsx的结构
    - 实现Cookie输入文本框
    - 实现保存和取消按钮
    - 添加Cookie获取说明文字
    - _Requirements: 1.1, 1.2_
  
  - [x] 1.2 实现Cookie存储逻辑
    - 保存Cookie到localStorage（key: 'douyinCookie'）
    - 读取已保存的Cookie
    - 验证Cookie格式
    - _Requirements: 1.2_

- [x] 2. 修复抖音提取器
  - [x] 2.1 优化extractDouyinVideo函数
    - 从localStorage读取Cookie
    - 在BrowserWindow session中设置Cookie
    - 增强元数据提取脚本（从__RENDER_DATA__提取）
    - 确保返回完整的uploader和duration
    - _Requirements: 1.3, 2.1, 2.2, 2.3_
  
  - [x] 2.2 修复下载时的Cookie传递
    - 在downloadDouyinDirect中使用保存的Cookie
    - 在headers中包含Cookie
    - 支持douyinCookie选项参数
    - _Requirements: 1.4, 3.1, 3.2_

- [x] 3. Checkpoint - 功能测试
  - 测试抖音Cookie保存和读取
  - 测试视频信息提取（标题、作者、时长）
  - 测试视频下载功能
  - 测试音频下载功能

- [x] 4. 重设计视频信息展示区
  - [x] 4.1 重构视频预览区域
    - 左侧：视频预览/封面图（16:9比例）
    - 处理预览不可用的情况（显示封面+提示）
    - 添加播放/暂停控制
    - _Requirements: 4.1, 4.3_
  
  - [x] 4.2 重构视频信息区域
    - 标题：最多2行，超出截断
    - 作者：头像+名称
    - 平台标签：使用品牌颜色
    - 技术信息：时长、大小、格式
    - _Requirements: 4.2, 4.5_
  
  - [x] 4.3 重构下载选项区域
    - 视频下载：主按钮（渐变蓝色）+ 格式选择器
    - 音频下载：次要按钮 + 格式选择器
    - 字幕下载：次要按钮
    - 使用grid布局，紧凑排列
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. 重设计下载列表区
  - [x] 5.1 重构下载卡片组件
    - 缩略图：左侧小图
    - 信息：标题、状态标签、大小
    - 进度：进度条、百分比、速度、ETA
    - 操作：暂停/继续、取消、打开位置
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 5.2 优化下载状态显示
    - Active：蓝色，显示进度
    - Paused：黄色，显示暂停图标
    - Completed：绿色，显示完成图标
    - Failed：红色，显示错误信息
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 6. 统一UI风格
  - [x] 6.1 更新页面整体布局
    - 调整间距和边距
    - 统一卡片圆角（16px）
    - 添加轻微阴影效果
    - _Requirements: 7.2, 7.4_
  
  - [x] 6.2 更新按钮样式
    - 主按钮：渐变背景 + 阴影 + hover效果
    - 次要按钮：浅色背景 + hover变色
    - 图标按钮：圆形 + hover背景
    - _Requirements: 7.3_
  
  - [x] 6.3 确保深色模式支持
    - 检查所有组件的dark:类
    - 调整深色模式下的颜色对比度
    - _Requirements: 7.5_

- [x] 7. 改进错误处理
  - [x] 7.1 添加Cookie提示
    - 检测需要Cookie的错误
    - 显示"设置Cookie"按钮
    - 引导用户到Cookie对话框
    - _Requirements: 8.1, 1.5_
  
  - [x] 7.2 优化错误消息显示
    - 使用友好的错误提示
    - 提供可操作的建议
    - 添加重试按钮
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [x] 8. Checkpoint - 最终测试
  - 测试完整的抖音下载流程
  - 测试UI在不同状态下的显示
  - 测试深色模式
  - 测试错误处理流程
  - 确保所有功能正常

## Notes

- 优先修复功能问题，确保下载能正常工作
- UI重设计保持与软件整体风格一致
- 使用Tailwind CSS进行样式编写
- 保持代码简洁，避免过度设计
- 测试时使用真实的抖音链接验证

## Completed Changes

### 文件修改列表：
1. `src/renderer/src/components/DouyinCookieDialog.jsx` - 新建抖音Cookie对话框组件
2. `src/main/services/douyin-extractor.js` - 优化元数据提取，添加Cookie支持
3. `src/main/services/yt-dlp.js` - 修复downloadDouyinDirect方法的Cookie传递
4. `src/renderer/src/pages/VideoDownloader.jsx` - 完全重设计UI界面

### UI改进亮点：
- 简约大气的卡片式设计
- 平台品牌色渐变按钮（抖音：青色到粉红色）
- 紧凑的下载选项布局
- 优化的下载列表卡片
- 完善的深色模式支持
- 中文界面
- 抖音Cookie设置入口（头部按钮）
- 错误提示中的Cookie设置快捷按钮
