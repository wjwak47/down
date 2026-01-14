import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatDuration, parseDuration } from './durationFormatter';

describe('formatDuration', () => {
    // Unit tests for specific examples
    describe('unit tests', () => {
        it('should format 0 seconds as 0:00', () => {
            expect(formatDuration(0)).toBe('0:00');
        });

        it('should format 59 seconds as 0:59', () => {
            expect(formatDuration(59)).toBe('0:59');
        });

        it('should format 60 seconds as 1:00', () => {
            expect(formatDuration(60)).toBe('1:00');
        });

        it('should format 3599 seconds as 59:59', () => {
            expect(formatDuration(3599)).toBe('59:59');
        });

        it('should format 3600 seconds as 1:00:00', () => {
            expect(formatDuration(3600)).toBe('1:00:00');
        });

        it('should format 7261 seconds as 2:01:01', () => {
            expect(formatDuration(7261)).toBe('2:01:01');
        });

        it('should return null for null input', () => {
            expect(formatDuration(null)).toBe(null);
        });

        it('should return null for undefined input', () => {
            expect(formatDuration(undefined)).toBe(null);
        });

        it('should return null for negative input', () => {
            expect(formatDuration(-1)).toBe(null);
        });

        it('should return null for NaN input', () => {
            expect(formatDuration(NaN)).toBe(null);
        });

        it('should handle decimal seconds by flooring', () => {
            expect(formatDuration(61.9)).toBe('1:01');
        });
    });

    // Property-based tests
    describe('property tests', () => {
        /**
         * Property 2: Duration Formatting
         * For any duration value in seconds, the formatDuration function SHALL return 
         * a string in "MM:SS" format for durations under 1 hour, or "HH:MM:SS" format 
         * for durations of 1 hour or more.
         * Validates: Requirements 3.2
         */
        it('should always return MM:SS format for durations under 1 hour', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 3599 }),
                    (seconds) => {
                        const result = formatDuration(seconds);
                        expect(result).not.toBeNull();
                        // Should match MM:SS format (no hours)
                        expect(result).toMatch(/^\d{1,2}:\d{2}$/);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should always return HH:MM:SS format for durations of 1 hour or more', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 3600, max: 86400 }), // 1 hour to 24 hours
                    (seconds) => {
                        const result = formatDuration(seconds);
                        expect(result).not.toBeNull();
                        // Should match HH:MM:SS format
                        expect(result).toMatch(/^\d+:\d{2}:\d{2}$/);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should produce valid time components', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 86400 }),
                    (seconds) => {
                        const result = formatDuration(seconds);
                        expect(result).not.toBeNull();
                        
                        const parts = result.split(':').map(Number);
                        if (parts.length === 2) {
                            // MM:SS format
                            const [m, s] = parts;
                            expect(m).toBeGreaterThanOrEqual(0);
                            expect(m).toBeLessThan(60);
                            expect(s).toBeGreaterThanOrEqual(0);
                            expect(s).toBeLessThan(60);
                        } else {
                            // HH:MM:SS format
                            const [h, m, s] = parts;
                            expect(h).toBeGreaterThanOrEqual(1);
                            expect(m).toBeGreaterThanOrEqual(0);
                            expect(m).toBeLessThan(60);
                            expect(s).toBeGreaterThanOrEqual(0);
                            expect(s).toBeLessThan(60);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should be consistent with parseDuration (round-trip)', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 86400 }),
                    (seconds) => {
                        const formatted = formatDuration(seconds);
                        const parsed = parseDuration(formatted);
                        expect(parsed).toBe(seconds);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});

describe('parseDuration', () => {
    describe('unit tests', () => {
        it('should parse "0:00" as 0', () => {
            expect(parseDuration('0:00')).toBe(0);
        });

        it('should parse "1:23" as 83', () => {
            expect(parseDuration('1:23')).toBe(83);
        });

        it('should parse "1:00:00" as 3600', () => {
            expect(parseDuration('1:00:00')).toBe(3600);
        });

        it('should return null for invalid input', () => {
            expect(parseDuration(null)).toBe(null);
            expect(parseDuration('')).toBe(null);
            expect(parseDuration('invalid')).toBe(null);
            expect(parseDuration('1:2')).toBe(null); // seconds must be 2 digits
        });
    });
});
