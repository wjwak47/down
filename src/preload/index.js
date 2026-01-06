import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
    getVideoInfo: (url) => ipcRenderer.invoke('get-video-info', url),
    getPreviewVideo: (videoInfo) => ipcRenderer.invoke('get-preview-video', videoInfo),
    getVideoProxyUrl: (videoInfo) => ipcRenderer.invoke('get-video-proxy-url', videoInfo),
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
    zipCompress: (files, options, id) => ipcRenderer.send('zip:compress', { files, options, id }),
    zipDecompress: (file, options, id) => ipcRenderer.send('zip:decompress', { file, options, id }),
    onZipProgress: (callback) => ipcRenderer.on('zip:progress', (_, data) => callback(data)),
    onZipComplete: (callback) => ipcRenderer.on('zip:complete', (_, data) => callback(data)),

    // GPU Detection and Settings API
    gpuDetect: () => ipcRenderer.invoke('gpu-detect'),
    gpuGetSettings: () => ipcRenderer.invoke('gpu-get-settings'),
    gpuUpdateSettings: (newSettings) => ipcRenderer.invoke('gpu-update-settings', newSettings),
    gpuIsAvailable: () => ipcRenderer.invoke('gpu-is-available'),
    gpuGetBestEncoder: (codec) => ipcRenderer.invoke('gpu-get-best-encoder', codec),

    // Watermark Removal APIs
    watermarkSelectFiles: () => ipcRenderer.invoke('watermark:select-files'),
    watermarkDetect: (filePath) => ipcRenderer.invoke('watermark:detect', filePath),
    watermarkRemove: (data, callback) => {
        ipcRenderer.send('watermark:remove', data);
        ipcRenderer.on('watermark:progress', (_event, result) => callback('progress', result));
        ipcRenderer.on('watermark:complete', (_event, result) => callback('complete', result));
    },
    watermarkBatchRemove: (data) => ipcRenderer.invoke('watermark:batch-remove', data),
    watermarkOffProgress: () => {
        ipcRenderer.removeAllListeners('watermark:progress');
        ipcRenderer.removeAllListeners('watermark:complete');
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
