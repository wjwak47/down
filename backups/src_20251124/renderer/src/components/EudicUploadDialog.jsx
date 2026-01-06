import React, { useState, useEffect } from 'react';

const EudicUploadDialog = ({ isOpen, onClose, audioFile, videoTitle, onUploadSuccess }) => {
    const [channels, setChannels] = useState([]);
    const [selectedChannel, setSelectedChannel] = useState('');
    const [cookie, setCookie] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [customTitle, setCustomTitle] = useState(''); // 用户自定义标题

    useEffect(() => {
        if (isOpen) {
            const savedCookie = localStorage.getItem('eudic_cookie');
            if (savedCookie) {
                setCookie(savedCookie);
                fetchChannels(savedCookie);
            } else {
                setError('Please configure Eudic Cookie in Settings first.');
            }
            // 初始化自定义标题为视频标题
            setCustomTitle(videoTitle || '');
        }
    }, [isOpen, videoTitle]);

    const fetchChannels = async (token) => {
        setLoading(true);
        try {
            const list = await window.api.eudicGetChannels(token);
            setChannels(list);
            if (list.length > 0) {
                // Default to 'youtube' if exists, otherwise first one
                const youtubeChannel = list.find(c => c.Name.toLowerCase() === 'youtube');
                setSelectedChannel(youtubeChannel ? youtubeChannel.Id : list[0].Id);
            }
            setError('');
        } catch (err) {
            setError('Failed to fetch channels. Please check your Cookie.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!selectedChannel || !cookie) return;

        setUploading(true);
        setError('');

        try {
            await window.api.eudicUploadAudio({
                cookie,
                filePath: audioFile,
                channelId: selectedChannel,
                customTitle: customTitle.trim() || videoTitle // Use custom title or fallback to original
            });

            setSuccess(true);
            if (onUploadSuccess) onUploadSuccess();
        } catch (err) {
            setError('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleOpenEudic = () => {
        window.api.eudicOpenUploads();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header" style={{ padding: '16px 24px' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Upload to 每日英语听力</h2>
                </div>

                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label">Audio File</label>
                        <div style={{
                            background: 'rgba(0,0,0,0.3)',
                            padding: '10px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <div style={{ fontWeight: 500, marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {videoTitle}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {audioFile}
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Title (Displayed on Eudic)</label>
                        <input
                            type="text"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            className="form-input"
                            placeholder="Edit title..."
                            style={{ fontWeight: 500 }}
                        />
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            💡 Tip: Customize the filename that will appear on Eudic
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            background: 'rgba(207, 102, 121, 0.1)',
                            border: '1px solid #cf6679',
                            color: '#cf6679',
                            padding: '12px',
                            borderRadius: '6px',
                            marginBottom: '16px',
                            fontSize: '14px'
                        }}>
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ color: '#03dac6', fontSize: '18px', marginBottom: '8px' }}>✓ Upload Successful!</div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                                Your audio has been uploaded. You can now add subtitles on the Eudic website.
                            </p>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                <button
                                    onClick={handleOpenEudic}
                                    className="btn"
                                    style={{ background: '#03dac6', color: '#000' }}
                                >
                                    Open in Eudic
                                </button>
                                <button
                                    onClick={onClose}
                                    className="btn btn-secondary"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="form-group">
                                <label className="form-label">Select Channel</label>
                                {loading ? (
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading channels...</div>
                                ) : (
                                    <select
                                        value={selectedChannel}
                                        onChange={(e) => setSelectedChannel(e.target.value)}
                                        className="form-input"
                                        style={{ appearance: 'none', cursor: 'pointer' }}
                                    >
                                        {channels.map(channel => (
                                            <option key={channel.Id} value={channel.Id} style={{ background: '#1e1e1e' }}>
                                                {channel.Name} ({channel.TotalMediaCount} items)
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="modal-footer" style={{ marginTop: '24px', margin: '-24px -24px -24px -24px' }}>
                                <button
                                    onClick={onClose}
                                    className="btn btn-secondary"
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={uploading || loading || !selectedChannel}
                                    className="btn"
                                    style={{
                                        opacity: (uploading || loading || !selectedChannel) ? 0.5 : 1,
                                        cursor: (uploading || loading || !selectedChannel) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {uploading ? 'Uploading...' : 'Upload'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EudicUploadDialog;
