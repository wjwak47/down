import React, { useState, useEffect } from 'react';
import GPUSettings from './GPUSettings';

const Settings = ({ isOpen, onClose }) => {
    const [downloadPath, setDownloadPath] = useState('');
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const savedPath = localStorage.getItem('downloadPath');
            if (savedPath) setDownloadPath(savedPath);
        }
    }, [isOpen]);

    const handleSave = () => {
        setIsSaving(true);
        localStorage.setItem('downloadPath', downloadPath);

        setTimeout(() => {
            setIsSaving(false);
            onClose();
        }, 500);
    };

    const handleSelectDirectory = async () => {
        const path = await window.api.selectDownloadDirectory();
        if (path) setDownloadPath(path);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1a2633] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Tabs Header */}
                <div className="flex gap-2 px-6 pt-6 border-b border-slate-100 dark:border-slate-800">
                    {[
                        { id: 'general', label: 'General', icon: 'settings' },
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
