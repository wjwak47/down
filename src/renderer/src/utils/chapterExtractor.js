/**
 * Chapter Extractor Utility (Renderer Process)
 * Extracts and formats chapter information from video info
 * 
 * Requirements: 9.1
 */

/**
 * Extract chapters from video info
 * @param {Object} videoInfo - Video info object from yt-dlp
 * @returns {Array} Array of chapter objects
 */
export function extractChapters(videoInfo) {
    if (!videoInfo) return [];
    
    const chapters = [];
    
    if (videoInfo.chapters && Array.isArray(videoInfo.chapters)) {
        for (let i = 0; i < videoInfo.chapters.length; i++) {
            const chapter = videoInfo.chapters[i];
            const startTime = chapter.start_time || 0;
            const endTime = chapter.end_time || (videoInfo.chapters[i + 1]?.start_time || videoInfo.duration || 0);
            
            chapters.push({
                index: i + 1,
                title: chapter.title || `Chapter ${i + 1}`,
                start_time: startTime,
                end_time: endTime,
                duration: endTime - startTime,
                start_time_string: formatTime(startTime),
                end_time_string: formatTime(endTime),
                duration_string: formatDuration(endTime - startTime)
            });
        }
    }
    
    return chapters;
}

/**
 * Format time in seconds to HH:MM:SS or MM:SS
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds)) return '00:00';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Format duration in seconds
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '--:--';
    
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    
    return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Check if video has chapters
 * @param {Object} videoInfo - Video info object
 * @returns {boolean} True if video has chapters
 */
export function hasChapters(videoInfo) {
    return videoInfo?.chapters && Array.isArray(videoInfo.chapters) && videoInfo.chapters.length > 0;
}

export default {
    extractChapters,
    formatTime,
    formatDuration,
    hasChapters
};
