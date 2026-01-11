import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import VideoDownloader from './pages/VideoDownloader';
import MediaConverter from './pages/MediaConverter';
import DocumentConverter from './pages/DocumentConverter';
import FileCompressor from './pages/FileCompressor';
import WatermarkRemover from './components/WatermarkRemover';
import AudioTranscriber from './pages/AudioTranscriber';
import Changelog from './pages/Changelog';
import Settings from './components/Settings';
import AppMenu from './components/AppMenu';

function App() {
    const [activeTab, setActiveTab] = useState('video');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Dynamic title based on active tab
    useEffect(() => {
        const tabTitles = {
            video: 'Video Downloader',
            media: 'Media Converter',
            document: 'Document Converter',
            compress: 'File Compressor',
            watermark: 'Watermark Remover',
            transcribe: 'AI Transcriber',
            changelog: 'What\'s New'
        };
        document.title = `ProFlow Studio - ${tabTitles[activeTab] || 'ProFlow Studio'}`;
    }, [activeTab]);

    return (
        <div className="flex h-screen bg-bg-app font-sans text-text-primary relative">
            <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

            <main className="flex-1 overflow-hidden relative">
                {/* Global Menu - Positioned top-right */}
                <div className="absolute top-6 right-6 z-50">
                    <AppMenu onOpenSettings={() => setIsSettingsOpen(true)} />
                </div>

                <div style={{ display: activeTab === 'video' ? 'block' : 'none', height: '100%' }}>
                    <VideoDownloader />
                </div>
                <div style={{ display: activeTab === 'media' ? 'block' : 'none', height: '100%' }}>
                    <MediaConverter />
                </div>
                <div style={{ display: activeTab === 'document' ? 'block' : 'none', height: '100%' }}>
                    <DocumentConverter />
                </div>
                <div style={{ display: activeTab === 'compress' ? 'block' : 'none', height: '100%' }}>
                    <FileCompressor />
                </div>
                <div style={{ display: activeTab === 'watermark' ? 'block' : 'none', height: '100%' }}>
                    <WatermarkRemover />
                </div>
                <div style={{ display: activeTab === 'transcribe' ? 'block' : 'none', height: '100%' }}>
                    <AudioTranscriber />
                </div>
                <div style={{ display: activeTab === 'changelog' ? 'block' : 'none', height: '100%' }}>
                    <Changelog />
                </div>
            </main>

            <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
}

export default App;
