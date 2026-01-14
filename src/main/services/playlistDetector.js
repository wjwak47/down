/**
 * Playlist Detector Service
 * Detects and extracts playlist information from YouTube and Bilibili URLs
 * 
 * Requirements: 8.1
 */

import { spawn } from 'child_process';
import { app } from 'electron';
import path from 'path';

/**
 * URL patterns for playlist detection
 */
const PLAYLIST_PATTERNS = {
    // YouTube playlist patterns
    youtube_playlist: /(?:youtube\.com|youtu\.be).*[?&]list=([a-zA-Z0-9_-]+)/,
    youtube_channel: /youtube\.com\/(?:c\/|channel\/|user\/|@)([^/?]+)/,
    
    // Bilibili collection/series patterns
    bilibili_collection: /bilibili\.com\/video\/BV[a-zA-Z0-9]+.*[?&]p=\d+/,
    bilibili_series: /space\.bilibili\.com\/\d+\/channel\/seriesdetail\?sid=(\d+)/,
    bilibili_favlist: /bilibili\.com\/medialist\/detail\/ml(\d+)/
};

/**
 * Check if a URL is a playlist URL
 * @param {string} url - URL to check
 * @returns {Object} { isPlaylist: boolean, type: string, id: string }
 */
export function isPlaylistUrl(url) {
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

/**
 * Get the yt-dlp binary path
 * @returns {string} Path to yt-dlp binary
 */
function getBinaryPath() {
    const isPackaged = app.isPackaged;
    const platform = process.platform;
    const binName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    
    if (isPackaged) {
        return path.join(process.resourcesPath, 'bin', binName);
    } else {
        const platformFolder = platform === 'win32' ? 'bin-win' : 'bin-mac';
        return path.join(app.getAppPath(), 'resources', platformFolder, binName);
    }
}

/**
 * Get playlist information including all videos
 * @param {string} url - Playlist URL
 * @returns {Promise<Object>} Playlist info with videos array
 */
export async function getPlaylistInfo(url) {
    const binPath = getBinaryPath();
    
    return new Promise((resolve, reject) => {
        const args = [
            '--dump-json',
            '--flat-playlist',  // Only get metadata, don't download
            '--no-warnings',
            url
        ];

        const child = spawn(binPath, args);
        let output = '';
        let error = '';

        child.stdout.on('data', (data) => {
            output += data.toString('utf8');
        });

        child.stderr.on('data', (data) => {
            error += data.toString('utf8');
        });

        child.on('close', (code) => {
            if (code === 0) {
                try {
                    // yt-dlp outputs one JSON object per line for playlists
                    const lines = output.trim().split('\n').filter(line => line.trim());
                    const videos = [];
                    let playlistTitle = '';
                    let playlistId = '';
                    let playlistUploader = '';

                    for (const line of lines) {
                        try {
                            const item = JSON.parse(line);
                            
                            // First item might contain playlist metadata
                            if (item._type === 'playlist') {
                                playlistTitle = item.title || '';
                                playlistId = item.id || '';
                                playlistUploader = item.uploader || '';
                                continue;
                            }

                            // Extract video info
                            videos.push({
                                id: item.id || item.url,
                                title: item.title || `Video ${videos.length + 1}`,
                                thumbnail: item.thumbnail || item.thumbnails?.[0]?.url || null,
                                duration: item.duration || null,
                                duration_string: item.duration_string || formatDuration(item.duration),
                                uploader: item.uploader || item.channel || '',
                                url: item.url || item.webpage_url || `https://www.youtube.com/watch?v=${item.id}`,
                                index: videos.length + 1
                            });
                        } catch (parseErr) {
                            console.warn('Failed to parse playlist item:', parseErr);
                        }
                    }

                    // If no playlist metadata found, use first video's info
                    if (!playlistTitle && videos.length > 0) {
                        playlistTitle = `Playlist (${videos.length} videos)`;
                    }

                    resolve({
                        type: 'playlist',
                        title: playlistTitle,
                        id: playlistId,
                        uploader: playlistUploader,
                        videoCount: videos.length,
                        videos: videos
                    });
                } catch (e) {
                    console.error('Failed to parse playlist info:', e);
                    reject(new Error('Failed to parse playlist info'));
                }
            } else {
                reject(new Error(error || 'Failed to get playlist info'));
            }
        });
    });
}

/**
 * Format duration in seconds to string (MM:SS or HH:MM:SS)
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
function formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '--:--';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Get Bilibili multi-part video info
 * @param {string} url - Bilibili video URL
 * @returns {Promise<Object>} Video info with parts array
 */
export async function getBilibiliParts(url) {
    const binPath = getBinaryPath();
    
    return new Promise((resolve, reject) => {
        const args = [
            '--dump-json',
            '--yes-playlist',  // Include all parts
            url
        ];

        const child = spawn(binPath, args);
        let output = '';
        let error = '';

        child.stdout.on('data', (data) => {
            output += data.toString('utf8');
        });

        child.stderr.on('data', (data) => {
            error += data.toString('utf8');
        });

        child.on('close', (code) => {
            if (code === 0) {
                try {
                    const lines = output.trim().split('\n').filter(line => line.trim());
                    const parts = [];
                    let mainTitle = '';

                    for (const line of lines) {
                        try {
                            const item = JSON.parse(line);
                            
                            if (!mainTitle) {
                                mainTitle = item.title || '';
                            }

                            parts.push({
                                id: item.id,
                                title: item.title || `Part ${parts.length + 1}`,
                                thumbnail: item.thumbnail,
                                duration: item.duration,
                                duration_string: item.duration_string || formatDuration(item.duration),
                                url: item.webpage_url || url,
                                index: parts.length + 1
                            });
                        } catch (parseErr) {
                            console.warn('Failed to parse Bilibili part:', parseErr);
                        }
                    }

                    resolve({
                        type: 'bilibili_multipart',
                        title: mainTitle,
                        partCount: parts.length,
                        parts: parts
                    });
                } catch (e) {
                    reject(new Error('Failed to parse Bilibili parts'));
                }
            } else {
                reject(new Error(error || 'Failed to get Bilibili parts'));
            }
        });
    });
}

export default {
    isPlaylistUrl,
    getPlaylistInfo,
    getBilibiliParts,
    PLAYLIST_PATTERNS
};
