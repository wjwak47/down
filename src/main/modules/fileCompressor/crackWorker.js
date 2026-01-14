/**
 * Worker thread for parallel password cracking
 * Optimized for high-speed batch processing
 * 
 * NOTE: Using CommonJS syntax for Worker thread compatibility
 */
const { parentPort } = require('worker_threads');
const { spawn } = require('child_process');
const sevenBin = require('7zip-bin');

const pathTo7zip = sevenBin.path7za;

console.log('[CrackWorker] Worker started, waiting for messages...');

// Fast password verification using 7z test command
function tryPasswordFast(archivePath, password, customPath) {
    return new Promise((resolve) => {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const ext = path.extname(archivePath).toLowerCase();
        const isRar = ext === '.rar';
        const isMac = os.platform() === 'darwin';
        
        let zipPath = customPath || pathTo7zip;
        
        // Get system 7z path (cross-platform)
        let system7z = null;
        if (isMac) {
            // Mac: check common homebrew paths
            const brewPath = '/opt/homebrew/bin/7z';
            const usrPath = '/usr/local/bin/7z';
            if (fs.existsSync(brewPath)) system7z = brewPath;
            else if (fs.existsSync(usrPath)) system7z = usrPath;
        } else {
            // Windows
            const win7z = 'C:\\Program Files\\7-Zip\\7z.exe';
            if (fs.existsSync(win7z)) system7z = win7z;
        }
        
        // Use system 7z for RAR if available
        if (isRar && system7z) {
            zipPath = system7z;
        }
        
        const args = ['t', '-p' + password, '-y', archivePath];
        const proc = spawn(zipPath, args, { 
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
        });
        
        let resolved = false;
        
        proc.on('close', (code) => {
            if (!resolved) {
                resolved = true;
                resolve(code === 0);
            }
        });
        
        proc.on('error', () => {
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
        });
        
        // Timeout after 2 seconds
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                try { proc.kill(); } catch(e) {}
                resolve(false);
            }
        }, 2000);
    });
}

// Generate password batch for bruteforce
function generatePasswordBatch(charset, length, startIdx, count) {
    const chars = charset.split('');
    const charLen = chars.length;
    const passwords = [];
    const total = Math.pow(charLen, length);
    
    for (let i = 0; i < count && (startIdx + i) < total; i++) {
        let pwd = '';
        let rem = startIdx + i;
        for (let j = 0; j < length; j++) {
            pwd = chars[rem % charLen] + pwd;
            rem = Math.floor(rem / charLen);
        }
        passwords.push(pwd);
    }
    return passwords;
}

// Apply common password rules/variations
function applyRules(word) {
    const variants = [word];
    
    // Basic variations
    variants.push(word.toLowerCase());
    variants.push(word.toUpperCase());
    variants.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    
    // Common suffixes
    const suffixes = ['1', '12', '123', '!', '1!', '01', '69', '666', '888'];
    for (const suffix of suffixes) {
        variants.push(word + suffix);
        variants.push(word.toLowerCase() + suffix);
    }
    
    // Year suffixes
    for (let year = 2020; year <= 2026; year++) {
        variants.push(word + year);
    }
    
    return [...new Set(variants)]; // Remove duplicates
}

// Handle dictionary mode
async function handleDictionary(data) {
    const { archivePath, words, pathTo7zip: customPath } = data;
    let tested = 0;
    
    console.log(`[CrackWorker] Dictionary mode: ${words?.length || 0} words`);
    
    if (!words || words.length === 0) {
        parentPort.postMessage({ type: 'done', tested: 0 });
        return;
    }
    
    for (const word of words) {
        // Apply rules to each word
        const variants = applyRules(word);
        
        for (const password of variants) {
            tested++;
            
            // Report progress every 10 passwords
            if (tested % 10 === 0) {
                parentPort.postMessage({
                    type: 'progress',
                    tested,
                    current: password
                });
            }
            
            const success = await tryPasswordFast(archivePath, password, customPath);
            
            if (success) {
                console.log(`[CrackWorker] Found password: ${password}`);
                parentPort.postMessage({
                    type: 'found',
                    password,
                    tested
                });
                return;
            }
        }
    }
    
    parentPort.postMessage({ type: 'done', tested });
}

// Handle bruteforce mode
async function handleBruteforce(data) {
    const { archivePath, charset, minLength, maxLength, startIdx, endIdx, pathTo7zip: customPath } = data;
    let tested = 0;
    let currentIdx = startIdx;
    
    console.log(`[CrackWorker] Bruteforce mode: ${startIdx} to ${endIdx}`);
    
    for (let len = minLength; len <= maxLength; len++) {
        const total = Math.pow(charset.length, len);
        
        while (currentIdx < Math.min(endIdx, total)) {
            const batch = generatePasswordBatch(charset, len, currentIdx, 100);
            
            for (const password of batch) {
                tested++;
                currentIdx++;
                
                if (tested % 10 === 0) {
                    parentPort.postMessage({
                        type: 'progress',
                        tested,
                        current: password,
                        currentLength: len
                    });
                }
                
                const success = await tryPasswordFast(archivePath, password, customPath);
                
                if (success) {
                    console.log(`[CrackWorker] Found password: ${password}`);
                    parentPort.postMessage({
                        type: 'found',
                        password,
                        tested
                    });
                    return;
                }
            }
        }
    }
    
    parentPort.postMessage({ type: 'done', tested });
}

// Listen for messages from main thread
parentPort.on('message', async (data) => {
    console.log(`[CrackWorker] Received message type: ${data.type}`);
    
    try {
        if (data.type === 'dictionary') {
            await handleDictionary(data);
        } else if (data.type === 'bruteforce') {
            await handleBruteforce(data);
        } else {
            console.log(`[CrackWorker] Unknown message type: ${data.type}`);
            parentPort.postMessage({ type: 'done', tested: 0 });
        }
    } catch (err) {
        console.error('[CrackWorker] Error:', err);
        parentPort.postMessage({
            type: 'error',
            error: err.message
        });
    }
});
