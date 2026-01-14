import { useState, useEffect } from 'react';
import { PlatformBadge } from './PlatformBadge';

/**
 * DownloadQueueItem Component
 * Displays a download task with progress, speed, and action buttons
 */
function DownloadQueueItem({ 
    task, 
    onPause, 
    onResume, 
    onCancel, 
    onRetry,
    onOpenFolder 
}) {
    const [proxiedThumbnail, setProxiedThumbnail] = useState(null);

    // Proxy Bilibili thumbnails to bypass anti-hotlinking
    useEffect(() => {
        const proxyThumbnail = async () => {
            if (!task?.thumbnail) {
                setProxiedThumbnail(null);
                return;
            }
            
            const thumbnail = task.thumbnail;
            // Check if it's a Bilibili image that needs proxying
            if (thumbnail.includes('hdslb.com') || thumbnail.includes('bilibili.com')) {
                try {
                    const proxyUrl = await window.api.getImageProxyUrl(thumbnail);
                    setProxiedThumbnail(proxyUrl);
                } catch (err) {
                    console.error('Failed to proxy thumbnail:', err);
                    setProxiedThumbnail(thumbnail); // Fallback to original
                }
            } else {
                setProxiedThumbnail(thumbnail);
            }
        };
        
        proxyThumbnail();
    }, [task?.thumbnail]);
    // Debug: log task data when completed
    if (task.status === 'completed') {
        console.log('[DownloadQueueItem] Completed task:', {
            id: task.id,
            totalSize: task.totalSize,
            format: task.format,
            filePath: task.filePath,
            progress: task.progress
        });
    }

    // Calculate progress percentage
    // CRITICAL: When status is 'completed', always show 100%
    const progressPercent = (() => {
        if (task.status === 'completed') return 100;
        if (task.status === 'failed') return 0;
        if (task.totalSize > 0 && task.downloadedSize > 0) {
            return Math.min(100, Math.round((task.downloadedSize / task.totalSize) * 100));
        }
        return Math.min(100, Math.round(task.progress || 0));
    })();

    // Format file size
    const formatSize = (bytes) => {
        if (!bytes || bytes <= 0) return '';
        if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${bytes} B`;
    };

    // Format speed
    const formatSpeed = (bytesPerSec) => {
        if (!bytesPerSec || bytesPerSec <= 0) return '';
        if (bytesPerSec >= 1048576) return `${(bytesPerSec / 1048576).toFixed(1)} MB/s`;
        if (bytesPerSec >= 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
        return `${bytesPerSec} B/s`;
    };

    // Format ETA
    const formatETA = (seconds) => {
        if (!seconds || seconds <= 0 || !isFinite(seconds)) return '';
        if (seconds >= 3600) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            return `${h}h ${m}m`;
        }
        if (seconds >= 60) {
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return `${m}m ${s}s`;
        }
        return `${Math.floor(seconds)}s`;
    };

    // Get progress bar color based on status
    const getProgressColor = () => {
        switch (task.status) {
            case 'failed': return 'bg-red-500';
            case 'completed': return 'bg-green-500';
            case 'paused': return 'bg-amber-500';
            default: return 'bg-gradient-to-r from-blue-500 to-blue-400';
        }
    };

    // Detect platform
    const detectPlatform = () => {
        if (task.platform) return task.platform;
        const url = task.url || '';
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('bilibili.com')) return 'bilibili';
        if (url.includes('douyin.com')) return 'douyin';
        if (url.includes('tiktok.com')) return 'tiktok';
        if (url.includes('vimeo.com')) return 'vimeo';
        if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
        if (url.includes('soundcloud.com')) return 'soundcloud';
        return 'unknown';
    };

    const platform = detectPlatform();
    const isPaused = task.status === 'paused';
    const isCompleted = task.status === 'completed';
    const isFailed = task.status === 'failed';

    return (
        <div className="p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 mb-3 transition-all hover:shadow-sm">
            {/* Title Row with Action Button */}
            <div className="flex items-center gap-3 mb-2">
                {/* Thumbnail */}
                {proxiedThumbnail ? (
                    <img 
                        src={proxiedThumbnail} 
                        alt={task.title}
                        className="w-12 h-8 object-cover rounded-md flex-shrink-0"
                    />
                ) : (
                    <div className="w-12 h-8 bg-slate-200 dark:bg-slate-700 rounded-md flex-shrink-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-400 text-base">movie</span>
                    </div>
                )}
                
                {/* Title & Platform */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <PlatformBadge platform={platform} size="sm" />
                        <h4 className="text-sm font-medium text-slate-800 dark:text-white truncate" title={task.title}>
                            {task.title}
                        </h4>
                    </div>
                </div>
                
                {/* Action Button - Right side */}
                <div className="flex-shrink-0">
                    {task.status === 'downloading' && onPause && (
                        <button 
                            onClick={() => onPause(task.id)}
                            className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                            title="Pause"
                        >
                            <span className="material-symbols-outlined text-lg">pause</span>
                        </button>
                    )}
                    {isPaused && onResume && (
                        <button 
                            onClick={() => onResume(task.id)}
                            className="p-1.5 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Resume"
                        >
                            <span className="material-symbols-outlined text-lg">play_arrow</span>
                        </button>
                    )}
                    {isFailed && onRetry && (
                        <button 
                            onClick={() => onRetry(task.id)}
                            className="p-1.5 text-orange-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                            title="Retry"
                        >
                            <span className="material-symbols-outlined text-lg">refresh</span>
                        </button>
                    )}
                    {isCompleted && onOpenFolder && (
                        <button 
                            onClick={() => onOpenFolder(task.filePath)}
                            className="p-1.5 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Open folder"
                        >
                            <span className="material-symbols-outlined text-lg">folder_open</span>
                        </button>
                    )}
                    {!isCompleted && onCancel && (
                        <button 
                            onClick={() => onCancel(task.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Cancel"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    )}
                </div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mb-1.5">
                <div 
                    className={`h-full rounded-full transition-all duration-300 ${getProgressColor()}`}
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
            
            {/* Status Info - Single line */}
            <div className="flex items-center justify-between text-xs overflow-hidden">
                <div className="flex items-center gap-1 min-w-0 truncate text-slate-500 dark:text-slate-400">
                    {task.status === 'downloading' && (
                        <>
                            {task.progress > 0 || task.downloadedSize > 0 ? (
                                <>
                                    <span>{formatSize(task.downloadedSize) || '0 B'}</span>
                                    {task.totalSize > 0 && <span>/ {formatSize(task.totalSize)}</span>}
                                    {task.speed > 0 && (
                                        <>
                                            <span className="text-slate-300 dark:text-slate-600">•</span>
                                            <span className="text-blue-500">{formatSpeed(task.speed)}</span>
                                        </>
                                    )}
                                    {task.eta > 0 && (
                                        <>
                                            <span className="text-slate-300 dark:text-slate-600">•</span>
                                            <span>{formatETA(task.eta)}</span>
                                        </>
                                    )}
                                </>
                            ) : (
                                <span className="text-blue-500 flex items-center gap-1">
                                    <span className="inline-block w-2 h-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                                    Downloading...
                                </span>
                            )}
                        </>
                    )}
                    {task.status === 'queued' && <span className="text-slate-400">Queued</span>}
                    {task.status === 'paused' && <span className="text-amber-500">Paused</span>}
                    {task.status === 'completed' && (
                        <>
                            <span className="material-symbols-outlined text-green-500" style={{fontSize: '14px'}}>check_circle</span>
                            <span className="text-green-500">Done</span>
                            {task.totalSize > 0 && (
                                <>
                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                    <span>{formatSize(task.totalSize)}</span>
                                </>
                            )}
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="uppercase">{task.format || 'mp4'}</span>
                        </>
                    )}
                    {task.status === 'failed' && (
                        <>
                            <span className="material-symbols-outlined text-red-500" style={{fontSize: '14px'}}>error</span>
                            <span className="text-red-500 truncate">{task.error || 'Failed'}</span>
                        </>
                    )}
                </div>
                {/* Percentage on right */}
                {(task.status === 'downloading' || task.status === 'paused') && (
                    <span className={`flex-shrink-0 ml-2 font-medium ${task.status === 'paused' ? 'text-amber-500' : 'text-blue-500'}`}>
                        {progressPercent}%
                    </span>
                )}
            </div>
        </div>
    );
}

// Helper functions for progress calculation (exported for testing)
export function calculateProgress(downloadedSize, totalSize) {
    if (!totalSize || totalSize <= 0) return 0;
    const progress = (downloadedSize / totalSize) * 100;
    return Math.min(100, Math.max(0, progress));
}

export function calculateSpeed(bytesDownloaded, intervalMs) {
    if (!intervalMs || intervalMs <= 0) return 0;
    return (bytesDownloaded / intervalMs) * 1000; // bytes per second
}

export function calculateETA(remainingBytes, speedBytesPerSec) {
    if (!speedBytesPerSec || speedBytesPerSec <= 0) return Infinity;
    return remainingBytes / speedBytesPerSec; // seconds
}

export default DownloadQueueItem;
