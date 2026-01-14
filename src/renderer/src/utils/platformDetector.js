/**
 * Platform Detector Utility (Renderer Process)
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
 */
export function getPlatformInfo(platform) {
    return PLATFORM_INFO[platform] || PLATFORM_INFO.unknown;
}

/**
 * Check if platform is supported
 */
export function isSupportedPlatform(url) {
    return detectPlatform(url) !== 'unknown';
}

export default {
    detectPlatform,
    getPlatformInfo,
    isSupportedPlatform
};
