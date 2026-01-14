/**
 * Format duration in seconds to a human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string|null} Formatted duration string (MM:SS or HH:MM:SS) or null if invalid
 */
export function formatDuration(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) {
        return null;
    }
    
    const totalSeconds = Math.floor(seconds);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Parse a duration string to seconds
 * @param {string} durationStr - Duration string like "1:23" or "1:23:45"
 * @returns {number|null} Duration in seconds or null if invalid
 */
export function parseDuration(durationStr) {
    if (!durationStr || typeof durationStr !== 'string') {
        return null;
    }
    
    const match = durationStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
        return null;
    }
    
    if (match[3]) {
        // HH:MM:SS format
        return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]);
    }
    // MM:SS format
    return parseInt(match[1]) * 60 + parseInt(match[2]);
}
