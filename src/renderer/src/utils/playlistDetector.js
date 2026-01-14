/**
 * Playlist Detector Utility (Renderer Process)
 * Detects playlist URLs for YouTube and Bilibili
 * 
 * Requirements: 8.1
 */

/**
 * URL patterns for playlist detection
 */
const PLAYLIST_PATTERNS = {
    // YouTube playlist patterns
    youtube_playlist: /(?:youtube\.com|youtu\.be).*[?&]list=([a-zA-Z0-9_-]+)/,
    youtube_channel: /youtube\.com\/(?:c\/|channel\/|user\/|@)([^/?]+)/,
    
    // Bilibili collection/series patterns
    bilibili_collection: /bilibili\.com\/video\/BV[a-zA-Z0-9]+.*[?&]p=\d+/,
    bilibili_series: /space\.bilibili\.com\/\d+\/channel\/seriesdetail\?sid=(\d+)/,
    bilibili_favlist: /bilibili\.com\/medialist\/detail\/ml(\d+)/
};

/**
 * Check if a URL is a playlist URL
 * @param {string} url - URL to check
 * @returns {Object} { isPlaylist: boolean, type: string, id: string }
 */
export function isPlaylistUrl(url) {
    if (!url || typeof url !== 'string') {
        return { isPlaylist: false, type: null, id: null };
    }

    // Check YouTube playlist
    const ytPlaylistMatch = url.match(PLAYLIST_PATTERNS.youtube_playlist);
    if (ytPlaylistMatch) {
        return { isPlaylist: true, type: 'youtube_playlist', id: ytPlaylistMatch[1] };
    }

    // Check YouTube channel
    const ytChannelMatch = url.match(PLAYLIST_PATTERNS.youtube_channel);
    if (ytChannelMatch) {
        return { isPlaylist: true, type: 'youtube_channel', id: ytChannelMatch[1] };
    }

    // Check Bilibili multi-part video (分P)
    const biliCollectionMatch = url.match(PLAYLIST_PATTERNS.bilibili_collection);
    if (biliCollectionMatch) {
        return { isPlaylist: true, type: 'bilibili_multipart', id: null };
    }

    // Check Bilibili series
    const biliSeriesMatch = url.match(PLAYLIST_PATTERNS.bilibili_series);
    if (biliSeriesMatch) {
        return { isPlaylist: true, type: 'bilibili_series', id: biliSeriesMatch[1] };
    }

    // Check Bilibili favorites list
    const biliFavMatch = url.match(PLAYLIST_PATTERNS.bilibili_favlist);
    if (biliFavMatch) {
        return { isPlaylist: true, type: 'bilibili_favlist', id: biliFavMatch[1] };
    }

    return { isPlaylist: false, type: null, id: null };
}

/**
 * Get playlist type display name
 * @param {string} type - Playlist type
 * @returns {string} Display name
 */
export function getPlaylistTypeName(type) {
    const names = {
        youtube_playlist: 'YouTube Playlist',
        youtube_channel: 'YouTube Channel',
        bilibili_multipart: 'Bilibili Multi-part (分P)',
        bilibili_series: 'Bilibili Series',
        bilibili_favlist: 'Bilibili Favorites'
    };
    return names[type] || 'Playlist';
}

export default {
    isPlaylistUrl,
    getPlaylistTypeName,
    PLAYLIST_PATTERNS
};
