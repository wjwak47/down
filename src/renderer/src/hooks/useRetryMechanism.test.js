import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateRetryBounds } from './useRetryMechanism';

describe('Retry Mechanism (Property 7)', () => {
    /**
     * Property 7: Retry Mechanism Bounds
     * For any failed download, the retry count SHALL increment by 1 on each failure,
     * and automatic retries SHALL stop when retry count reaches the configured maximum (default 3).
     */

    describe('calculateRetryBounds', () => {
        it('should return canRetry=true when retryCount < maxRetries', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }), // currentRetryCount
                    fc.integer({ min: 1, max: 100 }), // maxRetries
                    (currentRetryCount, maxRetries) => {
                        // Ensure currentRetryCount < maxRetries
                        const safeRetryCount = currentRetryCount % maxRetries;
                        const bounds = calculateRetryBounds(safeRetryCount, maxRetries);
                        
                        expect(bounds.canRetry).toBe(true);
                        expect(bounds.remaining).toBeGreaterThan(0);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return canRetry=false when retryCount >= maxRetries', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }), // maxRetries
                    fc.integer({ min: 0, max: 50 }), // extra
                    (maxRetries, extra) => {
                        const currentRetryCount = maxRetries + extra;
                        const bounds = calculateRetryBounds(currentRetryCount, maxRetries);
                        
                        expect(bounds.canRetry).toBe(false);
                        expect(bounds.remaining).toBe(0);
                        expect(bounds.isExhausted).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should correctly calculate remaining retries', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    fc.integer({ min: 0, max: 100 }),
                    (currentRetryCount, maxRetries) => {
                        const bounds = calculateRetryBounds(currentRetryCount, maxRetries);
                        const expectedRemaining = Math.max(0, maxRetries - currentRetryCount);
                        
                        expect(bounds.remaining).toBe(expectedRemaining);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should have remaining = 0 when isExhausted = true', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    fc.integer({ min: 0, max: 100 }),
                    (currentRetryCount, maxRetries) => {
                        const bounds = calculateRetryBounds(currentRetryCount, maxRetries);
                        
                        if (bounds.isExhausted) {
                            expect(bounds.remaining).toBe(0);
                            expect(bounds.canRetry).toBe(false);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should have canRetry and isExhausted be mutually exclusive', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    fc.integer({ min: 0, max: 100 }),
                    (currentRetryCount, maxRetries) => {
                        const bounds = calculateRetryBounds(currentRetryCount, maxRetries);
                        
                        // canRetry and isExhausted should never both be true
                        expect(bounds.canRetry && bounds.isExhausted).toBe(false);
                        
                        // One of them should always be true (unless maxRetries is 0)
                        if (maxRetries > 0) {
                            expect(bounds.canRetry || bounds.isExhausted).toBe(true);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should preserve input values in output', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    fc.integer({ min: 0, max: 100 }),
                    (currentRetryCount, maxRetries) => {
                        const bounds = calculateRetryBounds(currentRetryCount, maxRetries);
                        
                        expect(bounds.currentRetryCount).toBe(currentRetryCount);
                        expect(bounds.maxRetries).toBe(maxRetries);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should handle zero maxRetries correctly', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    (currentRetryCount) => {
                        const bounds = calculateRetryBounds(currentRetryCount, 0);
                        
                        expect(bounds.remaining).toBe(0);
                        expect(bounds.canRetry).toBe(false);
                        expect(bounds.isExhausted).toBe(true);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should handle default max retries (3) correctly', () => {
            const defaultMaxRetries = 3;
            
            // Test all possible retry counts from 0 to 5
            for (let i = 0; i <= 5; i++) {
                const bounds = calculateRetryBounds(i, defaultMaxRetries);
                
                if (i < defaultMaxRetries) {
                    expect(bounds.canRetry).toBe(true);
                    expect(bounds.remaining).toBe(defaultMaxRetries - i);
                } else {
                    expect(bounds.canRetry).toBe(false);
                    expect(bounds.remaining).toBe(0);
                    expect(bounds.isExhausted).toBe(true);
                }
            }
        });
    });

    describe('Retry count increment invariants', () => {
        it('retry count should increment by exactly 1 on each failure', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 99 }),
                    fc.integer({ min: 1, max: 100 }),
                    (initialRetryCount, maxRetries) => {
                        const beforeBounds = calculateRetryBounds(initialRetryCount, maxRetries);
                        const afterBounds = calculateRetryBounds(initialRetryCount + 1, maxRetries);
                        
                        // Retry count should increase by 1
                        expect(afterBounds.currentRetryCount).toBe(beforeBounds.currentRetryCount + 1);
                        
                        // Remaining should decrease by 1 (or stay at 0)
                        const expectedRemaining = Math.max(0, beforeBounds.remaining - 1);
                        expect(afterBounds.remaining).toBe(expectedRemaining);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should transition from canRetry=true to canRetry=false at boundary', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 100 }),
                    (maxRetries) => {
                        // One before max
                        const beforeMax = calculateRetryBounds(maxRetries - 1, maxRetries);
                        expect(beforeMax.canRetry).toBe(true);
                        expect(beforeMax.remaining).toBe(1);
                        
                        // At max
                        const atMax = calculateRetryBounds(maxRetries, maxRetries);
                        expect(atMax.canRetry).toBe(false);
                        expect(atMax.remaining).toBe(0);
                        expect(atMax.isExhausted).toBe(true);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    describe('Edge cases', () => {
        it('should handle very large retry counts', () => {
            const bounds = calculateRetryBounds(1000000, 3);
            expect(bounds.canRetry).toBe(false);
            expect(bounds.remaining).toBe(0);
            expect(bounds.isExhausted).toBe(true);
        });

        it('should handle very large max retries', () => {
            const bounds = calculateRetryBounds(5, 1000000);
            expect(bounds.canRetry).toBe(true);
            expect(bounds.remaining).toBe(999995);
            expect(bounds.isExhausted).toBe(false);
        });

        it('should handle equal retry count and max retries', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 100 }),
                    (value) => {
                        const bounds = calculateRetryBounds(value, value);
                        expect(bounds.canRetry).toBe(false);
                        expect(bounds.remaining).toBe(0);
                        expect(bounds.isExhausted).toBe(true);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});
