import { useCallback } from 'react';
import { useGlobalTasks } from '../contexts/GlobalTaskContext';

/**
 * useRetryMechanism Hook
 * Provides retry logic for failed downloads
 */
export function useRetryMechanism() {
    const { state, actions } = useGlobalTasks();
    const { settings } = state;

    /**
     * Check if a download can be retried
     * @param {string} downloadId - Download task ID
     * @returns {boolean} Whether the download can be retried
     */
    const canRetry = useCallback((downloadId) => {
        const download = state.downloads[downloadId];
        if (!download) return false;
        if (download.status !== 'failed') return false;
        return download.retryCount < settings.retryCount;
    }, [state.downloads, settings.retryCount]);

    /**
     * Get remaining retry attempts for a download
     * @param {string} downloadId - Download task ID
     * @returns {number} Remaining retry attempts
     */
    const getRemainingRetries = useCallback((downloadId) => {
        const download = state.downloads[downloadId];
        if (!download) return 0;
        return Math.max(0, settings.retryCount - download.retryCount);
    }, [state.downloads, settings.retryCount]);

    /**
     * Increment retry count for a download
     * @param {string} downloadId - Download task ID
     * @returns {number} New retry count
     */
    const incrementRetryCount = useCallback((downloadId) => {
        const download = state.downloads[downloadId];
        if (!download) return 0;
        
        const newRetryCount = download.retryCount + 1;
        actions.updateDownload(downloadId, { retryCount: newRetryCount });
        return newRetryCount;
    }, [state.downloads, actions]);

    /**
     * Reset retry count for a download
     * @param {string} downloadId - Download task ID
     */
    const resetRetryCount = useCallback((downloadId) => {
        actions.updateDownload(downloadId, { retryCount: 0 });
    }, [actions]);

    /**
     * Handle download failure with auto-retry logic
     * @param {string} downloadId - Download task ID
     * @param {string} error - Error message
     * @param {Function} retryCallback - Function to call for retry
     * @returns {boolean} Whether auto-retry was triggered
     */
    const handleFailure = useCallback((downloadId, error, retryCallback) => {
        const download = state.downloads[downloadId];
        if (!download) return false;

        // Update download with error
        actions.updateDownload(downloadId, { 
            status: 'failed', 
            error: error || 'Download failed' 
        });

        // Check if auto-retry is enabled and we have retries left
        if (settings.autoRetry && download.retryCount < settings.retryCount) {
            const newRetryCount = download.retryCount + 1;
            actions.updateDownload(downloadId, { 
                retryCount: newRetryCount,
                status: 'queued',
                error: null
            });
            
            // Trigger retry callback if provided
            if (retryCallback) {
                setTimeout(() => retryCallback(downloadId), 1000); // 1 second delay
            }
            return true;
        }

        return false;
    }, [state.downloads, settings, actions]);

    /**
     * Manual retry for a failed download
     * @param {string} downloadId - Download task ID
     * @param {Function} retryCallback - Function to call for retry
     * @returns {boolean} Whether retry was initiated
     */
    const manualRetry = useCallback((downloadId, retryCallback) => {
        const download = state.downloads[downloadId];
        if (!download || download.status !== 'failed') return false;

        // Reset status and clear error
        actions.updateDownload(downloadId, { 
            status: 'queued',
            error: null,
            progress: 0,
            downloadedSize: 0
        });

        // Trigger retry callback if provided
        if (retryCallback) {
            retryCallback(downloadId);
        }
        return true;
    }, [state.downloads, actions]);

    return {
        canRetry,
        getRemainingRetries,
        incrementRetryCount,
        resetRetryCount,
        handleFailure,
        manualRetry,
        maxRetries: settings.retryCount,
        autoRetryEnabled: settings.autoRetry
    };
}

/**
 * Calculate retry bounds
 * @param {number} currentRetryCount - Current retry count
 * @param {number} maxRetries - Maximum allowed retries
 * @returns {Object} Retry bounds information
 */
export function calculateRetryBounds(currentRetryCount, maxRetries) {
    const remaining = Math.max(0, maxRetries - currentRetryCount);
    const canRetry = remaining > 0;
    const isExhausted = remaining === 0;
    
    return {
        currentRetryCount,
        maxRetries,
        remaining,
        canRetry,
        isExhausted
    };
}

export default useRetryMechanism;
