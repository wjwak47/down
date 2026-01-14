import { useState, useEffect } from 'react';

const Icons = {
    compress: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>,
    extract: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>,
    key: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>,
    file: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
    close: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>,
    plus: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
    upload: <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
    copy: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" /></svg>,
    unlock: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>,
    eye: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    eyeOff: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>,
    chevronDown: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>,
    stop: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>,
    bolt: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>,
    folder: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>,
    folderOpen: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" /></svg>,
    shield: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
    cpu: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" /></svg>,
    sparkles: <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
};

const FileCompressor = ({ pendingFiles = [], onClearPending }) => {
    // Separate file lists for each mode
    const [compressFiles, setCompressFiles] = useState([]);
    const [extractFiles, setExtractFiles] = useState([]);
    const [crackFiles, setCrackFiles] = useState([]);
    const [mode, setMode] = useState('compress');
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({});
    const [dragOver, setDragOver] = useState(false);
    const [compressionLevel, setCompressionLevel] = useState(() => localStorage.getItem('compressionLevel') || 'normal');
    const [outputFormat, setOutputFormat] = useState('zip');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [usePassword, setUsePassword] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [splitArchive, setSplitArchive] = useState(false);
    const [volumeSize, setVolumeSize] = useState('100');
    const [outputPath, setOutputPath] = useState(() => localStorage.getItem('compressOutputPath') || '');
    const [extractOutputPath, setExtractOutputPath] = useState(() => localStorage.getItem('extractOutputPath') || '');
    const [extractPassword, setExtractPassword] = useState('');
    const [showExtractPassword, setShowExtractPassword] = useState(false);
    const [showExtractAdvanced, setShowExtractAdvanced] = useState(false);
    const [attackMode, setAttackMode] = useState('smart');
    const [charset, setCharset] = useState(['lowercase', 'numbers']);
    const [minLength, setMinLength] = useState(1);
    const [maxLength, setMaxLength] = useState(8);
    const [crackStats, setCrackStats] = useState({ speed: 0, attempts: 0, progress: 0, currentLength: 1, current: '' });
    const [foundPassword, setFoundPassword] = useState(null);
    const [useCpuMultiThread] = useState(() => localStorage.getItem('useCpuMultiThread') !== 'false');
    const [gpuAvailable, setGpuAvailable] = useState(false);
    const [crackJobId, setCrackJobId] = useState(null);
    const [crackMethod, setCrackMethod] = useState(null);

    // Helper to check if file is an archive
    const isArchiveFile = (filePath) => {
        const ext = filePath.split('.').pop().toLowerCase();
        return ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext);
    };

    // Get current files based on mode
    const files = mode === 'compress' ? compressFiles : mode === 'extract' ? extractFiles : crackFiles;
    const setFiles = mode === 'compress' ? setCompressFiles : mode === 'extract' ? setExtractFiles : setCrackFiles;

    useEffect(() => {
        if (window.api?.zipCheckGpu) window.api.zipCheckGpu().then(r => setGpuAvailable(r?.available || false)).catch(() => {});
    }, []);
    useEffect(() => { localStorage.setItem('compressionLevel', compressionLevel); }, [compressionLevel]);
    const [completedOutputPath, setCompletedOutputPath] = useState(null);
    const [extractCompletedPath, setExtractCompletedPath] = useState(null);
    useEffect(() => {
        // Clear any existing listeners first to avoid duplicates
        window.api.offZipProgress?.();
        window.api.offZipComplete?.();
        
        const handleProgress = ({ id, status, entries, total, percent }) => {
            console.log('[FileCompressor] Progress received:', { id, status, percent });
            setProgress(prev => ({ ...prev, ['current-job']: { status, percent: percent || (total ? Math.round((entries / total) * 100) : 0) } }));
        };
        const handleComplete = ({ id, success, error, outputPath: completedPath }) => {
            console.log('[FileCompressor] Complete received:', { id, success, error, completedPath });
            setProgress(prev => ({ ...prev, ['current-job']: { status: success ? 'completed' : 'error', percent: 100, error, outputPath: completedPath } }));
            setProcessing(false);
            if (success && completedPath) {
                if (mode === 'compress') {
                    setCompletedOutputPath(completedPath);
                } else if (mode === 'extract') {
                    setExtractCompletedPath(completedPath);
                }
            }
        };
        window.api.onZipProgress(handleProgress);
        window.api.onZipComplete(handleComplete);
        
        console.log('[FileCompressor] Listeners registered');
        
        return () => {
            console.log('[FileCompressor] Cleaning up listeners');
            window.api.offZipProgress?.();
            window.api.offZipComplete?.();
        };
    }, []);
    useEffect(() => {
        if (pendingFiles?.length > 0) {
            // Add files to appropriate mode based on file type
            const archives = pendingFiles.filter(isArchiveFile);
            const nonArchives = pendingFiles.filter(f => !isArchiveFile(f));
            
            // Add non-archives to compress mode
            if (nonArchives.length > 0) {
                setCompressFiles(prev => [...prev, ...nonArchives.filter(p => !prev.includes(p))]);
            }
            // Add archives to extract and crack modes
            if (archives.length > 0) {
                setExtractFiles(prev => [...prev, ...archives.filter(p => !prev.includes(p))]);
                setCrackFiles(prev => [...prev, ...archives.filter(p => !prev.includes(p))]);
            }
            onClearPending?.();
        }
    }, [pendingFiles]);
    useEffect(() => {
        if (!window.api?.onZipCrackProgress) return;
        window.api.onZipCrackStarted?.(() => {});
        window.api.onZipCrackProgress(({ attempts, speed, current, currentLength, method }) => {
            setCrackStats(prev => ({ speed: speed || 0, attempts: attempts || 0, current: current || '', currentLength: currentLength || prev.currentLength }));
            if (method) setCrackMethod(method);
        });
        window.api.onZipCrackResult?.(({ success, password: pwd, error }) => {
            setProcessing(false); setCrackJobId(null);
            if (success && pwd) setFoundPassword(pwd);
            else if (error && error !== 'Cancelled') setCrackStats(prev => ({ ...prev, error, status: 'error' }));
            else if (!success && !error) setCrackStats(prev => ({ ...prev, status: 'not_found' }));
        });
        return () => window.api?.zipCrackOffListeners?.();
    }, []);

    const handleOpenFolder = async () => {
        const downloadDir = localStorage.getItem('downloadPath') || '';
        try {
            const result = await window.api.openFolder(downloadDir);
            if (!result?.success) await window.api.openDownloadsFolder();
        } catch { 
            try { await window.api.openDownloadsFolder(); } catch { }
        }
    };

    const handleSelectOutputPath = async () => {
        const path = await window.api.selectDownloadDirectory();
        if (path) {
            setOutputPath(path);
            localStorage.setItem('compressOutputPath', path);
        }
    };

    const handleSelectExtractOutputPath = async () => {
        const path = await window.api.selectDownloadDirectory();
        if (path) {
            setExtractOutputPath(path);
            localStorage.setItem('extractOutputPath', path);
        }
    };

    const handleSelectFiles = async () => {
        const paths = mode === 'compress' ? await window.api.zipSelectFiles() : await window.api.zipSelectArchives();
        if (paths?.length > 0) {
            if (mode === 'compress') {
                setCompressFiles(prev => [...prev, ...paths.filter(p => !prev.includes(p))]);
            } else if (mode === 'extract') {
                setExtractFiles(prev => [...prev, ...paths.filter(p => !prev.includes(p))]);
            } else {
                setCrackFiles(prev => [...prev, ...paths.filter(p => !prev.includes(p))]);
            }
        }
    };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setDragOver(false);
        const paths = Array.from(e.dataTransfer.files).map(f => f.path);
        if (paths.length > 0) {
            if (mode === 'compress') {
                setCompressFiles(prev => [...prev, ...paths.filter(p => !prev.includes(p))]);
            } else if (mode === 'extract') {
                // Only add archive files for extract mode
                const archives = paths.filter(isArchiveFile);
                if (archives.length > 0) {
                    setExtractFiles(prev => [...prev, ...archives.filter(p => !prev.includes(p))]);
                }
            } else {
                // Only add archive files for crack mode
                const archives = paths.filter(isArchiveFile);
                if (archives.length > 0) {
                    setCrackFiles(prev => [...prev, ...archives.filter(p => !prev.includes(p))]);
                }
            }
        }
    };
    const handleAction = () => {
        if (files.length === 0) return;
        if (mode === 'crack') { handleCrack(); return; }
        setProcessing(true);
        const jobId = Date.now().toString();
        setProgress({ ['current-job']: { status: 'starting', percent: 0 } });
        const options = { 
            outputName: `archive_${jobId}.${outputFormat}`, 
            level: { fast: 1, normal: 5, maximum: 9 }[compressionLevel], 
            password: usePassword && password ? password : undefined, 
            splitSize: splitArchive ? parseInt(volumeSize) * 1024 * 1024 : undefined,
            outputPath: outputPath || undefined
        };
        console.log('[FileCompressor] Starting action:', { mode, files, options, jobId });
        if (mode === 'compress') window.api.zipCompress(files, options, jobId);
        else files.forEach(file => window.api.zipDecompress(file, { password: extractPassword || undefined, outputPath: extractOutputPath || undefined }, jobId));
    };
    const handleCrack = () => {
        if (!window.api?.zipCrackStart) return;
        setProcessing(true); setFoundPassword(null);
        setCrackStats({ speed: 0, attempts: 0, progress: 0, currentLength: minLength, status: null, current: '' });
        const jobId = Date.now().toString(); setCrackJobId(jobId);
        let cs = '';
        if (charset.includes('lowercase')) cs += 'abcdefghijklmnopqrstuvwxyz';
        if (charset.includes('uppercase')) cs += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (charset.includes('numbers')) cs += '0123456789';
        if (charset.includes('special')) cs += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        window.api.zipCrackStart(files[0], { mode: attackMode, charset: cs || 'abcdefghijklmnopqrstuvwxyz0123456789', minLength, maxLength, useGpu: gpuAvailable, useCpuMultiThread }, jobId);
    };
    const handleCancel = () => {
        if (mode === 'crack' && crackJobId) { 
            window.api?.zipCrackStop?.(crackJobId); 
            setCrackJobId(null); 
            setCrackStats({ speed: 0, attempts: 0, progress: 0, currentLength: minLength, current: '' }); 
        }
        // For compress/extract, just reset the state (the operation will complete in background)
        setProcessing(false);
        setProgress({});
    };
    const reset = () => { setFiles([]); setProgress({}); setFoundPassword(null); setCrackStats({ speed: 0, attempts: 0, progress: 0, currentLength: 1, current: '' }); setCompletedOutputPath(null); setExtractCompletedPath(null); };
    const jobProgress = progress['current-job'];
    const modes = [
        { id: 'compress', label: 'Compress' },
        { id: 'extract', label: 'Extract' },
        { id: 'crack', label: 'Crack' }
    ];

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafbfc] dark:bg-[#0d1117]">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">File Compressor</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {mode === 'compress' ? 'Create compressed archives' : mode === 'extract' ? 'Extract files from archives' : 'Recover passwords from encrypted archives'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Quick Actions */}
                        <button onClick={handleOpenFolder} 
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-[#2196F3] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Open output folder">
                            {Icons.folderOpen}
                            <span>Open Folder</span>
                        </button>
                        {/* Mode Switch */}
                        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                            {modes.map(m => (
                                <button key={m.id} onClick={() => setMode(m.id)} disabled={processing}
                                    className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${mode === m.id 
                                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-5xl mx-auto px-8 py-8">
                    <div className="max-w-2xl mx-auto space-y-4">                    {files.length === 0 ? (
                        <>
                            {/* Drop Zone */}
                            <div onClick={handleSelectFiles} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                                className={`rounded-2xl border-2 border-dashed p-16 cursor-pointer transition-all text-center ${dragOver ? 'border-[#2196F3] bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-[#2196F3]/50'}`}>
                                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#2196F3]">
                                    {Icons.upload}
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                                    {mode === 'compress' ? 'Drop files to compress' : mode === 'extract' ? 'Drop archives to extract' : 'Drop encrypted archive'}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">or click to browse</p>
                                <div className="flex justify-center gap-3">
                                    {mode === 'crack' ? (
                                        <>
                                            <span className="px-3 py-1.5 text-[#2196F3] text-xs font-semibold">ZIP</span>
                                            <span className="px-3 py-1.5 text-[#9C27B0] text-xs font-semibold">RAR</span>
                                            <span className="px-3 py-1.5 text-[#FF9800] text-xs font-semibold">7Z</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="px-3 py-1.5 text-[#2196F3] text-xs font-semibold">ZIP</span>
                                            <span className="px-3 py-1.5 text-[#9C27B0] text-xs font-semibold">7Z</span>
                                            <span className="px-3 py-1.5 text-[#4CAF50] text-xs font-semibold">TAR.GZ</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Feature Cards */}
                            <div className="grid grid-cols-3 gap-4 mt-8">
                                {(mode === 'crack' ? [
                                    { icon: Icons.cpu, title: 'GPU Accelerated', desc: 'NVIDIA CUDA support' },
                                    { icon: Icons.sparkles, title: '14M Dictionary', desc: 'Smart wordlist' },
                                    { icon: Icons.bolt, title: '7-Layer Pipeline', desc: 'Multi-strategy attack' }
                                ] : [
                                    { icon: Icons.bolt, title: 'Fast Processing', desc: 'Optimized compression' },
                                    { icon: Icons.folder, title: 'Multiple Formats', desc: 'ZIP, RAR, 7Z support' },
                                    { icon: Icons.shield, title: 'AES-256', desc: 'Strong encryption' }
                                ]).map((f, i) => (
                                    <div key={i} className="p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <div className="text-[#2196F3] mb-3">{f.icon}</div>
                                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{f.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{f.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {/* File Card */}
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#E3F2FD] dark:bg-blue-900/30 flex items-center justify-center text-[#2196F3]">
                                        {Icons.file}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 dark:text-white truncate">{files[0]?.split(/[\\/]/).pop()}</p>
                                        <p className="text-xs text-slate-500">{files.length > 1 ? `+${files.length - 1} more files` : 'Ready to process'}</p>
                                    </div>
                                    {!processing && (
                                        <button onClick={() => setFiles(files.slice(1))} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                            {Icons.close}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Compress Options */}
                            {mode === 'compress' && (
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Format</span>
                                        <div className="flex gap-1">
                                            {['zip', '7z', 'tar.gz'].map(fmt => (
                                                <button key={fmt} onClick={() => setOutputFormat(fmt)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${outputFormat === fmt ? 'bg-[#2196F3] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>{fmt.toUpperCase()}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Level</span>
                                        <div className="flex gap-1">
                                            {[{ id: 'fast', label: 'Fast' }, { id: 'normal', label: 'Normal' }, { id: 'maximum', label: 'Max' }].map(lvl => (
                                                <button key={lvl.id} onClick={() => setCompressionLevel(lvl.id)} className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${compressionLevel === lvl.id ? 'bg-[#2196F3] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>{lvl.label}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1 text-xs text-[#2196F3] font-medium">
                                        <span className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>{Icons.chevronDown}</span>
                                        Advanced Options
                                    </button>
                                    {showAdvanced && (
                                        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">Password Protection</span>
                                                <button onClick={() => setUsePassword(!usePassword)} className={`w-10 h-5 rounded-full transition-all ${usePassword ? 'bg-[#2196F3]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${usePassword ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>
                                            {usePassword && (
                                                <div className="space-y-2">
                                                    <div className="relative">
                                                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" className="w-full px-3 py-2 pr-10 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border-0 text-slate-800 dark:text-white placeholder-slate-400" />
                                                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? Icons.eyeOff : Icons.eye}</button>
                                                    </div>
                                                    <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border-0 text-slate-800 dark:text-white placeholder-slate-400" />
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">Split Archive</span>
                                                <button onClick={() => setSplitArchive(!splitArchive)} className={`w-10 h-5 rounded-full transition-all ${splitArchive ? 'bg-[#2196F3]' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                                    <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${splitArchive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>
                                            {splitArchive && (
                                                <div className="flex items-center gap-2">
                                                    <input type="number" value={volumeSize} onChange={e => setVolumeSize(e.target.value)} min="1" className="w-20 px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border-0 text-slate-800 dark:text-white" />
                                                    <span className="text-xs text-slate-500">MB per volume</span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">Output Path</span>
                                                <button onClick={handleSelectOutputPath} className="text-xs text-[#2196F3] hover:text-[#1976D2] font-medium">
                                                    {outputPath ? 'Change' : 'Select'}
                                                </button>
                                            </div>
                                            {outputPath ? (
                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                                                    <span className="text-[#2196F3]">{Icons.folder}</span>
                                                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1" title={outputPath}>{outputPath}</span>
                                                    <button onClick={() => { setOutputPath(''); localStorage.removeItem('compressOutputPath'); }} className="text-slate-400 hover:text-red-500">
                                                        {Icons.close}
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400">Default: Downloads folder</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Extract Options */}
                            {mode === 'extract' && (
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-4">
                                    <button onClick={() => setShowExtractAdvanced(!showExtractAdvanced)} className="flex items-center gap-1 text-xs text-[#2196F3] font-medium">
                                        <span className={`transition-transform ${showExtractAdvanced ? 'rotate-180' : ''}`}>{Icons.chevronDown}</span>
                                        Advanced Options
                                    </button>
                                    {showExtractAdvanced && (
                                        <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                            {/* Password Input */}
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">Password</span>
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type={showExtractPassword ? 'text' : 'password'} 
                                                    value={extractPassword} 
                                                    onChange={e => setExtractPassword(e.target.value)} 
                                                    placeholder="Enter archive password to extract" 
                                                    className="w-full px-3 py-2 pr-10 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border-0 text-slate-800 dark:text-white placeholder-slate-400" 
                                                />
                                                <button onClick={() => setShowExtractPassword(!showExtractPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                                                    {showExtractPassword ? Icons.eyeOff : Icons.eye}
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-400">Required only if archive is password-protected</p>
                                            
                                            {/* Output Path */}
                                            <div className="flex items-center justify-between pt-2">
                                                <span className="text-sm text-slate-600 dark:text-slate-400">Extract To</span>
                                                <button onClick={handleSelectExtractOutputPath} className="text-xs text-[#2196F3] hover:text-[#1976D2] font-medium">
                                                    {extractOutputPath ? 'Change' : 'Select'}
                                                </button>
                                            </div>
                                            {extractOutputPath ? (
                                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700">
                                                    <span className="text-[#2196F3]">{Icons.folder}</span>
                                                    <span className="text-xs text-slate-600 dark:text-slate-300 truncate flex-1" title={extractOutputPath}>{extractOutputPath}</span>
                                                    <button onClick={() => { setExtractOutputPath(''); localStorage.removeItem('extractOutputPath'); }} className="text-slate-400 hover:text-red-500">
                                                        {Icons.close}
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400">Default: Same folder as archive</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Crack Options */}
                            {mode === 'crack' && !processing && !foundPassword && (
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-4">
                                    {/* Attack Mode Cards */}
                                    <div>
                                        <span className="text-sm text-slate-600 dark:text-slate-400 mb-3 block">Attack Mode</span>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => setAttackMode('smart')}
                                                className={`p-4 rounded-xl border-2 transition-all text-left ${attackMode === 'smart' 
                                                    ? 'border-[#2196F3] bg-[#E3F2FD] dark:bg-blue-900/20' 
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="text-[#2196F3]">{Icons.sparkles}</div>
                                                    <span className="font-medium text-slate-800 dark:text-white">Smart</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Auto 7-layer GPU pipeline</p>
                                            </button>
                                            <button onClick={() => setAttackMode('bruteforce')}
                                                className={`p-4 rounded-xl border-2 transition-all text-left ${attackMode === 'bruteforce' 
                                                    ? 'border-[#2196F3] bg-[#E3F2FD] dark:bg-blue-900/20' 
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="text-[#2196F3]">{Icons.cpu}</div>
                                                    <span className="font-medium text-slate-800 dark:text-white">Custom</span>
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Manual charset & length</p>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {attackMode === 'bruteforce' && (
                                        <>
                                            <div>
                                                <span className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">Character Set</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {[{ id: 'lowercase', label: 'a-z' }, { id: 'uppercase', label: 'A-Z' }, { id: 'numbers', label: '0-9' }, { id: 'special', label: '!@#$' }].map(c => (
                                                        <button key={c.id} onClick={() => setCharset(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])} 
                                                            className={`px-4 py-2 text-sm rounded-lg font-mono font-medium transition-all ${charset.includes(c.id) ? 'bg-[#2196F3] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}>
                                                            {c.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <span className="text-xs text-slate-500 mb-1 block">Min Length</span>
                                                    <input type="number" value={minLength} onChange={e => setMinLength(Math.max(1, parseInt(e.target.value) || 1))} min="1" max="16" className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border-0 text-slate-800 dark:text-white" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="text-xs text-slate-500 mb-1 block">Max Length</span>
                                                    <input type="number" value={maxLength} onChange={e => setMaxLength(Math.min(16, parseInt(e.target.value) || 8))} min="1" max="16" className="w-full px-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 border-0 text-slate-800 dark:text-white" />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    
                                    {/* GPU Status */}
                                    {gpuAvailable && (
                                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span className="text-sm font-medium">GPU Acceleration Ready</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Progress */}
                            {processing && mode !== 'crack' && jobProgress && (
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">{jobProgress.status === 'completed' ? 'Completed' : 'Processing...'}</span>
                                        <span className="text-sm font-medium text-[#2196F3]">{jobProgress.percent || 0}%</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                        <div className="h-full rounded-full bg-gradient-to-r from-[#2196F3] to-[#42A5F5] transition-all" style={{ width: `${jobProgress.percent || 0}%` }} />
                                    </div>
                                </div>
                            )}

                            {/* Compression Complete */}
                            {!processing && completedOutputPath && mode === 'compress' && (
                                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-emerald-700 dark:text-emerald-300">Compression Complete!</p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate" title={completedOutputPath}>{completedOutputPath}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => window.api.openFolder(completedOutputPath)} 
                                            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                            {Icons.folderOpen} Open Folder
                                        </button>
                                        <button onClick={reset} 
                                            className="px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors">
                                            New
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Extract Complete */}
                            {!processing && extractCompletedPath && mode === 'extract' && (
                                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-emerald-700 dark:text-emerald-300">Extraction Complete!</p>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate" title={extractCompletedPath}>{extractCompletedPath}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => window.api.openFolder(extractCompletedPath)} 
                                            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                            {Icons.folderOpen} Open Folder
                                        </button>
                                        <button onClick={reset} 
                                            className="px-4 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors">
                                            New
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Crack Progress */}
                            {processing && mode === 'crack' && (
                                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-[#E3F2FD] dark:bg-blue-900/30 flex items-center justify-center text-[#2196F3] animate-pulse">
                                            {Icons.key}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-slate-800 dark:text-white">Cracking in progress...</p>
                                            <p className="text-xs text-slate-500">{crackMethod || 'Initializing'}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Current Password Display */}
                                    {crackStats.current && (
                                        <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Trying</p>
                                            <p className="font-mono text-lg text-slate-800 dark:text-white truncate">{crackStats.current}</p>
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-center">
                                            <p className="text-xl font-semibold text-slate-800 dark:text-white">{crackStats.speed?.toLocaleString() || 0}</p>
                                            <p className="text-xs text-slate-500">per second</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-center">
                                            <p className="text-xl font-semibold text-slate-800 dark:text-white">{crackStats.attempts?.toLocaleString() || 0}</p>
                                            <p className="text-xs text-slate-500">attempts</p>
                                        </div>
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-center">
                                            <p className="text-xl font-semibold text-slate-800 dark:text-white">{gpuAvailable ? 'GPU' : 'CPU'}</p>
                                            <p className="text-xs text-slate-500">engine</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Password Found */}
                            {foundPassword && (
                                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                                            {Icons.unlock}
                                        </div>
                                        <div>
                                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Password Found!</p>
                                            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">{foundPassword}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => navigator.clipboard.writeText(foundPassword)} 
                                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                        {Icons.copy} Copy to Clipboard
                                    </button>
                                </div>
                            )}

                            {/* Not Found */}
                            {crackStats.status === 'not_found' && !processing && (
                                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center">
                                    <p className="font-medium text-red-600 dark:text-red-400">Password not found</p>
                                    <p className="text-sm text-red-500 mt-1">Try different attack settings</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            {!foundPassword && (
                                <div className="flex items-center justify-between">
                                    {!processing && files.length > 0 && (
                                        <button onClick={reset} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                                            Clear all
                                        </button>
                                    )}
                                    <div className="flex items-center gap-3 ml-auto">
                                        {!processing ? (
                                            <>
                                                <button onClick={handleSelectFiles} className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-2">
                                                    {Icons.plus} Add Files
                                                </button>
                                                <button onClick={handleAction} 
                                                    className="px-6 py-2.5 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] text-white text-sm font-medium rounded-xl transition-all flex items-center gap-2">
                                                    {mode === 'compress' ? 'Compress' : mode === 'extract' ? 'Extract' : 'Start Cracking'}
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={handleCancel} className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors flex items-center gap-2">
                                                {Icons.stop} Stop
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileCompressor;
