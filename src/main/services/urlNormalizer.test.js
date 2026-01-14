import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { normalizeUrl, needsThumbnailProxy } from './urlNormalizer';

describe('normalizeUrl', () => {
    describe('unit tests', () => {
        it('should prepend https: to protocol-relative URLs', () => {
            expect(normalizeUrl('//example.com/image.jpg')).toBe('https://example.com/image.jpg');
        });

        it('should keep https URLs unchanged', () => {
            expect(normalizeUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
        });

        it('should keep http URLs unchanged', () => {
            expect(normalizeUrl('http://example.com/image.jpg')).toBe('http://example.com/image.jpg');
        });

        it('should return null for null input', () => {
            expect(normalizeUrl(null)).toBe(null);
        });

        it('should return null for undefined input', () => {
            expect(normalizeUrl(undefined)).toBe(null);
        });

        it('should return null for empty string', () => {
            expect(normalizeUrl('')).toBe(null);
        });

        it('should return null for whitespace-only string', () => {
            expect(normalizeUrl('   ')).toBe(null);
        });

        it('should return null for URLs without protocol', () => {
            expect(normalizeUrl('example.com/image.jpg')).toBe(null);
        });

        it('should trim whitespace from URLs', () => {
            expect(normalizeUrl('  https://example.com/image.jpg  ')).toBe('https://example.com/image.jpg');
        });
    });

    describe('property tests', () => {
        /**
         * Property 3: URL Normalization
         * For any thumbnail URL starting with "//", the normalization function 
         * SHALL prepend "https:" to produce a valid absolute URL.
         * Validates: Requirements 5.3
         */
        it('should always produce https:// URLs from protocol-relative URLs', () => {
            fc.assert(
                fc.property(
                    fc.webUrl().map(url => '//' + url.replace(/^https?:\/\//, '')),
                    (protocolRelativeUrl) => {
                        const result = normalizeUrl(protocolRelativeUrl);
                        expect(result).not.toBeNull();
                        expect(result.startsWith('https://')).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should preserve valid https URLs', () => {
            fc.assert(
                fc.property(
                    fc.webUrl({ validSchemes: ['https'] }),
                    (httpsUrl) => {
                        const result = normalizeUrl(httpsUrl);
                        expect(result).toBe(httpsUrl);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should preserve valid http URLs', () => {
            fc.assert(
                fc.property(
                    fc.webUrl({ validSchemes: ['http'] }),
                    (httpUrl) => {
                        const result = normalizeUrl(httpUrl);
                        expect(result).toBe(httpUrl);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});

describe('needsThumbnailProxy', () => {
    describe('unit tests', () => {
        // Domains that need proxy
        it('should return true for hdslb.com URLs', () => {
            expect(needsThumbnailProxy('https://i0.hdslb.com/bfs/archive/xxx.jpg', null)).toBe(true);
        });

        it('should return true for bilibili.com URLs', () => {
            expect(needsThumbnailProxy('https://static.bilibili.com/xxx.jpg', null)).toBe(true);
        });

        it('should return true for douyinpic.com URLs', () => {
            expect(needsThumbnailProxy('https://p3.douyinpic.com/xxx.jpg', null)).toBe(true);
        });

        it('should return true for douyincdn.com URLs', () => {
            expect(needsThumbnailProxy('https://v3.douyincdn.com/xxx.jpg', null)).toBe(true);
        });

        it('should return true for byteimg.com URLs', () => {
            expect(needsThumbnailProxy('https://p9-sign.byteimg.com/xxx.jpg', null)).toBe(true);
        });

        it('should return true for tiktokcdn.com URLs', () => {
            expect(needsThumbnailProxy('https://p16-sign.tiktokcdn.com/xxx.jpg', null)).toBe(true);
        });

        // Platform-based detection
        it('should return true for douyin platform', () => {
            expect(needsThumbnailProxy('https://example.com/image.jpg', 'douyin')).toBe(true);
        });

        it('should return true for bilibili platform', () => {
            expect(needsThumbnailProxy('https://example.com/image.jpg', 'bilibili')).toBe(true);
        });

        it('should return true for tiktok platform', () => {
            expect(needsThumbnailProxy('https://example.com/image.jpg', 'tiktok')).toBe(true);
        });

        // URLs that don't need proxy
        it('should return false for youtube URLs', () => {
            expect(needsThumbnailProxy('https://i.ytimg.com/vi/xxx/maxresdefault.jpg', null)).toBe(false);
        });

        it('should return false for generic URLs without platform', () => {
            expect(needsThumbnailProxy('https://example.com/image.jpg', null)).toBe(false);
        });

        it('should return false for null URL', () => {
            expect(needsThumbnailProxy(null, 'douyin')).toBe(false);
        });

        it('should return false for empty URL', () => {
            expect(needsThumbnailProxy('', 'douyin')).toBe(false);
        });
    });

    describe('property tests', () => {
        /**
         * Property 4: Proxy Domain Detection
         * For any thumbnail URL, the proxy detection function SHALL return true 
         * if and only if the URL contains domains requiring proxy.
         * Validates: Requirements 4.3
         */
        const proxyDomains = [
            'hdslb.com',
            'bilibili.com',
            'douyinpic.com',
            'douyincdn.com',
            'byteimg.com',
            'tiktokcdn.com',
            'pstatp.com',
            'snssdk.com'
        ];

        it('should always return true for URLs containing proxy domains', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom(...proxyDomains),
                    fc.string({ minLength: 8, maxLength: 16 }).filter(s => /^[a-z0-9]+$/.test(s)),
                    (domain, randomPath) => {
                        const url = `https://p1.${domain}/${randomPath}.jpg`;
                        expect(needsThumbnailProxy(url, null)).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should always return true for platforms requiring proxy', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('douyin', 'bilibili', 'tiktok'),
                    fc.webUrl(),
                    (platform, url) => {
                        expect(needsThumbnailProxy(url, platform)).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('should return false for non-proxy domains without platform', () => {
            fc.assert(
                fc.property(
                    fc.constantFrom('youtube.com', 'vimeo.com', 'dailymotion.com', 'example.com'),
                    fc.string({ minLength: 8, maxLength: 16 }).filter(s => /^[a-z0-9]+$/.test(s)),
                    (domain, randomPath) => {
                        const url = `https://cdn.${domain}/${randomPath}.jpg`;
                        expect(needsThumbnailProxy(url, null)).toBe(false);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
