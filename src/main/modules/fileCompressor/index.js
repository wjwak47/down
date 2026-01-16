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

const pathTo7zip = sevenBin.path7za;
const crackSessions = new Map();
const sessionManager = new SessionManager();
const NUM_WORKERS = Math.max(1, os.cpus().length - 1);
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

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
    
    sendReply('zip:crack-progress', {
        id,
        sessionId: session.sessionId, // ✅ Include sessionId for resume functionality
        attempts: session.stats.testedPasswords,
        speed: session.stats.currentSpeed,
        current: current || stats.phase,
        method: method || stats.phase,
        currentLength: currentLength || session.currentLength || 1,
        // Additional stats
        progress: stats.progress,
        eta: stats.eta,
        tested: stats.tested,
        total: stats.total
    });
}

// ============ Cross-platform tool paths ============
function getHashcatPath() {
    if (isMac) {
        // Mac: hashcat is typically installed via homebrew or not available
        // For now, return a path that won't exist - GPU cracking not supported on Mac
        return !app.isPackaged 
            ? path.join(process.cwd(), 'resources', 'hashcat-mac', 'hashcat')
            : path.join(process.resourcesPath, 'hashcat-mac', 'hashcat');
    }
    return !app.isPackaged 
        ? path.join(process.cwd(), 'resources', 'hashcat', 'hashcat-6.2.6', 'hashcat.exe')
        : path.join(process.resourcesPath, 'hashcat', 'hashcat-6.2.6', 'hashcat.exe');
}

function getHashcatDir() {
    return path.dirname(getHashcatPath());
}

function getBkcrackPath() {
    if (isMac) {
        return !app.isPackaged 
            ? path.join(process.cwd(), 'resources', 'bkcrack-mac', 'bkcrack')
            : path.join(process.resourcesPath, 'bkcrack-mac', 'bkcrack');
    }
    return !app.isPackaged 
        ? path.join(process.cwd(), 'resources', 'bkcrack', 'bkcrack.exe')
        : path.join(process.resourcesPath, 'bkcrack', 'bkcrack.exe');
}

function isHashcatAvailable() {
    try { return fs.existsSync(getHashcatPath()); } catch (e) { return false; }
}

function getJohnToolPath(tool) {
    if (isMac) {
        // Mac version uses different tool names (no .exe)
        const macTool = tool.replace('.exe', '');
        return !app.isPackaged
            ? path.join(process.cwd(), 'resources', 'john-mac', 'run', macTool)
            : path.join(process.resourcesPath, 'john-mac', 'run', macTool);
    }
    return !app.isPackaged
        ? path.join(process.cwd(), 'resources', 'john', 'john-1.9.0-jumbo-1-win64', 'run', tool)
        : path.join(process.resourcesPath, 'john', 'john-1.9.0-jumbo-1-win64', 'run', tool);
}

function isJohnToolAvailable(format) {
    try {
        const toolMap = isMac 
            ? { 'zip': 'zip2john', 'rar': 'rar2john', '7z': '7z2hashcat' }
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
        const ext = path.extname(archivePath).toLowerCase();
        const isRar = ext === '.rar';
        
        // Use system 7z for RAR if available, otherwise use bundled 7zip-bin
        const system7z = getSystem7zPath();
        const use7z = (isRar && system7z) ? system7z : pathTo7zip;
        
        console.log('[detectEncryption] Starting detection for:', archivePath);
        console.log('[detectEncryption] Using 7z:', use7z);
        
        const proc = spawn(use7z, ['l', '-slt', '-p', archivePath], { windowsHide: true });
        let output = '';
        let resolved = false;
        
        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                console.log('[detectEncryption] Timeout - killing process');
                try { proc.kill(); } catch(e) {}
                resolve({ method: 'Unknown', format: 'unknown', isZipCrypto: false, isAES: false, canUseBkcrack: false, canUseHashcat: false, recommendation: 'cpu' });
            }
        }, 10000); // 10 second timeout
        
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { output += data.toString(); });
        
        proc.on('close', () => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeout);
            // File type detection
            const isZip = ext === '.zip';
            const is7z = ext === '.7z';
            
            // ???????
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
            
            // ���?7z �ļ���С - hashcat ����Ϊ 8MB
            let fileTooLarge = false;
            if (is7z) {
                try {
                    const stats = fs.statSync(archivePath);
                    const MAX_7Z_SIZE = 8 * 1024 * 1024; // 8MB
                    fileTooLarge = stats.size > MAX_7Z_SIZE;
                    if (fileTooLarge) {
                        console.log('[detectEncryption] 7z file too large for GPU:', stats.size, 'bytes (max:', MAX_7Z_SIZE, ')');
                    }
                } catch (e) {}
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
        
        proc.on('error', (err) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeout);
            console.log('[detectEncryption] Error:', err.message);
            resolve({ method: 'Unknown', format: 'unknown', isZipCrypto: false, isAES: false, canUseBkcrack: false, canUseHashcat: false, recommendation: 'cpu' });
        });
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
        const ext = path.extname(archivePath).toLowerCase();
        const isRar = ext === '.rar';
        
        // Use system 7z for RAR if available, otherwise use bundled 7zip-bin
        const system7z = getSystem7zPath();
        const use7z = (isRar && system7z) ? system7z : pathTo7zip;
        
        const proc = spawn(use7z, ['t', '-p' + password, '-y', archivePath], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
        let resolved = false;
        proc.on('close', (code) => { if (!resolved) { resolved = true; resolve(code === 0); } });
        proc.on('error', () => { if (!resolved) { resolved = true; resolve(false); } });
        setTimeout(() => { if (!resolved) { resolved = true; try { proc.kill(); } catch(e) {} resolve(false); } }, 2000);
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
    
    const testBatch = async (passwords) => {
        for (const pwd of passwords) {
            if (!session.active || found) return;
            
            // 添加密码到批量管理器
            batchManager.addPassword(pwd);
            
            // 当批次满时，执行批量测试
            if (batchManager.shouldTest()) {
                const result = await batchManager.testBatch(archivePath, system7z);
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
            const result = await batchManager.flush(archivePath, system7z);
            totalAttempts += result.tested;
            if (result.success) {
                found = result.password;
            }
        }
    };
    if (mode === 'dictionary') {
        console.log('[Crack] Dictionary mode');
        if (dictionaryPath && fs.existsSync(dictionaryPath)) {
            for (const word of fs.readFileSync(dictionaryPath, 'utf-8').split('\n').filter(l => l.trim())) {
                if (!session.active || found) break;
                await testBatch(applyRules(word.trim()));
            }
        }
        if (!found && session.active) {
            for (const word of SMART_DICTIONARY) {
                if (!session.active || found) break;
                await testBatch(applyRules(word));
            }
        }
    } else {
        console.log('[Crack] Bruteforce mode');
        const cs = charset || 'abcdefghijklmnopqrstuvwxyz0123456789';
        const minLen = minLength || 1, maxLen = Math.min(maxLength || 6, 10);
        const gen = smartPasswordGenerator({ minLength: minLen, maxLength: maxLen });
        let batch = [];
        for (const pwd of gen) {
            if (!session.active || found) break;
            batch.push(pwd);
            if (batch.length >= 100) { await testBatch(batch); batch = []; }
        }
        if (batch.length > 0 && session.active && !found) await testBatch(batch);
    }
    return { found, attempts: totalAttempts };
}

// ============ CPU ???????? ============
async function crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime) {
    const { mode, charset, minLength, maxLength, dictionaryPath } = options;
    
    // Worker ???��?? - ????????? out/main?????????? resources
    const workerPath = !app.isPackaged
        ? path.join(process.cwd(), 'out', 'main', 'crackWorker.js')
        : path.join(process.resourcesPath, 'app.asar.unpacked', 'out', 'main', 'crackWorker.js');
    
    // ??? Worker ?????????????????
    if (!fs.existsSync(workerPath)) {
        console.log('[Crack] Worker not found at:', workerPath, '- fallback to single-thread');
        sendCrackProgress(event, id, session, {
            attempts: 0,
            speed: 0,
            current: 'Starting...',
            method: 'CPU Single'
        });
        return crackWithCPU(archivePath, options, event, id, session, startTime);
    }
    
    console.log('[Crack] Multi-thread CPU mode with', NUM_WORKERS, 'workers');
    sendCrackProgress(event, id, session, {
        attempts: 0,
        speed: 0,
        current: 'Starting workers...',
        method: 'CPU Multi-thread'
    });
    
    let found = null;
    const workers = [];
    const workerProgress = new Map(); // ??????? worker ?????
    
    const cleanup = () => {
        workers.forEach(w => { try { w.terminate(); } catch(e) {} });
        workers.length = 0;
    };
    session.cleanup = cleanup;
    
    return new Promise((resolve) => {
        let completedWorkers = 0;
        
        // ?????????
        const getTotalAttempts = () => {
            let total = 0;
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
                    // ??????? worker ?????
                    workerProgress.set(i, msg.tested);
                    const totalAttempts = getTotalAttempts();
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = elapsed > 0 ? Math.round(totalAttempts / elapsed) : 0;
                    
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
        
        // ????????????? workers
        const cs = charset || 'abcdefghijklmnopqrstuvwxyz0123456789';
        const minLen = minLength || 1;
        const maxLen = Math.min(maxLength || 6, 8);
        
        if (mode === 'dictionary') {
            // ?????
            let allWords = [];
            if (dictionaryPath && fs.existsSync(dictionaryPath)) {
                allWords = fs.readFileSync(dictionaryPath, 'utf-8').split('\n').filter(l => l.trim()).map(l => l.trim());
            }
            // ?? SMART_DICTIONARY ????????��?????????????????????
            allWords = [...SMART_DICTIONARY, ...allWords.filter(w => !SMART_DICTIONARY.includes(w))];
            
            console.log('[Crack] Dictionary mode with', allWords.length, 'words');
            
            // ??y???????????? worker ?????????????????
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
                    pathTo7zip
                });
            });
        } else {
            // ?????????
            let totalPasswords = 0;
            for (let len = minLen; len <= maxLen; len++) {
                totalPasswords += Math.pow(cs.length, len);
            }
            
            console.log('[Crack] Bruteforce mode with', totalPasswords, 'total passwords');
            
            const chunkSize = Math.ceil(totalPasswords / NUM_WORKERS);
            workers.forEach((worker, idx) => {
                worker.postMessage({
                    type: 'bruteforce',
                    archivePath,
                    charset: cs,
                    minLength: minLen,
                    maxLength: maxLen,
                    startIdx: idx * chunkSize,
                    endIdx: (idx + 1) * chunkSize,
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
                const match = output.match(/\$pkzip[^\s:]+/);
                if (match) resolve(match[0]);
                else resolve(output.split(':')[1] || output.trim());
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
        const toolName = isMac ? '7z2hashcat' : '7z2hashcat64-2.0.exe';
        const sevenZ2johnPath = getJohnToolPath(toolName);
        if (!fs.existsSync(sevenZ2johnPath)) { reject(new Error('7z2hashcat not found')); return; }
        const proc = spawn(sevenZ2johnPath, [archivePath], { windowsHide: true });
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
        '.7z': '7z2hashcat'
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
// ============ GPU 攻击阶段顺序（优化：AI优先 + 最快+最高命中率优先） ============
const GPU_ATTACK_PHASES = {
    0: { name: 'AI', method: 'PassGPT AI Generator', description: 'AI Password Generation (PassGPT)' },
    1: { name: 'Top10K', method: 'Hashcat GPU Top 10K', description: 'Top 10K Common Passwords' },
    2: { name: 'ShortBrute', method: 'Hashcat GPU Short Bruteforce', description: 'Short Bruteforce (1-4 chars, all printable)' },
    3: { name: 'Keyboard', method: 'Hashcat GPU Keyboard', description: 'Keyboard Patterns' },
    4: { name: 'Dictionary', method: 'Hashcat GPU Dictionary', description: 'Full Dictionary (14M)' },
    5: { name: 'Rule', method: 'Hashcat GPU Rule Attack', description: 'Rule Transform' },
    6: { name: 'Mask', method: 'Hashcat GPU Smart Mask', description: 'Smart Mask' },
    7: { name: 'Hybrid', method: 'Hashcat GPU Hybrid', description: 'Hybrid Attack' },
    8: { name: 'CPU', method: 'CPU Smart Dictionary', description: 'CPU Smart Dict' }
};

// ��������ģʽ - ����������
const SMART_MASKS = [
    { mask: '?d?d?d?d?d?d', desc: '6-digit PIN' },
    { mask: '?l?l?l?l?l?l', desc: '6 lowercase' },
    { mask: '?l?l?l?l?l?l?d?d', desc: '6lower+2digit' },
    { mask: '?u?l?l?l?l?l?d?d', desc: 'Cap+5lower+2digit' },
    { mask: '?l?l?l?l?l?l?d?d?d?d', desc: '6lower+year' },
    { mask: '?u?l?l?l?l?l?d?d?d?d', desc: 'Cap+5lower+year' },
    { mask: '?u?l?l?l?l?l?d?d?d?d?s', desc: 'Cap+5lower+year+sym' },
    { mask: '?d?d?d?d?d?d?d?d', desc: '8-digit' },
    { mask: '?l?l?l?l?l?l?l?l', desc: '8 lowercase' },
    { mask: '?u?l?l?l?l?l?l?d?d', desc: 'Cap+6lower+2digit' },
    { mask: '?u?l?l?l?l?l?l?d?d?d?d', desc: 'Cap+6lower+year' },
    { mask: '?l?l?l?l?d?d?d?d', desc: '4lower+4digit' },
    { mask: '?u?l?l?l?l?l?d?d?d?s', desc: 'Cap+5lower+3digit+sym' },
    { mask: '?l?l?l?l?l?l?l?l?d?d', desc: '8lower+2digit' },
    { mask: '?u?l?l?l?l?l?l?l?d?d?d?d', desc: 'Cap+7lower+year' }
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

// ============ ͨ�� Hashcat �׶�ִ�к��� ============
async function runHashcatPhase(hashFile, outFile, hashMode, args, phaseName, event, id, session, previousAttempts = 0) {
    const hashcatPath = getHashcatPath();
    const hashcatDir = getHashcatDir();
    
    return new Promise((resolve) => {
        const fullArgs = ['-m', hashMode, hashFile, ...args, '-o', outFile, '--potfile-disable', '-w', '3', '--status', '--status-timer=2'];
        
        console.log(`[Crack] Phase ${phaseName}: hashcat ${fullArgs.join(' ')}`);
        
        const proc = spawn(hashcatPath, fullArgs, { cwd: hashcatDir, windowsHide: true });
        session.process = proc;
        
        let totalAttempts = previousAttempts, lastSpeed = 0;
        
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
    const rulePath = path.join(hashcatDir, 'rules', 'dive.rule');
    
    if (!fs.existsSync(rulePath)) {
        console.log('[Crack] best64.rule not found, skipping rule attack');
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
    try { fs.unlinkSync(keyboardDict); } catch(e) {}
    
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
    try { fs.unlinkSync(top10kDict); } catch(e) {}
    
    return result;
}

// ============ Phase 2: 1-4位短密码暴力破解 ============
async function runShortBruteforce(hashFile, outFile, hashMode, event, id, session, previousAttempts) {
    session.currentPhase = 2;
    
    // 固定测试1-4位，使用所有可打印字符（包括特殊字符）
    const minLen = 1;
    const maxLen = 4;
    
    // 使用hashcat内置的?a（所有可打印ASCII字符，共95个）
    // 包括：数字、大小写字母、所有特殊字符
    console.log('[Crack] Phase 2: Short Bruteforce (1-4 chars, all printable characters)');
    console.log('[Crack] Character set: 0-9, a-z, A-Z, and all special characters (!@#$%^&*()_+-=[]{}|;:\',.<>?/~` etc.)');
    console.log('[Crack] Total passwords: ~81M (1位:95, 2位:9K, 3位:857K, 4位:81.4M)');
    
    sendCrackProgress(event, id, session, {
        attempts: previousAttempts,
        speed: 0,
        current: 'Short Bruteforce (1-4 chars, all characters)...',
        method: 'Hashcat GPU Short Bruteforce'
    });
    
    // 使用?a表示所有可打印ASCII字符（95个字符）
    const mask = '?a'.repeat(maxLen);
    const args = [
        '-a', '3',                          // 暴力破解模式
        '--increment',                      // 递增模式
        '--increment-min=' + minLen,        // 最小长度1
        '--increment-max=' + maxLen,        // 最大长度4
        mask                                // 掩码：?a?a?a?a
    ];
    
    console.log('[Crack] Hashcat args:', args.join(' '));
    
    return runHashcatPhase(hashFile, outFile, hashMode, args, 'Short Bruteforce (1-4)', event, id, session, previousAttempts);
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
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e) {}
            
            console.log('[Crack] Custom GPU bruteforce finished, code:', code, 'found:', !!found);
            resolve({ found, attempts: totalAttempts });
        });
        
        proc.on('error', (err) => {
            console.log('[Crack] Custom GPU bruteforce error:', err.message);
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e) {}
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

    const hashcatAvailable = fs.existsSync(hashcatPath);
    
    if (!encryption) {
        encryption = await detectEncryption(archivePath);
    }

    console.log('[Crack] Starting GPU/AI crack pipeline, format:', encryption.format, 'hashcat:', hashcatAvailable);
    
    let totalAttempts = 0;
    session.currentPhase = 0;

    // ========== Phase 0: AI Password Generation (PassGPT)（几分钟，55-60%命中率）==========
    // AI Phase 不需要 hashcat，可以独立运行
    if (session.active && !isBruteforceMode) {
        console.log('[Crack] Phase 0: AI Password Generation (PassGPT)');
        const result = await runAIPhase(archivePath, event, id, session, totalAttempts, startTime);
        totalAttempts = result.attempts;
        
        if (result.found) {
            return { found: result.found, attempts: totalAttempts };
        }
        
        if (result.skipped) {
            console.log('[Crack] AI phase skipped (model not available)');
        } else if (result.error) {
            console.log('[Crack] AI phase encountered error, continuing to traditional methods');
        }
    } else if (isBruteforceMode) {
        console.log('[Crack] Skipping Phase 0 (AI) - Bruteforce mode selected');
    }
    
    // 如果 hashcat 不可用，在运行完 AI Phase 后降级到 CPU
    if (!hashcatAvailable || !encryption.canUseHashcat) {
        console.log('[Crack] Hashcat not available or file too large, falling back to CPU after AI phase');
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
    fs.writeFileSync(hashFile, hash);

    const hashMode = encryption.hashcatMode || '17200';

    try {
        // Update phase counter
        session.currentPhase = 1;

        // ========== Phase 1: Top 10K常见密码（几秒，40%命中率）==========
        if (session.active && !isBruteforceMode) {
            console.log('[Crack] Phase 1: Top 10K Common Passwords');
            const result = await runTop10KAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;
            
            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        } else if (isBruteforceMode) {
            console.log('[Crack] Skipping Phase 1 (Top 10K) - Bruteforce mode selected');
        }

        // ========== Phase 2: 1-4位暴力破解（几秒到几分钟，15%命中率）==========
        if (session.active) {
            console.log('[Crack] Phase 2: Short Bruteforce (1-4 chars)');
            const result = await runShortBruteforce(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;
            
            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        }

        // ========== Phase 3: 键盘模式（1-2分钟，20%命中率）==========
        if (session.active) {
            console.log('[Crack] Phase 3: Keyboard Patterns Attack');
            const result = await runKeyboardAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;
            
            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        }

        // ========== Phase 4: 完整字典14M（10-30分钟，10-15%命中率）==========
        if (session.active && !isBruteforceMode) {
            console.log('[Crack] Phase 4: Full Dictionary Attack (14M passwords)');
            session.currentPhase = 4;
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
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e) {}
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
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e) {}
            
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

        // Hashcat GPU - ??? ZIP/RAR/7z
        console.log('[Crack] GPU decision:', { useGpu: options.useGpu, canUseHashcat: encryption.canUseHashcat });
        
        // AI Phase 可以独立运行，不依赖 Hashcat
        // 即使文件太大无法使用 Hashcat，AI Phase 仍然可以运行
        const canRunAI = true; // AI Phase always available if model is present
        
        if (options.useGpu && (encryption.canUseHashcat || canRunAI)) {
            console.log('[Crack] Strategy: GPU/AI Pipeline (hashcat:', encryption.canUseHashcat, ', AI:', canRunAI, ')');
            return await crackWithHashcat(archivePath, options, event, id, session, startTime, encryption);
        }

        // CPU Multi-thread - ??????
        console.log('[Crack] Strategy: CPU Multi-thread');
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
            if (session.active && session.sessionData) {
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
            // ✅ If resuming, always try GPU pipeline (we were using GPU before pause)
            if (options.useGpu && (encryption.canUseHashcat || isResuming)) {
                console.log('[Crack] Strategy: GPU/AI Pipeline (resuming from phase', startPhase, ')');
                return await crackWithHashcatResume(archivePath, options, event, id, session, startTime, encryption, previousAttempts, resumeState);
            }

            // CPU Multi-thread fallback
            console.log('[Crack] Strategy: CPU Multi-thread');
            return await crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
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

        // ========== Phase 0: AI Password Generation (PassGPT) ==========
        if (session.active && !isBruteforceMode && startPhase <= 0) {
            console.log('[Crack] Phase 0: AI Password Generation (PassGPT)');
            const result = await runAIPhase(archivePath, event, id, session, totalAttempts, startTime, phaseState);
            totalAttempts = result.attempts;
            
            // ✅ Update currentPhase to 1 after AI phase completes (success or failure)
            // This ensures we don't re-run AI phase on resume
            session.currentPhase = 1;
            
            if (result.found) {
                return { found: result.found, attempts: totalAttempts };
            }
        } else if (startPhase > 0) {
            console.log('[Crack] Skipping Phase 0 (AI) - Resuming from phase', startPhase);
        }
        
        // If hashcat not available, fall back to CPU
        // ✅ But if we're resuming from a GPU phase, try to continue with GPU anyway
        if (!hashcatAvailable || (!encryption.canUseHashcat && !isResuming)) {
            console.log('[Crack] Hashcat not available, falling back to CPU');
            return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
        }
        
        // Extract hash
        let hash;
        try {
            hash = await extractHash(archivePath, encryption);
            console.log('[Crack] Extracted hash:', hash.substring(0, 50) + '...');
        } catch (err) {
            console.log('[Crack] Hash extraction failed:', err.message);
            return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
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
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e) {}
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
            if (session.active && session.sessionData) {
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
        const session = crackSessions.get(id);
        
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
                sessionManager.pauseSession(session.sessionId);
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
            } catch(e) {
                console.log('[Crack] SIGTERM error:', e.message);
            }
        }
        
        // Cleanup workers gracefully
        if (session.cleanup) {
            try {
                console.log('[Crack] Cleaning up workers...');
                session.cleanup();
            } catch(e) {
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
        const session = crackSessions.get(id);
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
            
            // 然后清理进程和workers - 强制杀死
            if (session.process) { 
                try { 
                    console.log('[Crack] Force killing process with SIGKILL...');
                    session.process.kill('SIGKILL');
                } catch(e) {
                    console.log('[Crack] Kill error:', e.message);
                } 
            }
            
            // 清理 workers
            if (session.cleanup) { 
                try { 
                    console.log('[Crack] Cleaning up workers...');
                    session.cleanup(); 
                } catch(e) {
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
        
        console.log('[Crack] Resuming from phase:', sessionData.currentPhase, 'tested:', sessionData.testedPasswords);
        
        // Restart cracking from saved phase
        startCrackingWithResume(event, jobId, archivePath, sessionData.options, {
            startPhase: sessionData.currentPhase || 0,
            previousAttempts: sessionData.testedPasswords || 0,
            sessionId: sessionId,
            phaseState: sessionData.phaseState || {}
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
    
    // Cleanup old sessions on startup
    sessionManager.cleanupOldSessions();
};
