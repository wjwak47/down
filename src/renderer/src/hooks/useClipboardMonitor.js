import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * URL patterns for supported platforms
 */
const SUPPORTED_URL_PATTERNS = [
    // YouTube
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=[\w-]+/i,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/[\w-]+/i,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/[\w-]+/i,
    // Bilibili
    /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/video\/[\w]+/i,
    /(?:https?:\/\/)?b23\.tv\/[\w]+/i,
    // Douyin
    /(?:https?:\/\/)?(?:www\.)?douyin\.com\/video\/\d+/i,
    /(?:https?:\/\/)?v\.douyin\.com\/[\w]+/i,
    // TikTok
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/i,
    /(?:https?:\/\/)?vm\.tiktok\.com\/[\w]+/i,
    // Vimeo
    /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/\d+/i,
    // Twitter/X
    /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/[\w]+\/status\/\d+/i,
    // SoundCloud
    /(?:https?:\/\/)?(?:www\.)?soundcloud\.com\/[\w-]+\/[\w-]+/i,
];

/**
 * Check if a URL is from a supported platform
 * @param {string} url - URL to check
 * @returns {boolean} Whether the URL is supported
 */
export function isSupportedUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return SUPPORTED_URL_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Extract URL from clipboard text
 * @param {string} text - Clipboard text
 * @returns {string|null} Extracted URL or null
 */
export function extractUrl(text) {
    if (!text || typeof text !== 'string') return null;
    
    // Try to find a URL in the text
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch && isSupportedUrl(urlMatch[0])) {
        return urlMatch[0];
    }
    
    // Check if the entire text is a supported URL
    if (isSupportedUrl(text.trim())) {
        return text.trim();
    }
    
    return null;
}

/**
 * useClipboardMonitor Hook
 * Monitors clipboard for supported video URLs
 * 
 * @param {Object} options - Hook options
 * @param {boolean} options.enabled - Whether monitoring is enabled
 * @param {number} options.dedupeWindow - Time window for deduplication (ms)
 * @param {Function} options.onUrlDetected - Callback when URL is detected
 * @returns {Object} Hook state and controls
 */
export function useClipboardMonitor({ 
    enabled = false, 
    dedupeWindow = 5000,
    onUrlDetected 
} = {}) {
    const [lastDetectedUrl, setLastDetectedUrl] = useState(null);
    const [isMonitoring, setIsMonitoring] = useState(enabled);
    const recentUrlsRef = useRef(new Map()); // Map<url, timestamp>
    const intervalRef = useRef(null);

    /**
     * Check if URL was recently detected (within dedupe window)
     */
    const isRecentlyDetected = useCallback((url) => {
        const now = Date.now();
        const lastTime = recentUrlsRef.current.get(url);
        
        if (lastTime && (now - lastTime) < dedupeWindow) {
            return true;
        }
        
        // Clean up old entries
        for (const [storedUrl, timestamp] of recentUrlsRef.current.entries()) {
            if (now - timestamp > dedupeWindow) {
                recentUrlsRef.current.delete(storedUrl);
            }
        }
        
        return false;
    }, [dedupeWindow]);

    /**
     * Mark URL as detected
     */
    const markAsDetected = useCallback((url) => {
        recentUrlsRef.current.set(url, Date.now());
        setLastDetectedUrl(url);
    }, []);

    /**
     * Check clipboard for supported URLs
     */
    const checkClipboard = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText();
            const url = extractUrl(text);
            
            if (url && !isRecentlyDetected(url)) {
                markAsDetected(url);
                onUrlDetected?.(url);
            }
        } catch (error) {
            // Clipboard access denied or not available
            // This is expected when the window is not focused
        }
    }, [isRecentlyDetected, markAsDetected, onUrlDetected]);

    /**
     * Start monitoring
     */
    const startMonitoring = useCallback(() => {
        if (intervalRef.current) return;
        
        setIsMonitoring(true);
        intervalRef.current = setInterval(checkClipboard, 1000);
    }, [checkClipboard]);

    /**
     * Stop monitoring
     */
    const stopMonitoring = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsMonitoring(false);
    }, []);

    /**
     * Clear recent URLs cache
     */
    const clearCache = useCallback(() => {
        recentUrlsRef.current.clear();
        setLastDetectedUrl(null);
    }, []);

    // Start/stop monitoring based on enabled prop
    useEffect(() => {
        if (enabled) {
            startMonitoring();
        } else {
            stopMonitoring();
        }
        
        return () => stopMonitoring();
    }, [enabled, startMonitoring, stopMonitoring]);

    return {
        isMonitoring,
        lastDetectedUrl,
        startMonitoring,
        stopMonitoring,
        clearCache,
        checkClipboard
    };
}

/**
 * Check if URL is a duplicate within the time window
 * @param {string} url - URL to check
 * @param {Map} recentUrls - Map of recent URLs with timestamps
 * @param {number} windowMs - Time window in milliseconds
 * @returns {boolean} Whether URL is a duplicate
 */
export function isDuplicateUrl(url, recentUrls, windowMs) {
    if (!url || !recentUrls) return false;
    
    const now = Date.now();
    const lastTime = recentUrls.get(url);
    
    if (lastTime === undefined) return false;
    
    return (now - lastTime) < windowMs;
}

export default useClipboardMonitor;
