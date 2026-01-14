import { useState } from 'react';
import { PlatformBadge } from './PlatformBadge';
import QualitySelector from './QualitySelector';
import FormatSelector from './FormatSelector';

/**
 * EnhancedMediaCard Component
 * Displays video information with quality/format selection and download actions
 */
function EnhancedMediaCard({ 
    videoInfo, 
    onDownload, 
    selectedQuality, 
    onQualityChange,
    selectedFormat,
    onFormatChange,
    isDownloading = false 
}) {
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [imageError, setImageError] = useState(false);

    if (!videoInfo) return null;

    // Format view count
    const formatViewCount = (count) => {
        if (!count) return '';
        if (count >= 100000000) return `${(count / 100000000).toFixed(1)}亿`;
        if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    // Format duration
    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Format date
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        try {
            // Handle YYYYMMDD format
            if (/^\d{8}$/.test(dateStr)) {
                const year = dateStr.slice(0, 4);
                const month = dateStr.slice(4, 6);
                const day = dateStr.slice(6, 8);
                return `${year}-${month}-${day}`;
            }
            const date = new Date(dateStr);
            return date.toLocaleDateString();
        } catch {
            return dateStr;
        }
    };

    // Detect platform from extractor
    const detectPlatform = () => {
        const extractor = (videoInfo.extractor || videoInfo.extractor_key || '').toLowerCase();
        if (extractor.includes('youtube')) return 'youtube';
        if (extractor.includes('bilibili')) return 'bilibili';
        if (extractor.includes('douyin')) return 'douyin';
        if (extractor.includes('tiktok')) return 'tiktok';
        if (extractor.includes('vimeo')) return 'vimeo';
        if (extractor.includes('twitter') || extractor.includes('x.com')) return 'twitter';
        if (extractor.includes('soundcloud')) return 'soundcloud';
        return 'unknown';
    };

    const platform = detectPlatform();
    const duration = videoInfo.duration_string || formatDuration(videoInfo.duration);

    return (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            {/* Main Info Area */}
            <div className="flex gap-5 p-5">
                {/* Thumbnail with hover effect */}
                <div className="relative group flex-shrink-0">
                    {!imageError && videoInfo.thumbnail ? (
                        <img 
                            src={videoInfo.thumbnail} 
                            alt={videoInfo.title}
                            onError={() => setImageError(true)}
                            className="w-56 h-32 object-cover rounded-xl transition-transform group-hover:scale-[1.02]"
                        />
                    ) : (
                        <div className="w-56 h-32 bg-slate-200 dark:bg-slate-700 rounded-xl flex items-center justify-center">
                            <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                        </div>
                    )}
                    {/* Duration badge */}
                    {duration && (
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded font-medium">
                            {duration}
                        </div>
                    )}
                    {/* Platform badge */}
                    <div className="absolute top-2 left-2">
                        <PlatformBadge platform={platform} size="sm" showName />
                    </div>
                </div>
                
                {/* Info Section */}
                <div className="flex-1 min-w-0 flex flex-col">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                        {videoInfo.title}
                    </h3>
                    
                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400 mb-3">
                        {videoInfo.view_count > 0 && (
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                    <path strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                </svg>
                                {formatViewCount(videoInfo.view_count)}
                            </span>
                        )}
                        {videoInfo.upload_date && (
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                                {formatDate(videoInfo.upload_date)}
                            </span>
                        )}
                        {(videoInfo.uploader || videoInfo.channel) && (
                            <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                </svg>
                                {videoInfo.uploader || videoInfo.channel}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Description (expandable) */}
            {videoInfo.description && (
                <div className="px-5 pb-4">
                    <p className={`text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap ${!showFullDescription ? 'line-clamp-2' : ''}`}>
                        {videoInfo.description}
                    </p>
                    {videoInfo.description.length > 150 && (
                        <button 
                            onClick={() => setShowFullDescription(!showFullDescription)}
                            className="text-xs text-blue-500 hover:text-blue-600 mt-1 font-medium"
                        >
                            {showFullDescription ? 'Show less' : 'Show more'}
                        </button>
                    )}
                </div>
            )}
            
            {/* Action Area */}
            <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Format Selector */}
                    <FormatSelector 
                        type="video"
                        selectedFormat={selectedFormat}
                        onFormatChange={onFormatChange}
                        disabled={isDownloading}
                        platform={platform}
                    />
                    
                    {/* Quality Selector */}
                    <QualitySelector 
                        formats={videoInfo.formats}
                        selectedQuality={selectedQuality}
                        onQualityChange={onQualityChange}
                        disabled={isDownloading}
                    />
                    
                    {/* Download Buttons */}
                    <div className="flex gap-3 flex-1 justify-end">
                        <button 
                            onClick={() => onDownload?.('video')}
                            disabled={isDownloading}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-400 hover:from-blue-600 hover:to-blue-500 text-white rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Download Video
                        </button>
                        <button 
                            onClick={() => onDownload?.('audio')}
                            disabled={isDownloading}
                            className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Audio Only
                        </button>
                        <button 
                            onClick={() => onDownload?.('subtitle')}
                            disabled={isDownloading}
                            className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Subtitles
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EnhancedMediaCard;
