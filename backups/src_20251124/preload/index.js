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
    eudicFetchCookie: () => ipcRenderer.invoke('eudic-fetch-cookie')
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
