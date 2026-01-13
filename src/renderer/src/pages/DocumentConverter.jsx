import React, { useState, useEffect } from 'react';

const DocumentConverter = ({ pendingFiles = [], onClearPending }) => {
    const [files, setFiles] = useState([]);
    const [targetFormat, setTargetFormat] = useState('pdf');
    const [converting, setConverting] = useState(false);
    const [progress, setProgress] = useState({});
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => {
        const handleProgress = ({ id, file, status, percent }) => {
            setProgress(prev => ({ ...prev, [file]: { status, percent: Math.round(percent || 0) } }));
        };
        const handleComplete = ({ id, file, success, error, outputPath }) => {
            setProgress(prev => ({ ...prev, [file]: { status: success ? 'completed' : 'failed', percent: 100, error, outputPath } }));
            setConverting(false);
        };
        window.api.onDocProgress(handleProgress);
        window.api.onDocComplete(handleComplete);
        return () => {};
    }, []);

    useEffect(() => {
        if (pendingFiles?.length > 0) {
            setFiles(prev => [...prev, ...pendingFiles.filter(p => !prev.includes(p))]);
            onClearPending?.();
        }
    }, [pendingFiles]);

    const handleSelectFiles = async () => {
        const paths = await window.api.docSelectFiles();
        if (paths?.length > 0) setFiles(prev => [...prev, ...paths.filter(p => !prev.includes(p))]);
    };

    const handleConvert = () => {
        if (files.length === 0) return;
        setConverting(true);
        const initialProgress = {};
        files.forEach(f => { initialProgress[f] = { status: 'processing', percent: 0 }; });
        setProgress(prev => ({ ...prev, ...initialProgress }));
        window.api.docConvert(files, targetFormat, {}, Date.now().toString());
    };

    const handleRemoveFile = (index) => setFiles(files.filter((_, i) => i !== index));

    const formats = [
        { value: 'pdf', label: 'PDF', icon: 'picture_as_pdf', desc: 'Portable Document' },
        { value: 'docx', label: 'Word', icon: 'description', desc: 'Microsoft Word' },
        { value: 'xlsx', label: 'Excel', icon: 'table_chart', desc: 'Microsoft Excel' },
        { value: 'html', label: 'HTML', icon: 'code', desc: 'Web Page' },
    ];

    // Clean professional blue icon style
    const getFileIcon = (fileName) => {
        const ext = fileName.split('.').pop().toLowerCase();
        if (['pdf'].includes(ext)) return { icon: 'picture_as_pdf', color: 'text-[#2196F3]', bg: 'bg-[#E3F2FD] dark:bg-blue-900/30' };
        if (['doc', 'docx'].includes(ext)) return { icon: 'description', color: 'text-[#2196F3]', bg: 'bg-[#E3F2FD] dark:bg-blue-900/30' };
        if (['xls', 'xlsx'].includes(ext)) return { icon: 'table_chart', color: 'text-[#2196F3]', bg: 'bg-[#E3F2FD] dark:bg-blue-900/30' };
        if (['ppt', 'pptx'].includes(ext)) return { icon: 'slideshow', color: 'text-[#2196F3]', bg: 'bg-[#E3F2FD] dark:bg-blue-900/30' };
        return { icon: 'article', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50' };
    };

    const completedCount = files.filter(f => progress[f]?.status === 'completed').length;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafbfc] dark:bg-[#0d1117]">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">Document Converter</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {files.length === 0 ? 'Convert documents between formats' : `${files.length} document${files.length > 1 ? 's' : ''} ready`}
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
            <div className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto px-8 py-8">
                    {files.length === 0 ? (
                        /* Empty State */
                        <div className="space-y-8">
                            {/* Drop Zone */}
                            <div 
                                onClick={handleSelectFiles}
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={e => { e.preventDefault(); setDragOver(false); }}
                                className={`rounded-2xl border-2 border-dashed p-16 cursor-pointer transition-all text-center
                                    ${dragOver ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                            >
                                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-400 text-3xl">description</span>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Drop your documents here</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">or click to browse</p>
                                <div className="flex gap-3 justify-center flex-wrap">
                                    <span className="text-[#E53935] text-xs font-semibold">PDF</span>
                                    <span className="text-[#2196F3] text-xs font-semibold">Word</span>
                                    <span className="text-[#4CAF50] text-xs font-semibold">Excel</span>
                                    <span className="text-[#FF9800] text-xs font-semibold">PowerPoint</span>
                                </div>
                            </div>

                            {/* Format Selection Grid */}
                            <div>
                                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-4">Convert to</h3>
                                <div className="grid grid-cols-4 gap-3">
                                    {formats.map(f => (
                                        <button key={f.value} onClick={() => setTargetFormat(f.value)}
                                            className={`p-4 rounded-xl border-2 transition-all text-center bg-white dark:bg-slate-800 ${
                                                targetFormat === f.value 
                                                    ? 'border-[#2196F3]' 
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                            <span className={`material-symbols-outlined text-2xl mb-2 block ${
                                                targetFormat === f.value ? 'text-[#2196F3]' : 'text-slate-400'}`}>{f.icon}</span>
                                            <p className={`text-sm font-medium ${targetFormat === f.value ? 'text-[#2196F3]' : 'text-slate-600 dark:text-slate-400'}`}>{f.label}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { icon: 'bolt', title: 'Fast Conversion', desc: 'Convert documents in seconds' },
                                    { icon: 'high_quality', title: 'High Quality', desc: 'Preserve formatting & layout' },
                                    { icon: 'lock', title: 'Secure', desc: 'Files processed locally' }
                                ].map((item, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <span className="material-symbols-outlined text-[#2196F3] text-xl mb-2 block">{item.icon}</span>
                                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{item.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* File List */
                        <div className="space-y-6">
                            {/* Files */}
                            <div className="space-y-2">
                                {files.map((file, index) => {
                                    const p = progress[file] || { status: 'ready', percent: 0 };
                                    const fileName = file.split(/[\\/]/).pop();
                                    const ext = fileName.split('.').pop().toUpperCase();
                                    const fileStyle = getFileIcon(fileName);
                                    
                                    return (
                                        <div key={index} className={`group p-4 rounded-xl border transition-all ${
                                            p.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
                                            p.status === 'processing' ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 dark:border-primary/30' :
                                            p.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' :
                                            'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${fileStyle.bg}`}>
                                                    <span className={`material-symbols-outlined text-2xl ${fileStyle.color}`}>{fileStyle.icon}</span>
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{fileName}</p>
                                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-semibold rounded">{ext}</span>
                                                        <span className="material-symbols-outlined text-slate-300 text-lg">arrow_forward</span>
                                                        <span className="px-2 py-0.5 bg-primary/10 dark:bg-primary/20 text-primary text-[10px] font-semibold rounded">{targetFormat.toUpperCase()}</span>
                                                    </div>
                                                    
                                                    {p.status === 'processing' ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 h-1.5 bg-primary/20 dark:bg-primary/30 rounded-full overflow-hidden">
                                                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${p.percent}%` }}></div>
                                                            </div>
                                                            <span className="text-xs font-semibold text-primary w-10">{p.percent}%</span>
                                                        </div>
                                                    ) : (
                                                        <p className={`text-xs font-medium ${
                                                            p.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' :
                                                            p.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                                                            'text-slate-400'}`}>
                                                            {p.status === 'completed' ? '�?Converted successfully' : p.status === 'failed' ? '�?Conversion failed' : 'Ready to convert'}
                                                        </p>
                                                    )}
                                                </div>

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

                            {/* Add More */}
                            {!converting && (
                                <button onClick={handleSelectFiles}
                                    className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-primary hover:border-primary/50 transition-all text-sm font-medium flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-lg">add</span>
                                    Add more documents
                                </button>
                            )}

                            {/* Format & Convert */}
                            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-slate-500 dark:text-slate-400">Convert to:</span>
                                    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                        {formats.map(f => (
                                            <button key={f.value} onClick={() => setTargetFormat(f.value)} disabled={converting}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                                    targetFormat === f.value 
                                                        ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' 
                                                        : 'text-slate-500 hover:text-slate-700'}`}>
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <button onClick={handleConvert} disabled={converting || files.length === 0}
                                    className="px-6 py-2.5 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] text-white font-medium rounded-xl  transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                    {converting ? (
                                        <><span className="material-symbols-outlined animate-spin">progress_activity</span>Converting {completedCount}/{files.length}</>
                                    ) : (
                                        <><span className="material-symbols-outlined">play_arrow</span>Convert All</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DocumentConverter;
