/**
 * Property-based tests for Platform Detector
 * Property 1: Platform Detection Consistency
 * Validates: Requirements 1.4, 1.6
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { 
    detectPlatform, 
    getPlatformInfo, 
    getPlatformIcon,
    getPlatformName,
    getPlatformColor,
    isSupportedPlatform,
    getSupportedPlatforms,
    extractVideoId
} from './platformDetector.js';

describe('Platform Detector', () => {
    // Property 1.1: detectPlatform always returns a valid platform string
    describe('Property 1.1: detectPlatform returns valid platform string', () => {
        it('should return a string for any input', () => {
            fc.assert(
                fc.property(
                    fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
                    (url) => {
                        const result = detectPlatform(url);
                        expect(typeof result).toBe('string');
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return "unknown" for invalid inputs', () => {
            expect(detectPlatform(null)).toBe('unknown');
            expect(detectPlatform(undefined)).toBe('unknown');
            expect(detectPlatform('')).toBe('unknown');
            expect(detectPlatform('not a url')).toBe('unknown');
        });
    });

    // Property 1.2: Platform detection is consistent (same URL = same platform)
    describe('Property 1.2: Platform detection consistency', () => {
        it('should return same platform for same URL', () => {
            fc.assert(
                fc.property(
                    fc.string(),
                    (url) => {
                        const result1 = detectPlatform(url);
                        const result2 = detectPlatform(url);
                        expect(result1).toBe(result2);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Property 1.3: Known URLs are correctly detected
    describe('Property 1.3: Known platform URLs are correctly detected', () => {
        const platformUrls = {
            youtube: [
                'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'https://youtu.be/dQw4w9WgXcQ',
                'https://www.youtube.com/shorts/abc123',
                'https://youtube.com/playlist?list=PLtest',
                'https://music.youtube.com/watch?v=test'
            ],
            bilibili: [
                'https://www.bilibili.com/video/BV1xx411c7mD',
                'https://bilibili.com/video/av170001',
                'https://b23.tv/abc123'
            ],
            douyin: [
                'https://www.douyin.com/video/7123456789',
                'https://v.douyin.com/abc123'
            ],
            tiktok: [
                'https://www.tiktok.com/@user/video/7123456789',
                'https://vm.tiktok.com/abc123'
            ],
            vimeo: [
                'https://vimeo.com/123456789',
                'https://player.vimeo.com/video/123456789'
            ],
            soundcloud: [
                'https://soundcloud.com/artist/track'
            ],
            twitter: [
                'https://twitter.com/user/status/123456789',
                'https://x.com/user/status/123456789'
            ]
        };

        for (const [platform, urls] of Object.entries(platformUrls)) {
            it(`should detect ${platform} URLs correctly`, () => {
                for (const url of urls) {
                    expect(detectPlatform(url)).toBe(platform);
                }
            });
        }
    });

    // Property 1.4: getPlatformInfo always returns valid info object
    describe('Property 1.4: getPlatformInfo returns valid info', () => {
        it('should return object with name, color, icon for any platform', () => {
            const platforms = [...getSupportedPlatforms(), 'unknown', 'invalid'];
            for (const platform of platforms) {
                const info = getPlatformInfo(platform);
                expect(info).toHaveProperty('name');
                expect(info).toHaveProperty('color');
                expect(info).toHaveProperty('icon');
                expect(typeof info.name).toBe('string');
                expect(typeof info.color).toBe('string');
                expect(typeof info.icon).toBe('string');
            }
        });
    });

    // Property 1.5: isSupportedPlatform is consistent with detectPlatform
    describe('Property 1.5: isSupportedPlatform consistency', () => {
        it('should return true iff detectPlatform returns non-unknown', () => {
            fc.assert(
                fc.property(
                    fc.string(),
                    (url) => {
                        const platform = detectPlatform(url);
                        const isSupported = isSupportedPlatform(url);
                        expect(isSupported).toBe(platform !== 'unknown');
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    // Property 1.6: extractVideoId returns string or null
    describe('Property 1.6: extractVideoId returns valid output', () => {
        it('should return string or null for any URL', () => {
            fc.assert(
                fc.property(
                    fc.oneof(fc.string(), fc.constant(null), fc.constant(undefined)),
                    (url) => {
                        const result = extractVideoId(url);
                        expect(result === null || typeof result === 'string').toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should extract YouTube video IDs correctly', () => {
            expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
            expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
            expect(extractVideoId('https://www.youtube.com/shorts/abc12345678')).toBe('abc12345678');
        });

        it('should extract Bilibili video IDs correctly', () => {
            expect(extractVideoId('https://www.bilibili.com/video/BV1xx411c7mD')).toBe('BV1xx411c7mD');
            expect(extractVideoId('https://bilibili.com/video/av170001')).toBe('av170001');
        });

        it('should extract Douyin video IDs correctly', () => {
            expect(extractVideoId('https://www.douyin.com/video/7123456789')).toBe('7123456789');
        });
    });

    // Unit tests for helper functions
    describe('Helper functions', () => {
        it('getPlatformIcon should return icon name', () => {
            expect(getPlatformIcon('youtube')).toBe('youtube');
            expect(getPlatformIcon('bilibili')).toBe('bilibili');
            expect(getPlatformIcon('unknown')).toBe('link');
        });

        it('getPlatformName should return display name', () => {
            expect(getPlatformName('youtube')).toBe('YouTube');
            expect(getPlatformName('bilibili')).toBe('Bilibili');
            expect(getPlatformName('unknown')).toBe('Unknown');
        });

        it('getPlatformColor should return hex color', () => {
            expect(getPlatformColor('youtube')).toBe('#FF0000');
            expect(getPlatformColor('bilibili')).toBe('#00A1D6');
            expect(getPlatformColor('unknown')).toBe('#666666');
        });

        it('getSupportedPlatforms should return array of platforms', () => {
            const platforms = getSupportedPlatforms();
            expect(Array.isArray(platforms)).toBe(true);
            expect(platforms.length).toBeGreaterThan(0);
            expect(platforms).toContain('youtube');
            expect(platforms).toContain('bilibili');
            expect(platforms).toContain('douyin');
        });
    });
});
