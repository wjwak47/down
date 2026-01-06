import React, { useState, useEffect } from 'react';
import GPUSettings from './GPUSettings';

const Settings = ({ isOpen, onClose }) => {
    const [downloadPath, setDownloadPath] = useState('');
    const [activeTab, setActiveTab] = useState('general');
    const [eudicCookie, setEudicCookie] = useState('');
    const [eudicChannel, setEudicChannel] = useState('');
    const [channels, setChannels] = useState([]);
    const [eudicStatus, setEudicStatus] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const savedPath = localStorage.getItem('downloadPath');
            if (savedPath) setDownloadPath(savedPath);

            const savedCookie = localStorage.getItem('eudic_cookie');
            if (savedCookie) {
                setEudicCookie(savedCookie);
                // Fetch channels if cookie exists
                fetchChannels(savedCookie);
            }

            const savedChannel = localStorage.getItem('eudic_channel');
            if (savedChannel) setEudicChannel(savedChannel);
        }
    }, [isOpen]);

    const handleSave = () => {
        setIsSaving(true);
        localStorage.setItem('downloadPath', downloadPath);
        localStorage.setItem('eudic_cookie', eudicCookie);
        localStorage.setItem('eudic_channel', eudicChannel);

        // Show "Saved!" feedback for 500ms before closing
        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 500);
    };

    const handleSelectDirectory = async () => {
        const path = await window.api.selectDownloadDirectory();
        if (path) {
            setDownloadPath(path);
        }
    };

    const fetchChannels = async (cookie) => {
        try {
            const channelList = await window.api.eudicGetChannels(cookie);
            console.log('Fetched channels:', channelList);
            setChannels(channelList);
            // If no channel is selected but channels exist, select the first one
            if (!eudicChannel && channelList.length > 0) {
                // Use Id instead of id
                setEudicChannel(channelList[0].Id);
            }
        } catch (error) {
            console.error('Failed to fetch channels:', error);
        }
    };

    const handleAutoFetchCookie = async () => {
        setEudicStatus('Opening login window...');
        try {
            const cookie = await window.api.eudicFetchCookie();
            setEudicCookie(cookie);
            setEudicStatus('✓ Cookie fetched successfully!');

            // Auto-fetch channels after getting cookie
            setEudicStatus('Fetching channels...');
            await fetchChannels(cookie);
            setEudicStatus('✓ Connected & Channels loaded!');
        } catch (error) {
            if (error.message.includes('closed')) {
                setEudicStatus('Login window closed.');
            } else {
                setEudicStatus('Failed to fetch cookie.');
                console.error(error);
            }
        }
    };

    const testEudicConnectionWithCookie = async (cookieToTest) => {
        setEudicStatus('Testing connection...');
        try {
            const channelList = await window.api.eudicGetChannels(cookieToTest);
            setChannels(channelList);
            setEudicStatus(`✓ Connected! Found ${channelList.length} channels.`);
        } catch (error) {
            setEudicStatus('✗ Connection failed.');
        }
    };

    const testEudicConnection = () => testEudicConnectionWithCookie(eudicCookie);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <button
                        className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
                        onClick={() => setActiveTab('general')}
                    >
                        General
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'eudic' ? 'active' : ''}`}
                        onClick={() => setActiveTab('eudic')}
                    >
                        Eudic (每日英语听力)
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'gpu' ? 'active' : ''}`}
                        onClick={() => setActiveTab('gpu')}
                    >
                        🎮 GPU 加速
                    </button>
                </div>

                <div className="modal-body">
                    {activeTab === 'general' && (
                        <div className="form-group">
                            <label className="form-label">Default Download Directory</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={downloadPath}
                                    readOnly
                                    className="form-input"
                                    placeholder="Default (Downloads folder)"
                                    style={{ flex: 1 }}
                                />
                                <button
                                    onClick={handleSelectDirectory}
                                    className="btn btn-secondary"
                                >
                                    Browse
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'eudic' && (
                        <div className="form-group">
                            <label className="form-label">Authorization Cookie</label>
                            <div style={{ marginBottom: '16px' }}>
                                <button
                                    onClick={handleAutoFetchCookie}
                                    className="btn"
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    🔑 Auto Fetch Cookie (Login)
                                </button>
                            </div>
                            <textarea
                                value={eudicCookie}
                                onChange={(e) => setEudicCookie(e.target.value)}
                                className="form-input"
                                style={{ height: '80px', fontFamily: 'monospace', marginBottom: '16px' }}
                                placeholder="Or paste your cookie here manually..."
                            />

                            <label className="form-label">
                                Upload Channel {channels.length > 0 && <span style={{ fontSize: '12px', color: 'var(--secondary-color)' }}>({channels.length} found)</span>}
                            </label>

                            <select
                                className="form-input"
                                value={eudicChannel}
                                onChange={(e) => setEudicChannel(e.target.value)}
                            >
                                <option value="">Select a channel...</option>
                                {channels.map((channel) => (
                                    <option
                                        key={channel.Id}
                                        value={channel.Id}
                                    >
                                        {channel.Name}
                                    </option>
                                ))}
                            </select>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                                <button
                                    onClick={testEudicConnection}
                                    className="btn btn-secondary"
                                    style={{ fontSize: '13px', padding: '8px 16px' }}
                                >
                                    Test Connection
                                </button>
                                <span style={{
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: eudicStatus.startsWith('✓') ? 'var(--secondary-color)' :
                                        eudicStatus.startsWith('✗') ? 'var(--error-color)' : 'var(--text-secondary)'
                                }}>
                                    {eudicStatus}
                                </span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '16px', lineHeight: '1.5' }}>
                                Tip: Use "Auto Fetch" to log in and get the cookie automatically.
                            </p>
                        </div>
                    )}

                    {activeTab === 'gpu' && (
                        <GPUSettings />
                    )}
                </div>

                <div className="modal-footer">
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn"
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saved! ✓' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
