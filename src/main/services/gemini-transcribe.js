import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';

// Supported models with display names
const MODELS = {
    'gemini-3-pro-preview': 'Gemini 3 Pro (Latest)',
    'gemini-3-flash-preview': 'Gemini 3 Flash (Latest)',
    'gemini-2.5-pro-preview-06-05': 'Gemini 2.5 Pro',
    'gemini-2.5-flash-preview-05-20': 'Gemini 2.5 Flash',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite'
};

class GeminiTranscribeService {
    constructor() {
        this.genAI = null;
        this.fileManager = null;
        this.currentAbortController = null;
    }

    /**
     * Initialize the service with API key
     */
    initialize(apiKey) {
        if (!apiKey) {
            throw new Error('API key is required');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.fileManager = new GoogleAIFileManager(apiKey);
    }

    /**
     * Get available models
     */
    getModels() {
        return MODELS;
    }

    /**
     * Test API connection
     */
    async testConnection(apiKey, modelId = 'gemini-2.0-flash') {
        try {
            const testAI = new GoogleGenerativeAI(apiKey);
            const model = testAI.getGenerativeModel({ model: modelId });
            const result = await model.generateContent('Say "OK" if you can hear me.');
            const response = await result.response;
            return { success: true, message: response.text() };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Upload audio file to Gemini File API with timeout
     */
    async uploadAudioFile(audioPath, onProgress) {
        if (!this.fileManager) {
            throw new Error('Service not initialized. Call initialize() first.');
        }

        const fileName = path.basename(audioPath);
        const mimeType = this.getMimeType(audioPath);

        // Get file size for progress display
        const stats = fs.statSync(audioPath);
        const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        console.log('[Transcribe] Starting upload:', audioPath, 'mimeType:', mimeType, 'size:', fileSizeMB, 'MB');
        onProgress?.({ stage: 'uploading', message: `Uploading audio (${fileSizeMB}MB)...` });

        try {
            // Create upload promise with timeout (5 minutes for large files)
            const uploadPromise = this.fileManager.uploadFile(audioPath, {
                mimeType: mimeType,
                displayName: fileName
            });

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Upload timeout - please check your network connection or try a smaller file')), 5 * 60 * 1000);
            });

            const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
            console.log('[Transcribe] Upload complete, file state:', uploadResult.file.state);

            // Wait for file to be processed
            let file = uploadResult.file;
            let waitCount = 0;
            const maxWait = 60; // Max 2 minutes for processing

            while (file.state === 'PROCESSING') {
                waitCount++;
                if (waitCount > maxWait) {
                    throw new Error('File processing timeout');
                }
                console.log('[Transcribe] File still processing...', waitCount);
                onProgress?.({ stage: 'processing', message: `Processing audio file... (${waitCount * 2}s)` });
                await new Promise(resolve => setTimeout(resolve, 2000));
                file = await this.fileManager.getFile(file.name);
            }

            if (file.state === 'FAILED') {
                console.error('[Transcribe] File processing failed');
                throw new Error('Audio file processing failed');
            }

            console.log('[Transcribe] File ready:', file.uri);
            onProgress?.({ stage: 'ready', message: 'Audio file ready' });
            return file;
        } catch (error) {
            console.error('[Transcribe] Upload error:', error);
            throw error;
        }
    }

    /**
     * Transcribe audio using Gemini with streaming support
     */
    async transcribe(audioPath, options = {}, onProgress, onChunk) {
        const {
            modelId = 'gemini-2.5-flash-preview-05-20',
            maxCharsPerLine = 25,
            language = 'zh-CN',
            outputFormat = 'srt' // 'srt' or 'txt'
        } = options;

        if (!this.genAI) {
            throw new Error('Service not initialized. Call initialize() first.');
        }

        this.currentAbortController = new AbortController();

        try {
            // Upload audio file
            const audioFile = await this.uploadAudioFile(audioPath, onProgress);

            onProgress?.({ stage: 'transcribing', message: 'AI is transcribing...' });

            // Get the model
            const model = this.genAI.getGenerativeModel({ model: modelId });

            // Build the prompt based on format
            const prompt = outputFormat === 'srt'
                ? this.buildSrtPrompt(maxCharsPerLine, language)
                : this.buildPrompt(maxCharsPerLine, language);

            console.log('[Transcribe] Starting streaming transcription with model:', modelId);

            // Generate transcription with streaming
            const result = await model.generateContentStream([
                {
                    fileData: {
                        mimeType: audioFile.mimeType,
                        fileUri: audioFile.uri
                    }
                },
                { text: prompt }
            ]);

            // Collect streaming response
            let fullText = '';
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullText += chunkText;
                // Send chunk to frontend for real-time display
                onChunk?.(chunkText, fullText);
            }

            onProgress?.({ stage: 'complete', message: 'Transcription complete' });

            // Clean up uploaded file
            try {
                await this.fileManager.deleteFile(audioFile.name);
            } catch (e) {
                console.log('Failed to delete uploaded file:', e.message);
            }

            return {
                success: true,
                text: fullText,
                format: outputFormat,
                model: modelId
            };

        } catch (error) {
            console.error('[Transcribe] Error:', error);
            if (error.name === 'AbortError') {
                return { success: false, error: 'Transcription cancelled' };
            }
            throw error;
        } finally {
            this.currentAbortController = null;
        }
    }

    /**
     * Cancel ongoing transcription
     */
    cancel() {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            return true;
        }
        return false;
    }

    /**
     * Build the transcription prompt for plain text
     */
    buildPrompt(maxCharsPerLine, language) {
        if (language === 'zh-CN') {
            return `请对这段音频进行语音识别，要求：
1. 在理解全文原意的基础上，纠正语音转文字的错误
2. 使用简体中文输出
3. 每一行不超过${maxCharsPerLine}个字
4. 换行时每一行要做到自然不突兀
5. 去除所有标点符号
6. 输出格式为纯文本，每行一句
7. 不要添加任何额外说明或标记，只输出转写的文本内容`;
        } else {
            return `Please transcribe this audio with the following requirements:
1. Correct any speech-to-text errors based on full context understanding
2. Output in ${language}
3. Each line should not exceed ${maxCharsPerLine} characters
4. Line breaks should be natural and not awkward
5. Remove all punctuation
6. Output format: plain text, one sentence per line
7. Do not add any additional explanations or markers, only output the transcribed text`;
        }
    }

    /**
     * Build the SRT format prompt with timestamps
     */
    buildSrtPrompt(maxCharsPerLine, language) {
        if (language === 'zh-CN') {
            return `请对这段音频进行语音识别并输出SRT字幕格式，要求：
1. 使用精确的时间戳，格式：HH:MM:SS,mmm --> HH:MM:SS,mmm
2. 每条字幕不超过${maxCharsPerLine}个字
3. 使用简体中文
4. 去除标点符号
5. 在理解全文原意的基础上纠正语音转文字的错误
6. 输出标准SRT格式，从1开始编号

输出格式示例：
1
00:00:01,000 --> 00:00:03,500
第一行字幕内容

2
00:00:03,600 --> 00:00:06,200
第二行字幕内容

请只输出SRT格式内容，不要有任何其他说明。`;
        } else {
            return `Please transcribe this audio and output in SRT subtitle format:
1. Use precise timestamps in format: HH:MM:SS,mmm --> HH:MM:SS,mmm
2. Each subtitle should not exceed ${maxCharsPerLine} characters
3. Output in ${language}
4. Remove punctuation
5. Correct any speech-to-text errors based on full context
6. Output standard SRT format, numbered starting from 1

Example format:
1
00:00:01,000 --> 00:00:03,500
First subtitle line

2
00:00:03,600 --> 00:00:06,200
Second subtitle line

Output ONLY the SRT content, no additional explanations.`;
        }
    }

    /**
     * Get MIME type from file extension
     */
    getMimeType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.mp3': 'audio/mp3',
            '.wav': 'audio/wav',
            '.m4a': 'audio/m4a',
            '.aac': 'audio/aac',
            '.ogg': 'audio/ogg',
            '.flac': 'audio/flac',
            '.webm': 'audio/webm'
        };
        return mimeTypes[ext] || 'audio/mpeg';
    }
}

export default new GeminiTranscribeService();
export { MODELS };
