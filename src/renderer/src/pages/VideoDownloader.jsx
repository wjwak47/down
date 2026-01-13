import { useState, useEffect } from 'react';
import SubtitleDialog from '../components/SubtitleDialog';

function VideoDownloader({ pendingUrl = '', onClearPendingUrl }) {
    const [url, setUrl] = useState('');
    const [videoInfo, setVideoInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [downloads, setDownloads] = useState({});
    const [error, setError] = useState(null);
    const [isSubtitleDialogOpen, setIsSubtitleDialogOpen] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => {
        const handleProgress = ({ id, progress }) => {
            setDownloads(prev => {
                if (!prev[id] || prev[id].status === 'Paused' || prev[id].status === 'Cancelled') return prev;
                return { ...prev, [id]: { ...prev[id], progress, status: 'Active' } };
            });
        };

        const handleComplete = async ({ id, code, filePath }) => {
            setDownloads(prev => {
                if (!prev[id] || prev[id].status === 'Cancelled') return prev;
                return {
                    ...prev,
                    [id]: { ...prev[id], progress: 100, status: code === 0 ? 'Completed' : 'Failed', filePath: filePath || prev[id].filePath }
                };
            });
        };

        const handlePauseReply = ({ id, success }) => {
            if (success) setDownloads(prev => ({ ...prev, [id]: { ...prev[id], status: 'Paused' } }));
        };

        const handleCancelReply = ({ id }) => {
            setDownloads(prev => { const newState = { ...prev }; delete newState[id]; return newState; });
        };

        window.api.onProgress(handleProgress);
        window.api.onComplete(handleComplete);
        window.api.onPauseReply(handlePauseReply);
        window.api.onCancelReply(handleCancelReply);
        return () => window.api.removeListeners();
    }, []);

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
        if (!cleanUrl) { setError('Please enter a valid video link'); return; }

        setIsLoading(true);
        setVideoInfo(null);
        setError(null);
        try {
            const info = await window.api.getVideoInfo(cleanUrl);
            setVideoInfo(info);
        } catch (err) {
            let msg = 'Parsing failed, please check if the link is correct';
            if (err.message.includes('404')) msg = 'Video not found or has been deleted';
            if (err.message.includes('timeout')) msg = 'Connection timeout, please check your network';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = (type) => {
        if (!videoInfo) return;
        if (type === 'subtitle') { setIsSubtitleDialogOpen(true); return; }

        const id = Date.now().toString();
        const savedPath = localStorage.getItem('downloadPath');
        const options = {
            format: type === 'audio' ? 'bestaudio' : 'bestvideo+bestaudio',
            output: '%(title)s.%(ext)s',
            headers: videoInfo.headers,
            audioOnly: type === 'audio',
            downloadDir: savedPath || undefined
        };

        const downloadUrl = videoInfo.extractor === 'youtube' ? videoInfo.webpage_url : (videoInfo.url || videoInfo.webpage_url);

        setDownloads(prev => ({
            ...prev,
            [id]: {
                id, title: videoInfo.title, thumbnail: videoInfo.thumbnail, progress: 0, status: 'Starting...',
                type, url: downloadUrl, headers: videoInfo.headers,
                size: videoInfo.filesize ? `${(videoInfo.filesize / 1024 / 1024).toFixed(1)} MB` : 'Unknown'
            }
        }));
        window.api.downloadVideo(downloadUrl, options, id);
    };

    const handlePause = (id) => window.api.pauseDownload(id);
    
    const handleResume = (item) => {
        const options = {
            format: item.type === 'audio' ? 'bestaudio' : 'bestvideo+bestaudio',
            output: '%(title)s.%(ext)s',
            headers: videoInfo?.headers || {},
            audioOnly: item.type === 'audio',
            downloadDir: localStorage.getItem('downloadPath') || undefined
        };
        if (item.url) {
            setDownloads(prev => ({ ...prev, [item.id]: { ...prev[item.id], status: 'Resuming...' } }));
            window.api.downloadVideo(item.url, options, item.id);
        }
    };

    const handleCancel = (id) => window.api.cancelDownload(id);

    const handleSubtitleDownload = (subtitleOptions) => {
        if (!videoInfo) return;
        const id = Date.now().toString();
        const savedPath = localStorage.getItem('downloadPath');
        setDownloads(prev => ({
            ...prev,
            [id]: { id, title: `${videoInfo.title} (Subtitles)`, thumbnail: videoInfo.thumbnail, progress: 0, status: 'Starting...', type: 'subtitle', url: videoInfo.webpage_url }
        }));
        window.api.downloadSubtitles(videoInfo.webpage_url, { ...subtitleOptions, downloadDir: savedPath || undefined }, id);
    };

    const handleOpenFolder = async () => {
        const downloadDir = localStorage.getItem('downloadPath') || '';
        try {
            const result = await window.api.openFolder(downloadDir);
            if (!result?.success) await window.api.openDownloadsFolder();
        } catch { 
            try { await window.api.openDownloadsFolder(); } catch { alert('无法打开下载目录'); }
        }
    };

    const hasDownloads = Object.keys(downloads).length > 0;
    const showEmptyState = !videoInfo && !hasDownloads && !isLoading;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafbfc] dark:bg-[#0d1117]">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">Media Downloader</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Download videos and audio from popular platforms</p>
                    </div>
                    {hasDownloads && (
                        <button onClick={() => setDownloads({})} className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                            Clear all
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
                    
                    {/* Drop Zone / URL Input Area */}
                    <div 
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); }}
                        className={`rounded-2xl border-2 border-dashed transition-all ${
                            dragOver ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-700'
                        } ${showEmptyState ? 'p-12' : 'p-6'}`}
                    >
                        {showEmptyState && (
                            <>
                                {/* Icon */}
                                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-400 text-3xl">download</span>
                                </div>
                                
                                {/* Title */}
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2 text-center">Paste URL to download</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-5 text-center">Supports YouTube, Vimeo, SoundCloud, and direct CDN links</p>
                                
                                {/* Colorful Platform Tags */}
                                <div className="flex gap-3 justify-center mb-6">
                                    <span className="text-[#FF0000] text-xs font-semibold">YouTube</span>
                                    <span className="text-[#1AB7EA] text-xs font-semibold">Vimeo</span>
                                    <span className="text-[#FF5500] text-xs font-semibold">SoundCloud</span>
                                    <span className="text-[#00D4AA] text-xs font-semibold">CDN Links</span>
                                </div>
                            </>
                        )}
                        
                        {/* URL Input */}
                        <div className={showEmptyState ? 'max-w-xl mx-auto' : ''}>
                            <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                                <div className="pl-4 flex items-center pointer-events-none">
                                    <span className="material-symbols-outlined text-slate-400 text-xl">link</span>
                                </div>
                                <input
                                    className="flex-1 h-12 px-3 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                    placeholder="Paste URL here to fetch media..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleParseUrl()}
                                />
                                <button
                                    onClick={() => handleParseUrl()}
                                    disabled={isLoading || !url.trim()}
                                    className="h-12 px-4 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className={`material-symbols-outlined text-xl ${isLoading ? 'animate-spin' : ''}`}>
                                        {isLoading ? 'progress_activity' : 'arrow_forward'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm flex items-center gap-3">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    )}

                    {/* Video Info Card */}
                    {videoInfo && (
                        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="flex gap-5 p-5">
                                <img src={videoInfo.thumbnail} alt={videoInfo.title} className="w-48 h-28 object-cover rounded-xl flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">{videoInfo.title}</h3>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-4">
                                        {videoInfo.duration && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">schedule</span>{Math.floor(videoInfo.duration / 60)}:{String(videoInfo.duration % 60).padStart(2, '0')}</span>}
                                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-base">public</span>{videoInfo.extractor || 'Unknown'}</span>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => handleDownload('video')} className="px-5 py-2.5 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] text-white rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">download</span>Download Video
                                        </button>
                                        <button onClick={() => handleDownload('audio')} className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-all flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">music_note</span>Audio Only
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if (!videoInfo.subtitles || Object.keys(videoInfo.subtitles).length === 0) {
                                                    setError('This video has no subtitles available');
                                                    setTimeout(() => setError(null), 3000);
                                                } else {
                                                    handleDownload('subtitle');
                                                }
                                            }} 
                                            className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">subtitles</span>Subtitles
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Downloads List */}
                    {hasDownloads && (
                        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Downloads</h3>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {Object.values(downloads).map((dl) => (
                                    <div key={dl.id} className="px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`flex items-center justify-center rounded-xl size-12 flex-shrink-0 ${
                                                dl.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' :
                                                dl.status === 'Paused' || dl.status === 'Failed' ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' :
                                                'bg-primary/10 text-primary'
                                            }`}>
                                                <span className="material-symbols-outlined text-xl">
                                                    {dl.status === 'Completed' ? 'check_circle' : dl.type === 'audio' || dl.type === 'subtitle' ? 'music_note' : 'video_camera_back'}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1 mb-1">{dl.title}</p>
                                                {dl.status === 'Active' || dl.status === 'Starting...' || dl.status === 'Resuming...' ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-1.5 bg-primary/20 rounded-full overflow-hidden">
                                                            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${dl.progress}%` }}></div>
                                                        </div>
                                                        <span className="text-xs font-semibold text-primary w-10">{dl.progress}%</span>
                                                    </div>
                                                ) : (
                                                    <p className={`text-xs font-medium ${
                                                        dl.status === 'Completed' ? 'text-emerald-600 dark:text-emerald-400' :
                                                        dl.status === 'Failed' ? 'text-red-600 dark:text-red-400' :
                                                        'text-slate-400'
                                                    }`}>
                                                        {dl.status === 'Completed' ? '✓ Download complete' : dl.status === 'Paused' ? 'Paused' : dl.status === 'Failed' ? '✗ Failed' : dl.status}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                {dl.status === 'Paused' && (
                                                    <button onClick={() => handleResume(dl)} className="text-primary hover:underline text-sm font-medium">Resume</button>
                                                )}
                                                {dl.status === 'Completed' && (
                                                    <button onClick={handleOpenFolder} className="text-primary hover:underline text-sm font-medium">Open Folder</button>
                                                )}
                                                <button
                                                    onClick={() => dl.status === 'Active' ? handlePause(dl.id) : handleCancel(dl.id)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-500 rounded"
                                                >
                                                    <span className="material-symbols-outlined text-lg">{dl.status === 'Completed' ? 'delete' : 'close'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Feature Cards - Only show in empty state */}
                    {showEmptyState && (
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { icon: 'verified', title: 'Secure Transfer', desc: 'Encrypted downloads for your safety' },
                                { icon: 'bolt', title: 'Multi-threaded', desc: 'Fast parallel download engine' },
                                { icon: 'folder_open', title: 'Auto-organize', desc: 'Smart file management' }
                            ].map((item, i) => (
                                <div key={i} className="p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <span className="material-symbols-outlined text-[#2196F3] text-2xl mb-3 block">{item.icon}</span>
                                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{item.title}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <SubtitleDialog
                isOpen={isSubtitleDialogOpen}
                onClose={() => setIsSubtitleDialogOpen(false)}
                videoInfo={videoInfo}
                onDownload={handleSubtitleDownload}
            />
        </div>
    );
}

export default VideoDownloader;
