import React from 'react';

const DownloadItem = ({ item, onEudicUpload, onPause, onResume, onCancel }) => {
    const getStatusColor = () => {
        switch (item.status) {
            case 'Completed':
            case 'completed': return '#52c41a'; // Green
            case 'Failed':
            case 'error': return '#ff4d4f'; // Red
            case 'Paused': return '#faad14'; // Orange
            case 'Cancelled': return '#bfbfbf'; // Grey
            default: return '#1890ff'; // Blue
        }
    };

    const isAudioOrVideo = item.type === 'audio' || item.type === 'video';
    const isCompleted = item.status === 'Completed' || item.status === 'completed';
    const isDownloading = item.status === 'Downloading...' || item.status === 'Starting...' || item.status === 'Resuming...';
    const isPaused = item.status === 'Paused';
    const isCancelled = item.status === 'Cancelled';

    const renderButton = (label, onClick, color, hoverColor, icon) => (
        <button
            onClick={onClick}
            className="btn"
            style={{
                fontSize: '12px',
                padding: '4px 12px',
                background: `var(--bg-app)`,
                color: color,
                border: `1px solid ${color}`,
                boxShadow: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.background = color;
                e.currentTarget.style.color = 'white';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--bg-app)';
                e.currentTarget.style.color = color;
            }}
        >
            <span>{icon}</span> {label}
        </button>
    );

    return (
        <div style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-color)',
            marginBottom: '12px',
            opacity: isCancelled ? 0.6 : 1
        }}>
            {item.thumbnail && (
                <img
                    src={item.thumbnail}
                    alt={item.title}
                    style={{
                        width: '96px',
                        height: '64px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        filter: isCancelled ? 'grayscale(100%)' : 'none'
                    }}
                />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'var(--text-primary)',
                    margin: '0 0 4px 0',
                    fontSize: '15px',
                    textDecoration: isCancelled ? 'line-through' : 'none'
                }}>
                    {item.title}
                </h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                    <span style={{ color: getStatusColor(), fontWeight: 500 }}>{item.status}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{Math.round(item.progress || 0)}%</span>
                </div>

                <div style={{ width: '100%', background: '#f0f0f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                        style={{
                            height: '100%',
                            background: '#52c41a', // Always Green
                            width: `${item.progress || 0}%`,
                            transition: 'width 0.3s ease'
                        }}
                    />
                </div>

                <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    {isDownloading && (
                        <>
                            {renderButton('Pause', onPause, '#faad14', '#d48806', '⏸️')}
                            {renderButton('Cancel', onCancel, '#ff4d4f', '#cf1322', '⏹️')}
                        </>
                    )}

                    {isPaused && (
                        <>
                            {renderButton('Resume', onResume, '#52c41a', '#389e0d', '▶️')}
                            {renderButton('Cancel', onCancel, '#ff4d4f', '#cf1322', '⏹️')}
                        </>
                    )}

                    {isCompleted && isAudioOrVideo && onEudicUpload && (
                        <button
                            onClick={onEudicUpload}
                            className="btn"
                            style={{
                                fontSize: '12px',
                                padding: '4px 12px',
                                background: '#e6f7ff',
                                color: '#1890ff',
                                border: '1px solid #91d5ff',
                                boxShadow: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = '#1890ff';
                                e.currentTarget.style.color = 'white';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = '#e6f7ff';
                                e.currentTarget.style.color = '#1890ff';
                            }}
                        >
                            <span>📤</span> Upload to Eudic
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DownloadItem;
