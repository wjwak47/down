import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../components/Toast';

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
    const toast = useToast();

    // Debug: Log component mount/unmount
    useEffect(() => {
        console.log('[FileCompressor] Component mounted');
        return () => console.log('[FileCompressor] Component unmounted');
    }, []);

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
    const [crackStats, setCrackStats] = useState({ speed: 0, attempts: 0, progress: 0, currentLength: 1, current: '', eta: 0, tested: 0, total: 0 });
    const [speedHistory, setSpeedHistory] = useState([]); // 速度历史记录（用于曲线图）
    const [successProbability, setSuccessProbability] = useState(null); // 成功概率预估
    const [foundPassword, setFoundPassword] = useState(null);
    const [useCpuMultiThread] = useState(() => localStorage.getItem('useCpuMultiThread') !== 'false');
    const [gpuAvailable, setGpuAvailable] = useState(false);
    const [crackJobId, setCrackJobId] = useState(null);
    const [crackSessionId, setCrackSessionId] = useState(null); // ✅ Track sessionId separately from jobId
    const [crackMethod, setCrackMethod] = useState(null);
    const [copied, setCopied] = useState(false);
    const [pendingSessions, setPendingSessions] = useState([]);
    const [showSessionDialog, setShowSessionDialog] = useState(false);

    // File queue management for uploads during active tasks
    const [fileQueue, setFileQueue] = useState([]);
    const [processingQueue, setProcessingQueue] = useState(false);
    const [queueStatus, setQueueStatus] = useState('idle'); // 'idle', 'processing', 'paused'

    // ✅ Use ref to track pause status to avoid stale closures in event handlers
    const isPausedRef = useRef(false);

    // ✅ Add ref to track if session dialog was manually dismissed (prevent recurring popups)
    const sessionCheckDismissedRef = useRef(false);

    // Auto-process file queue when current task completes
    useEffect(() => {
        if (!processing && fileQueue.length > 0 && !processingQueue && mode === 'crack') {
            console.log('[FileCompressor] Auto-processing queued files:', fileQueue.length);
            setProcessingQueue(true);

            // Move first file from queue to active files
            const nextFile = fileQueue[0];
            setCrackFiles(prev => {
                if (!prev.includes(nextFile)) {
                    return [...prev, nextFile];
                }
                return prev;
            });

            // Remove from queue
            setFileQueue(prev => prev.slice(1));
            setProcessingQueue(false);

            toast.info(`📁 Processing next file from queue (${fileQueue.length - 1} remaining)`);
        }
    }, [processing, fileQueue, processingQueue, mode]);

    // Enhanced file upload handler with queue support
    const handleFileUpload = (newFiles) => {
        if (processing && mode === 'crack') {
            // Add to queue if crack task is running
            const uniqueFiles = newFiles.filter(file =>
                !fileQueue.includes(file) && !crackFiles.includes(file)
            );

            if (uniqueFiles.length > 0) {
                setFileQueue(prev => [...prev, ...uniqueFiles]);
                toast.info(`📋 Added ${uniqueFiles.length} file(s) to queue (${fileQueue.length + uniqueFiles.length} total)`);
            }
        } else {
            // Process immediately if no task running
            if (mode === 'compress') {
                setCompressFiles(prev => [...prev, ...newFiles.filter(p => !prev.includes(p))]);
            } else if (mode === 'extract') {
                const archives = newFiles.filter(isArchiveFile);
                if (archives.length > 0) {
                    setExtractFiles(prev => [...prev, ...archives.filter(p => !prev.includes(p))]);
                }
            } else {
                const archives = newFiles.filter(isArchiveFile);
                if (archives.length > 0) {
                    setCrackFiles(prev => [...prev, ...archives.filter(p => !prev.includes(p))]);
                }
            }
        }
    };

    // Helper to check if file is an archive
    const isArchiveFile = (filePath) => {
        const ext = filePath.split('.').pop().toLowerCase();
        return ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext);
    };

    // Get current files based on mode
    const files = mode === 'compress' ? compressFiles : mode === 'extract' ? extractFiles : crackFiles;
    const setFiles = mode === 'compress' ? setCompressFiles : mode === 'extract' ? setExtractFiles : setCrackFiles;

    useEffect(() => {
        if (window.api?.zipCheckGpu) window.api.zipCheckGpu().then(r => setGpuAvailable(r?.available || false)).catch(() => { });
    }, []);

    // ✅ Session resume dialog functionality has been disabled per user request
    // The feature was found to be unnecessary and disruptive

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

            // Enhanced success/failure notifications
            if (success && completedPath) {
                if (mode === 'compress') {
                    setCompletedOutputPath(completedPath);
                    toast.success(`✅ Archive created successfully!`, {
                        description: `Saved to: ${completedPath.split(/[\\/]/).pop()}`,
                        duration: 5000
                    });
                } else if (mode === 'extract') {
                    setExtractCompletedPath(completedPath);
                    toast.success(`✅ Files extracted successfully!`, {
                        description: `Extracted to: ${completedPath.split(/[\\/]/).pop()}`,
                        duration: 5000
                    });
                }
            } else if (error) {
                toast.error(`❌ Operation failed`, {
                    description: error,
                    duration: 8000
                });
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

        // ✅ Enhanced IPC listener registration with wake-up recovery
        const registerCrackListeners = () => {
            console.log('[FileCompressor] 🔗 Registering crack IPC listeners...');

            // Clear existing listeners first to avoid duplicates
            window.api?.zipCrackOffListeners?.();

            window.api.onZipCrackStarted?.(() => { });
            window.api.onZipCrackProgress(({ attempts, speed, current, currentLength, method, progress, eta, tested, total, sessionId }) => {
                // ✅ Store sessionId when we receive it
                if (sessionId) {
                    setCrackSessionId(sessionId);
                }

                // ✅ CRITICAL: Don't update stats if we're in paused state
                // This prevents progress updates from overriding pause status
                setCrackStats(prev => {
                    // If we're paused, don't update the stats to avoid overriding pause state
                    if (prev.status === 'paused' || prev.status === 'pausing') {
                        console.log('[FileCompressor] ⚠️ Ignoring progress update - task is paused/pausing');
                        return prev;
                    }

                    return {
                        ...prev, // Preserve existing status and other fields
                        speed: speed || 0,
                        attempts: attempts || 0,
                        current: current || '',
                        currentLength: currentLength || prev.currentLength,
                        progress: progress || 0,
                        eta: eta || 0,
                        tested: tested || 0,
                        total: total || 0
                    };
                });

                // === 科学优化：速度历史记录（用于曲线图）===
                if (speed && speed > 0) {
                    setSpeedHistory(prev => {
                        const now = Date.now();
                        const newEntry = { time: now, speed };
                        // 只保留最近60个数据点（约1分钟，每秒更新一次）
                        const updated = [...prev, newEntry].slice(-60);
                        return updated;
                    });
                }

                // === 科学优化：成功概率估算 ===
                // 基于统计学：根据已测试数量和密码复杂度估算
                if (tested && tested > 0) {
                    const testedNum = parseInt(tested) || 0;
                    // 简化的概率模型：基于Zipf定律的衰减
                    // 前1000万次覆盖约45%的弱密码
                    // 前1亿次覆盖约60%
                    // 前10亿次覆盖约75%
                    let prob = 0;
                    if (testedNum < 1000000) {
                        prob = 70 - (testedNum / 1000000) * 20; // 70% -> 50%
                    } else if (testedNum < 10000000) {
                        prob = 50 - ((testedNum - 1000000) / 9000000) * 15; // 50% -> 35%
                    } else if (testedNum < 100000000) {
                        prob = 35 - ((testedNum - 10000000) / 90000000) * 15; // 35% -> 20%
                    } else if (testedNum < 1000000000) {
                        prob = 20 - ((testedNum - 100000000) / 900000000) * 10; // 20% -> 10%
                    } else {
                        prob = Math.max(1, 10 - (testedNum / 10000000000) * 5); // 10% -> 5%
                    }
                    setSuccessProbability(Math.max(1, Math.round(prob)));
                }

                if (method) setCrackMethod(method);
            });

            window.api.onZipCrackResult?.(({ success, password: pwd, error, stopped }) => {
                console.log('[FileCompressor] 🔔 onZipCrackResult received:', { success, password: !!pwd, error, stopped });
                console.log('[FileCompressor] Current state before handling:', { processing, crackJobId });
                console.log('[FileCompressor] isPausedRef.current:', isPausedRef.current);

                // ✅ CRITICAL: Ignore this event if we're in paused state
                // This prevents race conditions where crack-complete arrives after pause
                if (isPausedRef.current) {
                    console.log('[FileCompressor] ⚠️  Ignoring crack-complete because isPausedRef is true');
                    return;
                }

                // 完全重置UI状态
                setProcessing(false);
                setCrackJobId(null);
                setCrackSessionId(null);
                setFoundPassword(pwd || null);

                if (success && pwd) {
                    // 成功找到密码，显示结果但清空文件列表让用户可以处理新文件
                    setCrackStats({ speed: 0, attempts: 0, progress: 0, currentLength: minLength, current: 'Password found!', eta: 0, tested: 0, total: 0 });
                    setCrackFiles([]);
                    toast.success(`🔓 Password found!`, {
                        description: `Password: ${pwd}`,
                        duration: 10000
                    });
                } else if (error && error !== 'Cancelled') {
                    // 出错，完全重置
                    setCrackStats({ speed: 0, attempts: 0, progress: 0, currentLength: minLength, current: '', eta: 0, tested: 0, total: 0 });
                    setCrackFiles([]);
                    toast.error(`❌ Password cracking failed`, {
                        description: error,
                        duration: 8000
                    });
                } else if (!success && !error) {
                    // 未找到密码，完全重置
                    setCrackStats({ speed: 0, attempts: 0, progress: 0, currentLength: minLength, current: 'Password not found', eta: 0, tested: 0, total: 0 });
                    setCrackFiles([]);
                    toast.warning(`⚠️ Password not found`, {
                        description: 'Try different attack settings or a larger dictionary',
                        duration: 8000
                    });
                }
            });

            // Listen for pause confirmation
            const handlePaused = ({ id, sessionId }) => {
                console.log('[FileCompressor] 🔔 onZipCrackPaused received:', id, 'sessionId:', sessionId);
                console.log('[FileCompressor] Current crackJobId:', crackJobId);
                console.log('[FileCompressor] Current crackSessionId:', crackSessionId);
                console.log('[FileCompressor] Current crackStats.status:', crackStats.status);

                // ✅ Store sessionId from pause event
                if (sessionId) {
                    console.log('[FileCompressor] Setting crackSessionId from pause event:', sessionId);
                    setCrackSessionId(sessionId);
                }

                // ✅ Set ref to true to prevent crack-complete from resetting state
                isPausedRef.current = true;
                console.log('[FileCompressor] Set isPausedRef.current to true');

                // DON'T set processing to false - keep it true so UI doesn't reset
                // setProcessing(false);
                // Keep crackJobId (don't clear it) - IMPORTANT!
                console.log('[FileCompressor] Setting status to paused, keeping crackJobId:', id);

                // ✅ 原子化状态更新并添加调试
                setCrackStats(prev => {
                    const newStats = { ...prev, status: 'paused', current: 'Paused' };
                    console.log('[FileCompressor] ✅ Updated crackStats to paused:', newStats);
                    return newStats;
                });

                // Success notification for pause
                toast.success('⏸️ Task paused successfully', {
                    description: 'You can resume the task later',
                    duration: 3000
                });
            };
            if (window.api.onZipCrackPaused) {
                window.api.onZipCrackPaused(handlePaused);
            }
        };

        // Initial registration
        registerCrackListeners();

        // ✅ Re-register listeners on window focus (helps with wake-up scenarios)
        const handleFocusReregister = () => {
            console.log('[FileCompressor] 🔄 Re-registering IPC listeners after focus...');
            setTimeout(registerCrackListeners, 100);
        };

        window.addEventListener('focus', handleFocusReregister);

        return () => {
            window.removeEventListener('focus', handleFocusReregister);
            window.api?.zipCrackOffListeners?.();
        };
    }, []);

    const handleOpenFolder = async () => {
        const downloadDir = localStorage.getItem('downloadPath') || '';
        try {
            const result = await window.api.openFolder(downloadDir);
            if (!result?.success) {
                try {
                    await window.api.openDownloadsFolder();
                } catch (err) {
                    console.error('[FileCompressor] Failed to open downloads folder:', err);
                }
            }
        } catch (err) {
            console.error('[FileCompressor] Failed to open folder:', err);
            try {
                await window.api.openDownloadsFolder();
            } catch (err2) {
                console.error('[FileCompressor] Failed to open downloads folder:', err2);
            }
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
            // Reset crack-related states when adding new files (only if not processing)
            if (mode === 'crack' && !processing) {
                setFoundPassword(null);
                setCrackStats({ speed: 0, attempts: 0, progress: 0, currentLength: 1, current: '' });
            }

            // Use enhanced file upload handler
            handleFileUpload(paths);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault(); e.stopPropagation(); setDragOver(false);
        const paths = Array.from(e.dataTransfer.files).map(f => f.path);
        if (paths.length > 0) {
            // Reset crack-related states when adding new files (only if not processing)
            if (mode === 'crack' && !processing) {
                setFoundPassword(null);
                setCrackStats({ speed: 0, attempts: 0, progress: 0, currentLength: 1, current: '' });
            }

            // Filter files based on mode and use enhanced upload handler
            let filteredPaths = paths;
            if (mode === 'extract' || mode === 'crack') {
                // Only add archive files for extract and crack modes
                filteredPaths = paths.filter(isArchiveFile);
            }

            if (filteredPaths.length > 0) {
                handleFileUpload(filteredPaths);
            } else if (mode !== 'compress') {
                toast.error('❌ Please select archive files (.zip, .rar, .7z, etc.)');
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

        // ✅ Reset pause ref when starting new crack
        isPausedRef.current = false;

        setProcessing(true); setFoundPassword(null);
        setCrackStats({ speed: 0, attempts: 0, progress: 0, currentLength: minLength, status: null, current: '' });
        setSpeedHistory([]); // 重置速度历史
        setSuccessProbability(null); // 重置成功概率
        const jobId = Date.now().toString();
        setCrackJobId(jobId);
        setCrackSessionId(null); // ✅ Clear old sessionId - will be set when progress arrives
        let cs = '';
        if (charset.includes('lowercase')) cs += 'abcdefghijklmnopqrstuvwxyz';
        if (charset.includes('uppercase')) cs += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (charset.includes('numbers')) cs += '0123456789';
        if (charset.includes('special')) cs += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        window.api.zipCrackStart(files[0], { mode: attackMode, charset: cs || 'abcdefghijklmnopqrstuvwxyz0123456789', minLength, maxLength, useGpu: gpuAvailable, useCpuMultiThread }, jobId);
    };
    const handleCopyPassword = async () => {
        if (!foundPassword) return;

        // 优先使用 Electron API
        if (window.api?.copyToClipboard) {
            try {
                const result = await window.api.copyToClipboard(foundPassword);
                if (result?.success) {
                    setCopied(true);
                    toast.success('✅ Password copied to clipboard');
                    setTimeout(() => setCopied(false), 2000);
                } else {
                    toast.error('❌ Failed to copy password');
                }
            } catch (err) {
                console.error('Failed to copy:', err);
                toast.error('❌ Failed to copy password');
            }
        } else {
            // 回退到浏览器 API
            try {
                await navigator.clipboard.writeText(foundPassword);
                setCopied(true);
                toast.success('✅ Password copied to clipboard');
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
                toast.error('❌ Failed to copy password');
            }
        }
    };

    // Pause handler - saves session without deleting
    const handlePause = async () => {
        if (mode === 'crack' && crackJobId && processing) {
            console.log('[FileCompressor] 📤 Sending pause request for job:', crackJobId);
            console.log('[FileCompressor] Current state:', { processing, crackJobId, crackStats });

            // ✅ Immediately set pausing status and prevent race conditions
            setCrackStats(prev => ({ ...prev, current: 'Pausing...', status: 'pausing' }));

            try {
                // ✅ Call pause API and wait for response
                const result = await window.api?.zipCrackPause?.(crackJobId);
                console.log('[FileCompressor] Pause API result:', result);

                // ✅ If API call succeeds but no event confirmation, force paused state after delay
                setTimeout(() => {
                    setCrackStats(current => {
                        if (current.status === 'pausing') {
                            console.log('[FileCompressor] ⚠️ No pause confirmation received, forcing paused state');
                            isPausedRef.current = true;
                            return { ...current, status: 'paused', current: 'Paused' };
                        }
                        return current;
                    });
                }, 2000); // Reduced to 2 seconds for faster response

            } catch (error) {
                console.error('[FileCompressor] Pause request failed:', error);
                toast.error('❌ Failed to pause task: ' + error.message);
                // Revert status on error
                setCrackStats(prev => ({
                    ...prev,
                    status: undefined,
                    current: prev.current === 'Pausing...' ? '' : prev.current
                }));
            }
        } else {
            console.log('[FileCompressor] ⚠️ Cannot pause - invalid state:', { mode, crackJobId, processing });
        }
    };

    // Enhanced stop handler with timeout and force termination
    const [stopInProgress, setStopInProgress] = useState(false);
    const [showForceStopDialog, setShowForceStopDialog] = useState(false);
    const stopRequestedRef = useRef(false); // 防止重复请求
    const lastStopTimeRef = useRef(0); // 跟踪最后一次 Stop 时间
    const STOP_COOLDOWN_MS = 5000; // Stop 后 5 秒内不尝试重连

    // ✅ 原子性状态重置函数 - 将所有状态重置到初始值
    const resetToInitialState = () => {
        console.log('[FileCompressor] 🔄 Resetting to initial state');

        // ✅ 直接使用状态更新，不依赖 React.flushSync
        // 重置所有会话相关状态
        setProcessing(false);
        setCrackJobId(null);
        setCrackSessionId(null);
        setFoundPassword(null);
        setCrackStats({
            speed: 0,
            attempts: 0,
            progress: 0,
            currentLength: minLength,
            current: '',
            eta: 0,
            tested: 0,
            total: 0,
            status: undefined
        });

        // ✅ 强制清空文件列表，确保返回上传界面
        setCrackFiles([]);

        // 重置所有 refs
        stopRequestedRef.current = false;
        isPausedRef.current = false;
        lastStopTimeRef.current = Date.now(); // 记录停止时间

        // ✅ 关闭所有对话框
        setShowSessionDialog(false);
        setPendingSessions([]);

        // ✅ 使用 setTimeout 确保状态更新完成后验证
        setTimeout(() => {
            console.log('[FileCompressor] ✅ State reset complete - crackFiles length:', crackFiles.length);
            console.log('[FileCompressor] ✅ Current mode:', mode);
            console.log('[FileCompressor] ✅ Processing state:', processing);
        }, 100);

        console.log('[FileCompressor] ✅ State reset complete');
    };

    const handleStop = async () => {
        // 防止重复调用
        if (stopRequestedRef.current || stopInProgress) {
            console.log('[FileCompressor] Stop already in progress, ignoring duplicate request');
            return;
        }

        if (mode === 'crack' && (crackJobId || crackSessionId)) {
            stopRequestedRef.current = true;
            isPausedRef.current = false;
            setStopInProgress(true);

            try {
                // ✅ 使用 sessionId 或 jobId（优先使用 sessionId）
                const idToStop = crackSessionId || crackJobId;
                console.log('[FileCompressor] 🛑 CANCEL REQUESTED - Enhanced termination with verification');
                console.log('[FileCompressor] Requesting force stop for:', { crackJobId, crackSessionId, idToStop });
                console.log('[FileCompressor] Current task status:', crackStats.status);

                // ✅ ENHANCED USER FEEDBACK SYSTEM (Task 6)
                const feedbackSteps = [
                    { step: 1, message: 'Initializing cancellation...', detail: 'Preparing to stop all processes' },
                    { step: 2, message: 'Stopping processes...', detail: 'Terminating password cracking operations' },
                    { step: 3, message: 'Verifying termination...', detail: 'Checking if all processes stopped' },
                    { step: 4, message: 'Cleaning up...', detail: 'Removing temporary files and sessions' },
                    { step: 5, message: 'Finalizing...', detail: 'Completing cancellation process' }
                ];

                let currentStep = 0;

                const updateFeedback = (stepIndex, customMessage = null, customDetail = null) => {
                    const step = feedbackSteps[stepIndex];
                    if (step) {
                        setCrackStats(prev => ({
                            ...prev,
                            current: customMessage || step.message,
                            status: 'canceling',
                            cancelStep: step.step,
                            cancelDetail: customDetail || step.detail,
                            progress: Math.round(((step.step - 1) / feedbackSteps.length) * 100)
                        }));

                        // Show detailed toast for each major step
                        if (stepIndex === 0) {
                            toast.info('🛑 Cancellation started - this may take a few moments');
                        } else if (stepIndex === 2) {
                            toast.info('🔍 Verifying all processes have stopped...');
                        }
                    }
                };

                // Phase 1: Initial status update with enhanced feedback
                updateFeedback(0);

                // ✅ 检测任务是否处于 paused 状态
                if (crackStats.status === 'paused') {
                    console.log('[FileCompressor] Task is paused, deleting session instead of stopping');

                    updateFeedback(0, 'Cancelling paused task...', 'Removing paused session from system');

                    try {
                        // ✅ 显式将暂停的会话加入黑名单
                        if (window.api?.zipCrackBlacklistSession) {
                            console.log('[FileCompressor] Adding paused session to blacklist...');
                            await window.api.zipCrackBlacklistSession(idToStop, 'user_cancel_paused');
                        }

                        // ✅ 删除 paused session（不调用 stop API）
                        if (window.api?.zipCrackDeleteSession) {
                            await window.api.zipCrackDeleteSession(idToStop);
                            console.log('[FileCompressor] Paused session deleted successfully');
                        }

                        updateFeedback(4, 'Paused task cancelled', 'Session removed successfully');

                        // Show success notification with details
                        toast.success('✅ Paused task cancelled successfully', {
                            description: 'The paused password cracking session has been removed from the system.'
                        });

                    } catch (error) {
                        console.error('[FileCompressor] Failed to delete paused session:', error);
                        toast.error('❌ Failed to cancel paused task', {
                            description: error.message
                        });
                        // 即使删除失败也继续重置 UI
                    }

                    // ✅ 立即重置 UI
                    resetToInitialState();
                    return;
                }

                // Phase 2: Force stop with enhanced feedback
                updateFeedback(1);

                let forceStopResult = null;
                try {
                    if (window.api?.zipCrackForceStop) {
                        console.log('[FileCompressor] 🚨 Calling zipCrackForceStop for enhanced termination...');
                        forceStopResult = await window.api.zipCrackForceStop(idToStop);
                        console.log('[FileCompressor] Force stop result:', forceStopResult);

                        // ✅ Enhanced feedback based on force stop results
                        if (forceStopResult?.success) {
                            const successfulSteps = forceStopResult.summary?.successfulSteps || 0;
                            const totalSteps = forceStopResult.summary?.totalSteps || 0;
                            updateFeedback(1, 'Processes terminated', `${successfulSteps}/${totalSteps} termination steps completed`);
                        } else {
                            updateFeedback(1, 'Termination issues detected', 'Some processes may require additional cleanup');
                            toast.warning('⚠️ Some termination steps failed', {
                                description: 'Continuing with verification and cleanup...'
                            });
                        }
                    } else {
                        console.log('[FileCompressor] ⚠️ Force stop API not available, falling back to regular stop');
                        updateFeedback(1, 'Using fallback termination...', 'Enhanced termination not available');
                        if (window.api?.zipCrackStop) {
                            await window.api.zipCrackStop(idToStop, true);
                        }
                    }
                } catch (stopError) {
                    console.log('[FileCompressor] Force stop API failed:', stopError.message);
                    updateFeedback(1, 'Termination error occurred', 'Continuing with verification...');
                    toast.warning('⚠️ Termination encountered issues', {
                        description: 'Proceeding with process verification...'
                    });
                    // Continue with verification even if force stop fails
                }

                // Phase 3: Process verification with detailed feedback
                updateFeedback(2);

                let verificationResult = null;
                try {
                    if (window.api?.zipCrackVerifyTermination) {
                        console.log('[FileCompressor] 🔍 Verifying process termination...');
                        verificationResult = await window.api.zipCrackVerifyTermination();
                        console.log('[FileCompressor] Verification result:', verificationResult);

                        if (verificationResult?.isClean) {
                            console.log('[FileCompressor] ✅ All processes verified as terminated');
                            updateFeedback(2, 'All processes stopped', 'Verification completed successfully');
                            toast.success('✅ All processes terminated successfully', {
                                description: 'No password cracking processes are running.'
                            });
                        } else {
                            console.log('[FileCompressor] ⚠️ Some processes still running:', verificationResult?.runningProcesses);
                            const runningCount = verificationResult?.runningProcesses?.length || 0;
                            updateFeedback(2, `${runningCount} processes still running`, `Detected: ${verificationResult?.runningProcesses?.join(', ') || 'Unknown processes'}`);

                            // ✅ Enhanced nuclear option dialog with detailed information
                            if (verificationResult?.runningProcesses?.length > 0) {
                                setCrackStats(prev => ({
                                    ...prev,
                                    current: `Stubborn processes detected: ${verificationResult.runningProcesses.join(', ')}`,
                                    status: 'partial_termination',
                                    cancelDetail: 'Some processes require force termination'
                                }));

                                // Show enhanced nuclear option dialog
                                setTimeout(() => {
                                    const processDetails = verificationResult.processDetails || [];
                                    const processInfo = processDetails.map(p => `${p.name} (PID: ${p.pid})`).join('\n');

                                    const confirmMessage = `⚠️ STUBBORN PROCESSES DETECTED\n\n` +
                                        `The following processes are still running:\n${processInfo || verificationResult.runningProcesses.join(', ')}\n\n` +
                                        `These processes may continue consuming system resources.\n\n` +
                                        `Would you like to force terminate them using system-level commands?\n\n` +
                                        `⚠️ This will forcefully kill all related processes.`;

                                    if (window.confirm(confirmMessage)) {
                                        handleNuclearTermination(verificationResult);
                                        return;
                                    } else {
                                        // User declined nuclear option, show detailed info
                                        updateFeedback(4, 'Cancellation completed with warnings', `${runningCount} processes may still be running`);
                                        toast.warning('⚠️ Cancellation completed with warnings', {
                                            description: `${runningCount} processes may still be running. You can manually terminate them if needed.`
                                        });

                                        setTimeout(() => {
                                            resetToInitialState();
                                        }, 2000);
                                    }
                                }, 1000);
                                return; // Don't proceed with normal cleanup
                            }
                        }
                    } else {
                        console.log('[FileCompressor] ⚠️ Verification API not available');
                        updateFeedback(2, 'Verification unavailable', 'Cannot verify process termination');
                        toast.info('⚠️ Process verification not available', {
                            description: 'Cancellation completed but cannot verify all processes stopped.'
                        });
                    }
                } catch (verifyError) {
                    console.log('[FileCompressor] Verification failed:', verifyError.message);
                    updateFeedback(2, 'Verification failed', 'Could not check process status');
                    toast.warning('⚠️ Could not verify process termination', {
                        description: 'Cancellation may be incomplete.'
                    });
                }

                // Phase 4: Session cleanup with detailed feedback
                updateFeedback(3);

                // ✅ 显式将会话加入黑名单以防止自动重连
                try {
                    if (window.api?.zipCrackBlacklistSession) {
                        console.log('[FileCompressor] Adding session to blacklist to prevent reconnection...');
                        await window.api.zipCrackBlacklistSession(idToStop, 'user_cancel');
                        console.log('[FileCompressor] Session blacklisted successfully');
                        updateFeedback(3, 'Preventing reconnection...', 'Session added to blacklist');
                    }
                } catch (blacklistError) {
                    console.log('[FileCompressor] Blacklist failed (not critical):', blacklistError.message);
                    updateFeedback(3, 'Cleanup warning', 'Could not prevent auto-reconnection');
                }

                // ✅ 然后删除所有相关的 sessions
                try {
                    if (window.api?.zipCrackDeleteSession) {
                        console.log('[FileCompressor] Deleting session to prevent reconnection...');
                        await window.api.zipCrackDeleteSession(idToStop);
                        console.log('[FileCompressor] Session deleted successfully');
                        updateFeedback(3, 'Removing session data...', 'Session files deleted');
                    }
                } catch (deleteError) {
                    console.log('[FileCompressor] Delete session failed (may not exist):', deleteError.message);
                    updateFeedback(3, 'Session cleanup warning', 'Some session data may remain');
                }

                // ✅ 清理所有可能存在的 sessions
                try {
                    if (window.api?.zipCrackListSessions) {
                        const response = await window.api.zipCrackListSessions();
                        const sessions = response?.sessions || [];
                        console.log('[FileCompressor] Found sessions to clean up:', sessions.length);

                        if (sessions.length > 0) {
                            updateFeedback(3, `Cleaning ${sessions.length} sessions...`, 'Removing all related session data');

                            for (const session of sessions) {
                                try {
                                    if (window.api?.zipCrackDeleteSession) {
                                        await window.api.zipCrackDeleteSession(session.id);
                                        console.log('[FileCompressor] Cleaned up session:', session.id);
                                    }
                                } catch (cleanupError) {
                                    console.log('[FileCompressor] Failed to cleanup session:', session.id, cleanupError.message);
                                }
                            }
                        }
                    }
                } catch (listError) {
                    console.log('[FileCompressor] Failed to list sessions for cleanup:', listError.message);
                    updateFeedback(3, 'Session list error', 'Could not enumerate all sessions');
                }

                // Phase 5: Final UI reset with success feedback
                updateFeedback(4, 'Cancellation complete', 'All operations finished successfully');

                // Show comprehensive success notification
                toast.success('✅ Password cracking cancelled successfully', {
                    description: 'All processes stopped, sessions cleaned up, and UI reset.'
                });

                // Small delay to show completion message
                setTimeout(() => {
                    resetToInitialState();
                }, 1000);

            } catch (error) {
                console.error('[FileCompressor] Enhanced cancel operation failed:', error);

                // ✅ Enhanced error feedback
                setCrackStats(prev => ({
                    ...prev,
                    current: 'Cancellation failed',
                    status: 'error',
                    cancelDetail: error.message
                }));

                toast.error('❌ Failed to cancel task', {
                    description: `Error: ${error.message}. UI will be reset but some processes may still be running.`
                });

                // ✅ 即使出错也重置UI状态，让用户可以重新开始
                setTimeout(() => {
                    resetToInitialState();
                }, 2000);
            } finally {
                setStopInProgress(false);
                stopRequestedRef.current = false;
            }
        } else {
            // For compress/extract, just reset the state (the operation will complete in background)
            setProcessing(false);
            setProgress({});
        }
    };

    // ✅ ENHANCED: Nuclear termination handler for stubborn processes (Task 6)
    const handleNuclearTermination = async (verificationResult = null) => {
        console.log('[FileCompressor] 🚨 Nuclear termination requested');

        // Enhanced feedback for nuclear termination
        setCrackStats(prev => ({
            ...prev,
            current: 'Nuclear termination in progress...',
            status: 'nuclear',
            cancelDetail: 'Using system-level force termination',
            progress: 0
        }));

        // Show detailed nuclear termination toast
        toast.warning('🚨 Nuclear termination initiated', {
            description: 'Using system-level commands to force terminate stubborn processes...'
        });

        try {
            // Use the existing force stop API with maximum force
            const idToStop = crackSessionId || crackJobId;

            setCrackStats(prev => ({
                ...prev,
                current: 'Executing nuclear cleanup...',
                cancelDetail: 'Running system-level termination commands',
                progress: 25
            }));

            let nuclearResult = null;
            if (window.api?.zipCrackForceStop) {
                nuclearResult = await window.api.zipCrackForceStop(idToStop);
                console.log('[FileCompressor] Nuclear termination result:', nuclearResult);

                setCrackStats(prev => ({
                    ...prev,
                    current: 'Nuclear cleanup executed',
                    cancelDetail: `${nuclearResult?.summary?.successfulSteps || 0}/${nuclearResult?.summary?.totalSteps || 0} termination methods completed`,
                    progress: 50
                }));
            }

            // Wait a moment for processes to be terminated
            await new Promise(resolve => setTimeout(resolve, 2000));

            setCrackStats(prev => ({
                ...prev,
                current: 'Verifying nuclear termination...',
                cancelDetail: 'Checking if stubborn processes were eliminated',
                progress: 75
            }));

            // Verify again after nuclear termination
            if (window.api?.zipCrackVerifyTermination) {
                const postNuclearVerification = await window.api.zipCrackVerifyTermination();

                if (postNuclearVerification?.isClean) {
                    console.log('[FileCompressor] ✅ Nuclear termination successful - all processes eliminated');

                    setCrackStats(prev => ({
                        ...prev,
                        current: 'Nuclear termination successful',
                        cancelDetail: 'All stubborn processes eliminated',
                        progress: 100
                    }));

                    toast.success('✅ Nuclear termination successful', {
                        description: 'All stubborn processes have been forcefully terminated.'
                    });

                    // Clean up and reset UI
                    setTimeout(() => {
                        resetToInitialState();
                    }, 1500);

                } else {
                    console.log('[FileCompressor] ⚠️ Nuclear termination incomplete:', postNuclearVerification?.runningProcesses);

                    const remainingCount = postNuclearVerification?.runningProcesses?.length || 0;
                    setCrackStats(prev => ({
                        ...prev,
                        current: `${remainingCount} processes survived nuclear termination`,
                        cancelDetail: `Remaining: ${postNuclearVerification?.runningProcesses?.join(', ') || 'Unknown'}`,
                        progress: 90,
                        status: 'nuclear_incomplete'
                    }));

                    toast.error('⚠️ Nuclear termination incomplete', {
                        description: `${remainingCount} processes could not be terminated. Manual intervention may be required.`
                    });

                    // Show final options to user
                    setTimeout(() => {
                        const remainingProcesses = postNuclearVerification?.runningProcesses?.join(', ') || 'Unknown processes';
                        const finalMessage = `⚠️ NUCLEAR TERMINATION INCOMPLETE\n\n` +
                            `The following processes could not be terminated:\n${remainingProcesses}\n\n` +
                            `These processes may require manual termination using Task Manager (Windows) or Activity Monitor (Mac).\n\n` +
                            `The UI will be reset, but these processes may continue running in the background.`;

                        alert(finalMessage);
                        resetToInitialState();
                    }, 2000);
                }
            } else {
                console.log('[FileCompressor] ⚠️ Cannot verify nuclear termination - verification API unavailable');

                setCrackStats(prev => ({
                    ...prev,
                    current: 'Nuclear termination completed (unverified)',
                    cancelDetail: 'Cannot verify results - process verification unavailable',
                    progress: 100
                }));

                toast.warning('⚠️ Nuclear termination completed', {
                    description: 'Cannot verify if all processes were terminated. Check Task Manager if issues persist.'
                });

                setTimeout(() => {
                    resetToInitialState();
                }, 2000);
            }

        } catch (error) {
            console.error('[FileCompressor] Nuclear termination failed:', error);

            setCrackStats(prev => ({
                ...prev,
                current: 'Nuclear termination failed',
                cancelDetail: error.message,
                status: 'nuclear_failed'
            }));

            toast.error('❌ Nuclear termination failed', {
                description: `Error: ${error.message}. Manual process termination may be required.`
            });

            // Show error details and reset UI
            setTimeout(() => {
                const errorMessage = `❌ NUCLEAR TERMINATION FAILED\n\n` +
                    `Error: ${error.message}\n\n` +
                    `You may need to manually terminate password cracking processes using:\n` +
                    `• Windows: Task Manager (Ctrl+Shift+Esc)\n` +
                    `• Mac: Activity Monitor\n\n` +
                    `Look for processes like: 7za, hashcat, python, bkcrack\n\n` +
                    `The UI will be reset now.`;

                alert(errorMessage);
                resetToInitialState();
            }, 1000);
        }
    };

    const handleForceStop = async () => {
        if (crackJobId && !stopRequestedRef.current) {
            stopRequestedRef.current = true;

            try {
                console.log('[FileCompressor] 🚨 Nuclear force stop requested for job:', crackJobId);
                setCrackStats(prev => ({ ...prev, current: 'Nuclear termination in progress...', status: 'force_stopping' }));

                // ✅ Use the new force stop API for complete process termination
                const result = await window.api?.zipCrackForceStop?.(crackJobId);

                if (result?.success) {
                    console.log('[FileCompressor] ✅ Nuclear force stop successful:', result.message);
                    toast.success('✅ All processes forcefully terminated');
                } else {
                    console.error('[FileCompressor] ⚠️ Nuclear force stop completed with issues:', result?.error || result?.message);
                    toast.warning('⚠️ Force termination completed: ' + (result?.error || result?.message || 'Some processes may have been stubborn'));
                }

                // ✅ 使用原子性重置函数，无论成功还是失败都重置
                resetToInitialState();

            } catch (error) {
                console.error('[FileCompressor] Nuclear force stop error:', error);
                toast.error('❌ Nuclear force stop error: ' + error.message);

                // ✅ 即使出错也完全重置UI状态
                resetToInitialState();
            } finally {
                setShowForceStopDialog(false);
                stopRequestedRef.current = false;
            }
        }
    };

    // Keep handleCancel for backward compatibility (calls handleStop)
    const handleCancel = handleStop;

    const handleResume = async (sessionId, sessionFilePath = null) => {
        if (window.api?.zipCrackResume) {
            try {
                // ✅ Use sessionFilePath if provided (from session dialog), otherwise use crackFiles[0]
                const filePath = sessionFilePath || crackFiles[0];
                console.log('[FileCompressor] Resuming session:', sessionId);
                console.log('[FileCompressor] Using file path:', filePath);

                // ✅ Reset pause ref when resuming
                isPausedRef.current = false;

                setProcessing(true);
                setShowSessionDialog(false);
                // Clear paused status
                setCrackStats(prev => ({ ...prev, status: null, current: 'Resuming...' }));

                // ✅ Pass the file path to backend (can be null, backend will use session data)
                const result = await window.api.zipCrackResume(sessionId, filePath);
                if (result?.success) {
                    // ✅ Update both jobId and sessionId
                    setCrackJobId(result.jobId || sessionId);
                    setCrackSessionId(sessionId); // Keep the same sessionId
                    toast.success('▶️ Session resumed successfully');
                } else {
                    setProcessing(false);
                    toast.error('❌ Failed to resume session: ' + (result?.error || 'Unknown error'));
                }
            } catch (error) {
                console.error('[FileCompressor] Failed to resume session:', error);
                setProcessing(false);
                toast.error('❌ Failed to resume session');
            }
        }
    };

    // ✅ Enhanced session restoration function for wake-up scenarios
    const checkAndRestoreSession = async () => {
        console.log('[FileCompressor] 🔍 Starting enhanced session check...');

        // ✅ Pre-condition 1: 检查 API 是否可用
        if (!window.api?.zipCrackListSessions) {
            console.log('[FileCompressor] ❌ zipCrackListSessions API not available');
            return;
        }

        // ✅ Pre-condition 2: 检查是否在 Stop 冷却期内 - 如果是，完全跳过
        const timeSinceStop = Date.now() - lastStopTimeRef.current;
        if (timeSinceStop < STOP_COOLDOWN_MS) {
            console.log(`[FileCompressor] ⏳ In stop cooldown period (${timeSinceStop}ms < ${STOP_COOLDOWN_MS}ms), completely skipping session check`);
            return;
        }

        // ✅ Pre-condition 2.5: 检查是否用户已经手动关闭过对话框
        if (sessionCheckDismissedRef.current) {
            console.log('[FileCompressor] 🚫 Session check dismissed by user, skipping auto-check');
            return;
        }

        // ✅ Pre-condition 3: 检查是否已经在处理中
        if (processing && crackJobId) {
            console.log('[FileCompressor] ⚠️  Already processing, skipping session check');
            return;
        }

        // ✅ Pre-condition 4: 如果用户刚刚点击了 Stop，不要检查 sessions
        if (stopRequestedRef.current) {
            console.log('[FileCompressor] ⚠️  Stop was recently requested, skipping session check');
            return;
        }

        try {
            // ✅ Force re-register IPC listeners first (critical for wake-up scenarios)
            console.log('[FileCompressor] 🔗 Force re-registering IPC listeners before session check...');
            if (window.api?.zipCrackOffListeners) {
                window.api.zipCrackOffListeners();
            }

            // Re-register with a small delay to ensure cleanup
            setTimeout(() => {
                if (window.api?.onZipCrackProgress) {
                    console.log('[FileCompressor] 🔗 Re-registering crack progress listener...');
                    window.api.onZipCrackProgress(({ attempts, speed, current, currentLength, method, progress, eta, tested, total, sessionId }) => {
                        console.log('[FileCompressor] 📊 Progress received after wake-up:', { attempts, speed, current, sessionId });

                        if (sessionId) {
                            setCrackSessionId(sessionId);
                        }

                        // ✅ CRITICAL: Don't update stats if we're in paused state
                        // This prevents progress updates from overriding pause status
                        setCrackStats(prev => {
                            // If we're paused, don't update the stats to avoid overriding pause state
                            if (prev.status === 'paused' || prev.status === 'pausing') {
                                console.log('[FileCompressor] ⚠️ Ignoring wake-up progress update - task is paused/pausing');
                                return prev;
                            }

                            return {
                                ...prev, // Preserve existing status and other fields
                                speed: speed || 0,
                                attempts: attempts || 0,
                                current: current || '',
                                currentLength: currentLength || prev.currentLength,
                                progress: progress || 0,
                                eta: eta || 0,
                                tested: tested || 0,
                                total: total || 0
                            };
                        });
                        if (method) setCrackMethod(method);
                    });
                }
            }, 100);

            // ✅ Check sessions with retry mechanism
            let sessions = null;
            let retryCount = 0;
            const maxRetries = 3;

            while (retryCount < maxRetries && !sessions) {
                try {
                    console.log(`[FileCompressor] 🔍 Checking sessions (attempt ${retryCount + 1}/${maxRetries})...`);
                    const response = await window.api.zipCrackListSessions();
                    console.log('[FileCompressor] Session check response:', response);
                    sessions = response?.sessions || [];
                    console.log('[FileCompressor] Extracted sessions:', sessions);
                    break;
                } catch (error) {
                    console.error(`[FileCompressor] Session check attempt ${retryCount + 1} failed:`, error);

                    // ✅ 如果是"session not found"错误，清除本地状态并停止重试
                    if (error.message?.includes('No session found') ||
                        error.message?.includes('session not found')) {
                        console.log('[FileCompressor] ⚠️  Session not found, clearing local state');
                        resetToInitialState();
                        return;
                    }

                    retryCount++;
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
                    }
                }
            }

            // ✅ 如果重试失败，重置 UI
            if (!sessions) {
                console.log('[FileCompressor] ❌ Failed to get sessions after all retries, resetting UI');
                resetToInitialState();
                return;
            }

            console.log('[FileCompressor] ✅ Found sessions:', sessions);

            // ✅ 如果没有运行中的会话，确保 UI 处于初始状态
            if (sessions.length === 0) {
                console.log('[FileCompressor] ℹ️  No sessions found, ensuring UI is in initial state');
                if (processing || crackJobId || crackSessionId) {
                    resetToInitialState();
                }
                return;
            }

            if (sessions && sessions.length > 0) {
                // Check if any session is currently running
                const runningSessions = sessions.filter(s => s.status === 'running' || s.status === 'active');
                console.log('[FileCompressor] 🏃 Running sessions found:', runningSessions);

                if (runningSessions.length > 0) {
                    // Automatically switch to crack mode and restore running session
                    console.log('[FileCompressor] 🔄 Auto-restoring running session after wake-up');

                    const runningSession = runningSessions[0];
                    console.log('[FileCompressor] 📋 Restoring session details:', {
                        id: runningSession.id,
                        jobId: runningSession.jobId,
                        filePath: runningSession.filePath,
                        testedPasswords: runningSession.testedPasswords,
                        status: runningSession.status
                    });

                    // ✅ Force UI state restoration (atomic updates)
                    setMode('crack');
                    setProcessing(true);
                    setCrackJobId(runningSession.jobId || runningSession.id);
                    setCrackSessionId(runningSession.id);

                    // ✅ Reset pause ref to ensure UI works correctly
                    if (isPausedRef.current) {
                        console.log('[FileCompressor] 🔄 Resetting pause ref for wake-up restoration');
                        isPausedRef.current = false;
                    }

                    setCrackStats(prev => ({
                        ...prev,
                        status: 'running',
                        current: 'Reconnected to running session...',
                        attempts: runningSession.testedPasswords || 0,
                        speed: 0 // Will be updated by progress events
                    }));

                    // Add the file to crack files if not already there
                    if (runningSession.filePath && !crackFiles.includes(runningSession.filePath)) {
                        console.log('[FileCompressor] 📁 Adding file to crack list:', runningSession.filePath);
                        setCrackFiles(prev => [...prev, runningSession.filePath]);
                    }

                    // Show success message
                    toast.success('🔄 Reconnected to running password crack session');

                    // ✅ Force a progress update request to sync current state
                    setTimeout(() => {
                        console.log('[FileCompressor] 🔄 Requesting current progress update...');
                        if (window.api?.zipCrackGetProgress) {
                            window.api.zipCrackGetProgress(runningSession.id).then(progressData => {
                                if (progressData) {
                                    console.log('[FileCompressor] 📊 Current progress data:', progressData);
                                    setCrackStats(prev => ({
                                        ...prev,
                                        ...progressData,
                                        status: 'running'
                                    }));
                                }
                            }).catch(err => {
                                console.log('[FileCompressor] ⚠️  Could not get current progress:', err.message);
                            });
                        }
                    }, 1000);

                } else {
                    // ✅ 检查是否在 Stop 冷却期内 - 如果是，不显示 paused sessions 对话框
                    const timeSinceStop = Date.now() - lastStopTimeRef.current;
                    if (timeSinceStop < STOP_COOLDOWN_MS) {
                        console.log('[FileCompressor] ⏳ In stop cooldown, not showing paused sessions dialog');
                        return;
                    }

                    // Show dialog for paused/pending sessions
                    console.log('[FileCompressor] ⏸️  Found paused sessions, showing dialog');
                    setPendingSessions(sessions);
                    setShowSessionDialog(true);
                    setMode('crack'); // Switch to crack mode to show the dialog properly
                }
            } else {
                console.log('[FileCompressor] ℹ️  No active sessions found');
            }
        } catch (error) {
            console.error('[FileCompressor] ❌ Failed to check sessions:', error);
            // ✅ 出错时重置 UI
            resetToInitialState();
            // Show user-friendly error
            toast.error('⚠️ Failed to reconnect to running sessions');
        }
    };

    const handleDeleteSession = async (sessionId) => {
        if (window.api?.zipCrackDeleteSession) {
            try {
                await window.api.zipCrackDeleteSession(sessionId);
                setPendingSessions(prev => {
                    const newSessions = prev.filter(s => s.id !== sessionId);
                    // ✅ If no more sessions, close the dialog
                    if (newSessions.length === 0) {
                        setShowSessionDialog(false);
                        sessionCheckDismissedRef.current = true; // Also mark as dismissed
                    }
                    return newSessions;
                });
                toast.success('✅ Session deleted');
            } catch (error) {
                console.error('[FileCompressor] Failed to delete session:', error);
                toast.error('❌ Failed to delete session');
            }
        }
    };

    const reset = () => {
        setFiles([]);
        setProgress({});
        setFoundPassword(null);
        setCrackStats({ speed: 0, attempts: 0, progress: 0, currentLength: minLength, current: '', eta: 0, tested: 0, total: 0 });
        setCompletedOutputPath(null);
        setExtractCompletedPath(null);
        setCrackJobId(null); // ✅ Clear jobId
        setCrackSessionId(null); // ✅ Clear sessionId
    };

    // Helper functions for formatting statistics
    const formatSpeed = (speed) => {
        if (speed >= 1000000) return `${(speed / 1000000).toFixed(1)}M pwd/s`;
        if (speed >= 1000) return `${(speed / 1000).toFixed(1)}K pwd/s`;
        return `${speed} pwd/s`;
    };

    const formatTime = (seconds) => {
        // 处理无效输入
        if (seconds === null || seconds === undefined || isNaN(seconds) || !isFinite(seconds)) {
            return 'Calculating...';
        }
        if (seconds === 0 || seconds < 1) return 'Unknown';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    };

    const formatNumber = (num) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    const jobProgress = progress['current-job'];
    const modes = [
        { id: 'compress', label: 'Compress' },
        { id: 'extract', label: 'Extract' },
        { id: 'crack', label: 'Crack' }
    ];

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafbfc] dark:bg-[#0a0e13]">
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
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
                        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/90 rounded-xl">
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
                    <div className="max-w-2xl mx-auto space-y-4">                    {/* ✅ 显示内容区域条件：有文件 OR (在Crack模式且密码已找到) */}
                        {files.length === 0 && !(mode === 'crack' && foundPassword) ? (
                            <>
                                {/* Drop Zone */}
                                <div onClick={handleSelectFiles} onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
                                    className={`rounded-2xl border-2 border-dashed p-16 cursor-pointer transition-all text-center ${dragOver ? 'border-[#2196F3] bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-600 hover:border-[#2196F3]/50'}`}>
                                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-100 dark:bg-slate-700/80 flex items-center justify-center text-[#2196F3]">
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
                                {/* File Card - 只在有文件时显示 */}
                                {files.length > 0 && (
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
                                )}

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

                                {/* Enhanced Progress Display */}
                                {processing && mode !== 'crack' && jobProgress && (
                                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className={`w-10 h-10 rounded-xl bg-[#E3F2FD] dark:bg-blue-900/30 flex items-center justify-center text-[#2196F3] ${jobProgress.status !== 'completed' ? 'animate-pulse' : ''}`}>
                                                {mode === 'compress' ? Icons.compress : Icons.extract}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800 dark:text-white">
                                                    {jobProgress.status === 'completed' ? 'Operation completed' :
                                                        mode === 'compress' ? 'Compressing files...' : 'Extracting files...'}
                                                </p>
                                                <p className="text-xs text-slate-500">{mode === 'compress' ? 'Creating archive' : 'Extracting archive'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-600 dark:text-slate-400">Progress</span>
                                            <span className="text-sm font-medium text-[#2196F3]">{jobProgress.percent || 0}%</span>
                                        </div>
                                        <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                            <div className="h-full rounded-full bg-gradient-to-r from-[#2196F3] to-[#42A5F5] transition-all duration-300"
                                                style={{ width: `${jobProgress.percent || 0}%` }} />
                                        </div>

                                        {jobProgress.status === 'completed' && (
                                            <div className="mt-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                                <p className="text-sm text-green-600 dark:text-green-400 font-medium">✅ Operation completed successfully</p>
                                            </div>
                                        )}

                                        {jobProgress.error && (
                                            <div className="mt-3 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                                <p className="text-sm text-red-600 dark:text-red-400 font-medium">❌ {jobProgress.error}</p>
                                            </div>
                                        )}
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
                                            <button onClick={() => {
                                                console.log('[FileCompressor] Open Folder button clicked');
                                                // Temporarily disabled to debug
                                                // if (completedOutputPath) {
                                                //     console.log('[FileCompressor] Opening folder:', completedOutputPath);
                                                //     window.api.openFolder(completedOutputPath).catch(err => {
                                                //         console.error('[FileCompressor] Failed to open folder:', err);
                                                //     });
                                                // }
                                                toast.success('✅ Open Folder feature temporarily disabled for debugging');
                                            }}
                                                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                                {Icons.folderOpen} Open Folder
                                            </button>
                                            <button onClick={() => {
                                                console.log('[FileCompressor] New button clicked');
                                                reset();
                                            }}
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
                                            <button onClick={() => {
                                                console.log('[FileCompressor] Open Folder button clicked (extract)');
                                                // Temporarily disabled to debug
                                                // if (extractCompletedPath) {
                                                //     console.log('[FileCompressor] Opening folder:', extractCompletedPath);
                                                //     window.api.openFolder(extractCompletedPath).catch(err => {
                                                //         console.error('[FileCompressor] Failed to open folder:', err);
                                                //     });
                                                // }
                                                toast.success('✅ Open Folder feature temporarily disabled for debugging');
                                            }}
                                                className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                                {Icons.folderOpen} Open Folder
                                            </button>
                                            <button onClick={() => {
                                                console.log('[FileCompressor] New button clicked (extract)');
                                                reset();
                                            }}
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
                                            <div className={`w-10 h-10 rounded-xl bg-[#E3F2FD] dark:bg-blue-900/30 flex items-center justify-center text-[#2196F3] ${crackStats.status === 'paused' ? '' : 'animate-pulse'}`}>
                                                {Icons.key}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800 dark:text-white">
                                                    {crackStats.status === 'paused' ? 'Cracking paused' : 'Cracking in progress...'}
                                                </p>
                                                <p className="text-xs text-slate-500">{crackMethod || 'Initializing'}</p>
                                            </div>
                                        </div>

                                        {/* Current Password Display */}
                                        {crackStats.current && (
                                            <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                                                    {crackStats.status === 'paused' ? 'Status' : 'Trying'}
                                                </p>
                                                <p className="font-mono text-lg text-slate-800 dark:text-white truncate">{crackStats.current}</p>
                                            </div>
                                        )}

                                        {/* Enhanced Progress Statistics */}
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-center">
                                                <p className="text-lg font-semibold text-slate-800 dark:text-white">{formatSpeed(crackStats.speed || 0)}</p>
                                                <p className="text-xs text-slate-500">Speed</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-center">
                                                <p className="text-lg font-semibold text-slate-800 dark:text-white">{formatTime(crackStats.eta || 0)}</p>
                                                <p className="text-xs text-slate-500">ETA</p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        {crackStats.progress > 0 && (
                                            <div className="mb-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-slate-500">Progress</span>
                                                    <span className="text-xs font-medium text-[#2196F3]">{crackStats.progress.toFixed(1)}%</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                    <div className="h-full rounded-full bg-gradient-to-r from-[#2196F3] to-[#42A5F5] transition-all duration-300"
                                                        style={{ width: `${Math.min(crackStats.progress, 100)}%` }} />
                                                </div>
                                            </div>
                                        )}

                                        {/* === 科学优化：速度曲线 + 成功概率 === */}
                                        {processing && speedHistory.length > 5 && (
                                            <div className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-slate-500">Speed Trend</span>
                                                    {successProbability !== null && (
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-xs text-slate-500">Success:</span>
                                                            <span className={`text-xs font-bold ${successProbability > 50 ? 'text-emerald-500' :
                                                                successProbability > 20 ? 'text-amber-500' : 'text-red-500'
                                                                }`}>{successProbability}%</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Mini Sparkline Chart */}
                                                <div className="h-10 flex items-end gap-0.5">
                                                    {speedHistory.slice(-30).map((entry, idx) => {
                                                        const maxSpeed = Math.max(...speedHistory.slice(-30).map(e => e.speed));
                                                        const height = maxSpeed > 0 ? (entry.speed / maxSpeed) * 100 : 0;
                                                        return (
                                                            <div
                                                                key={idx}
                                                                className="flex-1 rounded-t bg-gradient-to-t from-[#2196F3] to-[#42A5F5] transition-all duration-200"
                                                                style={{ height: `${Math.max(height, 5)}%` }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-center">
                                                <p className="text-lg font-semibold text-slate-800 dark:text-white">{formatNumber(crackStats.tested || 0)}</p>
                                                <p className="text-xs text-slate-500">Tested</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-center">
                                                <p className="text-lg font-semibold text-slate-800 dark:text-white">{formatNumber(crackStats.total || 0)}</p>
                                                <p className="text-xs text-slate-500">Total</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-center">
                                                <p className="text-lg font-semibold text-slate-800 dark:text-white">{gpuAvailable ? 'GPU' : 'CPU'}</p>
                                                <p className="text-xs text-slate-500">Engine</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Password Found - 只在 Crack 模式显示 */}
                                {mode === 'crack' && foundPassword && (
                                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                                                {Icons.unlock}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Password Found!</p>
                                                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 font-mono">{foundPassword}</p>
                                            </div>
                                            {/* 关闭按钮 */}
                                            <button
                                                onClick={() => setFoundPassword(null)}
                                                className="p-1.5 text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors"
                                                title="Dismiss"
                                            >
                                                {Icons.close}
                                            </button>
                                        </div>
                                        <button onClick={handleCopyPassword}
                                            className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2">
                                            {copied ? (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    {Icons.copy} Copy to Clipboard
                                                </>
                                            )}
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
                                        <div className="flex items-center gap-4">
                                            {!processing && files.length > 0 && (
                                                <button onClick={reset} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                                                    Clear all
                                                </button>
                                            )}

                                            {/* Queue Status Display */}
                                            {mode === 'crack' && fileQueue.length > 0 && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                                                    </svg>
                                                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                                        {fileQueue.length} file{fileQueue.length > 1 ? 's' : ''} queued
                                                    </span>
                                                    {processing && (
                                                        <span className="text-xs text-blue-500 dark:text-blue-400">
                                                            (will process after current task)
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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
                                                <div className="flex items-center gap-2">
                                                    {(() => {
                                                        // ✅ 添加调试日志来诊断按钮显示问题
                                                        const isTaskActive = processing && (crackJobId || crackSessionId);
                                                        const isPaused = crackStats.status === 'paused';
                                                        const isRunning = isTaskActive && !isPaused;
                                                        const showResume = mode === 'crack' && isPaused;
                                                        const showPause = mode === 'crack' && isRunning;

                                                        console.log('[FileCompressor] Button render check:', {
                                                            mode,
                                                            status: crackStats.status,
                                                            processing,
                                                            crackJobId,
                                                            crackSessionId,
                                                            isTaskActive,
                                                            isPaused,
                                                            isRunning,
                                                            showResume,
                                                            showPause
                                                        });
                                                        return null;
                                                    })()}
                                                    {mode === 'crack' && crackStats.status === 'paused' ? (
                                                        // Show Resume button when paused - use sessionId and current file path
                                                        <button onClick={() => handleResume(crackSessionId, crackFiles[0])} className="px-6 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors flex items-center gap-2">
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M8 5v14l11-7z" />
                                                            </svg>
                                                            Resume
                                                        </button>
                                                    ) : mode === 'crack' && processing && (crackJobId || crackSessionId) && crackStats.status !== 'paused' ? (
                                                        // Show Pause button when running (more specific conditions)
                                                        <button onClick={handlePause} className="px-6 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium transition-colors flex items-center gap-2">
                                                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                                                <rect x="6" y="5" width="4" height="14" rx="1" />
                                                                <rect x="14" y="5" width="4" height="14" rx="1" />
                                                            </svg>
                                                            Pause
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        onClick={handleCancel}
                                                        disabled={stopInProgress}
                                                        className={`px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-colors flex items-center gap-2 ${stopInProgress
                                                            ? 'bg-gray-400 cursor-not-allowed'
                                                            : 'bg-red-500 hover:bg-red-600'
                                                            }`}
                                                    >
                                                        {Icons.stop} {stopInProgress ? 'Cancelling...' : 'Cancel'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Session Recovery Dialog - DISABLED per user request */}

            {/* Force Stop Confirmation Dialog */}
            {showForceStopDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Force Stop Task</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">The task is not responding to normal stop</p>
                                </div>
                            </div>

                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                                The password cracking task did not stop within the timeout period.
                                You can force terminate it, but this may cause data loss or leave temporary files.
                            </p>

                            <div className="flex items-center gap-3 justify-end">
                                <button
                                    onClick={() => setShowForceStopDialog(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleForceStop}
                                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <rect x="6" y="6" width="12" height="12" rx="2" />
                                    </svg>
                                    Force Stop
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileCompressor;
