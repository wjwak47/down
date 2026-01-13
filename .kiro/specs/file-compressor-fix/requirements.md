# Requirements Document

## Introduction

修复 FileCompressor 页面的功能问题，确保拖放文件、选择文件、压缩和解压功能都能正常工作。当前页面 UI 已经完成，但核心功能存在问题。

## Glossary

- **FileCompressor**: 文件压缩/解压页面组件
- **Drop_Zone**: 拖放区域，用于接收用户拖入的文件
- **Compress_Mode**: 压缩模式，将多个文件打包成 ZIP
- **Extract_Mode**: 解压模式，从压缩包中提取文件

## Requirements

### Requirement 1: 拖放文件功能

**User Story:** As a user, I want to drag and drop files onto the page, so that I can quickly add files for compression or extraction.

#### Acceptance Criteria

1. WHEN user drags files over the drop zone, THE FileCompressor SHALL show visual feedback (border color change)
2. WHEN user drops files on the drop zone, THE FileCompressor SHALL extract file paths from the drop event
3. THE FileCompressor SHALL add dropped files to the file list
4. THE FileCompressor SHALL prevent duplicate files from being added

### Requirement 2: 文件选择功能

**User Story:** As a user, I want to click to browse and select files, so that I can add files without drag and drop.

#### Acceptance Criteria

1. WHEN user clicks the drop zone or "Add more files" button, THE FileCompressor SHALL open a file selection dialog
2. THE file dialog SHALL allow selecting multiple files and folders
3. THE FileCompressor SHALL add selected files to the file list

### Requirement 3: 压缩功能

**User Story:** As a user, I want to compress selected files into a ZIP archive, so that I can reduce file size and bundle files together.

#### Acceptance Criteria

1. WHEN user clicks "Compress Now" with files selected, THE FileCompressor SHALL start compression
2. THE FileCompressor SHALL show progress during compression
3. WHEN compression completes, THE FileCompressor SHALL show success message with output path
4. IF compression fails, THE FileCompressor SHALL show error message

### Requirement 4: 解压功能

**User Story:** As a user, I want to extract files from archives, so that I can access the contents.

#### Acceptance Criteria

1. WHEN user selects "Extract" mode and clicks "Extract Now", THE FileCompressor SHALL start extraction
2. THE FileCompressor SHALL show progress during extraction
3. WHEN extraction completes, THE FileCompressor SHALL show success message with output path
4. IF extraction fails, THE FileCompressor SHALL show error message

### Requirement 5: 文件列表管理

**User Story:** As a user, I want to manage the file list before processing.

#### Acceptance Criteria

1. THE FileCompressor SHALL display all added files with their names
2. WHEN user clicks remove button on a file, THE FileCompressor SHALL remove it from the list
3. WHEN user clicks "Clear all", THE FileCompressor SHALL remove all files from the list
