# Design Document: FileCompressor Fix

## Overview

修复 FileCompressor 页面的核心功能问题，主要是拖放文件功能没有正确实现。后端 API 已经存在且正常工作，问题在于前端组件的事件处理。

## Architecture

### 问题分析

当前代码中的 `onDrop` 事件处理：
```jsx
onDrop={e => { e.preventDefault(); setDragOver(false); }}
```

问题：只阻止了默认行为，没有从 `e.dataTransfer.files` 中提取文件路径。

### 修复方案

```jsx
const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
        const filePaths = droppedFiles.map(f => f.path);
        setFiles(prev => [...prev, ...filePaths.filter(p => !prev.includes(p))]);
    }
};
```

## Components and Interfaces

### 1. Drop Zone Event Handlers

```jsx
// Drag over handler
const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
};

// Drag leave handler
const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
};

// Drop handler - THE KEY FIX
const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
        const filePaths = droppedFiles.map(f => f.path);
        setFiles(prev => [...prev, ...filePaths.filter(p => !prev.includes(p))]);
    }
};
```

### 2. Drop Zone Component

```jsx
<div 
    onClick={handleSelectFiles}
    onDragOver={handleDragOver}
    onDragLeave={handleDragLeave}
    onDrop={handleDrop}
    className={`rounded-2xl border-2 border-dashed p-16 cursor-pointer transition-all text-center
        ${dragOver ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-700'}`}
>
    {/* ... content ... */}
</div>
```

## Data Models

### State

```typescript
interface FileCompressorState {
    files: string[];           // Array of file paths
    mode: 'compress' | 'decompress';
    processing: boolean;
    progress: {
        [key: string]: {
            status: string;
            percent: number;
            error?: string;
            outputPath?: string;
        }
    };
    dragOver: boolean;
}
```

## Correctness Properties

### Property 1: Drop Event File Extraction

*For any* file drop event containing files, the FileCompressor SHALL extract all file paths and add them to the files state array.

**Validates: Requirements 1.2, 1.3**

### Property 2: Duplicate Prevention

*For any* file path that already exists in the files array, the FileCompressor SHALL NOT add it again.

**Validates: Requirements 1.4**

## Error Handling

- Empty drop: Ignore, no error shown
- Invalid file types: Accept all files (filtering happens at compress/decompress time)
- API errors: Display error message in progress area

## Testing Strategy

### Manual Testing

1. Drag and drop single file → Should appear in list
2. Drag and drop multiple files → All should appear in list
3. Drag and drop same file twice → Should only appear once
4. Click to browse → File dialog should open
5. Select files and compress → Should create ZIP file
6. Select archive and extract → Should extract contents
