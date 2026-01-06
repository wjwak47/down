import { spawn } from 'child_process';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';

class YtDlpService {
    constructor() {
        this.binPath = this.getBinaryPath();
        this.activeDownloads = new Map(); // Store active child processes: id -> { process, outputPath }
    }

    getBinaryPath() {
        const isPackaged = app.isPackaged;
        const platform = process.platform;
        const binName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
        if (isPackaged) {
            return path.join(process.resourcesPath, 'bin', binName);
        } else {
            return path.join(app.getAppPath(), 'resources', 'bin', binName);
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
                    webSecurity: false,
                    partition: 'in-memory-extraction' // Use a separate partition to isolate session and audio settings
                }
            });

            // Mute the window to prevent audio playing during extraction
            win.webContents.setAudioMuted(true);

            // Use Mobile UA to force single MP4 file (video+audio) instead of separate streams
            const mobileUA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
            win.webContents.setUserAgent(mobileUA);

            let detectedVideoUrl = null;
            let headers = {};

            // Clear cache to ensure network requests are triggered
            win.webContents.session.clearCache();

            // Intercept network requests to find the actual video URL (bypassing blob:)
            win.webContents.session.webRequest.onResponseStarted({ urls: ['*://*/*'] }, (details) => {
                const contentTypeHeader = details.responseHeaders['content-type'] || details.responseHeaders['Content-Type'];
                const url = details.url;

                // Check content type
                let isVideo = false;
                if (contentTypeHeader) {
                    const contentType = Array.isArray(contentTypeHeader) ? contentTypeHeader[0] : contentTypeHeader;
                    if (contentType.includes('video/') ||
                        contentType === 'application/vnd.apple.mpegurl' ||
                        contentType === 'application/octet-stream') {
                        isVideo = true;
                    }
                }

                // Check URL extension/pattern
                if (url.includes('.mp4') || url.includes('.webm') || url.includes('video_id=')) {
                    isVideo = true;
                }

                if (isVideo && !url.startsWith('blob:') && !url.includes('favicon')) {
                    // Prioritize mp4/video URLs over m3u8 if possible, but capture what we find
                    if (!detectedVideoUrl || (url.includes('.mp4') && !detectedVideoUrl.includes('.mp4'))) {
                        console.log('Detected video URL from network:', url);
                        detectedVideoUrl = url;
                        headers = {
                            'User-Agent': mobileUA,
                            'Cookie': '', // Will be filled later
                            'Referer': 'https://www.douyin.com/'
                        };
                        // Trigger early exit check
                        setTimeout(checkEarlyExit, 100);
                    }
                }
            });

            let timeoutReached = false;
            let earlyExitTimer = null;

            const timeout = setTimeout(() => {
                timeoutReached = true;
                console.log('[Douyin] Timeout reached, but checking if we have video URL...');
            }, 20000);

            win.loadURL(url);

            // If we detect a video URL via network, wait a bit more for metadata then exit early
            const checkEarlyExit = () => {
                if (detectedVideoUrl && !earlyExitTimer) {
                    console.log('[Douyin] Video URL detected, will exit early in 3 seconds...');
                    earlyExitTimer = setTimeout(() => {
                        if (!win.isDestroyed()) {
                            console.log('[Douyin] Early exit triggered');
                            win.webContents.executeJavaScript('window.stop()'); // Stop loading
                            win.webContents.emit('did-finish-load'); // Trigger finish event
                        }
                    }, 3000); // Wait 3 more seconds for metadata after URL detection
                }
            };

            win.webContents.on('did-finish-load', async () => {
                try {
                    await new Promise(r => setTimeout(r, 2000));
                    const result = await win.webContents.executeJavaScript(`
                        (function() {
                            try {
                                let data = {};
                                const video = document.querySelector('video');
                                if (video) data.url = video.src;
                                
                                // Metadata extraction
                                const pageTitle = document.title;
                                if (pageTitle && pageTitle !== 'Douyin') {
                                    data.title = pageTitle.split('-')[0].split('|')[0].trim();
                                }
                                
                                // Try to find thumbnail
                                const poster = video ? video.poster : null;
                                const metaImage = document.querySelector('meta[property="og:image"]');
                                const twitterImage = document.querySelector('meta[name="twitter:image"]');
                                const linkImage = document.querySelector('link[rel="image_src"]');
                                
                                if (poster) {
                                    data.thumbnail = poster;
                                } else if (metaImage) {
                                    data.thumbnail = metaImage.content;
                                } else if (twitterImage) {
                                    data.thumbnail = twitterImage.content;
                                } else if (linkImage) {
                                    data.thumbnail = linkImage.href;
                                }

                                const metaDesc = document.querySelector('meta[name="description"]');
                                if (metaDesc && metaDesc.content && !data.title) {
                                    data.title = metaDesc.content.substring(0, 100);
                                }
                                
                                // Try multiple selectors for author/uploader
                                let author = null;
                                const authorSelectors = [
                                    '[data-e2e="user-title"]',
                                    '[class*="author"]',
                                    '[class*="user"]',
                                    '[class*="nickname"]',
                                    'h2',
                                    'h3'
                                ];
                                
                                for (const selector of authorSelectors) {
                                    author = document.querySelector(selector);
                                    if (author && author.textContent && author.textContent.trim()) {
                                        data.uploader = author.textContent.trim();
                                        break;
                                    }
                                }
                                
                                // Fallback: Search in HTML for encoded URL if not found in video src
                                if (!data.url || data.url.startsWith('blob:')) {
                                    const html = document.documentElement.outerHTML;
                                    const match = html.match(/src%22%3A%22(https%3A%2F%2F[^%"]*?video[^%"]*?)%22/);
                                    if (match && match[1]) {
                                        data.fallbackUrl = decodeURIComponent(match[1]);
                                    } else {
                                        const match2 = html.match(/"src":"(https:\\/\\/[^"]*?video[^"]*?)"/);
                                        if (match2 && match2[1]) {
                                            data.fallbackUrl = match2[1].replace(/\\\\u0026/g, '&');
                                        }
                                    }
                                }
                                return data;
                            } catch (e) { return { error: e.message }; }
                        })()
                    `);

                    // Determine final URL
                    let finalUrl = detectedVideoUrl;

                    // If network intercept failed, try DOM/Fallback
                    if (!finalUrl) {
                        if (result && result.url && !result.url.startsWith('blob:')) {
                            finalUrl = result.url;
                        } else if (result && result.fallbackUrl) {
                            finalUrl = result.fallbackUrl;
                            console.log('Using fallback URL from HTML regex:', finalUrl);
                        }
                    }

                    if (finalUrl) {
                        if (finalUrl.includes('playwm')) finalUrl = finalUrl.replace('playwm', 'play');
                        if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;

                        const cookies = await win.webContents.session.cookies.get({ url: finalUrl });
                        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

                        console.log('[Douyin] Successfully extracted video info');
                        console.log('[Douyin] Title:', result.title || 'Douyin Video');
                        console.log('[Douyin] Uploader:', result.uploader || 'Unknown');

                        resolve({
                            title: result.title || 'Douyin Video',
                            thumbnail: result.thumbnail,
                            uploader: result.uploader || 'Unknown',
                            duration_string: 'N/A',
                            url: finalUrl,
                            webpage_url: url,
                            ext: 'mp4',
                            extractor: 'douyin_native',
                            headers: {
                                'User-Agent': mobileUA,
                                'Cookie': cookieString,
                                'Referer': 'https://www.douyin.com/'
                            }
                        });
                    } else {
                        if (timeoutReached) {
                            reject(new Error('Timeout: Could not extract video URL within 20 seconds'));
                        } else {
                            reject(new Error('Could not find video URL'));
                        }
                    }
                } catch (e) {
                    reject(e);
                } finally {
                    clearTimeout(timeout);
                    if (!win.isDestroyed()) win.destroy();
                }
            });

            win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
                if (errorCode === -3) return;
                clearTimeout(timeout);
                if (!win.isDestroyed()) win.destroy();
                reject(new Error(`Failed to load: ${errorDescription}`));
            });
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

    async getVideoInfo(url) {
        if (url.includes('douyin.com')) {
            try {
                return await this.extractDouyinNative(url);
            } catch (e) {
                console.error('Native extraction failed, falling back to yt-dlp:', e);
                // Fallback to yt-dlp if native extraction fails
            }
        }

        return new Promise((resolve, reject) => {
            const args = [
                '--dump-json',
                '--no-playlist',
                // Force progressive MP4 format to ensure compatibility with standard HTML5 video player
                // Avoids m3u8/HLS streams which cause black screens in simple proxy setup
                '-f', 'best[ext=mp4][protocol^=http]/best[ext=mp4]/best',
                url
            ];

            const child = spawn(this.binPath, args);
            let output = '';
            let error = '';

            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.stderr.on('data', (data) => {
                error += data.toString();
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

                        resolve({
                            id: info.id, // Extract ID for embeds
                            title: info.title,
                            thumbnail: info.thumbnail,
                            uploader: info.uploader,
                            duration_string: info.duration_string,
                            url: videoUrl,
                            webpage_url: info.webpage_url,
                            ext: info.ext,
                            extractor: info.extractor,
                            headers: info.http_headers // Capture headers from yt-dlp
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

        const args = [
            url,
            '--format', 'best',
            '--output', outputPath,
            '--no-playlist',
            '--no-check-certificate' // Bypass SSL certificate verification issues
        ];

        // Add headers if provided in options
        if (options.headers) {
            if (options.headers['User-Agent']) {
                args.push('--user-agent', options.headers['User-Agent']);
            }
            if (options.headers['Referer']) {
                args.push('--referer', options.headers['Referer']);
            }
            if (options.headers['Cookie']) {
                args.push('--add-header', `Cookie:${options.headers['Cookie']}`);
            }
        }

        // Use FFmpeg for true audio extraction
        if (options.audioOnly) {
            args.push('--extract-audio', '--audio-format', 'mp3');
            // yt-dlp automatically updates the extension to .mp3 when extracting audio
        }

        const child = spawn(this.binPath, args);
        child._outputPath = null;

        // Store the process
        this.activeDownloads.set(id, { process: child, outputPath: null });

        child.stdout.on('data', (data) => {
            const str = data.toString();
            console.log(`[yt-dlp ${id}]`, str); // Log all output for debugging

            // Match progress percentage - handle formats like "8.4%" or " 8.4%"
            const match = str.match(/\s*(\d+\.?\d*)%/);
            if (match) {
                const progress = parseFloat(match[1]);
                console.log(`[yt-dlp ${id}] Progress:`, progress + '%');
                onProgress(progress);
            }

            // Capture destination
            const destMatch = str.match(/\[download\] Destination: (.+)/);
            if (destMatch) {
                const dest = destMatch[1].trim();
                child._outputPath = dest;
                // Update stored output path
                const active = this.activeDownloads.get(id);
                if (active) active.outputPath = dest;
            }

            // Capture extraction destination
            const extractMatch = str.match(/\[ExtractAudio\] Destination: (.+)/);
            if (extractMatch) {
                const dest = extractMatch[1].trim();
                child._outputPath = dest;
                // Update stored output path
                const active = this.activeDownloads.get(id);
                if (active) active.outputPath = dest;
            }

            const alreadyMatch = str.match(/\[download\] (.+) has already been downloaded/);
            if (alreadyMatch) {
                const dest = alreadyMatch[1].trim();
                child._outputPath = dest;
                // Update stored output path
                const active = this.activeDownloads.get(id);
                if (active) active.outputPath = dest;
            }
        });

        child.stderr.on('data', (data) => {
            console.error(`[yt-dlp ${id} ERROR]`, data.toString());
        });

        child.on('close', () => {
            // Remove from active downloads when finished (or killed)
            // We don't remove immediately on kill to allow 'cancel' to access outputPath if needed, 
            // but for simple close we should clean up.
            // Actually, let's let the caller handle cleanup or do it here if it wasn't manual.
            // For now, we'll just leave it, but ideally we should clean up.
            // Let's rely on the 'cancel' method to explicitly remove, or remove here if it's done.
            if (this.activeDownloads.has(id)) {
                // Check if it was killed manually? 
                // If it finished naturally, we remove it.
                // If it was killed by pause/cancel, those methods might have already removed it or need to.
                // To be safe, we can remove it here.
                this.activeDownloads.delete(id);
            }
        });

        return child;
    }

    pauseDownload(id) {
        const active = this.activeDownloads.get(id);
        if (active && active.process) {
            console.log(`[YtDlpService] Pausing download ${id}`);
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
            this.activeDownloads.delete(id); // Remove from active map
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
                output += data.toString();
            });

            child.stderr.on('data', (data) => {
                error += data.toString();
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
            const str = data.toString();
            console.log('[yt-dlp subtitle]', str);

            // Check for completion messages
            if (str.includes('Writing video subtitles')) {
                onProgress(50);
            }
        });

        child.stderr.on('data', (data) => {
            console.error('[yt-dlp subtitle ERROR]', data.toString());
        });

        return child;
    }
}

export default new YtDlpService();
