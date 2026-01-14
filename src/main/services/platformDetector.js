/**
 * Platform Detector Utility
 * Detects video platform from URL and provides platform-specific information
 */

/**
 * Supported platforms with their URL patterns
 */
const PLATFORM_PATTERNS = {
    youtube: [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=/i,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\//i,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=/i,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/channel\//i,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@/i,
        /(?:https?:\/\/)?youtu\.be\//i,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\//i,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\//i,
        /(?:https?:\/\/)?music\.youtube\.com\//i
    ],
    bilibili: [
        /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/video\/[ABab][Vv]/i,
        /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/video\/av/i,
        /(?:https?:\/\/)?(?:www\.)?b23\.tv\//i,
        /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/bangumi\//i,
        /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/medialist\//i
    ],
    douyin: [
        /(?:https?:\/\/)?(?:www\.)?douyin\.com\/video\//i,
        /(?:https?:\/\/)?(?:www\.)?douyin\.com\/user\//i,
        /(?:https?:\/\/)?v\.douyin\.com\//i,
        /(?:https?:\/\/)?(?:www\.)?iesdouyin\.com\//i
    ],
    tiktok: [
        /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[^\/]+\/video\//i,
        /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/t\//i,
        /(?:https?:\/\/)?vm\.tiktok\.com\//i
    ],
    vimeo: [
        /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/\d+/i,
        /(?:https?:\/\/)?player\.vimeo\.com\/video\/\d+/i
    ],
    soundcloud: [
        /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\//i
    ],
    twitter: [
        /(?:https?:\/\/)?(?:www\.)?twitter\.com\/[^\/]+\/status\//i,
        /(?:https?:\/\/)?(?:www\.)?x\.com\/[^\/]+\/status\//i
    ]
};

/**
 * Platform display information
 */
const PLATFORM_INFO = {
    youtube: {
        name: 'YouTube',
        color: '#FF0000',
        icon: 'youtube'
    },
    bilibili: {
        name: 'Bilibili',
        color: '#00A1D6',
        icon: 'bilibili'
    },
    douyin: {
        name: 'Douyin',
        color: '#000000',
        icon: 'douyin'
    },
    tiktok: {
        name: 'TikTok',
        color: '#000000',
        icon: 'tiktok'
    },
    vimeo: {
        name: 'Vimeo',
        color: '#1AB7EA',
        icon: 'vimeo'
    },
    soundcloud: {
        name: 'SoundCloud',
        color: '#FF5500',
        icon: 'soundcloud'
    },
    twitter: {
        name: 'Twitter/X',
        color: '#1DA1F2',
        icon: 'twitter'
    },
    unknown: {
        name: 'Unknown',
        color: '#666666',
        icon: 'link'
    }
};

/**
 * Detect platform from URL
 * 
 * @param {string} url - The URL to analyze
 * @returns {string} Platform identifier (youtube, bilibili, douyin, etc.) or 'unknown'
 */
export function detectPlatform(url) {
    if (!url || typeof url !== 'string') {
        return 'unknown';
    }

    const trimmedUrl = url.trim().toLowerCase();

    for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(trimmedUrl)) {
                return platform;
            }
        }
    }

    return 'unknown';
}

/**
 * Get platform display information
 * 
 * @param {string} platform - Platform identifier
 * @returns {Object} Platform info with name, color, and icon
 */
export function getPlatformInfo(platform) {
    return PLATFORM_INFO[platform] || PLATFORM_INFO.unknown;
}

/**
 * Get platform icon name for UI display
 * 
 * @param {string} platform - Platform identifier
 * @returns {string} Icon name
 */
export function getPlatformIcon(platform) {
    const info = getPlatformInfo(platform);
    return info.icon;
}

/**
 * Get platform display name
 * 
 * @param {string} platform - Platform identifier
 * @returns {string} Human-readable platform name
 */
export function getPlatformName(platform) {
    const info = getPlatformInfo(platform);
    return info.name;
}

/**
 * Get platform brand color
 * 
 * @param {string} platform - Platform identifier
 * @returns {string} Hex color code
 */
export function getPlatformColor(platform) {
    const info = getPlatformInfo(platform);
    return info.color;
}

/**
 * Check if platform is supported
 * 
 * @param {string} url - The URL to check
 * @returns {boolean} True if platform is supported
 */
export function isSupportedPlatform(url) {
    return detectPlatform(url) !== 'unknown';
}

/**
 * Get list of supported platforms
 * 
 * @returns {string[]} Array of supported platform identifiers
 */
export function getSupportedPlatforms() {
    return Object.keys(PLATFORM_PATTERNS);
}

/**
 * Extract video ID from URL (platform-specific)
 * 
 * @param {string} url - The URL to parse
 * @returns {string|null} Video ID or null if not found
 */
export function extractVideoId(url) {
    if (!url) return null;

    const platform = detectPlatform(url);

    switch (platform) {
        case 'youtube': {
            // YouTube video ID patterns
            const patterns = [
                /[?&]v=([a-zA-Z0-9_-]{11})/,
                /youtu\.be\/([a-zA-Z0-9_-]{11})/,
                /embed\/([a-zA-Z0-9_-]{11})/,
                /shorts\/([a-zA-Z0-9_-]{11})/
            ];
            for (const pattern of patterns) {
                const match = url.match(pattern);
                if (match) return match[1];
            }
            break;
        }
        case 'bilibili': {
            // Bilibili BV/AV number
            const bvMatch = url.match(/[Bb][Vv]([a-zA-Z0-9]+)/);
            if (bvMatch) return `BV${bvMatch[1]}`;
            const avMatch = url.match(/av(\d+)/i);
            if (avMatch) return `av${avMatch[1]}`;
            break;
        }
        case 'douyin': {
            // Douyin video ID
            const match = url.match(/video\/(\d+)/);
            if (match) return match[1];
            break;
        }
        case 'tiktok': {
            // TikTok video ID
            const match = url.match(/video\/(\d+)/);
            if (match) return match[1];
            break;
        }
        case 'vimeo': {
            // Vimeo video ID
            const match = url.match(/vimeo\.com\/(\d+)/);
            if (match) return match[1];
            break;
        }
    }

    return null;
}

export default {
    detectPlatform,
    getPlatformInfo,
    getPlatformIcon,
    getPlatformName,
    getPlatformColor,
    isSupportedPlatform,
    getSupportedPlatforms,
    extractVideoId
};
