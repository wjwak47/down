# 快速阶段跳过问题调试

## 🔍 问题分析

用户报告：AI 阶段之前的阶段（FastCombo、Top10K 等）跳过得太快，没有真正执行。

### 从控制台日志分析

```
[Crack] Phase FastCombo-Keyboard finished, code: 4294967295, found: false
[Crack] FastCombo: Result from Keyboard: FAILED
[Crack] FastCombo: All attacks failed, combined attempts: 0
```

**关键发现**：
- 错误代码 `4294967295` 是一个异常大的数字
- 这通常表示进程崩溃或严重错误
- `combined attempts: 0` 说明没有测试任何密码

## 🎯 可能的原因

### 1. Hashcat 路径问题
- Hashcat 可执行文件不存在或无法执行
- 权限问题导致无法启动 hashcat

### 2. 字典文件问题
- `rockyou.txt` 或 `combined_wordlist.txt` 不存在
- 临时字典文件创建失败

### 3. Hash 文件问题
- Hash 文件格式不正确
- Hash 模式不匹配

### 4. 系统环境问题
- Windows 防病毒软件阻止 hashcat 执行
- 缺少必要的运行时库

## 🔧 调试步骤

### 步骤1: 检查 Hashcat 可用性

```javascript
// 在控制台中检查
console.log('[Debug] Hashcat path:', getHashcatPath());
console.log('[Debug] Hashcat exists:', fs.existsSync(getHashcatPath()));
```

### 步骤2: 检查字典文件

```javascript
// 检查字典文件是否存在
const hashcatDir = getHashcatDir();
const dictPath1 = path.join(hashcatDir, 'rockyou.txt');
const dictPath2 = path.join(hashcatDir, 'combined_wordlist.txt');
console.log('[Debug] Dict1 exists:', fs.existsSync(dictPath1));
console.log('[Debug] Dict2 exists:', fs.existsSync(dictPath2));
```

### 步骤3: 手动测试 Hashcat

尝试手动运行 hashcat 命令：
```bash
# Windows
cd "resources/hashcat/hashcat-6.2.6"
hashcat.exe --version

# 测试简单命令
hashcat.exe -m 13600 test.hash -a 3 ?d?d?d?d
```

### 步骤4: 检查进程启动

在 `runHashcatPhase` 函数中添加更详细的调试：

```javascript
proc.on('error', (err) => {
    console.log(`[Crack] Phase ${phaseName} error:`, err.message);
    console.log('[Debug] Full error:', err);
    console.log('[Debug] Hashcat path:', hashcatPath);
    console.log('[Debug] Working directory:', hashcatDir);
    console.log('[Debug] Full args:', fullArgs);
    resolve({ found: null, attempts: totalAttempts, exhausted: false, error: true });
});
```

## 🚨 紧急修复方案

### 修复1: 增强错误处理

在 `runHashcatPhase` 函数中添加更好的错误检测：

```javascript
proc.on('close', (code) => {
    let found = null;
    if (fs.existsSync(outFile)) {
        const content = fs.readFileSync(outFile, 'utf-8').trim();
        const parts = content.split(':');
        if (parts.length >= 2) found = parts[parts.length - 1];
    }
    
    // ✅ 增强错误代码处理
    console.log(`[Crack] Phase ${phaseName} finished, code: ${code}, found: ${!!found}`);
    
    // 检查异常退出代码
    if (code === 4294967295 || code < 0) {
        console.error(`[Crack] Phase ${phaseName} crashed with code: ${code}`);
        console.error('[Debug] This usually indicates hashcat failed to start or crashed');
        resolve({ found: null, attempts: totalAttempts, exhausted: false, error: true, crashCode: code });
        return;
    }
    
    resolve({ found, attempts: totalAttempts, exhausted: code === 1 || code === 0 });
});
```

### 修复2: 添加启动前检查

在执行 hashcat 之前进行预检查：

```javascript
async function runHashcatPhase(hashFile, outFile, hashMode, args, phaseName, event, id, session, previousAttempts = 0) {
    const hashcatPath = getHashcatPath();
    const hashcatDir = getHashcatDir();
    
    // ✅ 预检查
    if (!fs.existsSync(hashcatPath)) {
        console.error('[Crack] Hashcat executable not found:', hashcatPath);
        return { found: null, attempts: previousAttempts, exhausted: false, error: true };
    }
    
    if (!fs.existsSync(hashFile)) {
        console.error('[Crack] Hash file not found:', hashFile);
        return { found: null, attempts: previousAttempts, exhausted: false, error: true };
    }
    
    // 继续原有逻辑...
}
```

### 修复3: 回退到 CPU 模式

如果 GPU 模式持续失败，自动回退到 CPU 模式：

```javascript
// 在 FastCombo 攻击失败后，尝试 CPU 模式
if (result.error && result.crashCode === 4294967295) {
    console.log('[Crack] GPU mode failed, falling back to CPU mode...');
    // 调用 CPU 破解逻辑
    return await crackWithCPU(archivePath, options, event, id, session, Date.now());
}
```

## 📋 立即行动清单

1. **检查 hashcat 可执行文件是否存在**
2. **检查字典文件是否存在**
3. **手动测试 hashcat 命令**
4. **添加详细的错误日志**
5. **实现自动回退机制**

## 🎯 预期结果

修复后应该看到：
- 详细的错误信息而不是神秘的退出代码
- 如果 GPU 模式失败，自动回退到 CPU 模式
- 实际的密码测试而不是立即跳过

---

**下一步**: 实施这些调试和修复措施，找出 hashcat 无法正常启动的根本原因。