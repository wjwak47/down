import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import ytDlpService from './services/yt-dlp'
import eudicService from './services/eudic'
import geminiTranscribeService, { MODELS as GEMINI_MODELS } from './services/gemini-transcribe'
import groqWhisperService from './services/groq-whisper'
import autoUpdaterService from './services/auto-updater'
import { extractAudio, getFfmpegPath, getAudioDuration, extractAudioSegment, mergeAudioFiles } from './utils/ffmpeg-helper'
import { registerMediaConverter } from './modules/mediaConverter'

import { registerDocumentConverter } from './modules/documentConverter'
import { registerFileCompressor } from './modules/fileCompressor'
import { registerWatermarkRemover } from './modules/watermarkRemover'
import gpuDetector from './services/gpuDetector'
import gpuSettings from './services/gpuSettings'

// Register modules
registerMediaConverter();
registerDocumentConverter();
registerWatermarkRemover();
// registerFileCompressor();

// Suppress Electron internal warnings
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
// Hide internal Chromium logs
app.commandLine.appendSwitch('log-level', '3'); // 3 = FATAL only

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        title: 'ProFlow Studio v1.1.0',
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
        if (!is.dev) {
            setTimeout(() => {
                autoUpdaterService.checkForUpdates(true) // silent=true, don't show dialog if already latest
            }, 3000) // Wait 3 seconds after startup
        }
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
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
    electronApp.setAppUserModelId('com.electron')

    app.on('browser-window-created', (_, window) => {
        optimizer.watchWindowShortcuts(window)
    })

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

        const videoId = req.url.slice(1);
        const videoInfo = videoCache.get(videoId);

        if (!videoInfo) {
            console.log('[Proxy] Not found:', videoId);
            res.writeHead(404);
            res.end('Not found');
            return;
        }

        console.log('[Proxy] Proxying:', videoInfo.url);
        const videoUrl = videoInfo.url;

        if (!videoUrl) {
            console.error('[Proxy] Error: Video URL is undefined');
            res.writeHead(500);
            res.end('Error: Video URL is missing');
            return;
        }

        const protocol = videoUrl.startsWith('https') ? https : http;
        const requestOptions = {
            headers: {
                ...(videoInfo.headers || {
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

    ipcMain.handle('get-video-info', async (_, url) => {
        return await ytDlpService.getVideoInfo(url);
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

    ipcMain.handle('get-subtitles-list', async (_, url) => {
        return await ytDlpService.getSubtitlesList(url);
    });

    ipcMain.on('download-subtitles', (event, { url, options, id }) => {
        const child = ytDlpService.downloadSubtitles(url, options, (progress) => {
            event.reply('download-progress', { id, progress });
        });

        child.on('close', (code) => {
            event.reply('download-complete', { id, code });

            if (code === 0) {
                const downloadDir = options.downloadDir || app.getPath('downloads');
                shell.openPath(downloadDir);
            }
        });
    });

    ipcMain.on('download-video', (event, { url, options, id }) => {
        // Pass id to service
        const child = ytDlpService.downloadVideo(url, options, id, (progress) => {
            event.reply('download-progress', { id, progress });
        });

        child.on('close', (code) => {
            // Check if this download was paused - if so, don't send completion event
            const downloadInfo = ytDlpService.activeDownloads.get(id);
            if (downloadInfo && downloadInfo.paused) {
                console.log(`[Main] Download ${id} closed due to pause, not sending completion event`);
                return; // Don't send download-complete for paused downloads
            }

            // Only send completion if not manually cancelled (cancelled ones are removed from map)
            // But here we just report what happened.
            // If code is null/SIGTERM, it might be pause/cancel.
            // The frontend handles the status update based on user action, 
            // but for natural completion/failure we send this.

            const outputPath = child._outputPath || options.output;
            event.reply('download-complete', { id, code, filePath: outputPath });

            if (code === 0) {
                if (outputPath) {
                    shell.showItemInFolder(outputPath);
                }
            }
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
            groqWhisperService.updateKeyPool(apiKeys);
            return { success: true };
        } catch (error) {
            console.error('[Main] Failed to update Groq keys:', error);
            return { success: false, error: error.message };
        }
    });

    // Auto-updater IPC handlers
    ipcMain.handle('app:check-for-updates', () => {
        autoUpdaterService.checkForUpdates(false); // Manual check, show dialog even if already latest
        return { success: true };
    });

    ipcMain.handle('groq:transcribe', async (event, { audioPath, apiKeys, geminiApiKey, options }) => {
        try {
            // Initialize with key pool
            groqWhisperService.initializeWithKeyPool(apiKeys);

            // Set FFmpeg path for audio chunking
            const ffmpegPath = await getFfmpegPath();
            groqWhisperService.setFfmpegPath(ffmpegPath);

            const result = await groqWhisperService.transcribe(
                audioPath,
                options,
                (progress) => {
                    event.sender.send('groq:progress', progress);
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

            // Auto post-process with Gemini to fix errors
            if (result.success && geminiApiKey && result.segments && result.segments.length > 0) {
                event.sender.send('groq:progress', { stage: 'polishing', message: 'AI is correcting errors...' });

                try {
                    const polishedSegments = await postProcessWithGemini(geminiApiKey, result.segments, options.language);

                    // Regenerate SRT and text with corrected content
                    result.segments = polishedSegments;
                    result.srt = groqWhisperService.generateSrt(polishedSegments);
                    result.plainText = groqWhisperService.generatePlainText(polishedSegments);
                    result.text = polishedSegments.map(s => s.text).join(' ');

                    console.log('[Gemini] Post-processing complete');
                } catch (e) {
                    console.error('[Gemini] Post-processing failed:', e.message);
                    // Continue with original result if post-processing fails
                }
            }

            return result;
        } catch (error) {
            return { success: false, error: error.message };
        }
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

    ipcMain.handle('groq:fill-gaps', async (event, { audioPath, gaps, apiKeys, options }) => {
        try {
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

    // Gemini post-processing function
    async function postProcessWithGemini(apiKey, segments, language) {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
                                text: text || batch[idx].text
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
