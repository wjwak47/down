import fs from 'fs';
import path from 'path';
import https from 'https';
import FormData from 'form-data';
import { spawn } from 'child_process';
import os from 'os';
import { getAudioDuration, extractAudioSegment, mergeAudioFiles } from '../utils/ffmpeg-helper.js';
import { needsFormatConversion, convertToMP3 } from './groq-whisper-helpers.js';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MAX_FILE_SIZE_MB = 24; // Groq limit is 25MB, use 24 to be safe
const KEY_COOLDOWN_MS = 60000; // 60 seconds cooldown for rate-limited keys

class GroqWhisperService {
    constructor() {
        this.apiKey = null;
        this.ffmpegPath = null;
        // Key pool: Array of { key: string, status: 'available' | 'cooling', cooldownUntil: number }
        this.keyPool = [];
        this.currentKeyIndex = 0;
        this.mainWindow = null;  // Reference to main window for broadcasting events
    }

    /**
     * Set main window for event broadcasting
     */
    setMainWindow(window) {
        this.mainWindow = window;
    }

    /**
     * Broadcast key status update to frontend
     */
    broadcastKeyStatus(key, status, cooldownUntil = null) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('groq:key-status-update', {
                key: key.slice(0, 8) + '...', // Send masked key for privacy
                status,
                cooldownUntil
            });
        }
    }

    /**
     * Initialize with single API key (legacy)
     */
    initialize(apiKey) {
        if (!apiKey) {
            throw new Error('Groq API key is required');
        }
        this.apiKey = apiKey;
        this.keyPool = [{ key: apiKey, status: 'available', cooldownUntil: 0 }];
    }

    /**
     * Initialize with key pool
     */
    initializeWithKeyPool(apiKeys) {
        if (!apiKeys || apiKeys.length === 0) {
            throw new Error('At least one Groq API key is required');
        }
        this.keyPool = apiKeys.map(key => ({
            key: key,
            status: 'available',
            cooldownUntil: 0
        }));
        this.apiKey = this.keyPool[0].key;
        console.log(`[Groq Whisper] Initialized with ${this.keyPool.length} API keys`);
    }

    /**
     * Update key pool (hot-add keys during transcription)
     */
    updateKeyPool(apiKeys) {
        if (!apiKeys || apiKeys.length === 0) {
            console.warn('[Groq Whisper] No keys provided for update');
            return;
        }

        // Find new keys that aren't in the pool yet
        const newKeys = apiKeys.filter(newKey =>
            !this.keyPool.some(existing => existing.key === newKey)
        );

        // Add new keys to pool
        newKeys.forEach(key => {
            this.keyPool.push({
                key: key,
                status: 'available',
                cooldownUntil: 0
            });
            console.log(`[Groq Whisper] ✨ Hot-added key: ${key.slice(0, 8)}...`);

            // Broadcast to frontend
            this.broadcastKeyStatus(key, 'available');
        });

        if (newKeys.length > 0) {
            console.log(`[Groq Whisper] Key pool updated: ${this.keyPool.length} total keys`);
        } else {
            console.log(`[Groq Whisper] No new keys to add`);
        }
    }

    /**
     * Get next available key from pool
     */
    getAvailableKey() {
        const now = Date.now();

        // First, check if any cooling keys have recovered
        for (const keyItem of this.keyPool) {
            if (keyItem.status === 'cooling' && now >= keyItem.cooldownUntil) {
                keyItem.status = 'available';
                console.log(`[Groq Whisper] Key ${keyItem.key.slice(0, 8)}... recovered from cooldown`);
                // Broadcast recovery
                this.broadcastKeyStatus(keyItem.key, 'available');
            }
        }

        // Find an available key
        for (const keyItem of this.keyPool) {
            if (keyItem.status === 'available') {
                return keyItem.key;
            }
        }

        // All keys are cooling, find the one that will be available soonest
        const soonestKey = this.keyPool.reduce((prev, curr) =>
            prev.cooldownUntil < curr.cooldownUntil ? prev : curr
        );
        const waitTime = soonestKey.cooldownUntil - now;
        console.log(`[Groq Whisper] All keys cooling, waiting ${Math.ceil(waitTime / 1000)}s...`);

        return null; // Caller should wait
    }

    /**
     * Mark a key as cooling (rate limited)
     */
    markKeyCooling(apiKey) {
        const keyItem = this.keyPool.find(k => k.key === apiKey);
        if (keyItem) {
            keyItem.status = 'cooling';
            keyItem.cooldownUntil = Date.now() + KEY_COOLDOWN_MS;
            console.log(`[Groq Whisper] Key ${apiKey.slice(0, 8)}... marked as cooling for 60s`);
            // Broadcast cooling status
            this.broadcastKeyStatus(apiKey, 'cooling', keyItem.cooldownUntil);
        }
    }

    /**
     * Set FFmpeg path
     */
    setFfmpegPath(ffmpegPath) {
        this.ffmpegPath = ffmpegPath;
    }

    /**
     * Transcribe audio file using Groq Whisper API
     * Automatically handles chunking for large files
     */
    async transcribe(audioPath, options = {}, onProgress) {
        const {
            language = 'zh',
            model = 'whisper-large-v3',
            manualDuration = null  // Extract manual duration from options
        } = options;

        if (!this.apiKey) {
            throw new Error('Service not initialized. Call initialize() first.');
        }

        if (!fs.existsSync(audioPath)) {
            throw new Error(`Audio file not found: ${audioPath}`);
        }

        const stats = fs.statSync(audioPath);
        const fileSizeMB = stats.size / (1024 * 1024);

        console.log('[Groq Whisper] File size:', fileSizeMB.toFixed(2), 'MB');

        // Check if format needs conversion for better compatibility
        const needsConv = needsFormatConversion(audioPath);
        let fileToTranscribe = audioPath;
        let tempConvertedFile = null;

        if (needsConv) {
            console.log('[Groq Whisper] Format needs conversion for optimal transcription');
            onProgress?.({ stage: 'converting', message: 'Converting audio format...' });

            tempConvertedFile = await convertToMP3(audioPath, this.ffmpegPath);
            fileToTranscribe = tempConvertedFile;
            console.log('[Groq Whisper] Temporary MP3 created:', tempConvertedFile);
        }

        try {
            // If file is under limit, transcribe directly
            if (fileSizeMB <= MAX_FILE_SIZE_MB) {
                const result = await this.transcribeSingleFile(fileToTranscribe, { language, model }, onProgress);
                return result;
            }

            // For large files, split and transcribe in chunks
            console.log('[Groq Whisper] File exceeds limit, will split into chunks');
            console.log('[Groq Whisper] ⏱️ Manual Duration Parameter:', manualDuration, 'seconds');
            onProgress?.({ stage: 'splitting', message: 'Splitting audio into chunks...' });

            const chunks = await this.splitAudioIntoChunks(fileToTranscribe, onProgress, manualDuration);
            const allSegments = [];

            console.log(`[Groq Whisper] Split into ${chunks.length} chunks`);

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                onProgress?.({
                    stage: 'transcribing',
                    message: `Transcribing chunk ${i + 1}/${chunks.length}...`,
                    percent: Math.round((i / chunks.length) * 100)
                });

                // 🔥 NEVER-GIVE-UP MODE: Infinite retry until success!
                let success = false;
                let attemptCount = 0; // Track attempts for logging

                while (!success) {
                    // Get available key
                    let currentKey = this.getAvailableKey();

                    attemptCount++; // Increment at start of each attempt

                    // If no key available, wait for shortest cooldown  
                    if (!currentKey) {
                        const soonestKey = this.keyPool.reduce((prev, curr) =>
                            prev.cooldownUntil < curr.cooldownUntil ? prev : curr
                        );
                        const waitTime = Math.max(1000, soonestKey.cooldownUntil - Date.now());

                        console.log(`[Groq Whisper] ⏸ Chunk ${i + 1}/${chunks.length}: All keys cooling, waiting ${Math.ceil(waitTime / 1000)}s (attempt #${attemptCount})`);
                        onProgress?.({
                            stage: 'waiting',
                            message: `⏸ All keys cooling, waiting ${Math.ceil(waitTime / 1000)}s... (chunk ${i + 1}/${chunks.length}, attempt #${attemptCount})`
                        });

                        await new Promise(resolve => setTimeout(resolve, waitTime + 1000));
                        continue; // Try again after waiting
                    }

                    try {
                        // Use the selected key for this request
                        this.apiKey = currentKey;
                        const result = await this.transcribeSingleFile(chunk.path, { language, model }, null);

                        if (result.success && result.segments && result.segments.length > 0) {
                            const adjustedSegments = result.segments.map(seg => ({
                                ...seg,
                                start: seg.start + chunk.startTime,
                                end: seg.end + chunk.startTime
                            }));
                            allSegments.push(...adjustedSegments);
                            console.log(`[Groq Whisper] ✅ Chunk ${i + 1}/${chunks.length} SUCCESS after ${attemptCount} attempt(s): ${adjustedSegments.length} segments`);
                        } else if (result.success && result.text) {
                            allSegments.push({
                                start: chunk.startTime,
                                end: chunk.endTime,
                                text: result.text
                            });
                            console.log(`[Groq Whisper] ✅ Chunk ${i + 1}/${chunks.length} SUCCESS after ${attemptCount} attempt(s): text only`);
                        }
                        success = true;
                    } catch (error) {
                        const isRateLimit = error.message?.includes('rate_limit') || error.message?.includes('429');

                        if (isRateLimit) {
                            // Mark current key as cooling and switch immediately
                            this.markKeyCooling(currentKey);
                            console.log(`[Groq Whisper] 🔄 Chunk ${i + 1}/${chunks.length}: Rate limit, switching key (attempt #${attemptCount})`);

                            onProgress?.({
                                stage: 'retrying',
                                message: `🔄 Retrying chunk ${i + 1}/${chunks.length} (attempt #${attemptCount})...`
                            });

                            // No wait - immediately try next key
                        } else {
                            // For other errors, brief wait then retry
                            console.log(`[Groq Whisper] ⚠ Chunk ${i + 1}/${chunks.length}: Error on attempt #${attemptCount}, retrying:`, error.message);
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                }

                if (!success) {
                    console.error(`[Groq Whisper] Failed chunk ${i + 1} after all attempts`);
                    console.error(`[Groq Whisper] Missing chunk time range: ${chunk.startTime}s - ${chunk.endTime}s`);
                    // Add a placeholder segment for failed chunks to maintain timeline
                    allSegments.push({
                        start: chunk.startTime,
                        end: chunk.endTime,
                        text: `[转写失败 chunk ${i + 1}]`
                    });
                }

                // Clean up chunk file
                try {
                    fs.unlinkSync(chunk.path);
                } catch (e) { }

                // Small delay between chunks (1 second with key pool)
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            console.log(`[Groq Whisper] Completed ${allSegments.length} segments from ${chunks.length} chunks`);

            onProgress?.({ stage: 'processing', message: 'Generating subtitles...' });

            // Generate final output
            const srt = this.generateSrt(allSegments);
            const plainText = this.generatePlainText(allSegments);
            const fullText = allSegments.map(s => s.text).join(' ');

            onProgress?.({ stage: 'complete', message: 'Transcription complete' });

            return {
                success: true,
                text: fullText,
                srt: srt,
                plainText: plainText,
                segments: allSegments,
                duration: chunks.length > 0 ? chunks[chunks.length - 1].endTime : 0
            };
        } finally {
            // Cleanup temporary converted file if created
            if (tempConvertedFile && fs.existsSync(tempConvertedFile)) {
                try {
                    fs.unlinkSync(tempConvertedFile);
                    console.log('[Groq Whisper] Cleaned up temporary file:', tempConvertedFile);
                } catch (err) {
                    console.error('[Groq Whisper] Failed to delete temp file:', err);
                }
            }
        }
    }

    /**
     * Split audio into chunks using FFmpeg
     */
    async splitAudioIntoChunks(audioPath, onProgress, manualDuration = null) {
        const chunkDurationSeconds = 300; // 5 minutes per chunk
        const tempDir = os.tmpdir();
        const chunks = [];

        let duration;

        if (manualDuration) {
            // Use manually provided duration (from frontend)
            console.log('[Groq Whisper] ═══ USING MANUAL DURATION ═══');
            console.log(`[Groq Whisper] Manual duration: ${manualDuration}s`);
            duration = manualDuration;
        } else {
            // Auto-detect duration from file
            console.log('[Groq Whisper] ═══ READING AUDIO FILE ═══');
            console.log(`[Groq Whisper] Audio path: ${audioPath}`);
            console.log('[Groq Whisper] Waiting for file system sync...');
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Get audio duration with retry to ensure correct value
            duration = await this.getAudioDuration(audioPath);
            console.log('[Groq Whisper] Audio duration (1st read):', duration, 'seconds');

            // Verify with second read
            await new Promise(resolve => setTimeout(resolve, 1000));
            const duration2 = await this.getAudioDuration(audioPath);
            console.log('[Groq Whisper] Audio duration (2nd read):', duration2, 'seconds');

            // Use the larger value (in case first read was cached)
            duration = Math.max(duration, duration2);
        }

        const numChunks = Math.ceil(duration / chunkDurationSeconds);
        console.log(`[Groq Whisper] Will split into ${numChunks} chunks (duration: ${duration}s / ${chunkDurationSeconds}s)`);
        console.log(`[Groq Whisper] Expected coverage: ${numChunks * chunkDurationSeconds}s, actual: ${duration}s`);

        for (let i = 0; i < numChunks; i++) {
            const startTime = i * chunkDurationSeconds;
            const endTime = Math.min(startTime + chunkDurationSeconds, duration);
            const actualDuration = endTime - startTime; // Use actual remaining duration
            const chunkPath = path.join(tempDir, `groq_chunk_${Date.now()}_${i}.mp3`);

            onProgress?.({
                stage: 'splitting',
                message: `Creating chunk ${i + 1}/${numChunks}...`
            });

            console.log(`[Groq Whisper] Chunk ${i + 1}: ${startTime}s - ${endTime}s (duration: ${actualDuration}s)`);

            await this.extractChunk(audioPath, chunkPath, startTime, actualDuration);

            chunks.push({
                path: chunkPath,
                startTime: startTime,
                endTime: endTime
            });
        }

        // Verify all chunks were created
        console.log(`[Groq Whisper] ✓ Created ${chunks.length} chunks (expected: ${numChunks})`);
        if (chunks.length < numChunks) {
            console.error(`[Groq Whisper] ❌ ERROR: Missing ${numChunks - chunks.length} chunks!`);
        }

        // Verify coverage
        const lastChunkEnd = chunks[chunks.length - 1].endTime;
        const coverage = (lastChunkEnd / duration * 100).toFixed(2);
        console.log(`[Groq Whisper] Coverage: ${lastChunkEnd}/${duration}s (${coverage}%)`);

        if (lastChunkEnd < duration - 1) {
            console.warn(`[Groq Whisper] WARNING: Missing ${duration - lastChunkEnd}s at the end!`);
        }

        return chunks;
    }

    /**
     * Get audio duration using FFmpeg
     */
    getAudioDuration(audioPath) {
        return new Promise((resolve, reject) => {
            const ffprobe = this.ffmpegPath ?
                path.join(path.dirname(this.ffmpegPath), 'ffprobe') : 'ffprobe';

            const args = [
                '-v', 'error',
                '-count_packets',  // Force counting frames instead of reading metadata
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1',
                audioPath
            ];

            const proc = spawn(ffprobe, args);
            let output = '';

            proc.stdout.on('data', (data) => {
                output += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve(parseFloat(output.trim()) || 0);
                } else {
                    // Fallback: estimate based on file size (rough: 1MB ≈ 60 seconds for MP3)
                    const stats = fs.statSync(audioPath);
                    resolve((stats.size / (1024 * 1024)) * 60);
                }
            });

            proc.on('error', () => {
                // Fallback estimation
                const stats = fs.statSync(audioPath);
                resolve((stats.size / (1024 * 1024)) * 60);
            });
        });
    }

    /**
     * Extract a chunk of audio using FFmpeg
     */
    extractChunk(inputPath, outputPath, startTime, duration) {
        return new Promise((resolve, reject) => {
            const ffmpeg = this.ffmpegPath || 'ffmpeg';

            const args = [
                '-y',
                '-ss', String(startTime),
                '-t', String(duration),
                '-i', inputPath,
                '-acodec', 'libmp3lame',
                '-ar', '16000',
                '-ac', '1',
                '-b:a', '64k',
                outputPath
            ];

            const proc = spawn(ffmpeg, args);

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg exited with code ${code}`));
                }
            });

            proc.on('error', reject);
        });
    }

    /**
     * Transcribe a single audio file (must be under 25MB)
     */
    async transcribeSingleFile(audioPath, options, onProgress) {
        const { language, model } = options;

        const stats = fs.statSync(audioPath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log('[Groq Whisper] Transcribing:', audioPath, 'size:', fileSizeMB, 'MB');
        onProgress?.({ stage: 'uploading', message: `Uploading (${fileSizeMB}MB)...` });

        const formData = new FormData();
        formData.append('file', fs.createReadStream(audioPath), {
            filename: path.basename(audioPath),
            contentType: this.getMimeType(audioPath)
        });
        formData.append('model', model);
        formData.append('response_format', 'verbose_json');
        formData.append('timestamp_granularities[]', 'segment');
        if (language && language !== 'auto') {
            formData.append('language', language);
        }

        onProgress?.({ stage: 'transcribing', message: 'Processing...' });

        const result = await this.makeRequest(formData);

        console.log('[Groq Whisper] Got segments:', result.segments?.length);

        return {
            success: true,
            text: result.text,
            segments: result.segments,
            words: result.words,
            language: result.language,
            duration: result.duration
        };
    }

    /**
     * Make HTTP request with form data
     */
    makeRequest(formData) {
        return new Promise((resolve, reject) => {
            const url = new URL(GROQ_API_URL);

            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    ...formData.getHeaders()
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error(`Failed to parse response: ${data}`));
                        }
                    } else {
                        reject(new Error(`Groq API error: ${res.statusCode} - ${data}`));
                    }
                });
            });

            req.on('error', reject);
            formData.pipe(req);
        });
    }

    /**
     * Get MIME type from file extension
     */
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            '.aac': 'audio/aac',
            '.ogg': 'audio/ogg',
            '.flac': 'audio/flac',
            '.webm': 'audio/webm'
        };
        return mimeTypes[ext] || 'audio/mpeg';
    }

    /**
     * Generate SRT format from segments
     * Standard SRT format:
     * 1
     * 00:00:00,000 --> 00:00:02,000
     * Subtitle text
     *
     * 2
     * ...
     */
    smartSplitSegments(segments) {
        const MAX_CHARS = 20; // 最大字符数
        const MAX_DURATION = 5; // 最大时长（秒）
        const result = [];

        for (const segment of segments) {
            const text = (segment.text || '').trim();
            const duration = segment.end - segment.start;
            const charCount = text.length;

            // 如果字幕不长，直接保留
            if (charCount <= MAX_CHARS && duration <= MAX_DURATION) {
                result.push(segment);
                continue;
            }

            // 需要切分：按标点符号分割
            const sentences = this.splitByPunctuation(text);

            if (sentences.length === 1) {
                // 没有标点，按字符数强制切分
                const parts = this.splitByCharCount(text, MAX_CHARS);
                const timePerPart = duration / parts.length;

                parts.forEach((part, index) => {
                    result.push({
                        start: segment.start + (timePerPart * index),
                        end: segment.start + (timePerPart * (index + 1)),
                        text: part
                    });
                });
            } else {
                // 有标点，按句子分配时间
                const totalChars = text.length;
                let currentTime = segment.start;

                sentences.forEach((sentence, index) => {
                    const sentenceChars = sentence.length;
                    const timeRatio = sentenceChars / totalChars;
                    const sentenceDuration = duration * timeRatio;

                    result.push({
                        start: currentTime,
                        end: currentTime + sentenceDuration,
                        text: sentence
                    });

                    currentTime += sentenceDuration;
                });
            }
        }

        return result;
    }

    /**
     * 按标点符号切分文本
     */
    splitByPunctuation(text) {
        // 中文和英文标点符号
        const punctuation = /([。！？，、；：,.!?;:])/g;
        const parts = text.split(punctuation).filter(p => p.trim());

        const sentences = [];
        let current = '';

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];

            if (punctuation.test(part)) {
                // 是标点符号，添加到当前句子
                current += part;
                if (/[。！？.!?]/.test(part)) {
                    // 句末标点，完成一个句子
                    if (current.trim()) {
                        sentences.push(current.trim());
                    }
                    current = '';
                }
            } else {
                current += part;
            }
        }

        // 添加剩余部分
        if (current.trim()) {
            sentences.push(current.trim());
        }

        return sentences.length > 0 ? sentences : [text];
    }

    /**
     * 按字符数强制切分
     */
    splitByCharCount(text, maxChars) {
        const parts = [];
        for (let i = 0; i < text.length; i += maxChars) {
            parts.push(text.slice(i, i + maxChars));
        }
        return parts;
    }

    /**
     * Generate SRT subtitle file
     * Format:
     * 1
     * 00:00:00,000 --> 00:00:05,000
     * Subtitle text
     *
     * 2
     * ...
     */
    generateSrt(segments) {
        if (!segments || segments.length === 0) return '';

        // 智能切分长字幕
        const optimizedSegments = this.smartSplitSegments(segments);

        // Add UTF-8 BOM for better compatibility with video editors
        const BOM = '\uFEFF';

        const srtLines = optimizedSegments.map((segment, index) => {
            const startTime = this.formatSrtTime(segment.start);
            const endTime = this.formatSrtTime(segment.end);
            const text = (segment.text || '').trim();

            // Standard SRT format: number, timestamp line, text, blank line
            return `${index + 1}\n${startTime} --> ${endTime}\n${text}`;
        });

        return BOM + srtLines.join('\n\n') + '\n';
    }

    /**
     * Generate plain text from segments
     */
    generatePlainText(segments) {
        if (!segments || segments.length === 0) return '';
        return segments.map(segment => segment.text.trim()).join('\n');
    }

    /**
     * Format time in SRT format
     */
    formatSrtTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.round((seconds % 1) * 1000);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    }

    /**
     * Test API connection
     */
    async testConnection(apiKey) {
        return new Promise((resolve) => {
            const req = https.request({
                hostname: 'api.groq.com',
                port: 443,
                path: '/openai/v1/models',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${apiKey}` }
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            const jsonData = JSON.parse(data);
                            const hasWhisper = jsonData.data?.some(m => m.id.includes('whisper'));
                            resolve({ success: true, message: hasWhisper ? '✓ Connected! Whisper available.' : '✓ Connected!' });
                        } catch (e) {
                            resolve({ success: false, message: 'Failed to parse response' });
                        }
                    } else {
                        resolve({ success: false, message: `API error: ${res.statusCode}` });
                    }
                });
            });
            req.on('error', (error) => resolve({ success: false, message: error.message }));
            req.end();
        });
    }

    /**
     * Convert time string to seconds
     */
    timeToSeconds(hours, minutes, seconds, milliseconds) {
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 1000;
    }

    /**
     * Parse SRT content to extract segments with timestamps
     */
    parseSRT(srtContent) {
        const segments = [];
        const lines = srtContent.split('\n');
        let currentSegment = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Match timestamp line: 00:00:00,000 --> 00:00:05,000
            const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
            if (timeMatch) {
                currentSegment = {
                    start: this.timeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]),
                    end: this.timeToSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8])
                };
                segments.push(currentSegment);
            }
        }

        return segments.sort((a, b) => a.start - b.start);
    }

    /**
     * Detect gaps in SRT coverage
     */
    detectGaps(srtContent, totalDuration) {
        const segments = this.parseSRT(srtContent);
        const gaps = [];
        const MIN_GAP_SECONDS = 10; // Only consider gaps >= 10 seconds

        if (segments.length === 0) {
            // Entire file is a gap
            return [{
                start: 0,
                end: totalDuration,
                duration: totalDuration
            }];
        }

        // Check beginning gap
        if (segments[0].start > MIN_GAP_SECONDS) {
            gaps.push({
                start: 0,
                end: segments[0].start,
                duration: segments[0].start
            });
        }

        // Check gaps between segments
        for (let i = 0; i < segments.length - 1; i++) {
            const gapSize = segments[i + 1].start - segments[i].end;
            if (gapSize > MIN_GAP_SECONDS) {
                gaps.push({
                    start: segments[i].end,
                    end: segments[i + 1].start,
                    duration: gapSize
                });
            }
        }

        // Check ending gap
        const lastEnd = segments[segments.length - 1].end;
        if (totalDuration - lastEnd > MIN_GAP_SECONDS) {
            gaps.push({
                start: lastEnd,
                end: totalDuration,
                duration: totalDuration - lastEnd
            });
        }

        console.log(`[Groq Whisper] Detected ${gaps.length} gaps in transcription`);
        return gaps;
    }

    /**
     * Transcribe a specific gap
     */
    async transcribeGap(audioPath, gap, options, onProgress) {
        console.log(`[Groq Whisper] Transcribing gap: ${gap.start}s - ${gap.end}s (${gap.duration}s)`);

        // Extract gap audio segment
        const tempDir = os.tmpdir();
        const gapAudioPath = path.join(tempDir, `groq_gap_${Date.now()}.mp3`);

        try {
            await this.extractChunk(audioPath, gapAudioPath, gap.start, gap.duration);

            // Transcribe gap (single file, aggressive retries)
            const result = await this.transcribeSingleFile(gapAudioPath, options, onProgress);

            // Adjust timestamps to absolute position
            if (result.success && result.segments) {
                result.segments = result.segments.map(seg => ({
                    ...seg,
                    start: seg.start + gap.start,
                    end: seg.end + gap.start
                }));
            }

            // Clean up temp file
            try {
                fs.unlinkSync(gapAudioPath);
            } catch (e) {
                console.warn('[Groq Whisper] Failed to cleanup gap audio:', e.message);
            }

            return result;
        } catch (error) {
            console.error(`[Groq Whisper] Failed to transcribe gap:`, error.message);
            throw error;
        }
    }
}

export default new GroqWhisperService();
