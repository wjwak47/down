/**
 * Subtitle Extractor Utility
 * Extracts and formats subtitle information from yt-dlp video info
 */

// Language code to human-readable name mapping
const LANGUAGE_LABELS = {
    'en': 'English',
    'en-US': 'English (US)',
    'en-GB': 'English (UK)',
    'zh': 'Chinese',
    'zh-CN': 'Chinese (Simplified)',
    'zh-Hans': 'Chinese (Simplified)',
    'zh-TW': 'Chinese (Traditional)',
    'zh-Hant': 'Chinese (Traditional)',
    'ja': 'Japanese',
    'ko': 'Korean',
    'es': 'Spanish',
    'es-ES': 'Spanish (Spain)',
    'es-MX': 'Spanish (Mexico)',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'pt-BR': 'Portuguese (Brazil)',
    'ru': 'Russian',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'id': 'Indonesian',
    'ms': 'Malay',
    'nl': 'Dutch',
    'pl': 'Polish',
    'tr': 'Turkish',
    'uk': 'Ukrainian',
    'cs': 'Czech',
    'sv': 'Swedish',
    'da': 'Danish',
    'fi': 'Finnish',
    'no': 'Norwegian',
    'el': 'Greek',
    'he': 'Hebrew',
    'hu': 'Hungarian',
    'ro': 'Romanian',
    'sk': 'Slovak',
    'bg': 'Bulgarian',
    'hr': 'Croatian',
    'sr': 'Serbian',
    'sl': 'Slovenian',
    'et': 'Estonian',
    'lv': 'Latvian',
    'lt': 'Lithuanian',
    'fil': 'Filipino',
    'tl': 'Tagalog'
};

/**
 * Get human-readable language label from language code
 * @param {string} langCode - Language code (e.g., 'en', 'zh-Hans')
 * @returns {string} Human-readable language name
 */
function getLanguageLabel(langCode) {
    if (!langCode) return 'Unknown';
    
    // Check exact match first
    if (LANGUAGE_LABELS[langCode]) {
        return LANGUAGE_LABELS[langCode];
    }
    
    // Try base language code (e.g., 'en' from 'en-US')
    const baseLang = langCode.split('-')[0];
    if (LANGUAGE_LABELS[baseLang]) {
        // If there's a region code, append it
        if (langCode.includes('-')) {
            const region = langCode.split('-')[1];
            return `${LANGUAGE_LABELS[baseLang]} (${region})`;
        }
        return LANGUAGE_LABELS[baseLang];
    }
    
    // Return the code itself if no label found
    return langCode;
}

/**
 * Extract and format subtitles from yt-dlp video info
 * Combines manual subtitles and automatic captions, with proper labeling
 * 
 * @param {Object} videoInfo - Raw video info from yt-dlp
 * @returns {Object} Formatted subtitles object with structure:
 *   {
 *     [langKey]: {
 *       formats: Array<{ext: string, url: string, name?: string}>,
 *       isAuto: boolean,
 *       label: string,
 *       code: string
 *     }
 *   }
 */
function extractSubtitles(videoInfo) {
    const subtitles = {};
    
    // Process manual subtitles first (higher priority)
    if (videoInfo.subtitles && typeof videoInfo.subtitles === 'object') {
        for (const [lang, formats] of Object.entries(videoInfo.subtitles)) {
            if (!formats || !Array.isArray(formats) || formats.length === 0) continue;
            
            subtitles[lang] = {
                formats: formats,
                isAuto: false,
                label: getLanguageLabel(lang),
                code: lang
            };
        }
    }
    
    // Process auto-generated captions
    if (videoInfo.automatic_captions && typeof videoInfo.automatic_captions === 'object') {
        for (const [lang, formats] of Object.entries(videoInfo.automatic_captions)) {
            if (!formats || !Array.isArray(formats) || formats.length === 0) continue;
            
            // Use a unique key for auto captions to avoid overwriting manual subs
            const autoKey = `${lang}_auto`;
            
            subtitles[autoKey] = {
                formats: formats,
                isAuto: true,
                label: `${getLanguageLabel(lang)} [Auto]`,
                code: lang
            };
        }
    }
    
    return subtitles;
}

/**
 * Convert extracted subtitles to a flat list format for UI display
 * @param {Object} subtitles - Subtitles object from extractSubtitles
 * @returns {Array<{code: string, name: string, auto: boolean, formats: Array}>}
 */
function subtitlesToList(subtitles) {
    if (!subtitles || typeof subtitles !== 'object') {
        return [];
    }
    
    return Object.entries(subtitles).map(([key, value]) => ({
        code: key,
        name: value.label || key,
        auto: value.isAuto || false,
        formats: value.formats || []
    }));
}

/**
 * Check if video has any subtitles available
 * @param {Object} subtitles - Subtitles object from extractSubtitles
 * @returns {boolean}
 */
function hasSubtitles(subtitles) {
    if (!subtitles || typeof subtitles !== 'object') {
        return false;
    }
    return Object.keys(subtitles).length > 0;
}

/**
 * Get count of available subtitles
 * @param {Object} subtitles - Subtitles object from extractSubtitles
 * @returns {{total: number, manual: number, auto: number}}
 */
function getSubtitleCounts(subtitles) {
    if (!subtitles || typeof subtitles !== 'object') {
        return { total: 0, manual: 0, auto: 0 };
    }
    
    const entries = Object.values(subtitles);
    const manual = entries.filter(s => !s.isAuto).length;
    const auto = entries.filter(s => s.isAuto).length;
    
    return {
        total: entries.length,
        manual,
        auto
    };
}

export {
    extractSubtitles,
    subtitlesToList,
    hasSubtitles,
    getSubtitleCounts,
    getLanguageLabel,
    LANGUAGE_LABELS
};
