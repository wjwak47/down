/**
 * Chapter Extractor Service
 * Extracts chapter information from YouTube videos
 * 
 * Requirements: 9.1
 */

/**
 * Extract chapters from video info
 * @param {Object} videoInfo - Video info object from yt-dlp
 * @returns {Array} Array of chapter objects with title, start_time, end_time
 */
export function extractChapters(videoInfo) {
    if (!videoInfo) return [];
    
    const chapters = [];
    
    // yt-dlp provides chapters in the 'chapters' field
    if (videoInfo.chapters && Array.isArray(videoInfo.chapters)) {
        for (let i = 0; i < videoInfo.chapters.length; i++) {
            const chapter = videoInfo.chapters[i];
            chapters.push({
                index: i + 1,
                title: chapter.title || `Chapter ${i + 1}`,
                start_time: chapter.start_time || 0,
                end_time: chapter.end_time || (videoInfo.chapters[i + 1]?.start_time || videoInfo.duration || 0),
                duration: (chapter.end_time || videoInfo.chapters[i + 1]?.start_time || videoInfo.duration || 0) - (chapter.start_time || 0)
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
export function formatChapterTime(seconds) {
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
 * Format chapter duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export function formatChapterDuration(seconds) {
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

/**
 * Get chapter at specific time
 * @param {Array} chapters - Array of chapters
 * @param {number} time - Time in seconds
 * @returns {Object|null} Chapter at the given time or null
 */
export function getChapterAtTime(chapters, time) {
    if (!chapters || !Array.isArray(chapters)) return null;
    
    for (const chapter of chapters) {
        if (time >= chapter.start_time && time < chapter.end_time) {
            return chapter;
        }
    }
    
    return null;
}

export default {
    extractChapters,
    formatChapterTime,
    formatChapterDuration,
    hasChapters,
    getChapterAtTime
};
