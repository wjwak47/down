/**
 * Hash Extractor for Password Cracking
 * Extracts hashes from ZIP, RAR, and 7z files for use with Hashcat
 * 
 * This is a pure JavaScript implementation that doesn't require external tools
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import sevenBin from '7zip-bin';

const pathTo7zip = sevenBin.path7za;

/**
 * Extract hash from ZIP file using 7z output parsing
 * For Hashcat mode 17200 (PKZIP) or 13600 (WinZip AES)
 */
export async function extractZipHashNative(archivePath) {
    return new Promise((resolve, reject) => {
        // Use 7z to get detailed file info
        const proc = spawn(pathTo7zip, ['l', '-slt', archivePath], { windowsHide: true });
        let output = '';
        
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { console.log('[HashExtractor]', data.toString()); });
        
        proc.on('close', (code) => {
            try {
                // Parse the output to get encryption info
                const files = output.split('----------').slice(1);
                if (files.length === 0) {
                    reject(new Error('No files found in archive'));
                    return;
                }
                
                // Get first encrypted file info
                let fileInfo = null;
                for (const f of files) {
                    if (f.includes('Encrypted = +')) {
                        fileInfo = f;
                        break;
                    }
                }
                
                if (!fileInfo) {
                    reject(new Error('No encrypted files found'));
                    return;
                }
                
                // Extract relevant fields
                const pathMatch = fileInfo.match(/Path\s*=\s*(.+)/i);
                const methodMatch = fileInfo.match(/Method\s*=\s*(.+)/i);
                const sizeMatch = fileInfo.match(/Size\s*=\s*(\d+)/i);
                const packedMatch = fileInfo.match(/Packed Size\s*=\s*(\d+)/i);
                const crcMatch = fileInfo.match(/CRC\s*=\s*([0-9A-Fa-f]+)/i);
                
                const fileName = pathMatch ? pathMatch[1].trim() : 'unknown';
                const method = methodMatch ? methodMatch[1].trim() : '';
                const size = sizeMatch ? parseInt(sizeMatch[1]) : 0;
                const packedSize = packedMatch ? parseInt(packedMatch[1]) : 0;
                const crc = crcMatch ? crcMatch[1] : '';
                
                // Determine hash type
                const isAES = method.toLowerCase().includes('aes');
                const isZipCrypto = method.toLowerCase().includes('zipcrypto');
                
                // For now, return a placeholder that indicates we need external tools
                // Real hash extraction requires reading the ZIP file binary structure
                resolve({
                    type: isAES ? 'winzip-aes' : 'pkzip',
                    hashcatMode: isAES ? '13600' : '17200',
                    fileName,
                    method,
                    size,
                    packedSize,
                    crc,
                    needsExternalTool: true,
                    message: 'Full hash extraction requires zip2john tool'
                });
            } catch (err) {
                reject(err);
            }
        });
        
        proc.on('error', reject);
    });
}

/**
 * Extract hash from RAR file
 * For Hashcat mode 13000 (RAR5) or 12500 (RAR3)
 */
export async function extractRarHashNative(archivePath) {
    return new Promise((resolve, reject) => {
        const proc = spawn(pathTo7zip, ['l', '-slt', archivePath], { windowsHide: true });
        let output = '';
        
        proc.stdout.on('data', (data) => { output += data.toString(); });
        
        proc.on('close', (code) => {
            try {
                const isRar5 = output.includes('RAR5') || output.includes('AES-256');
                const isEncrypted = output.includes('Encrypted = +');
                
                if (!isEncrypted) {
                    reject(new Error('RAR file is not encrypted'));
                    return;
                }
                
                resolve({
                    type: isRar5 ? 'rar5' : 'rar3',
                    hashcatMode: isRar5 ? '13000' : '12500',
                    needsExternalTool: true,
                    message: 'Full hash extraction requires rar2john tool'
                });
            } catch (err) {
                reject(err);
            }
        });
        
        proc.on('error', reject);
    });
}

/**
 * Extract hash from 7z file
 * For Hashcat mode 11600 (7-Zip)
 */
export async function extract7zHashNative(archivePath) {
    return new Promise((resolve, reject) => {
        const proc = spawn(pathTo7zip, ['l', '-slt', archivePath], { windowsHide: true });
        let output = '';
        
        proc.stdout.on('data', (data) => { output += data.toString(); });
        
        proc.on('close', (code) => {
            try {
                const isEncrypted = output.includes('Encrypted = +') || output.includes('7zAES');
                
                if (!isEncrypted) {
                    reject(new Error('7z file is not encrypted'));
                    return;
                }
                
                resolve({
                    type: '7z',
                    hashcatMode: '11600',
                    needsExternalTool: true,
                    message: 'Full hash extraction requires 7z2john tool'
                });
            } catch (err) {
                reject(err);
            }
        });
        
        proc.on('error', reject);
    });
}

/**
 * Check if John tools are available (cross-platform)
 */
export function checkJohnTools(resourcesPath) {
    const isMac = process.platform === 'darwin';
    const tools = isMac 
        ? ['zip2john', 'rar2john', '7z2hashcat']
        : ['zip2john.exe', 'rar2john.exe', '7z2hashcat64-2.0.exe'];
    const johnPath = isMac 
        ? path.join(resourcesPath, 'john-mac', 'run')
        : path.join(resourcesPath, 'john');
    
    const available = {};
    for (const tool of tools) {
        const toolPath = path.join(johnPath, tool);
        available[tool] = fs.existsSync(toolPath);
    }
    
    return available;
}

export default {
    extractZipHashNative,
    extractRarHashNative,
    extract7zHashNative,
    checkJohnTools
};
