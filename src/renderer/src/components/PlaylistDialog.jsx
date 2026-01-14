/**
 * PlaylistDialog Component
 * Displays playlist videos with checkboxes for batch download selection
 * 
 * Requirements: 8.1, 8.2
 */

import { useState, useEffect } from 'react';

function PlaylistDialog({ isOpen, onClose, playlist, onDownload }) {
    const [selectedVideos, setSelectedVideos] = useState(new Set());
    const [selectAll, setSelectAll] = useState(true);

    // Initialize with all videos selected
    useEffect(() => {
        if (playlist?.videos) {
            setSelectedVideos(new Set(playlist.videos.map(v => v.id)));
            setSelectAll(true);
        }
    }, [playlist]);

    if (!isOpen || !playlist) return null;

    const videos = playlist.videos || [];

    const handleToggleVideo = (videoId) => {
        setSelectedVideos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(videoId)) {
                newSet.delete(videoId);
            } else {
                newSet.add(videoId);
            }
            setSelectAll(newSet.size === videos.length);
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedVideos(new Set());
            setSelectAll(false);
        } else {
            setSelectedVideos(new Set(videos.map(v => v.id)));
            setSelectAll(true);
        }
    };

    const handleDownload = () => {
        const selected = videos.filter(v => selectedVideos.has(v.id));
        onDownload(selected);
        onClose();
    };

    const formatDuration = (duration) => {
        if (!duration) return '--:--';
        if (typeof duration === 'string') return duration;
        const h = Math.floor(duration / 3600);
        const m = Math.floor((duration % 3600) / 60);
        const s = Math.floor(duration % 60);
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                                {playlist.title || 'Playlist'}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                {videos.length} videos • {selectedVideos.size} selected
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Select All */}
                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-[#2196F3] focus:ring-[#2196F3] focus:ring-offset-0"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Select All
                        </span>
                    </label>
                </div>

                {/* Video List */}
                <div className="flex-1 overflow-auto">
                    {videos.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <p>No videos found in playlist</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {videos.map((video, index) => (
                                <label
                                    key={video.id}
                                    className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors ${
                                        selectedVideos.has(video.id)
                                            ? 'bg-blue-50 dark:bg-blue-900/20'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedVideos.has(video.id)}
                                        onChange={() => handleToggleVideo(video.id)}
                                        className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-[#2196F3] focus:ring-[#2196F3] focus:ring-offset-0 flex-shrink-0"
                                    />
                                    
                                    {/* Index */}
                                    <span className="w-8 text-sm text-slate-400 dark:text-slate-500 text-center flex-shrink-0">
                                        {video.index || index + 1}
                                    </span>

                                    {/* Thumbnail */}
                                    <div className="w-24 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                        {video.thumbnail ? (
                                            <img
                                                src={video.thumbnail}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {/* Video Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                                            {video.title}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                                            {video.uploader && (
                                                <span>{video.uploader}</span>
                                            )}
                                            {video.duration_string && (
                                                <>
                                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                                    <span>{video.duration_string}</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {selectedVideos.size} of {videos.length} videos selected
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={selectedVideos.size === 0}
                                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download {selectedVideos.size > 0 ? `(${selectedVideos.size})` : ''}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PlaylistDialog;
