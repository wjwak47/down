import { spawn } from 'child_process';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { getFfmpegPath } from '../utils/ffmpeg-helper';

class YtDlpService {
    constructor() {
        this._binPath = null; // Lazy initialized to avoid app.isPackaged issues during module load
        this.activeDownloads = new Map(); // Store active child processes: id -> { process, outputPath }
    }

    // Lazy getter for binPath to avoid accessing app.isPackaged during module loading
    get binPath() {
        if (!this._binPath) {
            this._binPath = this.getBinaryPath();
        }
        return this._binPath;
    }

    getBinaryPath() {
        const isPackaged = app.isPackaged;
        const platform = process.platform;
        const binName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
        if (isPackaged) {
            // In production, bin files are copied to resources/bin
            return path.join(process.resourcesPath, 'bin', binName);
        } else {
            // In development, use platform-specific folder
            const platformFolder = platform === 'win32' ? 'bin-win' : 'bin-mac';
            return path.join(app.getAppPath(), 'resources', platformFolder, binName);
        }
    }

    // Extract video metadata from Douyin using a hidden BrowserWindow
    async extractDouyinNative(url) {
        const { BrowserWindow } = require('electron');
        return new Promise((resolve, reject) => {
            const win = new BrowserWindow({
                show: false,
                width: 1280,
                height: 900,
                webPreferences: {
                    offscreen: false,
                    nodeIntegration: false,
                    contextIsolation: true,
                    webSecurity: false,  // Disable web security to allow cross-domain requests if needed
                    partition: 'in-memory-extraction' // Use a separate partition
                }
            });

            // Mute audio
            win.webContents.setAudioMuted(true);

            // Use Mobile UA
            const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
            win.webContents.setUserAgent(mobileUA);

            let detectedVideoUrl = null;

            // Intercept requests to capture video URL
            win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
                const url = details.url;
                if (url.includes('video_id=') || (url.includes('.mp4') && !url.includes('blob:'))) {
                    if (!detectedVideoUrl) detectedVideoUrl = url;
                }
                callback({ requestHeaders: details.requestHeaders });
            });

            // Timeout
            const timeout = setTimeout(() => {
                if (!win.isDestroyed()) win.destroy();
                reject(new Error('Extraction timed out'));
            }, 30000);

            let finished = false;

            // Use dom-ready + wait
            win.webContents.on('dom-ready', async () => {
                if (finished || win.isDestroyed()) return;

                // Wait a bit for SSR hydration
                await new Promise(r => setTimeout(r, 2000));

                if (finished || win.isDestroyed()) return;
                finished = true;
                clearTimeout(timeout);

                try {
                    // Enhanced Script with Regex Fix
                    const result = await win.webContents.executeJavaScript(`
                        (function() {
                            var d = {
                                url: null,
                                title: document.title || 'Douyin Video',
                                uploader: null,
                                duration: null,
                                thumbnail: null
                            };

                            // 1. DOM Video Search
                            var vids = document.querySelectorAll('video');
                            var bestVid = null;
                            var maxDur = 0;
                            for (var i = 0; i < vids.length; i++) {
                                var v = vids[i];
                                if (v.src && !v.src.startsWith('blob:')) {
                                    if (v.duration > maxDur) {
                                        maxDur = v.duration;
                                        bestVid = v;
                                    } else if (!bestVid) bestVid = v;
                                }
                            }
                            if (bestVid) {
                                d.url = bestVid.src;
                                if (maxDur > 0) d.duration = Math.floor(maxDur);
                            }

                            // 2. Title Parsing
                            var parts = (d.title || '').split('-');
                            if (parts.length >= 2) {
                                d.title = parts[0].trim();
                                if (!d.uploader) d.uploader = parts[parts.length - 1].trim();
                            }

                            // 3. SIGI_STATE
                            try {
                                var sigiEl = document.getElementById('SIGI_STATE');
                                if (sigiEl && sigiEl.textContent) {
                                    var sigi = JSON.parse(sigiEl.textContent);
                                    if (sigi.ItemModule) {
                                        var keys = Object.keys(sigi.ItemModule);
                                        if (keys.length > 0) {
                                            var item = sigi.ItemModule[keys[0]];
                                            if (item) {
                                                if (item.desc) d.title = item.desc;
                                                if (item.duration) d.duration = Math.floor(item.duration / 1000);
                                                if (item.nickname) d.uploader = item.nickname;
                                                if (item.author) d.uploader = item.author;
                                                if (item.video && item.video.cover && item.video.cover.url_list && item.video.cover.url_list[0]) {
                                                    d.thumbnail = item.video.cover.url_list[0];
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch(e) {}

                            // 4. SSR DATA
                            try {
                                var ssrEl = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
                                if (ssrEl && ssrEl.textContent) {
                                    var ssr = JSON.parse(ssrEl.textContent);
                                    if (ssr['__DEFAULT_SCOPE__'] && ssr['__DEFAULT_SCOPE__']['webapp.video-detail']) {
                                        var detail = ssr['__DEFAULT_SCOPE__']['webapp.video-detail'].itemInfo.itemStruct;
                                        if (detail) {
                                            if (detail.desc) d.title = detail.desc;
                                            if (detail.duration) d.duration = Math.floor(detail.duration / 1000);
                                            if (detail.author && detail.author.nickname) d.uploader = detail.author.nickname;
                                            if (detail.video && detail.video.cover && detail.video.cover.url_list[0]) d.thumbnail = detail.video.cover.url_list[0];
                                        }
                                    }
                                }
                            } catch(e) {}

                            // 5. RENDER_DATA (Regex Fixed)
                            try {
                                var renderEl = document.getElementById('RENDER_DATA');
                                if (renderEl && renderEl.textContent) {
                                    var decoded = decodeURIComponent(renderEl.textContent);
                                    if (!d.uploader) {
                                        var nm = decoded.match(/"nickname"\\s*:\\s*"([^"]+)"/);
                                        if (nm) d.uploader = nm[1];
                                    }
                                    if (!d.duration) {
                                        var dm = decoded.match(/"duration"\\s*:\\s*(\\d+)/);
                                        if (dm) d.duration = Math.floor(parseInt(dm[1]) / 1000);
                                    }
                                    if (!d.thumbnail) {
                                        var tm = decoded.match(/"cover".*?"url_list"\\s*:\\s*\\["([^"]+)"/);
                                        if (tm) d.thumbnail = tm[1];
                                    }
                                }
                            } catch(e) {}
                            
                            // 6. Meta Tags
                            if (!d.thumbnail) {
                                var og = document.querySelector('meta[property="og:image"]');
                                if (og && og.content) d.thumbnail = og.content;
                            }

                            // Normalize
                            if (d.thumbnail && d.thumbnail.startsWith('//')) d.thumbnail = 'https:' + d.thumbnail;

                            return d;
                        })()
                    `);

                    let finalUrl = detectedVideoUrl || result.url;
                    if (finalUrl) {
                        if (finalUrl.includes('playwm')) finalUrl = finalUrl.replace('playwm', 'play');
                        if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;

                        const cookies = await win.webContents.session.cookies.get({ url: 'https://www.douyin.com' });
                        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

                        if (!win.isDestroyed()) win.destroy();

                        resolve({
                            title: result.title || 'Douyin Video',
                            thumbnail: result.thumbnail,
                            uploader: result.uploader || 'Unknown',
                            duration: result.duration || null,
                            duration_string: result.duration ? `${Math.floor(result.duration / 60)}:${String(result.duration % 60).padStart(2, '0')}` : null,
                            url: finalUrl,
                            webpage_url: url,
                            ext: 'mp4',
                            extractor: 'douyin_native',
                            headers: { 'User-Agent': mobileUA, 'Cookie': cookieString, 'Referer': 'https://www.douyin.com/' }
                        });
                    } else {
                        if (!win.isDestroyed()) win.destroy();
                        reject(new Error('Could not find video URL'));
                    }
                } catch (e) {
                    if (!win.isDestroyed()) win.destroy();
                    reject(e);
                }
            });

            win.loadURL(url);
        });
    }

    async getPreviewVideo(videoInfo) {
        const os = require('os');
        const tmpDir = os.tmpdir();
        const previewPath = path.join(tmpDir, `preview_${Date.now()}.mp4`);
        console.log('[Preview] Starting download to:', previewPath);
        console.log('[Preview] Video URL:', videoInfo.url);

        const videoUrl = videoInfo.url;

        if (!videoUrl || videoUrl.startsWith('blob:')) {
            throw new Error('Invalid video URL for preview (blob or empty)');
        }

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(previewPath);
            const protocol = videoUrl.startsWith('https') ? https : http;

            const options = {
                headers: videoInfo.headers || {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            };

            protocol.get(videoUrl, options, (response) => {
                console.log('[Preview] Response status:', response.statusCode);
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download preview: ${response.statusCode}`));
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => {
                        console.log('[Preview] Download complete:', previewPath);
                        console.log('[Preview] File size:', fs.statSync(previewPath).size, 'bytes');
                        resolve(previewPath);
                    });
                });
            }).on('error', (err) => {
                fs.unlink(previewPath, () => { });
                reject(err);
            });
        });
    }

    async getVideoInfo(url, options = {}) {
        if (url && url.includes('douyin.com')) {
            try {
                return await this.extractDouyinNative(url);
            } catch (e) {
                console.error('Native extraction failed, falling back to yt-dlp:', e);
            }
        }

        // Detect platform for format selection
        const isBilibili = url.includes('bilibili.com') || url.includes('b23.tv');

        return new Promise((resolve, reject) => {
            const args = [
                '--dump-json',
                '--no-playlist',
                '--no-check-certificate'
            ];

            // For Bilibili: don't specify format at all, let yt-dlp auto-select
            // This avoids "Requested format is not available" errors
            if (!isBilibili) {
                args.push('-f', 'best[vcodec^=avc1][ext=mp4][protocol^=http]/best[vcodec^=avc1][ext=mp4]/best[ext=mp4]/best');
            }

            // Add cookies if provided (especially for Bilibili)
            if (options.cookies) {
                args.push('--add-header', `Cookie:${options.cookies}`);
            }

            args.push(url);
            
            console.log('[YtDlp] getVideoInfo args:', args.join(' '));

            const child = spawn(this.binPath, args);
            let output = '';
            let error = '';

            child.stdout.on('data', (data) => {
                output += data.toString('utf8');
            });

            child.stderr.on('data', (data) => {
                error += data.toString('utf8');
            });

            child.on('close', (code) => {
                if (code === 0) {
                    try {
                        const info = JSON.parse(output);

                        // Ensure we have a URL
                        let videoUrl = info.url;
                        if (!videoUrl && info.formats && info.formats.length > 0) {
                            videoUrl = info.formats[info.formats.length - 1].url;
                        }

                        // Fix thumbnail URL: convert http to https for Bilibili and other platforms
                        let thumbnail = info.thumbnail;
                        if (thumbnail && thumbnail.startsWith('http://')) {
                            thumbnail = thumbnail.replace('http://', 'https://');
                        }

                        resolve({
                            id: info.id,
                            title: info.title,
                            thumbnail: thumbnail,
                            uploader: info.uploader,
                            duration: info.duration,
                            duration_string: info.duration_string,
                            url: videoUrl,
                            webpage_url: info.webpage_url,
                            ext: info.ext,
                            extractor: info.extractor,
                            extractor_key: info.extractor_key,
                            headers: info.http_headers,
                            view_count: info.view_count,
                            channel: info.channel,
                            filesize: info.filesize,
                            // Include formats array for format detection in UI
                            formats: info.formats || []
                        });
                    } catch (e) {
                        reject(new Error('Failed to parse video info'));
                    }
                } else {
                    reject(new Error(error || 'Failed to get video info'));
                }
            });
        });
    }

    downloadVideo(url, options, id, onProgress) {
        // Use custom download directory if provided, otherwise use system Downloads folder
        const downloadDir = options.downloadDir || app.getPath('downloads');
        const filenameTemplate = options.output || '%(title)s.%(ext)s';
        const outputPath = path.join(downloadDir, filenameTemplate);

        // Detect platform for format selection
        const isBilibili = url.includes('bilibili.com') || url.includes('b23.tv');
        const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');

        // Determine format based on audioOnly option and platform
        let formatString;
        if (options.audioOnly) {
            // For audio-only: download best audio in its original format (no conversion)
            formatString = 'bestaudio/best';
        } else if (isBilibili) {
            // Bilibili: video and audio are separate streams, need to merge
            // Use bestvideo+bestaudio and let ffmpeg merge them
            formatString = 'bestvideo+bestaudio/bestvideo*+bestaudio/best';
        } else if (isYoutube) {
            // YouTube: prefer specific formats for better compatibility
            formatString = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best';
        } else {
            // Other platforms: use flexible format selection
            formatString = 'bestvideo+bestaudio/best[ext=mp4]/best';
        }

        // Determine output format - use user's selection or default based on type
        const outputFormat = options.mergeOutputFormat || (options.audioOnly ? 'm4a' : 'mp4');
        
        const args = [
            url,
            '--format', formatString,
            '--output', outputPath,
            '--no-playlist',
            '--no-check-certificate',
            '--embed-metadata',
            // 🔑 Force progress output on new lines for better parsing
            '--newline',
            // 🔑 Ensure progress is shown with template
            '--progress',
            '--progress-template', 'download:[PROGRESS] %(progress._percent_str)s of %(progress._total_bytes_str)s at %(progress._speed_str)s ETA %(progress._eta_str)s',
            // 🔑 CRITICAL FIX: Tell yt-dlp to print the final filepath after download
            // This works on ALL platforms and avoids encoding issues
            '--print', 'after_move:filepath'
        ];

        // 🔑 CRITICAL: Only use --merge-output-format for VIDEO downloads (not audio-only)
        // --merge-output-format is for merging video+audio streams, not for audio-only
        if (options.audioOnly) {
            // For audio-only downloads, use --extract-audio if conversion is needed
            // m4a is usually the native format, so no conversion needed
            // But if user wants mp3 or wav, we need to convert
            if (outputFormat === 'mp3') {
                args.push('--extract-audio');
                args.push('--audio-format', 'mp3');
                args.push('--audio-quality', '0'); // Best quality
            } else if (outputFormat === 'wav') {
                args.push('--extract-audio');
                args.push('--audio-format', 'wav');
            }
            // For m4a, just download bestaudio - it's usually already m4a
        } else {
            // For video downloads, use merge-output-format
            args.push('--merge-output-format', outputFormat);
        }
        
        console.log(`[YtDlp] Using output format: ${outputFormat}, audioOnly: ${options.audioOnly}`);

        // Explicitly tell yt-dlp where ffmpeg is, just in case 'best' falls back to merging
        let ffmpegPath = '';
        if (app.isPackaged) {
            ffmpegPath = path.join(process.resourcesPath, 'bin', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
        } else {
            const platformFolder = process.platform === 'win32' ? 'bin-win' : 'bin-mac';
            ffmpegPath = path.join(app.getAppPath(), 'resources', platformFolder, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
        }

        if (fs.existsSync(ffmpegPath)) {
            console.log('[YtDlp] Using ffmpeg at:', ffmpegPath);
            args.push('--ffmpeg-location', ffmpegPath);
        }

        // 🔑 CRITICAL: Add Bilibili-specific headers to bypass 403 Forbidden
        if (isBilibili) {
            args.push('--referer', 'https://www.bilibili.com/');
            args.push('--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            // Add extra headers that Bilibili might require
            args.push('--add-header', 'Origin:https://www.bilibili.com');
            // 🔑 Ignore errors and try to continue
            args.push('--ignore-errors');
            // 🔑 Retry on failure
            args.push('--retries', '3');
            // 🔑 Fragment retries for segmented downloads
            args.push('--fragment-retries', '3');
        }

        // Add headers if provided in options
        if (options.headers) {
            if (options.headers['User-Agent'] && !isBilibili) {
                args.push('--user-agent', options.headers['User-Agent']);
            }
            if (options.headers['Referer'] && !isBilibili) {
                args.push('--referer', options.headers['Referer']);
            }
            if (options.headers['Cookie']) {
                args.push('--add-header', `Cookie:${options.headers['Cookie']}`);
            }
        }

        // Note: For audio-only downloads, we keep the original format (m4a, aac, etc.)
        // No conversion to mp3 - preserves original quality for transcription

        // 🔑 Debug: Log the full command
        console.log(`[YtDlp] Download command: ${this.binPath} ${args.join(' ')}`);

        const child = spawn(this.binPath, args);
        child._outputPath = null;

        // Store the process
        // If resuming a paused download, clear the paused flag
        const existingDownload = this.activeDownloads.get(id);
        if (existingDownload && existingDownload.paused) {
            console.log(`[YtDlpService] Resuming paused download ${id}`);
        }
        this.activeDownloads.set(id, { process: child, outputPath: null, paused: false });

        child.stdout.on('data', (data) => {
            const str = data.toString('utf8');
            console.log(`[yt-dlp ${id}]`, str);

            // 🔑 PRIORITY 1: Capture filepath from --print after_move:filepath
            // This is a clean output with JUST the file path, no prefixes
            // It appears on its own line after download completes
            const lines = str.split(/\r?\n/);
            for (const line of lines) {
                const trimmed = line.trim();
                // If line looks like a file path (contains path separator and file extension)
                if (trimmed && (trimmed.includes('\\') || trimmed.includes('/')) &&
                    /\.(mp4|webm|mkv|avi|mov|m4a|mp3|wav|aac|ogg|flac)$/i.test(trimmed)) {
                    // This is likely our filepath from --print
                    console.log(`[yt-dlp ${id}] 🎯 FILEPATH from --print:`, trimmed);
                    child._outputPath = trimmed;
                    const active = this.activeDownloads.get(id);
                    if (active) {
                        active.outputPath = trimmed;
                        console.log(`[yt-dlp ${id}] ✅ Final path stored successfully`);
                    }
                    // Don't break - let it capture the last one if multiple matches
                }
            }

            // Parse full progress info from yt-dlp output
            // New template format: "[PROGRESS] 45.3% of 100.50MiB at 2.50MiB/s ETA 00:22"
            // Old format: "[download]  45.3% of  100.50MiB at    2.50MiB/s ETA 00:22"
            const progressData = {
                progress: 0,
                speed: 0,
                downloadedSize: 0,
                totalSize: 0,
                eta: 0
            };

            // Match progress percentage (handles both "45.3%" and " 45.3%")
            const percentMatch = str.match(/(\d+\.?\d*)%/);
            if (percentMatch) {
                progressData.progress = parseFloat(percentMatch[1]);
                console.log(`[yt-dlp ${id}] 📊 STDOUT Progress: ${progressData.progress}%`);
            }

            // Match total size: "of 100.50MiB" or "of ~100.50MiB"
            const totalMatch = str.match(/of\s+~?([\d.]+)\s*(MiB|KiB|GiB|MB|KB|GB)/i);
            if (totalMatch) {
                const value = parseFloat(totalMatch[1]);
                const unit = totalMatch[2].toLowerCase();
                if (unit === 'kib' || unit === 'kb') progressData.totalSize = value * 1024;
                else if (unit === 'mib' || unit === 'mb') progressData.totalSize = value * 1024 * 1024;
                else if (unit === 'gib' || unit === 'gb') progressData.totalSize = value * 1024 * 1024 * 1024;
            }

            // Calculate downloaded size from percentage and total
            if (progressData.totalSize > 0 && progressData.progress > 0) {
                progressData.downloadedSize = Math.round(progressData.totalSize * progressData.progress / 100);
            }

            // Match speed: "at 2.50MiB/s" or "2.50MiB/s"
            const speedMatch = str.match(/([\d.]+)\s*(MiB|KiB|GiB|MB|KB|GB)\/s/i);
            if (speedMatch) {
                const value = parseFloat(speedMatch[1]);
                const unit = speedMatch[2].toLowerCase();
                if (unit === 'kib' || unit === 'kb') progressData.speed = value * 1024;
                else if (unit === 'mib' || unit === 'mb') progressData.speed = value * 1024 * 1024;
                else if (unit === 'gib' || unit === 'gb') progressData.speed = value * 1024 * 1024 * 1024;
            }

            // Match ETA: "ETA 00:22" or "ETA 01:23:45"
            const etaMatch = str.match(/ETA\s+(\d+):(\d+)(?::(\d+))?/i);
            if (etaMatch) {
                if (etaMatch[3]) {
                    // HH:MM:SS format
                    progressData.eta = parseInt(etaMatch[1]) * 3600 + parseInt(etaMatch[2]) * 60 + parseInt(etaMatch[3]);
                } else {
                    // MM:SS format
                    progressData.eta = parseInt(etaMatch[1]) * 60 + parseInt(etaMatch[2]);
                }
            }

            // Only call onProgress if we have valid progress data
            if (progressData.progress > 0) {
                onProgress(progressData);
            }

            // FALLBACK: Old parsing methods (kept for compatibility)
            // These will be overridden by the --print output above

            const destMatch = str.match(/\[download\] Destination: (.+?)(?:\r?\n|$)/);
            if (destMatch) {
                const dest = destMatch[1].trim();
                console.log(`[yt-dlp ${id}] Fallback: Captured from [download]:`, dest);
                if (!child._outputPath) { // Only use if we don't have the --print version
                    child._outputPath = dest;
                    const active = this.activeDownloads.get(id);
                    if (active) active.outputPath = dest;
                }
            }

            const extractMatch = str.match(/\[ExtractAudio\] Destination: (.+?)(?:\r?\n|$)/);
            if (extractMatch) {
                const dest = extractMatch[1].trim();
                console.log(`[yt-dlp ${id}] Fallback: Captured from [ExtractAudio]:`, dest);
                if (!child._outputPath) {
                    child._outputPath = dest;
                    const active = this.activeDownloads.get(id);
                    if (active) active.outputPath = dest;
                }
            }

            const alreadyMatch = str.match(/\[download\] (.+?) has already been downloaded/);
            if (alreadyMatch) {
                const dest = alreadyMatch[1].trim();
                console.log(`[yt-dlp ${id}] Fallback: File already exists:`, dest);
                if (!child._outputPath) {
                    child._outputPath = dest;
                    const active = this.activeDownloads.get(id);
                    if (active) active.outputPath = dest;
                }
            }

            // Capture merged file path from [Merger] output
            const mergerMatch = str.match(/\[Merger\] Merging formats into "(.+?)"/);
            if (mergerMatch) {
                const dest = mergerMatch[1].trim();
                console.log(`[yt-dlp ${id}] 🎯 Captured from [Merger]:`, dest);
                child._outputPath = dest;
                const active = this.activeDownloads.get(id);
                if (active) active.outputPath = dest;
            }

            // Also capture from [ffmpeg] output for merged files
            const ffmpegDestMatch = str.match(/\[ffmpeg\] Merging formats into "(.+?)"/);
            if (ffmpegDestMatch) {
                const dest = ffmpegDestMatch[1].trim();
                console.log(`[yt-dlp ${id}] 🎯 Captured from [ffmpeg]:`, dest);
                child._outputPath = dest;
                const active = this.activeDownloads.get(id);
                if (active) active.outputPath = dest;
            }
        });

        child.stderr.on('data', (data) => {
            const str = data.toString('utf8');
            
            // Debug: Log all stderr output to see what yt-dlp is sending
            console.log(`[yt-dlp ${id} STDERR]`, str.trim());
            
            // yt-dlp outputs progress info to stderr, so we need to parse it here too
            // Parse full progress info from yt-dlp output
            // Example: "[download]  45.3% of  100.50MiB at    2.50MiB/s ETA 00:22"
            const progressData = {
                progress: 0,
                speed: 0,
                downloadedSize: 0,
                totalSize: 0,
                eta: 0
            };

            // Match progress percentage
            const percentMatch = str.match(/(\d+\.?\d*)%/);
            if (percentMatch) {
                progressData.progress = parseFloat(percentMatch[1]);
                console.log(`[yt-dlp ${id}] 📊 Progress parsed: ${progressData.progress}%`);
            }

            // Match total size: "of 100.50MiB" or "of ~100.50MiB"
            const totalMatch = str.match(/of\s+~?([\d.]+)\s*(MiB|KiB|GiB|MB|KB|GB)/i);
            if (totalMatch) {
                const value = parseFloat(totalMatch[1]);
                const unit = totalMatch[2].toLowerCase();
                if (unit === 'kib' || unit === 'kb') progressData.totalSize = value * 1024;
                else if (unit === 'mib' || unit === 'mb') progressData.totalSize = value * 1024 * 1024;
                else if (unit === 'gib' || unit === 'gb') progressData.totalSize = value * 1024 * 1024 * 1024;
            }

            // Calculate downloaded size from percentage and total
            if (progressData.totalSize > 0 && progressData.progress > 0) {
                progressData.downloadedSize = Math.round(progressData.totalSize * progressData.progress / 100);
            }

            // Match speed: "at 2.50MiB/s" or "2.50MiB/s"
            const speedMatch = str.match(/([\d.]+)\s*(MiB|KiB|GiB|MB|KB|GB)\/s/i);
            if (speedMatch) {
                const value = parseFloat(speedMatch[1]);
                const unit = speedMatch[2].toLowerCase();
                if (unit === 'kib' || unit === 'kb') progressData.speed = value * 1024;
                else if (unit === 'mib' || unit === 'mb') progressData.speed = value * 1024 * 1024;
                else if (unit === 'gib' || unit === 'gb') progressData.speed = value * 1024 * 1024 * 1024;
            }

            // Match ETA: "ETA 00:22" or "ETA 01:23:45"
            const etaMatch = str.match(/ETA\s+(\d+):(\d+)(?::(\d+))?/i);
            if (etaMatch) {
                if (etaMatch[3]) {
                    // HH:MM:SS format
                    progressData.eta = parseInt(etaMatch[1]) * 3600 + parseInt(etaMatch[2]) * 60 + parseInt(etaMatch[3]);
                } else {
                    // MM:SS format
                    progressData.eta = parseInt(etaMatch[1]) * 60 + parseInt(etaMatch[2]);
                }
            }

            // Only call onProgress if we have valid progress data
            if (progressData.progress > 0) {
                console.log(`[yt-dlp ${id}] 📤 Sending progress: ${JSON.stringify(progressData)}`);
                onProgress(progressData);
            }

            // Also capture file paths from stderr (some yt-dlp versions output here)
            // Capture merged file path from [Merger] output
            const mergerMatch = str.match(/\[Merger\] Merging formats into "(.+?)"/);
            if (mergerMatch) {
                const dest = mergerMatch[1].trim();
                console.log(`[yt-dlp ${id}] 🎯 STDERR Captured from [Merger]:`, dest);
                child._outputPath = dest;
                const active = this.activeDownloads.get(id);
                if (active) active.outputPath = dest;
            }

            // Also capture from [ffmpeg] output for merged files
            const ffmpegDestMatch = str.match(/\[ffmpeg\] Merging formats into "(.+?)"/);
            if (ffmpegDestMatch) {
                const dest = ffmpegDestMatch[1].trim();
                console.log(`[yt-dlp ${id}] 🎯 STDERR Captured from [ffmpeg]:`, dest);
                child._outputPath = dest;
                const active = this.activeDownloads.get(id);
                if (active) active.outputPath = dest;
            }

            // Capture filepath from --print output in stderr too
            const lines = str.split(/\r?\n/);
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && (trimmed.includes('\\') || trimmed.includes('/')) &&
                    /\.(mp4|webm|mkv|avi|mov|m4a|mp3|wav|aac|ogg|flac)$/i.test(trimmed) &&
                    !trimmed.includes('[') && !trimmed.includes('%')) {
                    console.log(`[yt-dlp ${id}] 🎯 STDERR FILEPATH:`, trimmed);
                    child._outputPath = trimmed;
                    const active = this.activeDownloads.get(id);
                    if (active) active.outputPath = trimmed;
                }
            }
        });


        child.on('close', () => {
            const active = this.activeDownloads.get(id);

            // If it was paused, don't delete and don't trigger completion
            if (active && active.paused) {
                console.log(`[yt-dlp ${id}] Process closed due to pause`);
                return;
            }

            // The filepath should already be captured from --print after_move:filepath
            console.log(`[yt-dlp ${id}] Download complete. Final path:`, active?.outputPath || child._outputPath);

            // Clean up
            if (this.activeDownloads.has(id)) {
                this.activeDownloads.delete(id);
            }
        });

        return child;
    }

    pauseDownload(id) {
        const active = this.activeDownloads.get(id);
        if (active && active.process) {
            console.log(`[YtDlpService] Pausing download ${id}`);

            // Mark as paused BEFORE killing process to prevent 'Failed' status
            active.paused = true;

            if (process.platform === 'win32') {
                try {
                    require('child_process').execSync(`taskkill /pid ${active.process.pid} /f /t`);
                } catch (e) {
                    console.error(`[YtDlpService] Failed to kill process tree: ${e.message}`);
                    active.process.kill('SIGTERM');
                }
            } else {
                active.process.kill('SIGTERM');
            }
            // Keep in activeDownloads map with paused flag so we know it was intentionally paused
            return true;
        }
        return false;
    }

    cancelDownload(id) {
        const active = this.activeDownloads.get(id);
        if (active) {
            console.log(`[YtDlpService] Canceling download ${id}`);
            if (active.process) {
                if (process.platform === 'win32') {
                    try {
                        require('child_process').execSync(`taskkill /pid ${active.process.pid} /f /t`);
                        console.log(`[YtDlpService] Killed process tree for ${id}`);
                    } catch (e) {
                        console.error(`[YtDlpService] Failed to kill process tree: ${e.message}`);
                        active.process.kill('SIGTERM');
                    }
                } else {
                    active.process.kill('SIGTERM');
                }
            }

            // Try to delete the partial file
            // Note: active.outputPath might be the final file or the .part file.
            // yt-dlp usually appends .part to the filename during download.
            // We should try to delete both the reported output path and output path + .part
            if (active.outputPath) {
                const filesToDelete = [
                    active.outputPath,
                    active.outputPath + '.part',
                    active.outputPath + '.ytdl' // sometimes used
                ];

                filesToDelete.forEach(file => {
                    if (fs.existsSync(file)) {
                        try {
                            fs.unlinkSync(file);
                            console.log(`[YtDlpService] Deleted partial file: ${file}`);
                        } catch (e) {
                            console.error(`[YtDlpService] Failed to delete file ${file}:`, e);
                        }
                    }
                });
            }

            this.activeDownloads.delete(id);
            return true;
        }
        return false;
    }

    // Get available subtitles for a video
    async getSubtitlesList(url) {
        return new Promise((resolve, reject) => {
            const args = [
                '--list-subs',
                '--skip-download',
                url
            ];

            const child = spawn(this.binPath, args);
            let output = '';
            let error = '';

            child.stdout.on('data', (data) => {
                output += data.toString('utf8');
            });

            child.stderr.on('data', (data) => {
                error += data.toString('utf8');
            });

            child.on('close', (code) => {
                if (code === 0) {
                    try {
                        // Parse subtitle list from output
                        const subtitles = this.parseSubtitlesList(output);
                        resolve(subtitles);
                    } catch (e) {
                        reject(new Error('Failed to parse subtitles list'));
                    }
                } else {
                    reject(new Error(error || 'Failed to get subtitles list'));
                }
            });
        });
    }

    // Parse yt-dlp subtitle list output
    parseSubtitlesList(output) {
        const subtitles = [];
        const lines = output.split('\n');
        let inSubtitlesSection = false;
        let isAutoGenerated = false;

        for (const line of lines) {
            // Detect sections
            if (line.includes('Available subtitles')) {
                inSubtitlesSection = true;
                isAutoGenerated = false;
                continue;
            }
            if (line.includes('Available automatic captions')) {
                inSubtitlesSection = true;
                isAutoGenerated = true;
                continue;
            }

            // Parse subtitle lines (format: "en    English")
            if (inSubtitlesSection && line.trim()) {
                const match = line.match(/^([a-z]{2}(?:-[A-Z]{2})?)\s+(.+)$/);
                if (match) {
                    subtitles.push({
                        code: match[1].trim(),
                        name: match[2].trim(),
                        auto: isAutoGenerated
                    });
                }
            }
        }

        return subtitles;
    }

    // Download subtitles
    downloadSubtitles(url, options, onProgress) {
        const downloadDir = options.downloadDir || app.getPath('downloads');
        const outputTemplate = path.join(downloadDir, '%(title)s.%(ext)s');

        const args = [
            url,
            '--skip-download',
            '--output', outputTemplate
        ];

        // Add subtitle languages
        if (options.languages && options.languages.length > 0) {
            const langString = options.languages.join(',');
            if (options.autoSubs) {
                args.push('--write-auto-sub');
            } else {
                args.push('--write-sub');
            }
            args.push('--sub-lang', langString);
        }

        // Add subtitle format
        if (options.format) {
            args.push('--sub-format', options.format);
        }

        args.push('--no-check-certificate');

        const child = spawn(this.binPath, args);
        child._outputPath = null;

        child.stdout.on('data', (data) => {
            const str = data.toString('utf8');
            console.log('[yt-dlp subtitle]', str);

            // Check for completion messages
            if (str.includes('Writing video subtitles')) {
                onProgress(50);
            }
        });

        child.stderr.on('data', (data) => {
            console.error('[yt-dlp subtitle ERROR]', data.toString('utf8'));
        });

        return child;
    }
}

export default new YtDlpService();
