/**
 * Property-Based Tests for Subtitle Extractor
 * 
 * **Feature: media-downloader-enhancement, Property 2: Subtitle Extraction Completeness**
 * **Validates: Requirements 2.1, 2.2**
 * 
 * For any video info object containing subtitles or automatic_captions, the subtitle 
 * extractor SHALL include all available languages, and auto-generated captions SHALL 
 * be labeled with "[Auto]" suffix.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
    extractSubtitles, 
    subtitlesToList, 
    hasSubtitles, 
    getSubtitleCounts,
    getLanguageLabel 
} from './subtitleExtractor.js';

describe('Subtitle Extractor - Property Tests', () => {
    /**
     * Property 2: Subtitle Extraction Completeness
     * For any video info object containing subtitles or automatic_captions, the subtitle 
     * extractor SHALL include all available languages, and auto-generated captions SHALL 
     * be labeled with "[Auto]" suffix.
     */
    describe('Property 2: Subtitle Extraction Completeness', () => {
        
        // Generator for language codes
        const langCodeArb = fc.oneof(
            fc.constantFrom('en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'it', 'pt', 'ru'),
            fc.constantFrom('en-US', 'en-GB', 'zh-CN', 'zh-TW', 'zh-Hans', 'zh-Hant', 'pt-BR', 'es-MX'),
            fc.string({ minLength: 2, maxLength: 5 }).filter(s => /^[a-z]+$/.test(s))
        );

        // Generator for subtitle format objects
        const subtitleFormatArb = fc.record({
            ext: fc.constantFrom('srt', 'vtt', 'ass', 'json3', 'ttml'),
            url: fc.webUrl(),
            name: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined })
        });

        // Generator for subtitle formats array
        const subtitleFormatsArb = fc.array(subtitleFormatArb, { minLength: 1, maxLength: 5 });

        // Generator for subtitles object (manual subtitles)
        const subtitlesObjectArb = fc.dictionary(langCodeArb, subtitleFormatsArb, { minKeys: 0, maxKeys: 10 });

        // Generator for automatic_captions object
        const autoCaptionsObjectArb = fc.dictionary(langCodeArb, subtitleFormatsArb, { minKeys: 0, maxKeys: 10 });

        // Generator for video info with subtitles
        const videoInfoArb = fc.record({
            subtitles: fc.option(subtitlesObjectArb, { nil: undefined }),
            automatic_captions: fc.option(autoCaptionsObjectArb, { nil: undefined })
        });

        it('should include all manual subtitle languages from input', () => {
            fc.assert(
                fc.property(subtitlesObjectArb, (subtitles) => {
                    const videoInfo = { subtitles, automatic_captions: undefined };
                    const result = extractSubtitles(videoInfo);
                    
                    // All manual subtitle languages should be present
                    const inputLangs = Object.keys(subtitles).filter(
                        lang => subtitles[lang] && Array.isArray(subtitles[lang]) && subtitles[lang].length > 0
                    );
                    
                    for (const lang of inputLangs) {
                        expect(result).toHaveProperty(lang);
                        expect(result[lang].isAuto).toBe(false);
                    }
                }),
                { numRuns: 100 }
            );
        });

        it('should include all auto-generated captions with [Auto] label', () => {
            fc.assert(
                fc.property(autoCaptionsObjectArb, (automatic_captions) => {
                    const videoInfo = { subtitles: undefined, automatic_captions };
                    const result = extractSubtitles(videoInfo);
                    
                    // All auto caption languages should be present with _auto suffix
                    const inputLangs = Object.keys(automatic_captions).filter(
                        lang => automatic_captions[lang] && Array.isArray(automatic_captions[lang]) && automatic_captions[lang].length > 0
                    );
                    
                    for (const lang of inputLangs) {
                        const autoKey = `${lang}_auto`;
                        expect(result).toHaveProperty(autoKey);
                        expect(result[autoKey].isAuto).toBe(true);
                        expect(result[autoKey].label).toContain('[Auto]');
                    }
                }),
                { numRuns: 100 }
            );
        });

        it('should combine manual subtitles and auto captions without losing any', () => {
            fc.assert(
                fc.property(videoInfoArb, (videoInfo) => {
                    const result = extractSubtitles(videoInfo);
                    
                    // Count expected entries
                    const manualCount = videoInfo.subtitles 
                        ? Object.keys(videoInfo.subtitles).filter(
                            lang => videoInfo.subtitles[lang] && Array.isArray(videoInfo.subtitles[lang]) && videoInfo.subtitles[lang].length > 0
                          ).length 
                        : 0;
                    const autoCount = videoInfo.automatic_captions 
                        ? Object.keys(videoInfo.automatic_captions).filter(
                            lang => videoInfo.automatic_captions[lang] && Array.isArray(videoInfo.automatic_captions[lang]) && videoInfo.automatic_captions[lang].length > 0
                          ).length 
                        : 0;
                    
                    // Result should have all entries
                    expect(Object.keys(result).length).toBe(manualCount + autoCount);
                }),
                { numRuns: 100 }
            );
        });

        it('should preserve formats array for all subtitles', () => {
            fc.assert(
                fc.property(videoInfoArb, (videoInfo) => {
                    const result = extractSubtitles(videoInfo);
                    
                    // Check manual subtitles
                    if (videoInfo.subtitles) {
                        for (const [lang, formats] of Object.entries(videoInfo.subtitles)) {
                            if (formats && Array.isArray(formats) && formats.length > 0) {
                                expect(result[lang].formats).toEqual(formats);
                            }
                        }
                    }
                    
                    // Check auto captions
                    if (videoInfo.automatic_captions) {
                        for (const [lang, formats] of Object.entries(videoInfo.automatic_captions)) {
                            if (formats && Array.isArray(formats) && formats.length > 0) {
                                const autoKey = `${lang}_auto`;
                                expect(result[autoKey].formats).toEqual(formats);
                            }
                        }
                    }
                }),
                { numRuns: 100 }
            );
        });

        it('should correctly distinguish manual vs auto subtitles via isAuto flag', () => {
            fc.assert(
                fc.property(videoInfoArb, (videoInfo) => {
                    const result = extractSubtitles(videoInfo);
                    
                    for (const [key, value] of Object.entries(result)) {
                        if (key.endsWith('_auto')) {
                            expect(value.isAuto).toBe(true);
                            expect(value.label).toContain('[Auto]');
                        } else {
                            expect(value.isAuto).toBe(false);
                            expect(value.label).not.toContain('[Auto]');
                        }
                    }
                }),
                { numRuns: 100 }
            );
        });
    });

    describe('subtitlesToList - Conversion Tests', () => {
        it('should convert extracted subtitles to list format correctly', () => {
            const subtitles = {
                'en': { formats: [{ ext: 'srt', url: 'http://example.com/en.srt' }], isAuto: false, label: 'English', code: 'en' },
                'zh_auto': { formats: [{ ext: 'vtt', url: 'http://example.com/zh.vtt' }], isAuto: true, label: 'Chinese [Auto]', code: 'zh' }
            };
            
            const list = subtitlesToList(subtitles);
            
            expect(list).toHaveLength(2);
            expect(list.find(s => s.code === 'en')).toBeDefined();
            expect(list.find(s => s.code === 'zh_auto')).toBeDefined();
            expect(list.find(s => s.code === 'zh_auto').auto).toBe(true);
        });

        it('should handle empty subtitles object', () => {
            expect(subtitlesToList({})).toEqual([]);
            expect(subtitlesToList(null)).toEqual([]);
            expect(subtitlesToList(undefined)).toEqual([]);
        });
    });

    describe('hasSubtitles - Helper Tests', () => {
        it('should return true when subtitles exist', () => {
            const subtitles = { 'en': { formats: [], isAuto: false, label: 'English', code: 'en' } };
            expect(hasSubtitles(subtitles)).toBe(true);
        });

        it('should return false when no subtitles', () => {
            expect(hasSubtitles({})).toBe(false);
            expect(hasSubtitles(null)).toBe(false);
            expect(hasSubtitles(undefined)).toBe(false);
        });
    });

    describe('getSubtitleCounts - Helper Tests', () => {
        it('should correctly count manual and auto subtitles', () => {
            const subtitles = {
                'en': { formats: [], isAuto: false, label: 'English', code: 'en' },
                'es': { formats: [], isAuto: false, label: 'Spanish', code: 'es' },
                'zh_auto': { formats: [], isAuto: true, label: 'Chinese [Auto]', code: 'zh' }
            };
            
            const counts = getSubtitleCounts(subtitles);
            
            expect(counts.total).toBe(3);
            expect(counts.manual).toBe(2);
            expect(counts.auto).toBe(1);
        });

        it('should handle empty input', () => {
            const counts = getSubtitleCounts({});
            expect(counts.total).toBe(0);
            expect(counts.manual).toBe(0);
            expect(counts.auto).toBe(0);
        });
    });

    describe('getLanguageLabel - Unit Tests', () => {
        it('should return correct labels for known language codes', () => {
            expect(getLanguageLabel('en')).toBe('English');
            expect(getLanguageLabel('zh')).toBe('Chinese');
            expect(getLanguageLabel('ja')).toBe('Japanese');
            expect(getLanguageLabel('ko')).toBe('Korean');
        });

        it('should handle regional variants', () => {
            expect(getLanguageLabel('en-US')).toBe('English (US)');
            expect(getLanguageLabel('en-GB')).toBe('English (UK)');
            expect(getLanguageLabel('zh-Hans')).toBe('Chinese (Simplified)');
            expect(getLanguageLabel('zh-Hant')).toBe('Chinese (Traditional)');
        });

        it('should return code for unknown languages', () => {
            expect(getLanguageLabel('xyz')).toBe('xyz');
            expect(getLanguageLabel('unknown-XX')).toBe('unknown-XX');
        });

        it('should handle null/undefined', () => {
            expect(getLanguageLabel(null)).toBe('Unknown');
            expect(getLanguageLabel(undefined)).toBe('Unknown');
        });
    });

    describe('Real-world Video Info Examples', () => {
        it('should handle typical YouTube video info', () => {
            const videoInfo = {
                subtitles: {
                    'en': [{ ext: 'vtt', url: 'https://youtube.com/subs/en.vtt' }],
                    'es': [{ ext: 'vtt', url: 'https://youtube.com/subs/es.vtt' }]
                },
                automatic_captions: {
                    'en': [{ ext: 'vtt', url: 'https://youtube.com/auto/en.vtt' }],
                    'zh-Hans': [{ ext: 'vtt', url: 'https://youtube.com/auto/zh.vtt' }]
                }
            };
            
            const result = extractSubtitles(videoInfo);
            
            // Should have 4 entries: 2 manual + 2 auto
            expect(Object.keys(result)).toHaveLength(4);
            
            // Manual subtitles
            expect(result['en'].isAuto).toBe(false);
            expect(result['es'].isAuto).toBe(false);
            
            // Auto captions
            expect(result['en_auto'].isAuto).toBe(true);
            expect(result['en_auto'].label).toContain('[Auto]');
            expect(result['zh-Hans_auto'].isAuto).toBe(true);
            expect(result['zh-Hans_auto'].label).toContain('[Auto]');
        });

        it('should handle video with only auto captions', () => {
            const videoInfo = {
                subtitles: {},
                automatic_captions: {
                    'en': [{ ext: 'vtt', url: 'https://example.com/en.vtt' }]
                }
            };
            
            const result = extractSubtitles(videoInfo);
            
            expect(Object.keys(result)).toHaveLength(1);
            expect(result['en_auto'].isAuto).toBe(true);
            expect(result['en_auto'].label).toBe('English [Auto]');
        });

        it('should handle video with no subtitles', () => {
            const videoInfo = {
                subtitles: null,
                automatic_captions: undefined
            };
            
            const result = extractSubtitles(videoInfo);
            
            expect(Object.keys(result)).toHaveLength(0);
        });
    });
});
