import { useState, useMemo, useEffect } from 'react';
import { PlatformBadge } from './PlatformBadge';
import Modal from './Modal';

/**
 * HistoryDialog Component
 * Displays download history with search and filter capabilities
 */
function HistoryDialog({ 
    isOpen, 
    onClose, 
    history = [], 
    onRedownload, 
    onOpenFolder, 
    onDelete, 
    onClearAll 
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all'); // all, video, audio, subtitle

    // Filter and search history
    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            // Search filter
            const matchesSearch = !searchQuery || 
                item.title?.toLowerCase().includes(searchQuery.toLowerCase());
            
            // Type filter
            const matchesFilter = filter === 'all' || item.type === filter;
            
            return matchesSearch && matchesFilter;
        });
    }, [history, searchQuery, filter]);

    // Format file size
    const formatSize = (bytes) => {
        if (!bytes || bytes <= 0) return '';
        if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
        if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${bytes} B`;
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diff = now - date;
            
            // Within 24 hours
            if (diff < 86400000) {
                const hours = Math.floor(diff / 3600000);
                if (hours < 1) return 'Just now';
                return `${hours}h ago`;
            }
            // Within 7 days
            if (diff < 604800000) {
                const days = Math.floor(diff / 86400000);
                return `${days}d ago`;
            }
            // Otherwise show date
            return date.toLocaleDateString();
        } catch {
            return dateStr;
        }
    };

    // Get type icon
    const getTypeIcon = (type) => {
        switch (type) {
            case 'audio':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                    </svg>
                );
            case 'subtitle':
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                    </svg>
                );
            default:
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                );
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Download History" size="lg">
            <div className="flex flex-col h-full max-h-[70vh]">
                {/* Search and Filter */}
                <div className="flex gap-3 mb-4 flex-shrink-0">
                    <div className="flex-1 relative">
                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search downloads..."
                            className="w-full h-10 pl-10 pr-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select 
                        value={filter} 
                        onChange={e => setFilter(e.target.value)}
                        className="px-4 h-10 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All</option>
                        <option value="video">Videos</option>
                        <option value="audio">Audio</option>
                        <option value="subtitle">Subtitles</option>
                    </select>
                </div>
                
                {/* History List */}
                <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                    {filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <p className="text-sm">
                                {searchQuery ? 'No matching downloads found' : 'No download history'}
                            </p>
                        </div>
                    ) : (
                        filteredHistory.map(item => (
                            <HistoryItem 
                                key={item.id} 
                                item={item}
                                formatSize={formatSize}
                                formatDate={formatDate}
                                getTypeIcon={getTypeIcon}
                                onRedownload={() => onRedownload?.(item)}
                                onOpenFolder={() => onOpenFolder?.(item.filePath)}
                                onDelete={() => onDelete?.(item.id)}
                            />
                        ))
                    )}
                </div>
                
                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between flex-shrink-0">
                    {history.length > 0 && (
                        <button 
                            onClick={onClearAll}
                            className="text-sm text-red-500 hover:text-red-600 font-medium"
                        >
                            Clear All History
                        </button>
                    )}
                    <div className="flex-1" />
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
}

/**
 * HistoryItem Component
 */
function HistoryItem({ 
    item, 
    formatSize, 
    formatDate, 
    getTypeIcon,
    onRedownload, 
    onOpenFolder, 
    onDelete 
}) {
    const [proxiedThumbnail, setProxiedThumbnail] = useState(null);
    const [imageError, setImageError] = useState(false);

    // Proxy Bilibili thumbnails to bypass anti-hotlinking
    useEffect(() => {
        const proxyThumbnail = async () => {
            if (!item?.thumbnail) {
                setProxiedThumbnail(null);
                return;
            }
            
            const thumbnail = item.thumbnail;
            // Check if it's a Bilibili image that needs proxying
            if (thumbnail.includes('hdslb.com') || thumbnail.includes('bilibili.com')) {
                try {
                    const proxyUrl = await window.api.getImageProxyUrl(thumbnail);
                    setProxiedThumbnail(proxyUrl);
                } catch (err) {
                    console.error('Failed to proxy thumbnail:', err);
                    setProxiedThumbnail(null);
                }
            } else {
                setProxiedThumbnail(thumbnail);
            }
        };
        
        proxyThumbnail();
    }, [item?.thumbnail]);

    // Detect platform from URL
    const detectPlatform = () => {
        if (item.platform) return item.platform;
        const url = item.url || '';
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('bilibili.com')) return 'bilibili';
        if (url.includes('douyin.com')) return 'douyin';
        if (url.includes('tiktok.com')) return 'tiktok';
        if (url.includes('vimeo.com')) return 'vimeo';
        if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
        if (url.includes('soundcloud.com')) return 'soundcloud';
        return 'unknown';
    };

    const hasFilePath = item.filePath && item.filePath.length > 0;

    return (
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
            {/* Thumbnail */}
            {proxiedThumbnail && !imageError ? (
                <img 
                    src={proxiedThumbnail} 
                    alt={item.title}
                    onError={() => setImageError(true)}
                    className="w-14 h-9 object-cover rounded flex-shrink-0"
                />
            ) : (
                <div className="w-14 h-9 bg-slate-200 dark:bg-slate-700 rounded flex-shrink-0 flex items-center justify-center text-slate-400">
                    {getTypeIcon(item.type)}
                </div>
            )}
            
            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <PlatformBadge platform={detectPlatform()} size="sm" />
                    <span className="text-xs text-slate-400 capitalize">{item.type}</span>
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                    {item.title}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    {item.quality && <span>{item.quality}</span>}
                    {item.fileSize > 0 && (
                        <>
                            <span>•</span>
                            <span>{formatSize(item.fileSize)}</span>
                        </>
                    )}
                    {item.downloadedAt && (
                        <>
                            <span>•</span>
                            <span>{formatDate(item.downloadedAt)}</span>
                        </>
                    )}
                </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={onRedownload}
                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="Re-download"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                </button>
                <button 
                    onClick={onOpenFolder}
                    disabled={!hasFilePath}
                    className={`p-1.5 rounded transition-colors ${
                        hasFilePath 
                            ? 'text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20' 
                            : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    }`}
                    title={hasFilePath ? "Open folder" : "File path not available"}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
                    </svg>
                </button>
                <button 
                    onClick={onDelete}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    title="Delete"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </div>
        </div>
    );
}

export default HistoryDialog;
