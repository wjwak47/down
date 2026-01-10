import React, { useState, useEffect } from 'react';
import InputBar from '../components/InputBar';
import VideoCard from '../components/VideoCard';
import DownloadItem from '../components/DownloadItem';
import SubtitleDialog from '../components/SubtitleDialog';

function VideoDownloader() {
    const [videoInfo, setVideoInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [downloads, setDownloads] = useState({}); // Map of id -> download object
    const [error, setError] = useState(null);
    const [isSubtitleDialogOpen, setIsSubtitleDialogOpen] = useState(false);

    useEffect(() => {
        const handleProgress = ({ id, progress }) => {
            setDownloads(prev => {
                if (!prev[id] || prev[id].status === 'Paused' || prev[id].status === 'Cancelled') return prev;
                return {
                    ...prev,
                    [id]: { ...prev[id], progress: progress, status: 'Downloading...' }
                };
            });
        };

        const handleComplete = ({ id, code, filePath }) => {
            setDownloads(prev => {
                if (!prev[id]) return prev;
                if (prev[id].status === 'Cancelled') return prev;
                return {
                    ...prev,
                    [id]: {
                        ...prev[id],
                        progress: 100,
                        status: code === 0 ? 'Completed' : 'Failed',
                        filePath: filePath
                    }
                };
            });
        };

        const handlePauseReply = ({ id, success }) => {
            if (success) {
                setDownloads(prev => ({
                    ...prev,
                    [id]: { ...prev[id], status: 'Paused' }
                }));
            }
        };

        const handleCancelReply = ({ id, success }) => {
            setDownloads(prev => {
                const newState = { ...prev };
                delete newState[id];
                return newState;
            });
        };

        window.api.onProgress(handleProgress);
        window.api.onComplete(handleComplete);
        window.api.onPauseReply(handlePauseReply);
        window.api.onCancelReply(handleCancelReply);

        return () => {
            window.api.removeListeners();
        };
    }, []);

    const handlePause = (id) => {
        window.api.pauseDownload(id);
    };

    const handleResume = (item) => {
        const options = {
            format: item.type === 'audio' ? 'bestaudio' : 'bestvideo+bestaudio',
            output: '%(title)s.%(ext)s',
            headers: videoInfo ? videoInfo.headers : {},
            audioOnly: item.type === 'audio',
            downloadDir: localStorage.getItem('downloadPath') || undefined
        };

        if (item.url) {
            setDownloads(prev => ({
                ...prev,
                [item.id]: { ...prev[item.id], status: 'Resuming...' }
            }));
            window.api.downloadVideo(item.url, options, item.id);
        } else {
            console.error('Cannot resume: missing URL');
        }
    };

    const handleCancel = (id) => {
        window.api.cancelDownload(id);
    };

    const handleParse = async (rawInput) => {
        const urlMatch = rawInput.match(/(https?:\/\/[^\s]+)/);
        const url = urlMatch ? urlMatch[0] : rawInput;

        if (!url) {
            setError('Please enter a valid video link');
            return;
        }

        setIsLoading(true);
        setVideoInfo(null);
        setError(null);
        try {
            const info = await window.api.getVideoInfo(url);
            setVideoInfo(info);
        } catch (error) {
            console.error(error);
            let friendlyMsg = 'Parsing failed, please check if the link is correct';
            if (error.message.includes('404')) friendlyMsg = 'Video not found or has been deleted';
            if (error.message.includes('timeout')) friendlyMsg = 'Connection timeout, please check your network';
            setError(friendlyMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = (type) => {
        if (!videoInfo) return;

        if (type === 'subtitle') {
            setIsSubtitleDialogOpen(true);
            return;
        }

        const id = Date.now().toString();
        const savedPath = localStorage.getItem('downloadPath');
        const options = {
            format: type === 'audio' ? 'bestaudio' : 'bestvideo+bestaudio',
            output: '%(title)s.%(ext)s',
            headers: videoInfo.headers,
            audioOnly: type === 'audio',
            downloadDir: savedPath || undefined
        };

        const downloadUrl = videoInfo.extractor === 'youtube'
            ? videoInfo.webpage_url
            : (videoInfo.url || videoInfo.webpage_url);

        setDownloads(prev => ({
            ...prev,
            [id]: {
                id,
                title: videoInfo.title,
                thumbnail: videoInfo.thumbnail,
                progress: 0,
                status: 'Starting...',
                type: type,
                url: downloadUrl,
                headers: videoInfo.headers
            }
        }));

        console.log('[App] Downloading from:', downloadUrl, 'extractor:', videoInfo.extractor);
        window.api.downloadVideo(downloadUrl, options, id);
    };

    const handleSubtitleDownload = (subtitleOptions) => {
        if (!videoInfo) return;

        const id = Date.now().toString();
        const savedPath = localStorage.getItem('downloadPath');
        const options = {
            ...subtitleOptions,
            downloadDir: savedPath || undefined
        };

        setDownloads(prev => ({
            ...prev,
            [id]: {
                id,
                title: `${videoInfo.title} (Subtitles)`,
                thumbnail: videoInfo.thumbnail,
                progress: 0,
                status: 'Starting...',
                type: 'subtitle',
                url: videoInfo.webpage_url
            }
        }));

        console.log('[App] Downloading subtitles:', subtitleOptions);
        window.api.downloadSubtitles(videoInfo.webpage_url, options, id);
    };

    const handleEudicUploadClick = async (download) => {
        try {
            const settings = await window.api.getSettings();
            if (!settings.eudicCookie) {
                alert('Please configure Eudic Cookie in settings first');
                return;
            }
            if (!settings.eudicChannel) {
                alert('Please select an upload channel in settings first');
                return;
            }

            await window.api.eudicUploadAudio(
                download.filePath || '',
                settings.eudicChannel,
                null
            );
        } catch (error) {
            alert('Failed to open upload page: ' + error.message);
        }
    };

    const handleClearHistory = () => {
        setDownloads(prev => {
            const newState = { ...prev };
            Object.keys(newState).forEach(key => {
                const status = newState[key].status;
                if (status === 'Completed' || status === 'Failed') {
                    delete newState[key];
                }
            });
            return newState;
        });
    };

    return (
        <div className="h-full flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-text-primary">Video Downloader</h2>
            </div>

            <InputBar onParse={handleParse} isLoading={isLoading} />

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 flex items-center gap-2 animate-fade-in">
                    <span>⚠️</span> {error}
                </div>
            )}

            {videoInfo && (
                <div className="mb-8 animate-fade-in">
                    <VideoCard info={videoInfo} onDownload={handleDownload} />
                </div>
            )}

            <div className="flex flex-col gap-4">
                {Object.values(downloads).length > 0 && (
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-base text-text-secondary font-medium">Downloads</h3>
                        <button
                            onClick={handleClearHistory}
                            className="text-text-secondary hover:bg-gray-100 px-2 py-1 rounded transition-colors text-sm flex items-center gap-1"
                        >
                            🗑️ Clear History
                        </button>
                    </div>
                )}
                {Object.values(downloads).map(item => (
                    <DownloadItem
                        key={item.id}
                        item={item}
                        onEudicUpload={() => handleEudicUploadClick(item)}
                        onPause={() => handlePause(item.id)}
                        onResume={() => handleResume(item)}
                        onCancel={() => handleCancel(item.id)}
                    />
                ))}
            </div>


            <SubtitleDialog
                isOpen={isSubtitleDialogOpen}
                onClose={() => setIsSubtitleDialogOpen(false)}
                videoInfo={videoInfo}
                onDownload={handleSubtitleDownload}
            />
        </div>
    );
}

export default VideoDownloader;
