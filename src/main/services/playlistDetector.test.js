/**
 * Property-based tests for Playlist Detector
 * Property 8: Playlist Detection
 * Validates: Requirements 8.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// URL patterns for playlist detection (same as playlistDetector.js)
const PLAYLIST_PATTERNS = {
    youtube_playlist: /(?:youtube\.com|youtu\.be).*[?&]list=([a-zA-Z0-9_-]+)/,
    youtube_channel: /youtube\.com\/(?:c\/|channel\/|user\/|@)([^/?]+)/,
    bilibili_collection: /bilibili\.com\/video\/BV[a-zA-Z0-9]+.*[?&]p=\d+/,
    bilibili_series: /space\.bilibili\.com\/\d+\/channel\/seriesdetail\?sid=(\d+)/,
    bilibili_favlist: /bilibili\.com\/medialist\/detail\/ml(\d+)/
};

/**
 * Check if a URL is a playlist URL
 * @param {string} url - URL to check
 * @returns {Object} { isPlaylist: boolean, type: string, id: string }
 */
function isPlaylistUrl(url) {
    if (!url || typeof url !== 'string') {
        return { isPlaylist: false, type: null, id: null };
    }

    // Check YouTube playlist
    const ytPlaylistMatch = url.match(PLAYLIST_PATTERNS.youtube_playlist);
    if (ytPlaylistMatch) {
        return { isPlaylist: true, type: 'youtube_playlist', id: ytPlaylistMatch[1] };
    }

    // Check YouTube channel
    const ytChannelMatch = url.match(PLAYLIST_PATTERNS.youtube_channel);
    if (ytChannelMatch) {
        return { isPlaylist: true, type: 'youtube_channel', id: ytChannelMatch[1] };
    }

    // Check Bilibili multi-part video (分P)
    const biliCollectionMatch = url.match(PLAYLIST_PATTERNS.bilibili_collection);
    if (biliCollectionMatch) {
        return { isPlaylist: true, type: 'bilibili_multipart', id: null };
    }

    // Check Bilibili series
    const biliSeriesMatch = url.match(PLAYLIST_PATTERNS.bilibili_series);
    if (biliSeriesMatch) {
        return { isPlaylist: true, type: 'bilibili_series', id: biliSeriesMatch[1] };
    }

    // Check Bilibili favorites list
    const biliFavMatch = url.match(PLAYLIST_PATTERNS.bilibili_favlist);
    if (biliFavMatch) {
        return { isPlaylist: true, type: 'bilibili_favlist', id: biliFavMatch[1] };
    }

    return { isPlaylist: false, type: null, id: null };
}

// Arbitrary generators for playlist URLs
const youtubePlaylistIdArb = fc.string({ minLength: 10, maxLength: 34 })
    .filter(s => /^[a-zA-Z0-9_-]+$/.test(s) && s.length >= 10);

const youtubePlaylistUrlArb = youtubePlaylistIdArb.map(id => 
    `https://www.youtube.com/playlist?list=${id}`
);

const youtubeVideoWithPlaylistArb = fc.tuple(
    fc.string({ minLength: 11, maxLength: 11 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
    youtubePlaylistIdArb
).map(([videoId, playlistId]) => 
    `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`
);

const youtubeChannelUrlArb = fc.tuple(
    fc.constantFrom('c/', 'channel/', 'user/', '@'),
    fc.string({ minLength: 3, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s) && s.length >= 3)
).map(([type, name]) => 
    `https://www.youtube.com/${type}${name}`
);

const bilibiliMultipartUrlArb = fc.tuple(
    fc.string({ minLength: 10, maxLength: 12 }).filter(s => /^[a-zA-Z0-9]+$/.test(s) && s.length >= 10),
    fc.integer({ min: 1, max: 100 })
).map(([bvId, part]) => 
    `https://www.bilibili.com/video/BV${bvId}?p=${part}`
);

const bilibiliSeriesUrlArb = fc.tuple(
    fc.integer({ min: 1000000, max: 999999999 }),
    fc.integer({ min: 1, max: 999999 })
).map(([uid, sid]) => 
    `https://space.bilibili.com/${uid}/channel/seriesdetail?sid=${sid}`
);

const bilibiliFavlistUrlArb = fc.integer({ min: 1, max: 999999999 }).map(id => 
    `https://www.bilibili.com/medialist/detail/ml${id}`
);

// Non-playlist URLs
const singleVideoUrlArb = fc.constantFrom(
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.bilibili.com/video/BV1xx411c7mD',
    'https://www.douyin.com/video/7123456789012345678',
    'https://vimeo.com/123456789',
    'https://soundcloud.com/artist/track'
);

describe('Playlist Detector', () => {
    // Property 8.1: YouTube playlist URLs are detected
    describe('Property 8.1: YouTube playlist detection', () => {
        it('should detect YouTube playlist URLs', () => {
            fc.assert(
                fc.property(youtubePlaylistUrlArb, (url) => {
                    const result = isPlaylistUrl(url);
                    expect(result.isPlaylist).toBe(true);
                    expect(result.type).toBe('youtube_playlist');
                    expect(result.id).toBeTruthy();
                }),
                { numRuns: 100 }
            );
        });

        it('should detect YouTube video URLs with playlist parameter', () => {
            fc.assert(
                fc.property(youtubeVideoWithPlaylistArb, (url) => {
                    const result = isPlaylistUrl(url);
                    expect(result.isPlaylist).toBe(true);
                    expect(result.type).toBe('youtube_playlist');
                    expect(result.id).toBeTruthy();
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 8.2: YouTube channel URLs are detected
    describe('Property 8.2: YouTube channel detection', () => {
        it('should detect YouTube channel URLs', () => {
            fc.assert(
                fc.property(youtubeChannelUrlArb, (url) => {
                    const result = isPlaylistUrl(url);
                    expect(result.isPlaylist).toBe(true);
                    expect(result.type).toBe('youtube_channel');
                    expect(result.id).toBeTruthy();
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 8.3: Bilibili multi-part URLs are detected
    describe('Property 8.3: Bilibili multi-part detection', () => {
        it('should detect Bilibili multi-part video URLs', () => {
            fc.assert(
                fc.property(bilibiliMultipartUrlArb, (url) => {
                    const result = isPlaylistUrl(url);
                    expect(result.isPlaylist).toBe(true);
                    expect(result.type).toBe('bilibili_multipart');
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 8.4: Bilibili series URLs are detected
    describe('Property 8.4: Bilibili series detection', () => {
        it('should detect Bilibili series URLs', () => {
            fc.assert(
                fc.property(bilibiliSeriesUrlArb, (url) => {
                    const result = isPlaylistUrl(url);
                    expect(result.isPlaylist).toBe(true);
                    expect(result.type).toBe('bilibili_series');
                    expect(result.id).toBeTruthy();
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 8.5: Bilibili favorites URLs are detected
    describe('Property 8.5: Bilibili favorites detection', () => {
        it('should detect Bilibili favorites list URLs', () => {
            fc.assert(
                fc.property(bilibiliFavlistUrlArb, (url) => {
                    const result = isPlaylistUrl(url);
                    expect(result.isPlaylist).toBe(true);
                    expect(result.type).toBe('bilibili_favlist');
                    expect(result.id).toBeTruthy();
                }),
                { numRuns: 100 }
            );
        });
    });

    // Property 8.6: Single video URLs are not detected as playlists
    describe('Property 8.6: Single video URLs are not playlists', () => {
        it('should not detect single video URLs as playlists', () => {
            fc.assert(
                fc.property(singleVideoUrlArb, (url) => {
                    const result = isPlaylistUrl(url);
                    expect(result.isPlaylist).toBe(false);
                    expect(result.type).toBeNull();
                    expect(result.id).toBeNull();
                }),
                { numRuns: 20 }
            );
        });
    });

    // Property 8.7: Invalid inputs are handled gracefully
    describe('Property 8.7: Invalid input handling', () => {
        it('should handle null/undefined gracefully', () => {
            expect(isPlaylistUrl(null)).toEqual({ isPlaylist: false, type: null, id: null });
            expect(isPlaylistUrl(undefined)).toEqual({ isPlaylist: false, type: null, id: null });
            expect(isPlaylistUrl('')).toEqual({ isPlaylist: false, type: null, id: null });
        });

        it('should handle non-string inputs gracefully', () => {
            expect(isPlaylistUrl(123)).toEqual({ isPlaylist: false, type: null, id: null });
            expect(isPlaylistUrl({})).toEqual({ isPlaylist: false, type: null, id: null });
            expect(isPlaylistUrl([])).toEqual({ isPlaylist: false, type: null, id: null });
        });
    });

    // Unit tests for specific URLs
    describe('Specific URL tests', () => {
        it('should detect standard YouTube playlist', () => {
            const result = isPlaylistUrl('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf');
            expect(result.isPlaylist).toBe(true);
            expect(result.type).toBe('youtube_playlist');
            expect(result.id).toBe('PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf');
        });

        it('should detect YouTube video with playlist', () => {
            const result = isPlaylistUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf');
            expect(result.isPlaylist).toBe(true);
            expect(result.type).toBe('youtube_playlist');
        });

        it('should detect YouTube channel with @', () => {
            const result = isPlaylistUrl('https://www.youtube.com/@MrBeast');
            expect(result.isPlaylist).toBe(true);
            expect(result.type).toBe('youtube_channel');
            expect(result.id).toBe('MrBeast');
        });

        it('should detect Bilibili multi-part video', () => {
            const result = isPlaylistUrl('https://www.bilibili.com/video/BV1xx411c7mD?p=2');
            expect(result.isPlaylist).toBe(true);
            expect(result.type).toBe('bilibili_multipart');
        });

        it('should not detect single YouTube video', () => {
            const result = isPlaylistUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            expect(result.isPlaylist).toBe(false);
        });

        it('should not detect single Bilibili video', () => {
            const result = isPlaylistUrl('https://www.bilibili.com/video/BV1xx411c7mD');
            expect(result.isPlaylist).toBe(false);
        });
    });
});
