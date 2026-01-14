import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNavBar } from './components/TopNavBar';
import VideoDownloader from './pages/VideoDownloader';
import MediaConverter from './pages/MediaConverter';
import DocumentConverter from './pages/DocumentConverter';
import FileCompressor from './pages/FileCompressor';
import WatermarkRemover from './components/WatermarkRemover';
import AudioTranscriber from './pages/AudioTranscriber';
import Changelog from './pages/Changelog';
import Settings from './components/Settings';
import { ToastProvider } from './components/Toast';
import { GlobalTaskProvider } from './contexts/GlobalTaskContext';
import { useTaskNotifications } from './hooks/useTaskNotifications';

// 任务通知监听组件 - 必须在 Provider 内部使用
function TaskNotificationListener({ onNavigate }) {
    useTaskNotifications(onNavigate);
    return null;
}

function App() {
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [dashboardUrl, setDashboardUrl] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [pendingFiles, setPendingFiles] = useState([]);
    const [pendingUrl, setPendingUrl] = useState('');

    // Dynamic title based on active page
    useEffect(() => {
        const pageTitles = {
            'dashboard': 'Dashboard',
            'video-downloader': 'Assets',
            'ai-transcriber': 'Projects',
            'watermark-remover': 'Watermark Remover',
            'media-converter': 'Media Converter',
            'document-converter': 'Document Converter',
            'file-compressor': 'File Compressor',
            'whats-new': 'Archive',
            'settings': 'Settings'
        };
        document.title = `ProFlow Studio - ${pageTitles[currentPage] || 'ProFlow Studio'}`;
    }, [currentPage]);

    // Dashboard handlers
    const handleDashboardDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const file = files[0];
            const fileName = file.name.toLowerCase();
            const filePaths = files.map(f => f.path);

            // Save files for target page to pick up
            setPendingFiles(filePaths);

            // Smart routing based on file type
            if (['.mp4', '.avi', '.mkv', '.mov', '.flv', '.wmv', '.webm', '.m4v'].some(e => fileName.endsWith(e))) {
                setCurrentPage('media-converter');
            } else if (['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma'].some(e => fileName.endsWith(e))) {
                setCurrentPage('media-converter');
            } else if (['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'].some(e => fileName.endsWith(e))) {
                setCurrentPage('document-converter');
            } else if (['.zip', '.rar', '.7z', '.tar', '.gz'].some(e => fileName.endsWith(e))) {
                setCurrentPage('file-compressor');
            } else {
                // Default to media converter
                setCurrentPage('media-converter');
            }
        }
    };

    const handleDashboardDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDashboardDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleStartProcessing = () => {
        if (dashboardUrl.trim()) {
            // Save URL and navigate to video downloader
            setPendingUrl(dashboardUrl);
            setDashboardUrl(''); // Clear input
            setCurrentPage('video-downloader');
        }
    };

    return (
        <GlobalTaskProvider>
            <ToastProvider>
                <TaskNotificationListener onNavigate={setCurrentPage} />
                <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark">
                    {/* Left Sidebar Navigation */}
                    <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

                    {/* Main Content Area */}
                    <main className="flex-1 flex flex-col overflow-hidden">
                        {/* Top Navigation Bar (Workspace breadcrumb + Search + User) */}
                        <TopNavBar currentPage={currentPage} onNavigate={setCurrentPage} />

                        {/* Page Content - 响应式高度 */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {/* Dashboard */}
                            {currentPage === 'dashboard' && (
                                <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafbfc] dark:bg-[#0d1117]">
                                    {/* Header */}
                                    <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">Dashboard</h1>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Your creative workspace</p>
                                    </div>

                                    {/* Main Content */}
                                    <div className="flex-1 overflow-auto">
                                        <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
                                            
                                            {/* Quick Action Cards - 2x2 Grid */}
                                            <div className="grid grid-cols-2 gap-4">
                                                {[
                                                    { icon: 'download', title: 'Media Download', desc: 'Download from YouTube, Vimeo & more', color: 'text-[#E53935]', bg: 'bg-red-50 dark:bg-red-900/20', page: 'video-downloader' },
                                                    { icon: 'swap_horiz', title: 'Media Convert', desc: 'Convert video and audio formats', color: 'text-[#2196F3]', bg: 'bg-blue-50 dark:bg-blue-900/20', page: 'media-converter' },
                                                    { icon: 'description', title: 'Document Convert', desc: 'PDF, Word, Excel conversion', color: 'text-[#4CAF50]', bg: 'bg-green-50 dark:bg-green-900/20', page: 'document-converter' },
                                                    { icon: 'folder_zip', title: 'File Compress', desc: 'Compress and extract archives', color: 'text-[#FF9800]', bg: 'bg-orange-50 dark:bg-orange-900/20', page: 'file-compressor' }
                                                ].map(action => (
                                                    <div 
                                                        key={action.page}
                                                        onClick={() => setCurrentPage(action.page)}
                                                        className="p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 cursor-pointer hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all group"
                                                    >
                                                        <div className={`w-12 h-12 rounded-xl ${action.bg} flex items-center justify-center mb-4`}>
                                                            <span className={`material-symbols-outlined text-2xl ${action.color}`}>{action.icon}</span>
                                                        </div>
                                                        <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1">{action.title}</h3>
                                                        <p className="text-sm text-slate-500 dark:text-slate-400">{action.desc}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Drop Zone */}
                                            <div 
                                                onDrop={handleDashboardDrop}
                                                onDragOver={handleDashboardDragOver}
                                                onDragLeave={handleDashboardDragLeave}
                                                className={`rounded-2xl border-2 border-dashed transition-all p-8 text-center ${
                                                    isDragging ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-700'
                                                }`}
                                            >
                                                {/* Icon */}
                                                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-slate-400 text-2xl">upload_file</span>
                                                </div>
                                                
                                                {/* Title */}
                                                <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                                    {isDragging ? 'Drop files here...' : 'Drop files here'}
                                                </h3>
                                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Files will be routed to the right tool automatically</p>
                                                
                                                {/* Colorful File Type Tags */}
                                                <div className="flex gap-3 justify-center mb-5">
                                                    <span className="text-[#2196F3] text-xs font-semibold">Video</span>
                                                    <span className="text-[#4CAF50] text-xs font-semibold">Audio</span>
                                                    <span className="text-[#E53935] text-xs font-semibold">Document</span>
                                                    <span className="text-[#FF9800] text-xs font-semibold">Archive</span>
                                                </div>
                                                
                                                {/* URL Input */}
                                                <div className="max-w-md mx-auto">
                                                    <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                                                        <div className="pl-4 flex items-center pointer-events-none">
                                                            <span className="material-symbols-outlined text-slate-400 text-xl">link</span>
                                                        </div>
                                                        <input
                                                            value={dashboardUrl}
                                                            onChange={(e) => setDashboardUrl(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleStartProcessing()}
                                                            className="flex-1 h-11 px-3 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                                                            placeholder="Or paste a URL to download..."
                                                        />
                                                        <button
                                                            onClick={handleStartProcessing}
                                                            disabled={!dashboardUrl.trim()}
                                                            className="h-11 px-4 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] text-white flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Feature Cards */}
                                            <div className="grid grid-cols-3 gap-4">
                                                {[
                                                    { icon: 'bolt', title: 'Fast Processing', desc: 'Optimized for speed' },
                                                    { icon: 'lock', title: 'Secure & Local', desc: 'Files never leave your device' },
                                                    { icon: 'auto_awesome', title: 'Smart Organization', desc: 'Auto-detect file types' }
                                                ].map((item, i) => (
                                                    <div key={i} className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                                        <span className="material-symbols-outlined text-[#2196F3] text-xl mb-2 block">{item.icon}</span>
                                                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{item.title}</h4>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Video Downloader (Assets) - ALWAYS MOUNTED to preserve state */}
                            <div style={{ display: currentPage === 'video-downloader' ? 'flex' : 'none', height: '100%' }} className="flex-col">
                                <VideoDownloader pendingUrl={pendingUrl} onClearPendingUrl={() => setPendingUrl('')} />
                            </div>

                            {/* AI Transcriber (Projects) - ALWAYS MOUNTED to preserve state */}
                            <div style={{ display: currentPage === 'ai-transcriber' ? 'flex' : 'none', height: '100%' }} className="flex-col">
                                <AudioTranscriber />
                            </div>

                            {/* Watermark Remover */}
                            {currentPage === 'watermark-remover' && <WatermarkRemover />}

                            {/* Media Converter */}
                            {currentPage === 'media-converter' && <MediaConverter pendingFiles={pendingFiles} onClearPending={() => setPendingFiles([])} />}

                            {/* Document Converter */}
                            {currentPage === 'document-converter' && <DocumentConverter pendingFiles={pendingFiles} onClearPending={() => setPendingFiles([])} />}

                            {/* File Compressor - ALWAYS MOUNTED to preserve crack job state */}
                            <div style={{ display: currentPage === 'file-compressor' ? 'flex' : 'none', height: '100%' }} className="flex-col">
                                <FileCompressor pendingFiles={pendingFiles} onClearPending={() => setPendingFiles([])} />
                            </div>

                            {/* What's New / Archive */}
                            {currentPage === 'whats-new' && <Changelog />}

                            {/* Settings */}
                            {currentPage === 'settings' && (
                                <Settings isOpen={true} onClose={() => setCurrentPage('dashboard')} />
                            )}
                        </div>
                    </main>
                </div>
            </ToastProvider>
        </GlobalTaskProvider>
    );
}

export default App;
