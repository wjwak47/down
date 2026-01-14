/**
 * Progress Parser Module
 * Parses yt-dlp progress output to extract percentage, speed, and ETA
 * 
 * This module is extracted for testability and can be used independently
 * of the Electron main process.
 */

/**
 * Parse yt-dlp progress output to extract percentage, speed, and ETA
 * @param {string} output - Raw yt-dlp stdout output
 * @returns {Object} Parsed progress data with percent, speed, eta, downloaded, total
 */
export function parseProgress(output) {
    const result = {
        percent: null,
        speed: null,
        eta: null,
        downloaded: null,
        total: null
    };

    if (!output || typeof output !== 'string') {
        return result;
    }

    // Parse percentage: "45.3%" or "[download]  45.3% of"
    const percentMatch = output.match(/(\d+\.?\d*)%/);
    if (percentMatch) {
        result.percent = parseFloat(percentMatch[1]);
    }

    // Parse speed: "1.23MiB/s" or "500KiB/s" or "2.5GiB/s"
    const speedMatch = output.match(/([\d.]+)\s*(MiB|KiB|GiB)\/s/i);
    if (speedMatch) {
        const value = parseFloat(speedMatch[1]);
        const unit = speedMatch[2].toLowerCase();
        result.speed = formatSpeed(value, unit);
    }

    // Parse ETA: "ETA 01:23" or "ETA 00:45" or "ETA 01:23:45"
    const etaMatch = output.match(/ETA\s*(\d+:\d+(?::\d+)?)/i);
    if (etaMatch) {
        result.eta = etaMatch[1];
    }

    // Parse downloaded/total: "10.5MiB of 100MiB" or "10.5MiB of ~100MiB"
    const sizeMatch = output.match(/([\d.]+)\s*(MiB|KiB|GiB)\s*of\s*~?([\d.]+)\s*(MiB|KiB|GiB)/i);
    if (sizeMatch) {
        result.downloaded = formatSize(parseFloat(sizeMatch[1]), sizeMatch[2]);
        result.total = formatSize(parseFloat(sizeMatch[3]), sizeMatch[4]);
    }

    return result;
}

/**
 * Format speed value to MB/s
 * @param {number} value - Speed value
 * @param {string} unit - Unit (kib, mib, gib)
 * @returns {string} Formatted speed string
 */
export function formatSpeed(value, unit) {
    const unitLower = unit.toLowerCase();
    if (unitLower === 'kib') return `${(value / 1024).toFixed(2)} MB/s`;
    if (unitLower === 'mib') return `${value.toFixed(2)} MB/s`;
    if (unitLower === 'gib') return `${(value * 1024).toFixed(2)} MB/s`;
    return `${value} ${unit}/s`;
}

/**
 * Format size value to appropriate unit (KB/MB/GB)
 * @param {number} value - Size value
 * @param {string} unit - Unit (kib, mib, gib)
 * @returns {string} Formatted size string
 */
export function formatSize(value, unit) {
    // Convert to bytes first
    let inBytes = value;
    const unitLower = unit.toLowerCase();
    if (unitLower === 'kib') inBytes = value * 1024;
    if (unitLower === 'mib') inBytes = value * 1024 * 1024;
    if (unitLower === 'gib') inBytes = value * 1024 * 1024 * 1024;

    if (inBytes < 1024 * 1024) return `${(inBytes / 1024).toFixed(1)} KB`;
    if (inBytes < 1024 * 1024 * 1024) return `${(inBytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(inBytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export default { parseProgress, formatSpeed, formatSize };
