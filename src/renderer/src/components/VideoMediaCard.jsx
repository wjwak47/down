import { useState, useMemo, useEffect } from 'react';
import { PlatformBadge } from './PlatformBadge';

/**
 * VideoMediaCard Component - Redesigned to match ProFlow Studio style
 */
function VideoMediaCard({ 
    videoInfo, 
    onDownload,
    isDownloading = false 
}) {
    const [activeTab, setActiveTab] = useState('video');
    const [selectedVideoQuality, setSelectedVideoQuality] = useState(null);
    const [selectedAudioQuality, setSelectedAudioQuality] = useState(null);
    const [selectedVideoFormat, setSelectedVideoFormat] = useState('mp4');
    const [selectedAudioFormat, setSelectedAudioFormat] = useState('m4a');
    const [imageError, setImageError] = useState(false);
    const [proxiedThumbnail, setProxiedThumbnail] = useState(null);

    if (!videoInfo) return null;

    // Extract video qualities from formats
    const videoQualities = useMemo(() => {
        if (!videoInfo.formats) return [];
        const qualityMap = new Map();
        
        for (const format of videoInfo.formats) {
            if (format.vcodec === 'none' || format.resolution === 'audio only') continue;
            
            let height = format.height;
            if (!height && format.resolution) {
                const match = format.resolution.match(/(\d+)x(\d+)/);
                if (match) height = parseInt(match[2], 10);
            }
            if (!height && format.format_note) {
                const noteMatch = format.format_note.match(/(\d+)p/i);
                if (noteMatch) height = parseInt(noteMatch[1], 10);
            }
            
            if (!height || height <= 0) continue;

            const label = height >= 2160 ? '4K' : height >= 1440 ? '2K' : `${height}p`;
            const filesize = format.filesize || format.filesize_approx;
            
            if (!qualityMap.has(height) || (filesize && filesize > (qualityMap.get(height).filesize || 0))) {
                qualityMap.set(height, {
                    height,
                    label,
                    formatId: format.format_id,
                    filesize,
                    fps: format.fps,
                    ext: format.ext
                });
            }
        }
        
        return Array.from(qualityMap.values()).sort((a, b) => b.height - a.height);
    }, [videoInfo.formats]);

    // Extract audio qualities
    const audioQualities = useMemo(() => {
        if (!videoInfo.formats) return [];
        const qualityMap = new Map();
        
        for (const format of videoInfo.formats) {
            if (format.vcodec !== 'none' && format.resolution !== 'audio only') continue;
            if (!format.abr && !format.asr) continue;
            
            const bitrate = format.abr || Math.round((format.asr || 44100) / 1000);
            const label = `${bitrate}kbps`;
            const filesize = format.filesize || format.filesize_approx;
            
            if (!qualityMap.has(bitrate)) {
                qualityMap.set(bitrate, {
                    bitrate,
                    label,
                    formatId: format.format_id,
                    filesize,
                    ext: format.ext
                });
            }
        }
        
        const qualities = Array.from(qualityMap.values()).sort((a, b) => b.bitrate - a.bitrate);
        
        if (qualities.length === 0) {
            return [
                { bitrate: 320, label: '320kbps', formatId: 'bestaudio', filesize: null },
                { bitrate: 256, label: '256kbps', formatId: 'bestaudio', filesize: null },
                { bitrate: 128, label: '128kbps', formatId: 'bestaudio', filesize: null }
            ];
        }
        
        return qualities;
    }, [videoInfo.formats]);

    // Auto-select best quality
    useEffect(() => {
        if (videoQualities.length > 0 && !selectedVideoQuality) {
            setSelectedVideoQuality(videoQualities[0]);
        }
        if (audioQualities.length > 0 && !selectedAudioQuality) {
            setSelectedAudioQuality(audioQualities[0]);
        }
    }, [videoQualities, audioQualities]);

    // Proxy Bilibili thumbnails to bypass anti-hotlinking
    useEffect(() => {
        const proxyThumbnail = async () => {
            if (!videoInfo?.thumbnail) {
                setProxiedThumbnail(null);
                return;
            }
            
            const thumbnail = videoInfo.thumbnail;
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
    }, [videoInfo?.thumbnail]);

    const formatFileSize = (bytes) => {
        if (!bytes) return 'Unknown';
        const MB = 1024 * 1024;
        const GB = MB * 1024;
        if (bytes >= GB) return `${(bytes / GB).toFixed(2)} GB`;
        return `${(bytes / MB).toFixed(1)} MB`;
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const formatViewCount = (count) => {
        if (!count) return '';
        if (count >= 1000000000) return `${(count / 1000000000).toFixed(1)}B`;
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    const platform = useMemo(() => {
        const extractor = (videoInfo.extractor || videoInfo.extractor_key || '').toLowerCase();
        if (extractor.includes('youtube')) return 'youtube';
        if (extractor.includes('bilibili')) return 'bilibili';
        if (extractor.includes('douyin')) return 'douyin';
        if (extractor.includes('tiktok')) return 'tiktok';
        if (extractor.includes('vimeo')) return 'vimeo';
        if (extractor.includes('twitter')) return 'twitter';
        return 'unknown';
    }, [videoInfo]);

    // Detect available formats from actual video info
    const availableVideoFormats = useMemo(() => {
        if (!videoInfo.formats || videoInfo.formats.length === 0) {
            // If no format info, assume MP4 is available (most common)
            return ['mp4'];
        }
        
        const formats = new Set();
        for (const format of videoInfo.formats) {
            // Skip audio-only formats
            if (format.vcodec === 'none' || format.resolution === 'audio only') continue;
            
            const ext = (format.ext || '').toLowerCase();
            if (ext && ['mp4', 'webm', 'mkv', 'flv', 'avi', 'mov'].includes(ext)) {
                formats.add(ext);
            }
        }
        
        // If no video formats found, default to mp4
        if (formats.size === 0) {
            formats.add('mp4');
        }
        
        // Return in preferred order
        const orderedFormats = [];
        for (const fmt of ['mp4', 'webm', 'mkv']) {
            if (formats.has(fmt)) orderedFormats.push(fmt);
        }
        // Add any other formats
        for (const fmt of formats) {
            if (!orderedFormats.includes(fmt)) orderedFormats.push(fmt);
        }
        
        return orderedFormats;
    }, [videoInfo.formats]);

    const availableAudioFormats = useMemo(() => {
        if (!videoInfo.formats || videoInfo.formats.length === 0) {
            return ['m4a'];
        }
        
        const formats = new Set();
        for (const format of videoInfo.formats) {
            // Only audio formats
            if (format.vcodec !== 'none' && format.resolution !== 'audio only') continue;
            
            const ext = (format.ext || '').toLowerCase();
            if (ext && ['m4a', 'mp3', 'wav', 'aac', 'ogg', 'flac', 'webm'].includes(ext)) {
                formats.add(ext);
            }
        }
        
        // If no audio formats found, default to m4a
        if (formats.size === 0) {
            formats.add('m4a');
        }
        
        // Return in preferred order
        const orderedFormats = [];
        for (const fmt of ['m4a', 'mp3', 'wav']) {
            if (formats.has(fmt)) orderedFormats.push(fmt);
        }
        // Add any other formats
        for (const fmt of formats) {
            if (!orderedFormats.includes(fmt)) orderedFormats.push(fmt);
        }
        
        return orderedFormats;
    }, [videoInfo.formats]);

    // Auto-select first available format if current selection is not available
    useEffect(() => {
        if (!availableVideoFormats.includes(selectedVideoFormat)) {
            setSelectedVideoFormat(availableVideoFormats[0]);
        }
    }, [availableVideoFormats, selectedVideoFormat]);

    useEffect(() => {
        if (!availableAudioFormats.includes(selectedAudioFormat)) {
            setSelectedAudioFormat(availableAudioFormats[0]);
        }
    }, [availableAudioFormats, selectedAudioFormat]);

    const duration = videoInfo.duration_string || formatDuration(videoInfo.duration);

    const handleDownload = () => {
        if (activeTab === 'video') {
            onDownload?.('video', {
                quality: selectedVideoQuality,
                format: selectedVideoFormat
            });
        } else {
            onDownload?.('audio', {
                quality: selectedAudioQuality,
                format: selectedAudioFormat
            });
        }
    };

    const videoFormats = ['mp4', 'webm', 'mkv'];
    const audioFormats = ['m4a', 'mp3', 'wav'];

    return (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Video Info Header */}
            <div className="p-5 border-b border-slate-200/60 dark:border-slate-700/60">
                <div className="flex gap-4">
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0">
                        {!imageError && proxiedThumbnail ? (
                            <img 
                                src={proxiedThumbnail} 
                                alt={videoInfo.title}
                                onError={() => setImageError(true)}
                                className="w-44 h-24 object-cover rounded-xl"
                            />
                        ) : (
                            <div className="w-44 h-24 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400 text-3xl">movie</span>
                            </div>
                        )}
                        {duration && (
                            <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/75 text-white text-[10px] rounded font-medium">
                                {duration}
                            </div>
                        )}
                        <div className="absolute top-1.5 left-1.5">
                            <PlatformBadge platform={platform} size="sm" />
                        </div>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-2 line-clamp-2 leading-snug">
                            {videoInfo.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                            {(videoInfo.uploader || videoInfo.channel) && (
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">person</span>
                                    {videoInfo.uploader || videoInfo.channel}
                                </span>
                            )}
                            {videoInfo.view_count > 0 && (
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                    {formatViewCount(videoInfo.view_count)} views
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30">
                <button
                    onClick={() => setActiveTab('video')}
                    className={`flex-1 py-2.5 px-4 text-xs font-semibold transition-all flex items-center justify-center gap-1.5
                        ${activeTab === 'video' 
                            ? 'text-[#2196F3] border-b-2 border-[#2196F3] bg-white dark:bg-slate-800' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <span className="material-symbols-outlined text-base">movie</span>
                    Video
                </button>
                <button
                    onClick={() => setActiveTab('audio')}
                    className={`flex-1 py-2.5 px-4 text-xs font-semibold transition-all flex items-center justify-center gap-1.5
                        ${activeTab === 'audio' 
                            ? 'text-[#2196F3] border-b-2 border-[#2196F3] bg-white dark:bg-slate-800' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <span className="material-symbols-outlined text-base">music_note</span>
                    Audio
                </button>
            </div>

            {/* Content Area */}
            <div className="p-5">
                {activeTab === 'video' ? (
                    <div className="space-y-4">
                        {/* Quality Selection */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Quality</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {videoQualities.length > 0 ? videoQualities.slice(0, 6).map((q, idx) => (
                                    <button
                                        key={q.height}
                                        onClick={() => setSelectedVideoQuality(q)}
                                        className={`p-2.5 rounded-xl border-2 transition-all text-left bg-white dark:bg-slate-800
                                            ${selectedVideoQuality?.height === q.height
                                                ? 'border-[#2196F3]'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`text-sm font-semibold ${selectedVideoQuality?.height === q.height ? 'text-[#2196F3]' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {q.label}
                                            </span>
                                            {idx === 0 && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded font-semibold">
                                                    BEST
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            {q.fps && q.fps > 30 ? `${q.fps}fps · ` : ''}{formatFileSize(q.filesize)}
                                        </div>
                                    </button>
                                )) : (
                                    <div className="col-span-full p-3 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                        Best quality will be used
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Format Selection */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Format</h3>
                            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                {videoFormats.map(fmt => {
                                    const isAvailable = availableVideoFormats.includes(fmt);
                                    return (
                                        <button
                                            key={fmt}
                                            onClick={() => {
                                                if (isAvailable) {
                                                    setSelectedVideoFormat(fmt);
                                                }
                                            }}
                                            disabled={!isAvailable}
                                            title={!isAvailable ? `${fmt.toUpperCase()} format is not available for ${platform === 'bilibili' ? 'Bilibili' : platform}` : ''}
                                            className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all
                                                ${!isAvailable
                                                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                                    : selectedVideoFormat === fmt
                                                        ? 'bg-white dark:bg-slate-700 text-[#2196F3] shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            {fmt.toUpperCase()}
                                            {!isAvailable && <span className="ml-1 text-[8px]">✕</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            {availableVideoFormats.length === 1 && (
                                <p className="text-[10px] text-slate-400 mt-1.5">
                                    Only {availableVideoFormats[0].toUpperCase()} is available for this platform
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Audio Quality Selection */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Quality</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {audioQualities.map((q, idx) => (
                                    <button
                                        key={q.bitrate}
                                        onClick={() => setSelectedAudioQuality(q)}
                                        className={`p-2.5 rounded-xl border-2 transition-all text-left bg-white dark:bg-slate-800
                                            ${selectedAudioQuality?.bitrate === q.bitrate
                                                ? 'border-[#2196F3]'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`text-sm font-semibold ${selectedAudioQuality?.bitrate === q.bitrate ? 'text-[#2196F3]' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {q.label}
                                            </span>
                                            {idx === 0 && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded font-semibold">
                                                    BEST
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-400">
                                            {formatFileSize(q.filesize)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Audio Format Selection */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Format</h3>
                            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                {audioFormats.map(fmt => {
                                    const isAvailable = availableAudioFormats.includes(fmt);
                                    return (
                                        <button
                                            key={fmt}
                                            onClick={() => {
                                                if (isAvailable) {
                                                    setSelectedAudioFormat(fmt);
                                                }
                                            }}
                                            disabled={!isAvailable}
                                            title={!isAvailable ? `${fmt.toUpperCase()} format is not available for ${platform === 'bilibili' ? 'Bilibili' : platform}` : ''}
                                            className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all
                                                ${!isAvailable
                                                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                                    : selectedAudioFormat === fmt
                                                        ? 'bg-white dark:bg-slate-700 text-[#2196F3] shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                                }`}
                                        >
                                            {fmt.toUpperCase()}
                                            {!isAvailable && <span className="ml-1 text-[8px]">✕</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            {availableAudioFormats.length === 1 && (
                                <p className="text-[10px] text-slate-400 mt-1.5">
                                    Only {availableAudioFormats[0].toUpperCase()} is available for this platform
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="flex gap-2">
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] text-white font-medium text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        {activeTab === 'video' ? 'Download Video' : 'Download Audio'}
                    </button>
                    <button
                        onClick={() => onDownload?.('subtitle')}
                        disabled={isDownloading}
                        className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                        title="Download Subtitles"
                    >
                        <span className="material-symbols-outlined text-lg">subtitles</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default VideoMediaCard;
