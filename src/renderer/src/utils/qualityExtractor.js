/**
 * Quality Extractor Utility (Renderer Process)
 * Extracts and organizes video quality options from yt-dlp formats array
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

function extractHeightFromResolution(resolution) {
    if (!resolution || typeof resolution !== 'string') return null;
    const match = resolution.match(/(\d+)x(\d+)/);
    if (match) return parseInt(match[2], 10);
    const heightMatch = resolution.match(/(\d+)p?/i);
    if (heightMatch) return parseInt(heightMatch[1], 10);
    return null;
}

function getQualityLabel(height) {
    if (QUALITY_LABELS[height]) return QUALITY_LABELS[height];
    if (height >= 2160) return '4K';
    if (height >= 1440) return '2K';
    return `${height}p`;
}

function shouldReplaceFormat(existing, newFormat) {
    if (newFormat.acodec !== 'none' && existing.acodec === 'none') return true;
    if (newFormat.acodec === 'none' && existing.acodec !== 'none') return false;
    if (newFormat.tbr && existing.tbr && newFormat.tbr > existing.tbr) return true;
    if (newFormat.ext === 'mp4' && existing.ext !== 'mp4') return true;
    return false;
}

export function extractQualities(formats) {
    if (!formats || !Array.isArray(formats) || formats.length === 0) {
        return [];
    }

    const qualityMap = new Map();

    for (const format of formats) {
        // Skip audio-only formats
        if (format.vcodec === 'none' || format.resolution === 'audio only') continue;
        
        // Skip formats without video codec
        if (!format.vcodec) continue;

        // Try to get height from multiple sources
        let height = format.height;
        if (!height && format.resolution) {
            height = extractHeightFromResolution(format.resolution);
        }
        if (!height && format.format_note) {
            // Try to extract from format_note like "1080p", "720p60"
            const noteMatch = format.format_note.match(/(\d+)p/i);
            if (noteMatch) height = parseInt(noteMatch[1], 10);
        }
        
        if (!height || height <= 0) continue;

        const label = getQualityLabel(height);
        const filesize = format.filesize || format.filesize_approx || null;
        const key = height;

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
                tbr: format.tbr
            });
        }
    }

    return Array.from(qualityMap.values()).sort((a, b) => b.height - a.height);
}

export function formatFileSize(bytes) {
    if (!bytes || typeof bytes !== 'number' || bytes <= 0) return null;
    const KB = 1024;
    const MB = KB * 1024;
    const GB = MB * 1024;
    if (bytes < MB) return `${(bytes / KB).toFixed(0)} KB`;
    if (bytes < GB) return `${(bytes / MB).toFixed(1)} MB`;
    return `${(bytes / GB).toFixed(2)} GB`;
}

export function getQualityOptions(formats) {
    const qualities = extractQualities(formats);
    return qualities.map(q => ({
        ...q,
        displayLabel: q.label + (q.fps && q.fps > 30 ? ` ${q.fps}fps` : ''),
        displaySize: formatFileSize(q.filesize),
        value: q.formatId
    }));
}

export function getBestQuality(formats) {
    const qualities = extractQualities(formats);
    return qualities.length > 0 ? qualities[0] : null;
}

export function hasQualityOptions(formats) {
    return extractQualities(formats).length > 0;
}

export default {
    extractQualities,
    getQualityOptions,
    getBestQuality,
    hasQualityOptions,
    formatFileSize
};
