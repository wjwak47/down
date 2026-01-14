/**
 * Property-based tests for Quality Extractor
 * Property 5: Quality Extraction and Sorting
 * Validates: Requirements 5.1, 5.3, 5.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
    extractQualities, 
    getQualityOptions, 
    getBestQuality, 
    getQualityByHeight,
    hasQualityOptions,
    formatFileSize
} from './qualityExtractor.js';

// Generator for video format objects
const formatArbitrary = fc.record({
    format_id: fc.string({ minLength: 1, maxLength: 20 }),
    height: fc.oneof(fc.constant(144), fc.constant(240), fc.constant(360), fc.constant(480), fc.constant(720), fc.constant(1080), fc.constant(1440), fc.constant(2160)),
    ext: fc.oneof(fc.constant('mp4'), fc.constant('webm'), fc.constant('mkv')),
    vcodec: fc.oneof(fc.constant('avc1'), fc.constant('vp9'), fc.constant('av01')),
    acodec: fc.oneof(fc.constant('mp4a'), fc.constant('opus'), fc.constant('none')),
    filesize: fc.oneof(fc.nat({ max: 10000000000 }), fc.constant(null)),
    filesize_approx: fc.oneof(fc.nat({ max: 10000000000 }), fc.constant(null)),
    fps: fc.oneof(fc.constant(24), fc.constant(30), fc.constant(60), fc.constant(null)),
    tbr: fc.oneof(fc.nat({ max: 50000 }), fc.constant(null))
});

describe('Quality Extractor', () => {
    // Property 5.1: extractQualities returns sorted array
    describe('Property 5.1: extractQualities returns sorted array by height', () => {
        it('should return qualities sorted by height descending', () => {
            fc.assert(
                fc.property(
                    fc.array(formatArbitrary, { minLength: 1, maxLength: 20 }),
                    (formats) => {
                        const qualities = extractQualities(formats);
                        // Check that qualities are sorted by height descending
                        for (let i = 1; i < qualities.length; i++) {
                            expect(qualities[i - 1].height).toBeGreaterThanOrEqual(qualities[i].height);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return empty array for empty/null input', () => {
            expect(extractQualities(null)).toEqual([]);
            expect(extractQualities(undefined)).toEqual([]);
            expect(extractQualities([])).toEqual([]);
        });
    });

    // Property 5.2: Each quality has required fields
    describe('Property 5.2: Each quality has required fields', () => {
        it('should return qualities with height, label, and formatId', () => {
            fc.assert(
                fc.property(
                    fc.array(formatArbitrary, { minLength: 1, maxLength: 10 }),
                    (formats) => {
                        const qualities = extractQualities(formats);
                        for (const q of qualities) {
                            expect(q).toHaveProperty('height');
                            expect(q).toHaveProperty('label');
                            expect(q).toHaveProperty('formatId');
                            expect(typeof q.height).toBe('number');
                            expect(typeof q.label).toBe('string');
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Property 5.3: getBestQuality returns highest resolution
    describe('Property 5.3: getBestQuality returns highest resolution', () => {
        it('should return the quality with highest height', () => {
            fc.assert(
                fc.property(
                    fc.array(formatArbitrary, { minLength: 1, maxLength: 10 }),
                    (formats) => {
                        const best = getBestQuality(formats);
                        const qualities = extractQualities(formats);
                        if (qualities.length > 0) {
                            expect(best).not.toBeNull();
                            expect(best.height).toBe(qualities[0].height);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return null for empty formats', () => {
            expect(getBestQuality([])).toBeNull();
            expect(getBestQuality(null)).toBeNull();
        });
    });

    // Property 5.4: hasQualityOptions is consistent with extractQualities
    describe('Property 5.4: hasQualityOptions consistency', () => {
        it('should return true iff extractQualities returns non-empty array', () => {
            fc.assert(
                fc.property(
                    fc.array(formatArbitrary, { minLength: 0, maxLength: 10 }),
                    (formats) => {
                        const qualities = extractQualities(formats);
                        const has = hasQualityOptions(formats);
                        expect(has).toBe(qualities.length > 0);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Property 5.5: getQualityOptions includes display strings
    describe('Property 5.5: getQualityOptions includes display strings', () => {
        it('should return options with displayLabel and value', () => {
            fc.assert(
                fc.property(
                    fc.array(formatArbitrary, { minLength: 1, maxLength: 10 }),
                    (formats) => {
                        const options = getQualityOptions(formats);
                        for (const opt of options) {
                            expect(opt).toHaveProperty('displayLabel');
                            expect(opt).toHaveProperty('value');
                            expect(typeof opt.displayLabel).toBe('string');
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Property 5.6: formatFileSize produces valid output
    describe('Property 5.6: formatFileSize produces valid output', () => {
        it('should format bytes to human-readable string', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10000000000 }),
                    (bytes) => {
                        const result = formatFileSize(bytes);
                        expect(result).not.toBeNull();
                        expect(typeof result).toBe('string');
                        expect(result).toMatch(/(KB|MB|GB)$/);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return null for invalid input', () => {
            expect(formatFileSize(null)).toBeNull();
            expect(formatFileSize(0)).toBeNull();
            expect(formatFileSize(-100)).toBeNull();
        });
    });

    // Unit tests for specific quality labels
    describe('Quality labels', () => {
        it('should label 2160p as 4K', () => {
            const formats = [{ format_id: 'test', height: 2160, vcodec: 'avc1' }];
            const qualities = extractQualities(formats);
            expect(qualities[0].label).toBe('4K');
        });

        it('should label 1080p correctly', () => {
            const formats = [{ format_id: 'test', height: 1080, vcodec: 'avc1' }];
            const qualities = extractQualities(formats);
            expect(qualities[0].label).toBe('1080p');
        });

        it('should label 720p correctly', () => {
            const formats = [{ format_id: 'test', height: 720, vcodec: 'avc1' }];
            const qualities = extractQualities(formats);
            expect(qualities[0].label).toBe('720p');
        });
    });

    // Unit tests for audio-only filtering
    describe('Audio-only filtering', () => {
        it('should exclude audio-only formats', () => {
            const formats = [
                { format_id: 'video', height: 1080, vcodec: 'avc1' },
                { format_id: 'audio', vcodec: 'none', acodec: 'mp4a' },
                { format_id: 'audio2', resolution: 'audio only', acodec: 'opus' }
            ];
            const qualities = extractQualities(formats);
            expect(qualities.length).toBe(1);
            expect(qualities[0].formatId).toBe('video');
        });
    });

    // Unit tests for deduplication
    describe('Quality deduplication', () => {
        it('should deduplicate same height formats', () => {
            const formats = [
                { format_id: 'v1', height: 1080, vcodec: 'avc1', ext: 'mp4' },
                { format_id: 'v2', height: 1080, vcodec: 'vp9', ext: 'webm' }
            ];
            const qualities = extractQualities(formats);
            expect(qualities.length).toBe(1);
        });
    });
});
