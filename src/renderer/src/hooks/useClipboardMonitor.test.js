import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isSupportedUrl, extractUrl, isDuplicateUrl } from './useClipboardMonitor';

describe('Clipboard URL Detection (Property 8)', () => {
    /**
     * Property 8: Clipboard URL Deduplication
     * For any URL copied to clipboard, the notification system SHALL show at most
     * one notification per unique URL within a configurable time window (default 5 seconds).
     */

    describe('isSupportedUrl', () => {
        it('should return true for YouTube URLs', () => {
            const youtubeUrls = [
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'https://youtube.com/watch?v=dQw4w9WgXcQ',
                'https://youtu.be/dQw4w9WgXcQ',
                'https://www.youtube.com/shorts/abc123',
            ];
            
            youtubeUrls.forEach(url => {
                expect(isSupportedUrl(url)).toBe(true);
            });
        });

        it('should return true for Bilibili URLs', () => {
            const bilibiliUrls = [
                'https://www.bilibili.com/video/BV1xx411c7mD',
                'https://bilibili.com/video/BV1xx411c7mD',
                'https://b23.tv/abc123',
            ];
            
            bilibiliUrls.forEach(url => {
                expect(isSupportedUrl(url)).toBe(true);
            });
        });

        it('should return true for Douyin URLs', () => {
            const douyinUrls = [
                'https://www.douyin.com/video/1234567890',
                'https://v.douyin.com/abc123',
            ];
            
            douyinUrls.forEach(url => {
                expect(isSupportedUrl(url)).toBe(true);
            });
        });

        it('should return true for TikTok URLs', () => {
            const tiktokUrls = [
                'https://www.tiktok.com/@user/video/1234567890',
                'https://vm.tiktok.com/abc123',
            ];
            
            tiktokUrls.forEach(url => {
                expect(isSupportedUrl(url)).toBe(true);
            });
        });

        it('should return false for unsupported URLs', () => {
            const unsupportedUrls = [
                'https://www.google.com',
                'https://example.com/video',
                'not a url',
                '',
                null,
                undefined,
            ];
            
            unsupportedUrls.forEach(url => {
                expect(isSupportedUrl(url)).toBe(false);
            });
        });

        it('should return false for invalid inputs', () => {
            fc.assert(
                fc.property(
                    fc.oneof(fc.constant(null), fc.constant(undefined), fc.integer(), fc.boolean()),
                    (input) => {
                        expect(isSupportedUrl(input)).toBe(false);
                    }
                ),
                { numRuns: 50 }
            );
        });
    });

    describe('extractUrl', () => {
        it('should extract URL from text containing a supported URL', () => {
            const testCases = [
                { text: 'Check out this video: https://www.youtube.com/watch?v=abc123', expected: 'https://www.youtube.com/watch?v=abc123' },
                { text: 'https://youtu.be/abc123 is cool', expected: 'https://youtu.be/abc123' },
                { text: 'Video link: https://www.bilibili.com/video/BV1xx411c7mD', expected: 'https://www.bilibili.com/video/BV1xx411c7mD' },
            ];
            
            testCases.forEach(({ text, expected }) => {
                expect(extractUrl(text)).toBe(expected);
            });
        });

        it('should return null for text without supported URLs', () => {
            const testCases = [
                'Just some random text',
                'https://www.google.com is a search engine',
                '',
            ];
            
            testCases.forEach(text => {
                expect(extractUrl(text)).toBeNull();
            });
        });

        it('should return null for invalid inputs', () => {
            expect(extractUrl(null)).toBeNull();
            expect(extractUrl(undefined)).toBeNull();
            expect(extractUrl(123)).toBeNull();
        });

        it('should handle URL as the entire text', () => {
            const url = 'https://www.youtube.com/watch?v=abc123';
            expect(extractUrl(url)).toBe(url);
        });
    });

    describe('isDuplicateUrl', () => {
        it('should return true for URLs within the time window', () => {
            fc.assert(
                fc.property(
                    fc.webUrl(),
                    fc.integer({ min: 1, max: 4999 }), // Within 5 second window
                    (url, timeDiff) => {
                        const recentUrls = new Map();
                        const now = Date.now();
                        recentUrls.set(url, now - timeDiff);
                        
                        // Mock Date.now to return consistent value
                        const originalNow = Date.now;
                        Date.now = () => now;
                        
                        const result = isDuplicateUrl(url, recentUrls, 5000);
                        
                        Date.now = originalNow;
                        
                        expect(result).toBe(true);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should return false for URLs outside the time window', () => {
            fc.assert(
                fc.property(
                    fc.webUrl(),
                    fc.integer({ min: 5001, max: 100000 }), // Outside 5 second window
                    (url, timeDiff) => {
                        const recentUrls = new Map();
                        const now = Date.now();
                        recentUrls.set(url, now - timeDiff);
                        
                        const originalNow = Date.now;
                        Date.now = () => now;
                        
                        const result = isDuplicateUrl(url, recentUrls, 5000);
                        
                        Date.now = originalNow;
                        
                        expect(result).toBe(false);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should return false for URLs not in the map', () => {
            fc.assert(
                fc.property(
                    fc.webUrl(),
                    (url) => {
                        const recentUrls = new Map();
                        expect(isDuplicateUrl(url, recentUrls, 5000)).toBe(false);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('should return false for invalid inputs', () => {
            expect(isDuplicateUrl(null, new Map(), 5000)).toBe(false);
            expect(isDuplicateUrl('url', null, 5000)).toBe(false);
            expect(isDuplicateUrl('', new Map(), 5000)).toBe(false);
        });

        it('should handle different time windows correctly', () => {
            fc.assert(
                fc.property(
                    fc.webUrl(),
                    fc.integer({ min: 100, max: 10000 }), // window size
                    fc.integer({ min: 1, max: 20000 }), // time diff
                    (url, windowMs, timeDiff) => {
                        const recentUrls = new Map();
                        const now = Date.now();
                        recentUrls.set(url, now - timeDiff);
                        
                        const originalNow = Date.now;
                        Date.now = () => now;
                        
                        const result = isDuplicateUrl(url, recentUrls, windowMs);
                        const expected = timeDiff < windowMs;
                        
                        Date.now = originalNow;
                        
                        expect(result).toBe(expected);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    describe('Deduplication invariants', () => {
        it('same URL should be duplicate within window, not duplicate after window', () => {
            const url = 'https://www.youtube.com/watch?v=test123';
            const windowMs = 5000;
            const recentUrls = new Map();
            const now = Date.now();
            
            // First detection - not a duplicate
            expect(isDuplicateUrl(url, recentUrls, windowMs)).toBe(false);
            
            // Add to recent
            recentUrls.set(url, now);
            
            // Mock time within window
            const originalNow = Date.now;
            Date.now = () => now + 1000;
            expect(isDuplicateUrl(url, recentUrls, windowMs)).toBe(true);
            
            // Mock time outside window
            Date.now = () => now + 6000;
            expect(isDuplicateUrl(url, recentUrls, windowMs)).toBe(false);
            
            Date.now = originalNow;
        });

        it('different URLs should not affect each other', () => {
            fc.assert(
                fc.property(
                    fc.webUrl(),
                    fc.webUrl(),
                    (url1, url2) => {
                        // Skip if URLs are the same
                        if (url1 === url2) return true;
                        
                        const recentUrls = new Map();
                        const now = Date.now();
                        recentUrls.set(url1, now);
                        
                        const originalNow = Date.now;
                        Date.now = () => now + 1000;
                        
                        // url1 should be duplicate
                        const url1IsDupe = isDuplicateUrl(url1, recentUrls, 5000);
                        // url2 should not be duplicate
                        const url2IsDupe = isDuplicateUrl(url2, recentUrls, 5000);
                        
                        Date.now = originalNow;
                        
                        expect(url1IsDupe).toBe(true);
                        expect(url2IsDupe).toBe(false);
                    }
                ),
                { numRuns: 50 }
            );
        });

        it('at most one notification per unique URL within window', () => {
            // Simulate multiple clipboard checks
            const url = 'https://www.youtube.com/watch?v=test';
            const windowMs = 5000;
            const recentUrls = new Map();
            const notifications = [];
            const now = Date.now();
            
            const originalNow = Date.now;
            
            // Simulate 10 clipboard checks within the window
            for (let i = 0; i < 10; i++) {
                Date.now = () => now + (i * 500); // Every 500ms
                
                if (!isDuplicateUrl(url, recentUrls, windowMs)) {
                    notifications.push({ url, time: Date.now() });
                    recentUrls.set(url, Date.now());
                }
            }
            
            Date.now = originalNow;
            
            // Should only have 1 notification
            expect(notifications.length).toBe(1);
        });
    });
});
