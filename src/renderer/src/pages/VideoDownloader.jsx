import { useState, useEffect, useCallback } from 'react';
import SubtitleDialog from '../components/SubtitleDialog';
import VideoMediaCard from '../components/VideoMediaCard';
import ParsingAnimation from '../components/ParsingAnimation';
import DownloadQueueItem from '../components/DownloadQueueItem';
import PlaylistSelector from '../components/PlaylistSelector';
import HistoryDialog from '../components/HistoryDialog';
import EudicUploadDialog from '../components/EudicUploadDialog';
import { PlatformBadge } from '../components/PlatformBadge';
import { useGlobalTasks } from '../contexts/GlobalTaskContext';

function VideoDownloader({ pendingUrl = '', onClearPendingUrl }) {
    const [url, setUrl] = useState('');
    const [videoInfo, setVideoInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isSubtitleDialogOpen, setIsSubtitleDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isEudicDialogOpen, setIsEudicDialogOpen] = useState(false);
    const [uploadItem] = useState(null);

    const { state, actions, derivedState } = useGlobalTasks();
    const { downloads, history, settings } = state;

    // IPC event handlers
    useEffect(() => {
        const handleProgress = ({ id, progress, speed, downloadedSize, totalSize, eta }) => {
            // Update download state with any available progress data
            const updates = { status: 'downloading' };
            
            // Always update if we have any progress data
            if (progress > 0) updates.progress = progress;
            if (speed > 0) updates.speed = speed;
            if (downloadedSize > 0) updates.downloadedSize = downloadedSize;
            if (totalSize > 0) updates.totalSize = totalSize;
            if (eta > 0) updates.eta = eta;
            
            // Only update if we have meaningful data
            if (Object.keys(updates).length > 1) {
                console.log(`[VideoDownloader] Progress update for ${id}:`, updates);
                actions.updateDownload(id, updates);
            }
        };

        const handleComplete = async ({ id, code, filePath, fileSize, fileExt }) => {
            const download = downloads[id];
            if (!download) return;

            console.log(`[VideoDownloader] handleComplete: id=${id}, code=${code}, fileSize=${fileSize}, fileExt=${fileExt}`);

            if (code === 0) {
                const updateData = { 
                    progress: 100, 
                    status: 'completed', 
                    filePath,
                    totalSize: fileSize || download.totalSize || 0,
                    format: fileExt || download.format || 'mp4',
                    completedAt: new Date().toISOString()
                };
                console.log(`[VideoDownloader] Updating download with:`, updateData);
                actions.updateDownload(id, updateData);
                
                actions.addToHistory({
                    id: `hist-${id}`,
                    title: download.title,
                    thumbnail: download.thumbnail,
                    platform: download.platform,
                    type: download.type,
                    quality: download.quality,
                    format: fileExt || download.format,
                    fileSize: fileSize || download.totalSize,
                    filePath,
                    url: download.url
                });
            } else {
                const newRetryCount = (download.retryCount || 0) + 1;
                if (settings.autoRetry && newRetryCount <= settings.retryCount) {
                    actions.updateDownload(id, { 
                        retryCount: newRetryCount,
                        status: 'queued',
                        error: null
                    });
                } else {
                    actions.updateDownload(id, { 
                        status: 'failed', 
                        error: 'Download failed'
                    });
                }
            }
        };

        const handlePauseReply = ({ id, success }) => {
            if (success) {
                actions.updateDownload(id, { status: 'paused' });
            }
        };

        const handleCancelReply = ({ id }) => {
            actions.removeDownload(id);
        };

        window.api.onProgress(handleProgress);
        window.api.onComplete(handleComplete);
        window.api.onPauseReply(handlePauseReply);
        window.api.onCancelReply(handleCancelReply);
        return () => window.api.removeListeners();
    }, [downloads, settings, actions]);

    // Auto-start queued downloads when slots become available
    useEffect(() => {
        if (derivedState.canStartNewDownload && derivedState.nextQueuedDownload) {
            const nextTask = derivedState.nextQueuedDownload;
            console.log('[VideoDownloader] Starting queued download:', nextTask.id);
            
            const savedPath = localStorage.getItem('downloadPath') || settings.downloadPath;
            const options = {
                format: nextTask.type === 'audio' ? 'bestaudio' : 'bestvideo+bestaudio/best',
                output: '%(title)s.%(ext)s',
                audioOnly: nextTask.type === 'audio',
                downloadDir: savedPath || undefined
            };
            
            actions.updateDownload(nextTask.id, { status: 'downloading' });
            window.api.downloadVideo(nextTask.url, options, nextTask.id);
        }
    }, [derivedState.canStartNewDownload, derivedState.nextQueuedDownload, settings, actions]);

    useEffect(() => {
        if (pendingUrl?.trim()) {
            setUrl(pendingUrl);
            onClearPendingUrl?.();
            setTimeout(() => {
                const urlMatch = pendingUrl.match(/(https?:\/\/[^\s]+)/);
                if (urlMatch) handleParseUrl(urlMatch[0]);
            }, 100);
        }
    }, [pendingUrl]);

    const handleParseUrl = async (inputUrl) => {
        const cleanUrl = inputUrl || url.match(/(https?:\/\/[^\s]+)/)?.[0];
        if (!cleanUrl) { 
            setError('Please enter a valid video URL'); 
            return; 
        }

        setIsLoading(true);
        setVideoInfo(null);
        setError(null);
        
        try {
            // Check if Bilibili URL and get saved cookies
            const isBilibili = cleanUrl.includes('bilibili.com') || cleanUrl.includes('b23.tv');
            const options = {};
            if (isBilibili) {
                const savedCookie = localStorage.getItem('bilibili_cookie');
                if (savedCookie) {
                    options.cookies = savedCookie;
                }
            }
            
            const info = await window.api.getVideoInfo(cleanUrl, options);
            setVideoInfo(info);
        } catch (err) {
            let msg = 'Failed to parse. Please check if the URL is correct';
            if (err.message.includes('404')) msg = 'Video not found or has been deleted';
            if (err.message.includes('timeout')) msg = 'Connection timeout. Please check your network';
            if (err.message.includes('private')) msg = 'This video is private';
            if (err.message.includes('geo')) msg = 'This video is not available in your region';
            if (err.message.includes('format') && err.message.includes('BiliBili')) {
                msg = 'Bilibili video temporarily unavailable. Please try again later.';
            }
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                setUrl(text);
                const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
                if (urlMatch) handleParseUrl(urlMatch[0]);
            }
        } catch (err) {
            console.error('Failed to read clipboard:', err);
        }
    };

    const handleDownload = useCallback((type, options = {}) => {
        if (!videoInfo) return;
        if (type === 'subtitle') { 
            setIsSubtitleDialogOpen(true); 
            return; 
        }

        const id = Date.now().toString();
        const savedPath = localStorage.getItem('downloadPath') || settings.downloadPath;
        
        const extractor = (videoInfo.extractor || videoInfo.extractor_key || '').toLowerCase();
        let platform = 'unknown';
        if (extractor.includes('youtube')) platform = 'youtube';
        else if (extractor.includes('bilibili')) platform = 'bilibili';
        else if (extractor.includes('douyin')) platform = 'douyin';
        else if (extractor.includes('tiktok')) platform = 'tiktok';
        else if (extractor.includes('vimeo')) platform = 'vimeo';
        else if (extractor.includes('twitter')) platform = 'twitter';
        else if (extractor.includes('soundcloud')) platform = 'soundcloud';

        const { quality, format } = options;
        const isAudio = type === 'audio';
        
        const downloadOptions = {
            format: isAudio ? (quality?.formatId || 'bestaudio') : (quality?.formatId || 'bestvideo+bestaudio'),
            output: '%(title)s.%(ext)s',
            headers: videoInfo.headers,
            audioOnly: isAudio,
            downloadDir: savedPath || undefined,
            mergeOutputFormat: format || (isAudio ? 'm4a' : 'mp4')
        };

        const downloadUrl = videoInfo.extractor === 'youtube' 
            ? videoInfo.webpage_url 
            : (videoInfo.webpage_url || videoInfo.url);

        actions.addDownload({
            id,
            title: videoInfo.title,
            thumbnail: videoInfo.thumbnail,
            url: downloadUrl,
            platform,
            type,
            quality: quality?.label || 'Best',
            format: format || (isAudio ? 'm4a' : 'mp4'),
            status: derivedState.canStartNewDownload ? 'downloading' : 'queued',
            progress: 0,
            speed: 0,
            downloadedSize: 0,
            totalSize: quality?.filesize || videoInfo.filesize || 0,
            eta: 0
        });

        if (derivedState.canStartNewDownload) {
            window.api.downloadVideo(downloadUrl, downloadOptions, id);
        }
    }, [videoInfo, settings, actions, derivedState]);

    const handlePause = useCallback((id) => window.api.pauseDownload(id), []);
    
    const handleResume = useCallback((id) => {
        const download = downloads[id];
        if (!download) return;
        const savedPath = localStorage.getItem('downloadPath') || settings.downloadPath;
        const options = {
            format: download.type === 'audio' ? 'bestaudio' : 'bestvideo+bestaudio',
            output: '%(title)s.%(ext)s',
            audioOnly: download.type === 'audio',
            downloadDir: savedPath || undefined
        };
        actions.updateDownload(id, { status: 'downloading' });
        window.api.downloadVideo(download.url, options, id);
    }, [downloads, settings, actions]);

    const handleCancel = useCallback((id) => window.api.cancelDownload(id), []);
    
    const handleRetry = useCallback((id) => {
        const download = downloads[id];
        if (!download) return;
        actions.updateDownload(id, { status: 'queued', progress: 0, error: null, downloadedSize: 0 });
        const savedPath = localStorage.getItem('downloadPath') || settings.downloadPath;
        const options = {
            format: download.type === 'audio' ? 'bestaudio' : 'bestvideo+bestaudio',
            output: '%(title)s.%(ext)s',
            audioOnly: download.type === 'audio',
            downloadDir: savedPath || undefined
        };
        if (derivedState.canStartNewDownload) {
            actions.updateDownload(id, { status: 'downloading' });
            window.api.downloadVideo(download.url, options, id);
        }
    }, [downloads, settings, actions, derivedState]);

    const handleOpenFolder = useCallback((filePath) => {
        if (filePath) window.api.openFolder(filePath);
    }, []);

    const handleSubtitleDownload = useCallback((subtitleOptions) => {
        if (!videoInfo) return;
        const id = Date.now().toString();
        const savedPath = localStorage.getItem('downloadPath') || settings.downloadPath;
        actions.addDownload({
            id,
            title: `${videoInfo.title} (Subtitles)`,
            thumbnail: videoInfo.thumbnail,
            url: videoInfo.webpage_url,
            platform: 'unknown',
            type: 'subtitle',
            status: 'downloading',
            progress: 0
        });
        window.api.downloadSubtitles(videoInfo.webpage_url, { ...subtitleOptions, downloadDir: savedPath || undefined }, id);
    }, [videoInfo, settings, actions]);

    const handlePlaylistDownload = useCallback((selectedEntries) => {
        selectedEntries.forEach((entry, index) => {
            setTimeout(() => {
                const id = `${Date.now()}-${index}`;
                actions.addDownload({
                    id,
                    title: entry.title,
                    thumbnail: entry.thumbnail,
                    url: entry.url,
                    platform: videoInfo?.platform || 'unknown',
                    type: 'video',
                    status: 'queued',
                    progress: 0
                });
            }, index * 100);
        });
    }, [videoInfo, actions]);

    const handleRedownload = useCallback((item) => {
        if (item.url) handleParseUrl(item.url);
        setIsHistoryDialogOpen(false);
    }, []);

    const downloadList = Object.values(downloads).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const hasDownloads = downloadList.length > 0;
    const isPlaylist = videoInfo?.entries?.length > 0;
    const supportedPlatforms = ['youtube', 'bilibili', 'douyin', 'tiktok', 'vimeo', 'twitter', 'soundcloud'];
    const completedCount = downloadList.filter(d => d.status === 'completed').length;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafbfc] dark:bg-[#0d1117]">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">Media Downloader</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {hasDownloads ? `${downloadList.length} download${downloadList.length > 1 ? 's' : ''} in queue` : 'Download videos and audio from popular platforms'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsHistoryDialogOpen(true)}
                            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="History"
                        >
                            <span className="material-symbols-outlined text-xl">history</span>
                        </button>
                        <button
                            onClick={() => {
                                const path = localStorage.getItem('downloadPath');
                                if (path) {
                                    window.api.openFolder(path);
                                } else {
                                    window.api.openDownloadsFolder();
                                }
                            }}
                            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Open download folder"
                        >
                            <span className="material-symbols-outlined text-xl">folder_open</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Input & Video Info */}
                <div className="flex-1 flex flex-col p-6 overflow-auto custom-scrollbar">
                    <div className="max-w-2xl mx-auto w-full space-y-5">
                        {/* URL Input */}
                        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">link</span>
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleParseUrl()}
                                        placeholder="Paste video URL here..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2196F3]/30 focus:border-[#2196F3]"
                                    />
                                </div>
                                <button
                                    onClick={handlePaste}
                                    className="px-4 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-sm font-medium flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-lg">content_paste</span>
                                    Paste
                                </button>
                                <button
                                    onClick={() => handleParseUrl()}
                                    disabled={isLoading || !url.trim()}
                                    className="px-5 py-2.5 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-1.5"
                                >
                                    {isLoading ? (
                                        <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-lg">search</span>
                                    )}
                                    Parse
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-3">
                                <span className="material-symbols-outlined text-red-500">error</span>
                                <span className="flex-1 text-sm text-red-600 dark:text-red-400">{error}</span>
                                <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-800/30 rounded">
                                    <span className="material-symbols-outlined text-red-400 text-lg">close</span>
                                </button>
                            </div>
                        )}

                        {/* Parsing Animation */}
                        {isLoading && <ParsingAnimation />}

                        {/* Playlist Selector */}
                        {isPlaylist && (
                            <PlaylistSelector 
                                playlist={videoInfo}
                                onDownload={handlePlaylistDownload}
                                onCancel={() => setVideoInfo(null)}
                            />
                        )}

                        {/* Video Media Card */}
                        {videoInfo && !isPlaylist && !isLoading && (
                            <VideoMediaCard 
                                videoInfo={videoInfo}
                                onDownload={handleDownload}
                                isDownloading={Object.values(downloads).some(d => d.status === 'downloading')}
                            />
                        )}

                        {/* Empty State */}
                        {!videoInfo && !isLoading && !error && (
                            <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center">
                                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-400 text-3xl">download</span>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Paste a video link to start</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Supports YouTube, Bilibili, TikTok, and more</p>
                                
                                {/* Supported platforms */}
                                <div className="flex flex-wrap justify-center gap-2 mb-6">
                                    {supportedPlatforms.map(platform => (
                                        <PlatformBadge key={platform} platform={platform} size="md" showName />
                                    ))}
                                </div>

                                {/* Features */}
                                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                                    {[
                                        { icon: 'high_quality', title: '4K Video', desc: 'Ultra HD quality' },
                                        { icon: 'music_note', title: 'Audio Extract', desc: 'MP3/M4A formats' },
                                        { icon: 'subtitles', title: 'Subtitles', desc: 'Multi-language' }
                                    ].map((item, i) => (
                                        <div key={i} className="p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <span className="material-symbols-outlined text-[#2196F3] text-xl mb-2 block">{item.icon}</span>
                                            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">{item.title}</h4>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Download Queue */}
                <div className="w-80 border-l border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Download Queue</h3>
                            {downloadList.some(d => d.status === 'completed' || d.status === 'failed') && (
                                <button
                                    onClick={() => actions.clearCompletedDownloads()}
                                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                >
                                    Clear done
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {derivedState.activeDownloadCount} active · {derivedState.queuedDownloadCount} queued
                        </p>
                    </div>
                    
                    <div className="flex-1 overflow-auto custom-scrollbar p-4">
                        {hasDownloads ? (
                            <div className="space-y-2">
                                {downloadList.map((task) => (
                                    <DownloadQueueItem
                                        key={task.id}
                                        task={task}
                                        onPause={handlePause}
                                        onResume={handleResume}
                                        onCancel={handleCancel}
                                        onRetry={handleRetry}
                                        onOpenFolder={handleOpenFolder}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6">
                                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                                    <span className="material-symbols-outlined text-slate-400 text-2xl">inbox</span>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">No downloads yet</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Parse a video to start downloading</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <div className="h-10 px-6 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{downloadList.length} download{downloadList.length !== 1 ? 's' : ''} total</span>
                <span className={`flex items-center gap-1.5 font-medium ${
                    derivedState.activeDownloadCount > 0 ? 'text-blue-500' : completedCount > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                        derivedState.activeDownloadCount > 0 ? 'bg-blue-500 animate-pulse' : completedCount > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    {derivedState.activeDownloadCount > 0 ? `Downloading ${derivedState.activeDownloadCount} file${derivedState.activeDownloadCount > 1 ? 's' : ''}` : completedCount > 0 ? `${completedCount} completed` : 'Ready'}
                </span>
            </div>

            {/* Dialogs */}
            <SubtitleDialog
                isOpen={isSubtitleDialogOpen}
                onClose={() => setIsSubtitleDialogOpen(false)}
                videoInfo={videoInfo}
                onDownload={handleSubtitleDownload}
            />
            <HistoryDialog
                isOpen={isHistoryDialogOpen}
                onClose={() => setIsHistoryDialogOpen(false)}
                history={history}
                onRedownload={handleRedownload}
                onOpenFolder={handleOpenFolder}
                onDelete={(id) => actions.removeFromHistory(id)}
                onClearAll={() => actions.clearHistory()}
            />
            <EudicUploadDialog
                isOpen={isEudicDialogOpen}
                onClose={() => setIsEudicDialogOpen(false)}
                audioFile={uploadItem?.filePath}
                videoTitle={uploadItem?.title}
                onUploadSuccess={() => {}}
            />
        </div>
    );
}

export default VideoDownloader;
