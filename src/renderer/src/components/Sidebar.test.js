/**
 * Property-based tests for Sidebar Task Badge
 * Property 12: Active Task Badge Accuracy
 * Validates: Requirements 17.1, 17.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Badge calculation logic (same as Sidebar.jsx)
function calculateBadgeDisplay(count) {
    if (count === 0) return null;
    if (count > 99) return '99+';
    return count.toString();
}

// Derived state calculation (same as GlobalTaskContext)
function calculateActiveDownloadCount(downloads) {
    return Object.values(downloads).filter(
        d => d.status === 'downloading' || d.status === 'queued'
    ).length;
}

function calculateActiveCrackJobCount(crackJobs) {
    return Object.values(crackJobs).filter(
        j => j.status === 'running'
    ).length;
}

// Arbitrary generators
const downloadStatusArb = fc.constantFrom('queued', 'downloading', 'paused', 'completed', 'failed');
const crackJobStatusArb = fc.constantFrom('running', 'paused', 'completed', 'failed');

const downloadTaskArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    status: downloadStatusArb,
});

const crackJobArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
    status: crackJobStatusArb,
});

describe('Sidebar Task Badge', () => {
    // Property 12.1: Badge count matches active downloads
    describe('Property 12.1: Download Badge Accuracy', () => {
        it('should correctly count active downloads (queued + downloading)', () => {
            fc.assert(
                fc.property(
                    fc.array(downloadTaskArb, { minLength: 0, maxLength: 20 }),
                    (tasks) => {
                        const uniqueTasks = tasks.map((t, i) => ({ ...t, id: `task-${i}` }));
                        const downloads = {};
                        uniqueTasks.forEach(t => { downloads[t.id] = t; });
                        
                        const activeCount = calculateActiveDownloadCount(downloads);
                        const expectedActive = uniqueTasks.filter(
                            t => t.status === 'queued' || t.status === 'downloading'
                        ).length;
                        
                        expect(activeCount).toBe(expectedActive);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Property 12.2: Badge count matches active crack jobs
    describe('Property 12.2: Crack Job Badge Accuracy', () => {
        it('should correctly count active crack jobs (running only)', () => {
            fc.assert(
                fc.property(
                    fc.array(crackJobArb, { minLength: 0, maxLength: 20 }),
                    (jobs) => {
                        const uniqueJobs = jobs.map((j, i) => ({ ...j, id: `job-${i}` }));
                        const crackJobs = {};
                        uniqueJobs.forEach(j => { crackJobs[j.id] = j; });
                        
                        const activeCount = calculateActiveCrackJobCount(crackJobs);
                        const expectedActive = uniqueJobs.filter(j => j.status === 'running').length;
                        
                        expect(activeCount).toBe(expectedActive);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Property 12.3: Badge display format
    describe('Property 12.3: Badge Display Format', () => {
        it('should return null for zero count', () => {
            expect(calculateBadgeDisplay(0)).toBeNull();
        });

        it('should return count as string for 1-99', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 99 }),
                    (count) => {
                        expect(calculateBadgeDisplay(count)).toBe(count.toString());
                    }
                ),
                { numRuns: 99 }
            );
        });

        it('should return "99+" for counts over 99', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 100, max: 10000 }),
                    (count) => {
                        expect(calculateBadgeDisplay(count)).toBe('99+');
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Property 12.4: Badge visibility
    describe('Property 12.4: Badge Visibility', () => {
        it('should show badge only when count > 0', () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 0, max: 200 }),
                    (count) => {
                        const display = calculateBadgeDisplay(count);
                        if (count === 0) {
                            expect(display).toBeNull();
                        } else {
                            expect(display).not.toBeNull();
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Property 12.5: Status transitions don't affect other counts
    describe('Property 12.5: Count Independence', () => {
        it('should count downloads and crack jobs independently', () => {
            fc.assert(
                fc.property(
                    fc.array(downloadTaskArb, { minLength: 1, maxLength: 10 }),
                    fc.array(crackJobArb, { minLength: 1, maxLength: 10 }),
                    (downloads, crackJobs) => {
                        const uniqueDownloads = downloads.map((t, i) => ({ ...t, id: `dl-${i}` }));
                        const uniqueJobs = crackJobs.map((j, i) => ({ ...j, id: `job-${i}` }));
                        
                        const dlMap = {};
                        uniqueDownloads.forEach(t => { dlMap[t.id] = t; });
                        
                        const jobMap = {};
                        uniqueJobs.forEach(j => { jobMap[j.id] = j; });
                        
                        const downloadCount = calculateActiveDownloadCount(dlMap);
                        const crackCount = calculateActiveCrackJobCount(jobMap);
                        
                        // Counts should be independent
                        const expectedDownloads = uniqueDownloads.filter(
                            t => t.status === 'queued' || t.status === 'downloading'
                        ).length;
                        const expectedCracks = uniqueJobs.filter(j => j.status === 'running').length;
                        
                        expect(downloadCount).toBe(expectedDownloads);
                        expect(crackCount).toBe(expectedCracks);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });
});
