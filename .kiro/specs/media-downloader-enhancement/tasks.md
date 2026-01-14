# Implementation Plan: Media Downloader Enhancement

## Overview

This implementation plan covers bug fixes and feature enhancements for the Media Downloader module. Tasks are organized to fix critical bugs first, then add new features incrementally.

## Tasks

- [x] 1. Fix Progress Display Bug
  - [x] 1.1 Enhance progress parsing in yt-dlp.js
    - Add regex patterns for percentage, speed, and ETA extraction
    - Parse yt-dlp output formats: "45.3%", "1.23MiB/s", "ETA 01:23"
    - Send parsed progress data via IPC to renderer
    - _Requirements: 3.1, 3.3, 3.4, 3.5_
  - [x] 1.2 Update VideoDownloader.jsx progress display
    - Display speed in MB/s format
    - Display ETA countdown
    - Ensure progress bar updates smoothly from 0% to 100%
    - _Requirements: 3.1, 3.2_
  - [x] 1.3 Write property test for progress parsing
    - **Property 3: Progress Parsing Accuracy**
    - **Validates: Requirements 3.3, 3.4, 3.5**

- [x] 2. Fix Subtitle Parsing Bug
  - [x] 2.1 Update getVideoInfo in yt-dlp.js
    - Ensure --write-subs and --sub-langs flags are correctly applied
    - Combine subtitles and automatic_captions from yt-dlp JSON
    - Add "[Auto]" label to auto-generated captions
    - _Requirements: 2.1, 2.2_
  - [x] 2.2 Update SubtitleDialog.jsx
    - Display all available subtitle languages
    - Show auto-generated captions with "[Auto]" label
    - Handle "No subtitles available" case properly
    - _Requirements: 2.1, 2.2, 2.4_
  - [x] 2.3 Write property test for subtitle extraction
    - **Property 2: Subtitle Extraction Completeness**
    - **Validates: Requirements 2.1, 2.2**

- [x] 3. Fix File Size Display Bug
  - [x] 3.1 Enhance file size extraction in yt-dlp.js
    - Try filesize first, then filesize_approx
    - Search formats array for size if primary sources unavailable
    - _Requirements: 4.1, 4.2_
  - [x] 3.2 Update VideoDownloader.jsx file size display
    - Format size in KB/MB/GB appropriately
    - Hide size field if unavailable instead of showing "Unknown"
    - _Requirements: 4.1, 4.3_
  - [x] 3.3 Write property test for file size extraction
    - **Property 4: File Size Extraction with Fallback**
    - **Validates: Requirements 4.1, 4.2**

- [x] 4. Checkpoint - Verify Bug Fixes
  - Ensure all tests pass, ask the user if questions arise.
  - Test with YouTube, Bilibili, and Douyin URLs
  - Verify progress bar, subtitles, and file size display work correctly

- [x] 5. Add Platform Detection
  - [x] 5.1 Create platformDetector.js utility
    - Define URL patterns for YouTube, Bilibili, Douyin
    - Implement detectPlatform(url) function
    - Implement getPlatformIcon(platform) function
    - _Requirements: 1.4, 1.5, 1.6_
  - [x] 5.2 Update VideoDownloader.jsx with platform indicator
    - Display platform icon after parsing
    - Show error for unsupported platforms
    - _Requirements: 1.5, 1.6_
  - [x] 5.3 Write property test for platform detection
    - **Property 1: Platform Detection Consistency**
    - **Validates: Requirements 1.4, 1.6**

- [x] 6. Add Quality Selection
  - [x] 6.1 Create qualityExtractor.js utility
    - Extract unique quality options from formats array
    - Sort by resolution (highest first)
    - Include file size estimate per quality
    - _Requirements: 5.1, 5.3, 5.4_
  - [x] 6.2 Create QualitySelector.jsx component
    - Dropdown or button group for quality selection
    - Show file size estimate for each option
    - Default to highest quality
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - [x] 6.3 Update download flow to use selected quality
    - Pass format_id to yt-dlp based on selection
    - _Requirements: 5.2_
  - [x] 6.4 Write property test for quality extraction
    - **Property 5: Quality Extraction and Sorting**
    - **Validates: Requirements 5.1, 5.3, 5.4**

- [x] 7. Add Format Selection
  - [x] 7.1 Create FormatSelector.jsx component
    - Video formats: MP4, WebM, MKV
    - Audio formats: MP3, M4A, WAV
    - Default to MP4/M4A
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 7.2 Update download flow to use selected format
    - Pass format options to yt-dlp
    - Handle format conversion if needed
    - _Requirements: 6.1, 6.2_
  - [x] 7.3 Write property test for default format selection
    - **Property 7: Default Format Selection**
    - **Validates: Requirements 6.3**

- [x] 8. Checkpoint - Verify Quality and Format Selection
  - Ensure all tests pass, ask the user if questions arise.
  - Test quality selection with different videos
  - Test format selection and conversion

- [x] 9. Enhance Download History
  - [x] 9.1 Create historyManager.js utility
    - Implement saveToHistory, getHistory, clearHistory, removeFromHistory
    - Persist to localStorage with MAX_HISTORY_ITEMS limit
    - _Requirements: 7.1, 7.2, 7.5_
  - [x] 9.2 Enhance HistoryPanel in VideoDownloader.jsx
    - Display thumbnail, title, platform, date, file location
    - Add click to open file location
    - Add clear history button
    - _Requirements: 7.3, 7.4, 7.5_
  - [x] 9.3 Write property test for history persistence
    - **Property 6: History Persistence Round-Trip**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 10. Add Batch Download Support
  - [x] 10.1 Add playlist detection in yt-dlp.js
    - Detect YouTube playlists and Bilibili collections
    - Return list of videos in playlist
    - _Requirements: 8.1_
  - [x] 10.2 Create PlaylistDialog.jsx component
    - Display list of videos with checkboxes
    - Allow selecting/deselecting videos
    - Show total selected count
    - _Requirements: 8.1, 8.2_
  - [x] 10.3 Implement batch download queue
    - Download selected videos sequentially
    - Show progress for each video
    - Allow canceling individual items
    - _Requirements: 8.3, 8.4_
  - [x] 10.4 Write property test for playlist detection
    - **Property 8: Playlist Detection**
    - **Validates: Requirements 8.1**

- [x] 11. Add Platform-Specific Features
  - [x] 11.1 YouTube chapter support
    - Extract chapters from video info
    - Option to download as separate files
    - _Requirements: 9.1_
  - [x] 11.2 Bilibili multi-part video support
    - Detect and list all parts (分P)
    - Allow selecting which parts to download
    - _Requirements: 9.2_
  - [x] 11.3 Bilibili cookie support
    - Add cookie input/import option
    - Use cookies for higher quality access
    - _Requirements: 9.3_
  - [x] 11.4 Douyin watermark removal
    - Use mobile UA to get watermark-free URL
    - Fallback to watermarked version if needed
    - _Requirements: 9.4_

- [x] 12. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
  - Test all platforms: YouTube, Bilibili, Douyin
  - Test all features: quality, format, subtitles, history, batch download
  - Verify UI consistency and error handling

## Notes

- All tasks including property-based tests are required
- Bug fixes (Tasks 1-3) should be completed first
- Platform detection (Task 5) is foundational for other features
- Batch download (Task 10) depends on playlist detection
- Platform-specific features (Task 11) can be implemented incrementally
