/**
 * Post-build script to copy crackWorker.js to out/main/
 * This is needed because the worker file uses CommonJS and needs to be in the output directory
 */
const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'src', 'main', 'modules', 'fileCompressor', 'crackWorker.js');
const destDir = path.join(__dirname, '..', 'out', 'main');
const destPath = path.join(destDir, 'crackWorker.js');

console.log('[copy-worker] Copying crackWorker.js to out/main/');

// Ensure destination directory exists
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log('[copy-worker] Created directory:', destDir);
}

// Copy the file
try {
    fs.copyFileSync(srcPath, destPath);
    console.log('[copy-worker] Successfully copied crackWorker.js');
    console.log('[copy-worker] From:', srcPath);
    console.log('[copy-worker] To:', destPath);
} catch (err) {
    console.error('[copy-worker] Error copying file:', err.message);
    process.exit(1);
}
