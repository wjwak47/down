import React, { useEffect, useRef, useState } from 'react';

const VideoCard = ({ info, onDownload }) => {
    if (!info) return null;

    const { title, duration_string, uploader } = info;
    const [proxyUrl, setProxyUrl] = useState(null);
    const videoRef = useRef(null);
    const [isMuted, setIsMuted] = useState(false);

    // Get proxy URL for video
    useEffect(() => {
        const getProxy = async () => {
            try {
                console.log('[VideoCard] Getting proxy URL for video info:', JSON.stringify(info, null, 2));
                const url = await window.api.getVideoProxyUrl(info);
                console.log('[VideoCard] Got proxy URL:', url);
                setProxyUrl(url);

                // Test if the URL is accessible
                fetch(url, { method: 'HEAD' })
                    .then(res => console.log('[VideoCard] Proxy URL test response:', res.status))
                    .catch(err => console.error('[VideoCard] Proxy URL test failed:', err));
            } catch (e) {
                console.error('[VideoCard] Failed to get proxy URL:', e);
            }
        };
        getProxy();
    }, [info]);

    // Autoplay when proxy URL is ready
    useEffect(() => {
        if (proxyUrl && videoRef.current) {
            console.log('[VideoCard] Setting video src to:', proxyUrl);
            setTimeout(() => {
                if (videoRef.current) {
                    console.log('[VideoCard] Attempting to play video');
                    videoRef.current.play().catch((err) => {
                        console.error('[VideoCard] Autoplay failed:', err);
                    });
                }
            }, 300);
        }
    }, [proxyUrl]);

    // Toggle mute on click
    const toggleMute = () => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        if (videoRef.current) {
            videoRef.current.muted = newMutedState;
            if (!newMutedState) {
                videoRef.current.volume = 1.0;
                // Force play if paused
                if (videoRef.current.paused) {
                    videoRef.current.play().catch(console.error);
                }
            }
        }
    };

    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
            display: 'flex',
            gap: '24px',
            alignItems: 'flex-start',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-color)'
        }}>
            <div
                style={{ width: '240px', height: '135px', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                onClick={toggleMute}
            >
                {proxyUrl ? (
                    <>
                        <video
                            ref={videoRef}
                            src={proxyUrl}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            muted={isMuted}
                            loop
                            playsInline
                            onError={(e) => {
                                console.error('[VideoCard] Video error:', videoRef.current?.error);
                            }}
                            onLoadedData={() => {
                                console.log('[VideoCard] Video loaded successfully');
                                if (videoRef.current) {
                                    videoRef.current.volume = 1.0;
                                    videoRef.current.muted = false;
                                }
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.6)',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            backdropFilter: 'blur(4px)'
                        }}>
                            {isMuted ? '🔇' : '🔊'}
                        </div>
                    </>
                ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', background: '#f5f5f5' }}>
                        <p style={{ margin: 0, fontSize: '13px' }}>Loading...</p>
                    </div>
                )}
            </div>
            <div style={{ flex: 1 }}>
                <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '18px', lineHeight: '1.4', color: 'var(--text-primary)' }}>{title}</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 16px 0', fontSize: '14px' }}>{uploader} • {duration_string}</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button className="btn" onClick={() => onDownload('video')}>
                        <span>⬇️</span> Download Video
                    </button>
                    <button className="btn btn-secondary" onClick={() => onDownload('audio')}>
                        <span>🎵</span> Audio Only
                    </button>
                    {info.extractor === 'youtube' && (
                        <button
                            className="btn btn-secondary"
                            onClick={() => onDownload('subtitle')}
                        >
                            <span>📝</span> Subtitles
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoCard;
