# Design Document: GPU Crack Optimization

## Overview

实现世界顶尖的 7 层递进 GPU 密码破解策略，大幅提升破解成功率。系统将按优先级依次尝试：字典攻击 → 规则攻击 → 智能掩码 → 混合攻击 → 短暴力 → CPU 智能字典。

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GPU Crack Pipeline                        │
├─────────────────────────────────────────────────────────────┤
│  Phase 1: Dictionary Attack (combined_wordlist.txt)          │
│           ↓ exhausted                                        │
│  Phase 2: Rule Attack (dictionary + best64.rule)             │
│           ↓ exhausted                                        │
│  Phase 3: Smart Mask Attack (common patterns)                │
│           ↓ exhausted                                        │
│  Phase 4: Hybrid Attack (dictionary + digits)                │
│           ↓ exhausted                                        │
│  Phase 5: Short Bruteforce (1-6 chars, lowercase+digits)     │
│           ↓ exhausted                                        │
│  Phase 6: CPU Smart Dictionary (fallback)                    │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. GPUCrackPipeline

主控制器，管理 6 个攻击阶段的执行顺序。

```javascript
interface GPUCrackPipeline {
  // 启动完整破解流程
  startCrack(archivePath, options, event, id, session): Promise<CrackResult>
  
  // 各阶段方法
  runDictionaryAttack(): Promise<PhaseResult>
  runRuleAttack(): Promise<PhaseResult>
  runMaskAttack(): Promise<PhaseResult>
  runHybridAttack(): Promise<PhaseResult>
  runBruteforceAttack(): Promise<PhaseResult>
  runCPUFallback(): Promise<PhaseResult>
}

interface PhaseResult {
  found: string | null
  attempts: number
  exhausted: boolean
}
```

### 2. HashcatRunner

封装 Hashcat 命令执行。

```javascript
interface HashcatRunner {
  // 执行 hashcat 命令
  run(args: string[]): Promise<HashcatResult>
  
  // 解析输出
  parseProgress(stdout: string): ProgressInfo
  parseResult(outFile: string): string | null
}
```

### 3. AttackConfigs

各攻击模式的配置。

```javascript
const ATTACK_CONFIGS = {
  dictionary: {
    mode: '-a 0',
    wordlist: 'combined_wordlist.txt'
  },
  rule: {
    mode: '-a 0',
    wordlist: 'combined_wordlist.txt',
    rules: '-r rules/best64.rule'
  },
  mask: {
    mode: '-a 3',
    patterns: [
      '?d?d?d?d?d?d',           // 6位纯数字
      '?l?l?l?l?l?l?d?d',       // 6小写+2数字
      '?u?l?l?l?l?l?d?d',       // 首大写+5小写+2数字
      '?l?l?l?l?l?l?d?d?d?d',   // 6小写+4数字(年份)
      '?u?l?l?l?l?l?d?d?d?s',   // 首大写+5小写+3数字+符号
      '?l?l?l?l?l?l?l?l',       // 8位纯小写
      '?d?d?d?d?d?d?d?d'        // 8位纯数字
    ]
  },
  hybrid: {
    mode6: '-a 6',  // wordlist + mask
    mode7: '-a 7',  // mask + wordlist
    suffixes: ['?d?d?d?d', '?d?d?s', '?d?d?d?s']
  },
  bruteforce: {
    mode: '-a 3',
    increment: '--increment --increment-min=1 --increment-max=6',
    charset: '?l?d'  // 小写+数字
  }
}
```

## Data Models

### CrackSession

```javascript
interface CrackSession {
  id: string
  active: boolean
  currentPhase: number  // 1-6
  phaseName: string
  totalAttempts: number
  process: ChildProcess | null
  cleanup: () => void
}
```

### ProgressEvent

```javascript
interface ProgressEvent {
  id: string
  phase: number
  phaseName: string
  method: string
  attempts: number
  speed: number
  current: string
  estimatedTime?: string
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do.*

### Property 1: Attack Phase Transition Order

*For any* crack session, when a phase exhausts without finding the password, the system SHALL transition to the next phase in order: Dictionary → Rule → Mask → Hybrid → Bruteforce → CPU.

**Validates: Requirements 2.1, 3.1, 4.1, 5.1, 6.1**

### Property 2: Phase Completion Before Transition

*For any* attack phase, the system SHALL complete all attempts in that phase before transitioning to the next phase.

**Validates: Requirements 2.1, 3.1, 4.1, 5.1**

### Property 3: CPU Mode Dictionary Only

*For any* CPU fallback execution, the system SHALL only attempt smart dictionary passwords and SHALL NOT perform bruteforce attacks.

**Validates: Requirements 6.2**

### Property 4: Mask Pattern Order

*For any* mask attack phase, the system SHALL try patterns in the configured order (PIN first, then common patterns).

**Validates: Requirements 3.2**

## Error Handling

| Error | Handling |
|-------|----------|
| Hashcat not found | Skip GPU phases, go directly to CPU |
| Hash extraction failed | Fall back to CPU mode |
| Hashcat crash (code != 0,1) | Log error, try next phase |
| Session cancelled | Clean up processes, return null |
| Timeout | Move to next phase |

## Testing Strategy

### Unit Tests
- Test attack config generation
- Test progress parsing
- Test phase transition logic

### Property Tests
- Property 1: Phase transition order (mock hashcat, verify sequence)
- Property 3: CPU mode constraints (verify no bruteforce in CPU)

### Integration Tests
- Full pipeline with test archives
- GPU availability detection
- Fallback scenarios
