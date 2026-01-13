# Design Document: FileCompressor Upgrade

## Overview

全面升级 FileCompressor，添加密码加密、压缩级别、分卷压缩、多格式支持和密码破解功能。采用模块化设计，前端使用 React 组件，后端使用 Node.js Worker Threads 实现多线程密码破解。

## Architecture

### 系统架构

```
FileCompressor
├── Frontend (React)
│   ├── ModeSelector (Compress / Extract / Crack)
│   ├── FileDropZone
│   ├── FileList
│   ├── OptionsPanel
│   │   ├── PasswordInput
│   │   ├── CompressionLevel
│   │   ├── SplitOptions
│   │   └── FormatSelector
│   ├── CrackPanel
│   │   ├── AttackModeSelector
│   │   ├── CharsetConfig
│   │   ├── DictionarySelector
│   │   └── ProgressDisplay
│   └── ActionButton
│
├── Backend (Electron Main Process)
│   ├── CompressService
│   │   ├── ZIP (archiver + node-7z)
│   │   ├── 7Z (node-7z)
│   │   └── TAR (tar-fs)
│   ├── ExtractService
│   │   ├── decompress
│   │   └── node-7z
│   └── CrackService
│       ├── HashExtractor (zip2john style)
│       ├── DictionaryAttack
│       ├── BruteForceAttack
│       └── WorkerPool (multi-threading)
```

### 密码破解架构

```
CrackService
├── Main Thread
│   ├── Job Manager
│   ├── Progress Aggregator
│   └── IPC Handler
│
├── Worker Pool (CPU cores - 1)
│   ├── Worker 1: Range [aaaa - azzz]
│   ├── Worker 2: Range [baaa - bzzz]
│   ├── Worker 3: Range [caaa - czzz]
│   └── Worker N: Range [...]
│
└── Shared State
    ├── Found Flag (Atomics)
    ├── Total Attempts
    └── Current Speed
```

## Components and Interfaces

### 1. Mode Selector

```jsx
const modes = [
    { id: 'compress', icon: 'folder_zip', label: 'Compress' },
    { id: 'extract', icon: 'unarchive', label: 'Extract' },
    { id: 'crack', icon: 'key', label: 'Crack Password' }
];

<div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
    {modes.map(m => (
        <button key={m.id} onClick={() => setMode(m.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2
                ${mode === m.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'}`}>
            <span className="material-symbols-outlined text-lg">{m.icon}</span>
            {m.label}
        </button>
    ))}
</div>
```

### 2. Password Input Component

```jsx
<div className="space-y-3">
    <div className="flex items-center gap-3">
        <input type="checkbox" checked={usePassword} onChange={e => setUsePassword(e.target.checked)} />
        <span className="text-sm font-medium">Password Protection</span>
    </div>
    
    {usePassword && (
        <div className="space-y-2 pl-6">
            <div className="relative">
                <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full h-10 px-3 pr-10 border rounded-lg"
                />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5">
                    <span className="material-symbols-outlined text-slate-400">
                        {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                </button>
            </div>
            <input 
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full h-10 px-3 border rounded-lg"
            />
            <PasswordStrengthBar password={password} />
        </div>
    )}
</div>
```

### 3. Compression Level Selector

```jsx
const levels = [
    { id: 'fast', label: 'Fast', desc: 'Quick compression, larger size', icon: 'bolt' },
    { id: 'normal', label: 'Normal', desc: 'Balanced speed and size', icon: 'tune' },
    { id: 'maximum', label: 'Maximum', desc: 'Best compression, slower', icon: 'compress' }
];

<div className="grid grid-cols-3 gap-3">
    {levels.map(level => (
        <button key={level.id} onClick={() => setCompressionLevel(level.id)}
            className={`p-3 rounded-xl border text-left transition-all
                ${compressionLevel === level.id 
                    ? 'border-primary bg-primary/5' 
                    : 'border-slate-200 hover:border-slate-300'}`}>
            <span className="material-symbols-outlined text-primary mb-2">{level.icon}</span>
            <p className="text-sm font-medium">{level.label}</p>
            <p className="text-xs text-slate-500">{level.desc}</p>
        </button>
    ))}
</div>
```

### 4. Split Archive Options

```jsx
<div className="space-y-3">
    <div className="flex items-center gap-3">
        <input type="checkbox" checked={splitArchive} onChange={e => setSplitArchive(e.target.checked)} />
        <span className="text-sm font-medium">Split into volumes</span>
    </div>
    
    {splitArchive && (
        <div className="flex gap-2 pl-6">
            {['100MB', '500MB', '1GB', '2GB'].map(size => (
                <button key={size} onClick={() => setVolumeSize(size)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border
                        ${volumeSize === size ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200'}`}>
                    {size}
                </button>
            ))}
            <input 
                type="number" 
                placeholder="Custom MB"
                className="w-24 px-2 py-1.5 text-xs border rounded-lg"
                onChange={e => setVolumeSize(`${e.target.value}MB`)}
            />
        </div>
    )}
</div>
```

### 5. Password Cracker Panel

```jsx
<div className="space-y-6">
    {/* Attack Mode */}
    <div className="space-y-3">
        <h4 className="text-sm font-semibold">Attack Mode</h4>
        <div className="grid grid-cols-3 gap-3">
            {[
                { id: 'dictionary', label: 'Dictionary', desc: 'Use wordlist', icon: 'menu_book' },
                { id: 'bruteforce', label: 'Brute Force', desc: 'Try all combinations', icon: 'grid_view' },
                { id: 'mask', label: 'Mask', desc: 'Known pattern', icon: 'pattern' }
            ].map(attack => (
                <button key={attack.id} onClick={() => setAttackMode(attack.id)}
                    className={`p-3 rounded-xl border text-left ${attackMode === attack.id ? 'border-primary bg-primary/5' : ''}`}>
                    <span className="material-symbols-outlined text-primary mb-2">{attack.icon}</span>
                    <p className="text-sm font-medium">{attack.label}</p>
                    <p className="text-xs text-slate-500">{attack.desc}</p>
                </button>
            ))}
        </div>
    </div>

    {/* Brute Force Options */}
    {attackMode === 'bruteforce' && (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold">Character Set</h4>
            <div className="flex flex-wrap gap-2">
                {[
                    { id: 'lowercase', label: 'a-z', chars: 'abcdefghijklmnopqrstuvwxyz' },
                    { id: 'uppercase', label: 'A-Z', chars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
                    { id: 'numbers', label: '0-9', chars: '0123456789' },
                    { id: 'special', label: '!@#$', chars: '!@#$%^&*()_+-=[]{}|;:,.<>?' }
                ].map(set => (
                    <button key={set.id} onClick={() => toggleCharset(set.id)}
                        className={`px-3 py-1.5 text-xs font-mono rounded-lg border
                            ${charset.includes(set.id) ? 'border-primary bg-primary/10' : ''}`}>
                        {set.label}
                    </button>
                ))}
            </div>
            <div className="flex gap-3">
                <div>
                    <label className="text-xs text-slate-500">Min Length</label>
                    <input type="number" value={minLength} onChange={e => setMinLength(e.target.value)}
                        className="w-20 h-9 px-2 border rounded-lg" min="1" max="16" />
                </div>
                <div>
                    <label className="text-xs text-slate-500">Max Length</label>
                    <input type="number" value={maxLength} onChange={e => setMaxLength(e.target.value)}
                        className="w-20 h-9 px-2 border rounded-lg" min="1" max="16" />
                </div>
            </div>
        </div>
    )}

    {/* Progress Display */}
    {cracking && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-3">
            <div className="flex justify-between text-sm">
                <span>Speed</span>
                <span className="font-mono text-primary">{speed.toLocaleString()} /sec</span>
            </div>
            <div className="flex justify-between text-sm">
                <span>Attempts</span>
                <span className="font-mono">{attempts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-mono">{progress}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }}></div>
            </div>
            {foundPassword && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-200">
                    <p className="text-xs text-emerald-600 mb-1">Password Found!</p>
                    <p className="font-mono text-lg text-emerald-700 dark:text-emerald-400">{foundPassword}</p>
                </div>
            )}
        </div>
    )}
</div>
```

## Data Models

### IPC API

```typescript
// Compress API
interface CompressOptions {
    files: string[];
    outputPath: string;
    format: 'zip' | '7z' | 'tar' | 'tar.gz';
    level: 'fast' | 'normal' | 'maximum';
    password?: string;
    splitSize?: number; // in bytes
}

// Crack API
interface CrackOptions {
    archivePath: string;
    mode: 'dictionary' | 'bruteforce' | 'mask';
    // Dictionary mode
    wordlistPath?: string;
    // Brute force mode
    charset?: string;
    minLength?: number;
    maxLength?: number;
    // Mask mode
    mask?: string; // e.g., "pass????123"
}

interface CrackProgress {
    speed: number;        // attempts per second
    attempts: number;     // total attempts
    progress: number;     // percentage (for dictionary/mask)
    currentPassword?: string;
    found?: string;       // found password
    status: 'running' | 'paused' | 'found' | 'exhausted';
}
```

### Worker Thread Communication

```typescript
// Main → Worker
interface WorkerTask {
    type: 'start' | 'pause' | 'resume' | 'stop';
    archiveHash: string;
    range?: { start: string; end: string };
    charset?: string;
    wordlist?: string[];
}

// Worker → Main
interface WorkerResult {
    type: 'progress' | 'found' | 'exhausted';
    attempts: number;
    speed: number;
    password?: string;
}
```

## Correctness Properties

### Property 1: Password Encryption Integrity

*For any* file compressed with a password, attempting to extract without the correct password SHALL fail, and extracting with the correct password SHALL succeed.

**Validates: Requirements 1.3**

### Property 2: Compression Level Effect

*For any* set of files, compressing with "Maximum" level SHALL produce a file size less than or equal to "Normal", which SHALL be less than or equal to "Fast".

**Validates: Requirements 2.2, 2.3**

### Property 3: Split Archive Completeness

*For any* archive split into volumes, combining and extracting all volumes SHALL produce files identical to the original input files.

**Validates: Requirements 3.4, 3.5**

### Property 4: Password Cracker Correctness

*For any* archive with a known password within the search space, the Password_Cracker SHALL eventually find the correct password.

**Validates: Requirements 5.7**

## Error Handling

- Invalid password: Show error, don't corrupt archive
- Disk full during compression: Clean up partial files, show error
- Corrupted archive: Attempt partial extraction, report damaged files
- Crack timeout: Allow user to save progress and resume later

## Testing Strategy

### Unit Tests
- Test compression/decompression with various formats
- Test password encryption/decryption
- Test split archive creation and extraction

### Integration Tests
- Test full workflow: compress → split → extract
- Test password cracker with known passwords

### Performance Tests
- Benchmark cracking speed with different thread counts
- Measure compression ratios across formats
