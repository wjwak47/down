/**
 * Normalize a URL by ensuring it has a proper protocol
 * @param {string} url - The URL to normalize
 * @returns {string|null} Normalized URL or null if invalid
 */
export function normalizeUrl(url) {
    if (!url || typeof url !== 'string') {
        return null;
    }
    
    const trimmed = url.trim();
    if (!trimmed) {
        return null;
    }
    
    // Handle protocol-relative URLs (starting with //)
    if (trimmed.startsWith('//')) {
        return 'https:' + trimmed;
    }
    
    // Already has a protocol
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    
    // Invalid URL (no protocol and not protocol-relative)
    return null;
}

/**
 * Check if a thumbnail URL needs proxy to load
 * @param {string} url - The thumbnail URL
 * @param {string} platform - The detected platform (douyin, bilibili, tiktok, etc.)
 * @returns {boolean} True if proxy is needed
 */
export function needsThumbnailProxy(url, platform) {
    if (!url || typeof url !== 'string') {
        return false;
    }
    
    // Domains that require proxy due to referer checks
    const proxyDomains = [
        'hdslb.com',
        'bilibili.com',
        'douyinpic.com',
        'douyincdn.com',
        'byteimg.com',
        'tiktokcdn.com',
        'pstatp.com',
        'snssdk.com',
        'douyinstatic.com',
        'tiktokv.com'
    ];
    
    // Check if URL contains any proxy domain
    const urlLower = url.toLowerCase();
    for (const domain of proxyDomains) {
        if (urlLower.includes(domain)) {
            return true;
        }
    }
    
    // Also check by platform
    const platformsNeedingProxy = ['bilibili', 'douyin', 'tiktok'];
    if (platform && platformsNeedingProxy.includes(platform.toLowerCase())) {
        return true;
    }
    
    return false;
}
