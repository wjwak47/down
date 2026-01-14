import { useState, useMemo, useCallback } from 'react';
import { PlatformBadge } from './PlatformBadge';

/**
 * PlaylistSelector Component
 * Displays playlist videos with selection controls for batch download
 */
function PlaylistSelector({ 
    playlist, 
    onDownload, 
    onCancel,
    isDownloading = false 
}) {
    const [selectedItems, setSelectedItems] = useState(new Set());

    // Calculate select all state
    const selectAllState = useMemo(() => {
        if (!playlist?.entries?.length) return 'none';
        if (selectedItems.size === 0) return 'none';
        if (selectedItems.size === playlist.entries.length) return 'all';
        return 'partial';
    }, [selectedItems.size, playlist?.entries?.length]);

    // Toggle select all
    const toggleSelectAll = useCallback(() => {
        if (selectAllState === 'all') {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(playlist.entries.map(e => e.id || e.url)));
        }
    }, [selectAllState, playlist?.entries]);

    // Toggle single item
    const toggleItem = useCallback((id) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    // Format duration
    const formatDuration = (seconds) => {
        if (!seconds) return '';
        if (typeof seconds === 'string') return seconds;
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Detect platform
    const detectPlatform = () => {
        if (playlist?.platform) return playlist.platform;
        const url = playlist?.webpage_url || playlist?.url || '';
        if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
        if (url.includes('bilibili.com')) return 'bilibili';
        if (url.includes('douyin.com')) return 'douyin';
        if (url.includes('tiktok.com')) return 'tiktok';
        if (url.includes('vimeo.com')) return 'vimeo';
        return 'unknown';
    };

    // Handle download
    const handleDownload = () => {
        const selectedEntries = playlist.entries.filter(
            e => selectedItems.has(e.id || e.url)
        );
        onDownload?.(selectedEntries);
    };

    if (!playlist?.entries?.length) {
        return null;
    }

    const platform = detectPlatform();
    const totalDuration = playlist.entries.reduce((sum, e) => sum + (e.duration || 0), 0);

    return (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            {/* Playlist Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <PlatformBadge platform={platform} size="md" showName />
                            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                                Playlist
                            </span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-2">
                            {playlist.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                            <span>{playlist.entries.length} videos</span>
                            {totalDuration > 0 && (
                                <>
                                    <span>•</span>
                                    <span>Total: {formatDuration(totalDuration)}</span>
                                </>
                            )}
                            {playlist.uploader && (
                                <>
                                    <span>•</span>
                                    <span>{playlist.uploader}</span>
                                </>
                            )}
                        </div>
                    </div>
                    {playlist.thumbnail && (
                        <img 
                            src={playlist.thumbnail} 
                            alt={playlist.title}
                            className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                    )}
                </div>
            </div>
            
            {/* Selection Controls */}
            <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        checked={selectAllState === 'all'}
                        ref={el => {
                            if (el) el.indeterminate = selectAllState === 'partial';
                        }}
                        onChange={toggleSelectAll}
                        disabled={isDownloading}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                        Select All ({selectedItems.size}/{playlist.entries.length})
                    </span>
                </label>
                <div className="flex items-center gap-2">
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            disabled={isDownloading}
                            className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleDownload}
                        disabled={selectedItems.size === 0 || isDownloading}
                        className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {isDownloading ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                                </svg>
                                Downloading...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                </svg>
                                Download Selected
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            {/* Video List */}
            <div className="max-h-80 overflow-y-auto">
                {playlist.entries.map((entry, index) => {
                    const itemId = entry.id || entry.url;
                    const isSelected = selectedItems.has(itemId);
                    
                    return (
                        <div 
                            key={itemId}
                            onClick={() => !isDownloading && toggleItem(itemId)}
                            className={`flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer transition-colors ${
                                isSelected 
                                    ? 'bg-blue-50 dark:bg-blue-900/20' 
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                            } ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleItem(itemId)}
                                disabled={isDownloading}
                                onClick={e => e.stopPropagation()}
                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                            />
                            <span className="text-sm text-slate-400 w-8 text-center flex-shrink-0">
                                {index + 1}
                            </span>
                            {entry.thumbnail ? (
                                <img 
                                    src={entry.thumbnail} 
                                    alt={entry.title}
                                    className="w-20 h-12 object-cover rounded flex-shrink-0"
                                />
                            ) : (
                                <div className="w-20 h-12 bg-slate-200 dark:bg-slate-700 rounded flex-shrink-0 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                    </svg>
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                                    {entry.title || `Video ${index + 1}`}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {formatDuration(entry.duration)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Export helper for testing selection state consistency
export function validateSelectionState(selectedItems, totalItems) {
    const selectedCount = selectedItems instanceof Set ? selectedItems.size : selectedItems.length;
    return {
        isAllSelected: selectedCount === totalItems,
        isNoneSelected: selectedCount === 0,
        isPartialSelected: selectedCount > 0 && selectedCount < totalItems,
        selectedCount,
        totalItems
    };
}

export default PlaylistSelector;
