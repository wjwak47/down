/**
 * Property-based tests for File Size Extractor
 * Property 4: File Size Extraction with Fallback
 * Validates: Requirements 4.1, 4.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { extractFileSize, formatFileSize, getFormattedFileSize, hasFileSize } from './fileSizeExtractor.js';

describe('File Size Extractor', () => {
    // Property 4.1: extractFileSize returns number or null
    describe('Property 4.1: extractFileSize returns number or null', () => {
        it('should return a positive number or null for any input', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        filesize: fc.oneof(fc.nat(), fc.constant(null), fc.constant(undefined)),
                        filesize_approx: fc.oneof(fc.nat(), fc.constant(null), fc.constant(undefined)),
                        formats: fc.oneof(
                            fc.array(fc.record({
                                filesize: fc.oneof(fc.nat(), fc.constant(null), fc.constant(undefined)),
                                filesize_approx: fc.oneof(fc.nat(), fc.constant(null), fc.constant(undefined))
                            })),
                            fc.constant(null),
                            fc.constant(undefined)
                        )
                    }),
                    (videoInfo) => {
                        const result = extractFileSize(videoInfo);
                        expect(result === null || (typeof result === 'number' && result > 0)).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return null for null/undefined input', () => {
            expect(extractFileSize(null)).toBe(null);
            expect(extractFileSize(undefined)).toBe(null);
        });
    });

    // Property 4.2: Fallback priority is respected
    describe('Property 4.2: Fallback priority (filesize > filesize_approx > formats)', () => {
        it('should prefer filesize over filesize_approx', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 1000000000 }),
                    fc.integer({ min: 1, max: 1000000000 }),
                    (filesize, filesize_approx) => {
                        const videoInfo = { filesize, filesize_approx };
                        const result = extractFileSize(videoInfo);
                        expect(result).toBe(filesize);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should use filesize_approx when filesize is unavailable', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 1000000000 }),
                    (filesize_approx) => {
                        const videoInfo = { filesize_approx };
                        const result = extractFileSize(videoInfo);
                        expect(result).toBe(filesize_approx);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should search formats array when primary sources unavailable', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 1000000000 }),
                    (formatSize) => {
                        const videoInfo = {
                            formats: [
                                { filesize: null },
                                { filesize: formatSize },
                                { filesize: formatSize - 100 }
                            ]
                        };
                        const result = extractFileSize(videoInfo);
                        // Should return the largest size from formats
                        expect(result).toBe(formatSize);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    // Property 4.3: formatFileSize produces valid output
    describe('Property 4.3: formatFileSize produces valid formatted strings', () => {
        it('should format bytes to human-readable string', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10000000000 }),
                    (bytes) => {
                        const result = formatFileSize(bytes);
                        expect(result).not.toBe(null);
                        expect(typeof result).toBe('string');
                        // Should contain a unit
                        expect(result).toMatch(/(B|KB|MB|GB)$/);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return null for invalid input', () => {
            expect(formatFileSize(null)).toBe(null);
            expect(formatFileSize(undefined)).toBe(null);
            expect(formatFileSize(0)).toBe(null);
            expect(formatFileSize(-100)).toBe(null);
        });
    });

    // Property 4.4: hasFileSize is consistent with extractFileSize
    describe('Property 4.4: hasFileSize consistency', () => {
        it('should return true iff extractFileSize returns non-null', () => {
            fc.assert(
                fc.property(
                    fc.record({
                        filesize: fc.oneof(fc.nat(), fc.constant(null), fc.constant(undefined)),
                        filesize_approx: fc.oneof(fc.nat(), fc.constant(null), fc.constant(undefined))
                    }),
                    (videoInfo) => {
                        const size = extractFileSize(videoInfo);
                        const has = hasFileSize(videoInfo);
                        expect(has).toBe(size !== null);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Unit tests for specific cases
    describe('Unit tests for edge cases', () => {
        it('should handle empty formats array', () => {
            const videoInfo = { formats: [] };
            expect(extractFileSize(videoInfo)).toBe(null);
        });

        it('should handle formats with only filesize_approx', () => {
            const videoInfo = {
                formats: [
                    { filesize_approx: 5000000 },
                    { filesize_approx: 3000000 }
                ]
            };
            expect(extractFileSize(videoInfo)).toBe(5000000);
        });

        it('should format sizes correctly', () => {
            expect(formatFileSize(500)).toBe('500 B');
            expect(formatFileSize(1024)).toBe('1.0 KB');
            expect(formatFileSize(1536)).toBe('1.5 KB');
            expect(formatFileSize(1048576)).toBe('1.0 MB');
            expect(formatFileSize(1572864)).toBe('1.5 MB');
            expect(formatFileSize(1073741824)).toBe('1.00 GB');
        });

        it('should return null for zero filesize', () => {
            const videoInfo = { filesize: 0 };
            expect(extractFileSize(videoInfo)).toBe(null);
        });
    });
});
