# Design Document

## Overview

重写 `src/main/modules/fileCompressor/index.js` 文件，确保密码破解功能正常工作。

## Architecture

```
FileCompressor Module
├── IPC Handlers (压缩/解压/破解)
├── crackWithCPU() - 单线程CPU破解
├── crackWithMultiThreadCPU() - 多线程CPU破解  
├── crackWithHashcat() - GPU破解
└── Helper Functions (tryPasswordFast, extractZipHash, etc.)
```

## Components and Interfaces

### 1. Main IPC Handlers

- `zip:crack-start` - 启动破解
- `zip:crack-stop` - 停止破解
- `zip:crack-progress` - 进度更新
- `zip:crack-result` - 结果返回

### 2. Cracking Functions

```javascript
// CPU单线程
async function crackWithCPU(archivePath, options, event, id, session, startTime)

// CPU多线程
async function crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime)

// GPU (hashcat)
async function crackWithHashcat(archivePath, options, event, id, session)
```

### 3. Flow Logic

```
zip:crack-start
    ├── useGpu && hashcatAvailable?
    │   ├── YES → crackWithHashcat()
    │   │         └── 失败 → crackWithCPU()
    │   └── NO → useCpuMultiThread?
    │            ├── YES → crackWithMultiThreadCPU()
    │            │         └── 失败 → crackWithCPU()
    │            └── NO → crackWithCPU()
    └── 返回结果
```

## Data Models

### Options
```javascript
{
    mode: 'dictionary' | 'bruteforce',
    charset: string,
    minLength: number,
    maxLength: number,
    dictionaryPath: string,
    useGpu: boolean,
    useCpuMultiThread: boolean
}
```

### Result
```javascript
{
    found: string | null,
    attempts: number,
    speed: number
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Build Success
*For any* valid source code, building the application SHALL succeed without errors.
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Progress Updates
*For any* cracking operation, progress updates SHALL be sent to the UI at regular intervals.
**Validates: Requirements 2.2**

### Property 3: Password Found Returns Immediately
*For any* cracking operation where the password is found, the operation SHALL terminate and return the password.
**Validates: Requirements 2.3, 3.3, 4.3**

### Property 4: Fallback on Failure
*For any* GPU or multi-thread failure, the system SHALL fall back to single-threaded CPU mode.
**Validates: Requirements 3.4, 4.4**

## Error Handling

1. 文件不存在 → 返回错误
2. hashcat 失败 → 回退到 CPU
3. Worker 创建失败 → 回退到单线程
4. 用户取消 → 终止所有进程

## Testing Strategy

1. 构建测试：确保 `npm run build` 成功
2. 功能测试：使用已知密码的测试文件验证破解功能
