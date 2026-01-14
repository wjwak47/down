import { app, shell, BrowserWindow, ipcMain, dialog, clipboard } from 'electron'
import { join } from 'path'
import fs from 'fs'
// Removed @electron-toolkit/utils due to compatibility issues - using native Electron APIs instead
import ytDlpService from './services/yt-dlp'
import eudicService from './services/eudic'
import geminiTranscribeService, { MODELS as GEMINI_MODELS } from './services/gemini-transcribe'
import groqWhisperService from './services/groq-whisper'
import { convertToMP3 } from './services/groq-whisper-helpers'
import autoUpdaterService from './services/auto-updater'
import { extractAudio, getFfmpegPath, getAudioDuration, extractAudioSegment, mergeAudioFiles } from './utils/ffmpeg-helper'
import { registerMediaConverter } from './modules/mediaConverter'

import { registerDocumentConverter } from './modules/documentConverter'
import { registerFileCompressor } from './modules/fileCompressor'
import { registerWatermarkRemover } from './modules/watermarkRemover'
import gpuDetector from './services/gpuDetector'
import gpuSettings from './services/gpuSettings'

// Note: Module registration is done inside app.whenReady()
// isDev helper function - can't use app.isPackaged directly at module load time
// Uses environment variables set by electron-vite during dev mode
const getIsDev = () => {
    // electron-vite sets ELECTRON_RENDERER_URL in dev mode
    if (process.env['ELECTRON_RENDERER_URL']) return true;
    // Fallback: check NODE_ENV
    if (process.env.NODE_ENV === 'development') return true;
    // In production builds, these won't be set
    return false;
};
// Lazy evaluated variable for convenience
let _isDev = null;
const isDev = () => {
    if (_isDev === null) {
        try {
            // If app is ready, use the official method
            _isDev = !app.isPackaged;
        } catch {
            // Fallback to environment check
            _isDev = getIsDev();
        }
    }
    return _isDev;
};

// Suppress Electron internal warnings
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
// Hide internal Chromium logs
app.commandLine.appendSwitch('log-level', '3'); // 3 = FATAL only

function createWindow() {
    // 获取主显示器的工作区域大小
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // 根据屏幕分辨率动态计算窗口尺寸
    // 默认窗口大小为屏幕的 85%
    const defaultWidth = Math.round(screenWidth * 0.85);
    const defaultHeight = Math.round(screenHeight * 0.85);

    // 最小窗口尺寸 - 根据屏幕分辨率动态计算
    // 最小为屏幕的 60%，确保 UI 有足够空间显示
    const minWidth = Math.round(screenWidth * 0.6);
    const minHeight = Math.round(screenHeight * 0.6);

    console.log(`[Window] Screen: ${screenWidth}x${screenHeight}, Default: ${defaultWidth}x${defaultHeight}, Min: ${minWidth}x${minHeight}`);

    const mainWindow = new BrowserWindow({
        width: defaultWidth,
        height: defaultHeight,
        minWidth: minWidth,
        minHeight: minHeight,
        show: false,
        autoHideMenuBar: true,
        title: 'ProFlow Studio v1.1.2',
        center: true,
        icon: join(__dirname, '../../build/icon.png'),
        ...(process.platform === 'linux' ? {} : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            webviewTag: true,
            webSecurity: false,
            autoplayPolicy: 'no-user-gesture-required'
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()

        // Initialize auto-updater with main window
        autoUpdaterService.setMainWindow(mainWindow)

        // Check for updates on startup (in production only)
        if (!isDev()) {
            setTimeout(() => {
                autoUpdaterService.checkForUpdates(true) // silent=true, don't show dialog if already latest
            }, 3000) // Wait 3 seconds after startup
        }
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    if (isDev() && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // Explicitly ensure main window is NOT muted
    mainWindow.webContents.setAudioMuted(false);

    // Allow YouTube iframe embeds and external content
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const allowedPermissions = ['media', 'mediaKeySystem', 'autoplay', 'fullscreen', 'pointerLock', 'clipboard-read'];
        if (allowedPermissions.includes(permission)) {
            callback(true);
        } else {
            callback(false);
        }
    });

    // Set main window for services that need to broadcast events
    groqWhisperService.setMainWindow(mainWindow);

    return mainWindow;
}

// Force autoplay policy at the app level
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required-user-activation-for-web-audio');
app.commandLine.appendSwitch('disable-site-isolation-trials');

app.whenReady().then(() => {
    // Register modules (must be done after app is ready)
    registerMediaConverter();
    registerDocumentConverter();
    registerWatermarkRemover();
    registerFileCompressor();

    // Native Electron API instead of electronApp.setAppUserModelId
    app.setAppUserModelId('com.proflow.studio')

    // Window shortcuts watcher removed (was optimizer.watchWindowShortcuts)

    // Create HTTP proxy server
    const http = require('http');
    const https = require('https');
    const videoCache = new Map();

    const proxyServer = http.createServer((req, res) => {
        console.log('[Proxy] Request:', req.method, req.url);

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        const resourceId = req.url.slice(1);
        const resourceInfo = videoCache.get(resourceId);

        if (!resourceInfo) {
            console.log('[Proxy] Not found:', resourceId);
            res.writeHead(404);
            res.end('Not found');
            return;
        }

        console.log('[Proxy] Proxying:', resourceInfo.url, resourceInfo.isImage ? '(image)' : '(video)');
        const resourceUrl = resourceInfo.url;

        // Handle image proxy (for Bilibili thumbnails)
        if (resourceInfo.isImage) {
            const imgProtocol = resourceUrl.startsWith('https') ? https : http;
            const imgOptions = {
                headers: resourceInfo.headers || {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://www.bilibili.com/'
                }
            };

            imgProtocol.get(resourceUrl, imgOptions, (imgResponse) => {
                console.log('[Proxy] Image response status:', imgResponse.statusCode);
                
                // Handle redirects
                if (imgResponse.statusCode === 301 || imgResponse.statusCode === 302 || imgResponse.statusCode === 307) {
                    const redirectUrl = imgResponse.headers.location;
                    console.log('[Proxy] Image redirecting to:', redirectUrl);
                    const redirectProto = redirectUrl.startsWith('https') ? https : http;
                    redirectProto.get(redirectUrl, imgOptions, (finalRes) => {
                        const headers = {
                            'Content-Type': finalRes.headers['content-type'] || 'image/jpeg',
                            'Access-Control-Allow-Origin': '*',
                            'Cache-Control': 'public, max-age=86400'
                        };
                        if (finalRes.headers['content-length']) headers['Content-Length'] = finalRes.headers['content-length'];
                        res.writeHead(finalRes.statusCode, headers);
                        finalRes.pipe(res);
                    }).on('error', (err) => {
                        console.error('[Proxy] Image redirect error:', err);
                        res.writeHead(500);
                        res.end('Image redirect error');
                    });
                    return;
                }

                const headers = {
                    'Content-Type': imgResponse.headers['content-type'] || 'image/jpeg',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=86400'
                };
                if (imgResponse.headers['content-length']) headers['Content-Length'] = imgResponse.headers['content-length'];
                res.writeHead(imgResponse.statusCode, headers);
                imgResponse.pipe(res);
            }).on('error', (err) => {
                console.error('[Proxy] Image error:', err);
                res.writeHead(500);
                res.end('Image proxy error');
            });
            return;
        }

        // Handle video proxy (existing logic)
        const videoUrl = resourceUrl;

        if (!videoUrl) {
            console.error('[Proxy] Error: Video URL is undefined');
            res.writeHead(500);
            res.end('Error: Video URL is missing');
            return;
        }

        const protocol = videoUrl.startsWith('https') ? https : http;
        const requestOptions = {
            headers: {
                ...(resourceInfo.headers || {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                })
            }
        };

        // Forward Range header if present (crucial for seeking and some players)
        if (req.headers.range) {
            requestOptions.headers['Range'] = req.headers.range;
        }

        protocol.get(videoUrl, requestOptions, (response) => {
            console.log('[Proxy] Upstream Status:', response.statusCode);

            // Handle redirects manually if needed
            if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307) {
                const redirectUrl = response.headers.location;
                console.log('[Proxy] Redirecting to:', redirectUrl);
                const redirectProto = redirectUrl.startsWith('https') ? https : http;
                redirectProto.get(redirectUrl, requestOptions, (finalRes) => {
                    const headers = {
                        'Content-Type': finalRes.headers['content-type'] || 'video/mp4',
                        'Access-Control-Allow-Origin': '*',
                        'Accept-Ranges': 'bytes'
                    };
                    if (finalRes.headers['content-length']) headers['Content-Length'] = finalRes.headers['content-length'];
                    if (finalRes.headers['content-range']) headers['Content-Range'] = finalRes.headers['content-range'];

                    res.writeHead(finalRes.statusCode, headers);
                    finalRes.pipe(res);
                }).on('error', (err) => {
                    console.error('[Proxy] Redirect Error:', err);
                    res.writeHead(500);
                    res.end('Redirect Error');
                });
                return;
            }

            const headers = {
                'Content-Type': response.headers['content-type'] || 'video/mp4',
                'Access-Control-Allow-Origin': '*',
                'Accept-Ranges': 'bytes'
            };
            if (response.headers['content-length']) headers['Content-Length'] = response.headers['content-length'];
            if (response.headers['content-range']) headers['Content-Range'] = response.headers['content-range'];

            res.writeHead(response.statusCode, headers);
            response.pipe(res);
        }).on('error', (err) => {
            console.error('[Proxy] Error:', err);
            res.writeHead(500);
            res.end('Error');
        });
    });

    proxyServer.listen(18964, '127.0.0.1', () => {
        console.log('Video proxy server running on http://127.0.0.1:18964');
    });

    ipcMain.handle('select-download-directory', async () => {
        const { dialog } = require('electron');
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        });

        if (result.canceled) {
            return null;
        }
        return result.filePaths[0];
    });

    // Open downloads folder - 100% reliable, no encoding issues
    ipcMain.handle('open-downloads-folder', async () => {
        try {
            const downloadsPath = app.getPath('downloads');
            console.log('[open-downloads-folder] Opening:', downloadsPath);
            shell.openPath(downloadsPath);
            return { success: true };
        } catch (error) {
            console.error('[open-downloads-folder] Error:', error);
            return { success: false, error: error.message };
        }
    });

    // Select video/audio files for transcription
    ipcMain.handle('select-video-files', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Video Files', extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv', 'flv'] },
                { name: 'Audio Files', extensions: ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac', 'wma'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        if (result.canceled) return null;
        return result.filePaths;
    });

    // Clipboard copy
    ipcMain.handle('clipboard:copy', async (_, text) => {
        try {
            clipboard.writeText(text);
            return { success: true };
        } catch (error) {
            console.error('[clipboard:copy] Error:', error);
            return { success: false, error: error.message };
        }
    });

    // Open file in folder
    ipcMain.handle('open-folder', async (_, filePath) => {
        console.log('[open-folder] Received path:', filePath);

        if (!filePath) {
            console.error('[open-folder] No file path provided');
            return { success: false, error: 'No file path provided' };
        }

        if (!fs.existsSync(filePath)) {
            console.error('[open-folder] Path does not exist:', filePath);
            return { success: false, error: 'Path does not exist' };
        }

        try {
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                // If it's a directory, open it directly
                console.log('[open-folder] Opening directory:', filePath);
                shell.openPath(filePath);
            } else {
                // If it's a file, show it in its folder
                console.log('[open-folder] Showing file in folder:', filePath);
                shell.showItemInFolder(filePath);
            }
            return { success: true };
        } catch (error) {
            console.error('[open-folder] Error:', error);
            return { success: false, error: error.message };
        }
    });

    // Save transcription files to the same directory as video
    ipcMain.handle('save-transcription', async (_, { videoPath, srt, txt }) => {
        try {
            const path = require('path');
            const dir = path.dirname(videoPath);
            const baseName = path.basename(videoPath, path.extname(videoPath));

            const srtPath = path.join(dir, `${baseName}.srt`);
            const txtPath = path.join(dir, `${baseName}.txt`);

            // Save SRT file
            if (srt) {
                fs.writeFileSync(srtPath, srt, 'utf-8');
                console.log('[save-transcription] Saved SRT:', srtPath);
            }

            // Save TXT file
            if (txt) {
                fs.writeFileSync(txtPath, txt, 'utf-8');
                console.log('[save-transcription] Saved TXT:', txtPath);
            }

            return {
                success: true,
                srtPath: srt ? srtPath : null,
                txtPath: txt ? txtPath : null,
                outputDir: dir
            };
        } catch (error) {
            console.error('[save-transcription] Error:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-video-info', async (_, url, options = {}) => {
        return await ytDlpService.getVideoInfo(url, options);
    });

    ipcMain.handle('get-preview-video', async (_, videoInfo) => {
        return await ytDlpService.getPreviewVideo(videoInfo);
    });

    ipcMain.handle('get-video-proxy-url', async (_, videoInfo) => {
        const videoId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        console.log('[Proxy] Caching video ID:', videoId);
        videoCache.set(videoId, videoInfo);
        return `http://127.0.0.1:18964/${videoId}`;
    });

    // Image proxy for Bilibili thumbnails (anti-hotlinking bypass)
    ipcMain.handle('get-image-proxy-url', async (_, imageUrl) => {
        if (!imageUrl) return null;
        
        // Only proxy Bilibili images (hdslb.com domain)
        if (!imageUrl.includes('hdslb.com') && !imageUrl.includes('bilibili.com')) {
            return imageUrl; // Return original URL for non-Bilibili images
        }
        
        const imageId = 'img_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
        console.log('[Proxy] Caching image ID:', imageId, 'URL:', imageUrl);
        videoCache.set(imageId, { 
            url: imageUrl, 
            isImage: true,
            headers: {
                'Referer': 'https://www.bilibili.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        return `http://127.0.0.1:18964/${imageId}`;
    });

    ipcMain.handle('get-subtitles-list', async (_, url) => {
        return await ytDlpService.getSubtitlesList(url);
    });

    ipcMain.on('download-subtitles', (event, { url, options, id }) => {
        const child = ytDlpService.downloadSubtitles(url, options, (progress) => {
            event.reply('download-progress', { id, progress });
        });

        child.on('close', (code) => {
            event.reply('download-complete', { id, code });
            // User can manually open folder if needed
        });
    });

    ipcMain.on('download-video', (event, { url, options, id }) => {
        // Pass id to service
        const child = ytDlpService.downloadVideo(url, options, id, (progressData) => {
            // progressData now contains: { progress, speed, downloadedSize, totalSize, eta }
            event.reply('download-progress', { 
                id, 
                progress: progressData.progress || 0,
                speed: progressData.speed || 0,
                downloadedSize: progressData.downloadedSize || 0,
                totalSize: progressData.totalSize || 0,
                eta: progressData.eta || 0
            });
        });

        child.on('close', (code) => {
            // Check if this download was paused - if so, don't send completion event
            const downloadInfo = ytDlpService.activeDownloads.get(id);
            if (downloadInfo && downloadInfo.paused) {
                console.log(`[Main] Download ${id} closed due to pause, not sending completion event`);
                return; // Don't send download-complete for paused downloads
            }

            // Try to get output path from multiple sources
            let outputPath = null;
            if (downloadInfo && downloadInfo.outputPath) {
                outputPath = downloadInfo.outputPath;
                console.log(`[Main] Got filePath from activeDownloads: ${outputPath}`);
            } else if (child._outputPath) {
                outputPath = child._outputPath;
                console.log(`[Main] Got filePath from child process: ${outputPath}`);
            } else {
                // Fallback: construct expected path
                const downloadDir = options.downloadDir || app.getPath('downloads');
                console.log(`[Main] filePath unavailable, using download dir: ${downloadDir}`);
                outputPath = downloadDir;
            }

            // Get actual file size and extension if file exists
            let fileSize = 0;
            let fileExt = options.audioOnly ? 'm4a' : 'mp4'; // Default based on download type
            
            if (outputPath) {
                console.log(`[Main] Checking file at: ${outputPath}`);
                console.log(`[Main] File exists: ${fs.existsSync(outputPath)}`);
                
                if (fs.existsSync(outputPath)) {
                    try {
                        const stats = fs.statSync(outputPath);
                        // Check if it's a file (not a directory)
                        if (stats.isFile()) {
                            fileSize = stats.size;
                            fileExt = require('path').extname(outputPath).slice(1).toLowerCase() || fileExt;
                            console.log(`[Main] File size: ${fileSize} bytes, ext: ${fileExt}`);
                        } else {
                            console.log(`[Main] Path is a directory, not a file`);
                        }
                    } catch (e) {
                        console.error(`[Main] Failed to get file stats:`, e);
                    }
                } else {
                    // Try to find the file in the download directory
                    const downloadDir = options.downloadDir || app.getPath('downloads');
                    console.log(`[Main] File not found at outputPath, searching in: ${downloadDir}`);
                    
                    // Look for recently created files (within last 60 seconds)
                    try {
                        const files = fs.readdirSync(downloadDir);
                        const now = Date.now();
                        const recentFiles = files
                            .map(f => {
                                const fullPath = require('path').join(downloadDir, f);
                                try {
                                    const stat = fs.statSync(fullPath);
                                    return { name: f, path: fullPath, mtime: stat.mtimeMs, size: stat.size, isFile: stat.isFile() };
                                } catch {
                                    return null;
                                }
                            })
                            .filter(f => f && f.isFile && (now - f.mtime) < 60000 && /\.(mp4|webm|mkv|m4a|mp3)$/i.test(f.name))
                            .sort((a, b) => b.mtime - a.mtime);
                        
                        if (recentFiles.length > 0) {
                            const mostRecent = recentFiles[0];
                            outputPath = mostRecent.path;
                            fileSize = mostRecent.size;
                            fileExt = require('path').extname(mostRecent.name).slice(1).toLowerCase();
                            console.log(`[Main] Found recent file: ${outputPath}, size: ${fileSize}, ext: ${fileExt}`);
                        }
                    } catch (e) {
                        console.error(`[Main] Failed to search download directory:`, e);
                    }
                }
            }

            event.reply('download-complete', { 
                id, 
                code, 
                filePath: outputPath,
                fileSize,
                fileExt
            });
        });
    });

    ipcMain.on('pause-download', (event, id) => {
        const success = ytDlpService.pauseDownload(id);
        event.reply('pause-download-reply', { id, success });
    });

    ipcMain.on('cancel-download', (event, id) => {
        const success = ytDlpService.cancelDownload(id);
        event.reply('cancel-download-reply', { id, success });
    });

    // GPU Detection and Settings
    ipcMain.handle('gpu-detect', async () => {
        try {
            const capabilities = await gpuDetector.getCapabilities();
            return capabilities;
        } catch (error) {
            console.error('GPU detection error:', error);
            return { error: error.message };
        }
    });

    ipcMain.handle('gpu-get-settings', () => {
        return gpuSettings.getSettings();
    });

    ipcMain.handle('gpu-update-settings', (_, newSettings) => {
        return gpuSettings.updateSettings(newSettings);
    });

    ipcMain.handle('gpu-is-available', async () => {
        const capabilities = await gpuDetector.getCapabilities();
        return gpuDetector.isHardwareAccelerationAvailable();
    });

    ipcMain.handle('gpu-get-best-encoder', async (_, codec) => {
        await gpuDetector.getCapabilities(); // Ensure detection is done
        return gpuDetector.getBestEncoder(codec);
    });

    // Eudic Integration
    ipcMain.handle('eudic-get-channels', async (event, cookie) => {
        try {
            return await eudicService.getChannels(cookie);
        } catch (error) {
            console.error('Eudic get channels error:', error);
            throw error;
        }
    });

    ipcMain.handle('get-settings', async (event) => {
        try {
            // Execute JavaScript in renderer to get localStorage values
            const eudicCookie = await event.sender.executeJavaScript('localStorage.getItem("eudic_cookie")');
            const eudicChannel = await event.sender.executeJavaScript('localStorage.getItem("eudic_channel")');
            return {
                eudicCookie: eudicCookie || '',
                eudicChannel: eudicChannel || ''
            };
        } catch (error) {
            console.error('Get settings error:', error);
            return { eudicCookie: '', eudicChannel: '' };
        }
    });

    ipcMain.handle('eudic-upload-audio', async (event, { filePath, channelId, customFileName }) => {
        try {
            // Get cookie from localStorage via renderer
            const cookie = await event.sender.executeJavaScript('localStorage.getItem("eudic_cookie")');

            if (!cookie) {
                throw new Error('请先在设置中配置Cookie');
            }

            return await eudicService.uploadAudio(cookie, filePath, channelId, customFileName);
        } catch (error) {
            console.error('Eudic upload error:', error);
            throw error;
        }
    });

    ipcMain.handle('eudic-open-uploads', () => {
        eudicService.openUploadsPage();
    });

    ipcMain.handle('eudic-fetch-cookie', async () => {
        try {
            return await eudicService.fetchCookieFromLoginWindow();
        } catch (error) {
            console.error('Eudic fetch cookie error:', error);
            throw error;
        }
    });

    // AI Transcription Handlers
    ipcMain.handle('transcribe:get-models', () => {
        return GEMINI_MODELS;
    });

    ipcMain.handle('transcribe:test-connection', async (_, { apiKey, modelId }) => {
        return await geminiTranscribeService.testConnection(apiKey, modelId);
    });

    ipcMain.handle('transcribe:select-file', async () => {
        const { dialog } = require('electron');
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Media Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm', 'mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg'] }
            ]
        });
        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        return result.filePaths[0];
    });

    ipcMain.handle('transcribe:extract-audio', async (event, filePath, options = {}) => {
        const os = require('os');
        const path = require('path');
        const outputPath = path.join(os.tmpdir(), `transcribe_${Date.now()}.mp3`);

        try {
            await extractAudio(filePath, outputPath, (progress) => {
                event.sender.send('transcribe:extract-progress', progress);
            }, options.manualDuration);  // Pass manual duration if provided
            return { success: true, audioPath: outputPath };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('transcribe:start', async (event, { audioPath, apiKey, modelId, options }) => {
        try {
            geminiTranscribeService.initialize(apiKey);
            const result = await geminiTranscribeService.transcribe(
                audioPath,
                { modelId, ...options },
                (progress) => {
                    event.sender.send('transcribe:progress', progress);
                },
                (chunk, fullText) => {
                    // Send streaming text chunks to frontend
                    event.sender.send('transcribe:chunk', { chunk, fullText });
                }
            );

            // Clean up temp audio file
            const fs = require('fs');
            try {
                if (fs.existsSync(audioPath)) {
                    fs.unlinkSync(audioPath);
                }
            } catch (e) {
                console.log('Failed to cleanup temp audio:', e.message);
            }

            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('transcribe:cancel', () => {
        return geminiTranscribeService.cancel();
    });

    // Groq Whisper API Handlers
    ipcMain.handle('groq:test-connection', async (_, apiKey) => {
        return await groqWhisperService.testConnection(apiKey);
    });

    // Hot-update key pool (add keys during transcription)
    ipcMain.handle('groq:update-keys', async (_, apiKeys) => {
        try {
            console.log('[Main] groq:update-keys called with', apiKeys?.length, 'keys');
            groqWhisperService.updateKeyPool(apiKeys);
            return { success: true };
        } catch (error) {
            console.error('[Main] Failed to update Groq keys:', error);
            return { success: false, error: error.message };
        }
    });

    // Auto-updater IPC handlers
    ipcMain.handle('app:check-for-updates', () => {
        // Auto-updater only works in production (packaged app)
        if (isDev()) {
            const { dialog } = require('electron');
            dialog.showMessageBox({
                type: 'info',
                title: 'Development Mode',
                message: 'Auto-update is disabled in development mode',
                detail: 'Please build and package the app to test auto-update functionality.'
            });
            return { success: false, reason: 'dev-mode' };
        }

        autoUpdaterService.checkForUpdates(false); // Manual check, show dialog even if already latest
        return { success: true };
    });

    ipcMain.handle('groq:transcribe', async (event, params) => {
        try {
            console.log('[Main] 🟢 groq:transcribe handler invoked');
            const { audioPath, apiKeys, geminiApiKey, geminiModel, options } = params || {};
            console.log(`[Main] Input params: path=${audioPath}, keys=${apiKeys?.length}, geminiModel=${geminiModel}, options=${JSON.stringify(options)}`);

            if (!apiKeys || !Array.isArray(apiKeys) || apiKeys.length === 0) {
                console.error('[Main] ❌ No API keys provided');
                return { success: false, error: '[Main] No API keys provided' };
            }

            // Initialize Groq Service
            console.log('[Main] Initializing Groq Service...');
            groqWhisperService.initializeWithKeyPool(apiKeys);

            console.log('[Main] Getting FFmpeg path...');
            const ffmpegPath = await getFfmpegPath();
            console.log(`[Main] FFmpeg path resolved: ${ffmpegPath}`);
            groqWhisperService.setFfmpegPath(ffmpegPath);

            let result;
            const { transcriptionMode = 'standard' } = options;

            // GEMINI DIRECT MODE: Skip Whisper entirely, use Gemini for everything
            if (transcriptionMode === 'gemini' && geminiApiKey && geminiApiKey.trim() !== '') {
                console.log('[Main] GEMINI DIRECT MODE - Bypassing Whisper, using Gemini only...');
                event.sender.send('groq:progress', { stage: 'transcribing', message: '🤖 Gemini is transcribing audio...', percent: 10 });

                try {
                    // Get audio duration for better timestamp estimation
                    const duration = await groqWhisperService.getAudioDuration(audioPath);
                    console.log('[Main] Audio duration:', duration, 'seconds');

                    event.sender.send('groq:progress', { stage: 'transcribing', message: '🤖 Gemini analyzing audio...', percent: 30 });

                    const geminiResult = await geminiDirectTranscribe(geminiApiKey, audioPath, options.language, geminiModel || 'gemini-2.0-flash', duration);

                    if (geminiResult.success && geminiResult.segments && geminiResult.segments.length > 0) {
                        event.sender.send('groq:progress', { stage: 'complete', message: '✅ Gemini transcription complete!', percent: 100 });

                        result = {
                            success: true,
                            segments: geminiResult.segments,
                            srt: groqWhisperService.generateSrt(geminiResult.segments),
                            plainText: groqWhisperService.generatePlainText(geminiResult.segments),
                            text: geminiResult.segments.map(s => s.text).join(' '),
                            transcription: geminiResult.segments.map(s => s.text).join('\n')
                        };
                        console.log('[Main] Gemini Direct mode completed, segments:', result.segments.length);
                    } else {
                        console.error('[Main] Gemini Direct failed, falling back to standard mode');
                        event.sender.send('groq:progress', { stage: 'transcribing', message: '⚠️ Gemini failed, using Whisper...', percent: 20 });
                        // Fallback to standard Whisper
                        result = await groqWhisperService.transcribe(
                            audioPath,
                            options,
                            (progress) => event.sender.send('groq:progress', progress)
                        );
                    }
                } catch (e) {
                    console.error('[Main] Gemini Direct mode error:', e.message);
                    event.sender.send('groq:progress', { stage: 'transcribing', message: '⚠️ Gemini failed, using Whisper...', percent: 20 });
                    // Fallback to standard Whisper
                    result = await groqWhisperService.transcribe(
                        audioPath,
                        options,
                        (progress) => event.sender.send('groq:progress', progress)
                    );
                }
            } else if (transcriptionMode === 'dual' && geminiApiKey && geminiApiKey.trim() !== '') {
                // DUAL VERIFICATION MODE: Parallel processing (faster)
                console.log('[Main] DUAL VERIFICATION MODE - Running Whisper + Gemini in parallel...');
                event.sender.send('groq:progress', { stage: 'preparing', message: '🔄 Preparing audio for parallel processing...', percent: 5 });

                // Helper function to remove garbled Unicode characters from text
                const sanitizeGarbledText = (text) => {
                    if (!text) return text;
                    // Remove geometric shapes, block elements, and replacement chars
                    return text
                        .replace(/[\u25A0-\u25FF]/g, '') // Geometric shapes (□◇◆○●■等)
                        .replace(/[\u2580-\u259F]/g, '') // Block elements
                        .replace(/[\uFFFD\uFFFE\uFFFF]/g, '') // Unicode replacement chars (�)
                        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // Control chars
                        .replace(/[◐◑◒◓◔◕◖◗]/g, '') // Additional circle variants
                        .replace(/[\u2600-\u26FF]/g, '') // Miscellaneous symbols
                        .replace(/[\u2700-\u27BF]/g, '') // Dingbats
                        .replace(/\?{2,}/g, '') // Multiple question marks (?? or ???)
                        .replace(/\s{2,}/g, ' ') // Multiple spaces to single
                        .trim();
                };

                // Final cleanup function for segments before output
                const cleanupSegments = (segments) => {
                    return segments.map(seg => ({
                        ...seg,
                        text: sanitizeGarbledText(seg.text)
                    })).filter(seg => seg.text && seg.text.length > 0);
                };

                try {
                    // STEP 1: Pre-convert large files to MP3 to avoid memory crash
                    // Both Whisper and Gemini will use this smaller file
                    let preparedAudioPath = audioPath;
                    const ext = path.extname(audioPath).toLowerCase();
                    const fileStats = fs.statSync(audioPath);
                    const fileSizeMB = fileStats.size / (1024 * 1024);

                    // Convert if not already MP3 or if file is large (>100MB)
                    if (ext !== '.mp3' || fileSizeMB > 100) {
                        console.log(`[Main] File is ${fileSizeMB.toFixed(1)}MB, pre-converting for stability...`);
                        event.sender.send('groq:progress', { stage: 'preparing', message: `🔄 Converting ${fileSizeMB.toFixed(0)}MB file to MP3...`, percent: 5 });
                        const ffmpegPath = await getFfmpegPath();
                        preparedAudioPath = await convertToMP3(audioPath, ffmpegPath);
                        console.log('[Main] Pre-conversion complete:', preparedAudioPath);
                    }

                    event.sender.send('groq:progress', { stage: 'transcribing', message: '🚀 Whisper + Gemini running in parallel...', percent: 10 });

                    // STEP 2: Run both in parallel using Promise.allSettled
                    // Each task is wrapped in its own try-catch for extra safety
                    const whisperPromise = (async () => {
                        try {
                            return await groqWhisperService.transcribe(
                                preparedAudioPath, // Use converted file
                                options,
                                (progress) => {
                                    const scaledPercent = 10 + Math.round((progress.percent || 0) * 0.4);
                                    event.sender.send('groq:progress', {
                                        stage: 'transcribing',
                                        message: `🎙️ Whisper: ${progress.message || 'Processing...'}`,
                                        percent: scaledPercent
                                    });
                                }
                            );
                        } catch (e) {
                            console.error('[Main] Whisper parallel error:', e.message);
                            return { success: false, error: e.message };
                        }
                    })();

                    const geminiPromise = (async () => {
                        try {
                            return await geminiAudioTranscribe(geminiApiKey, preparedAudioPath, options.language, geminiModel || 'gemini-2.0-flash');
                        } catch (e) {
                            console.error('[Main] Gemini parallel error:', e.message);
                            return { success: false, error: e.message };
                        }
                    })();

                    const results = await Promise.allSettled([whisperPromise, geminiPromise]);

                    console.log('[Main] Parallel processing completed. Whisper:', results[0].status, 'Gemini:', results[1].status);

                    // Extract results safely
                    const whisperResult = results[0].status === 'fulfilled' ? results[0].value : { success: false, error: results[0].reason?.message || 'Unknown error' };
                    const geminiResult = results[1].status === 'fulfilled' ? results[1].value : { success: false, error: results[1].reason?.message || 'Unknown error' };

                    if (whisperResult && whisperResult.success && geminiResult && geminiResult.success && geminiResult.text) {
                        event.sender.send('groq:progress', { stage: 'polishing', message: '✨ Combining results...', percent: 90 });

                        // Combine: Whisper timestamps + Gemini text
                        const whisperSegments = whisperResult.segments || [];
                        const geminiFullText = (geminiResult.text || '').trim();

                        if (whisperSegments.length > 0 && geminiFullText.length > 0) {
                            // Sanitize Gemini text before merging to remove any garbled chars
                            const sanitizedGeminiText = sanitizeGarbledText(geminiFullText);
                            console.log('[Main] Gemini text sanitized:', geminiFullText.length, '->', sanitizedGeminiText.length, 'chars');

                            // Helper function to detect garbled characters in a segment
                            const hasGarbledChars = (text) => {
                                if (!text) return false;
                                const garbledPatterns = [
                                    /[\uFFFD\uFFFE\uFFFF]/,           // Unicode replacement chars
                                    /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/, // Control chars
                                    /[\u25A0-\u25FF]/,                // Geometric shapes (□◇◆○●■等)
                                    /[\u2580-\u259F]/,                // Block elements
                                    /\?{3,}/,                          // ??? repeated question marks
                                    /[□◇◆○●■▪▫◐◑◒◓◔◕◖◗]+/,          // Common placeholder shapes
                                ];
                                return garbledPatterns.some(pattern => pattern.test(text));
                            };

                            // Use Gemini to intelligently merge results instead of simple proportion-based split
                            // This approach asks Gemini to align the text with timestamps
                            try {
                                event.sender.send('groq:progress', { stage: 'polishing', message: '✨ Aligning timestamps with corrected text...', percent: 92 });

                                const verifyResult = await dualVerifyAndCorrect(
                                    geminiApiKey,
                                    whisperSegments,
                                    sanitizedGeminiText,
                                    geminiModel || 'gemini-2.0-flash'
                                );

                                if (verifyResult.success && verifyResult.segments && verifyResult.segments.length > 0) {
                                    // Apply final cleanup to remove any remaining garbled characters
                                    const filteredSegments = cleanupSegments(verifyResult.segments);

                                    result = {
                                        success: true,
                                        segments: filteredSegments,
                                        srt: groqWhisperService.generateSrt(filteredSegments),
                                        plainText: groqWhisperService.generatePlainText(filteredSegments),
                                        text: filteredSegments.map(s => s.text).join(' '),
                                        transcription: filteredSegments.map(s => s.text).join('\n')
                                    };

                                    console.log('[Main] Dual verification with intelligent alignment completed successfully');
                                    event.sender.send('groq:progress', { stage: 'complete', message: '✅ Dual verification complete!', percent: 100 });
                                } else {
                                    // Fallback to proportion-based merge if Gemini alignment fails
                                    console.log('[Main] Gemini alignment failed, using proportion-based merge');
                                    const totalWhisperChars = whisperSegments.reduce((sum, s) => sum + (s.text || '').length, 0);
                                    const geminiChars = sanitizedGeminiText.length;

                                    let currentPos = 0;
                                    const newSegments = whisperSegments.map((seg, i) => {
                                        const segProportion = (seg.text || '').length / totalWhisperChars;
                                        let charsForThisSeg = Math.round(geminiChars * segProportion);

                                        if (i === whisperSegments.length - 1) {
                                            charsForThisSeg = geminiChars - currentPos;
                                        }

                                        let segText = sanitizedGeminiText.substring(currentPos, currentPos + charsForThisSeg);

                                        if (i < whisperSegments.length - 1 && currentPos + charsForThisSeg < geminiChars) {
                                            const remaining = sanitizedGeminiText.substring(currentPos + charsForThisSeg);
                                            const breakMatch = remaining.match(/^[\s，。、？！,.?!\s]*/);
                                            if (breakMatch && breakMatch[0]) {
                                                segText += breakMatch[0].trim();
                                                charsForThisSeg += breakMatch[0].length;
                                            }
                                        }

                                        currentPos += charsForThisSeg;

                                        return {
                                            start: seg.start,
                                            end: seg.end,
                                            text: segText.trim()
                                        };
                                    });

                                    const filteredSegments = cleanupSegments(newSegments);

                                    result = {
                                        success: true,
                                        segments: filteredSegments,
                                        srt: groqWhisperService.generateSrt(filteredSegments),
                                        plainText: groqWhisperService.generatePlainText(filteredSegments),
                                        text: filteredSegments.map(s => s.text).join(' '),
                                        transcription: filteredSegments.map(s => s.text).join('\n')
                                    };

                                    console.log('[Main] Dual verification (proportion-based fallback) completed');
                                    event.sender.send('groq:progress', { stage: 'complete', message: '✅ Dual verification complete!', percent: 100 });
                                }
                            } catch (alignError) {
                                console.error('[Main] Alignment error:', alignError.message);
                                // Fallback to proportion-based merge
                                const totalWhisperChars = whisperSegments.reduce((sum, s) => sum + (s.text || '').length, 0);
                                const geminiChars = sanitizedGeminiText.length;

                                let currentPos = 0;
                                const newSegments = whisperSegments.map((seg, i) => {
                                    const segProportion = (seg.text || '').length / totalWhisperChars;
                                    let charsForThisSeg = Math.round(geminiChars * segProportion);

                                    if (i === whisperSegments.length - 1) {
                                        charsForThisSeg = geminiChars - currentPos;
                                    }

                                    let segText = sanitizedGeminiText.substring(currentPos, currentPos + charsForThisSeg);

                                    if (i < whisperSegments.length - 1 && currentPos + charsForThisSeg < geminiChars) {
                                        const remaining = sanitizedGeminiText.substring(currentPos + charsForThisSeg);
                                        const breakMatch = remaining.match(/^[\s，。、？！,.?!\s]*/);
                                        if (breakMatch && breakMatch[0]) {
                                            segText += breakMatch[0].trim();
                                            charsForThisSeg += breakMatch[0].length;
                                        }
                                    }

                                    currentPos += charsForThisSeg;

                                    return {
                                        start: seg.start,
                                        end: seg.end,
                                        text: segText.trim()
                                    };
                                });

                                const filteredSegments = cleanupSegments(newSegments);

                                result = {
                                    success: true,
                                    segments: filteredSegments,
                                    srt: groqWhisperService.generateSrt(filteredSegments),
                                    plainText: groqWhisperService.generatePlainText(filteredSegments),
                                    text: filteredSegments.map(s => s.text).join(' '),
                                    transcription: filteredSegments.map(s => s.text).join('\n')
                                };

                                console.log('[Main] Dual verification (error fallback) completed');
                                event.sender.send('groq:progress', { stage: 'complete', message: '✅ Dual verification complete!', percent: 100 });
                            }
                        } else {
                            result = whisperResult;
                            event.sender.send('groq:progress', { stage: 'complete', message: '✅ Complete (Whisper only)', percent: 100 });
                        }
                    } else if (whisperResult && whisperResult.success) {
                        console.log('[Main] Gemini failed in parallel mode, using Whisper result');
                        result = whisperResult;
                        event.sender.send('groq:progress', { stage: 'complete', message: '⚠️ Gemini failed - Using Whisper only', percent: 100 });
                    } else {
                        console.error('[Main] Both Whisper and Gemini failed');
                        result = { success: false, error: 'Both Whisper and Gemini failed' };
                        event.sender.send('groq:progress', { stage: 'complete', message: '❌ Transcription failed', percent: 100 });
                    }
                } catch (e) {
                    console.error('[Main] Parallel processing error:', e.message, e.stack);
                    event.sender.send('groq:progress', { stage: 'error', message: '⚠️ Error, falling back to Whisper...', percent: 50 });
                    result = await groqWhisperService.transcribe(
                        audioPath,
                        options,
                        (progress) => event.sender.send('groq:progress', progress)
                    );
                }
            } else {
                // STANDARD MODE: Use Whisper first
                console.log('[Main] STANDARD MODE - Calling groqWhisperService.transcribe...');
                result = await groqWhisperService.transcribe(
                    audioPath,
                    options,
                    (progress) => {
                        console.log(`[Main] Progress received: ${JSON.stringify(progress)}`);
                        event.sender.send('groq:progress', progress);
                    }
                );
            }
            console.log(`[Main] Transcribe returned. Success: ${result.success}`);

            // Auto post-process with Gemini for STANDARD mode only (Dual is handled above in parallel)
            if (result.success && geminiApiKey && geminiApiKey.trim() !== '' && result.segments && result.segments.length > 0) {
                const { transcriptionMode = 'standard' } = options;

                // Only do post-processing for Standard mode (Dual and Gemini are already complete)
                if (transcriptionMode === 'standard') {
                    // STANDARD MODE: Text correction only
                    console.log('[Main] STANDARD MODE - Starting text correction with model:', geminiModel || 'gemini-2.0-flash');
                    event.sender.send('groq:progress', { stage: 'polishing', message: 'AI correcting text...', percent: 90 });
                    try {
                        const polishedSegments = await postProcessWithGemini(geminiApiKey, result.segments, options.language, geminiModel, audioPath);
                        result.segments = polishedSegments;
                        result.srt = groqWhisperService.generateSrt(polishedSegments);
                        result.plainText = groqWhisperService.generatePlainText(polishedSegments);
                        result.text = polishedSegments.map(s => s.text).join(' ');
                        result.transcription = polishedSegments.map(s => s.text).join('\n');
                        console.log('[Main] Text correction completed');
                        event.sender.send('groq:progress', { stage: 'complete', message: 'Transcription complete!', percent: 100 });
                    } catch (e) {
                        console.error('[Gemini] Text correction failed:', e.message);
                        event.sender.send('groq:progress', { stage: 'complete', message: '⚠️ Gemini unavailable - Using Whisper output only', percent: 100 });
                    }
                }
            }

            // FINAL CLEANUP: Remove any remaining garbled characters before returning
            if (result && result.success && result.segments) {
                const finalSanitize = (text) => {
                    if (!text) return text;
                    return text
                        .replace(/[\u25A0-\u25FF]/g, '') // Geometric shapes (□◇◆○●■等)
                        .replace(/[\u2580-\u259F]/g, '') // Block elements
                        .replace(/[\uFFFD\uFFFE\uFFFF]/g, '') // Unicode replacement chars (�)
                        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // Control chars
                        .replace(/[◐◑◒◓◔◕◖◗]/g, '') // Additional circle variants
                        .replace(/[\u2600-\u26FF]/g, '') // Miscellaneous symbols
                        .replace(/[\u2700-\u27BF]/g, '') // Dingbats
                        .replace(/\?{2,}/g, '') // Multiple question marks
                        .replace(/\s{2,}/g, ' ') // Multiple spaces to single
                        .trim();
                };

                result.segments = result.segments.map(seg => ({
                    ...seg,
                    text: finalSanitize(seg.text)
                })).filter(seg => seg.text && seg.text.length > 0);

                // Regenerate derived fields
                result.text = result.segments.map(s => s.text).join(' ');
                result.transcription = result.segments.map(s => s.text).join('\n');
                result.plainText = result.segments.map(s => s.text).join('\n');
                if (groqWhisperService && groqWhisperService.generateSrt) {
                    result.srt = groqWhisperService.generateSrt(result.segments);
                }
                console.log('[Main] Final cleanup applied to remove garbled characters');
            }

            return result;
        } catch (error) {
            console.error('[Main] ❌ Groq transcribe CRITICAL ERROR:', error);
            console.error(error.stack);
            return { success: false, error: error.message };
        }
    });

    // Cancel transcription handler
    ipcMain.handle('groq:cancel', async () => {
        console.log('[Main] Transcription cancel requested');
        if (groqWhisperService) {
            groqWhisperService.cancelTranscription();
        }
        return { success: true };
    });

    // Gap detection and filling handlers
    ipcMain.handle('groq:detect-gaps', async (_, { srtContent, totalDuration }) => {
        try {
            const gaps = groqWhisperService.detectGaps(srtContent, totalDuration);
            return { success: true, gaps };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('groq:fill-gaps', async (event, params) => {
        try {
            const { audioPath, gaps, apiKeys, options } = params || {};

            if (!apiKeys || !Array.isArray(apiKeys) || apiKeys.length === 0) {
                return { success: false, error: '[Main] No API keys provided to gap filling handler' };
            }

            groqWhisperService.initializeWithKeyPool(apiKeys);
            const ffmpegPath = await getFfmpegPath();
            groqWhisperService.setFfmpegPath(ffmpegPath);

            const allNewSegments = [];

            for (let i = 0; i < gaps.length; i++) {
                const gap = gaps[i];
                event.sender.send('groq:progress', {
                    stage: 'filling',
                    message: `Filling gap ${i + 1}/${gaps.length} (${gap.duration.toFixed(0)}s)...`
                });

                const result = await groqWhisperService.transcribeGap(
                    audioPath,
                    gap,
                    options,
                    (progress) => event.sender.send('groq:progress', progress)
                );

                if (result.success && result.segments) {
                    allNewSegments.push(...result.segments);
                    console.log(`[Gap Fill] Gap ${i + 1} filled with ${result.segments.length} segments`);
                }
            }

            return { success: true, newSegments: allNewSegments };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    // Gemini direct transcription with timestamp estimation - for "gemini" mode
    async function geminiDirectTranscribe(apiKey, audioPath, language = 'zh', geminiModel = 'gemini-2.0-flash', audioDuration = null) {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: geminiModel });

        console.log('[Gemini Direct] Starting direct transcription with timestamp estimation...');

        // Read audio file
        const audioData = fs.readFileSync(audioPath);
        const base64Audio = audioData.toString('base64');
        const mimeType = audioPath.endsWith('.mp3') ? 'audio/mp3' :
            audioPath.endsWith('.wav') ? 'audio/wav' :
                audioPath.endsWith('.m4a') ? 'audio/m4a' : 'audio/mpeg';

        const languageMap = {
            'zh': '简体中文',
            'en': 'English',
            'ja': '日本語',
            'ko': '한국어'
        };
        const targetLang = languageMap[language] || language;

        const prompt = `你是专业字幕转写专家。请准确转写这段音频，并估算每句话的时间戳。

音频总时长参考: ${audioDuration ? audioDuration + '秒' : '未知'}

要求:
1. 使用${targetLang}输出
2. 每行不超过25个字符
3. 估算每句话的开始和结束时间（秒）
4. 按照说话的节奏自然断句

输出格式（只输出JSON数组，不要其他内容）:
[
  {"start": 0.0, "end": 3.5, "text": "第一句话"},
  {"start": 3.5, "end": 7.2, "text": "第二句话"},
  ...
]

注意：根据说话速度估算时间，中文约每秒3-4个字。`;

        try {
            const result = await model.generateContent([
                prompt,
                { inlineData: { mimeType, data: base64Audio } }
            ]);
            const response = await result.response;
            let responseText = response.text().trim();

            // Extract JSON from response
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const segments = JSON.parse(jsonMatch[0]);
                console.log('[Gemini Direct] Transcription complete, segments:', segments.length);
                return { success: true, segments };
            } else {
                console.error('[Gemini Direct] Failed to parse JSON from response:', responseText.substring(0, 200));
                return { success: false, error: 'Failed to parse response' };
            }
        } catch (error) {
            console.error('[Gemini Direct] Transcription failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Gemini audio transcription function - listens to entire audio file
    async function geminiAudioTranscribe(apiKey, audioPath, language = 'zh', geminiModel = 'gemini-2.0-flash') {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: geminiModel });

        console.log('[Gemini Audio] Transcribing entire audio file:', audioPath);

        // Read audio file
        const audioData = fs.readFileSync(audioPath);
        const base64Audio = audioData.toString('base64');
        const mimeType = audioPath.endsWith('.mp3') ? 'audio/mp3' :
            audioPath.endsWith('.wav') ? 'audio/wav' :
                audioPath.endsWith('.m4a') ? 'audio/m4a' : 'audio/mpeg';

        const languageMap = {
            'zh': '简体中文',
            'en': 'English',
            'ja': '日本語',
            'ko': '한국어',
            'es': 'Español',
            'fr': 'Français',
            'de': 'Deutsch'
        };
        const targetLang = languageMap[language] || language;

        const prompt = `Transcribe this audio accurately and completely.

CRITICAL RULES:
1. Output in Simplified Chinese (简体中文) only, never Traditional Chinese
2. NEVER use placeholder symbols like □ ◇ ○ ● ■ ◆ ◐ ◑ or any geometric shapes
3. NEVER use ?? or ??? as placeholders
4. If unclear, infer from context or skip that word entirely
5. Output ONLY the transcription text, no explanations or labels
6. Use Chinese punctuation marks (，。？！)
7. Do not add or remove any spoken content`;

        try {
            const result = await model.generateContent([
                prompt,
                { inlineData: { mimeType, data: base64Audio } }
            ]);
            const response = await result.response;
            let text = response.text().trim();

            // Post-process to remove any remaining garbled characters
            text = text
                .replace(/[\u25A0-\u25FF]/g, '') // Remove geometric shapes
                .replace(/[\u2580-\u259F]/g, '') // Remove block elements
                .replace(/[\uFFFD\uFFFE\uFFFF]/g, '') // Remove replacement chars
                .replace(/[◐◑◒◓◔◕◖◗]/g, '') // Remove circle variants
                .replace(/\s{2,}/g, ' ') // Multiple spaces to single
                .trim();

            console.log('[Gemini Audio] Transcription complete, length:', text.length);
            return { success: true, text };
        } catch (error) {
            console.error('[Gemini Audio] Transcription failed:', error.message);
            return { success: false, error: error.message };
        }
    }

    // Dual verification - compare Whisper and Gemini results, fix errors
    async function dualVerifyAndCorrect(apiKey, whisperSegments, geminiText, geminiModel = 'gemini-2.0-flash') {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: geminiModel });

        console.log('[Dual Verify] Comparing Whisper and Gemini results...');
        console.log('[Dual Verify] Whisper segments:', whisperSegments.length);
        console.log('[Dual Verify] Gemini text length:', geminiText.length);

        // Prepare Whisper text for comparison
        const whisperText = whisperSegments.map(s => s.text).join(' ');

        const prompt = `You are a professional subtitle proofreader. Compare these two transcription results and fix errors in Whisper output.

【Whisper Result】(has timestamps, may contain garbled characters like □◇○●■◆ or ??):
${JSON.stringify(whisperSegments.map(s => ({ start: s.start, end: s.end, text: s.text })), null, 2)}

【Gemini Result】(more accurate, no timestamps):
${geminiText}

TASKS:
1. Find garbled characters (□◇○●■◆◐◑ or ??) in Whisper segments
2. Replace errors with correct content from Gemini
3. Keep timestamps (start, end) unchanged, only fix text field
4. Match each segment's text to its corresponding audio timeframe
5. If a Whisper segment is completely garbled, find matching content from Gemini based on position
6. Output must be pure Chinese text without ANY geometric symbols

OUTPUT FORMAT (JSON array only, no explanations):
[{"start": 0, "end": 3, "text": "corrected text"}, ...]`;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let responseText = response.text().trim();

            // Extract JSON from response
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const correctedSegments = JSON.parse(jsonMatch[0]);
                console.log('[Dual Verify] Correction complete, segments:', correctedSegments.length);
                return { success: true, segments: correctedSegments };
            } else {
                console.error('[Dual Verify] Failed to parse JSON from response');
                return { success: false, segments: whisperSegments };
            }
        } catch (error) {
            console.error('[Dual Verify] Correction failed:', error.message);
            return { success: false, segments: whisperSegments, error: error.message };
        }
    }

    // Gemini post-processing function
    async function postProcessWithGemini(apiKey, segments, language, geminiModel = 'gemini-3-flash-preview', audioPath = null) {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = geminiModel || 'gemini-3-flash-preview';
        console.log('[Gemini] Using model:', modelName);
        const model = genAI.getGenerativeModel({ model: modelName });

        // Helper function to remove garbled Unicode characters from text
        const sanitizeGarbledText = (text) => {
            if (!text) return text;
            // Remove geometric shapes, block elements, and replacement chars
            return text
                .replace(/[\u25A0-\u25FF]/g, '') // Geometric shapes (□◇◆○●■等)
                .replace(/[\u2580-\u259F]/g, '') // Block elements
                .replace(/[\uFFFD\uFFFE\uFFFF]/g, '') // Unicode replacement chars
                .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // Control chars
                .replace(/[◐◑◒◓◔◕◖◗]/g, '') // Additional circle variants
                .replace(/\s{2,}/g, ' ') // Multiple spaces to single
                .trim();
        };

        // Helper function to detect garbled characters (comprehensive detection)
        const hasGarbledChars = (text) => {
            if (!text) return false;
            // Comprehensive pattern to detect various garbled/placeholder characters:
            // - U+FFFD: Unicode replacement character
            // - U+25A0-U+25FF: Geometric shapes (□, ◇, ◆, ○, ●, etc.)
            // - U+2580-U+259F: Block elements (▀, █, etc.)
            // - U+2000-U+200F: Various spaces and marks
            // - U+FFF0-U+FFFF: Specials block
            // - Control characters
            // - Repeated question marks (???)
            const garbledPatterns = [
                /[\uFFFD\uFFFE\uFFFF]/,           // Unicode replacement chars
                /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/, // Control chars
                /[\u25A0-\u25A1]{2,}/,            // □ squares repeated
                /[\u25C6-\u25C7]{2,}/,            // ◇◆ diamonds repeated
                /[\u25CB-\u25CF]{2,}/,            // ○● circles repeated
                /[\u2580-\u259F]{2,}/,            // Block elements repeated
                /\?{3,}/,                          // ??? repeated question marks
                /[\u3000]{2,}/,                    // Ideographic spaces repeated
                /[□◇◆○●■▪▫]{2,}/,                // Common placeholder shapes
            ];
            return garbledPatterns.some(pattern => pattern.test(text));
        };

        // Helper function to extract audio segment using FFmpeg
        const extractAudioSegment = async (audioFilePath, startTime, endTime) => {
            const path = require('path');
            const os = require('os');
            const { promisify } = require('util');
            const exec = promisify(require('child_process').exec);

            const tempDir = os.tmpdir();
            const outputPath = path.join(tempDir, `segment_${Date.now()}.mp3`);
            const duration = endTime - startTime;

            try {
                const ffmpegPath = ffmpegHelpers.getFFmpegPath();
                await exec(`"${ffmpegPath}" -y -i "${audioFilePath}" -ss ${startTime} -t ${duration} -acodec libmp3lame -q:a 2 "${outputPath}"`, { timeout: 30000 });
                return outputPath;
            } catch (err) {
                console.error('[Gemini Audio] Failed to extract audio segment:', err.message);
                return null;
            }
        };

        // Helper function to fix garbled segment using Gemini Audio
        const fixGarbledWithAudio = async (segment, audioFilePath, contextBefore = '', contextAfter = '') => {
            if (!audioFilePath || !fs.existsSync(audioFilePath)) {
                console.warn('[Gemini Audio] Audio file not available for garbled fix');
                return segment.text;
            }

            try {
                // Extract the audio segment
                const segmentAudioPath = await extractAudioSegment(audioFilePath, segment.start, segment.end);
                if (!segmentAudioPath || !fs.existsSync(segmentAudioPath)) {
                    return segment.text;
                }

                // Read audio file as base64
                const audioBuffer = fs.readFileSync(segmentAudioPath);
                const base64Audio = audioBuffer.toString('base64');

                // Use Gemini to transcribe this audio segment
                const prompt = language === 'zh'
                    ? `请听这段音频并准确转写成中文文字。
上下文参考（帮助理解）：
前文：${contextBefore || '(无)'}
后文：${contextAfter || '(无)'}
原始识别（可能有错误）：${segment.text}

只输出准确的转写文字，不要添加任何说明或标点符号。`
                    : `Listen to this audio and transcribe it accurately.
Context reference (for understanding):
Before: ${contextBefore || '(none)'}
After: ${contextAfter || '(none)'}
Original recognition (may have errors): ${segment.text}

Output only the accurate transcription, no explanations or additional punctuation.`;

                const result = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            mimeType: 'audio/mp3',
                            data: base64Audio
                        }
                    }
                ]);

                const response = await result.response;
                const fixedText = response.text().trim();

                // Clean up temp file
                try { fs.unlinkSync(segmentAudioPath); } catch (e) { }

                if (fixedText && fixedText.length > 0) {
                    console.log(`[Gemini Audio] Fixed: "${segment.text}" → "${fixedText}"`);
                    return fixedText;
                }
            } catch (err) {
                console.error('[Gemini Audio] Error fixing garbled segment:', err.message);
            }

            return segment.text;
        };

        // Fix garbled segments using Gemini Audio (re-listens to audio, doesn't delete text)
        if (audioPath && fs.existsSync(audioPath)) {
            console.log('[Gemini Audio] Checking for garbled segments to fix with audio...');
            for (let i = 0; i < segments.length; i++) {
                const seg = segments[i];
                if (hasGarbledChars(seg.text)) {
                    console.log(`[Gemini Audio] Garbled detected in segment ${i}: "${seg.text}"`);
                    const contextBefore = i > 0 ? segments[i - 1].text : '';
                    const contextAfter = i < segments.length - 1 ? segments[i + 1].text : '';
                    const fixedText = await fixGarbledWithAudio(seg, audioPath, contextBefore, contextAfter);
                    segments[i] = { ...seg, text: fixedText };
                }
            }
        }

        // CRITICAL: Separate failed chunks (placeholders) from successful ones
        const failedSegments = [];
        const successfulSegments = [];

        segments.forEach((seg) => {
            if (seg.text && (seg.text.includes('[转写失败') || seg.text.includes('[Failed chunk'))) {
                failedSegments.push(seg);
            } else {
                successfulSegments.push(seg);
            }
        });

        console.log(`[Gemini] Processing ${successfulSegments.length} successful segments, preserving ${failedSegments.length} failed segments`);

        // Process ONLY successful segments in batches
        const batchSize = 50;
        const processedSegments = [];

        for (let i = 0; i < successfulSegments.length; i += batchSize) {
            const batch = successfulSegments.slice(i, i + batchSize);
            const textsToFix = batch.map((s, idx) => `[${idx}] ${s.text}`).join('\n');

            const prompt = language === 'zh' ?
                `以下是语音识别的结果，可能存在错别字、乱码（如???）或识别错误。请修正这些错误，保持原意不变。
每行格式为 [序号] 文字内容，请按相同格式输出修正后的文字，不要改变序号，不要添加任何额外说明：

${textsToFix}` :
                `The following is speech recognition output that may contain typos, garbled characters (like ???), or errors. Please correct these errors while keeping the original meaning.
Each line is formatted as [index] text content. Output the corrected text in the same format, don't change indices, don't add any explanations:

${textsToFix}`;

            try {
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const correctedText = response.text();

                // Parse corrected text back to segments
                const lines = correctedText.split('\n').filter(l => l.trim());
                const batchProcessed = [];

                for (const line of lines) {
                    const match = line.match(/^\[(\d+)\]\s*(.*)$/);
                    if (match) {
                        const idx = parseInt(match[1]);
                        const text = match[2].trim();
                        if (batch[idx]) {
                            batchProcessed.push({
                                ...batch[idx],
                                ...{ text: text || batch[idx].text }
                            });
                        }
                    }
                }

                // If parsing failed or incomplete, use original segments
                if (batchProcessed.length === batch.length) {
                    processedSegments.push(...batchProcessed);
                } else {
                    console.warn(`[Gemini] Parsing incomplete (${batchProcessed.length}/${batch.length}), using original`);
                    processedSegments.push(...batch);
                }
            } catch (e) {
                console.error('[Gemini] Batch processing error:', e.message);
                processedSegments.push(...batch);
            }

            // Small delay between batches
            if (i + batchSize < successfulSegments.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        // CRITICAL: Merge processed successful segments with failed segments
        const allSegments = [...processedSegments, ...failedSegments];
        allSegments.sort((a, b) => a.start - b.start); // Sort by timestamp

        console.log(`[Gemini] Post-processing complete: ${processedSegments.length} corrected + ${failedSegments.length} preserved = ${allSegments.length} total`);

        return allSegments;
    }

    createWindow()

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
