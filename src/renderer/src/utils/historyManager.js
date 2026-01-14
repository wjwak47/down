/**
 * History Manager Utility
 * Manages download history persistence with localStorage
 * 
 * Requirements: 7.1, 7.2, 7.5
 */

const STORAGE_KEY = 'downloadHistory';
const MAX_HISTORY_ITEMS = 100;

/**
 * History item structure:
 * {
 *   id: string,
 *   title: string,
 *   thumbnail: string | null,
 *   platform: string,
 *   type: 'video' | 'audio' | 'subtitle',
 *   size: string | null,
 *   filePath: string | null,
 *   completedAt: string (ISO date)
 * }
 */

/**
 * Get all history items from localStorage
 * @returns {Array} Array of history items
 */
export function getHistory() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return [];
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('Failed to load download history:', e);
        return [];
    }
}

/**
 * Save a download item to history
 * @param {Object} item - Download item to save
 * @param {string} item.id - Unique identifier
 * @param {string} item.title - Video/audio title
 * @param {string} [item.thumbnail] - Thumbnail URL
 * @param {string} [item.platform] - Platform name (youtube, bilibili, douyin, etc.)
 * @param {string} item.type - Download type (video, audio, subtitle)
 * @param {string} [item.size] - File size string
 * @param {string} [item.filePath] - Local file path
 * @returns {Array} Updated history array
 */
export function saveToHistory(item) {
    if (!item || !item.id || !item.title) {
        console.warn('Invalid history item:', item);
        return getHistory();
    }

    const historyItem = {
        id: item.id,
        title: item.title,
        thumbnail: item.thumbnail || null,
        platform: item.platform || 'unknown',
        type: item.type || 'video',
        size: item.size || null,
        filePath: item.filePath || null,
        completedAt: new Date().toISOString()
    };

    try {
        const current = getHistory();
        // Remove duplicate if exists, add new item at the beginning
        const updated = [historyItem, ...current.filter(h => h.id !== item.id)]
            .slice(0, MAX_HISTORY_ITEMS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    } catch (e) {
        console.error('Failed to save to history:', e);
        return getHistory();
    }
}

/**
 * Remove a specific item from history
 * @param {string} id - ID of the item to remove
 * @returns {Array} Updated history array
 */
export function removeFromHistory(id) {
    if (!id) return getHistory();

    try {
        const current = getHistory();
        const updated = current.filter(h => h.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    } catch (e) {
        console.error('Failed to remove from history:', e);
        return getHistory();
    }
}

/**
 * Clear all history
 * @returns {Array} Empty array
 */
export function clearHistory() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        return [];
    } catch (e) {
        console.error('Failed to clear history:', e);
        return [];
    }
}

/**
 * Get history item by ID
 * @param {string} id - ID of the item to find
 * @returns {Object|null} History item or null if not found
 */
export function getHistoryItem(id) {
    if (!id) return null;
    const history = getHistory();
    return history.find(h => h.id === id) || null;
}

/**
 * Check if an item exists in history
 * @param {string} id - ID to check
 * @returns {boolean} True if item exists
 */
export function hasHistoryItem(id) {
    return getHistoryItem(id) !== null;
}

/**
 * Get history count
 * @returns {number} Number of items in history
 */
export function getHistoryCount() {
    return getHistory().length;
}

/**
 * Get the maximum number of history items allowed
 * @returns {number} Maximum history items
 */
export function getMaxHistoryItems() {
    return MAX_HISTORY_ITEMS;
}

export default {
    getHistory,
    saveToHistory,
    removeFromHistory,
    clearHistory,
    getHistoryItem,
    hasHistoryItem,
    getHistoryCount,
    getMaxHistoryItems
};
