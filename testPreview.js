import YtDlpService from './src/main/services/yt-dlp.js';

(async () => {
    const link = 'https://v.douyin.com/5wIoJZypBgQ/';
    try {
        const info = await YtDlpService.getVideoInfo(link);
        console.log('Video info retrieved:', info);
        const previewPath = await YtDlpService.getPreviewVideo(info);
        console.log('Preview saved at:', previewPath);
    } catch (e) {
        console.error('Error during preview fetch:', e);
    }
})();
