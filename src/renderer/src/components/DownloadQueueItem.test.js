import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateProgress, calculateSpeed, calculateETA } from './DownloadQueueItem';

describe('DownloadQueueItem Progress Calculations', () => {
    /**
     * Property 2: Download Progress Calculation Correctness
     * For any download task with known total size and downloaded size,
     * the progress percentage SHALL equal (downloadedSize / totalSize) * 100,
     * the speed SHALL equal bytesDownloadedInInterval / intervalSeconds,
     * and the ETA SHALL equal remainingBytes / currentSpeed.
     */
    
    describe('calculateProgress', () => {
        it('should return 0 when totalSize is 0 or negative', () => {
            fc.assert(
                fc.property(
                    fc.nat(), // downloadedSize
                    fc.integer({ max: 0 }), // totalSize <= 0
                    (downloadedSize, totalSize) => {
                        const progress = calculateProgress(downloadedSize, totalSize);
                        expect(progress).toBe(0);
                    }
                )
            );
        });

        it('should return progress between 0 and 100 for valid inputs', () => {
            fc.assert(
                fc.property(
                    fc.nat({ max: 1000000000 }), // downloadedSize
                    fc.integer({ min: 1, max: 1000000000 }), // totalSize > 0
                    (downloadedSize, totalSize) => {
                        const progress = calculateProgress(downloadedSize, totalSize);
                        expect(progress).toBeGreaterThanOrEqual(0);
                        expect(progress).toBeLessThanOrEqual(100);
                    }
                )
            );
        });

        it('should calculate correct percentage', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 1000000 }),
                    fc.integer({ min: 1, max: 1000000 }),
                    (downloadedSize, totalSize) => {
                        const progress = calculateProgress(downloadedSize, totalSize);
                        const expected = Math.min(100, Math.max(0, (downloadedSize / totalSize) * 100));
                        expect(progress).toBeCloseTo(expected, 10);
                    }
                )
            );
        });

        it('should cap progress at 100 when downloaded exceeds total', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 1000000 }),
                    (totalSize) => {
                        const downloadedSize = totalSize * 2; // More than total
                        const progress = calculateProgress(downloadedSize, totalSize);
                        expect(progress).toBe(100);
                    }
                )
            );
        });

        it('should return 0 for 0 downloaded bytes', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 1000000 }),
                    (totalSize) => {
                        const progress = calculateProgress(0, totalSize);
                        expect(progress).toBe(0);
                    }
                )
            );
        });

        it('should return 100 when downloaded equals total', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 1000000 }),
                    (size) => {
                        const progress = calculateProgress(size, size);
                        expect(progress).toBe(100);
                    }
                )
            );
        });
    });

    describe('calculateSpeed', () => {
        it('should return 0 when interval is 0 or negative', () => {
            fc.assert(
                fc.property(
                    fc.nat(),
                    fc.integer({ max: 0 }),
                    (bytesDownloaded, intervalMs) => {
                        const speed = calculateSpeed(bytesDownloaded, intervalMs);
                        expect(speed).toBe(0);
                    }
                )
            );
        });

        it('should return non-negative speed for valid inputs', () => {
            fc.assert(
                fc.property(
                    fc.nat({ max: 1000000000 }),
                    fc.integer({ min: 1, max: 60000 }),
                    (bytesDownloaded, intervalMs) => {
                        const speed = calculateSpeed(bytesDownloaded, intervalMs);
                        expect(speed).toBeGreaterThanOrEqual(0);
                    }
                )
            );
        });

        it('should calculate correct bytes per second', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 1000000 }),
                    fc.integer({ min: 1, max: 10000 }),
                    (bytesDownloaded, intervalMs) => {
                        const speed = calculateSpeed(bytesDownloaded, intervalMs);
                        const expected = (bytesDownloaded / intervalMs) * 1000;
                        expect(speed).toBeCloseTo(expected, 10);
                    }
                )
            );
        });

        it('should return 0 when no bytes downloaded', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10000 }),
                    (intervalMs) => {
                        const speed = calculateSpeed(0, intervalMs);
                        expect(speed).toBe(0);
                    }
                )
            );
        });
    });

    describe('calculateETA', () => {
        it('should return Infinity when speed is 0 or negative', () => {
            fc.assert(
                fc.property(
                    fc.nat(),
                    fc.integer({ max: 0 }),
                    (remainingBytes, speed) => {
                        const eta = calculateETA(remainingBytes, speed);
                        expect(eta).toBe(Infinity);
                    }
                )
            );
        });

        it('should return non-negative ETA for valid inputs', () => {
            fc.assert(
                fc.property(
                    fc.nat({ max: 1000000000 }),
                    fc.integer({ min: 1, max: 100000000 }),
                    (remainingBytes, speed) => {
                        const eta = calculateETA(remainingBytes, speed);
                        expect(eta).toBeGreaterThanOrEqual(0);
                    }
                )
            );
        });

        it('should calculate correct seconds remaining', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 1000000 }),
                    fc.integer({ min: 1, max: 1000000 }),
                    (remainingBytes, speed) => {
                        const eta = calculateETA(remainingBytes, speed);
                        const expected = remainingBytes / speed;
                        expect(eta).toBeCloseTo(expected, 10);
                    }
                )
            );
        });

        it('should return 0 when no bytes remaining', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 1000000 }),
                    (speed) => {
                        const eta = calculateETA(0, speed);
                        expect(eta).toBe(0);
                    }
                )
            );
        });
    });

    describe('Progress calculation invariants', () => {
        it('progress should be monotonically increasing as downloaded increases', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 1000000 }), // totalSize
                    fc.array(fc.integer({ min: 0, max: 1000000 }), { minLength: 2, maxLength: 10 }),
                    (totalSize, downloadedSizes) => {
                        const sortedSizes = [...downloadedSizes].sort((a, b) => a - b);
                        const progresses = sortedSizes.map(d => calculateProgress(d, totalSize));
                        
                        for (let i = 1; i < progresses.length; i++) {
                            expect(progresses[i]).toBeGreaterThanOrEqual(progresses[i - 1]);
                        }
                    }
                )
            );
        });

        it('ETA should decrease as remaining bytes decrease (with constant speed)', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 1000000 }), // speed
                    fc.array(fc.integer({ min: 0, max: 1000000 }), { minLength: 2, maxLength: 10 }),
                    (speed, remainingBytesArray) => {
                        const sortedRemaining = [...remainingBytesArray].sort((a, b) => b - a); // descending
                        const etas = sortedRemaining.map(r => calculateETA(r, speed));
                        
                        for (let i = 1; i < etas.length; i++) {
                            expect(etas[i]).toBeLessThanOrEqual(etas[i - 1]);
                        }
                    }
                )
            );
        });
    });
});
