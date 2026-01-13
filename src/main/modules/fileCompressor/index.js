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

const pathTo7zip = sevenBin.path7za;
const crackSessions = new Map();
const NUM_WORKERS = Math.max(1, os.cpus().length - 1);

// ============ ·????????? ============
function getHashcatPath() {
    return !app.isPackaged 
        ? path.join(process.cwd(), 'resources', 'hashcat', 'hashcat-6.2.6', 'hashcat.exe')
        : path.join(process.resourcesPath, 'hashcat', 'hashcat-6.2.6', 'hashcat.exe');
}

function getHashcatDir() {
    return path.dirname(getHashcatPath());
}

function getBkcrackPath() {
    return !app.isPackaged 
        ? path.join(process.cwd(), 'resources', 'bkcrack', 'bkcrack.exe')
        : path.join(process.resourcesPath, 'bkcrack', 'bkcrack.exe');
}

function isHashcatAvailable() {
    try { return fs.existsSync(getHashcatPath()); } catch (e) { return false; }
}

function getJohnToolPath(tool) {
    return !app.isPackaged
        ? path.join(process.cwd(), 'resources', 'john', 'john-1.9.0-jumbo-1-win64', 'run', tool)
        : path.join(process.resourcesPath, 'john', 'john-1.9.0-jumbo-1-win64', 'run', tool);
}

function isJohnToolAvailable(format) {
    try {
        const toolMap = { 'zip': 'zip2john.exe', 'rar': 'rar2john.exe', '7z': '7z2hashcat64-2.0.exe' };
        const tool = toolMap[format];
        if (!tool) return false;
        return fs.existsSync(getJohnToolPath(tool));
    } catch (e) { return false; }
}

function isBkcrackAvailable() {
    try { return fs.existsSync(getBkcrackPath()); } catch (e) { return false; }
}

// ============ ?????????? ============
async function detectEncryption(archivePath) {
    return new Promise((resolve) => {
        // ???? RAR ?????????????? 7z????? RAR5??
        const ext = path.extname(archivePath).toLowerCase();
        const isRar = ext === '.rar';
        const system7z = 'C:\\Program Files\\7-Zip\\7z.exe';
        const use7z = isRar && fs.existsSync(system7z) ? system7z : pathTo7zip;
        
        const proc = spawn(use7z, ['l', '-slt', '-p', archivePath], { windowsHide: true });
        let output = '';
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { output += data.toString(); });
        
        proc.on('close', () => {
            // ???????????
            const isZip = ext === '.zip';
            const is7z = ext === '.7z';
            
            // ???????
            const typeMatch = output.match(/Type\s*=\s*(\w+)/i);
            const archiveType = typeMatch ? typeMatch[1] : '';
            const methodMatch = output.match(/Method\s*=\s*(.+)/i);
            const encryptedMatch = output.match(/Encrypted\s*=\s*\+/i);
            let method = methodMatch ? methodMatch[1].trim() : '';
            // 检测加密：通过 Encrypted = + 标记，或者通过错误信息 "Cannot open encrypted archive"
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
            
            // 7z 加密检测
            let is7zAES = false;
            if (is7z) {
                // 7z 文件如果有加密错误或者检测到加密，就认为是 AES 加密
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
            
            // 检查 7z 文件大小 - hashcat 限制为 8MB
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
            
            // 详细调试日志
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

// ============ ?????????? ============
function tryPasswordFast(archivePath, password) {
    return new Promise((resolve) => {
        // ???? RAR ?????????? 7z????? RAR5??
        const ext = path.extname(archivePath).toLowerCase();
        const isRar = ext === '.rar';
        const system7z = 'C:\\Program Files\\7-Zip\\7z.exe';
        const use7z = isRar && fs.existsSync(system7z) ? system7z : pathTo7zip;
        
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

// ============ CPU ???????? ============
async function crackWithCPU(archivePath, options, event, id, session, startTime) {
    const { mode, charset, minLength, maxLength, dictionaryPath } = options;
    let totalAttempts = 0, found = null, currentLength = minLength || 1;
    const testBatch = async (passwords) => {
        for (const pwd of passwords) {
            if (!session.active || found) return;
            totalAttempts++;
            if (totalAttempts % 10 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                event.reply('zip:crack-progress', { id, attempts: totalAttempts, speed: elapsed > 0 ? Math.round(totalAttempts / elapsed) : 0, current: pwd, currentLength, method: 'CPU Single' });
            }
            if (await tryPasswordFast(archivePath, pwd)) { found = pwd; return; }
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
    
    // Worker ???·?? - ????????? out/main?????????? resources
    const workerPath = !app.isPackaged
        ? path.join(process.cwd(), 'out', 'main', 'crackWorker.js')
        : path.join(process.resourcesPath, 'app.asar.unpacked', 'out', 'main', 'crackWorker.js');
    
    // ??? Worker ?????????????????
    if (!fs.existsSync(workerPath)) {
        console.log('[Crack] Worker not found at:', workerPath, '- fallback to single-thread');
        event.reply('zip:crack-progress', { id, attempts: 0, speed: 0, current: 'Starting...', method: 'CPU Single' });
        return crackWithCPU(archivePath, options, event, id, session, startTime);
    }
    
    console.log('[Crack] Multi-thread CPU mode with', NUM_WORKERS, 'workers');
    event.reply('zip:crack-progress', { id, attempts: 0, speed: 0, current: 'Starting workers...', method: 'CPU Multi-thread' });
    
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
                    
                    event.reply('zip:crack-progress', {
                        id,
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
            // ?? SMART_DICTIONARY ????????棬?????????????????????
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
// ============ Hash ??? ============
// ============ Hash ??? (???????) ============


function extractZipHash(archivePath) {
    return new Promise((resolve, reject) => {
        const zip2johnPath = getJohnToolPath('zip2john.exe');
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
        const rar2johnPath = getJohnToolPath('rar2john.exe');
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
        const sevenZ2johnPath = getJohnToolPath('7z2hashcat64-2.0.exe');
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
    
    // ??? john ??????????
    const toolMap = {
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
// ============ Hashcat GPU ??? (???????) ============
async function crackWithHashcat(archivePath, options, event, id, session, startTime, encryption = null) {
    const { mode, charset, minLength, maxLength, dictionaryPath } = options;
    const hashcatPath = getHashcatPath();
    const hashcatDir = getHashcatDir();

    if (!fs.existsSync(hashcatPath)) {
        console.log('[Crack] Hashcat not available, falling back to CPU');
        return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
    }

    // ?????д??? encryption??????
    if (!encryption) {
        encryption = await detectEncryption(archivePath);
    }

    console.log('[Crack] GPU mode with hashcat, format:', encryption.format, 'mode:', encryption.hashcatMode);
    event.reply('zip:crack-progress', { id, attempts: 0, speed: 0, current: 'Extracting hash...', method: 'Hashcat GPU (' + encryption.method + ')' });

    let hash;
    try {
        hash = await extractHash(archivePath, encryption);
        console.log('[Crack] Extracted hash:', hash.substring(0, 50) + '...');
    } catch (err) {
        console.log('[Crack] Hash extraction failed:', err.message);
        event.reply('zip:crack-progress', { id, attempts: 0, speed: 0, current: 'Hash extraction failed, using CPU...', method: 'CPU Multi-thread' });
        return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
    }

    const tempDir = path.join(os.tmpdir(), 'hashcat-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    const hashFile = path.join(tempDir, 'hash.txt');
    const outFile = path.join(tempDir, 'cracked.txt');
    fs.writeFileSync(hashFile, hash);

    return new Promise((resolve) => {
        // ??ü???? hashcat ??
        const hashMode = encryption.hashcatMode || '17200';
        const args = ['-m', hashMode, '-a', mode === 'dictionary' ? '0' : '3', hashFile, '-o', outFile, '--potfile-disable', '-w', '3', '--status', '--status-timer=1'];
        
        if (mode === 'dictionary') {
            const dictPath = dictionaryPath && fs.existsSync(dictionaryPath) ? dictionaryPath : path.join(hashcatDir, 'example.dict');
            args.push(dictPath);
        } else {
            const cs = charset || 'abcdefghijklmnopqrstuvwxyz0123456789';
            let mask = '';
            if (cs.includes('a')) mask += '?l';
            if (cs.includes('A')) mask += '?u';
            if (cs.includes('0')) mask += '?d';
            if (!mask) mask = '?a';
            const minLen = minLength || 1, maxLen = Math.min(maxLength || 6, 8);
            args.push('--increment', '--increment-min=' + minLen, '--increment-max=' + maxLen, mask.repeat(maxLen));
        }

        console.log('[Crack] Hashcat command:', hashcatPath, args.join(' '));
        console.log('[Crack] Hash mode:', hashMode, '(' + getHashModeDescription(hashMode) + ')');

        // ??????? hashcat ????????
        const proc = spawn(hashcatPath, args, { cwd: hashcatDir, windowsHide: true });
        session.process = proc;

        let totalAttempts = 0, lastSpeed = 0;

        proc.stdout.on('data', (data) => {
            const line = data.toString();
            // ???????: Speed.#1.........: 1234.5 kH/s
            const speedMatch = line.match(/Speed[^:]*:\s*([\d.]+)\s*([kMGT]?)H\/s/i);
            if (speedMatch) {
                let speed = parseFloat(speedMatch[1]);
                const unit = speedMatch[2].toUpperCase();
                if (unit === 'K') speed *= 1000;
                else if (unit === 'M') speed *= 1000000;
                else if (unit === 'G') speed *= 1000000000;
                lastSpeed = Math.round(speed);
            }
            // ????????
            const progressMatch = line.match(/Progress[^:]*:\s*(\d+)/i);
            if (progressMatch) totalAttempts = parseInt(progressMatch[1]);

            if (lastSpeed > 0) {
                event.reply('zip:crack-progress', { id, attempts: totalAttempts, speed: lastSpeed, current: 'GPU processing...', method: 'Hashcat GPU (' + encryption.method + ')' });
            }
        });

        proc.stderr.on('data', (data) => { console.log('[Hashcat]', data.toString()); });

        proc.on('close', (code) => {
            let found = null;
            if (fs.existsSync(outFile)) {
                const content = fs.readFileSync(outFile, 'utf-8').trim();
                const parts = content.split(':');
                if (parts.length >= 2) found = parts[parts.length - 1];
            }
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e) {}

            if (found) { resolve({ found, attempts: totalAttempts }); }
            else if (!session.active) { resolve({ found: null, attempts: totalAttempts }); }
            else {
                console.log('[Crack] Hashcat finished without result, code:', code);
                if (code !== 0 && code !== 1) {
                    // Hashcat ????????? CPU
                    crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime).then(resolve);
                } else {
                    resolve({ found: null, attempts: totalAttempts });
                }
            }
        });

        proc.on('error', (err) => {
            console.log('[Crack] Hashcat error:', err.message);
            crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime).then(resolve);
        });
    });
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
    event.reply('zip:crack-progress', { id, attempts: 0, speed: 0, current: 'Analyzing archive...', method: 'bkcrack (Known Plaintext)' });
    
    // ??????????????б?
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
    event.reply('zip:crack-progress', { id, attempts: 0, speed: 0, current: 'Attacking ' + targetFile + '...', method: 'bkcrack' });
    
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
            event.reply('zip:crack-progress', { id, attempts: 0, speed: 0, current: 'Searching keys...', method: 'bkcrack' });
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
    // 1. ??????????
    console.log('[Crack] Detecting encryption type...');
    event.reply('zip:crack-progress', { id, attempts: 0, speed: 0, current: 'Detecting encryption...', method: 'Analyzing' });

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
    if (options.useGpu && encryption.canUseHashcat) {
        console.log('[Crack] Strategy: Hashcat GPU (mode:', encryption.hashcatMode, ')');
        return await crackWithHashcat(archivePath, options, event, id, session, startTime, encryption);
    }

    // CPU Multi-thread - ??????
    console.log('[Crack] Strategy: CPU Multi-thread');
    return await crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
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
    
    ipcMain.handle('zip:compress', async (event, { files, outputPath, format, password, compressionLevel }) => {
        return new Promise((resolve, reject) => {
            try {
                const output = fs.createWriteStream(outputPath);
                let archive;
                if (format === 'zip' && password) { archive = archiver.create('zip-encrypted', { zlib: { level: compressionLevel || 6 }, encryptionMethod: 'aes256', password }); }
                else if (format === 'zip') { archive = archiver('zip', { zlib: { level: compressionLevel || 6 } }); }
                else if (format === 'tar') { archive = archiver('tar'); }
                else if (format === 'tar.gz') { archive = archiver('tar', { gzip: true, gzipOptions: { level: compressionLevel || 6 } }); }
                else { archive = archiver('zip', { zlib: { level: compressionLevel || 6 } }); }
                output.on('close', () => resolve({ success: true, size: archive.pointer() }));
                archive.on('error', reject);
                archive.pipe(output);
                files.forEach(file => {
                    if (fs.statSync(file).isDirectory()) { archive.directory(file, path.basename(file)); }
                    else { archive.file(file, { name: path.basename(file) }); }
                });
                archive.finalize();
            } catch (err) { reject(err); }
        });
    });
    
    ipcMain.handle('zip:decompress', async (event, { archivePath, outputDir, password }) => {
        return new Promise((resolve, reject) => {
            const args = ['x', '-y', '-o' + outputDir];
            if (password) args.push('-p' + password);
            args.push(archivePath);
            const proc = spawn(pathTo7zip, args, { windowsHide: true });
            let error = '';
            proc.stderr.on('data', (data) => { error += data.toString(); });
            proc.on('close', (code) => { if (code === 0) resolve({ success: true }); else reject(new Error(error || 'Decompression failed')); });
            proc.on('error', reject);
        });
    });
    
    ipcMain.on('zip:crack-start', async (event, { id, archivePath, options }) => {
        console.log('[Crack] Starting crack for:', archivePath);
        console.log('[Crack] Options:', JSON.stringify(options));
        
        const session = { active: true, process: null, cleanup: null };
        crackSessions.set(id, session);
        const startTime = Date.now();
        
        try {
            // ?????????????
            const result = await crackWithSmartStrategy(archivePath, options, event, id, session, startTime);
            
            crackSessions.delete(id);
            const elapsed = (Date.now() - startTime) / 1000;
            
            if (result.found) {
                console.log('[Crack] Password found:', result.found);
                event.reply('zip:crack-complete', { id, success: true, password: result.found, attempts: result.attempts, time: elapsed });
            } else if (!session.active) {
                console.log('[Crack] Stopped by user');
                event.reply('zip:crack-complete', { id, success: false, stopped: true, attempts: result.attempts, time: elapsed });
            } else {
                console.log('[Crack] Password not found');
                event.reply('zip:crack-complete', { id, success: false, attempts: result.attempts, time: elapsed });
            }
        } catch (err) {
            console.error('[Crack] Error:', err);
            crackSessions.delete(id);
            event.reply('zip:crack-complete', { id, success: false, error: err.message });
        }
    });
    
    ipcMain.on('zip:crack-stop', (event, { id }) => {
        console.log('[Crack] Stop requested for:', id);
        const session = crackSessions.get(id);
        if (session) {
            session.active = false;
            if (session.process) { try { session.process.kill(); } catch(e) {} }
            if (session.cleanup) { try { session.cleanup(); } catch(e) {} }
        }
    });
};
