import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    // Clipboard API - use IPC to main process
    copyToClipboard: (text) => ipcRenderer.invoke('clipboard:copy', text),
    
    getVideoInfo: (url, options) => ipcRenderer.invoke('get-video-info', url, options),
    getPreviewVideo: (videoInfo) => ipcRenderer.invoke('get-preview-video', videoInfo),
    getVideoProxyUrl: (videoInfo) => ipcRenderer.invoke('get-video-proxy-url', videoInfo),
    getImageProxyUrl: (imageUrl) => ipcRenderer.invoke('get-image-proxy-url', imageUrl),
    downloadVideo: (url, options, id) => ipcRenderer.send('download-video', { url, options, id }),
    pauseDownload: (id) => ipcRenderer.send('pause-download', id),
    cancelDownload: (id) => ipcRenderer.send('cancel-download', id),
    selectDownloadDirectory: () => ipcRenderer.invoke('select-download-directory'),
    getSubtitlesList: (url) => ipcRenderer.invoke('get-subtitles-list', url),
    downloadSubtitles: (url, options, id) => ipcRenderer.send('download-subtitles', { url, options, id }),
    onProgress: (callback) => ipcRenderer.on('download-progress', (_, data) => callback(data)),
    onComplete: (callback) => ipcRenderer.on('download-complete', (_, data) => callback(data)),
    onPauseReply: (callback) => ipcRenderer.on('pause-download-reply', (_, data) => callback(data)),
    onCancelReply: (callback) => ipcRenderer.on('cancel-download-reply', (_, data) => callback(data)),
    openFolder: (filePath) => ipcRenderer.invoke('open-folder', filePath),
    openDownloadsFolder: () => ipcRenderer.invoke('open-downloads-folder'),
    selectVideoFiles: () => ipcRenderer.invoke('select-video-files'),
    removeListeners: () => {
        ipcRenderer.removeAllListeners('download-progress');
        ipcRenderer.removeAllListeners('download-complete');
    },

    // Settings API
    getSettings: () => ipcRenderer.invoke('get-settings'),

    // Eudic API
    eudicGetChannels: (cookie) => ipcRenderer.invoke('eudic-get-channels', cookie),
    eudicUploadAudio: (filePath, channelId, customFileName) => ipcRenderer.invoke('eudic-upload-audio', { filePath, channelId, customFileName }),
    eudicOpenUploads: () => ipcRenderer.invoke('eudic-open-uploads'),
    eudicFetchCookie: () => ipcRenderer.invoke('eudic-fetch-cookie'),

    // Media Converter API
    mediaSelectFiles: () => ipcRenderer.invoke('media:select-files'),
    mediaConvert: (files, format, options, id) => ipcRenderer.send('media:convert', { files, format, options, id }),
    mediaCancel: (id) => ipcRenderer.send('media:cancel', id),
    onMediaProgress: (callback) => ipcRenderer.on('media:progress', (_, data) => callback(data)),
    onMediaComplete: (callback) => ipcRenderer.on('media:complete', (_, data) => callback(data)),

    // Document Converter API
    docSelectFiles: () => ipcRenderer.invoke('doc:select-files'),
    docConvert: (files, targetFormat, options, id) => ipcRenderer.send('doc:convert', { files, targetFormat, options, id }),
    docMergePdfs: (files, outputPath) => ipcRenderer.invoke('doc:merge-pdfs', { files, outputPath }),
    onDocProgress: (callback) => ipcRenderer.on('doc:progress', (_, data) => callback(data)),
    onDocComplete: (callback) => ipcRenderer.on('doc:complete', (_, data) => callback(data)),

    // File Compressor API
    zipSelectFiles: () => ipcRenderer.invoke('zip:select-files'),
    zipSelectArchives: () => ipcRenderer.invoke('zip:select-archives'),
    zipCompress: (files, options, id) => ipcRenderer.send('zip:compress', { files, options, id }),
    zipDecompress: (file, options, id) => ipcRenderer.send('zip:decompress', { file, options, id }),
    onZipProgress: (callback) => ipcRenderer.on('zip:progress', (_, data) => callback(data)),
    onZipComplete: (callback) => ipcRenderer.on('zip:complete', (_, data) => callback(data)),
    offZipProgress: () => ipcRenderer.removeAllListeners('zip:progress'),
    offZipComplete: () => ipcRenderer.removeAllListeners('zip:complete'),
    
    // Password Cracking API
    zipSelectDictionary: () => ipcRenderer.invoke('zip:select-dictionary'),
    zipCheckGpu: () => ipcRenderer.invoke('zip:check-gpu'),
    zipCrackStart: (archivePath, options, id) => ipcRenderer.send('zip:crack-start', { archivePath, options, id }),
    zipCrackPause: (id) => ipcRenderer.send('zip:crack-pause', { id }),
    zipCrackStop: (id) => ipcRenderer.send('zip:crack-stop', { id }),
    zipCrackResume: (sessionId, filePath) => ipcRenderer.invoke('zip:crack-resume', { sessionId, filePath }),
    zipCrackListSessions: () => ipcRenderer.invoke('zip:crack-list-sessions'),
    zipCrackDeleteSession: (sessionId) => ipcRenderer.invoke('zip:crack-delete-session', { sessionId }),
    onZipCrackStarted: (callback) => ipcRenderer.on('zip:crack-started', (_, data) => callback(data)),
    onZipCrackProgress: (callback) => ipcRenderer.on('zip:crack-progress', (_, data) => callback(data)),
    onZipCrackResult: (callback) => ipcRenderer.on('zip:crack-complete', (_, data) => callback(data)),
    onZipCrackEncryption: (callback) => ipcRenderer.on('zip:crack-encryption', (_, data) => callback(data)),
    onZipCrackPaused: (callback) => ipcRenderer.on('zip:crack-paused', (_, data) => callback(data)),
    onZipCrackStopped: (callback) => ipcRenderer.on('zip:crack-stopped', (_, data) => callback(data)),
    zipCrackOffListeners: () => {
        ipcRenderer.removeAllListeners('zip:crack-started');
        ipcRenderer.removeAllListeners('zip:crack-progress');
        ipcRenderer.removeAllListeners('zip:crack-complete');
        ipcRenderer.removeAllListeners('zip:crack-encryption');
        ipcRenderer.removeAllListeners('zip:crack-paused');
        ipcRenderer.removeAllListeners('zip:crack-stopped');
    },

    // GPU Detection and Settings API
    gpuDetect: () => ipcRenderer.invoke('gpu-detect'),
    gpuGetSettings: () => ipcRenderer.invoke('gpu-get-settings'),
    gpuUpdateSettings: (newSettings) => ipcRenderer.invoke('gpu-update-settings', newSettings),
    gpuIsAvailable: () => ipcRenderer.invoke('gpu-is-available'),
    gpuGetBestEncoder: (codec) => ipcRenderer.invoke('gpu-get-best-encoder', codec),

    // Watermark Removal APIs
    watermarkSelectFiles: () => ipcRenderer.invoke('watermark:select-files'),
    watermarkSelectImages: () => ipcRenderer.invoke('watermark:select-images'),
    watermarkDetect: (filePath) => ipcRenderer.invoke('watermark:detect', filePath),
    watermarkGetImageInfo: (filePath) => ipcRenderer.invoke('watermark:get-image-info', filePath),
    watermarkRemoveImage: (data) => ipcRenderer.invoke('watermark:remove-image', data),
    watermarkRemove: (data, callback) => {
        ipcRenderer.send('watermark:remove', data);
        ipcRenderer.on('watermark:progress', (_event, result) => callback('progress', result));
        ipcRenderer.on('watermark:complete', (_event, result) => callback('complete', result));
    },
    watermarkBatchRemove: (data) => ipcRenderer.invoke('watermark:batch-remove', data),
    watermarkOffProgress: () => {
        ipcRenderer.removeAllListeners('watermark:progress');
        ipcRenderer.removeAllListeners('watermark:complete');
    },


    // AI Transcription APIs
    transcribeGetModels: () => ipcRenderer.invoke('transcribe:get-models'),
    transcribeTestConnection: (apiKey, modelId) => ipcRenderer.invoke('transcribe:test-connection', { apiKey, modelId }),
    transcribeSelectFile: () => ipcRenderer.invoke('transcribe:select-file'),
    transcribeExtractAudio: (filePath) => ipcRenderer.invoke('transcribe:extract-audio', filePath),
    transcribeStart: (data) => ipcRenderer.invoke('transcribe:start', data),
    transcribeCancel: () => ipcRenderer.invoke('transcribe:cancel'),
    onTranscribeExtractProgress: (callback) => ipcRenderer.on('transcribe:extract-progress', (_, data) => callback(data)),
    onTranscribeProgress: (callback) => ipcRenderer.on('transcribe:progress', (_, data) => callback(data)),
    onTranscribeChunk: (callback) => ipcRenderer.on('transcribe:chunk', (_, data) => callback(data)),
    transcribeOffListeners: () => {
        ipcRenderer.removeAllListeners('transcribe:extract-progress');
        ipcRenderer.removeAllListeners('transcribe:progress');
        ipcRenderer.removeAllListeners('transcribe:chunk');
    },

    // Groq Whisper APIs
    groqTestConnection: (apiKey) => ipcRenderer.invoke('groq:test-connection', apiKey),
    groqUpdateKeys: (apiKeys) => ipcRenderer.invoke('groq:update-keys', apiKeys),
    groqTranscribe: (data) => ipcRenderer.invoke('groq:transcribe', data),
    cancelTranscription: () => ipcRenderer.invoke('groq:cancel'),
    groqDetectGaps: (data) => ipcRenderer.invoke('groq:detect-gaps', data),
    groqFillGaps: (data) => ipcRenderer.invoke('groq:fill-gaps', data),
    saveTranscription: (data) => ipcRenderer.invoke('save-transcription', data),
    onGroqProgress: (callback) => ipcRenderer.on('groq:progress', (_, data) => callback(data)),
    onGroqKeyStatusUpdate: (callback) => ipcRenderer.on('groq:key-status-update', (_, data) => callback(data)),
    groqOffListeners: () => {
        ipcRenderer.removeAllListeners('groq:progress');
        ipcRenderer.removeAllListeners('groq:key-status-update');
    },

    // App Update APIs
    appCheckForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_, data) => callback(data)),
    appOffUpdateListeners: () => {
        ipcRenderer.removeAllListeners('update-status');
    }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
    try {
        contextBridge.exposeInMainWorld('electron', electronAPI)
        contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
        console.error(error)
    }
} else {
    window.electron = electronAPI
    window.api = api
}
