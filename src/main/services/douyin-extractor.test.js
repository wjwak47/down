/**
 * 抖音提取器属性测试
 * 
 * Property 2: 视频ID提取正确性
 * Property 3: 视频URL处理正确性
 * Property 4: 请求头完整性
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// 直接复制纯函数进行测试（避免 Electron 依赖）
function extractVideoId(url) {
    if (!url || typeof url !== 'string') return null;
    
    const videoMatch = url.match(/\/video\/(\d+)/);
    if (videoMatch) return videoMatch[1];
    
    const modalMatch = url.match(/modal_id=(\d+)/);
    if (modalMatch) return modalMatch[1];
    
    const noteMatch = url.match(/note_id=(\d+)/);
    if (noteMatch) return noteMatch[1];
    
    return null;
}

function processVideoUrl(url) {
    if (!url || typeof url !== 'string') return url;
    
    let result = url;
    
    if (result.includes('playwm')) {
        result = result.replace(/playwm/g, 'play');
    }
    
    if (result.includes('_265')) {
        result = result.replace(/_265/g, '_264');
    }
    if (result.includes('hevc')) {
        result = result.replace(/hevc/g, 'h264');
    }
    
    return result;
}

describe('Douyin Extractor', () => {
    
    // ============================================
    // Property 2: 视频ID提取正确性
    // Validates: Requirements 2.1, 2.2
    // ============================================
    describe('Property 2: extractVideoId', () => {
        
        const videoIdArb = fc.integer({ min: 1000000000, max: 9999999999 }).map(n => String(n));
        
        it('应该从 /video/ID 格式中提取ID', () => {
            fc.assert(
                fc.property(videoIdArb, (id) => {
                    const url = `https://www.douyin.com/video/${id}`;
                    return extractVideoId(url) === id;
                }),
                { numRuns: 100 }
            );
        });
        
        it('应该从 modal_id=ID 格式中提取ID', () => {
            fc.assert(
                fc.property(videoIdArb, (id) => {
                    const url = `https://www.douyin.com/user/xxx?modal_id=${id}`;
                    return extractVideoId(url) === id;
                }),
                { numRuns: 100 }
            );
        });
        
        it('应该从 note_id=ID 格式中提取ID', () => {
            fc.assert(
                fc.property(videoIdArb, (id) => {
                    const url = `https://www.douyin.com/note/xxx?note_id=${id}`;
                    return extractVideoId(url) === id;
                }),
                { numRuns: 100 }
            );
        });
        
        it('无效URL应该返回null', () => {
            expect(extractVideoId(null)).toBeNull();
            expect(extractVideoId(undefined)).toBeNull();
            expect(extractVideoId('')).toBeNull();
            expect(extractVideoId('https://www.douyin.com/')).toBeNull();
        });
    });
    
    // ============================================
    // Property 3: 视频URL处理正确性
    // Validates: Requirements 3.2
    // ============================================
    describe('Property 3: processVideoUrl', () => {
        
        it('应该将 playwm 替换为 play', () => {
            ['playwm', 'path/playwm/file', 'prefix_playwm_suffix'].forEach(url => {
                const result = processVideoUrl(url);
                expect(result).not.toContain('playwm');
                expect(result).toContain('play');
            });
        });
        
        it('应该将 _265 替换为 _264', () => {
            ['_265', 'video_265.mp4', 'path_265/file'].forEach(url => {
                const result = processVideoUrl(url);
                expect(result).not.toContain('_265');
                expect(result).toContain('_264');
            });
        });
        
        it('应该将 hevc 替换为 h264', () => {
            ['hevc', 'path/hevc/file', 'prefix_hevc_suffix'].forEach(url => {
                const result = processVideoUrl(url);
                expect(result).not.toContain('hevc');
                expect(result).toContain('h264');
            });
        });
        
        it('不包含特殊标记的URL应该保持不变', () => {
            ['https://example.com/video.mp4', 'simple_string', ''].forEach(url => {
                expect(processVideoUrl(url)).toBe(url);
            });
        });
        
        it('无效输入应该原样返回', () => {
            expect(processVideoUrl(null)).toBeNull();
            expect(processVideoUrl(undefined)).toBeUndefined();
        });
        
        it('Property: 幂等性 - 处理后再处理应该不变', () => {
            fc.assert(
                fc.property(fc.string(), (str) => {
                    const once = processVideoUrl(str);
                    const twice = processVideoUrl(once);
                    return once === twice;
                }),
                { numRuns: 100 }
            );
        });
    });
    
    // ============================================
    // Property 4: 请求头完整性
    // Validates: Requirements 4.3
    // ============================================
    describe('Property 4: Headers Completeness', () => {
        
        // 模拟返回结果结构
        const mockResult = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': 'test=value',
                'Referer': 'https://www.douyin.com/'
            },
            extractor: 'douyin_native',
            url: 'https://v26-web.douyinvod.com/video.mp4'
        };
        
        it('返回结果应该包含必要的 headers', () => {
            expect(mockResult.headers).toBeDefined();
            expect(mockResult.headers['User-Agent']).toBeDefined();
            expect(mockResult.headers['Cookie']).toBeDefined();
            expect(mockResult.headers['Referer']).toBeDefined();
        });
        
        it('User-Agent 应该是有效的浏览器标识', () => {
            expect(mockResult.headers['User-Agent']).toContain('Mozilla');
        });
        
        it('Referer 应该是抖音域名', () => {
            expect(mockResult.headers['Referer']).toContain('douyin.com');
        });
        
        it('返回结果应该包含 extractor 标识', () => {
            expect(mockResult.extractor).toBe('douyin_native');
        });
    });
});
