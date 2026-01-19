import { ipcMain, dialog, app } from 'electron';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sevenBin from '7zip-bin';
import os from 'os';
import { spawn, execSync } from 'child_process';
import { Worker } from 'worker_threads';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import archiverZipEncrypted from 'archiver-zip-encrypted';
archiver.registerFormat('zip-encrypted', archiverZipEncrypted);

import { smartPasswordGenerator, SMART_DICTIONARY, applyRules } from './smartCracker.js';
import BatchTestManager from './batchTestManager.js';
import SessionManager from './sessionManager.js';
import StatsCollector from './statsCollector.js';
import StrategySelector from './strategySelector.js';
// Use Python-based PassGPT generator (fallback when ONNX conversion fails)
import PassGPTGenerator from './ai/passgptGeneratorPython.js';
// Advanced Attack Modes Manager for context-aware password generation
import AdvancedAttackModeManager from './AdvancedAttackModeManager.js';

// === 新增：科学优化模块 ===
// 密码模式学习器 - 贝叶斯增量学习
import PasswordPatternLearner from './PasswordPatternLearner.js';
// 文件上下文分析器 - 智能复杂度预估
import FileContextAnalyzer from './FileContextAnalyzer.js';
// GPU优化器 - 硬件感知参数调优
import GPUOptimizer from './GPUOptimizer.js';

// === 新增：高级ML密码生成器 ===
// PCFG概率上下文无关文法生成器
import PCFGGenerator from './PCFGGenerator.js';
// 中文密码模式生成器（拼音、吉利数字）
import ChinesePasswordGenerator from './ChinesePasswordGenerator.js';
// 二阶马尔可夫链密码生成器
import MarkovPasswordGenerator from './MarkovPasswordGenerator.js';

// 全局实例
const patternLearner = new PasswordPatternLearner();
const contextAnalyzer = new FileContextAnalyzer();
const pcfgGenerator = new PCFGGenerator();
const chineseGenerator = new ChinesePasswordGenerator();
const markovGenerator = new MarkovPasswordGenerator();

const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

// Get 7z path - Mac needs special handling
function get7zPath() {
    // First try bundled 7zip-bin
    let bundled7z = sevenBin.path7za;

    // On Mac, check if bundled 7z exists and is executable
    if (isMac) {
        // Try system 7z first (more reliable on Mac)
        const brewPath = '/opt/homebrew/bin/7z';
        const usrPath = '/usr/local/bin/7z';
        if (fs.existsSync(brewPath)) return brewPath;
        if (fs.existsSync(usrPath)) return usrPath;

        // Check if bundled 7z exists
        if (bundled7z && fs.existsSync(bundled7z)) {
            return bundled7z;
        }

        // Fallback: try to find 7z in PATH
        try {
            const which7z = execSync('which 7z 2>/dev/null || which 7za 2>/dev/null', { encoding: 'utf-8' }).trim();
            if (which7z) return which7z;
        } catch (e) { }

        console.warn('[7z] No 7z found on Mac, some features may not work');
        return bundled7z; // Return bundled even if not found, will fail gracefully
    }

    return bundled7z;
}

const pathTo7zip = get7zPath();
console.log('[Init] 7z path:', pathTo7zip, 'exists:', fs.existsSync(pathTo7zip || ''));

const crackSessions = new Map();
const sessionManager = new SessionManager();
const NUM_WORKERS = Math.max(1, os.cpus().length - 1);

// Helper function to find session by JobID (timestamp) or SessionID (UUID)
// FRONTEND sends SessionID (UUID) for stop/force-stop
// BACKEND stores sessions by JobID (Timestamp)
function findSessionByIdOrSessionId(id) {
    // 1. Try direct lookup (assuming id is jobId)
    if (crackSessions.has(id)) {
        return crackSessions.get(id);
    }

    // 2. Iterate to find by sessionId
    // Optimization: This handles the case where frontend sends UUID but we stored by Timestamp
    for (const [jobId, session] of crackSessions.entries()) {
        if (session.sessionId === id) {
            console.log(`[Crack] Found session by sessionId: ${id} -> jobId: ${jobId}`);
            return session;
        }
    }

    return null;
}

// Helper function to send progress with stats
function sendCrackProgress(event, id, session, updates = {}) {
    if (!session.stats) return;

    const { attempts, speed, current, method, currentLength } = updates;

    if (attempts !== undefined) {
        session.stats.updateProgress(attempts, session.sessionData?.totalPasswords || 0);
    }
    // Only update speed if it's a positive number (don't reset to 0)
    if (speed !== undefined && speed > 0) {
        session.stats.updateSpeed(speed);
    }
    if (current !== undefined && session.currentPhase !== undefined) {
        session.stats.startPhase(current, 9); // 9 total phases (0-8)
    }

    const stats = session.stats.getSimpleStats();

    // ✅ Helper to send IPC messages (works with both ipcMain.on and ipcMain.handle)
    const sendReply = (channel, data) => {
        if (event.reply) {
            event.reply(channel, data);
        } else if (event.sender && event.sender.send) {
            event.sender.send(channel, data);
        } else {
            console.error('[Crack] Cannot send reply - no valid method available');
        }
    };

    // ✅ 获取原始数值（不是格式化后的字符串）用于前端格式化
    const rawStats = session.stats.getStats();

    sendReply('zip:crack-progress', {
        id,
        sessionId: session.sessionId, // ✅ Include sessionId for resume functionality
        attempts: session.stats.testedPasswords,
        speed: session.stats.currentSpeed,
        current: current || stats.phase,
        method: method || stats.phase,
        currentLength: currentLength || session.currentLength || 1,
        // Additional stats - 使用原始数值让前端格式化
        progress: rawStats.progress || 0,
        eta: rawStats.estimatedTimeRemaining || 0, // 原始秒数
        tested: rawStats.testedPasswords || 0,      // 原始数字
        total: rawStats.totalPasswords || 0         // 原始数字
    });
}

// ============ Cross-platform tool paths ============
function getHashcatPath() {
    let hashcatPath;
    if (isMac) {
        // Mac: hashcat binary (no .exe extension)
        hashcatPath = !app.isPackaged
            ? path.join(process.cwd(), 'resources', 'hashcat-mac', 'hashcat')
            : path.join(process.resourcesPath, 'hashcat', 'hashcat');
    } else {
        hashcatPath = !app.isPackaged
            ? path.join(process.cwd(), 'resources', 'hashcat', 'hashcat-6.2.6', 'hashcat.exe')
            : path.join(process.resourcesPath, 'hashcat', 'hashcat-6.2.6', 'hashcat.exe');
    }
    console.log('[Crack] getHashcatPath:', hashcatPath, 'exists:', fs.existsSync(hashcatPath), 'isPackaged:', app.isPackaged);
    return hashcatPath;
}

function getHashcatDir() {
    return path.dirname(getHashcatPath());
}

function getBkcrackPath() {
    if (isMac) {
        return !app.isPackaged
            ? path.join(process.cwd(), 'resources', 'bkcrack-mac', 'bkcrack')
            : path.join(process.resourcesPath, 'bkcrack', 'bkcrack');
    }
    return !app.isPackaged
        ? path.join(process.cwd(), 'resources', 'bkcrack', 'bkcrack.exe')
        : path.join(process.resourcesPath, 'bkcrack', 'bkcrack.exe');
}

function isHashcatAvailable() {
    try {
        const hashcatPath = getHashcatPath();
        if (!fs.existsSync(hashcatPath)) {
            console.log('[Hashcat] Binary not found at:', hashcatPath);
            return false;
        }

        // On Mac, do a safer check without GPU detection (which can cause crashes)
        if (isMac) {
            try {
                // Just check if hashcat binary is executable and responds to --version
                const result = execSync(`"${hashcatPath}" --version 2>/dev/null | head -1`, {
                    encoding: 'utf-8',
                    timeout: 3000
                });
                console.log('[Hashcat] Version check result:', result.trim());
                return result.includes('hashcat');
            } catch (e) {
                console.log('[Hashcat] Version check failed:', e.message);
                // On Mac, if hashcat version check fails, it's likely not working properly
                return false;
            }
        }

        return true;
    } catch (e) {
        console.log('[Hashcat] Availability check error:', e.message);
        return false;
    }
}

function getJohnToolPath(tool) {
    if (isMac) {
        // Mac version uses different tool names (no .exe)
        const macTool = tool.replace('.exe', '');
        return !app.isPackaged
            ? path.join(process.cwd(), 'resources', 'john-mac', 'run', macTool)
            : path.join(process.resourcesPath, 'john', 'run', macTool);
    }
    return !app.isPackaged
        ? path.join(process.cwd(), 'resources', 'john', 'john-1.9.0-jumbo-1-win64', 'run', tool)
        : path.join(process.resourcesPath, 'john', 'john-1.9.0-jumbo-1-win64', 'run', tool);
}

function isJohnToolAvailable(format) {
    try {
        const toolMap = isMac
            ? { 'zip': 'zip2john', 'rar': 'rar2john', '7z': '7z2hashcat.pl' }
            : { 'zip': 'zip2john.exe', 'rar': 'rar2john.exe', '7z': '7z2hashcat64-2.0.exe' };
        const tool = toolMap[format];
        if (!tool) return false;
        return fs.existsSync(getJohnToolPath(tool));
    } catch (e) { return false; }
}

function isBkcrackAvailable() {
    try { return fs.existsSync(getBkcrackPath()); } catch (e) { return false; }
}

// Get system 7z path (cross-platform)
function getSystem7zPath() {
    if (isMac) {
        // Mac: check common homebrew paths
        const brewPath = '/opt/homebrew/bin/7z';
        const usrPath = '/usr/local/bin/7z';
        if (fs.existsSync(brewPath)) return brewPath;
        if (fs.existsSync(usrPath)) return usrPath;
        return null;
    }
    // Windows
    const system7z = 'C:\\Program Files\\7-Zip\\7z.exe';
    if (fs.existsSync(system7z)) return system7z;
    return null;
}

// ============ Encryption Detection ============
async function detectEncryption(archivePath) {
    return new Promise((resolve, reject) => {
        try {
            const ext = path.extname(archivePath).toLowerCase();
            const isRar = ext === '.rar';

            // Use system 7z for RAR if available, otherwise use bundled 7zip-bin
            const system7z = getSystem7zPath();
            const use7z = (isRar && system7z) ? system7z : pathTo7zip;

            console.log('[detectEncryption] Starting detection for:', archivePath);
            console.log('[detectEncryption] Using 7z:', use7z, 'exists:', fs.existsSync(use7z || ''));

            // If 7z doesn't exist, return safe defaults
            if (!use7z || !fs.existsSync(use7z)) {
                console.log('[detectEncryption] 7z not found, using safe defaults');
                const format = ext === '.zip' ? 'zip' : (ext === '.rar' ? 'rar' : (ext === '.7z' ? '7z' : 'unknown'));
                resolve({
                    method: 'Unknown (7z not available)',
                    format,
                    isZipCrypto: false,
                    isAES: true, // Assume AES for safety
                    canUseBkcrack: false,
                    canUseHashcat: false,
                    recommendation: 'cpu'
                });
                return;
            }

            const proc = spawn(use7z, ['l', '-slt', '-p', archivePath], { windowsHide: true });
            let output = '';
            let resolved = false;

            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    console.log('[detectEncryption] Timeout - killing process');
                    try { proc.kill(); } catch (e) { }
                    resolve({ method: 'Unknown', format: 'unknown', isZipCrypto: false, isAES: false, canUseBkcrack: false, canUseHashcat: false, recommendation: 'cpu' });
                }
            }, 10000); // 10 second timeout

            proc.stdout.on('data', (data) => { output += data.toString(); });
            proc.stderr.on('data', (data) => { output += data.toString(); });

            proc.on('error', (err) => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timeout);
                console.log('[detectEncryption] Process error:', err.message);
                // Return safe defaults on error
                const format = ext === '.zip' ? 'zip' : (ext === '.rar' ? 'rar' : (ext === '.7z' ? '7z' : 'unknown'));
                resolve({
                    method: 'Unknown (error)',
                    format,
                    isZipCrypto: false,
                    isAES: true,
                    canUseBkcrack: false,
                    canUseHashcat: false,
                    recommendation: 'cpu'
                });
            });

            proc.on('close', () => {
                if (resolved) return;
                resolved = true;
                clearTimeout(timeout);
                // File type detection
                const isZip = ext === '.zip';
                const is7z = ext === '.7z';
                const typeMatch = output.match(/Type\s*=\s*(\w+)/i);
                const archiveType = typeMatch ? typeMatch[1] : '';
                const methodMatch = output.match(/Method\s*=\s*(.+)/i);
                const encryptedMatch = output.match(/Encrypted\s*=\s*\+/i);
                let method = methodMatch ? methodMatch[1].trim() : '';
                // �����ܣ�ͨ�� Encrypted = + ��ǣ�����ͨ���������?"Cannot open encrypted archive"
                const hasEncryptedError = output.toLowerCase().includes('cannot open encrypted archive') || output.toLowerCase().includes('headers error');
                const isEncrypted = !!encryptedMatch || method.toLowerCase().includes('aes') || method.toLowerCase().includes('zipcrypto') || hasEncryptedError;

                // ZIP ??????
                let isZipCrypto = false, isAES = false;
                if (isZip) {
                    isZipCrypto = method.toLowerCase().includes('zipcrypto');
                    isAES = method.toLowerCase().includes('aes');
                    if (!isZipCrypto && !isAES && isEncrypted) {
                        isAES = true;
                    }
                    if (!method || method === 'Unknown') {
                        method = isZipCrypto ? 'ZipCrypto' : (isAES ? 'AES-256' : 'Unknown');
                    }
                }

                // RAR ??????
                let isRar5 = false, isRar3 = false;
                if (isRar) {
                    isRar5 = archiveType === 'Rar5' || output.includes('Type = Rar5');
                    isRar3 = archiveType === 'Rar' || (output.includes('Type = Rar') && !isRar5);

                    // ?????????
                    const hasAES = method.toLowerCase().includes('aes');
                    if (isRar5) {
                        method = 'RAR5 AES-256';
                        isAES = true;
                    } else if (isRar3) {
                        method = 'RAR3 AES-128';
                        isAES = true;
                    } else if (isEncrypted || hasAES) {
                        method = 'RAR AES';
                        isAES = true;
                        isRar5 = true; // ?????? RAR5
                    }
                }

                // 7z ���ܼ��?
                let is7zAES = false;
                if (is7z) {
                    // 7z �ļ�����м��ܴ�����߼�⵽���ܣ�����Ϊ��?AES ����
                    is7zAES = method.toLowerCase().includes('7zaes') || method.toLowerCase().includes('aes') || isEncrypted || hasEncryptedError;
                    if (is7zAES) method = '7z AES-256';
                    isAES = is7zAES;
                }

                // ??? Hashcat ??
                let hashcatMode = null;
                if (isZip && isAES) hashcatMode = '13600';
                else if (isZip && isZipCrypto) hashcatMode = '17200';
                else if (isRar5) hashcatMode = '13000';
                else if (isRar3) hashcatMode = '12500';
                else if (is7zAES) hashcatMode = '11600';

                const format = isZip ? 'zip' : (isRar ? 'rar' : (is7z ? '7z' : 'unknown'));

                // ✅ 移除 7z 文件大小限制 - 7z2hashcat 只读取加密头部，不需要读取整个文件
                // 大文件应该可以正常工作
                let fileTooLarge = false;
                if (is7z) {
                    try {
                        const stats = fs.statSync(archivePath);
                        // 只记录日志，不限制大小
                        if (stats.size > 100 * 1024 * 1024) { // 100MB
                            console.log('[detectEncryption] Large 7z file detected:', Math.round(stats.size / 1024 / 1024), 'MB - hash extraction may take longer');
                        }
                        // fileTooLarge 保持为 false，允许 GPU 处理
                    } catch (e) { }
                }

                // ��ϸ������־
                const hashcatAvail = isHashcatAvailable();
                const johnToolAvail = isJohnToolAvailable(format);
                console.log('[detectEncryption] Hashcat check:', { hashcatAvail, hashcatMode, johnToolAvail, format, fileTooLarge, isEncrypted });

                const canUseHashcat = hashcatAvail && hashcatMode !== null && johnToolAvail && !fileTooLarge;
                const canUseBkcrack = isZipCrypto && isBkcrackAvailable();

                // ???????
                let recommendation = 'cpu';
                if (canUseBkcrack) recommendation = 'bkcrack';
                else if (canUseHashcat) recommendation = 'hashcat';

                console.log('[detectEncryption] Result:', { method, format: isZip ? 'zip' : (isRar ? 'rar' : (is7z ? '7z' : 'unknown')), isEncrypted, hashcatMode });

                resolve({
                    method: method || 'Unknown',
                    format: isZip ? 'zip' : (isRar ? 'rar' : (is7z ? '7z' : 'unknown')),
                    isZipCrypto,
                    isAES,
                    isRar5,
                    isRar3,
                    is7zAES,
                    hashcatMode,
                    canUseBkcrack,
                    canUseHashcat,
                    fileTooLarge,
                    recommendation
                });
            });
        } catch (err) {
            console.error('[detectEncryption] Unexpected error:', err);
            const ext = path.extname(archivePath).toLowerCase();
            const format = ext === '.zip' ? 'zip' : (ext === '.rar' ? 'rar' : (ext === '.7z' ? '7z' : 'unknown'));
            resolve({
                method: 'Unknown (exception)',
                format,
                isZipCrypto: false,
                isAES: true,
                canUseBkcrack: false,
                canUseHashcat: false,
                recommendation: 'cpu'
            });
        }
    });
}
// ============ ???????????????? ============
const FILE_SIGNATURES = {
    'png': { offset: 0, bytes: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) },
    'jpg': { offset: 0, bytes: Buffer.from([0xFF, 0xD8, 0xFF]) },
    'pdf': { offset: 0, bytes: Buffer.from('%PDF-1.') },
    'zip': { offset: 0, bytes: Buffer.from([0x50, 0x4B, 0x03, 0x04]) },
    'xml': { offset: 0, bytes: Buffer.from('<?xml version') },
    'docx': { offset: 0, bytes: Buffer.from([0x50, 0x4B, 0x03, 0x04]) },
    'xlsx': { offset: 0, bytes: Buffer.from([0x50, 0x4B, 0x03, 0x04]) },
};

function getKnownPlaintext(filename) {
    const ext = path.extname(filename).toLowerCase().slice(1);
    return FILE_SIGNATURES[ext] || null;
}

// ============ Password Testing ============
function tryPasswordFast(archivePath, password) {
    return new Promise((resolve) => {
        try {
            const ext = path.extname(archivePath).toLowerCase();
            const isRar = ext === '.rar';

            // Use system 7z for RAR if available, otherwise use bundled 7zip-bin
            const system7z = getSystem7zPath();
            const use7z = (isRar && system7z) ? system7z : pathTo7zip;

            // Check if 7z exists
            if (!use7z || !fs.existsSync(use7z)) {
                console.warn('[tryPasswordFast] 7z not found');
                resolve(false);
                return;
            }

            const proc = spawn(use7z, ['t', '-p' + password, '-y', archivePath], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
            let resolved = false;
            proc.on('close', (code) => { if (!resolved) { resolved = true; resolve(code === 0); } });
            proc.on('error', () => { if (!resolved) { resolved = true; resolve(false); } });
            setTimeout(() => { if (!resolved) { resolved = true; try { proc.kill(); } catch (e) { } resolve(false); } }, 2000);
        } catch (err) {
            console.error('[tryPasswordFast] Error:', err);
            resolve(false);
        }
    });
}
function generatePasswordBatch(charset, length, startIdx, batchSize) {
    const chars = charset.split(''), charLen = chars.length, passwords = [], total = Math.pow(charLen, length);
    for (let i = 0; i < batchSize && (startIdx + i) < total; i++) {
        let pwd = '', rem = startIdx + i;
        for (let j = 0; j < length; j++) { pwd = chars[rem % charLen] + pwd; rem = Math.floor(rem / charLen); }
        passwords.push(pwd);
    }
    return passwords;
}

// ============ CPU ???????? (使用批量测试优化) ============
async function crackWithCPU(archivePath, options, event, id, session, startTime) {
    const { mode, charset, minLength, maxLength, dictionaryPath } = options;
    let totalAttempts = 0, found = null, currentLength = minLength || 1;

    // Initialize stats if not already done
    if (!session.stats) {
        session.stats = new StatsCollector(id);
    }
    session.stats.startPhase('CPU Batch', 8);

    // 创建批量测试管理器
    const batchManager = new BatchTestManager(100);
    const system7z = getSystem7zPath();

    // Mac特殊处理：确保使用正确的7z路径
    let use7z = system7z || pathTo7zip;
    if (isMac && (!use7z || !fs.existsSync(use7z))) {
        console.log('[Crack] Mac: 7z not found, trying alternative paths...');
        const alternatives = ['/opt/homebrew/bin/7z', '/usr/local/bin/7z', '/usr/bin/7z'];
        for (const alt of alternatives) {
            if (fs.existsSync(alt)) {
                use7z = alt;
                console.log('[Crack] Mac: Using 7z at:', alt);
                break;
            }
        }
    }

    if (!use7z || !fs.existsSync(use7z)) {
        console.error('[Crack] Mac: No working 7z found, cannot proceed with CPU cracking');
        return { found: null, attempts: totalAttempts, error: 'No 7z tool available' };
    }

    console.log('[Crack] Using 7z path:', use7z);

    const testBatch = async (passwords) => {
        for (const pwd of passwords) {
            if (!session.active || found) return;

            // 添加密码到批量管理器
            batchManager.addPassword(pwd);

            // 当批次满时，执行批量测试
            if (batchManager.shouldTest()) {
                const result = await batchManager.testBatch(archivePath, use7z);
                totalAttempts += result.tested;

                if (result.success) {
                    found = result.password;
                    return;
                }

                // 更新进度 - 使用 helper
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = elapsed > 0 ? Math.round(totalAttempts / elapsed) : 0;
                sendCrackProgress(event, id, session, {
                    attempts: totalAttempts,
                    speed,
                    current: pwd,
                    method: 'CPU Batch',
                    currentLength
                });

                // 让出事件循环，防止 UI 冻结
                await new Promise(resolve => setImmediate(resolve));
            }
        }

        // 测试剩余的密码
        if (!found && batchManager.getQueueSize() > 0) {
            const result = await batchManager.flush(archivePath, use7z);
            totalAttempts += result.tested;
            if (result.success) {
                found = result.password;
            }
        }
    };
    if (mode === 'dictionary') {
        console.log('[Crack] Dictionary mode');
        let totalWords = 0;

        if (dictionaryPath && fs.existsSync(dictionaryPath)) {
            const dictWords = fs.readFileSync(dictionaryPath, 'utf-8').split('\n').filter(l => l.trim());
            console.log('[Crack] Custom dictionary words:', dictWords.length);
            for (const word of dictWords) {
                if (!session.active || found) break;
                const variants = applyRules(word.trim());
                totalWords += variants.length;
                await testBatch(variants);
            }
        }

        if (!found && session.active) {
            // 1. 先使用 SMART_DICTIONARY（高频密码）
            console.log('[Crack] Using SMART_DICTIONARY with', SMART_DICTIONARY.length, 'base words');
            for (const word of SMART_DICTIONARY) {
                if (!session.active || found) break;
                const variants = applyRules(word);
                totalWords += variants.length;
                console.log(`[Crack] Testing word "${word}" with ${variants.length} variants (total tested: ${totalWords})`);
                await testBatch(variants);
            }

            // 2. 如果还没找到，使用 rockyou 字典
            if (!found && session.active) {
                // Mac上查找rockyou字典的路径
                let rockyouPath = null;
                const possiblePaths = [
                    // 如果hashcat可用，尝试hashcat目录
                    ...(isHashcatAvailable() ? [
                        path.join(getHashcatDir(), 'rockyou.txt'),
                        path.join(getHashcatDir(), 'combined_wordlist.txt')
                    ] : []),
                    // 系统路径
                    '/usr/share/wordlists/rockyou.txt',
                    '/opt/homebrew/share/wordlists/rockyou.txt',
                    '/usr/local/share/wordlists/rockyou.txt',
                    // 应用资源路径
                    path.join(process.resourcesPath || process.cwd(), 'hashcat', 'rockyou.txt'),
                    path.join(process.resourcesPath || process.cwd(), 'hashcat', 'combined_wordlist.txt')
                ];

                for (const testPath of possiblePaths) {
                    if (fs.existsSync(testPath)) {
                        rockyouPath = testPath;
                        break;
                    }
                }

                if (rockyouPath) {
                    console.log('[Crack] Using rockyou dictionary:', rockyouPath);
                    try {
                        // 读取 rockyou 字典（分批读取，避免内存问题）
                        const rockyouContent = fs.readFileSync(rockyouPath, 'utf-8');
                        const rockyouWords = rockyouContent.split('\n').filter(l => l.trim());
                        console.log('[Crack] Rockyou dictionary loaded:', rockyouWords.length, 'words');

                        // 分批处理 rockyou（每 1000 个词一批，避免内存爆炸）
                        const batchSize = 1000;
                        for (let i = 0; i < rockyouWords.length && session.active && !found; i += batchSize) {
                            const batch = rockyouWords.slice(i, i + batchSize);
                            console.log(`[Crack] Processing rockyou batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(rockyouWords.length / batchSize)} (${batch.length} words)`);

                            for (const word of batch) {
                                if (!session.active || found) break;
                                // 对 rockyou 中的词，只应用基本规则（避免生成太多变体）
                                const variants = [word.trim(), word.trim() + '123', word.trim() + '1'];
                                totalWords += variants.length;
                                await testBatch(variants);
                            }
                        }
                    } catch (err) {
                        console.error('[Crack] Error reading rockyou dictionary:', err.message);
                    }
                } else {
                    console.log('[Crack] Rockyou dictionary not found at any expected location');
                    console.log('[Crack] Searched paths:', possiblePaths);
                }
            }
        }

        console.log('[Crack] Dictionary mode completed. Total password variants tested:', totalWords);
    } else {
        console.log('[Crack] Bruteforce mode');
        const cs = charset || 'abcdefghijklmnopqrstuvwxyz0123456789';
        const minLen = minLength || 1, maxLen = Math.min(maxLength || 6, 10);
        const gen = smartPasswordGenerator({ minLength: minLen, maxLength: maxLen });
        let batch = [];
        let totalGenerated = 0;

        for (const pwd of gen) {
            if (!session.active || found) break;
            batch.push(pwd);
            totalGenerated++;

            if (batch.length >= 100) {
                console.log(`[Crack] Testing batch of ${batch.length} passwords (total generated: ${totalGenerated})`);
                await testBatch(batch);
                batch = [];
            }
        }

        if (batch.length > 0 && session.active && !found) {
            console.log(`[Crack] Testing final batch of ${batch.length} passwords`);
            await testBatch(batch);
        }

        console.log('[Crack] Bruteforce mode completed. Total passwords generated:', totalGenerated);
    }
    return { found, attempts: totalAttempts };
}

// ============ CPU 多线程破解 (支持恢复) ============
async function crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime, resumeState = null) {
    const { mode, charset, minLength, maxLength, dictionaryPath } = options;

    // 获取恢复状态
    const previousAttempts = resumeState?.previousAttempts || 0;
    const resumeStartIdx = resumeState?.cpuStartIdx || 0;

    console.log('[Crack] CPU Multi-thread mode, resumeStartIdx:', resumeStartIdx, 'previousAttempts:', previousAttempts);

    // Worker 路径 - 开发环境在 out/main，打包后在 resources
    const workerPath = !app.isPackaged
        ? path.join(process.cwd(), 'out', 'main', 'crackWorker.js')
        : path.join(process.resourcesPath, 'app.asar.unpacked', 'out', 'main', 'crackWorker.js');

    // 如果 Worker 不存在，回退到单线程模式
    if (!fs.existsSync(workerPath)) {
        console.log('[Crack] Worker not found at:', workerPath, '- fallback to single-thread');
        sendCrackProgress(event, id, session, {
            attempts: previousAttempts,
            speed: 0,
            current: 'Starting...',
            method: 'CPU Single'
        });
        return crackWithCPU(archivePath, options, event, id, session, startTime);
    }

    console.log('[Crack] Multi-thread CPU mode with', NUM_WORKERS, 'workers');
    sendCrackProgress(event, id, session, {
        attempts: previousAttempts,
        speed: 0,
        current: 'Starting workers...',
        method: 'CPU Multi-thread'
    });

    let found = null;
    const workers = [];
    const workerProgress = new Map(); // 记录每个 worker 的进度

    const cleanup = () => {
        workers.forEach(w => { try { w.terminate(); } catch (e) { } });
        workers.length = 0;
    };
    session.cleanup = cleanup;

    return new Promise((resolve) => {
        let completedWorkers = 0;
        let globalStartIdx = resumeStartIdx; // 用于保存当前进度

        // 计算总尝试次数
        const getTotalAttempts = () => {
            let total = previousAttempts;
            workerProgress.forEach(v => total += v);
            return total;
        };

        for (let i = 0; i < NUM_WORKERS; i++) {
            const worker = new Worker(workerPath);
            workers.push(worker);
            workerProgress.set(i, 0);

            worker.on('message', (msg) => {
                if (!session.active || found) return;

                if (msg.type === 'progress') {
                    // 更新每个 worker 的进度
                    workerProgress.set(i, msg.tested);
                    const totalAttempts = getTotalAttempts();
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = elapsed > 0 ? Math.round(totalAttempts / elapsed) : 0;

                    // 保存当前进度到 session，用于恢复
                    if (msg.currentIdx !== undefined) {
                        session.cpuStartIdx = Math.max(session.cpuStartIdx || 0, msg.currentIdx);
                    }

                    sendCrackProgress(event, id, session, {
                        attempts: totalAttempts,
                        speed,
                        current: msg.current,
                        currentLength: msg.currentLength,
                        method: 'CPU Multi-thread'
                    });
                } else if (msg.type === 'found') {
                    found = msg.password;
                    console.log('[Crack] Password found by worker', i, ':', found);
                    cleanup();
                    resolve({ found, attempts: getTotalAttempts() });
                } else if (msg.type === 'done') {
                    console.log('[Crack] Worker', i, 'completed');
                    completedWorkers++;
                    if (completedWorkers >= NUM_WORKERS) {
                        resolve({ found: null, attempts: getTotalAttempts() });
                    }
                } else if (msg.type === 'error') {
                    console.error('[Crack] Worker', i, 'error:', msg.error);
                    completedWorkers++;
                    if (completedWorkers >= NUM_WORKERS && !found) {
                        resolve({ found: null, attempts: getTotalAttempts() });
                    }
                }
            });

            worker.on('error', (err) => {
                console.error('[Worker Error]', i, err);
                completedWorkers++;
                if (completedWorkers >= NUM_WORKERS && !found) {
                    resolve({ found: null, attempts: getTotalAttempts() });
                }
            });
        }

        // 根据模式分配任务给 workers
        const cs = charset || 'abcdefghijklmnopqrstuvwxyz0123456789';
        const minLen = minLength || 1;
        const maxLen = Math.min(maxLength || 6, 8);

        if (mode === 'dictionary') {
            // 字典模式
            let allWords = [];
            if (dictionaryPath && fs.existsSync(dictionaryPath)) {
                allWords = fs.readFileSync(dictionaryPath, 'utf-8').split('\n').filter(l => l.trim()).map(l => l.trim());
            }
            // 合并 SMART_DICTIONARY，去重
            allWords = [...SMART_DICTIONARY, ...allWords.filter(w => !SMART_DICTIONARY.includes(w))];

            // 如果有恢复状态，跳过已测试的词
            if (resumeStartIdx > 0 && resumeStartIdx < allWords.length) {
                console.log('[Crack] Resuming dictionary from index:', resumeStartIdx);
                allWords = allWords.slice(resumeStartIdx);
            }

            console.log('[Crack] Dictionary mode with', allWords.length, 'words');

            // 均匀分配词汇给每个 worker
            const workerChunks = Array.from({ length: NUM_WORKERS }, () => []);
            allWords.forEach((word, idx) => {
                workerChunks[idx % NUM_WORKERS].push(word);
            });

            workers.forEach((worker, idx) => {
                const chunk = workerChunks[idx];
                console.log('[Crack] Sending', chunk.length, 'words to worker', idx);
                worker.postMessage({
                    type: 'dictionary',
                    archivePath,
                    words: chunk,
                    pathTo7zip,
                    startIdx: resumeStartIdx // 传递起始索引用于进度报告
                });
            });
        } else {
            // 暴力破解模式
            let totalPasswords = 0;
            for (let len = minLen; len <= maxLen; len++) {
                totalPasswords += Math.pow(cs.length, len);
            }

            // 计算实际的起始位置（考虑恢复）
            const effectiveStartIdx = resumeStartIdx;
            const remainingPasswords = totalPasswords - effectiveStartIdx;

            console.log('[Crack] Bruteforce mode with', totalPasswords, 'total passwords, starting from:', effectiveStartIdx);

            const chunkSize = Math.ceil(remainingPasswords / NUM_WORKERS);
            workers.forEach((worker, idx) => {
                const workerStartIdx = effectiveStartIdx + (idx * chunkSize);
                const workerEndIdx = Math.min(effectiveStartIdx + ((idx + 1) * chunkSize), totalPasswords);

                worker.postMessage({
                    type: 'bruteforce',
                    archivePath,
                    charset: cs,
                    minLength: minLen,
                    maxLength: maxLen,
                    startIdx: workerStartIdx,
                    endIdx: workerEndIdx,
                    pathTo7zip
                });
            });
        }
    });
}
// ============ Hash Extraction ============
// ============ Hash Extraction (Cross-platform) ============

function extractZipHash(archivePath) {
    return new Promise((resolve, reject) => {
        const toolName = isMac ? 'zip2john' : 'zip2john.exe';
        const zip2johnPath = getJohnToolPath(toolName);
        if (!fs.existsSync(zip2johnPath)) { reject(new Error('zip2john not found')); return; }
        const proc = spawn(zip2johnPath, [archivePath], { windowsHide: true });
        let output = '', error = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { error += data.toString(); });
        proc.on('close', (code) => {
            if (output.trim()) {
                console.log('[extractZipHash] Raw output length:', output.length, 'bytes');
                console.log('[extractZipHash] First 500 chars:', output.substring(0, 500));

                // ✅ 支持多种 ZIP hash 格式：
                // - $zip2$...*$/zip2$ (WinZip AES, hashcat mode 13600) - 必须以 $/zip2$ 结尾!
                // - $pkzip$... 或 $pkzip2$... (ZipCrypto, hashcat mode 17200)

                // ⚠️ ZIP 文件可能包含多个加密文件，每个文件一行 hash
                // 我们只需要第一个有效的 hash 即可
                const lines = output.split('\n').filter(l => l.trim());
                console.log('[extractZipHash] Total lines from zip2john:', lines.length);

                let bestHash = null;
                let bestHashName = '';

                for (const line of lines) {
                    // 跳过太短的行
                    if (line.length < 20) continue;

                    // WinZip AES: 匹配从 $zip2$ 到 $/zip2$ 的完整 hash（单行内）
                    // 格式: $zip2$*0*3*0*...*$/zip2$
                    // ⚠️ 使用 .*? 非贪婪匹配，但限制在单行内（不包含换行符）
                    const winzipMatch = line.match(/\$zip2\$[^\n]*?\$\/zip2\$/);
                    if (winzipMatch) {
                        const hash = winzipMatch[0];
                        // 选择最小的有效 hash（小文件的 hash 更可靠）
                        if (!bestHash || hash.length < bestHash.length) {
                            bestHash = hash;
                            bestHashName = '$zip2$ (WinZip AES)';
                            console.log('[extractZipHash] Found WinZip hash, length:', hash.length);
                            // 如果找到一个合理大小的 hash，立即使用
                            if (hash.length < 10000) break;
                        }
                    }

                    // PKZIP: 匹配 $pkzip$ 或 $pkzip2$ 开头的 hash
                    if (!bestHash) {
                        const pkzipMatch = line.match(/\$pkzip2?\$[^\s]{10,5000}/);
                        if (pkzipMatch) {
                            bestHash = pkzipMatch[0];
                            bestHashName = '$pkzip$ (ZipCrypto)';
                            console.log('[extractZipHash] Found PKZIP hash, length:', bestHash.length);
                            if (bestHash.length < 5000) break;
                        }
                    }
                }

                if (bestHash) {
                    console.log('[extractZipHash] ✅ Selected ' + bestHashName + ' hash');
                    console.log('[extractZipHash] Hash length:', bestHash.length, 'bytes');
                    console.log('[extractZipHash] Hash preview:', bestHash.substring(0, 200) + '...');

                    // ⚠️ 注意：大型 hash (>500KB) 将在 crackWithHashcat 中被检测并回退到 CPU 模式
                    // 这是因为 hashcat 无法处理过大的 hash（GPU 内存限制）
                    // 截断 hash 会导致格式无效，hashcat 报 "No hashes loaded"
                    if (bestHash.length > 500000) {
                        console.log('[extractZipHash] ⚠️ Hash is very large (' + Math.round(bestHash.length / 1024 / 1024) + 'MB) - will use CPU mode');
                    }

                    resolve(bestHash);
                } else {
                    // 回退：尝试提取冒号后的内容（John the Ripper 格式：filename:hash）
                    const lines = output.split('\n').filter(l => l.trim());
                    for (const line of lines) {
                        if (line.includes(':')) {
                            const hash = line.split(':').slice(1).join(':').trim();
                            if (hash && hash.startsWith('$')) {
                                console.log('[extractZipHash] ✅ Extracted hash from JtR format:', hash.substring(0, 100) + '...');
                                resolve(hash);
                                return;
                            }
                        }
                    }
                    // 最后回退 - 但必须限制大小！
                    console.log('[extractZipHash] ⚠️ Using fallback extraction - no standard pattern matched');
                    let fallbackHash = output.split(':')[1] || output.trim();
                    // 限制 hash 大小（正常 hash 应该 < 5KB）
                    if (fallbackHash.length > 5000) {
                        console.log('[extractZipHash] ❌ Fallback hash too large:', fallbackHash.length, 'bytes, truncating to 5000');
                        fallbackHash = fallbackHash.substring(0, 5000);
                    }
                    console.log('[extractZipHash] Fallback hash (first 200 chars):', fallbackHash.substring(0, 200));
                    resolve(fallbackHash);
                }
            } else { reject(new Error(error || 'zip2john failed')); }
        });
        proc.on('error', reject);
    });
}

function extractRarHash(archivePath) {
    return new Promise((resolve, reject) => {
        const toolName = isMac ? 'rar2john' : 'rar2john.exe';
        const rar2johnPath = getJohnToolPath(toolName);
        if (!fs.existsSync(rar2johnPath)) { reject(new Error('rar2john not found')); return; }
        const proc = spawn(rar2johnPath, [archivePath], { windowsHide: true });
        let output = '', error = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { error += data.toString(); });
        proc.on('close', (code) => {
            if (output.trim()) {
                // RAR5: $rar5$... RAR3: $RAR3$...
                const match = output.match(/\$rar[35]\$[^\s:]+/i);
                if (match) resolve(match[0]);
                else resolve(output.split(':')[1] || output.trim());
            } else { reject(new Error(error || 'rar2john failed')); }
        });
        proc.on('error', reject);
    });
}

function extract7zHash(archivePath) {
    return new Promise((resolve, reject) => {
        let toolName, toolPath, proc;

        if (isMac) {
            // Mac: 7z2hashcat is a Perl script (.pl)
            toolName = '7z2hashcat.pl';
            toolPath = getJohnToolPath(toolName);
            if (!fs.existsSync(toolPath)) {
                reject(new Error('7z2hashcat.pl not found at ' + toolPath));
                return;
            }
            // Run with perl interpreter
            proc = spawn('perl', [toolPath, archivePath], { windowsHide: true });
        } else {
            // Windows: 7z2hashcat is an executable
            toolName = '7z2hashcat64-2.0.exe';
            toolPath = getJohnToolPath(toolName);
            if (!fs.existsSync(toolPath)) {
                reject(new Error('7z2hashcat not found at ' + toolPath));
                return;
            }
            proc = spawn(toolPath, [archivePath], { windowsHide: true });
        }

        let output = '', error = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { error += data.toString(); });
        proc.on('close', (code) => {
            if (output.trim()) {
                // 7z: $7z$...
                const match = output.match(/\$7z\$[^\s:]+/i);
                if (match) resolve(match[0]);
                else resolve(output.split(':')[1] || output.trim());
            } else { reject(new Error(error || '7z2hashcat failed')); }
        });
        proc.on('error', reject);
    });
}

async function extractHash(archivePath, encryption) {
    const ext = path.extname(archivePath).toLowerCase();

    // Cross-platform tool mapping
    const toolMap = isMac ? {
        '.zip': 'zip2john',
        '.rar': 'rar2john',
        '.7z': '7z2hashcat.pl'
    } : {
        '.zip': 'zip2john.exe',
        '.rar': 'rar2john.exe',
        '.7z': '7z2hashcat64-2.0.exe'
    };

    const tool = toolMap[ext];
    if (!tool) {
        throw new Error('Unsupported format: ' + ext);
    }

    const toolPath = getJohnToolPath(tool);
    if (!fs.existsSync(toolPath)) {
        throw new Error(tool + ' not found at ' + toolPath);
    }

    try {
        if (ext === '.zip') return await extractZipHash(archivePath);
        if (ext === '.rar') return await extractRarHash(archivePath);
        if (ext === '.7z') return await extract7zHash(archivePath);
        throw new Error('Unsupported format: ' + ext);
    } catch (err) {
        console.log('[Crack] Hash extraction failed:', err.message);
        throw err;
    }
}
// ============ GPU 攻击阶段顺序 - 基于概率论优化 ============
// 排序依据：Expected Value = Hit Rate / Candidate Space
// 数据来源：RockYou (2009) + Kaspersky (2024) 密码泄露分析
// 
// Character Class Distribution (统计事实):
// - 纯小写: 41%    - 混合大小写: 8%
// - 纯数字: 16%    - 含特殊字符: <3.5%
// - 小写+数字: 28%
//
const GPU_ATTACK_PHASES = {
    0: { name: 'Top10K', method: 'Hashcat GPU Top 10K', description: 'Top 10K Common Passwords', hitRate: '6.5%', space: '10K' },
    0.5: { name: 'Context', method: 'Context-Aware Attack', description: 'Social Engineering + Date Patterns', hitRate: '5%', space: '20K' },
    1: { name: 'Keyboard', method: 'Hashcat GPU Keyboard', description: 'Keyboard Patterns (qwerty/123456)', hitRate: '10%', space: '5K' },
    2: { name: 'DigitBrute', method: 'Hashcat GPU Digits', description: 'Pure Digits 1-10 (16% of passwords)', hitRate: '16%', space: '11B' },
    2.5: { name: 'LowerBrute', method: 'Hashcat GPU Lowercase', description: 'Lowercase 1-8 (41% of passwords)', hitRate: '41%', space: '208B' },
    3: { name: 'AlphaNumBrute', method: 'Hashcat GPU Alphanumeric', description: 'Lowercase+Digits 1-8 (28%)', hitRate: '28%', space: '2.8T' },
    4: { name: 'Dictionary', method: 'Hashcat GPU Dictionary', description: 'Full Dictionary (14M passwords)', hitRate: '15%', space: '14M' },
    5: { name: 'Rule', method: 'Hashcat GPU Rule Attack', description: 'Dictionary + Rule Transforms', hitRate: '10%', space: '500M' },
    6: { name: 'AI', method: 'PassGPT AI Generator', description: 'AI Password Generation', hitRate: '5%', space: '10K' },
    7: { name: 'Mask', method: 'Hashcat GPU Smart Mask', description: 'Pattern-based Masks', hitRate: '8%', space: 'varies' },
    8: { name: 'Hybrid', method: 'Hashcat GPU Hybrid', description: 'Hybrid Attack (word+digits)', hitRate: '5%', space: 'varies' },
    9: { name: 'CPU', method: 'CPU Smart Dictionary', description: 'CPU Fallback', hitRate: '2%', space: 'varies' }
};

// 智能掩码模式 - 基于统计概率排序
// 数据来源：密码泄露统计分析
// 
// 格式概率分布：
// - word+digits (如 hello12): ~25% 的密码
// - pure digits: ~16%
// - pure lowercase: ~41%
// - Capitalized+digits: ~8%
// - with symbols: <3.5%
//
const SMART_MASKS = [
    // === 最高概率: lowercase + digits (25% of passwords) ===
    { mask: '?l?l?l?l?l?l?d?d', desc: '6lower+2digit', prob: 'very high' },  // admin12, hello99
    { mask: '?l?l?l?l?l?d?d', desc: '5lower+2digit', prob: 'very high' },    // hello12, admin01
    { mask: '?l?l?l?l?d?d?d?d', desc: '4lower+4digit', prob: 'high' },       // test1234
    { mask: '?l?l?l?l?l?l?l?d', desc: '7lower+1digit', prob: 'high' },       // abcdefg1
    { mask: '?l?l?l?d?d?d?d', desc: '3lower+4digit', prob: 'high' },         // abc1234
    { mask: '?l?l?l?l?d?d?d', desc: '4lower+3digit', prob: 'high' },         // test789

    // === 高概率: pure lowercase (41% 但长度限制空间) ===
    { mask: '?l?l?l?l?l?l', desc: '6 lowercase', prob: 'high' },
    { mask: '?l?l?l?l?l?l?l', desc: '7 lowercase', prob: 'high' },
    { mask: '?l?l?l?l?l?l?l?l', desc: '8 lowercase', prob: 'medium' },

    // === 高概率: pure digits (16% of passwords) ===
    { mask: '?d?d?d?d?d?d', desc: '6-digit PIN', prob: 'very high' },
    { mask: '?d?d?d?d?d?d?d', desc: '7-digit', prob: 'high' },
    { mask: '?d?d?d?d?d?d?d?d', desc: '8-digit', prob: 'high' },
    { mask: '?d?d?d?d?d?d?d?d?d?d', desc: '10-digit', prob: 'medium' },

    // === 中概率: Capitalized + digits (8% of passwords) ===
    { mask: '?u?l?l?l?l?l?d?d', desc: 'Cap+5lower+2digit', prob: 'medium' },  // Hello12
    { mask: '?u?l?l?l?l?l?l?d', desc: 'Cap+6lower+1digit', prob: 'medium' },  // Welcome1
    { mask: '?u?l?l?l?l?l?l?l?d', desc: 'Cap+7lower+1digit', prob: 'medium' }, // Password1
    { mask: '?u?l?l?l?l?l?l?d?d', desc: 'Cap+6lower+2digit', prob: 'medium' },
    { mask: '?u?l?l?l?l?l?l?l?d?d', desc: 'Cap+7lower+2digit', prob: 'medium' },

    // === 中概率: year patterns (常见birthday/year后缀) ===
    { mask: '?l?l?l?l?l?l?d?d?d?d', desc: '6lower+year', prob: 'medium' },    // admin2024
    { mask: '?u?l?l?l?l?l?d?d?d?d', desc: 'Cap+5lower+year', prob: 'medium' }, // Hello2024
    { mask: '?u?l?l?l?l?l?l?d?d?d?d', desc: 'Cap+6lower+year', prob: 'low' },
    { mask: '?u?l?l?l?l?l?l?l?d?d?d?d', desc: 'Cap+7lower+year', prob: 'low' },
    { mask: '?l?l?l?l?l?l?l?l?d?d', desc: '8lower+2digit', prob: 'low' },

    // === 低概率: with symbols (<3.5% of passwords) - 放最后 ===
    { mask: '?u?l?l?l?l?l?d?d?d?s', desc: 'Cap+5lower+3digit+sym', prob: 'low' },
    { mask: '?u?l?l?l?l?l?d?d?d?d?s', desc: 'Cap+5lower+year+sym', prob: 'very low' },
    { mask: '?u?l?l?l?l?l?l?l?s?d', desc: 'Cap+7lower+sym+digit', prob: 'very low' }
];

// ��Ϲ�����׺
const HYBRID_SUFFIXES = ['?d?d?d?d', '?d?d?d?d?s', '?d?d?d', '?d?d?d?s', '?d?d?s', '?s'];
// ����ģʽ���� - ����������λ
const KEYBOARD_PATTERNS = [
    'qwerty', 'qwerty123', 'qwertyuiop', 'qwer1234',
    'asdfgh', 'asdfghjk', 'asdf1234',
    'zxcvbn', 'zxcvbnm',
    '1qaz2wsx', 'qazwsx', '1q2w3e4r', 'q1w2e3r4',
    '123qwe', 'qwe123', 'asd123',
    '147258369', '159357', '741852963',
    'password', 'password1', 'password123', 'passw0rd',
    'admin', 'admin123', 'root', 'root123',
    'letmein', 'welcome', 'monkey', 'dragon',
    'master', 'login', 'abc123', 'iloveyou',
    '111111', '123123', '666666', '888888',
    'woaini', 'woaini520', '5201314', 'aini520'
];

// ============ 通用 Hashcat 阶段执行函数 ============
async function runHashcatPhase(hashFile, outFile, hashMode, args, phaseName, event, id, session, previousAttempts = 0) {
    const hashcatPath = getHashcatPath();
    const hashcatDir = getHashcatDir();

    return new Promise((resolve) => {
        // ✅ 使用 status-timer=1 更频繁地获取状态（每1秒）
        const fullArgs = ['-m', hashMode, hashFile, ...args, '-o', outFile, '--potfile-disable', '-w', '3', '--status', '--status-timer=1'];

        console.log(`[Crack] Phase ${phaseName}: hashcat ${fullArgs.join(' ')}`);

        const proc = spawn(hashcatPath, fullArgs, { cwd: hashcatDir, windowsHide: true });
        session.process = proc;

        let totalAttempts = previousAttempts, lastSpeed = 0;
        const startTime = Date.now();

        proc.stdout.on('data', (data) => {
            const line = data.toString();
            const speedMatch = line.match(/Speed[^:]*:\s*([\d.]+)\s*([kMGT]?)H\/s/i);
            if (speedMatch) {
                let speed = parseFloat(speedMatch[1]);
                const unit = speedMatch[2].toUpperCase();
                if (unit === 'K') speed *= 1000;
                else if (unit === 'M') speed *= 1000000;
                else if (unit === 'G') speed *= 1000000000;
                lastSpeed = Math.round(speed);
            }
            const progressMatch = line.match(/Progress[^:]*:\s*(\d+)/i);
            if (progressMatch) totalAttempts = previousAttempts + parseInt(progressMatch[1]);

            if (lastSpeed > 0) {
                sendCrackProgress(event, id, session, {
                    attempts: totalAttempts,
                    speed: lastSpeed,
                    current: phaseName,
                    method: GPU_ATTACK_PHASES[session.currentPhase]?.method || phaseName
                });
            }
        });

        proc.stderr.on('data', (data) => {
            const msg = data.toString();
            if (!msg.includes('nvmlDeviceGetFanSpeed') && !msg.includes('WARN')) {
                console.log(`[Hashcat ${phaseName}]`, msg.substring(0, 200));
            }
        });

        proc.on('close', (code) => {
            let found = null;
            if (fs.existsSync(outFile)) {
                const content = fs.readFileSync(outFile, 'utf-8').trim();
                const parts = content.split(':');
                if (parts.length >= 2) found = parts[parts.length - 1];
            }

            // ✅ 如果运行太快没有获取到速度，估算一个速度
            const elapsedMs = Date.now() - startTime;
            if (lastSpeed === 0 && elapsedMs > 0 && totalAttempts > previousAttempts) {
                lastSpeed = Math.round((totalAttempts - previousAttempts) / (elapsedMs / 1000));
                console.log(`[Crack] Phase ${phaseName} ran too fast for status update, estimated speed: ${lastSpeed} pwd/s`);
            }

            // ✅ 发送最终进度更新
            sendCrackProgress(event, id, session, {
                attempts: totalAttempts,
                speed: lastSpeed > 0 ? lastSpeed : 1000, // 默认最低显示 1000 pwd/s
                current: phaseName + ' (complete)',
                method: GPU_ATTACK_PHASES[session.currentPhase]?.method || phaseName
            });

            console.log(`[Crack] Phase ${phaseName} finished, code: ${code}, found: ${!!found}`);
            resolve({ found, attempts: totalAttempts, exhausted: code === 1 || code === 0 });
        });

        proc.on('error', (err) => {
            console.log(`[Crack] Phase ${phaseName} error:`, err.message);
            resolve({ found: null, attempts: totalAttempts, exhausted: false, error: true });
        });
    });
}

// ============ Phase 5: 规则攻击 ============
async function runRuleAttack(hashFile, outFile, hashMode, event, id, session, previousAttempts) {
    const hashcatDir = getHashcatDir();
    const wordlist = path.join(hashcatDir, 'combined_wordlist.txt');

    // Try multiple rule files in order of effectiveness
    const ruleFiles = ['dive.rule', 'best64.rule', 'rockyou-30000.rule', 'd3ad0ne.rule'];
    let rulePath = null;
    for (const rule of ruleFiles) {
        const testPath = path.join(hashcatDir, 'rules', rule);
        if (fs.existsSync(testPath)) {
            rulePath = testPath;
            console.log('[Crack] Using rule file:', rule);
            break;
        }
    }

    if (!rulePath) {
        console.log('[Crack] No rule files found, skipping rule attack');
        return { found: null, attempts: previousAttempts, exhausted: true };
    }

    session.currentPhase = 5;
    sendCrackProgress(event, id, session, {
        attempts: previousAttempts,
        speed: 0,
        current: 'Starting rule attack...',
        method: 'Hashcat GPU Rule Attack'
    });

    const args = ['-a', '0', '-r', rulePath, wordlist];
    return runHashcatPhase(hashFile, outFile, hashMode, args, 'Rule Attack', event, id, session, previousAttempts);
}

// ============ Phase 6: 智能掩码攻击 ============
async function runMaskAttack(hashFile, outFile, hashMode, event, id, session, previousAttempts) {
    session.currentPhase = 6;
    let totalAttempts = previousAttempts;

    for (const maskConfig of SMART_MASKS) {
        if (!session.active) break;

        sendCrackProgress(event, id, session, {
            attempts: totalAttempts,
            speed: 0,
            current: `Mask: ${maskConfig.desc}`,
            method: 'Hashcat GPU Smart Mask'
        });

        const args = ['-a', '3', maskConfig.mask];
        const result = await runHashcatPhase(hashFile, outFile, hashMode, args, `Mask (${maskConfig.desc})`, event, id, session, totalAttempts);

        totalAttempts = result.attempts;
        if (result.found) return result;
    }

    return { found: null, attempts: totalAttempts, exhausted: true };
}

// ============ Phase 7: 混合攻击 ============
async function runHybridAttack(hashFile, outFile, hashMode, event, id, session, previousAttempts) {
    const hashcatDir = getHashcatDir();
    const wordlist = path.join(hashcatDir, 'combined_wordlist.txt');

    session.currentPhase = 7;
    let totalAttempts = previousAttempts;

    // Mode 6: wordlist + mask (word + digits)
    for (const suffix of HYBRID_SUFFIXES) {
        if (!session.active) break;

        sendCrackProgress(event, id, session, {
            attempts: totalAttempts,
            speed: 0,
            current: `Hybrid: word+${suffix}`,
            method: 'Hashcat GPU Hybrid'
        });

        const args = ['-a', '6', wordlist, suffix];
        const result = await runHashcatPhase(hashFile, outFile, hashMode, args, `Hybrid (word+${suffix})`, event, id, session, totalAttempts);

        totalAttempts = result.attempts;
        if (result.found) return result;
    }

    // Mode 7: mask + wordlist (digits + word) - ֻ��һ��
    if (session.active) {
        sendCrackProgress(event, id, session, {
            attempts: totalAttempts,
            speed: 0,
            current: 'Hybrid: ?d?d?d?d+word',
            method: 'Hashcat GPU Hybrid'
        });

        const args = ['-a', '7', '?d?d?d?d', wordlist];
        const result = await runHashcatPhase(hashFile, outFile, hashMode, args, 'Hybrid (?d?d?d?d+word)', event, id, session, totalAttempts);

        totalAttempts = result.attempts;
        if (result.found) return result;
    }

    return { found: null, attempts: totalAttempts, exhausted: true };
}


// ============ Phase 3: 键盘模式攻击 ============
async function runKeyboardAttack(hashFile, outFile, hashMode, event, id, session, previousAttempts) {
    const hashcatDir = getHashcatDir();
    session.currentPhase = 3;

    // ������ʱ����ģʽ�ֵ�
    const keyboardDict = path.join(hashcatDir, 'keyboard_patterns.txt');

    // ���ɼ���ģʽ����
    const variants = new Set();
    for (const pattern of KEYBOARD_PATTERNS) {
        variants.add(pattern);
        variants.add(pattern.toUpperCase());
        variants.add(pattern.charAt(0).toUpperCase() + pattern.slice(1));
        // �������ֺ�׺
        for (const suffix of ['1', '12', '123', '!', '1!', '2024', '2023']) {
            variants.add(pattern + suffix);
            variants.add(pattern.charAt(0).toUpperCase() + pattern.slice(1) + suffix);
        }
    }

    fs.writeFileSync(keyboardDict, Array.from(variants).join('\n'));
    console.log(`[Crack] Created keyboard patterns dict with ${variants.size} entries`);

    sendCrackProgress(event, id, session, {
        attempts: previousAttempts,
        speed: 0,
        current: 'Keyboard patterns attack...',
        method: 'Hashcat GPU Keyboard'
    });

    const args = ['-a', '0', keyboardDict];
    const result = await runHashcatPhase(hashFile, outFile, hashMode, args, 'Keyboard Patterns', event, id, session, previousAttempts);

    // ������ʱ�ļ�
    try { fs.unlinkSync(keyboardDict); } catch (e) { }

    return result;
}

// ============ Phase 0: AI Password Generation (PassGPT) - Streaming ============
async function runAIPhase(archivePath, event, id, session, previousAttempts, startTime, phaseState = {}) {
    console.log('[Crack] Phase 0: AI Password Generation (PassGPT) - Streaming Mode');
    session.currentPhase = 0;

    // Streaming configuration
    const BATCH_SIZE = 100;        // Generate 100 passwords per batch
    const MAX_BATCHES = 100;       // Maximum 100 batches
    const TOTAL_LIMIT = 10000;     // Total limit: 10,000 passwords

    // Resume from saved batch if available
    const startBatch = phaseState.batchIndex || 1;
    console.log('[Crack] AI Phase: Starting from batch', startBatch, '/', MAX_BATCHES);

    // Check if PassGPT model is available
    const generator = new PassGPTGenerator();

    // ✅ Save generator reference to session for cleanup on stop
    session.passgptGenerator = generator;

    if (!generator.isAvailable()) {
        console.log('[Crack] PassGPT model not available, skipping AI phase');
        return { found: null, attempts: previousAttempts, skipped: true };
    }

    sendCrackProgress(event, id, session, {
        attempts: previousAttempts,
        current: 'Loading AI model...',
        method: 'PassGPT AI Streaming'
    });

    try {
        // Load PassGPT model
        const loaded = await generator.loadModel();
        if (!loaded) {
            console.log('[Crack] Failed to load PassGPT model, skipping AI phase');
            return { found: null, attempts: previousAttempts, skipped: true };
        }

        console.log('[Crack] PassGPT model loaded successfully');
        console.log(`[Crack] Streaming config: ${BATCH_SIZE} pwd/batch, max ${MAX_BATCHES} batches, limit ${TOTAL_LIMIT}`);

        // Streaming generation and testing
        const batchManager = new BatchTestManager(100);
        const system7z = getSystem7zPath();
        let totalAttempts = previousAttempts;
        let totalGenerated = (startBatch - 1) * BATCH_SIZE; // Account for already generated passwords
        let found = null;

        // Stream: Generate batch → Test batch → Repeat (starting from startBatch)
        for (let batchNum = startBatch; batchNum <= MAX_BATCHES && !found && session.active; batchNum++) {
            // Save current batch index to phase state
            session.phaseState = { batchIndex: batchNum };

            // Calculate how many passwords to generate in this batch
            const remaining = TOTAL_LIMIT - totalGenerated;
            const batchCount = Math.min(BATCH_SIZE, remaining);

            if (batchCount <= 0) break;

            // Update progress: Generating (don't send speed: 0 to avoid resetting display)
            sendCrackProgress(event, id, session, {
                attempts: totalAttempts,
                current: `AI Batch ${batchNum}/${MAX_BATCHES}: Generating ${batchCount} passwords...`,
                method: 'PassGPT AI Streaming'
            });

            // Generate one batch of passwords
            const batchPasswords = await generator.generatePasswords(
                batchCount,  // Generate batch size
                1.0,         // Temperature (balanced)
                50           // Top-K sampling
            );

            totalGenerated += batchPasswords.length;
            console.log(`[Crack] Batch ${batchNum}: Generated ${batchPasswords.length} passwords (total: ${totalGenerated}/${TOTAL_LIMIT})`);

            // Update progress: Testing (don't send speed: 0 to avoid resetting display)
            sendCrackProgress(event, id, session, {
                attempts: totalAttempts,
                current: `AI Batch ${batchNum}/${MAX_BATCHES}: Testing ${batchPasswords.length} passwords...`,
                method: 'PassGPT AI Streaming'
            });

            // Test this batch immediately
            for (const pwd of batchPasswords) {
                if (!session.active || found) break;

                batchManager.addPassword(pwd);

                if (batchManager.shouldTest()) {
                    const result = await batchManager.testBatch(archivePath, system7z);
                    totalAttempts += result.tested;

                    if (result.success) {
                        found = result.password;
                        console.log(`[Crack] ✅ Password found in batch ${batchNum}:`, found);
                        break;
                    }

                    // Update progress with speed
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = elapsed > 0 ? Math.round((totalAttempts - previousAttempts) / elapsed) : 0;
                    sendCrackProgress(event, id, session, {
                        attempts: totalAttempts,
                        speed,
                        current: `AI Batch ${batchNum}/${MAX_BATCHES}: ${totalAttempts - previousAttempts}/${totalGenerated} tested`,
                        method: 'PassGPT AI Streaming'
                    });

                    // Yield to event loop
                    await new Promise(resolve => setImmediate(resolve));
                }
            }

            // Test remaining passwords in batch
            if (!found && batchManager.getQueueSize() > 0) {
                const result = await batchManager.flush(archivePath, system7z);
                totalAttempts += result.tested;
                if (result.success) {
                    found = result.password;
                    console.log(`[Crack] ✅ Password found in batch ${batchNum} (flush):`, found);
                }
            }

            // Early stop if password found
            if (found) {
                console.log(`[Crack] Early stop: Password found after ${batchNum} batches (${totalGenerated} passwords generated)`);
                break;
            }

            // Progress update after batch completion
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = elapsed > 0 ? Math.round((totalAttempts - previousAttempts) / elapsed) : 0;
            console.log(`[Crack] Batch ${batchNum} complete: ${totalAttempts - previousAttempts} tested, ${speed} pwd/s`);
        }

        // Release model resources
        await generator.dispose();

        if (found) {
            console.log('[Crack] ✅ AI Phase SUCCESS: Password found:', found);
            console.log(`[Crack] Stats: ${totalGenerated} generated, ${totalAttempts - previousAttempts} tested`);
        } else {
            console.log('[Crack] AI Phase completed: No password found');
            console.log(`[Crack] Stats: ${totalGenerated} generated, ${totalAttempts - previousAttempts} tested`);
        }

        return { found, attempts: totalAttempts };

    } catch (err) {
        console.error('[Crack] AI phase error:', err.message);
        // Graceful degradation - continue to next phase
        return { found: null, attempts: previousAttempts, error: true };
    }
}

// ============ Phase 1: Top 10K常见密码攻击 ============
async function runTop10KAttack(hashFile, outFile, hashMode, event, id, session, previousAttempts) {
    const hashcatDir = getHashcatDir();
    session.currentPhase = 1;

    // 使用字典的前10K行作为Top 10K常见密码
    let dictPath = path.join(hashcatDir, 'rockyou.txt');
    if (!fs.existsSync(dictPath)) {
        dictPath = path.join(hashcatDir, 'combined_wordlist.txt');
    }

    if (!fs.existsSync(dictPath)) {
        console.log('[Crack] No dictionary found for Top 10K attack, skipping');
        return { found: null, attempts: previousAttempts, exhausted: true };
    }

    // 创建临时Top 10K字典文件
    const top10kDict = path.join(hashcatDir, 'top10k_temp.txt');
    try {
        const fullDict = fs.readFileSync(dictPath, 'utf-8');
        const lines = fullDict.split('\n').filter(l => l.trim()).slice(0, 10000);
        fs.writeFileSync(top10kDict, lines.join('\n'));
        console.log('[Crack] Created Top 10K dictionary with', lines.length, 'passwords');
    } catch (err) {
        console.log('[Crack] Failed to create Top 10K dictionary:', err.message);
        return { found: null, attempts: previousAttempts, exhausted: true };
    }

    sendCrackProgress(event, id, session, {
        attempts: previousAttempts,
        speed: 0,
        current: 'Top 10K common passwords...',
        method: 'Hashcat GPU Top 10K'
    });

    const args = ['-a', '0', top10kDict];
    const result = await runHashcatPhase(hashFile, outFile, hashMode, args, 'Top 10K', event, id, session, previousAttempts);

    // 清理临时文件
    try { fs.unlinkSync(top10kDict); } catch (e) { }

    return result;
}

// ============ Phase 2: 1-6位短密码暴力破解 ============
// 优化策略：先尝试纯数字（最快），再尝试纯字母，最后全字符集
async function runShortBruteforce(hashFile, outFile, hashMode, event, id, session, previousAttempts) {
    session.currentPhase = 2;
    let totalAttempts = previousAttempts;

    // ========== Phase 2a: 纯数字 1-10位 (极快！) ==========
    // 520694 这样的6位数字密码在这里秒破！
    // 10^10 = 100亿，但GPU速度通常在10亿+/秒，所以10位以内都很快
    console.log('[Crack] Phase 2a: Pure Digits Bruteforce (1-10 chars)');
    console.log('[Crack] Total: 10^1 + 10^2 + ... + 10^10 ≈ 111亿，GPU秒级完成');

    sendCrackProgress(event, id, session, {
        attempts: totalAttempts,
        speed: 0,
        current: 'Pure Digits (1-10 chars)...',
        method: 'Hashcat GPU Digits Only'
    });

    const digitArgs = [
        '-a', '3',
        '--increment',
        '--increment-min=1',
        '--increment-max=10',
        '?d?d?d?d?d?d?d?d?d?d'  // 10个?d
    ];

    let result = await runHashcatPhase(hashFile, outFile, hashMode, digitArgs, 'Pure Digits (1-10)', event, id, session, totalAttempts);
    totalAttempts = result.attempts;
    if (result.found) return result;

    // ========== Phase 2b: 纯小写字母 1-6位 ==========
    if (session.active) {
        console.log('[Crack] Phase 2b: Lowercase Only (1-6 chars)');
        console.log('[Crack] Total: 26^6 ≈ 308M');

        sendCrackProgress(event, id, session, {
            attempts: totalAttempts,
            speed: 0,
            current: 'Lowercase Only (1-6 chars)...',
            method: 'Hashcat GPU Lowercase'
        });

        const lowerArgs = [
            '-a', '3',
            '--increment',
            '--increment-min=1',
            '--increment-max=6',
            '?l?l?l?l?l?l'
        ];

        result = await runHashcatPhase(hashFile, outFile, hashMode, lowerArgs, 'Lowercase (1-6)', event, id, session, totalAttempts);
        totalAttempts = result.attempts;
        if (result.found) return result;
    }

    // ========== Phase 2c: 小写+数字 1-6位 ==========
    if (session.active) {
        console.log('[Crack] Phase 2c: Lowercase + Digits (1-6 chars)');
        console.log('[Crack] Total: 36^6 ≈ 2.2B');

        sendCrackProgress(event, id, session, {
            attempts: totalAttempts,
            speed: 0,
            current: 'Lowercase+Digits (1-6 chars)...',
            method: 'Hashcat GPU Alphanumeric'
        });

        // 使用自定义字符集：小写+数字
        const alphanumArgs = [
            '-a', '3',
            '-1', '?l?d',  // 自定义字符集1 = 小写+数字
            '--increment',
            '--increment-min=1',
            '--increment-max=6',
            '?1?1?1?1?1?1'
        ];

        result = await runHashcatPhase(hashFile, outFile, hashMode, alphanumArgs, 'Alphanumeric (1-6)', event, id, session, totalAttempts);
        totalAttempts = result.attempts;
        if (result.found) return result;
    }

    // ========== Phase 2d: 全字符集 1-4位（仅短密码）==========
    // 只做1-4位全字符集，5-6位太慢了（735B组合）
    if (session.active) {
        console.log('[Crack] Phase 2d: Full Charset (1-4 chars only)');
        console.log('[Crack] Total: 95^4 ≈ 81M');

        sendCrackProgress(event, id, session, {
            attempts: totalAttempts,
            speed: 0,
            current: 'Full Charset (1-4 chars)...',
            method: 'Hashcat GPU Full Charset'
        });

        const fullArgs = [
            '-a', '3',
            '--increment',
            '--increment-min=1',
            '--increment-max=4',  // 只到4位，避免5-6位耗时太长
            '?a?a?a?a'
        ];

        result = await runHashcatPhase(hashFile, outFile, hashMode, fullArgs, 'Full Charset (1-4)', event, id, session, totalAttempts);
        totalAttempts = result.attempts;
        if (result.found) return result;
    }

    console.log('[Crack] Phase 2 complete, total attempts:', totalAttempts);
    return { found: null, attempts: totalAttempts, exhausted: true };
}

// ============ 扩展暴力破解 (7-8 字符, 小写+数字) ============
// 专门针对像 abcd789, hello123 这样的常见 7-8 字符密码
async function runExtendedBruteforce(hashFile, outFile, hashMode, event, id, session, previousAttempts) {
    console.log('[Crack] Extended Bruteforce: 7-8 chars with lowercase + digits');
    console.log('[Crack] This covers common passwords like: abcd789, hello123, pass1234');
    console.log('[Crack] Character set: a-z (26) + 0-9 (10) = 36 characters');
    console.log('[Crack] Space: 7 chars = 78B, 8 chars = 2.8T (may take a while)');

    sendCrackProgress(event, id, session, {
        attempts: previousAttempts,
        speed: 0,
        current: 'Extended Bruteforce (7-8 chars, alphanumeric)...',
        method: 'Hashcat GPU Extended Bruteforce'
    });

    // 定义自定义字符集: 小写字母 + 数字
    // hashcat 里用 -1 定义自定义字符集 1，然后用 ?1 引用
    const customCharset = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const mask = '?1?1?1?1?1?1?1?1'; // 8 个自定义字符位置

    const args = [
        '-a', '3',                          // 暴力破解模式
        '-1', customCharset,                // 自定义字符集 1: 小写+数字
        '--increment',                      // 递增模式（从 7 开始）
        '--increment-min=7',                // 最小长度 7
        '--increment-max=8',                // 最大长度 8
        mask                                // 掩码
    ];

    console.log('[Crack] Hashcat args:', args.join(' '));

    return runHashcatPhase(hashFile, outFile, hashMode, args, 'Extended Bruteforce (7-8)', event, id, session, previousAttempts);
}


// ============ GPU Bruteforce 用户自定义模式（Custom模式专用）============
async function runHashcatBruteforce(archivePath, encryption, options, event, id, session, startTime, previousAttempts = 0) {
    const { charset, minLength, maxLength } = options;
    const hashcatPath = getHashcatPath();
    const hashcatDir = getHashcatDir();

    console.log('[Crack] Starting GPU bruteforce attack (Custom mode)');
    console.log('[Crack] User settings - charset:', charset ? charset.substring(0, 30) + '...' : 'default', 'length:', minLength, '-', maxLength);

    let hash;
    try {
        hash = await extractHash(archivePath, encryption);
    } catch (err) {
        console.log('[Crack] Hash extraction failed for bruteforce:', err.message);
        return { found: null, attempts: previousAttempts };
    }

    const tempDir = path.join(os.tmpdir(), 'hashcat-brute-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    const hashFile = path.join(tempDir, 'hash.txt');
    const outFile = path.join(tempDir, 'cracked.txt');
    fs.writeFileSync(hashFile, hash);

    return new Promise((resolve) => {
        const hashMode = encryption.hashcatMode || '17200';

        const minLen = minLength || 1;
        const maxLen = Math.min(maxLength || 8, 10); // GPU 最大支持10位

        // 构建hashcat参数 - 使用用户自定义字符集
        let args;
        if (charset && charset.length > 0) {
            // 用户提供了自定义字符集，使用-1参数
            const mask = '?1'.repeat(maxLen);
            args = [
                '-m', hashMode,
                '-a', '3',                      // 暴力破解模式
                '-1', charset,                  // 自定义字符集
                hashFile,
                '-o', outFile,
                '--potfile-disable',
                '-w', '3',
                '--status',
                '--status-timer=2',
                '--increment',
                '--increment-min=' + minLen,
                '--increment-max=' + maxLen,
                mask                            // 使用自定义字符集的掩码
            ];
            console.log('[Crack] Using custom charset:', charset.length, 'characters');
        } else {
            // 没有提供字符集，使用默认的?a（所有可打印字符）
            const mask = '?a'.repeat(maxLen);
            args = [
                '-m', hashMode,
                '-a', '3',                      // 暴力破解模式
                hashFile,
                '-o', outFile,
                '--potfile-disable',
                '-w', '3',
                '--status',
                '--status-timer=2',
                '--increment',
                '--increment-min=' + minLen,
                '--increment-max=' + maxLen,
                mask                            // 使用默认字符集的掩码
            ];
            console.log('[Crack] Using default charset: all printable characters');
        }

        console.log('[Crack] GPU Bruteforce command:', hashcatPath, args.join(' '));
        console.log('[Crack] Bruteforce range:', minLen, '-', maxLen, 'characters');

        const proc = spawn(hashcatPath, args, { cwd: hashcatDir, windowsHide: true });
        session.process = proc;

        let totalAttempts = previousAttempts, lastSpeed = 0, currentLength = minLen;

        proc.stdout.on('data', (data) => {
            const line = data.toString();

            // 解析速度
            const speedMatch = line.match(/Speed[^:]*:\s*([\d.]+)\s*([kMGT]?)H\/s/i);
            if (speedMatch) {
                let speed = parseFloat(speedMatch[1]);
                const unit = speedMatch[2].toUpperCase();
                if (unit === 'K') speed *= 1000;
                else if (unit === 'M') speed *= 1000000;
                else if (unit === 'G') speed *= 1000000000;
                lastSpeed = Math.round(speed);
            }

            // 解析进度
            const progressMatch = line.match(/Progress[^:]*:\s*(\d+)/i);
            if (progressMatch) totalAttempts = previousAttempts + parseInt(progressMatch[1]);

            // 解析当前长度
            const lengthMatch = line.match(/Guess\.Mask[^:]*:\s*\?[a1]{(\d+)}/i);
            if (lengthMatch) currentLength = parseInt(lengthMatch[1]);

            if (lastSpeed > 0) {
                sendCrackProgress(event, id, session, {
                    attempts: totalAttempts,
                    speed: lastSpeed,
                    current: `Custom bruteforce (${currentLength} chars)...`,
                    method: 'Hashcat GPU Custom Bruteforce',
                    currentLength
                });
            }
        });

        proc.stderr.on('data', (data) => {
            const msg = data.toString();
            if (!msg.includes('nvmlDeviceGetFanSpeed')) {
                console.log('[Hashcat Custom Brute]', msg);
            }
        });

        proc.on('close', (code) => {
            let found = null;
            if (fs.existsSync(outFile)) {
                const content = fs.readFileSync(outFile, 'utf-8').trim();
                const parts = content.split(':');
                if (parts.length >= 2) found = parts[parts.length - 1];
            }
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) { }

            console.log('[Crack] Custom GPU bruteforce finished, code:', code, 'found:', !!found);
            resolve({ found, attempts: totalAttempts });
        });

        proc.on('error', (err) => {
            console.log('[Crack] Custom GPU bruteforce error:', err.message);
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) { }
            resolve({ found: null, attempts: totalAttempts });
        });
    });
}
// ============ Hashcat GPU 破解主流程 ============
async function crackWithHashcat(archivePath, options, event, id, session, startTime, encryption = null) {
    const hashcatPath = getHashcatPath();
    const hashcatDir = getHashcatDir();
    const attackMode = options.mode || 'dictionary'; // 'dictionary' or 'bruteforce'
    const isBruteforceMode = attackMode === 'bruteforce';

    console.log('[Crack] Attack mode selected:', attackMode, '- Skip dictionary phases:', isBruteforceMode);

    // === 科学优化：文件上下文分析 ===
    const fileContext = contextAnalyzer.analyze(archivePath, encryption);
    console.log('[Crack] File context analysis:', {
        complexity: fileContext.complexity,
        estimatedDifficulty: fileContext.estimatedDifficulty,
        recommendations: fileContext.recommendations
    });
    session.fileContext = fileContext;  // 保存到session供后续使用

    // === 科学优化：GPU参数自动调优 ===
    let gpuOptimizer = null;
    let gpuParams = null;
    if (fs.existsSync(hashcatPath)) {
        gpuOptimizer = new GPUOptimizer(hashcatPath);
        await gpuOptimizer.detectGPU();
        gpuParams = gpuOptimizer.getOptimalParams();
        session.gpuParams = gpuParams;
        console.log('[Crack] GPU optimization:', gpuParams);
    }

    // === 科学优化：获取历史学习的优先掩码 ===
    const learnedMasks = patternLearner.generatePriorityMasks();
    if (learnedMasks.length > 0) {
        console.log('[Crack] Learned patterns available:', learnedMasks.length);
        session.learnedMasks = learnedMasks;
    }

    const hashcatAvailable = fs.existsSync(hashcatPath);

    if (!encryption) {
        encryption = await detectEncryption(archivePath);
    }

    console.log('[Crack] Starting GPU/AI crack pipeline, format:', encryption.format, 'hashcat:', hashcatAvailable);

    // Mac特殊处理：如果hashcat不可用，直接跳到CPU模式
    if (isMac && !hashcatAvailable) {
        console.log('[Crack] Mac: Hashcat not available, falling back to CPU mode');
        return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
    }

    let totalAttempts = 0;
    session.currentPhase = 0;

    // ✅ HASHCAT优先模式：只要hashcat存在就直接使用，不检查canUseHashcat
    // 如果hashcat真的不支持这种格式，让它返回错误再fallback到CPU
    if (!hashcatAvailable) {
        console.log('[Crack] ⚠️ Hashcat binary not found, running AI phase then CPU fallback');

        // 先运行 AI Phase
        if (session.active && !isBruteforceMode) {
            console.log('[Crack] Phase AI: PassGPT Password Generation');
            const aiResult = await runAIPhase(archivePath, event, id, session, totalAttempts, startTime);
            totalAttempts = aiResult.attempts;
            if (aiResult.found) {
                return { found: aiResult.found, attempts: totalAttempts };
            }
        }

        // 然后降级到 CPU
        sendCrackProgress(event, id, session, {
            attempts: totalAttempts,
            speed: 0,
            current: 'Continuing with CPU...',
            method: 'CPU Multi-thread'
        });
        return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
    }

    // 提取 hash（只有在 hashcat 可用时才需要）
    let hash;
    try {
        hash = await extractHash(archivePath, encryption);
        console.log('[Crack] Extracted hash:', hash.substring(0, 50) + '...');
    } catch (err) {
        console.log('[Crack] Hash extraction failed:', err.message);
        sendCrackProgress(event, id, session, {
            attempts: totalAttempts,
            speed: 0,
            current: 'Hash extraction failed, using CPU...',
            method: 'CPU Multi-thread'
        });
        return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
    }

    // 创建临时文件
    const tempDir = path.join(os.tmpdir(), 'hashcat-pipeline-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    const hashFile = path.join(tempDir, 'hash.txt');
    const outFile = path.join(tempDir, 'cracked.txt');

    // ✅ 验证 hash 长度和内容
    console.log('[Crack] === HASH VALIDATION ===');
    console.log('[Crack] Hash length:', hash.length, 'bytes');
    console.log('[Crack] Hash first 200 chars:', hash.substring(0, 200));
    console.log('[Crack] Hash last 50 chars:', hash.substring(hash.length - 50));

    // ⚠️ 验证 hash 格式 - 不仅仅是大小
    // WinZip hash 可能很大但只要格式正确就应该能工作
    const isValidWinZip = hash.startsWith('$zip2$') && hash.endsWith('$/zip2$');
    const isValidPkzip = hash.startsWith('$pkzip') && hash.includes('$');
    const isValidRar = hash.startsWith('$rar') || hash.startsWith('$RAR');
    const isValid7z = hash.startsWith('$7z$');

    if (hash.length > 500000) {
        // 超过 500KB 的 hash - GPU 无法处理这么大的 hash（内存限制）
        // 这通常发生在大型压缩文件中，每个文件都会生成一个巨大的 hash
        console.log('[Crack] ⚠️ Hash is too large for GPU (' + Math.round(hash.length / 1024 / 1024) + 'MB)');
        console.log('[Crack] This is expected for large archives - GPU cannot handle hashes > 500KB');
        console.log('[Crack] Using CPU Multi-thread mode instead (still effective for simple passwords)');
        return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
    } else if (hash.length > 10000 && !isValidWinZip && !isValidPkzip && !isValidRar && !isValid7z) {
        // 大于 10KB 且没有有效结束标记 - 可能是损坏的 hash
        console.log('[Crack] ❌ CRITICAL: Large hash without valid format! Falling back to CPU mode...');
        return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
    } else if (hash.length > 10000) {
        // 大 hash 但格式正确 - 警告但继续
        console.log('[Crack] ⚠️ Large hash (' + hash.length + ' bytes) but format appears valid, continuing...');
    }

    fs.writeFileSync(hashFile, hash);

    // 验证文件写入
    const writtenSize = fs.statSync(hashFile).size;
    console.log('[Crack] Hash file written:', hashFile);
    console.log('[Crack] Hash file size:', writtenSize, 'bytes');

    // ✅ 根据实际 hash 格式确定 hashcat 模式（而不是依赖 7z 检测）
    // 这是因为 7z 检测可能与 zip2john 提取的格式不一致
    let hashMode = encryption.hashcatMode || '17200';

    // ZIP hash 格式检测
    if (hash.startsWith('$pkzip2$') || hash.startsWith('$pkzip$')) {
        // PKZIP / ZipCrypto 格式
        hashMode = '17200';
        console.log('[Crack] ✅ Hash format detected: PKZIP ($pkzip2$) → mode 17200');
    } else if (hash.startsWith('$zip2$')) {
        // WinZip AES 格式
        hashMode = '13600';
        console.log('[Crack] ✅ Hash format detected: WinZip AES ($zip2$) → mode 13600');
    } else if (hash.startsWith('$rar5$')) {
        hashMode = '13000';
        console.log('[Crack] ✅ Hash format detected: RAR5 → mode 13000');
    } else if (hash.startsWith('$RAR3$') || hash.startsWith('$rar3$')) {
        hashMode = '12500';
        console.log('[Crack] ✅ Hash format detected: RAR3 → mode 12500');
    } else if (hash.startsWith('$7z$')) {
        hashMode = '11600';
        console.log('[Crack] ✅ Hash format detected: 7z → mode 11600');
    } else {
        console.log('[Crack] ⚠️ Unknown hash format, using detection mode:', hashMode);
    }

    console.log('[Crack] Final hashcat mode:', hashMode);

    try {
        // ========== Phase 0: Top 10K常见密码（几秒，30-40%命中率）==========
        session.currentPhase = 0;
        if (session.active && !isBruteforceMode) {
            console.log('[Crack] Phase 0: Top 10K Common Passwords');
            const result = await runTop10KAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;

            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        } else if (isBruteforceMode) {
            console.log('[Crack] Skipping Phase 0 (Top 10K) - Bruteforce mode selected');
        }

        // ========== Phase 0.5: Advanced Context Attack (社会工程+日期+键盘模式) ==========
        // Uses file path context to generate targeted password candidates
        if (session.active && !isBruteforceMode) {
            console.log('[Crack] Phase 0.5: Advanced Context Attack (Social Engineering + Date + Keyboard Walk)');
            sendCrackProgress(event, id, session, {
                attempts: totalAttempts,
                speed: 0,
                current: 'Advanced context-aware attack...',
                method: 'Context Attack (Smart)'
            });

            try {
                const advancedManager = new AdvancedAttackModeManager({
                    priorityMode: 'speed',
                    maxCandidatesPerMode: 5000,
                    enabledModes: ['social', 'date', 'keyboard']
                });

                const system7z = getSystem7zPath();
                const batchManager = new BatchTestManager(100);
                let advancedFound = null;
                let advancedTested = 0;
                const advancedStartTime = Date.now();

                // Create test callback for advanced attack manager
                const testCallback = async (password) => {
                    batchManager.addPassword(password);

                    if (batchManager.shouldTest()) {
                        const result = await batchManager.testBatch(archivePath, system7z);
                        advancedTested += result.tested;
                        totalAttempts += result.tested;

                        if (result.success) {
                            return { success: true, password: result.password };
                        }

                        // Update progress periodically
                        const elapsed = (Date.now() - advancedStartTime) / 1000;
                        const speed = elapsed > 0 ? Math.round(advancedTested / elapsed) : 0;
                        sendCrackProgress(event, id, session, {
                            attempts: totalAttempts,
                            speed,
                            current: `Context attack: ${advancedTested} tested`,
                            method: 'Context Attack (Smart)'
                        });
                    }
                    return { success: false };
                };

                // Execute advanced attacks
                const advancedResult = await advancedManager.executeAdvancedAttacks(
                    { filePath: archivePath },
                    testCallback
                );

                // Flush remaining passwords in batch
                if (!advancedResult.success && batchManager.getQueueSize() > 0) {
                    const flushResult = await batchManager.flush(archivePath, system7z);
                    advancedTested += flushResult.tested;
                    totalAttempts += flushResult.tested;
                    if (flushResult.success) {
                        advancedResult.success = true;
                        advancedResult.password = flushResult.password;
                    }
                }

                if (advancedResult.success) {
                    console.log('[Crack] ✅ Password found by Advanced Context Attack:', advancedResult.password);
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    return { found: advancedResult.password, attempts: totalAttempts };
                }

                console.log(`[Crack] Phase 0.5 complete: ${advancedTested} candidates tested`);
            } catch (err) {
                console.log('[Crack] Advanced context attack error (non-fatal):', err.message);
                // Continue to next phase on error
            }
        }
        // ========== Phase 1: 键盘模式（几秒，10-15%命中率）==========
        session.currentPhase = 1;
        if (session.active) {
            console.log('[Crack] Phase 1: Keyboard Patterns Attack');
            const result = await runKeyboardAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;

            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        }

        // ========== Phase 2: 1-6位暴力破解（全字符集）==========
        session.currentPhase = 2;
        if (session.active) {
            console.log('[Crack] Phase 2: Short Bruteforce (1-6 chars)');
            const result = await runShortBruteforce(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;

            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        }

        // ========== Phase 2.5: 7-8位扩展暴力破解（小写+数字）==========
        // 专门覆盖 abcd789, hello123 这类常见密码模式
        if (session.active) {
            console.log('[Crack] Phase 2.5: Extended Bruteforce (7-8 chars, lowercase+digits)');
            const result = await runExtendedBruteforce(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;

            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        }

        // ========== Phase 3: AI Password Generation (PassGPT)（少量高质量猜测）==========
        session.currentPhase = 3;
        if (session.active && !isBruteforceMode) {
            console.log('[Crack] Phase 3: AI Password Generation (PassGPT)');
            const result = await runAIPhase(archivePath, event, id, session, totalAttempts, startTime);
            totalAttempts = result.attempts;

            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }

            if (result.skipped) {
                console.log('[Crack] AI phase skipped (model not available)');
            } else if (result.error) {
                console.log('[Crack] AI phase encountered error, continuing to dictionary');
            }
        } else if (isBruteforceMode) {
            console.log('[Crack] Skipping Phase 3 (AI) - Bruteforce mode selected');
        }

        // ========== Phase 4: 完整字典14M（10-30分钟，10-15%命中率）==========
        if (session.active && !isBruteforceMode) {
            console.log('[Crack] Phase 4: Full Dictionary Attack');
            session.currentPhase = 4;

            // Phase 4a: Chinese password dictionary (quick, high hit rate for Chinese users)
            const chineseDictPath = path.join(hashcatDir, 'chinese_passwords.txt');
            if (fs.existsSync(chineseDictPath)) {
                console.log('[Crack] Phase 4a: Chinese Password Dictionary');
                sendCrackProgress(event, id, session, {
                    attempts: totalAttempts,
                    speed: 0,
                    current: 'Chinese passwords dictionary...',
                    method: 'Hashcat GPU Chinese Dict'
                });

                const chineseArgs = ['-a', '0', chineseDictPath];
                const chineseResult = await runHashcatPhase(hashFile, outFile, hashMode, chineseArgs, 'Chinese Dictionary', event, id, session, totalAttempts);
                totalAttempts = chineseResult.attempts;

                if (chineseResult.found) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    return { found: chineseResult.found, attempts: totalAttempts };
                }
            }

            // Phase 4b: Full dictionary (rockyou.txt or combined_wordlist.txt)
            sendCrackProgress(event, id, session, {
                attempts: totalAttempts,
                speed: 0,
                current: 'Full dictionary attack...',
                method: 'Hashcat GPU Dictionary'
            });

            // Use rockyou.txt (14M passwords) or combined_wordlist.txt
            let dictPath = path.join(hashcatDir, 'rockyou.txt');
            if (!fs.existsSync(dictPath)) {
                dictPath = path.join(hashcatDir, 'combined_wordlist.txt');
            }
            console.log('[Crack] Using dictionary:', path.basename(dictPath));

            if (fs.existsSync(dictPath)) {
                const args = ['-a', '0', dictPath];
                const result = await runHashcatPhase(hashFile, outFile, hashMode, args, 'Full Dictionary', event, id, session, totalAttempts);
                totalAttempts = result.attempts;

                if (result.found) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    return { found: result.found, attempts: totalAttempts };
                }
            }
        } else if (isBruteforceMode) {
            console.log('[Crack] Skipping Phase 4 (Full Dictionary) - Bruteforce mode selected');
        }

        // ========== Phase 5: 规则变换（30-60分钟，5-10%命中率）==========
        if (session.active && !isBruteforceMode) {
            console.log('[Crack] Phase 5: Rule Attack');
            const result = await runRuleAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;

            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        } else if (isBruteforceMode) {
            console.log('[Crack] Skipping Phase 5 (Rule) - Bruteforce mode selected');
        }

        // ========== Phase 6: 智能掩码（数小时，<5%命中率）==========
        if (session.active) {
            console.log('[Crack] Phase 6: Smart Mask Attack');
            const result = await runMaskAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;

            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        }

        // ========== Phase 7: 混合攻击（数小时，<5%命中率）==========
        if (session.active && !isBruteforceMode) {
            console.log('[Crack] Phase 7: Hybrid Attack');
            const result = await runHybridAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;

            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        } else if (isBruteforceMode) {
            console.log('[Crack] Skipping Phase 7 (Hybrid) - Bruteforce mode selected');
        }

        // ========== Phase 8: CPU智能字典回退 ==========
        if (session.active) {
            console.log('[Crack] Phase 8: CPU Smart Dictionary Fallback');
            session.currentPhase = 8;
            sendCrackProgress(event, id, session, {
                attempts: totalAttempts,
                speed: 0,
                current: 'GPU exhausted, trying CPU smart dictionary...',
                method: 'CPU Smart Dictionary'
            });

            fs.rmSync(tempDir, { recursive: true, force: true });

            // CPU 只用字典模式，不暴力破解
            const cpuOptions = { ...options, mode: 'dictionary' };
            return crackWithMultiThreadCPU(archivePath, cpuOptions, event, id, session, startTime);
        }

        fs.rmSync(tempDir, { recursive: true, force: true });
        return { found: null, attempts: totalAttempts };

    } catch (err) {
        console.log('[Crack] Pipeline error:', err.message);
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) { }

        // Mac特殊处理：如果GPU模式出错，回退到CPU模式
        if (isMac) {
            console.log('[Crack] Mac: GPU error, falling back to CPU mode');
            return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
        }

        return { found: null, attempts: totalAttempts };
    }
}
function getHashModeDescription(mode) {
    const modes = {
        '17200': 'PKZIP (Compressed)',
        '17210': 'PKZIP (Uncompressed)',
        '13600': 'WinZip AES-128',
        '13601': 'WinZip AES-192',
        '13602': 'WinZip AES-256',
        '13000': 'RAR5',
        '12500': 'RAR3-hp',
        '11600': '7-Zip'
    };
    return modes[mode] || 'Unknown';
}
// ============ bkcrack ?????????? ============
async function crackWithBkcrack(archivePath, options, event, id, session, startTime) {
    const bkcrackPath = getBkcrackPath();
    if (!fs.existsSync(bkcrackPath)) {
        console.log('[Crack] bkcrack not available');
        return { found: null, attempts: 0, fallback: true };
    }

    console.log('[Crack] Attempting known plaintext attack with bkcrack');
    sendCrackProgress(event, id, session, {
        attempts: 0,
        speed: 0,
        current: 'Analyzing archive...',
        method: 'bkcrack (Known Plaintext)'
    });

    // ??????????????��?
    const listProc = spawn(pathTo7zip, ['l', '-slt', archivePath], { windowsHide: true });
    let listOutput = '';
    await new Promise(r => {
        listProc.stdout.on('data', d => listOutput += d.toString());
        listProc.on('close', r);
    });

    // ???????????????
    const files = listOutput.split('----------').slice(1);
    let targetFile = null, plaintext = null;

    for (const fileInfo of files) {
        const nameMatch = fileInfo.match(/Path\s*=\s*(.+)/i);
        if (nameMatch) {
            const filename = nameMatch[1].trim();
            const sig = getKnownPlaintext(filename);
            if (sig && sig.bytes.length >= 8) {
                targetFile = filename;
                plaintext = sig;
                break;
            }
        }
    }

    if (!targetFile || !plaintext) {
        console.log('[Crack] No suitable file for known plaintext attack');
        return { found: null, attempts: 0, fallback: true };
    }

    console.log('[Crack] Using known plaintext from:', targetFile);
    sendCrackProgress(event, id, session, {
        attempts: 0,
        speed: 0,
        current: 'Attacking ' + targetFile + '...',
        method: 'bkcrack'
    });

    const tempDir = path.join(os.tmpdir(), 'bkcrack-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    const plaintextFile = path.join(tempDir, 'plain.bin');
    fs.writeFileSync(plaintextFile, plaintext.bytes);

    return new Promise((resolve) => {
        const args = ['-C', archivePath, '-c', targetFile, '-p', plaintextFile, '-o', String(plaintext.offset)];
        const proc = spawn(bkcrackPath, args, { windowsHide: true });
        session.process = proc;

        let output = '';
        proc.stdout.on('data', (data) => {
            output += data.toString();
            sendCrackProgress(event, id, session, {
                attempts: 0,
                speed: 0,
                current: 'Searching keys...',
                method: 'bkcrack'
            });
        });
        proc.stderr.on('data', (data) => { output += data.toString(); });

        proc.on('close', (code) => {
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) { }

            // ????????????
            const keysMatch = output.match(/Keys:\s*([0-9a-f]+)\s+([0-9a-f]+)\s+([0-9a-f]+)/i);
            if (keysMatch) {
                console.log('[Crack] bkcrack found keys!');
                // ??????????
                resolve({ found: '[KEYS:' + keysMatch[1] + ',' + keysMatch[2] + ',' + keysMatch[3] + ']', attempts: 0, method: 'bkcrack' });
            } else {
                resolve({ found: null, attempts: 0, fallback: true });
            }
        });

        proc.on('error', () => resolve({ found: null, attempts: 0, fallback: true }));
    });
}

// ============ ???????????? ============
async function crackWithSmartStrategy(archivePath, options, event, id, session, startTime) {
    try {
        // 0. 自适应策略选择
        console.log('[Crack] Selecting optimal strategy...');
        const strategySelector = new StrategySelector();
        const selectedStrategy = strategySelector.selectStrategy(archivePath);
        const strategyInfo = strategySelector.getStrategyInfo(selectedStrategy);

        console.log(`[Crack] Strategy selected: ${strategyInfo.name}`);
        console.log(`[Crack] Strategy description: ${strategyInfo.description}`);
        console.log(`[Crack] Strategy characteristics:`, strategyInfo.characteristics);

        // 1. 检测加密类型
        console.log('[Crack] Detecting encryption type...');
        sendCrackProgress(event, id, session, {
            attempts: 0,
            speed: 0,
            current: `Strategy: ${strategyInfo.name}`,
            method: 'Analyzing'
        });

        const encryption = await detectEncryption(archivePath);
        console.log('[Crack] Encryption detected:', JSON.stringify(encryption));
        event.reply('zip:crack-encryption', { id, ...encryption });

        // 2. ?????????????????
        // ?????: bkcrack (ZipCrypto only) > Hashcat (GPU) > CPU Multi-thread

        // bkcrack ??????? ZipCrypto
        if (encryption.canUseBkcrack && encryption.isZipCrypto) {
            console.log('[Crack] Strategy: bkcrack (known plaintext attack)');
            const result = await crackWithBkcrack(archivePath, options, event, id, session, startTime);
            if (result.found || !result.fallback) return result;
            console.log('[Crack] bkcrack failed, trying next method...');
        }

        // Hashcat GPU - 支持 ZIP/RAR/7z
        console.log('[Crack] GPU decision:', { useGpu: options.useGpu, canUseHashcat: encryption.canUseHashcat });

        // 🚀 HASHCAT优先模式：忽略useGpu参数，只要hashcat存在就使用
        const hashcatPath = getHashcatPath();
        const hashcatAvailable = fs.existsSync(hashcatPath);

        console.log('[Crack] 🚀 HASHCAT PRIORITY CHECK:', { hashcatPath, hashcatAvailable });

        if (hashcatAvailable) {
            console.log('[Crack] 🚀 HASHCAT PRIORITY: Using GPU/Hashcat pipeline (forced)');
            console.log('[Crack] options.useGpu was:', options.useGpu, '(ignored)');
            return await crackWithHashcat(archivePath, options, event, id, session, startTime, encryption);
        }

        // CPU Multi-thread - 仅在Hashcat不可用时使用
        console.log('[Crack] ⚠️ Hashcat not available at:', hashcatPath);
        console.log('[Crack] Strategy: CPU Multi-thread (fallback)');
        return await crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
    } catch (err) {
        console.error('[Crack] crackWithSmartStrategy error:', err);
        throw err;
    }
}
// ============ IPC Handlers ============
export const registerFileCompressor = () => {
    ipcMain.handle('zip:select-files', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'], title: 'Select files to compress' });
        return result.canceled ? [] : result.filePaths;
    });

    ipcMain.handle('zip:select-archives', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openFile', 'multiSelections'], title: 'Select archives', filters: [{ name: 'Archives', extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'] }] });
        return result.canceled ? [] : result.filePaths;
    });

    ipcMain.handle('zip:check-gpu', async () => {
        return { available: isHashcatAvailable(), name: 'Hashcat GPU', bkcrackAvailable: isBkcrackAvailable() };
    });

    ipcMain.handle('zip:detect-encryption', async (event, archivePath) => {
        return await detectEncryption(archivePath);
    });

    ipcMain.handle('zip:select-dictionary', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openFile'], title: 'Select dictionary file', filters: [{ name: 'Text files', extensions: ['txt', 'dic', 'lst'] }] });
        return result.canceled ? null : result.filePaths[0];
    });

    // ============ Helper: Start Cracking with Resume Support ============
    async function startCrackingWithResume(event, id, archivePath, options, resumeState = null) {
        console.log('[Crack] Starting crack with resume support:', { id, archivePath, resumeState });

        // ✅ Helper function to send IPC messages (works with both ipcMain.on and ipcMain.handle)
        const sendReply = (channel, data) => {
            if (event.reply) {
                event.reply(channel, data);
            } else if (event.sender && event.sender.send) {
                event.sender.send(channel, data);
            } else {
                console.error('[Crack] Cannot send reply - no valid method available');
            }
        };

        // Create or reuse session
        let sessionData;
        if (resumeState && resumeState.sessionId) {
            // Resuming existing session
            sessionData = sessionManager.loadSession(resumeState.sessionId);
            console.log('[Crack] Reusing existing session:', resumeState.sessionId);
        } else {
            // Create new session
            sessionData = sessionManager.createSession(archivePath, options);
            console.log('[Crack] Created new session:', sessionData.id);
        }

        const session = {
            active: true,
            paused: false, // ✅ Explicitly set paused to false when resuming
            process: null,
            cleanup: null,
            sessionId: sessionData.id,
            sessionData,
            currentPhase: resumeState?.startPhase || 0
        };
        crackSessions.set(id, session);

        // Create stats collector
        const stats = new StatsCollector(id);
        session.stats = stats;

        const startTime = Date.now();
        const previousAttempts = resumeState?.previousAttempts || 0;

        console.log('[Crack] Resume state:', {
            startPhase: resumeState?.startPhase,
            previousAttempts,
            phaseState: resumeState?.phaseState
        });

        // Periodic session save (every 10 seconds)
        const saveInterval = setInterval(() => {
            // ✅ CRITICAL FIX: Don't save if force stop was triggered
            if (session.active && session.sessionData && !session.forceStop) {
                try {
                    sessionManager.saveSession(session.sessionId, {
                        ...session.sessionData,
                        testedPasswords: stats.testedPasswords,
                        currentPhase: session.currentPhase || 0,
                        phaseState: session.phaseState || {},
                        lastUpdateTime: Date.now()
                    });
                } catch (err) {
                    console.error('[Crack] Failed to save session:', err);
                }
            }
        }, 10000);

        session.saveInterval = saveInterval;

        try {
            // Start crack with smart strategy from resume point
            const result = await crackWithSmartStrategyResume(
                archivePath,
                options,
                event,
                id,
                session,
                startTime,
                previousAttempts,
                resumeState
            );

            // Clear save interval
            clearInterval(saveInterval);

            const elapsed = (Date.now() - startTime) / 1000;

            // ✅ Add small delay to ensure pause flag is set if pause was requested
            await new Promise(resolve => setTimeout(resolve, 100));

            console.log('[startCrackingWithResume] Task completed, checking status:', {
                found: !!result.found,
                paused: !!session.paused,
                active: !!session.active,
                sessionExists: !!crackSessions.get(id)
            });

            if (result.found) {
                console.log('[Crack] Password found:', result.found);
                console.log('[Crack] ✅ SENDING zip:crack-complete (password found)');

                // === 科学优化：记录成功的密码模式（贝叶斯学习）===
                try {
                    patternLearner.recordSuccess(result.found, {
                        filePath: archivePath,
                        fileContext: session.fileContext,
                        attempts: result.attempts,
                        elapsedTime: elapsed
                    });
                    console.log('[Crack] Pattern recorded for future learning');
                } catch (learnErr) {
                    console.log('[Crack] Pattern learning failed (non-fatal):', learnErr.message);
                }

                sessionManager.completeSession(session.sessionId, true, result.found);
                crackSessions.delete(id);
                sendReply('zip:crack-complete', { id, success: true, password: result.found, attempts: result.attempts, time: elapsed });
            } else if (session.paused) {
                // ✅ Check paused flag instead of just !session.active
                console.log('[Crack] ⏸️  PAUSED - NOT sending zip:crack-complete, keeping session');
                // Don't delete session, don't send crack-complete
                // Session is already saved by pause handler
            } else if (!session.active) {
                console.log('[Crack] Stopped by user');
                console.log('[Crack] ⛔ SENDING zip:crack-complete (stopped)');
                sessionManager.deleteSession(session.sessionId);
                crackSessions.delete(id);
                sendReply('zip:crack-complete', { id, success: false, stopped: true, attempts: result.attempts, time: elapsed });
            } else {
                console.log('[Crack] Password not found');
                console.log('[Crack] ❌ SENDING zip:crack-complete (not found)');
                sessionManager.completeSession(session.sessionId, false);
                crackSessions.delete(id);
                sendReply('zip:crack-complete', { id, success: false, attempts: result.attempts, time: elapsed });
            }
        } catch (err) {
            console.error('[Crack] Error:', err);
            clearInterval(saveInterval);
            crackSessions.delete(id);
            sessionManager.completeSession(session.sessionId, false);
            sendReply('zip:crack-complete', { id, success: false, error: err.message });
        }
    }

    // ============ Helper: Crack with Smart Strategy (Resume Support) ============
    async function crackWithSmartStrategyResume(archivePath, options, event, id, session, startTime, previousAttempts, resumeState) {
        try {
            const startPhase = resumeState?.startPhase || 0;
            const isResuming = startPhase > 0; // ✅ Track if we're resuming from a saved phase
            console.log('[Crack] Starting from phase:', startPhase, 'isResuming:', isResuming);

            // ✅ Helper to send IPC messages (works with both ipcMain.on and ipcMain.handle)
            const sendReply = (channel, data) => {
                if (event.reply) {
                    event.reply(channel, data);
                } else if (event.sender && event.sender.send) {
                    event.sender.send(channel, data);
                } else {
                    console.error('[Crack] Cannot send reply - no valid method available');
                }
            };

            // If resuming from phase 0 or starting fresh, run strategy selection
            if (startPhase === 0) {
                console.log('[Crack] Selecting optimal strategy...');
                const strategySelector = new StrategySelector();
                const selectedStrategy = strategySelector.selectStrategy(archivePath);
                const strategyInfo = strategySelector.getStrategyInfo(selectedStrategy);

                console.log(`[Crack] Strategy selected: ${strategyInfo.name}`);
                sendCrackProgress(event, id, session, {
                    attempts: previousAttempts,
                    speed: 0,
                    current: `Strategy: ${strategyInfo.name}`,
                    method: 'Analyzing'
                });
            }

            const encryption = await detectEncryption(archivePath);
            console.log('[Crack] Encryption detected:', JSON.stringify(encryption));
            sendReply('zip:crack-encryption', { id, ...encryption });

            // Run cracking pipeline from resume point
            // ✅ HASHCAT优先模式：不管useGpu参数，只要hashcat存在就使用！
            const hashcatPath = getHashcatPath();
            const hashcatAvailable = fs.existsSync(hashcatPath);

            // 🚀 强制使用Hashcat - 忽略useGpu参数
            if (hashcatAvailable) {
                console.log('[Crack] 🚀 HASHCAT PRIORITY MODE: Using GPU/Hashcat pipeline (forced)');
                console.log('[Crack] hashcatPath:', hashcatPath);
                console.log('[Crack] options.useGpu was:', options.useGpu, '(ignored, using Hashcat anyway)');
                console.log('[Crack] Resuming from phase:', startPhase);
                return await crackWithHashcatResume(archivePath, options, event, id, session, startTime, encryption, previousAttempts, resumeState);
            }

            // CPU Multi-thread fallback (only when Hashcat binary is not found)
            console.log('[Crack] ⚠️ Hashcat binary NOT FOUND at:', hashcatPath);
            console.log('[Crack] Falling back to CPU Multi-thread');
            return await crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime, resumeState);
        } catch (err) {
            console.error('[Crack] crackWithSmartStrategyResume error:', err);
            throw err;
        }
    }

    // ============ Helper: Crack with Hashcat (Resume Support) ============
    async function crackWithHashcatResume(archivePath, options, event, id, session, startTime, encryption, previousAttempts, resumeState) {
        const hashcatPath = getHashcatPath();
        const hashcatDir = getHashcatDir();
        const attackMode = options.mode || 'dictionary';
        const isBruteforceMode = attackMode === 'bruteforce';
        const hashcatAvailable = fs.existsSync(hashcatPath);

        const startPhase = resumeState?.startPhase || 0;
        const phaseState = resumeState?.phaseState || {};
        const isResuming = startPhase > 0; // ✅ Track if we're resuming from a saved phase

        console.log('[Crack] Starting GPU/AI crack pipeline from phase:', startPhase);
        console.log('[Crack] Phase state:', phaseState);
        console.log('[Crack] Is resuming:', isResuming);

        let totalAttempts = previousAttempts;
        session.currentPhase = startPhase;

        // ============================================================
        // 🚀 HASHCAT优先模式：先检查Hashcat可用性
        // 如果Hashcat可用就跳过AI Phase，直接进入GPU攻击！
        // ============================================================

        if (hashcatAvailable) {
            console.log('[Crack] 🚀 HASHCAT PRIORITY: Skipping AI Phase, going straight to GPU!');
            console.log('[Crack] hashcatPath:', hashcatPath);
            // Skip to hash extraction (after this block)
        } else {
            // Hashcat不可用 - 运行AI Phase作为fallback
            console.log('[Crack] ⚠️ Hashcat not available, running AI Phase as fallback');
            if (session.active && !isBruteforceMode && startPhase <= 0) {
                console.log('[Crack] Phase 0: AI Password Generation (PassGPT)');
                const result = await runAIPhase(archivePath, event, id, session, totalAttempts, startTime, phaseState);
                totalAttempts = result.attempts;
                session.currentPhase = 1;
                if (result.found) {
                    return { found: result.found, attempts: totalAttempts };
                }
            }
            // 然后降级到CPU
            console.log('[Crack] Falling back to CPU Multi-thread');
            return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime, resumeState);
        }

        // 🚀 HASHCAT可用 - 继续进入GPU攻击流程
        console.log('[Crack] 🚀 HASHCAT PRIORITY: Proceeding with GPU attack phases');

        // Extract hash
        let hash;
        try {
            hash = await extractHash(archivePath, encryption);
            console.log('[Crack] Extracted hash:', hash.substring(0, 50) + '...');
        } catch (err) {
            console.log('[Crack] ❌ Hash extraction failed:', err.message);
            console.log('[Crack] ⚠️ Falling back to CPU due to hash extraction failure');
            return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime, resumeState);
        }

        // Create temp files
        const tempDir = path.join(os.tmpdir(), 'hashcat-pipeline-' + Date.now());
        fs.mkdirSync(tempDir, { recursive: true });
        const hashFile = path.join(tempDir, 'hash.txt');
        const outFile = path.join(tempDir, 'cracked.txt');
        fs.writeFileSync(hashFile, hash);

        const hashMode = encryption.hashcatMode || '17200';

        try {
            // ========== Phase 1: Top 10K ==========
            if (session.active && !isBruteforceMode && startPhase <= 1) {
                session.currentPhase = 1;
                console.log('[Crack] Phase 1: Top 10K Common Passwords');
                const result = await runTop10KAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
                totalAttempts = result.attempts;

                if (result.found) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    return { found: result.found, attempts: totalAttempts };
                }
            } else if (startPhase > 1) {
                console.log('[Crack] Skipping Phase 1 (Top 10K) - Resuming from phase', startPhase);
            }

            // ========== Phase 2: Short Bruteforce ==========
            if (session.active && startPhase <= 2) {
                session.currentPhase = 2;
                console.log('[Crack] Phase 2: Short Bruteforce (1-4 chars)');
                const result = await runShortBruteforce(hashFile, outFile, hashMode, event, id, session, totalAttempts);
                totalAttempts = result.attempts;

                if (result.found) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    return { found: result.found, attempts: totalAttempts };
                }
            } else if (startPhase > 2) {
                console.log('[Crack] Skipping Phase 2 (Short Bruteforce) - Resuming from phase', startPhase);
            }

            // ========== Phase 3: Keyboard Patterns ==========
            if (session.active && startPhase <= 3) {
                session.currentPhase = 3;
                console.log('[Crack] Phase 3: Keyboard Patterns Attack');
                const result = await runKeyboardAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
                totalAttempts = result.attempts;

                if (result.found) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    return { found: result.found, attempts: totalAttempts };
                }
            } else if (startPhase > 3) {
                console.log('[Crack] Skipping Phase 3 (Keyboard) - Resuming from phase', startPhase);
            }

            // ========== Phase 4: Full Dictionary ==========
            if (session.active && !isBruteforceMode && startPhase <= 4) {
                session.currentPhase = 4;
                console.log('[Crack] Phase 4: Full Dictionary Attack (14M passwords)');
                sendCrackProgress(event, id, session, {
                    attempts: totalAttempts,
                    speed: 0,
                    current: 'Full dictionary attack...',
                    method: 'Hashcat GPU Dictionary'
                });

                let dictPath = path.join(hashcatDir, 'rockyou.txt');
                if (!fs.existsSync(dictPath)) {
                    dictPath = path.join(hashcatDir, 'combined_wordlist.txt');
                }

                if (fs.existsSync(dictPath)) {
                    const args = ['-a', '0', dictPath];
                    const result = await runHashcatPhase(hashFile, outFile, hashMode, args, 'Full Dictionary', event, id, session, totalAttempts);
                    totalAttempts = result.attempts;

                    if (result.found) {
                        fs.rmSync(tempDir, { recursive: true, force: true });
                        return { found: result.found, attempts: totalAttempts };
                    }
                }
            } else if (startPhase > 4) {
                console.log('[Crack] Skipping Phase 4 (Full Dictionary) - Resuming from phase', startPhase);
            }

            // ========== Phase 5: Rule Attack ==========
            if (session.active && !isBruteforceMode && startPhase <= 5) {
                session.currentPhase = 5;
                console.log('[Crack] Phase 5: Rule Attack');
                const result = await runRuleAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
                totalAttempts = result.attempts;

                if (result.found) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    return { found: result.found, attempts: totalAttempts };
                }
            } else if (startPhase > 5) {
                console.log('[Crack] Skipping Phase 5 (Rule) - Resuming from phase', startPhase);
            }

            // ========== Phase 6: Smart Mask ==========
            if (session.active && startPhase <= 6) {
                session.currentPhase = 6;
                console.log('[Crack] Phase 6: Smart Mask Attack');
                const result = await runMaskAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
                totalAttempts = result.attempts;

                if (result.found) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    return { found: result.found, attempts: totalAttempts };
                }
            } else if (startPhase > 6) {
                console.log('[Crack] Skipping Phase 6 (Mask) - Resuming from phase', startPhase);
            }

            // ========== Phase 7: Hybrid Attack ==========
            if (session.active && !isBruteforceMode && startPhase <= 7) {
                session.currentPhase = 7;
                console.log('[Crack] Phase 7: Hybrid Attack');
                const result = await runHybridAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
                totalAttempts = result.attempts;

                if (result.found) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    return { found: result.found, attempts: totalAttempts };
                }
            } else if (startPhase > 7) {
                console.log('[Crack] Skipping Phase 7 (Hybrid) - Resuming from phase', startPhase);
            }

            // ========== Phase 8: CPU Smart Dictionary Fallback ==========
            if (session.active && startPhase <= 8) {
                session.currentPhase = 8;
                console.log('[Crack] Phase 8: CPU Smart Dictionary Fallback');
                sendCrackProgress(event, id, session, {
                    attempts: totalAttempts,
                    speed: 0,
                    current: 'GPU exhausted, trying CPU smart dictionary...',
                    method: 'CPU Smart Dictionary'
                });

                fs.rmSync(tempDir, { recursive: true, force: true });

                const cpuOptions = { ...options, mode: 'dictionary' };
                return crackWithMultiThreadCPU(archivePath, cpuOptions, event, id, session, startTime);
            }

            fs.rmSync(tempDir, { recursive: true, force: true });
            return { found: null, attempts: totalAttempts };

        } catch (err) {
            console.log('[Crack] Pipeline error:', err.message);
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) { }
            return { found: null, attempts: totalAttempts };
        }
    }

    ipcMain.on('zip:compress', async (event, { files, options, id }) => {
        console.log('[Compress] Starting compression:', { files, options, id });
        try {
            const downloadPath = options.outputPath || app.getPath('downloads');
            const outputFilePath = path.join(downloadPath, options.outputName || `archive_${id}.zip`);
            const format = options.outputName?.split('.').pop() || 'zip';
            const password = options.password;
            const compressionLevel = options.level || 6;

            console.log('[Compress] Output path:', outputFilePath, 'Format:', format);

            event.sender.send('zip:progress', { id, status: 'starting', percent: 0 });

            const output = fs.createWriteStream(outputFilePath);
            let archive;

            if (format === 'zip' && password) {
                console.log('[Compress] Creating encrypted ZIP archive');
                archive = archiver.create('zip-encrypted', { zlib: { level: compressionLevel }, encryptionMethod: 'aes256', password });
            } else if (format === 'zip') {
                console.log('[Compress] Creating ZIP archive');
                archive = archiver('zip', { zlib: { level: compressionLevel } });
            } else if (format === 'tar') {
                console.log('[Compress] Creating TAR archive');
                archive = archiver('tar');
            } else if (format === 'tar.gz' || format === 'gz') {
                console.log('[Compress] Creating TAR.GZ archive');
                archive = archiver('tar', { gzip: true, gzipOptions: { level: compressionLevel } });
            } else if (format === '7z') {
                console.log('[Compress] Creating 7Z archive using 7zip binary');
                // 7z format needs special handling with 7zip binary
                const args = ['a', '-t7z', `-mx=${compressionLevel}`];
                if (password) args.push(`-p${password}`);
                args.push(outputFilePath, ...files);

                const proc = spawn(pathTo7zip, args, { windowsHide: true });
                let error = '';

                proc.stderr.on('data', (data) => { error += data.toString(); });
                proc.stdout.on('data', (data) => {
                    const line = data.toString();
                    console.log('[Compress 7z]', line);
                    const match = line.match(/(\d+)%/);
                    if (match) {
                        event.sender.send('zip:progress', { id, status: 'compressing', percent: parseInt(match[1]) });
                    }
                });

                proc.on('close', (code) => {
                    console.log('[Compress 7z] Finished with code:', code);
                    if (code === 0) {
                        event.sender.send('zip:complete', { id, success: true, outputPath: outputFilePath });
                    } else {
                        event.sender.send('zip:complete', { id, success: false, error: error || 'Compression failed' });
                    }
                });

                proc.on('error', (err) => {
                    console.log('[Compress 7z] Error:', err.message);
                    event.sender.send('zip:complete', { id, success: false, error: err.message });
                });
                return;
            } else {
                console.log('[Compress] Creating default ZIP archive');
                archive = archiver('zip', { zlib: { level: compressionLevel } });
            }

            // Track progress
            let totalSize = 0;
            let processedSize = 0;

            // Calculate total size
            files.forEach(file => {
                const stat = fs.statSync(file);
                if (stat.isDirectory()) {
                    // Recursively calculate directory size
                    const getSize = (dir) => {
                        let size = 0;
                        fs.readdirSync(dir).forEach(f => {
                            const fp = path.join(dir, f);
                            const s = fs.statSync(fp);
                            size += s.isDirectory() ? getSize(fp) : s.size;
                        });
                        return size;
                    };
                    totalSize += getSize(file);
                } else {
                    totalSize += stat.size;
                }
            });

            console.log('[Compress] Total size to compress:', totalSize, 'bytes');

            archive.on('progress', (progress) => {
                const percent = totalSize > 0 ? Math.round((progress.fs.processedBytes / totalSize) * 100) : 0;
                console.log('[Compress] Progress:', percent, '%');
                event.sender.send('zip:progress', { id, status: 'compressing', percent: Math.min(percent, 99) });
            });

            output.on('close', () => {
                console.log('[Compress] Archive completed successfully');
                event.sender.send('zip:progress', { id, status: 'completed', percent: 100 });
                event.sender.send('zip:complete', { id, success: true, outputPath: outputFilePath, size: archive.pointer() });
            });

            archive.on('error', (err) => {
                console.log('[Compress] Archive error:', err.message);
                event.sender.send('zip:complete', { id, success: false, error: err.message });
            });

            archive.pipe(output);

            console.log('[Compress] Adding files to archive...');
            files.forEach(file => {
                console.log('[Compress] Adding:', file);
                if (fs.statSync(file).isDirectory()) {
                    archive.directory(file, path.basename(file));
                } else {
                    archive.file(file, { name: path.basename(file) });
                }
            });

            console.log('[Compress] Finalizing archive...');
            archive.finalize();
        } catch (err) {
            console.log('[Compress] Error:', err.message);
            event.sender.send('zip:complete', { id, success: false, error: err.message });
        }
    });

    ipcMain.on('zip:decompress', async (event, { file, options, id }) => {
        console.log('[Decompress] Starting decompression:', { file, options, id });
        try {
            const downloadPath = options.outputPath || app.getPath('downloads');
            const outputDir = path.join(downloadPath, path.basename(file, path.extname(file)));

            console.log('[Decompress] Output dir:', outputDir);

            // Create output directory if it doesn't exist
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            event.sender.send('zip:progress', { id, status: 'starting', percent: 0 });

            const args = ['x', '-y', '-o' + outputDir];
            if (options.password) args.push('-p' + options.password);
            args.push(file);

            const proc = spawn(pathTo7zip, args, { windowsHide: true });
            let error = '';

            proc.stderr.on('data', (data) => { error += data.toString(); });
            proc.stdout.on('data', (data) => {
                const line = data.toString();
                console.log('[Decompress]', line);
                const match = line.match(/(\d+)%/);
                if (match) {
                    event.sender.send('zip:progress', { id, status: 'extracting', percent: parseInt(match[1]) });
                }
            });

            proc.on('close', (code) => {
                console.log('[Decompress] Finished with code:', code);
                if (code === 0) {
                    event.sender.send('zip:progress', { id, status: 'completed', percent: 100 });
                    event.sender.send('zip:complete', { id, success: true, outputPath: outputDir });
                } else {
                    event.sender.send('zip:complete', { id, success: false, error: error || 'Decompression failed' });
                }
            });

            proc.on('error', (err) => {
                console.log('[Decompress] Error:', err.message);
                event.sender.send('zip:complete', { id, success: false, error: err.message });
            });
        } catch (err) {
            console.log('[Decompress] Error:', err.message);
            event.sender.send('zip:complete', { id, success: false, error: err.message });
        }
    });

    ipcMain.on('zip:crack-start', async (event, { id, archivePath, options }) => {
        console.log('[Crack] Starting crack for:', archivePath);
        console.log('[Crack] Options:', JSON.stringify(options));

        // Check for existing pending session
        const existingSession = sessionManager.findPendingSessionForFile(archivePath);
        if (existingSession) {
            console.log('[Crack] Found existing session:', existingSession.id);
            console.log('[Crack] Deleting old session and starting fresh...');
            // Delete the old session and start fresh
            sessionManager.deleteSession(existingSession.id);
        }

        // Create new session
        const sessionData = sessionManager.createSession(archivePath, options);
        const session = {
            active: true,
            process: null,
            cleanup: null,
            sessionId: sessionData.id,
            sessionData
        };
        crackSessions.set(id, session);

        // Create stats collector
        const stats = new StatsCollector(id);
        session.stats = stats;

        const startTime = Date.now();

        // Periodic session save (every 10 seconds)
        const saveInterval = setInterval(() => {
            // ✅ CRITICAL FIX: Don't save if force stop was triggered
            if (session.active && session.sessionData && !session.forceStop) {
                try {
                    sessionManager.saveSession(session.sessionId, {
                        ...session.sessionData,
                        testedPasswords: stats.testedPasswords,
                        currentPhase: session.currentPhase || 0,
                        lastUpdateTime: Date.now()
                    });
                } catch (err) {
                    console.error('[Crack] Failed to save session:', err);
                }
            }
        }, 10000);

        session.saveInterval = saveInterval;

        try {
            // Start crack with smart strategy
            const result = await crackWithSmartStrategy(archivePath, options, event, id, session, startTime);

            // Clear save interval
            clearInterval(saveInterval);

            const elapsed = (Date.now() - startTime) / 1000;

            // ✅ Add small delay to ensure pause flag is set if pause was requested
            await new Promise(resolve => setTimeout(resolve, 100));

            console.log('[zip:crack-start] Task completed, checking status:', {
                found: !!result.found,
                paused: !!session.paused,
                active: !!session.active,
                sessionExists: !!crackSessions.get(id)
            });

            if (result.found) {
                console.log('[Crack] Password found:', result.found);
                console.log('[Crack] ✅ SENDING zip:crack-complete (password found)');
                sessionManager.completeSession(session.sessionId, true, result.found);
                crackSessions.delete(id);
                event.reply('zip:crack-complete', { id, success: true, password: result.found, attempts: result.attempts, time: elapsed });
            } else if (session.paused) {
                // ✅ Check paused flag instead of just !session.active
                console.log('[Crack] ⏸️  PAUSED - NOT sending zip:crack-complete, keeping session');
                // Don't delete session, don't send crack-complete
                // Session is already saved by pause handler
            } else if (!session.active) {
                console.log('[Crack] Stopped by user');
                console.log('[Crack] ⛔ SENDING zip:crack-complete (stopped)');
                sessionManager.deleteSession(session.sessionId);
                crackSessions.delete(id);
                event.reply('zip:crack-complete', { id, success: false, stopped: true, attempts: result.attempts, time: elapsed });
            } else {
                console.log('[Crack] Password not found');
                console.log('[Crack] ❌ SENDING zip:crack-complete (not found)');
                sessionManager.completeSession(session.sessionId, false);
                crackSessions.delete(id);
                event.reply('zip:crack-complete', { id, success: false, attempts: result.attempts, time: elapsed });
            }
        } catch (err) {
            console.error('[Crack] Error:', err);
            clearInterval(saveInterval);
            crackSessions.delete(id);
            sessionManager.completeSession(session.sessionId, false);
            event.reply('zip:crack-complete', { id, success: false, error: err.message });
        }
    });

    // Pause handler - saves session without deleting
    ipcMain.on('zip:crack-pause', (event, { id }) => {
        console.log('[Crack] ⏸️  Pause requested for:', id);
        // ✅ Use helper to find session (handles UUID sent by frontend)
        const session = findSessionByIdOrSessionId(id);

        if (!session) {
            console.log('[Crack] ⚠️  No session found for id:', id, '- ignoring pause request');
            event.reply('zip:crack-paused', { id, sessionId: null });
            return;
        }

        // ✅ Check if already paused - ignore duplicate pause requests
        if (session.paused) {
            console.log('[Crack] ⚠️  Session already paused - ignoring duplicate pause request');
            return;
        }

        console.log('[Crack] Session found, current state:', {
            active: session.active,
            paused: session.paused || false,
            currentPhase: session.currentPhase
        });

        // Mark as inactive to stop processing
        session.active = false;
        session.paused = true; // ✅ Add paused flag to distinguish from stop

        console.log('[Crack] Flags set:', {
            active: session.active,
            paused: session.paused
        });

        // Save session state
        if (session.sessionId && session.stats) {
            try {
                console.log('[Crack] Saving session state...');
                // ✅ CRITICAL FIX: Don't save if force stop was triggered
                if (!session.forceStop) {
                    // ✅ Save CPU progress (cpuStartIdx) for resume
                    const sessionUpdate = {
                        testedPasswords: session.stats.testedPasswords,
                        currentPhase: session.currentPhase || 0,
                        phaseState: session.phaseState || {},
                        cpuStartIdx: session.cpuStartIdx || 0, // ✅ Save CPU progress
                        lastUpdateTime: Date.now()
                    };
                    console.log('[Crack] Session update:', sessionUpdate);
                    sessionManager.saveSession(session.sessionId, {
                        ...session.sessionData,
                        ...sessionUpdate
                    });
                    sessionManager.pauseSession(session.sessionId);
                } else {
                    console.log('[Crack] Force stop triggered - skipping session save');
                }
            } catch (err) {
                console.error('[Crack] Failed to pause session:', err);
            }
        }

        // Clear save interval
        if (session.saveInterval) {
            clearInterval(session.saveInterval);
        }

        // Gracefully stop processes (don't kill forcefully)
        if (session.process) {
            try {
                console.log('[Crack] Gracefully stopping process with SIGTERM...');
                session.process.kill('SIGTERM');
            } catch (e) {
                console.log('[Crack] SIGTERM error:', e.message);
            }
        }

        // Cleanup workers gracefully
        if (session.cleanup) {
            try {
                console.log('[Crack] Cleaning up workers...');
                session.cleanup();
            } catch (e) {
                console.log('[Crack] Cleanup error:', e.message);
            }
        }

        // IMPORTANT: Keep session in memory (don't delete)
        // crackSessions.delete(id); // ❌ DON'T DO THIS for pause

        // Send paused event with sessionId
        event.reply('zip:crack-paused', { id, sessionId: session.sessionId });
        console.log('[Crack] Session paused successfully, sessionId:', session.sessionId);
    });

    // Stop handler - completely terminates and deletes session
    ipcMain.on('zip:crack-stop', (event, { id }) => {
        console.log('[Crack] Stop requested for:', id);
        // ✅ Use helper to find session (handles UUID sent by frontend)
        const session = findSessionByIdOrSessionId(id);
        if (session) {
            session.active = false;

            // Delete session completely (don't save)
            if (session.sessionId) {
                try {
                    console.log('[Crack] Deleting session...');
                    sessionManager.deleteSession(session.sessionId);
                } catch (err) {
                    console.error('[Crack] Failed to delete session:', err);
                }
            }

            // Clear save interval
            if (session.saveInterval) {
                clearInterval(session.saveInterval);
            }

            // 立即发送停止确认事件 - 这样UI可以立即响应
            event.reply('zip:crack-stopped', { id });
            console.log('[Crack] Sent crack-stopped event to renderer');

            // ✅ 清理 PassGPT Python 进程
            if (session.passgptGenerator) {
                try {
                    console.log('[Crack] Disposing PassGPT generator...');
                    session.passgptGenerator.dispose();
                } catch (e) {
                    console.log('[Crack] PassGPT dispose error:', e.message);
                }
            }

            // 然后清理进程和workers - 强制杀死
            if (session.process) {
                try {
                    console.log('[Crack] Force killing process with SIGKILL...');
                    session.process.kill('SIGKILL');
                } catch (e) {
                    console.log('[Crack] Kill error:', e.message);
                }
            }

            // 清理 workers
            if (session.cleanup) {
                try {
                    console.log('[Crack] Cleaning up workers...');
                    session.cleanup();
                } catch (e) {
                    console.log('[Crack] Cleanup error:', e.message);
                }
            }

            // 从会话中移除
            crackSessions.delete(id);
            console.log('[Crack] Session stopped and deleted');
        } else {
            console.log('[Crack] No session found for id:', id);
            // 即使没有会话，也发送停止事件
            event.reply('zip:crack-stopped', { id });
        }
    });

    // Resume session handler
    ipcMain.handle('zip:crack-resume', async (event, { sessionId, filePath }) => {
        console.log('[Crack] Resume requested for session:', sessionId, 'with filePath:', filePath);
        const sessionData = sessionManager.loadSession(sessionId);

        if (!sessionData) {
            console.log('[Crack] Session data not found');
            return { success: false, error: 'Session not found' };
        }

        console.log('[Crack] Session data loaded:', {
            filePath: sessionData.filePath,
            archivePath: sessionData.archivePath,
            fileName: sessionData.fileName
        });

        // Use filePath from UI if provided, otherwise fall back to session data
        const archivePath = filePath || sessionData.archivePath || sessionData.filePath;

        console.log('[Crack] Using archive path:', archivePath);

        // Verify archive file still exists
        if (!fs.existsSync(archivePath)) {
            console.log('[Crack] Archive file not found at:', archivePath);
            return { success: false, error: 'Archive file not found: ' + archivePath };
        }

        // ✅ Clean up any existing sessions with the same sessionId to avoid conflicts
        for (const [jobId, session] of crackSessions.entries()) {
            if (session.sessionId === sessionId) {
                console.log('[Crack] Cleaning up old session with jobId:', jobId);
                crackSessions.delete(jobId);
            }
        }

        // Mark session as active
        sessionManager.resumeSession(sessionId);

        // Generate new job ID for this resume
        const jobId = Date.now().toString();

        console.log('[Crack] Resuming from phase:', sessionData.currentPhase, 'tested:', sessionData.testedPasswords, 'cpuStartIdx:', sessionData.cpuStartIdx);

        // Restart cracking from saved phase
        startCrackingWithResume(event, jobId, archivePath, sessionData.options, {
            startPhase: sessionData.currentPhase || 0,
            previousAttempts: sessionData.testedPasswords || 0,
            sessionId: sessionId,
            phaseState: sessionData.phaseState || {},
            cpuStartIdx: sessionData.cpuStartIdx || 0 // ✅ Pass CPU progress for resume
        });

        return { success: true, jobId };
    });

    // List pending sessions handler
    ipcMain.handle('zip:crack-list-sessions', async () => {
        const sessions = sessionManager.listPendingSessions();
        return { success: true, sessions };
    });

    // Delete session handler
    ipcMain.handle('zip:crack-delete-session', async (event, { sessionId }) => {
        sessionManager.deleteSession(sessionId);
        return { success: true };
    });

    // Diagnostic handler - check tool availability (useful for Mac debugging)
    ipcMain.handle('zip:crack-diagnostics', async () => {
        const diagnostics = {
            platform: process.platform,
            arch: process.arch,
            isPackaged: app.isPackaged,
            resourcesPath: app.isPackaged ? process.resourcesPath : path.join(process.cwd(), 'resources'),
            tools: {
                hashcat: {
                    path: getHashcatPath(),
                    exists: fs.existsSync(getHashcatPath())
                },
                zip2john: {
                    path: getJohnToolPath(isMac ? 'zip2john' : 'zip2john.exe'),
                    exists: fs.existsSync(getJohnToolPath(isMac ? 'zip2john' : 'zip2john.exe'))
                },
                rar2john: {
                    path: getJohnToolPath(isMac ? 'rar2john' : 'rar2john.exe'),
                    exists: fs.existsSync(getJohnToolPath(isMac ? 'rar2john' : 'rar2john.exe'))
                },
                '7z2hashcat': {
                    path: getJohnToolPath(isMac ? '7z2hashcat.pl' : '7z2hashcat64-2.0.exe'),
                    exists: fs.existsSync(getJohnToolPath(isMac ? '7z2hashcat.pl' : '7z2hashcat64-2.0.exe'))
                },
                bkcrack: {
                    path: getBkcrackPath(),
                    exists: fs.existsSync(getBkcrackPath())
                },
                system7z: {
                    path: getSystem7zPath(),
                    exists: getSystem7zPath() ? fs.existsSync(getSystem7zPath()) : false
                }
            }
        };
        console.log('[Crack] Diagnostics:', JSON.stringify(diagnostics, null, 2));
        return diagnostics;
    });

    // ✅ NEW: Force Stop API - Immediately terminate all password cracking processes
    ipcMain.handle('zip:crack-force-stop', async (event, { id }) => {
        console.log('🚨 [FORCE STOP] Killing all password cracking processes for session:', id);

        // ✅ Use helper to find session (handles UUID sent by frontend)
        const session = findSessionByIdOrSessionId(id);
        if (session) {
            session.active = false;
            session.forceStop = true;
            session.stopping = true;

            // ✅ CRITICAL FIX: Stop periodic session saves immediately
            if (session.saveInterval) {
                clearInterval(session.saveInterval);
                console.log('🛑 [FORCE STOP] Stopped periodic session saves');
                session.saveInterval = null;
            }

            // ✅ CRITICAL FIX: Delete session file from disk immediately
            try {
                if (session.sessionId) {
                    sessionManager.deleteSession(session.sessionId);
                    console.log('🗑️ [FORCE STOP] Session file deleted from disk:', session.sessionId);
                }
            } catch (err) {
                console.error('⚠️ [FORCE STOP] Failed to delete session file:', err);
            }

            // ✅ 清理 PassGPT Python 进程
            if (session.passgptGenerator) {
                try {
                    console.log('🛑 [FORCE STOP] Disposing PassGPT generator...');
                    session.passgptGenerator.dispose();
                } catch (e) {
                    console.log('⚠️ [FORCE STOP] PassGPT dispose error:', e.message);
                }
            }
        }

        // ✅ SIMPLE AND DIRECT: Kill all password cracking processes immediately
        try {
            if (isWindows) {
                // Windows: Kill all common password cracking processes
                const processNames = ['7za.exe', '7z.exe', 'hashcat.exe', 'python.exe', 'bkcrack.exe'];
                for (const name of processNames) {
                    try {
                        execSync(`taskkill /F /IM ${name} 2>nul`, { timeout: 3000 });
                        console.log(`✅ Killed ${name}`);
                    } catch (e) {
                        // Process might not be running
                    }
                }
            } else {
                // Mac/Linux: Kill all common password cracking processes
                const processNames = ['7za', '7z', 'hashcat', 'python', 'bkcrack'];
                for (const name of processNames) {
                    try {
                        execSync(`pkill -9 -f ${name}`, { timeout: 3000 });
                        console.log(`✅ Killed ${name}`);
                    } catch (e) {
                        // Process might not be running
                    }
                }
            }
        } catch (error) {
            console.log('⚠️ Error killing processes:', error.message);
        }

        // ✅ Delete session from memory
        crackSessions.delete(id);

        return { success: true, message: 'Force stop completed - session deleted' };
    });

    // ✅ NEW: Process Verification API - Check if password cracking processes are still running
    ipcMain.handle('zip:crack-verify-termination', async () => {
        console.log('🔍 [VERIFY] Starting process verification...');

        const processNames = isWindows
            ? ['7za.exe', '7z.exe', 'hashcat.exe', 'python.exe', 'bkcrack.exe']
            : ['7za', '7z', 'hashcat', 'python', 'bkcrack'];

        const runningProcesses = [];
        const processDetails = [];

        for (const name of processNames) {
            try {
                if (isWindows) {
                    // Windows: Use tasklist to check for running processes
                    const result = execSync(`tasklist /FI "IMAGENAME eq ${name}" /FO CSV`, {
                        encoding: 'utf8',
                        timeout: 3000
                    });

                    // Parse CSV output to check if process exists
                    const lines = result.split('\n').filter(line => line.trim());
                    if (lines.length > 1) { // More than just header line
                        const processLines = lines.slice(1).filter(line => line.includes(name));
                        if (processLines.length > 0) {
                            runningProcesses.push(name);
                            // Extract PID from CSV (second column)
                            processLines.forEach(line => {
                                const columns = line.split(',');
                                if (columns.length >= 2) {
                                    const pid = columns[1].replace(/"/g, '').trim();
                                    processDetails.push({ name, pid, platform: 'windows' });
                                }
                            });
                        }
                    }
                } else {
                    // Unix: Use pgrep to find processes
                    const result = execSync(`pgrep -f "${name}"`, {
                        encoding: 'utf8',
                        timeout: 3000
                    });

                    if (result.trim()) {
                        runningProcesses.push(name);
                        const pids = result.trim().split('\n');
                        pids.forEach(pid => {
                            if (pid.trim()) {
                                processDetails.push({ name, pid: pid.trim(), platform: 'unix' });
                            }
                        });
                    }
                }
            } catch (e) {
                // Process not found (good) or command failed
                console.log(`🔍 [VERIFY] No ${name} processes found (or command failed)`);
            }
        }

        const isClean = runningProcesses.length === 0;
        const message = isClean
            ? 'All password cracking processes terminated'
            : `Still running: ${runningProcesses.join(', ')}`;

        console.log(`🔍 [VERIFY] Verification complete: ${message}`);
        if (processDetails.length > 0) {
            console.log('🔍 [VERIFY] Process details:', processDetails);
        }

        return {
            success: true,
            isClean,
            runningProcesses,
            processDetails,
            message,
            timestamp: new Date().toISOString()
        };
    });

    // ✅ NEW: Blacklist Session API - Prevent auto-reconnection to cancelled sessions
    ipcMain.handle('zip:crack-blacklist-session', async (event, { sessionId, reason = 'user_stop' }) => {
        console.log('[Crack] Blacklisting session:', sessionId, 'reason:', reason);

        // Add to blacklist to prevent auto-reconnection
        const now = Date.now();
        const BLACKLIST_TTL = 24 * 60 * 60 * 1000; // 24 hours

        if (!global.sessionBlacklist) {
            global.sessionBlacklist = new Map();
        }

        global.sessionBlacklist.set(sessionId, {
            terminatedAt: now,
            reason,
            expiresAt: now + BLACKLIST_TTL
        });

        console.log('[Crack] Session blacklisted successfully');
        return { success: true };
    });

    // Cleanup old sessions on startup
    sessionManager.cleanupOldSessions();
};
