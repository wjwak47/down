import React, { useState, useEffect } from 'react';

const MediaConverter = ({ pendingFiles = [], onClearPending }) => {
    const [files, setFiles] = useState([]);
    const [targetFormat, setTargetFormat] = useState('mp4');
    const [converting, setConverting] = useState(false);
    const [progress, setProgress] = useState({});
    const [qualityPreset, setQualityPreset] = useState('high');
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => {
        const handleProgress = ({ id, file, status, percent }) => {
            setProgress(prev => ({ ...prev, [file]: { status, percent: Math.round(percent || 0) } }));
        };
        const handleComplete = ({ id, file, success, error, outputPath }) => {
            setProgress(prev => ({ ...prev, [file]: { status: success ? 'completed' : 'failed', percent: 100, error, outputPath } }));
            setConverting(false);
        };
        window.api.onMediaProgress(handleProgress);
        window.api.onMediaComplete(handleComplete);
        return () => {};
    }, []);

    const handleSelectFiles = async () => {
        const paths = await window.api.mediaSelectFiles();
        if (paths?.length > 0) {
            setFiles(prev => [...prev, ...paths.filter(p => !prev.includes(p))]);
        }
    };

    const handleConvert = () => {
        if (files.length === 0) return;
        setConverting(true);
        const initialProgress = {};
        files.forEach(f => { initialProgress[f] = { status: 'processing', percent: 0 }; });
        setProgress(prev => ({ ...prev, ...initialProgress }));
        window.api.mediaConvert(files, targetFormat, { qualityPreset }, Date.now().toString());
    };

    const handleRemoveFile = (index) => setFiles(files.filter((_, i) => i !== index));

    const formats = [
        { value: 'mp4', label: 'MP4', icon: 'movie' },
        { value: 'mkv', label: 'MKV', icon: 'movie' },
        { value: 'avi', label: 'AVI', icon: 'movie' },
        { value: 'webm', label: 'WebM', icon: 'movie' },
        { value: 'mp3', label: 'MP3', icon: 'music_note' },
        { value: 'wav', label: 'WAV', icon: 'music_note' },
    ];

    const completedCount = files.filter(f => progress[f]?.status === 'completed').length;
    const processingCount = files.filter(f => progress[f]?.status === 'processing').length;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafbfc] dark:bg-[#0d1117]">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">Media Converter</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {files.length === 0 ? 'Convert videos and audio files' : `${files.length} file${files.length > 1 ? 's' : ''} selected`}
                        </p>
                    </div>
                    {files.length > 0 && !converting && (
                        <button onClick={() => { setFiles([]); setProgress({}); }}
                            className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                            Clear all
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left - File Area */}
                <div className="flex-1 flex flex-col p-6 overflow-hidden">
                    {files.length === 0 ? (
                        /* Empty State - Drop Zone */
                        <div 
                            onClick={handleSelectFiles}
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={e => { e.preventDefault(); setDragOver(false); }}
                            className={`flex-1 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center
                                ${dragOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                        >
                            <div className="w-16 h-16 mb-5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400 text-3xl">swap_horiz</span>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Drop files here</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">or click to browse</p>
                            <div className="flex gap-3 flex-wrap justify-center">
                                <span className="text-[#2196F3] text-xs font-semibold">MP4</span>
                                <span className="text-[#9C27B0] text-xs font-semibold">MKV</span>
                                <span className="text-[#FF9800] text-xs font-semibold">AVI</span>
                                <span className="text-[#00BCD4] text-xs font-semibold">MOV</span>
                                <span className="text-[#4CAF50] text-xs font-semibold">MP3</span>
                                <span className="text-[#E53935] text-xs font-semibold">WAV</span>
                            </div>
                        </div>
                    ) : (
                        /* File List */
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="flex-1 overflow-auto custom-scrollbar space-y-2 pr-2">
                                {files.map((file, index) => {
                                    const p = progress[file] || { status: 'ready', percent: 0 };
                                    const fileName = file.split(/[\\/]/).pop();
                                    const ext = fileName.split('.').pop().toUpperCase();
                                    
                                    return (
                                        <div key={index} className={`group relative p-4 rounded-xl border transition-all ${
                                            p.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
                                            p.status === 'processing' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                                            p.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                                            'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* File Icon */}
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#E3F2FD] dark:bg-blue-900/30">
                                                    <span className="material-symbols-outlined text-2xl text-[#2196F3]">
                                                        {['MP4', 'MKV', 'AVI', 'MOV', 'WEBM'].includes(ext) ? 'movie' : 'music_note'}
                                                    </span>
                                                </div>
                                                
                                                {/* File Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{fileName}</p>
                                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-semibold rounded">{ext}</span>
                                                        <span className="material-symbols-outlined text-slate-300 text-lg">arrow_forward</span>
                                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-[10px] font-semibold rounded">{targetFormat.toUpperCase()}</span>
                                                    </div>
                                                    
                                                    {/* Progress Bar */}
                                                    {p.status === 'processing' ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                                                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${p.percent}%` }}></div>
                                                            </div>
                                                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 w-10">{p.percent}%</span>
                                                        </div>
                                                    ) : (
                                                        <p className={`text-xs font-medium capitalize ${
                                                            p.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' :
                                                            p.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                                                            'text-slate-400'}`}>
                                                            {p.status === 'completed' ? '�?Completed' : p.status === 'failed' ? '�?Failed' : 'Ready to convert'}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Remove Button */}
                                                {!converting && (
                                                    <button onClick={() => handleRemoveFile(index)}
                                                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                                        <span className="material-symbols-outlined">close</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add More Button */}
                            {!converting && (
                                <button onClick={handleSelectFiles}
                                    className="mt-4 w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-300 dark:hover:border-blue-600 transition-all text-sm font-medium flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-lg">add</span>
                                    Add more files
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Right - Settings Panel */}
                <div className="w-80 border-l border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 flex flex-col">
                    <div className="flex-1 p-6 space-y-6 overflow-auto custom-scrollbar">
                        {/* Output Format */}
                        <div>
                            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Output Format</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {formats.map(f => (
                                    <button key={f.value} onClick={() => setTargetFormat(f.value)} disabled={converting}
                                        className={`p-3 rounded-xl border-2 transition-all text-center bg-white dark:bg-slate-800 ${
                                            targetFormat === f.value 
                                                ? 'border-[#2196F3]' 
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                        <span className={`material-symbols-outlined text-xl mb-1 block ${
                                            targetFormat === f.value ? 'text-[#2196F3]' : 'text-slate-400'}`}>{f.icon}</span>
                                        <span className={`text-xs font-medium ${
                                            targetFormat === f.value ? 'text-[#2196F3]' : 'text-slate-500 dark:text-slate-400'}`}>{f.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Quality */}
                        <div>
                            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Quality</h3>
                            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                {[{ id: 'fast', label: 'Fast', desc: 'Smaller size' }, { id: 'high', label: 'High', desc: 'Best quality' }].map(q => (
                                    <button key={q.id} onClick={() => setQualityPreset(q.id)} disabled={converting}
                                        className={`flex-1 py-3 px-4 rounded-lg transition-all ${
                                            qualityPreset === q.id 
                                                ? 'bg-white dark:bg-slate-700 shadow-sm' 
                                                : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}>
                                        <p className={`text-sm font-semibold ${qualityPreset === q.id ? 'text-slate-800 dark:text-white' : 'text-slate-500'}`}>{q.label}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">{q.desc}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-[#2196F3] text-xl">info</span>
                                <div>
                                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Hardware Acceleration</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">GPU encoding enabled for faster conversion when available.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Convert Button */}
                    <div className="p-6 border-t border-slate-200/60 dark:border-slate-800/60">
                        {converting ? (
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-blue-500 animate-spin">progress_activity</span>
                                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Converting...</span>
                                </div>
                                <p className="text-xs text-slate-500">{completedCount} of {files.length} completed</p>
                            </div>
                        ) : (
                            <button onClick={handleConvert} disabled={files.length === 0}
                                className="w-full py-3 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] text-white font-medium rounded-xl  transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">play_arrow</span>
                                Start Converting
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <div className="h-10 px-6 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{files.length} file{files.length !== 1 ? 's' : ''} total</span>
                <span className={`flex items-center gap-1.5 font-medium ${
                    converting ? 'text-blue-500' : completedCount > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                        converting ? 'bg-blue-500 animate-pulse' : completedCount > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    {converting ? `Processing ${processingCount} file${processingCount > 1 ? 's' : ''}` : completedCount > 0 ? `${completedCount} completed` : 'Ready'}
                </span>
            </div>
        </div>
    );
};

export default MediaConverter;
