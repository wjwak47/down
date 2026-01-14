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

// ============ ��????????? ============
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
    
    // Worker ???��?? - ????????? out/main?????????? resources
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
// ============ GPU ������ˮ������ ============
const GPU_ATTACK_PHASES = {
    1: { name: 'Dictionary', method: 'Hashcat GPU Dictionary', description: 'Built-in Dictionary' },
    2: { name: 'Rule', method: 'Hashcat GPU Rule Attack', description: 'Rule Transform' },
    3: { name: 'Mask', method: 'Hashcat GPU Smart Mask', description: 'Smart Mask' },
    4: { name: 'Hybrid', method: 'Hashcat GPU Hybrid', description: 'Hybrid Attack' },
    5: { name: 'Keyboard', method: 'Hashcat GPU Keyboard', description: 'Keyboard Patterns' },
    6: { name: 'Bruteforce', method: 'Hashcat GPU Bruteforce', description: 'Short Bruteforce' },
    7: { name: 'CPU', method: 'CPU Smart Dictionary', description: 'CPU Smart Dict' }
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
                event.reply('zip:crack-progress', { id, attempts: totalAttempts, speed: lastSpeed, current: phaseName, method: GPU_ATTACK_PHASES[session.currentPhase]?.method || phaseName });
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

// ============ Phase 2: ���򹥻� ============
async function runRuleAttack(hashFile, outFile, hashMode, event, id, session, previousAttempts) {
    const hashcatDir = getHashcatDir();
    const wordlist = path.join(hashcatDir, 'combined_wordlist.txt');
    const rulePath = path.join(hashcatDir, 'rules', 'dive.rule');
    
    if (!fs.existsSync(rulePath)) {
        console.log('[Crack] best64.rule not found, skipping rule attack');
        return { found: null, attempts: previousAttempts, exhausted: true };
    }
    
    session.currentPhase = 2;
    event.reply('zip:crack-progress', { id, attempts: previousAttempts, speed: 0, current: 'Starting rule attack...', method: 'Hashcat GPU Rule Attack' });
    
    const args = ['-a', '0', '-r', rulePath, wordlist];
    return runHashcatPhase(hashFile, outFile, hashMode, args, 'Rule Attack', event, id, session, previousAttempts);
}

// ============ Phase 3: �������빥�� ============
async function runMaskAttack(hashFile, outFile, hashMode, event, id, session, previousAttempts) {
    session.currentPhase = 3;
    let totalAttempts = previousAttempts;
    
    for (const maskConfig of SMART_MASKS) {
        if (!session.active) break;
        
        event.reply('zip:crack-progress', { id, attempts: totalAttempts, speed: 0, current: `Mask: ${maskConfig.desc}`, method: 'Hashcat GPU Smart Mask' });
        
        const args = ['-a', '3', maskConfig.mask];
        const result = await runHashcatPhase(hashFile, outFile, hashMode, args, `Mask (${maskConfig.desc})`, event, id, session, totalAttempts);
        
        totalAttempts = result.attempts;
        if (result.found) return result;
    }
    
    return { found: null, attempts: totalAttempts, exhausted: true };
}

// ============ Phase 4: ��Ϲ��� ============
async function runHybridAttack(hashFile, outFile, hashMode, event, id, session, previousAttempts) {
    const hashcatDir = getHashcatDir();
    const wordlist = path.join(hashcatDir, 'combined_wordlist.txt');
    
    session.currentPhase = 4;
    let totalAttempts = previousAttempts;
    
    // Mode 6: wordlist + mask (word + digits)
    for (const suffix of HYBRID_SUFFIXES) {
        if (!session.active) break;
        
        event.reply('zip:crack-progress', { id, attempts: totalAttempts, speed: 0, current: `Hybrid: word+${suffix}`, method: 'Hashcat GPU Hybrid' });
        
        const args = ['-a', '6', wordlist, suffix];
        const result = await runHashcatPhase(hashFile, outFile, hashMode, args, `Hybrid (word+${suffix})`, event, id, session, totalAttempts);
        
        totalAttempts = result.attempts;
        if (result.found) return result;
    }
    
    // Mode 7: mask + wordlist (digits + word) - ֻ��һ��
    if (session.active) {
        event.reply('zip:crack-progress', { id, attempts: totalAttempts, speed: 0, current: 'Hybrid: ?d?d?d?d+word', method: 'Hashcat GPU Hybrid' });
        
        const args = ['-a', '7', '?d?d?d?d', wordlist];
        const result = await runHashcatPhase(hashFile, outFile, hashMode, args, 'Hybrid (?d?d?d?d+word)', event, id, session, totalAttempts);
        
        totalAttempts = result.attempts;
        if (result.found) return result;
    }
    
    return { found: null, attempts: totalAttempts, exhausted: true };
}


// ============ Phase 5: ����ģʽ���� ============
async function runKeyboardAttack(hashFile, outFile, hashMode, event, id, session, previousAttempts) {
    const hashcatDir = getHashcatDir();
    session.currentPhase = 5;
    
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
    
    event.reply('zip:crack-progress', { id, attempts: previousAttempts, speed: 0, current: 'Keyboard patterns attack...', method: 'Hashcat GPU Keyboard' });
    
    const args = ['-a', '0', keyboardDict];
    const result = await runHashcatPhase(hashFile, outFile, hashMode, args, 'Keyboard Patterns', event, id, session, previousAttempts);
    
    // ������ʱ�ļ�
    try { fs.unlinkSync(keyboardDict); } catch(e) {}
    
    return result;
}
// ============ Phase 5: �����뱩�� ============
async function runShortBruteforce(hashFile, outFile, hashMode, event, id, session, previousAttempts, options = {}) {
    session.currentPhase = 6;
    
    // Use user settings if provided, otherwise use defaults
    const { charset, minLength, maxLength } = options;
    const minLen = minLength || 1;
    const maxLen = Math.min(maxLength || 6, 10); // GPU max 10 chars
    
    // Build hashcat mask based on user charset selection
    let maskChar = '?a'; // default: all printable
    if (charset) {
        const hasLower = charset.includes('abcdefghijklmnopqrstuvwxyz'.charAt(0));
        const hasUpper = charset.includes('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(0));
        const hasDigit = charset.includes('0');
        const hasSpecial = charset.includes('!') || charset.includes('@');
        
        if (hasDigit && !hasLower && !hasUpper && !hasSpecial) {
            maskChar = '?d'; // digits only
        } else if (hasLower && !hasUpper && !hasDigit && !hasSpecial) {
            maskChar = '?l'; // lowercase only
        } else if (hasUpper && !hasLower && !hasDigit && !hasSpecial) {
            maskChar = '?u'; // uppercase only
        } else if (hasLower && hasDigit && !hasUpper && !hasSpecial) {
            maskChar = '?h'; // lowercase + digits (custom charset needed)
        } else if (hasLower && hasUpper && hasDigit && !hasSpecial) {
            maskChar = '?a'; // alphanumeric - use ?a for simplicity
        } else {
            maskChar = '?a'; // all printable
        }
    }
    
    // Always use custom charset (-1) for precise control
    let args;
    if (charset && charset.length > 0) {
        // Use user's exact charset as custom charset
        const mask = '?1'.repeat(maxLen);
        args = ['-a', '3', '-1', charset, '--increment', '--increment-min=' + minLen, '--increment-max=' + maxLen, mask];
    } else {
        // Default: all printable characters
        const mask = '?a'.repeat(maxLen);
        args = ['-a', '3', '--increment', '--increment-min=' + minLen, '--increment-max=' + maxLen, mask];
    }
    
    const charsetDesc = charset ? charset.substring(0, 20) + (charset.length > 20 ? '...' : '') : 'default';
    event.reply('zip:crack-progress', { id, attempts: previousAttempts, speed: 0, current: `Bruteforce (${minLen}-${maxLen} chars, ${charsetDesc})...`, method: 'Hashcat GPU Bruteforce' });
    
    console.log('[Crack] Bruteforce with user settings - charset:', charsetDesc, 'length:', minLen, '-', maxLen);
    console.log('[Crack] Hashcat args:', args.join(' '));
    
    return runHashcatPhase(hashFile, outFile, hashMode, args, 'User Bruteforce', event, id, session, previousAttempts);
}


// ============ GPU Bruteforce �����ƽ⺯�� ============
async function runHashcatBruteforce(archivePath, encryption, options, event, id, session, startTime, previousAttempts = 0) {
    const { charset, minLength, maxLength } = options;
    const hashcatPath = getHashcatPath();
    const hashcatDir = getHashcatDir();
    
    console.log('[Crack] Starting GPU bruteforce attack');
    
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
        
        // �������� - �����ַ���
        const cs = charset || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let maskChar = '?a'; // Ĭ�����пɴ�ӡ�ַ�
        if (cs === 'abcdefghijklmnopqrstuvwxyz0123456789') {
            maskChar = '?l?d'; // Сд+����
        } else if (cs.includes('A') && cs.includes('a') && cs.includes('0')) {
            maskChar = '?a'; // ����
        } else if (cs.includes('a') && !cs.includes('A')) {
            maskChar = '?l'; // ��Сд
        }
        
        const minLen = minLength || 1;
        const maxLen = Math.min(maxLength || 8, 10); // GPU �������10λ
        
        // ʹ������ģʽ�Ӷ̵�������
        const args = [
            '-m', hashMode,
            '-a', '3',  // ����/����ģʽ
            hashFile,
            '-o', outFile,
            '--potfile-disable',
            '-w', '3',
            '--status',
            '--status-timer=2',
            '--increment',
            '--increment-min=' + minLen,
            '--increment-max=' + maxLen,
            '?a?a?a?a?a?a?a?a?a?a'.substring(0, maxLen * 2) // ����
        ];
        
        console.log('[Crack] GPU Bruteforce command:', hashcatPath, args.join(' '));
        console.log('[Crack] Bruteforce range:', minLen, '-', maxLen, 'characters');
        
        const proc = spawn(hashcatPath, args, { cwd: hashcatDir, windowsHide: true });
        session.process = proc;
        
        let totalAttempts = previousAttempts, lastSpeed = 0, currentLength = minLen;
        
        proc.stdout.on('data', (data) => {
            const line = data.toString();
            
            // �����ٶ�
            const speedMatch = line.match(/Speed[^:]*:\s*([\d.]+)\s*([kMGT]?)H\/s/i);
            if (speedMatch) {
                let speed = parseFloat(speedMatch[1]);
                const unit = speedMatch[2].toUpperCase();
                if (unit === 'K') speed *= 1000;
                else if (unit === 'M') speed *= 1000000;
                else if (unit === 'G') speed *= 1000000000;
                lastSpeed = Math.round(speed);
            }
            
            // ��������
            const progressMatch = line.match(/Progress[^:]*:\s*(\d+)/i);
            if (progressMatch) totalAttempts = previousAttempts + parseInt(progressMatch[1]);
            
            // ������ǰ����
            const lengthMatch = line.match(/Guess\.Mask[^:]*:\s*\?a{(\d+)}/i);
            if (lengthMatch) currentLength = parseInt(lengthMatch[1]);
            
            if (lastSpeed > 0) {
                event.reply('zip:crack-progress', { 
                    id, 
                    attempts: totalAttempts, 
                    speed: lastSpeed, 
                    current: `GPU bruteforce (${currentLength} chars)...`, 
                    method: 'Hashcat GPU Bruteforce',
                    currentLength 
                });
            }
        });
        
        proc.stderr.on('data', (data) => { 
            const msg = data.toString();
            if (!msg.includes('nvmlDeviceGetFanSpeed')) {
                console.log('[Hashcat Brute]', msg); 
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
            
            console.log('[Crack] GPU bruteforce finished, code:', code, 'found:', !!found);
            resolve({ found, attempts: totalAttempts });
        });
        
        proc.on('error', (err) => {
            console.log('[Crack] GPU bruteforce error:', err.message);
            try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch(e) {}
            resolve({ found: null, attempts: totalAttempts });
        });
    });
}
// ============ Hashcat GPU ������ˮ�� ============
async function crackWithHashcat(archivePath, options, event, id, session, startTime, encryption = null) {
    const hashcatPath = getHashcatPath();
    const hashcatDir = getHashcatDir();
    const attackMode = options.mode || 'dictionary'; // 'dictionary' or 'bruteforce'
    const isBruteforceMode = attackMode === 'bruteforce';

    console.log('[Crack] Attack mode selected:', attackMode, '- Skip dictionary phases:', isBruteforceMode);

    if (!fs.existsSync(hashcatPath)) {
        console.log('[Crack] Hashcat not available, falling back to CPU');
        return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
    }

    if (!encryption) {
        encryption = await detectEncryption(archivePath);
    }

    console.log('[Crack] Starting GPU crack pipeline, format:', encryption.format, 'mode:', encryption.hashcatMode);
    
    // ��ȡ hash
    let hash;
    try {
        hash = await extractHash(archivePath, encryption);
        console.log('[Crack] Extracted hash:', hash.substring(0, 50) + '...');
    } catch (err) {
        console.log('[Crack] Hash extraction failed:', err.message);
        event.reply('zip:crack-progress', { id, attempts: 0, speed: 0, current: 'Hash extraction failed, using CPU...', method: 'CPU Multi-thread' });
        return crackWithMultiThreadCPU(archivePath, options, event, id, session, startTime);
    }

    // ������ʱ�ļ�
    const tempDir = path.join(os.tmpdir(), 'hashcat-pipeline-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    const hashFile = path.join(tempDir, 'hash.txt');
    const outFile = path.join(tempDir, 'cracked.txt');
    fs.writeFileSync(hashFile, hash);

    const hashMode = encryption.hashcatMode || '17200';
    let totalAttempts = 0;
    session.currentPhase = 1;

    try {
        // ========== Phase 1: Dictionary Attack (skip in bruteforce mode) ==========
        if (!isBruteforceMode) {
            console.log('[Crack] Phase 1: Dictionary Attack');
            event.reply('zip:crack-progress', { id, attempts: 0, speed: 0, current: 'Starting dictionary attack...', method: 'Hashcat GPU Dictionary' });

            // Use rockyou.txt (14M passwords) or combined_wordlist.txt
            let dictPath = path.join(hashcatDir, 'rockyou.txt');
            if (!fs.existsSync(dictPath)) {
                dictPath = path.join(hashcatDir, 'combined_wordlist.txt');
            }
            const builtinDict = dictPath;
            console.log('[Crack] Using dictionary:', path.basename(builtinDict));

            if (fs.existsSync(builtinDict)) {
                const args = ['-a', '0', builtinDict];
                const result = await runHashcatPhase(hashFile, outFile, hashMode, args, 'Dictionary', event, id, session, 0);
                totalAttempts = result.attempts;

                if (result.found) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                    return { found: result.found, attempts: totalAttempts };
                }
            }
        } else {
            console.log('[Crack] Skipping Phase 1 (Dictionary) - Bruteforce mode selected');
        }

        // ========== Phase 2: Rule Attack (skip in bruteforce mode) ==========
        if (session.active && !isBruteforceMode) {
            console.log('[Crack] Phase 2: Rule Attack');
            const result = await runRuleAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;

            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        } else if (isBruteforceMode) {
            console.log('[Crack] Skipping Phase 2 (Rule) - Bruteforce mode selected');
        }

        // ========== Phase 3: �������빥�� ==========
        if (session.active) {
            console.log('[Crack] Phase 3: Smart Mask Attack');
            const result = await runMaskAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;
            
            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        }

        // ========== Phase 4: ��Ϲ��� ==========
        if (session.active && !isBruteforceMode) {
            console.log('[Crack] Phase 4: Hybrid Attack');
            const result = await runHybridAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;
            
            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        } else if (isBruteforceMode) {
            console.log('[Crack] Skipping Phase 4 (Hybrid) - Bruteforce mode selected');
        }

        // ========== Phase 5: ����ģʽ���� ==========
        if (session.active) {
            console.log('[Crack] Phase 5: Keyboard Patterns Attack');
            const result = await runKeyboardAttack(hashFile, outFile, hashMode, event, id, session, totalAttempts);
            totalAttempts = result.attempts;
            
            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        }

        // ========== Phase 6: �����뱩�� ==========
        if (session.active) {
            console.log('[Crack] Phase 6: Short Bruteforce');
            const result = await runShortBruteforce(hashFile, outFile, hashMode, event, id, session, totalAttempts, options);
            totalAttempts = result.attempts;
            
            if (result.found) {
                fs.rmSync(tempDir, { recursive: true, force: true });
                return { found: result.found, attempts: totalAttempts };
            }
        }

        // ========== Phase 7: CPU �����ֵ���� ==========
        if (session.active) {
            console.log('[Crack] Phase 7: CPU Smart Dictionary Fallback');
            session.currentPhase = 7;
            event.reply('zip:crack-progress', { id, attempts: totalAttempts, speed: 0, current: 'GPU exhausted, trying CPU smart dictionary...', method: 'CPU Smart Dictionary' });
            
            fs.rmSync(tempDir, { recursive: true, force: true });
            
            // CPU ֻ���ֵ�ģʽ��������
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
    event.reply('zip:crack-progress', { id, attempts: 0, speed: 0, current: 'Analyzing archive...', method: 'bkcrack (Known Plaintext)' });
    
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
