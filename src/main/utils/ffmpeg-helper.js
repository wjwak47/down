// Lazy load ffmpeg to avoid startup issues
let ffmpeg = null;
let ffmpegPath = null;

const initFfmpeg = async () => {
    if (ffmpeg) return ffmpeg;

    try {
        const ffmpegModule = await import('fluent-ffmpeg');
        const { app } = await import('electron');
        const path = await import('path');

        ffmpeg = ffmpegModule.default;

        // Use custom ffmpeg from resources/bin (platform-specific)
        const binName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
        
        if (app.isPackaged) {
            // In production, ffmpeg is in resources/bin
            ffmpegPath = path.join(process.resourcesPath, 'bin', binName);
        } else {
            // In development, use platform-specific folder
            const platformFolder = process.platform === 'win32' ? 'bin-win' : 'bin-mac';
            ffmpegPath = path.join(app.getAppPath(), 'resources', platformFolder, binName);
        }

        console.log('[FFmpeg] Using path:', ffmpegPath);
        ffmpeg.setFfmpegPath(ffmpegPath);
        return ffmpeg;
    } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        throw new Error('FFmpeg is not available');
    }
};

export const getFfmpegPath = async () => {
    await initFfmpeg();
    return ffmpegPath;
};

export const createCommand = async (input) => {
    const ffmpegInstance = await initFfmpeg();
    return ffmpegInstance(input);
};

export default { createCommand, getFfmpegPath };

