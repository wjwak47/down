# Design Document: Password Cracker Optimization

## Overview

重新设计密码破解架构，实现多策略智能选择，将破解速度从 37/秒 提升到 50万+/秒。

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CrackOrchestrator                     │
│  (智能策略选择器 - 检测加密类型，选择最优破解方法)         │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│ bkcrack   │  │ Hashcat   │  │ CPU Multi │
│ (秒级)    │  │ (50万/秒) │  │ (1000/秒) │
│ ZipCrypto │  │ AES+GPU   │  │ 无GPU回退 │
└───────────┘  └───────────┘  └───────────┘
```

## Components and Interfaces

### 1. EncryptionDetector

检测 ZIP 文件加密类型。

```javascript
// 返回加密信息
async function detectEncryption(archivePath) {
  // 使用 7z l -slt 获取加密方法
  return {
    method: 'AES-256' | 'ZipCrypto Store' | 'ZipCrypto Deflate',
    canUseBkcrack: boolean,
    canUseHashcat: boolean,
    files: [{ name, crc, size, compressedSize }]
  };
}
```

### 2. BkcrackCracker

已知明文攻击，仅适用于 ZipCrypto。

```javascript
async function crackWithBkcrack(archivePath, options, event, id, session) {
  // 1. 检测文件类型，获取已知明文（文件头签名）
  // 2. 调用 bkcrack.exe 进行攻击
  // 3. 成功则提取密钥或密码
  // 速度：秒级完成
}
```

### 3. HashcatCracker (修复版)

GPU 加速破解，适用于 AES。

```javascript
async function crackWithHashcat(archivePath, options, event, id, session) {
  // 1. 使用 zip2john 提取 hash
  // 2. 在 hashcat 目录下运行 hashcat（关键修复）
  // 3. 实时解析速度输出
  // 速度：50万-200万/秒
}
```

### 4. OptimizedCPUCracker

优化的 CPU 多线程破解。

```javascript
async function crackWithOptimizedCPU(archivePath, options, event, id, session) {
  // 1. 使用 Worker 线程池
  // 2. 批量密码测试（减少进程启动开销）
  // 3. 内存中验证（避免频繁 I/O）
  // 速度：1000-3000/秒
}
```

## Data Models

### CrackSession
```javascript
{
  id: string,
  archivePath: string,
  encryptionType: string,
  method: 'bkcrack' | 'hashcat' | 'cpu',
  status: 'detecting' | 'cracking' | 'found' | 'notfound' | 'stopped',
  startTime: number,
  attempts: number,
  speed: number,
  password: string | null
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system.*

### Property 1: Encryption Detection Accuracy
*For any* ZIP file, the detected encryption method SHALL match the actual encryption used.
**Validates: Requirements 1.1**

### Property 2: Strategy Priority
*For any* crack attempt, the system SHALL try methods in order: bkcrack (if ZipCrypto) > Hashcat (if GPU available) > CPU.
**Validates: Requirements 5.2**

### Property 3: Speed Improvement
*For any* AES-encrypted ZIP with GPU available, Hashcat mode SHALL achieve at least 10,000x speed improvement over current implementation.
**Validates: Requirements 3.2**

### Property 4: Fallback Guarantee
*For any* crack attempt where the primary method fails, the system SHALL automatically try the next available method.
**Validates: Requirements 5.3**

## Error Handling

1. **bkcrack 不可用**: 跳过，使用 Hashcat 或 CPU
2. **Hashcat 不可用/无 GPU**: 跳过，使用 CPU
3. **Hash 提取失败**: 直接使用 CPU 模式
4. **所有方法失败**: 报告错误，建议用户检查文件

## Testing Strategy

1. **单元测试**: 加密类型检测准确性
2. **集成测试**: 各破解方法独立工作
3. **性能测试**: 验证速度提升达标
