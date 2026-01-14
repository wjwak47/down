/**
 * File Size Extractor Utility
 * Extracts and formats file size information from yt-dlp video info
 */

/**
 * Extract file size from video info with fallback logic
 * Priority: filesize > filesize_approx > formats array
 * 
 * @param {Object} videoInfo - Raw video info from yt-dlp
 * @returns {number|null} File size in bytes, or null if unavailable
 */
export function extractFileSize(videoInfo) {
    if (!videoInfo) return null;

    // Priority 1: Direct filesize
    if (videoInfo.filesize && typeof videoInfo.filesize === 'number' && videoInfo.filesize > 0) {
        return videoInfo.filesize;
    }

    // Priority 2: Approximate filesize
    if (videoInfo.filesize_approx && typeof videoInfo.filesize_approx === 'number' && videoInfo.filesize_approx > 0) {
        return videoInfo.filesize_approx;
    }

    // Priority 3: Search in formats array
    if (videoInfo.formats && Array.isArray(videoInfo.formats) && videoInfo.formats.length > 0) {
        // Try to find the best format with filesize (prefer larger/better quality)
        // Sort by filesize descending to get the largest (usually best quality)
        const formatsWithSize = videoInfo.formats
            .filter(f => (f.filesize && f.filesize > 0) || (f.filesize_approx && f.filesize_approx > 0))
            .sort((a, b) => {
                const sizeA = a.filesize || a.filesize_approx || 0;
                const sizeB = b.filesize || b.filesize_approx || 0;
                return sizeB - sizeA;
            });

        if (formatsWithSize.length > 0) {
            const bestFormat = formatsWithSize[0];
            return bestFormat.filesize || bestFormat.filesize_approx;
        }
    }

    return null;
}

/**
 * Format file size in bytes to human-readable string
 * 
 * @param {number|null} bytes - File size in bytes
 * @returns {string|null} Formatted size string (e.g., "1.5 MB", "2.3 GB"), or null if unavailable
 */
export function formatFileSize(bytes) {
    if (bytes === null || bytes === undefined || typeof bytes !== 'number' || bytes <= 0) {
        return null;
    }

    const KB = 1024;
    const MB = KB * 1024;
    const GB = MB * 1024;

    if (bytes < KB) {
        return `${bytes} B`;
    } else if (bytes < MB) {
        return `${(bytes / KB).toFixed(1)} KB`;
    } else if (bytes < GB) {
        return `${(bytes / MB).toFixed(1)} MB`;
    } else {
        return `${(bytes / GB).toFixed(2)} GB`;
    }
}

/**
 * Extract and format file size from video info
 * Returns null if size is unavailable (instead of "Unknown")
 * 
 * @param {Object} videoInfo - Raw video info from yt-dlp
 * @returns {string|null} Formatted size string, or null if unavailable
 */
export function getFormattedFileSize(videoInfo) {
    const bytes = extractFileSize(videoInfo);
    return formatFileSize(bytes);
}

/**
 * Check if file size is available
 * 
 * @param {Object} videoInfo - Raw video info from yt-dlp
 * @returns {boolean} True if file size can be determined
 */
export function hasFileSize(videoInfo) {
    return extractFileSize(videoInfo) !== null;
}

export default {
    extractFileSize,
    formatFileSize,
    getFormattedFileSize,
    hasFileSize
};
