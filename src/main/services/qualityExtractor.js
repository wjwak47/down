/**
 * Quality Extractor Utility
 * Extracts and organizes video quality options from yt-dlp formats array
 */

/**
 * Standard quality labels mapping
 */
const QUALITY_LABELS = {
    2160: '4K',
    1440: '2K',
    1080: '1080p',
    720: '720p',
    480: '480p',
    360: '360p',
    240: '240p',
    144: '144p'
};

/**
 * Bilibili quality labels (Chinese)
 */
const BILIBILI_QUALITY_LABELS = {
    127: '8K 超高清',
    126: '杜比视界',
    125: 'HDR 真彩',
    120: '4K 超清',
    116: '1080P 60帧',
    112: '1080P 高码率',
    80: '1080P 高清',
    74: '720P 60帧',
    64: '720P 高清',
    32: '480P 清晰',
    16: '360P 流畅'
};

/**
 * Extract quality options from formats array
 * 
 * @param {Array} formats - yt-dlp formats array
 * @returns {Array} Array of quality options sorted by resolution (highest first)
 */
export function extractQualities(formats) {
    if (!formats || !Array.isArray(formats) || formats.length === 0) {
        return [];
    }

    const qualityMap = new Map();

    for (const format of formats) {
        // Skip audio-only formats
        if (format.vcodec === 'none' || format.resolution === 'audio only') {
            continue;
        }

        // Get height (resolution)
        const height = format.height || extractHeightFromResolution(format.resolution);
        if (!height || height <= 0) continue;

        // Get quality label
        const label = getQualityLabel(height, format);

        // Get file size
        const filesize = format.filesize || format.filesize_approx || null;

        // Create quality key (use height as key to deduplicate)
        const key = height;

        // Keep the best format for each quality level
        if (!qualityMap.has(key) || shouldReplaceFormat(qualityMap.get(key), format)) {
            qualityMap.set(key, {
                height,
                label,
                formatId: format.format_id,
                ext: format.ext || 'mp4',
                filesize,
                vcodec: format.vcodec,
                acodec: format.acodec,
                fps: format.fps,
                tbr: format.tbr, // Total bitrate
                format_note: format.format_note
            });
        }
    }

    // Convert to array and sort by height (descending)
    const qualities = Array.from(qualityMap.values())
        .sort((a, b) => b.height - a.height);

    return qualities;
}

/**
 * Extract height from resolution string (e.g., "1920x1080" -> 1080)
 */
function extractHeightFromResolution(resolution) {
    if (!resolution || typeof resolution !== 'string') return null;
    const match = resolution.match(/(\d+)x(\d+)/);
    if (match) return parseInt(match[2], 10);
    // Try to match just a number (e.g., "1080p")
    const heightMatch = resolution.match(/(\d+)p?/i);
    if (heightMatch) return parseInt(heightMatch[1], 10);
    return null;
}

/**
 * Get quality label for a given height
 */
function getQualityLabel(height, format) {
    // Check for Bilibili quality ID
    if (format.quality && BILIBILI_QUALITY_LABELS[format.quality]) {
        return BILIBILI_QUALITY_LABELS[format.quality];
    }

    // Standard quality labels
    if (QUALITY_LABELS[height]) {
        return QUALITY_LABELS[height];
    }

    // Generate label based on height
    if (height >= 2160) return '4K';
    if (height >= 1440) return '2K';
    return `${height}p`;
}

/**
 * Determine if new format should replace existing one
 * Prefer: higher bitrate, better codec, has audio
 */
function shouldReplaceFormat(existing, newFormat) {
    // Prefer format with audio
    if (newFormat.acodec !== 'none' && existing.acodec === 'none') return true;
    if (newFormat.acodec === 'none' && existing.acodec !== 'none') return false;

    // Prefer higher bitrate
    if (newFormat.tbr && existing.tbr && newFormat.tbr > existing.tbr) return true;

    // Prefer mp4 over other formats
    if (newFormat.ext === 'mp4' && existing.ext !== 'mp4') return true;

    return false;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes) {
    if (!bytes || typeof bytes !== 'number' || bytes <= 0) return null;

    const KB = 1024;
    const MB = KB * 1024;
    const GB = MB * 1024;

    if (bytes < MB) return `${(bytes / KB).toFixed(0)} KB`;
    if (bytes < GB) return `${(bytes / MB).toFixed(1)} MB`;
    return `${(bytes / GB).toFixed(2)} GB`;
}

/**
 * Get quality options with formatted display strings
 * 
 * @param {Array} formats - yt-dlp formats array
 * @returns {Array} Array of quality options with display strings
 */
export function getQualityOptions(formats) {
    const qualities = extractQualities(formats);

    return qualities.map(q => ({
        ...q,
        displayLabel: q.label + (q.fps && q.fps > 30 ? ` ${q.fps}fps` : ''),
        displaySize: formatFileSize(q.filesize),
        value: q.formatId
    }));
}

/**
 * Get the best (highest) quality option
 * 
 * @param {Array} formats - yt-dlp formats array
 * @returns {Object|null} Best quality option or null
 */
export function getBestQuality(formats) {
    const qualities = extractQualities(formats);
    return qualities.length > 0 ? qualities[0] : null;
}

/**
 * Get quality by height
 * 
 * @param {Array} formats - yt-dlp formats array
 * @param {number} targetHeight - Target resolution height
 * @returns {Object|null} Quality option or null
 */
export function getQualityByHeight(formats, targetHeight) {
    const qualities = extractQualities(formats);
    return qualities.find(q => q.height === targetHeight) || null;
}

/**
 * Check if formats array has quality options
 * 
 * @param {Array} formats - yt-dlp formats array
 * @returns {boolean} True if quality options are available
 */
export function hasQualityOptions(formats) {
    return extractQualities(formats).length > 0;
}

export default {
    extractQualities,
    getQualityOptions,
    getBestQuality,
    getQualityByHeight,
    hasQualityOptions,
    formatFileSize
};
