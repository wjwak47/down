import { useState, useEffect } from 'react';

const FileCompressor = ({ pendingFiles = [], onClearPending }) => {
    // Core state
    const [files, setFiles] = useState([]);
    const [mode, setMode] = useState('compress'); // compress, extract, crack
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({});
    const [dragOver, setDragOver] = useState(false);
    
    // Compression options
    const [compressionLevel, setCompressionLevel] = useState(() => localStorage.getItem('compressionLevel') || 'normal');
    const [outputFormat, setOutputFormat] = useState('zip');
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    // Password options
    const [usePassword, setUsePassword] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    // Split options
    const [splitArchive, setSplitArchive] = useState(false);
    const [volumeSize, setVolumeSize] = useState('100MB');
    
    // Crack options
    const [attackMode, setAttackMode] = useState('dictionary');
    const [charset, setCharset] = useState(['lowercase', 'numbers']);
    const [minLength, setMinLength] = useState(1);
    const [maxLength, setMaxLength] = useState(8);
    const [crackStats, setCrackStats] = useState({ speed: 0, attempts: 0, progress: 0, currentLength: 1 });
    const [foundPassword, setFoundPassword] = useState(null);
    const [useGpu, setUseGpu] = useState(() => localStorage.getItem('useGpuCrack') === 'true');
    const [useCpuMultiThread, setUseCpuMultiThread] = useState(() => localStorage.getItem('useCpuMultiThread') !== 'false');
    const [gpuAvailable, setGpuAvailable] = useState(false);
    const [cpuCores, setCpuCores] = useState(4);
    const [crackJobId, setCrackJobId] = useState(null);
    const [encryptionInfo, setEncryptionInfo] = useState(null); // 加密类型信息
    const [crackMethod, setCrackMethod] = useState(null); // 当前使用的破解方法

    // Check GPU availability on mount
    useEffect(() => {
        if (window.api?.zipCheckGpu) {
            window.api.zipCheckGpu().then(result => {
                setGpuAvailable(result?.available || false);
                console.log('[FileCompressor] GPU available:', result?.available);
            }).catch(() => setGpuAvailable(false));
        }
        // Get CPU cores count
        setCpuCores(navigator.hardwareConcurrency || 4);
    }, []);

    // Save GPU preference
    useEffect(() => {
        localStorage.setItem('useGpuCrack', useGpu.toString());
    }, [useGpu]);

    // Save CPU multi-thread preference
    useEffect(() => {
        localStorage.setItem('useCpuMultiThread', useCpuMultiThread.toString());
    }, [useCpuMultiThread]);

    // Save compression level preference
    useEffect(() => {
        localStorage.setItem('compressionLevel', compressionLevel);
    }, [compressionLevel]);

    useEffect(() => {
        const handleProgress = ({ status, entries, total, percent }) => {
            const p = percent || (total ? Math.round((entries / total) * 100) : 0);
            setProgress(prev => ({ ...prev, ['current-job']: { status, percent: p } }));
        };
        const handleComplete = ({ success, error, outputPath }) => {
            setProgress(prev => ({ ...prev, ['current-job']: { status: success ? 'completed' : 'error', percent: 100, error, outputPath } }));
            setProcessing(false);
        };
        window.api.onZipProgress(handleProgress);
        window.api.onZipComplete(handleComplete);
        return () => {};
    }, []);

    useEffect(() => {
        if (pendingFiles?.length > 0) {
            setFiles(prev => [...prev, ...pendingFiles.filter(p => !prev.includes(p))]);
            onClearPending?.();
        }
    }, [pendingFiles]);

    const handleSelectFiles = async () => {
        try {
            console.log('[FileCompressor] handleSelectFiles called, mode:', mode);
            // Use different API based on mode
            const paths = mode === 'compress' 
                ? await window.api.zipSelectFiles()
                : await window.api.zipSelectArchives();
            console.log('[FileCompressor] Selected paths:', paths);
            if (paths?.length > 0) setFiles(prev => [...prev, ...paths.filter(p => !prev.includes(p))]);
        } catch (error) {
            console.error('[FileCompressor] Error selecting files:', error);
            alert('Error selecting files: ' + error.message);
        }
    };

    const handleRemoveFile = (index) => setFiles(files.filter((_, i) => i !== index));

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); };
    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setDragOver(false);
        const droppedFiles = Array.from(e.dataTransfer.files);
        if (droppedFiles.length > 0) {
            const filePaths = droppedFiles.map(f => f.path);
            setFiles(prev => [...prev, ...filePaths.filter(p => !prev.includes(p))]);
        }
    };

    const toggleCharset = (id) => {
        setCharset(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const getPasswordStrength = (pwd) => {
        if (!pwd) return { level: 0, text: '', color: '' };
        let score = 0;
        if (pwd.length >= 8) score++;
        if (pwd.length >= 12) score++;
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
        if (/\d/.test(pwd)) score++;
        if (/[^a-zA-Z0-9]/.test(pwd)) score++;
        const levels = [
            { level: 1, text: 'Weak', color: 'bg-red-500' },
            { level: 2, text: 'Fair', color: 'bg-orange-500' },
            { level: 3, text: 'Good', color: 'bg-yellow-500' },
            { level: 4, text: 'Strong', color: 'bg-emerald-500' },
            { level: 5, text: 'Very Strong', color: 'bg-emerald-600' }
        ];
        return levels[Math.min(score, 4)] || levels[0];
    };

    const handleAction = () => {
        if (files.length === 0) return;
        if (mode === 'crack') {
            handleCrack();
            return;
        }
        setProcessing(true);
        const jobId = Date.now().toString();
        setProgress({ ['current-job']: { status: 'starting', percent: 0 } });
        
        const levelMap = { fast: 1, normal: 5, maximum: 9 };
        const options = {
            outputName: `archive_${jobId}.${outputFormat}`,
            level: levelMap[compressionLevel],
            password: usePassword && password ? password : undefined,
            splitSize: splitArchive ? parseInt(volumeSize) * 1024 * 1024 : undefined
        };
        
        if (mode === 'compress') {
            window.api.zipCompress(files, options, jobId);
        } else {
            files.forEach(file => window.api.zipDecompress(file, { password: usePassword ? password : undefined }, jobId));
        }
    };

    const handleCrack = () => {
        if (files.length === 0) return;
        if (!window.api?.zipCrackStart) {
            console.error('Crack API not available');
            return;
        }
        
        setProcessing(true);
        setFoundPassword(null);
        setCrackStats({ speed: 0, attempts: 0, progress: 0, currentLength: minLength, status: null, error: null });
        
        const jobId = Date.now().toString();
        setCrackJobId(jobId);
        const archivePath = files[0]; // Use first file for cracking
        
        // Build charset string from selected options
        let charsetStr = '';
        if (charset.includes('lowercase')) charsetStr += 'abcdefghijklmnopqrstuvwxyz';
        if (charset.includes('uppercase')) charsetStr += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (charset.includes('numbers')) charsetStr += '0123456789';
        if (charset.includes('special')) charsetStr += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        const options = {
            mode: attackMode,
            charset: charsetStr || 'abcdefghijklmnopqrstuvwxyz0123456789',
            minLength,
            maxLength,
            useGpu: useGpu && gpuAvailable, // Enable GPU if available and selected
            useCpuMultiThread // Enable CPU multi-threading
        };
        
        console.log('[FileCompressor] Starting crack with options:', options);
        
        // Start cracking
        window.api.zipCrackStart(archivePath, options, jobId);
    };

    const handleCancelCrack = () => {
        if (crackJobId && window.api?.zipCrackStop) {
            console.log('[FileCompressor] Cancelling crack job:', crackJobId);
            window.api.zipCrackStop(crackJobId);
            setProcessing(false);
            setCrackJobId(null);
            setCrackStats({ speed: 0, attempts: 0, progress: 0, currentLength: minLength });
        }
    };
    
    // Setup crack listeners
    useEffect(() => {
        // Skip if API not available yet
        if (typeof window === 'undefined' || !window.api) {
            return;
        }
        
        // Check if crack API methods exist
        if (!window.api.onZipCrackStarted || !window.api.onZipCrackProgress || !window.api.onZipCrackResult) {
            console.warn('Crack API not fully available');
            return;
        }
        
        const handleCrackStarted = ({ numWorkers }) => {
            console.log(`Cracking started with ${numWorkers} workers`);
        };
        
        const handleCrackProgress = ({ attempts, speed, current, currentLength, method }) => {
            setCrackStats(prev => ({
                speed: speed || 0,
                attempts: attempts || 0,
                current: current || '',
                currentLength: currentLength || prev.currentLength || 1
            }));
            if (method) setCrackMethod(method);
        };
        
        const handleCrackResult = ({ success, password, error, attempts }) => {
            setProcessing(false);
            setCrackJobId(null);
            if (success && password) {
                setFoundPassword(password);
            } else if (error && error !== 'Cancelled') {
                setCrackStats(prev => ({ ...prev, error, status: 'error' }));
            } else if (!success && !error) {
                // No password found after trying all combinations
                setCrackStats(prev => ({ 
                    ...prev, 
                    status: 'not_found',
                    message: `Password not found after ${(attempts || prev.attempts || 0).toLocaleString()} attempts`
                }));
            }
        };
        
        window.api.onZipCrackStarted(handleCrackStarted);
        window.api.onZipCrackProgress(handleCrackProgress);
        window.api.onZipCrackResult(handleCrackResult);
        
        // 监听加密类型检测结果
        if (window.api.onZipCrackEncryption) {
            window.api.onZipCrackEncryption((info) => {
                console.log('[FileCompressor] Encryption detected:', info);
                setEncryptionInfo(info);
            });
        }
        
        return () => {
            if (window.api?.zipCrackOffListeners) {
                window.api.zipCrackOffListeners();
            }
        };
    }, []);

    const jobProgress = progress['current-job'];
    const passwordStrength = getPasswordStrength(password);

    const getFileIcon = (fileName) => {
        const ext = fileName.split('.').pop().toLowerCase();
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { icon: 'folder_zip', color: 'text-[#2196F3]', bg: 'bg-[#E3F2FD] dark:bg-blue-900/30' };
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return { icon: 'image', color: 'text-[#4CAF50]', bg: 'bg-[#E8F5E9] dark:bg-green-900/30' };
        if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) return { icon: 'movie', color: 'text-[#E53935]', bg: 'bg-[#FFEBEE] dark:bg-red-900/30' };
        if (['mp3', 'wav', 'flac'].includes(ext)) return { icon: 'music_note', color: 'text-[#9C27B0]', bg: 'bg-[#F3E5F5] dark:bg-purple-900/30' };
        if (['pdf'].includes(ext)) return { icon: 'picture_as_pdf', color: 'text-[#E53935]', bg: 'bg-[#FFEBEE] dark:bg-red-900/30' };
        if (['doc', 'docx'].includes(ext)) return { icon: 'description', color: 'text-[#2196F3]', bg: 'bg-[#E3F2FD] dark:bg-blue-900/30' };
        return { icon: 'draft', color: 'text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/50' };
    };

    const modes = [
        { id: 'compress', icon: 'folder_zip', label: 'Compress' },
        { id: 'extract', icon: 'unarchive', label: 'Extract' },
        { id: 'crack', icon: 'key', label: 'Crack Password' }
    ];

    const compressionLevels = [
        { id: 'fast', label: 'Fast', desc: 'Quick, larger size', icon: 'bolt' },
        { id: 'normal', label: 'Normal', desc: 'Balanced', icon: 'tune' },
        { id: 'maximum', label: 'Maximum', desc: 'Best compression', icon: 'compress' }
    ];

    const formats = [
        { id: 'zip', label: 'ZIP', color: 'text-[#4CAF50]' },
        { id: '7z', label: '7Z', color: 'text-[#E53935]' },
        { id: 'tar', label: 'TAR', color: 'text-[#FF9800]' },
        { id: 'tar.gz', label: 'TAR.GZ', color: 'text-[#9C27B0]' }
    ];

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafbfc] dark:bg-[#0d1117]">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">File Compressor</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {files.length === 0 ? 'Compress, extract, or crack archive passwords' : `${files.length} file${files.length > 1 ? 's' : ''} selected`}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Mode Selector */}
                        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                            {modes.map(m => (
                                <button key={m.id} onClick={() => { setMode(m.id); setFiles([]); setProgress({}); setFoundPassword(null); }} disabled={processing}
                                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5
                                        ${mode === m.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                    <span className="material-symbols-outlined text-lg">{m.icon}</span>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                        {files.length > 0 && !processing && (
                            <button onClick={() => { setFiles([]); setProgress({}); setFoundPassword(null); }}
                                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                Clear all
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-4xl mx-auto px-8 py-8">
                    {files.length === 0 ? (
                        /* Empty State - Drop Zone */
                        <div className="space-y-6">
                            <div 
                                onClick={handleSelectFiles}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`rounded-2xl border-2 border-dashed p-12 cursor-pointer transition-all text-center
                                    ${dragOver ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                            >
                                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-400 text-3xl">
                                        {mode === 'compress' ? 'folder_zip' : mode === 'extract' ? 'unarchive' : 'lock'}
                                    </span>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                                    {mode === 'compress' ? 'Drop files to compress' : mode === 'extract' ? 'Drop archives to extract' : 'Drop encrypted archive'}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">or click to browse</p>
                                <div className="flex gap-3 justify-center flex-wrap">
                                    {mode === 'compress' && <>
                                        <span className="text-[#2196F3] text-xs font-semibold">Any Files</span>
                                        <span className="text-[#FF9800] text-xs font-semibold">Folders</span>
                                    </>}
                                    {mode === 'extract' && <>
                                        <span className="text-[#4CAF50] text-xs font-semibold">ZIP</span>
                                        <span className="text-[#9C27B0] text-xs font-semibold">RAR</span>
                                        <span className="text-[#E53935] text-xs font-semibold">7Z</span>
                                        <span className="text-[#FF9800] text-xs font-semibold">TAR</span>
                                    </>}
                                    {mode === 'crack' && <>
                                        <span className="text-[#4CAF50] text-xs font-semibold">ZIP</span>
                                        <span className="text-[#9C27B0] text-xs font-semibold">RAR</span>
                                        <span className="text-[#E53935] text-xs font-semibold">7Z</span>
                                    </>}
                                </div>
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-3 gap-4">
                                {(mode === 'crack' ? [
                                    { icon: 'speed', title: 'Multi-threaded', desc: 'Parallel processing for speed' },
                                    { icon: 'menu_book', title: 'Dictionary Attack', desc: 'Common password lists' },
                                    { icon: 'grid_view', title: 'Brute Force', desc: 'Try all combinations' }
                                ] : [
                                    { icon: 'bolt', title: 'Fast Processing', desc: 'Optimized algorithms' },
                                    { icon: 'folder_zip', title: 'Multiple Formats', desc: 'ZIP, RAR, 7Z, TAR' },
                                    { icon: 'lock', title: 'AES-256 Encryption', desc: 'Password protection' }
                                ]).map((item, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <span className="material-symbols-outlined text-[#2196F3] text-xl mb-2 block">{item.icon}</span>
                                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{item.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* File List & Options */
                        <div className="space-y-6">
                            {/* Files */}
                            <div className="space-y-2">
                                {files.map((file, index) => {
                                    const fileName = file.split(/[\\/]/).pop();
                                    const fileStyle = getFileIcon(fileName);
                                    return (
                                        <div key={index} className="group p-4 rounded-xl border transition-all bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${fileStyle.bg}`}>
                                                    <span className={`material-symbols-outlined text-2xl ${fileStyle.color}`}>{fileStyle.icon}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{fileName}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Ready</p>
                                                </div>
                                                {!processing && (
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
                            {!processing && mode !== 'crack' && (
                                <button onClick={handleSelectFiles}
                                    className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-primary hover:border-primary/50 transition-all text-sm font-medium flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-lg">add</span>
                                    Add more files
                                </button>
                            )}

                            {/* Compress Options */}
                            {mode === 'compress' && !processing && (
                                <div className="space-y-4">
                                    {/* Compression Level */}
                                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Compression Level</h4>
                                        <div className="grid grid-cols-3 gap-3">
                                            {compressionLevels.map(level => (
                                                <button key={level.id} onClick={() => setCompressionLevel(level.id)}
                                                    className={`p-3 rounded-xl border text-left transition-all
                                                        ${compressionLevel === level.id ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                                                    <span className={`material-symbols-outlined text-lg mb-1 block ${compressionLevel === level.id ? 'text-primary' : 'text-slate-400'}`}>{level.icon}</span>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{level.label}</p>
                                                    <p className="text-xs text-slate-500">{level.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Advanced Options Toggle */}
                                    <button onClick={() => setShowAdvanced(!showAdvanced)}
                                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                                        <span className={`material-symbols-outlined text-lg transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>expand_more</span>
                                        Advanced Options
                                    </button>

                                    {showAdvanced && (
                                        <div className="space-y-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                                            {/* Output Format */}
                                            <div>
                                                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Output Format</h4>
                                                <div className="flex gap-2">
                                                    {formats.map(fmt => (
                                                        <button key={fmt.id} onClick={() => setOutputFormat(fmt.id)}
                                                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all
                                                                ${outputFormat === fmt.id ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 ' + fmt.color}`}>
                                                            {fmt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Password Protection */}
                                            <div>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={usePassword} onChange={e => setUsePassword(e.target.checked)}
                                                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Password Protection</span>
                                                </label>
                                                {usePassword && (
                                                    <div className="mt-3 space-y-2">
                                                        <div className="relative">
                                                            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                                                                placeholder="Enter password" className="w-full h-10 px-3 pr-10 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm" />
                                                            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                                                                <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                                            </button>
                                                        </div>
                                                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                                            placeholder="Confirm password" className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm" />
                                                        {password && (
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                    <div className={`h-full ${passwordStrength.color} transition-all`} style={{ width: `${passwordStrength.level * 20}%` }}></div>
                                                                </div>
                                                                <span className="text-xs text-slate-500">{passwordStrength.text}</span>
                                                            </div>
                                                        )}
                                                        {password && confirmPassword && password !== confirmPassword && (
                                                            <p className="text-xs text-red-500">Passwords do not match</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Split Archive */}
                                            <div>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" checked={splitArchive} onChange={e => setSplitArchive(e.target.checked)}
                                                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Split into volumes</span>
                                                </label>
                                                {splitArchive && (
                                                    <div className="mt-3 flex gap-2 flex-wrap">
                                                        {['100', '500', '1024', '2048'].map(size => (
                                                            <button key={size} onClick={() => setVolumeSize(size)}
                                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
                                                                    ${volumeSize === size ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-600'}`}>
                                                                {size >= 1024 ? `${size/1024}GB` : `${size}MB`}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Extract Options */}
                            {mode === 'extract' && !processing && (
                                <div className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={usePassword} onChange={e => setUsePassword(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Archive has password</span>
                                    </label>
                                    {usePassword && (
                                        <div className="mt-3">
                                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                                placeholder="Enter archive password" className="w-full h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Crack Options */}
                            {mode === 'crack' && !processing && !foundPassword && (
                                <div className="space-y-4">
                                    {/* GPU Acceleration Toggle */}
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 border border-emerald-200 dark:border-emerald-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white text-xl">memory</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">GPU Acceleration</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        {gpuAvailable ? 'Up to 1000x faster with GPU' : 'GPU not available'}
                                                    </p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={useGpu} onChange={e => setUseGpu(e.target.checked)} 
                                                    disabled={!gpuAvailable} className="sr-only peer" />
                                                <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                                                    ${gpuAvailable ? 'bg-slate-300 peer-checked:bg-emerald-500' : 'bg-slate-200 cursor-not-allowed'}`}></div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* CPU Multi-Thread Toggle */}
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white text-xl">developer_board</span>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">CPU Multi-Thread</h4>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                                        Use {cpuCores} CPU cores for parallel cracking
                                                    </p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={useCpuMultiThread} onChange={e => setUseCpuMultiThread(e.target.checked)} 
                                                    className="sr-only peer" />
                                                <div className="w-11 h-6 bg-slate-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Attack Mode</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'dictionary', label: 'Smart Dictionary', desc: 'Common passwords + rules', icon: 'auto_awesome' },
                                                { id: 'bruteforce', label: 'Smart Brute Force', desc: 'AI-optimized patterns', icon: 'psychology' }
                                            ].map(attack => (
                                                <button key={attack.id} onClick={() => setAttackMode(attack.id)}
                                                    className={`p-3 rounded-xl border text-left transition-all
                                                        ${attackMode === attack.id ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}>
                                                    <span className={`material-symbols-outlined text-lg mb-1 block ${attackMode === attack.id ? 'text-primary' : 'text-slate-400'}`}>{attack.icon}</span>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{attack.label}</p>
                                                    <p className="text-xs text-slate-500">{attack.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Smart Attack Features Info */}
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-blue-500">tips_and_updates</span>
                                            Smart Attack Features
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                Markov Chain optimization
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                200+ common passwords
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                Leet speak transforms
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                Date/keyboard patterns
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                Rule-based mutations
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                                Multi-threaded CPU
                                            </div>
                                        </div>
                                    </div>

                                    {attackMode === 'bruteforce' && (
                                        <div className="p-4 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-4">
                                            <div>
                                                <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Character Set</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {[
                                                        { id: 'lowercase', label: 'a-z' },
                                                        { id: 'uppercase', label: 'A-Z' },
                                                        { id: 'numbers', label: '0-9' },
                                                        { id: 'special', label: '!@#$' }
                                                    ].map(set => (
                                                        <button key={set.id} onClick={() => toggleCharset(set.id)}
                                                            className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all
                                                                ${charset.includes(set.id) ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 dark:border-slate-700 text-slate-600'}`}>
                                                            {set.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div>
                                                    <label className="text-xs text-slate-500 block mb-1">Min Length</label>
                                                    <input type="number" value={minLength} onChange={e => setMinLength(parseInt(e.target.value))}
                                                        className="w-20 h-9 px-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm" min="1" max="16" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-slate-500 block mb-1">Max Length</label>
                                                    <input type="number" value={maxLength} onChange={e => setMaxLength(parseInt(e.target.value))}
                                                        className="w-20 h-9 px-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm" min="1" max="16" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Progress */}
                            {mode !== 'crack' && jobProgress && (
                                <div className={`p-4 rounded-xl border transition-all ${
                                    jobProgress.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
                                    jobProgress.status === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                                    'bg-primary/5 dark:bg-primary/10 border-primary/30'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`text-sm font-medium ${
                                            jobProgress.status === 'completed' ? 'text-emerald-700 dark:text-emerald-400' :
                                            jobProgress.status === 'error' ? 'text-red-700 dark:text-red-400' : 'text-primary'}`}>
                                            {jobProgress.status === 'completed' ? '✓ Completed!' :
                                             jobProgress.status === 'error' ? '✗ Failed' :
                                             mode === 'compress' ? 'Compressing...' : 'Extracting...'}
                                        </span>
                                        {jobProgress.status !== 'completed' && jobProgress.status !== 'error' && (
                                            <span className="text-xs font-semibold text-primary">{jobProgress.percent}%</span>
                                        )}
                                    </div>
                                    {jobProgress.status !== 'completed' && jobProgress.status !== 'error' && (
                                        <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden">
                                            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${jobProgress.percent}%` }}></div>
                                        </div>
                                    )}
                                    {jobProgress.error && <p className="text-xs text-red-600 mt-2">{jobProgress.error}</p>}
                                    {jobProgress.outputPath && <p className="text-xs text-slate-500 mt-2 truncate">Output: {jobProgress.outputPath}</p>}
                                </div>
                            )}

                            {/* Crack Progress */}
                            {mode === 'crack' && (processing || foundPassword || crackStats.status) && (
                                <div className={`p-4 rounded-xl border transition-all ${
                                    foundPassword ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 
                                    crackStats.status === 'not_found' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
                                    crackStats.status === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                                    'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50'}`}>
                                    {foundPassword ? (
                                        <div className="text-center py-6">
                                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
                                                <span className="material-symbols-outlined text-5xl text-white">key</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">🎉 Password Found!</h3>
                                            <div className="relative inline-block group">
                                                <p className="font-mono text-3xl font-bold text-emerald-700 dark:text-emerald-300 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/50 dark:to-teal-900/50 px-6 py-3 rounded-xl border-2 border-emerald-300 dark:border-emerald-700 shadow-inner select-all">
                                                    {foundPassword}
                                                </p>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(foundPassword);
                                                        // 简单的复制反馈
                                                        const btn = document.getElementById('copy-pwd-btn');
                                                        if (btn) { btn.textContent = 'check'; setTimeout(() => btn.textContent = 'content_copy', 1500); }
                                                    }}
                                                    id="copy-pwd-btn"
                                                    className="absolute -right-3 -top-3 w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg transition-all hover:scale-110"
                                                    title="Copy password"
                                                >
                                                    <span className="material-symbols-outlined text-lg">content_copy</span>
                                                </button>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                                                Click the password to select, or use the copy button
                                            </p>
                                            <div className="mt-4 flex justify-center gap-2">
                                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                    {crackStats.attempts?.toLocaleString() || 0} attempts
                                                </span>
                                                <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {crackMethod || 'CPU'}
                                                </span>
                                            </div>
                                        </div>
                                    ) : crackStats.status === 'not_found' ? (
                                        <div className="text-center py-4">
                                            <span className="material-symbols-outlined text-4xl text-amber-500 mb-2">search_off</span>
                                            <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">Password Not Found</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{crackStats.message}</p>
                                            <p className="text-xs text-slate-400 mt-2">Try using Brute Force mode with more character sets</p>
                                        </div>
                                    ) : crackStats.status === 'error' ? (
                                        <div className="text-center py-4">
                                            <span className="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
                                            <p className="text-sm text-red-600 dark:text-red-400 mb-2">Error</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{crackStats.error}</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Encryption Type & Method Info */}
                                            {(encryptionInfo || crackMethod) && (
                                                <div className="flex gap-2 justify-center flex-wrap mb-2">
                                                    {encryptionInfo?.format && (
                                                        <span className="px-2 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                            {encryptionInfo.format.toUpperCase()}
                                                        </span>
                                                    )}
                                                    {encryptionInfo?.method && (
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                                                            encryptionInfo.isZipCrypto ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                            encryptionInfo.isRar5 || encryptionInfo.isRar3 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                            encryptionInfo.is7zAES ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                        }`}>
                                                            {encryptionInfo.method}
                                                        </span>
                                                    )}
                                                    {crackMethod && (
                                                        <span className={`px-2 py-1 text-xs font-medium rounded-lg ${
                                                            crackMethod.includes('GPU') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                            crackMethod.includes('bkcrack') ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                                                            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                                        }`}>
                                                            {crackMethod}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {/* Current Password Being Tried */}
                                            <div className="text-center py-2">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Currently trying:</p>
                                                <p className="font-mono text-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-lg inline-block min-w-[120px]">
                                                    {crackStats.current || '...'}
                                                </p>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600 dark:text-slate-400">Speed</span>
                                                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                                    {crackStats.speed >= 1000000 ? `${(crackStats.speed / 1000000).toFixed(1)}M` :
                                                     crackStats.speed >= 1000 ? `${(crackStats.speed / 1000).toFixed(1)}K` :
                                                     crackStats.speed.toLocaleString()} /sec
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600 dark:text-slate-400">Attempts</span>
                                                <span className="font-mono text-slate-700 dark:text-slate-300">{(crackStats.attempts || 0).toLocaleString()}</span>
                                            </div>
                                            {/* Progress info */}
                                            {attackMode === 'dictionary' && (
                                                <p className="text-xs text-slate-500 text-center">Dictionary mode - testing common passwords</p>
                                            )}
                                            {attackMode === 'bruteforce' && (
                                                <p className="text-xs text-slate-500 text-center">
                                                    Brute force: length {crackStats.currentLength || minLength} of {maxLength}
                                                </p>
                                            )}
                                            {/* Animated progress indicator */}
                                            <div className="h-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
                                                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            {!foundPassword && (
                                <div className="flex justify-end gap-3">
                                    {/* Cancel Button - only show when processing crack */}
                                    {processing && mode === 'crack' && (
                                        <button onClick={handleCancelCrack}
                                            className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all flex items-center gap-2">
                                            <span className="material-symbols-outlined">stop</span>
                                            Stop
                                        </button>
                                    )}
                                    <button onClick={handleAction} disabled={processing || files.length === 0 || (mode === 'compress' && usePassword && password !== confirmPassword)}
                                        className="px-6 py-2.5 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                        {processing ? (
                                            <><span className="material-symbols-outlined animate-spin">progress_activity</span>
                                            {mode === 'compress' ? 'Compressing...' : mode === 'extract' ? 'Extracting...' : 'Cracking...'}</>
                                        ) : (
                                            <><span className="material-symbols-outlined">{mode === 'compress' ? 'folder_zip' : mode === 'extract' ? 'unarchive' : 'key'}</span>
                                            {mode === 'compress' ? 'Compress Now' : mode === 'extract' ? 'Extract Now' : 'Start Cracking'}</>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FileCompressor;
