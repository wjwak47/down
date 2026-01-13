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

        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 500);
    };

    const handleSelectDirectory = async () => {
        const path = await window.api.selectDownloadDirectory();
        if (path) setDownloadPath(path);
    };

    const fetchChannels = async (cookie) => {
        try {
            const channelList = await window.api.eudicGetChannels(cookie);
            setChannels(channelList);
            if (!eudicChannel && channelList.length > 0) {
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
            setEudicStatus('Fetching channels...');
            await fetchChannels(cookie);
            setEudicStatus('✓ Connected & Channels loaded!');
        } catch (error) {
            setEudicStatus(error.message.includes('closed') ? 'Login window closed.' : 'Failed to fetch cookie.');
        }
    };

    const testEudicConnection = async () => {
        setEudicStatus('Testing connection...');
        try {
            const channelList = await window.api.eudicGetChannels(eudicCookie);
            setChannels(channelList);
            setEudicStatus(`✓ Connected! Found ${channelList.length} channels.`);
        } catch (error) {
            setEudicStatus('✗ Connection failed.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1a2633] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Tabs Header */}
                <div className="flex gap-2 px-6 pt-6 border-b border-slate-100 dark:border-slate-800">
                    {[
                        { id: 'general', label: 'General', icon: 'settings' },
                        { id: 'eudic', label: 'Eudic', icon: 'headphones' },
                        { id: 'gpu', label: 'GPU', icon: 'memory' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors ${activeTab === tab.id
                                    ? 'bg-white dark:bg-[#1a2633] text-primary border-b-2 border-primary'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Default Download Directory</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={downloadPath}
                                        readOnly
                                        className="flex-1 h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                                        placeholder="Default (Downloads folder)"
                                    />
                                    <button
                                        onClick={handleSelectDirectory}
                                        className="px-4 h-10 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium"
                                    >
                                        Browse
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'eudic' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">Authorization Cookie</label>
                                <button
                                    onClick={handleAutoFetchCookie}
                                    className="w-full h-10 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium mb-3 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[18px]">vpn_key</span>
                                    Auto Fetch Cookie (Login)
                                </button>
                                <textarea
                                    value={eudicCookie}
                                    onChange={(e) => setEudicCookie(e.target.value)}
                                    className="w-full h-20 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono resize-none"
                                    placeholder="Or paste your cookie here manually..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                    Upload Channel {channels.length > 0 && <span className="text-xs text-slate-400">({channels.length} found)</span>}
                                </label>
                                <select
                                    className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                                    value={eudicChannel}
                                    onChange={(e) => setEudicChannel(e.target.value)}
                                >
                                    <option value="">Select a channel...</option>
                                    {channels.map((channel) => (
                                        <option key={channel.Id} value={channel.Id}>{channel.Name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <button
                                    onClick={testEudicConnection}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-medium text-sm"
                                >
                                    Test Connection
                                </button>
                                <span className={`text-sm font-medium ${eudicStatus.startsWith('✓') ? 'text-green-600' :
                                        eudicStatus.startsWith('✗') ? 'text-red-600' :
                                            'text-slate-500'
                                    }`}>
                                    {eudicStatus}
                                </span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'gpu' && <GPUSettings />}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex-1 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg font-medium disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium disabled:opacity-50"
                    >
                        {isSaving ? 'Saved! ✓' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
