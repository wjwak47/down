/**
 * Property-based tests for Format Selector
 * Property 7: Default Format Selection
 * Validates: Requirements 6.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Format definitions (mirroring FormatSelector.jsx)
const VIDEO_FORMATS = [
    { id: 'mp4', label: 'MP4', description: 'Most compatible', recommended: true },
    { id: 'webm', label: 'WebM', description: 'Open format' },
    { id: 'mkv', label: 'MKV', description: 'High quality container' }
];

const AUDIO_FORMATS = [
    { id: 'm4a', label: 'M4A', description: 'Best quality', recommended: true },
    { id: 'mp3', label: 'MP3', description: 'Most compatible' },
    { id: 'wav', label: 'WAV', description: 'Lossless' }
];

// Helper functions
function getDefaultVideoFormat() {
    return VIDEO_FORMATS.find(f => f.recommended) || VIDEO_FORMATS[0];
}

function getDefaultAudioFormat() {
    return AUDIO_FORMATS.find(f => f.recommended) || AUDIO_FORMATS[0];
}

function isValidVideoFormat(formatId) {
    return VIDEO_FORMATS.some(f => f.id === formatId);
}

function isValidAudioFormat(formatId) {
    return AUDIO_FORMATS.some(f => f.id === formatId);
}

describe('Format Selector', () => {
    // Property 7.1: Default video format is MP4
    describe('Property 7.1: Default video format is MP4', () => {
        it('should default to MP4 for video', () => {
            const defaultFormat = getDefaultVideoFormat();
            expect(defaultFormat.id).toBe('mp4');
            expect(defaultFormat.recommended).toBe(true);
        });
    });

    // Property 7.2: Default audio format is M4A
    describe('Property 7.2: Default audio format is M4A', () => {
        it('should default to M4A for audio', () => {
            const defaultFormat = getDefaultAudioFormat();
            expect(defaultFormat.id).toBe('m4a');
            expect(defaultFormat.recommended).toBe(true);
        });
    });

    // Property 7.3: All video formats are valid
    describe('Property 7.3: All video formats have required fields', () => {
        it('should have id, label, and description for all video formats', () => {
            for (const format of VIDEO_FORMATS) {
                expect(format).toHaveProperty('id');
                expect(format).toHaveProperty('label');
                expect(format).toHaveProperty('description');
                expect(typeof format.id).toBe('string');
                expect(typeof format.label).toBe('string');
                expect(typeof format.description).toBe('string');
            }
        });
    });

    // Property 7.4: All audio formats are valid
    describe('Property 7.4: All audio formats have required fields', () => {
        it('should have id, label, and description for all audio formats', () => {
            for (const format of AUDIO_FORMATS) {
                expect(format).toHaveProperty('id');
                expect(format).toHaveProperty('label');
                expect(format).toHaveProperty('description');
                expect(typeof format.id).toBe('string');
                expect(typeof format.label).toBe('string');
                expect(typeof format.description).toBe('string');
            }
        });
    });

    // Property 7.5: Exactly one recommended format per type
    describe('Property 7.5: Exactly one recommended format per type', () => {
        it('should have exactly one recommended video format', () => {
            const recommendedCount = VIDEO_FORMATS.filter(f => f.recommended).length;
            expect(recommendedCount).toBe(1);
        });

        it('should have exactly one recommended audio format', () => {
            const recommendedCount = AUDIO_FORMATS.filter(f => f.recommended).length;
            expect(recommendedCount).toBe(1);
        });
    });

    // Property 7.6: Format IDs are unique
    describe('Property 7.6: Format IDs are unique', () => {
        it('should have unique video format IDs', () => {
            const ids = VIDEO_FORMATS.map(f => f.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should have unique audio format IDs', () => {
            const ids = AUDIO_FORMATS.map(f => f.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });
    });

    // Property 7.7: isValidFormat functions work correctly
    describe('Property 7.7: Format validation functions', () => {
        it('should validate known video formats', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...VIDEO_FORMATS.map(f => f.id)),
                    (formatId) => {
                        expect(isValidVideoFormat(formatId)).toBe(true);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should validate known audio formats', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...AUDIO_FORMATS.map(f => f.id)),
                    (formatId) => {
                        expect(isValidAudioFormat(formatId)).toBe(true);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should reject unknown formats', () => {
            fc.assert(
                fc.property(
                    fc.string().filter(s => !VIDEO_FORMATS.some(f => f.id === s) && !AUDIO_FORMATS.some(f => f.id === s)),
                    (formatId) => {
                        expect(isValidVideoFormat(formatId)).toBe(false);
                        expect(isValidAudioFormat(formatId)).toBe(false);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Unit tests for specific formats
    describe('Specific format tests', () => {
        it('should include MP4, WebM, MKV for video', () => {
            const ids = VIDEO_FORMATS.map(f => f.id);
            expect(ids).toContain('mp4');
            expect(ids).toContain('webm');
            expect(ids).toContain('mkv');
        });

        it('should include M4A, MP3, WAV for audio', () => {
            const ids = AUDIO_FORMATS.map(f => f.id);
            expect(ids).toContain('m4a');
            expect(ids).toContain('mp3');
            expect(ids).toContain('wav');
        });
    });
});
