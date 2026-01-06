import React, { useState, useEffect } from 'react';
import InputBar from './components/InputBar';
import VideoCard from './components/VideoCard';
import DownloadItem from './components/DownloadItem';
import Settings from './components/Settings';
import SubtitleDialog from './components/SubtitleDialog';

function App() {
    const [videoInfo, setVideoInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [downloads, setDownloads] = useState({}); // Map of id -> download object
    const [error, setError] = useState(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isSubtitleDialogOpen, setIsSubtitleDialogOpen] = useState(false);

    useEffect(() => {
        const handleProgress = ({ id, progress }) => {
            setDownloads(prev => {
                // If it was paused/cancelled, ignore progress updates (though backend should stop sending them)
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
                // If manually cancelled, we might have already removed it or set status
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
            // Always remove from list, even if backend couldn't find the process (e.g. it was paused)
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
        // To resume, we just start the download again with the same parameters.
        // yt-dlp will automatically resume from the partial file.
        const options = {
            format: item.type === 'audio' ? 'bestaudio' : 'bestvideo+bestaudio',
            output: '%(title)s.%(ext)s',
            headers: videoInfo ? videoInfo.headers : {}, // Note: might need to persist headers if videoInfo is gone
            audioOnly: item.type === 'audio',
            downloadDir: localStorage.getItem('downloadPath') || undefined
        };

        // We need the original URL. We stored it in the item? No, we didn't.
        // We should store the url in the download item state.
        // Let's update handleDownload to store url.
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
        // Extract URL from rawInput (handles TikTok share text etc.)
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
            // Friendly error mapping
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

        // Open subtitle dialog for subtitle downloads
        if (type === 'subtitle') {
            setIsSubtitleDialogOpen(true);
            return;
        }

        const id = Date.now().toString();
        const savedPath = localStorage.getItem('downloadPath');
        const options = {
            format: type === 'audio' ? 'bestaudio' : 'bestvideo+bestaudio',
            output: '%(title)s.%(ext)s', // Default filename template
            headers: videoInfo.headers, // Pass extracted headers (User-Agent, Cookie, etc.)
            audioOnly: type === 'audio',
            downloadDir: savedPath || undefined // Use saved path if available
        };

        // For YouTube, always use webpage_url (original link) for download
        // For other platforms (like Douyin), use the direct video URL
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
                url: downloadUrl, // Store URL for resume
                headers: videoInfo.headers // Store headers for resume
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
                url: videoInfo.webpage_url // Store URL for resume (though subtitles might be different)
            }
        }));

        console.log('[App] Downloading subtitles:', subtitleOptions);
        window.api.downloadSubtitles(videoInfo.webpage_url, options, id);
    };

    const handleEudicUploadClick = async (download) => {
        try {
            const settings = await window.api.getSettings();
            if (!settings.eudicCookie) {
                alert('请先在设置中配置欧路听力Cookie');
                return;
            }
            if (!settings.eudicChannel) {
                alert('请先在设置中选择上传频道');
                return;
            }

            // 直接打开上传页面
            await window.api.eudicUploadAudio(
                download.filePath || '',
                settings.eudicChannel,
                null // 不需要自定义文件名了
            );
        } catch (error) {
            alert('打开上传页面失败：' + error.message);
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-app)' }}>
            <header className="app-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--primary-color)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                        VD
                    </div>
                    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        Video Downloader
                    </h1>
                </div>
                <button
                    className="btn btn-secondary"
                    onClick={() => setIsSettingsOpen(true)}
                    style={{ fontSize: '14px', padding: '8px 16px' }}
                >
                    ⚙️ Settings
                </button>
            </header>

            <main className="main-content">
                <InputBar onParse={handleParse} isLoading={isLoading} />

                {error && (
                    <div style={{
                        marginBottom: '24px',
                        padding: '16px',
                        background: '#fff1f0',
                        border: '1px solid #ffccc7',
                        borderRadius: 'var(--radius-md)',
                        color: '#cf1322',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        animation: 'fadeIn 0.3s ease'
                    }}>
                        <span>⚠️</span> {error}
                    </div>
                )}

                {videoInfo && (
                    <div style={{ marginBottom: '30px', animation: 'fadeIn 0.5s ease' }}>
                        <VideoCard info={videoInfo} onDownload={handleDownload} />
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {Object.values(downloads).length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-secondary)' }}>Downloads</h3>
                            <button
                                onClick={handleClearHistory}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'none'}
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
            </main>

            <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <SubtitleDialog
                isOpen={isSubtitleDialogOpen}
                onClose={() => setIsSubtitleDialogOpen(false)}
                videoInfo={videoInfo}
                onDownload={handleSubtitleDownload}
            />
        </div>
    );
}

export default App;
