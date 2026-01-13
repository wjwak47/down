import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../components/Toast';

// Helper function to remove garbled Unicode characters from transcription text
const sanitizeTranscription = (text) => {
    if (!text) return text;
    return text
        .replace(/[\u25A0-\u25FF]/g, '') // Geometric shapes (□◇◆○●■等)
        .replace(/[\u2580-\u259F]/g, '') // Block elements
        .replace(/[\uFFFD\uFFFE\uFFFF]/g, '') // Unicode replacement chars (�)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '') // Control chars
        .replace(/[◐◑◒◓◔◕◖◗]/g, '') // Additional circle variants
        .replace(/[\u2600-\u26FF]/g, '') // Miscellaneous symbols
        .replace(/[\u2700-\u27BF]/g, '') // Dingbats
        .replace(/\?{2,}/g, '') // Multiple question marks
        .replace(/\s{2,}/g, ' ') // Multiple spaces to single
        .trim();
};

// Helper function to format text into readable paragraphs for TXT output (article style)
const formatTextForTxt = (text) => {
    if (!text) return text;
    
    // First sanitize the text
    let cleaned = sanitizeTranscription(text);
    if (!cleaned || cleaned.length === 0) return '';
    
    // Split by existing newlines to get individual segments
    const segments = cleaned.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
    
    if (segments.length === 0) return '';
    
    // Merge segments into flowing paragraphs
    const paragraphs = [];
    let currentPara = '';
    
    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        
        // Add segment to current paragraph
        if (currentPara) {
            // Add comma if previous doesn't end with punctuation
            const lastChar = currentPara.slice(-1);
            const needsConnector = !/[，。！？、,.!?]$/.test(lastChar);
            currentPara += (needsConnector ? '，' : '') + seg;
        } else {
            currentPara = seg;
        }
        
        // Check if we should end this paragraph
        const lastChar = currentPara.slice(-1);
        const endsWithSentence = /[。！？.!?]$/.test(lastChar);
        
        // Start new paragraph if:
        // - Current paragraph is long enough (>150 chars) AND ends with sentence punctuation
        // - OR paragraph is very long (>250 chars)
        if ((currentPara.length > 150 && endsWithSentence) || currentPara.length > 250) {
            // If doesn't end with punctuation, add period
            if (!/[。！？.!?]$/.test(currentPara.slice(-1))) {
                currentPara += '。';
            }
            paragraphs.push(currentPara);
            currentPara = '';
        }
    }
    
    // Don't forget the last paragraph
    if (currentPara) {
        // Add period if doesn't end with punctuation
        if (!/[。！？.!?,，]$/.test(currentPara.slice(-1))) {
            currentPara += '。';
        }
        paragraphs.push(currentPara);
    }
    
    // Join paragraphs with double newlines
    return paragraphs.join('\n\n');
};

const AudioTranscriber = () => {
    // Toast hook for notifications
    const toast = useToast();

    // Alert modal state (reserved for future use)
    // const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '', type: 'default' });

    // Initialize groqApiKeys from localStorage directly
    const [groqApiKeys, setGroqApiKeys] = useState(() => {
        try {
            const savedKeys = localStorage.getItem('groq_api_keys');
            if (savedKeys) {
                const keys = JSON.parse(savedKeys);
                if (Array.isArray(keys) && keys.length > 0) {
                    return keys.map(k => {
                        const keyValue = typeof k === 'string' ? k : (k.key || k);
                        return { key: keyValue, status: 'available', cooldownUntil: 0 };
                    }).filter(k => k.key);
                }
            }
        } catch (e) {
            console.error('Failed to load API keys:', e);
        }
        return [];
    });
    const [file, setFile] = useState(null);
    const [newGroqKey, setNewGroqKey] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [transcription, setTranscription] = useState('');
    const [srtContent, setSrtContent] = useState('');
    const [viewMode, setViewMode] = useState('text'); // 'text' or 'srt'
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState({ stage: '', message: '', percent: 0 });
    const [error, setError] = useState('');

    // Custom error setter with tracing
    const setAppError = (msg) => {
        if (msg) {
            console.error('[STACK TRACE] setError called from:');
            console.trace();
        }
        setError(msg);
    };

    // Gemini model configuration (quotas updated Jan 2026)
    // Note: Quotas reset at midnight Pacific Time
    // Sorted by version: newest first (Official Model IDs from Google)
    const GEMINI_MODELS = [
        { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)', tier: 'free', quota: '250 req/day' },
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', tier: 'free', quota: '250 req/day' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'free', quota: '25 req/day' },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: 'free', quota: '500 req/day' },
        { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', tier: 'free', quota: '1500 req/day' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', tier: 'free', quota: '1500 req/day', recommended: true },
        { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', tier: 'free', quota: '1500 req/day' },
    ];

    // Whisper model configuration (Groq - all free)
    const WHISPER_MODELS = [
        { id: 'whisper-large-v3-turbo', name: 'Whisper Large V3 Turbo', speed: '216x', description: 'Fastest, recommended', recommended: true },
        { id: 'whisper-large-v3', name: 'Whisper Large V3', speed: '189x', description: 'Most accurate' },
        { id: 'distil-whisper-large-v3-en', name: 'Distil Whisper V3 (English)', speed: '250x', description: 'English only, fast' },
    ];

    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [transcriptionHistory, setTranscriptionHistory] = useState(() => {
        try {
            const saved = localStorage.getItem('transcription_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });
    const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem('gemini_model') || 'gemini-2.0-flash');
    // Model availability status: { modelId: 'available' | 'unavailable' | 'quota_exceeded' | 'checking' | null }
    const [modelStatus, setModelStatus] = useState({});
    const [isCheckingModels, setIsCheckingModels] = useState(false);
    const [whisperModel, setWhisperModel] = useState(() => localStorage.getItem('whisper_model') || 'whisper-large-v3-turbo');
    const [whisperStatus, setWhisperStatus] = useState({});
    const [isCheckingWhisper, setIsCheckingWhisper] = useState(false);
    const [language, setLanguage] = useState('zh');
    const [showGroqKeys, setShowGroqKeys] = useState(false);
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [gaps, setGaps] = useState([]);
    const [showGapDialog, setShowGapDialog] = useState(false);
    const [savedAudioPath, setSavedAudioPath] = useState('');
    const [audioDuration, setAudioDuration] = useState(0);
    const [manualDuration, setManualDuration] = useState('');
    // Transcription modes: 'standard' (Whisper + text correction), 'dual' (Whisper + Gemini audio verify), 'gemini' (Gemini only)
    const [transcriptionMode, setTranscriptionMode] = useState(() => localStorage.getItem('transcription_mode') || 'standard');
    const [audioPreprocessing, setAudioPreprocessing] = useState(() => localStorage.getItem('audio_preprocessing') === 'true');
    const [keyCountdowns, setKeyCountdowns] = useState({});
    const textareaRef = useRef(null);

    // Debug: Trace error changes
    useEffect(() => {
        if (error) {
            console.log('[DEBUG] Error detected in renderer:', error);
            console.log('[DEBUG] Current keys count:', groqApiKeys.length);
        }
    }, [error]);

    // Cleanup: Remove old manual duration from localStorage on mount
    useEffect(() => {
        localStorage.removeItem('transcribe_manual_duration');
    }, []);

    // Setup listeners
    useEffect(() => {
        const handleKeyStatusUpdate = (data) => {
            const { key, status, cooldownUntil } = data;
            setGroqApiKeys(prev => prev.map(k => {
                const maskedKey = k.key.slice(0, 8) + '...';
                if (maskedKey === key) {
                    return { ...k, status, cooldownUntil: cooldownUntil || 0 };
                }
                return k;
            }));

            if (status === 'cooling' && cooldownUntil) {
                setKeyCountdowns(prev => ({ ...prev, [key]: cooldownUntil }));
            } else if (status === 'available') {
                setKeyCountdowns(prev => {
                    const updated = { ...prev };
                    delete updated[key];
                    return updated;
                });
            }
        };

        window.api.onGroqKeyStatusUpdate(handleKeyStatusUpdate);

        return () => {
            window.api.groqOffListeners();
        };
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setKeyCountdowns(prev => {
                const now = Date.now();
                const updated = { ...prev };
                let changed = false;

                Object.keys(updated).forEach(key => {
                    if (now >= updated[key]) {
                        delete updated[key];
                        changed = true;
                    }
                });

                return changed ? updated : prev;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (groqApiKeys.length > 0) {
            const keys = groqApiKeys.map(k => k.key);
            window.api.groqUpdateKeys(keys);
        }
    }, [groqApiKeys]);

    useEffect(() => {
        const savedGroqKeys = localStorage.getItem('groq_api_keys');
        const savedGeminiKey = localStorage.getItem('gemini_api_key');
        const savedLanguage = localStorage.getItem('transcribe_language');
        const savedManualDuration = localStorage.getItem('transcribe_manual_duration');

        if (savedGroqKeys) {
            console.log('[AudioTranscriber] Loading saved keys:', savedGroqKeys);
            try {
                const keys = JSON.parse(savedGroqKeys);
                console.log('[AudioTranscriber] Parsed keys:', keys);
                if (Array.isArray(keys) && keys.length > 0) {
                    // Support both formats: [{key: 'xxx'}] and ['xxx']
                    const parsedKeys = keys.map(k => {
                        const keyValue = typeof k === 'string' ? k : (k.key || k);
                        return { key: keyValue, status: 'available', cooldownUntil: 0 };
                    }).filter(k => k.key);
                    console.log('[AudioTranscriber] Setting groqApiKeys:', parsedKeys.length, 'keys');
                    setGroqApiKeys(parsedKeys);
                    // Sync to main process immediately
                    if (parsedKeys.length > 0) {
                        window.api.groqUpdateKeys(parsedKeys.map(k => k.key));
                    }
                }
            } catch (e) {
                console.error('[AudioTranscriber] Failed to parse saved keys:', e);
            }
        } else {
            console.log('[AudioTranscriber] No saved keys found in localStorage');
        }
        if (savedGeminiKey) setGeminiApiKey(savedGeminiKey);
        if (savedLanguage) setLanguage(savedLanguage);
        if (savedManualDuration) setManualDuration(savedManualDuration);

        window.api.onTranscribeExtractProgress((data) => {
            setProgress({ stage: 'extracting', message: 'Extracting audio...', percent: data.percent });
        });
        window.api.onGroqProgress((data) => {
            setProgress(prev => ({
                stage: data.stage,
                message: data.message,
                percent: data.percent !== undefined ? data.percent : prev.percent
            }));
        });

        return () => {
            window.api.transcribeOffListeners();
            window.api.groqOffListeners();
        };
    }, []);

    // Check all models availability
    const checkAllModels = async (apiKey) => {
        if (!apiKey || apiKey.trim() === '') return;

        setIsCheckingModels(true);
        console.log('[Model Check] Starting availability check for all models...');

        // Set all models to 'checking' status
        const initialStatus = {};
        GEMINI_MODELS.forEach(m => { initialStatus[m.id] = 'checking'; });
        setModelStatus(initialStatus);

        // Check each model in parallel
        const results = await Promise.all(
            GEMINI_MODELS.map(async (model) => {
                try {
                    const response = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKey}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contents: [{ parts: [{ text: 'test' }] }] })
                        }
                    );

                    if (response.ok) {
                        return { id: model.id, status: 'available' };
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        const errorMsg = errorData?.error?.message || '';

                        if (errorMsg.includes('quota') || errorMsg.includes('limit') || errorMsg.includes('exceeded')) {
                            return { id: model.id, status: 'quota_exceeded' };
                        } else {
                            return { id: model.id, status: 'unavailable' };
                        }
                    }
                } catch (err) {
                    console.error(`[Model Check] ${model.id} error:`, err.message);
                    return { id: model.id, status: 'unavailable' };
                }
            })
        );

        // Update status
        const newStatus = {};
        results.forEach(r => { newStatus[r.id] = r.status; });
        setModelStatus(newStatus);
        setIsCheckingModels(false);

        // Auto-select best available model if current is unavailable
        const currentStatus = newStatus[geminiModel];
        if (currentStatus !== 'available') {
            // Priority 1: Find recommended model that is available
            const recommendedAvailable = GEMINI_MODELS.find(m => m.recommended && newStatus[m.id] === 'available');
            // Priority 2: Fall back to first available model in list
            const firstAvailable = recommendedAvailable || GEMINI_MODELS.find(m => newStatus[m.id] === 'available');

            if (firstAvailable) {
                setGeminiModel(firstAvailable.id);
                localStorage.setItem('gemini_model', firstAvailable.id);
                toast.info(`⭐ Auto-selected: ${firstAvailable.name}`);
            } else {
                toast.warning('⚠️ No Gemini models available. Transcription will use Whisper only.');
            }
        }

        console.log('[Model Check] Complete:', newStatus);
    };

    // Check Whisper models availability
    const checkWhisperModels = async () => {
        if (groqApiKeys.length === 0) {
            toast.error('Add Groq API keys first');
            return;
        }

        setIsCheckingWhisper(true);
        console.log('[Whisper Check] Starting availability check...');

        // Set all models to 'checking' status
        const initialStatus = {};
        WHISPER_MODELS.forEach(m => { initialStatus[m.id] = 'checking'; });
        setWhisperStatus(initialStatus);

        // Use first available Groq key for testing
        const testKey = groqApiKeys[0].key;

        // Check each model
        const results = await Promise.all(
            WHISPER_MODELS.map(async (model) => {
                try {
                    const response = await fetch('https://api.groq.com/openai/v1/models', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${testKey}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const modelExists = data.data?.some(m => m.id === model.id);
                        return { id: model.id, status: modelExists ? 'available' : 'unavailable' };
                    } else {
                        return { id: model.id, status: 'unavailable' };
                    }
                } catch (err) {
                    console.error(`[Whisper Check] ${model.id} error:`, err.message);
                    return { id: model.id, status: 'unavailable' };
                }
            })
        );

        // Update status
        const newStatus = {};
        results.forEach(r => { newStatus[r.id] = r.status; });
        setWhisperStatus(newStatus);
        setIsCheckingWhisper(false);

        // Count available models
        const availableCount = results.filter(r => r.status === 'available').length;
        toast.success(`${availableCount}/${WHISPER_MODELS.length} Whisper models available`);

        console.log('[Whisper Check] Complete:', newStatus);
    };

    const handleFileSelect = async () => {
        const selectedFiles = await window.api.selectVideoFiles();
        if (selectedFiles && selectedFiles.length > 0) {
            setFile(selectedFiles[0]);
        }
    };

    const handleTranscribe = async () => {
        if (!file || groqApiKeys.length === 0) return;

        // Clear previous results before starting new transcription
        setTranscription('');
        setSrtContent('');
        setGaps([]);

        setStatus('transcribing');
        setError('');

        try {
            console.log('[Renderer] Starting transcription, keys count:', groqApiKeys.length);
            const result = await window.api.groqTranscribe({
                audioPath: file,
                apiKeys: groqApiKeys.map(k => k.key),
                geminiApiKey,
                geminiModel,
                options: { language, manualDuration, whisperModel, transcriptionMode, audioPreprocessing }
            });

            if (result.success) {
                // Apply sanitization to remove any garbled characters
                const cleanTranscription = sanitizeTranscription(result.transcription);
                // Format for display with proper paragraphs
                const formattedDisplay = formatTextForTxt(result.transcription);
                const cleanSrt = result.srt ? result.srt.replace(/[\u25A0-\u25FF\u2580-\u259F\uFFFD-\uFFFF◐◑◒◓◔◕◖◗]/g, '') : '';
                
                setTranscription(formattedDisplay);
                setSrtContent(cleanSrt);
                setGaps(result.gaps || []);
                setSavedAudioPath(result.audioPath);
                setAudioDuration(result.duration);
                setStatus('complete');
                setError(''); // Use original setError to clear
                setManualDuration(''); // Clear for next file

                // Auto-save SRT and TXT to video directory
                let outputDir = null;
                try {
                    // Format TXT with proper paragraphs for better readability
                    const formattedTxt = formatTextForTxt(result.plainText || result.transcription);
                    
                    const saveResult = await window.api.saveTranscription({
                        videoPath: file,
                        srt: cleanSrt,
                        txt: formattedTxt
                    });
                    if (saveResult.success) {
                        outputDir = saveResult.outputDir;
                        toast.success(`✅ Saved to video directory`);
                        console.log('[Auto-save] Saved to:', outputDir);
                    } else {
                        console.error('[Auto-save] Failed:', saveResult.error);
                    }
                } catch (err) {
                    console.error('[Auto-save] Error:', err);
                }

                // Save to history with output directory
                const historyItem = {
                    id: Date.now(),
                    fileName: file.split(/[\\/]/).pop(),
                    filePath: file,
                    outputDir: outputDir, // Store the output directory
                    transcription: result.transcription,
                    srt: result.srt,
                    duration: result.duration || 0,
                    date: new Date().toISOString(),
                    language
                };
                const newHistory = [historyItem, ...transcriptionHistory].slice(0, 20); // Keep max 20
                setTranscriptionHistory(newHistory);
                localStorage.setItem('transcription_history', JSON.stringify(newHistory));

                if (result.gaps && result.gaps.length > 0) {
                    setShowGapDialog(true);
                }
            } else {
                setStatus('error');
                setAppError(result.error || 'Transcription failed');
            }
        } catch (err) {
            setStatus('error');
            setAppError(err.message || 'Transcription failed');
        }
    };


    const handleAddKey = async () => {
        const key = newGroqKey.trim();
        if (!key) return;

        // Validate the key first
        try {
            const response = await fetch('https://api.groq.com/openai/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const newKeyObj = { key: key, status: 'available', cooldownUntil: 0 };
                const updatedKeys = [...groqApiKeys, newKeyObj];
                setGroqApiKeys(updatedKeys);
                localStorage.setItem('groq_api_keys', JSON.stringify(updatedKeys.map(k => ({ key: k.key }))));
                setNewGroqKey('');
                toast.success('✅ Groq key added successfully');
            } else {
                toast.error('Please enter a valid Groq API Key');
            }
        } catch (err) {
            toast.error('Please enter a valid Groq API Key');
        }
    };

    const handleRemoveKey = (index) => {
        const updatedKeys = groqApiKeys.filter((_, i) => i !== index);
        setGroqApiKeys(updatedKeys);
        localStorage.setItem('groq_api_keys', JSON.stringify(updatedKeys.map(k => ({ key: k.key }))));
    };

    // handleSaveGeminiKey removed - save logic now inline in Save Settings button

    const handleCopyTranscription = async () => {
        // Use Electron clipboard API via IPC
        if (window.api?.copyToClipboard) {
            try {
                const result = await window.api.copyToClipboard(transcription);
                if (result?.success) {
                    toast.success('Copied to clipboard');
                } else {
                    toast.error('Failed to copy');
                }
            } catch (err) {
                toast.error('Failed to copy');
            }
        } else {
            // Fallback to navigator.clipboard
            navigator.clipboard.writeText(transcription).then(() => {
                toast.success('Copied to clipboard');
            }).catch(() => {
                toast.error('Failed to copy');
            });
        }
    };

    const handleDownloadSRT = () => {
        if (srtContent) {
            const blob = new Blob([srtContent], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${file?.split(/[\\/]/).pop().replace(/\.[^/.]+$/, '')}_subtitles.srt`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f8fafc] dark:bg-background-dark">
            {/* Header */}
            <div className="px-5 py-4 flex justify-between items-center bg-white dark:bg-[#1a2633] border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl font-semibold tracking-tight text-[#111418] dark:text-white">
                        AI Audio Transcriber
                    </h1>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-medium rounded-full uppercase tracking-wide">Powered by Whisper</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowHistory(true)} className="flex items-center gap-1.5 h-8 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-white text-sm font-medium rounded-lg transition-all whitespace-nowrap">
                        <span className="material-symbols-outlined text-[16px]">history</span>
                        History
                        {transcriptionHistory.length > 0 && (
                            <span className="ml-0.5 px-1.5 py-0.5 bg-primary text-white text-[10px] font-medium rounded-full">{transcriptionHistory.length}</span>
                        )}
                    </button>
                    <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 h-8 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-white text-sm font-medium rounded-lg transition-all whitespace-nowrap">
                        <span className="material-symbols-outlined text-[16px]">settings</span>
                        Settings
                    </button>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="flex-1 flex overflow-hidden p-4 gap-4 min-h-0">
                {/* Left Column - File Upload & Controls */}
                <div className="panel-left flex flex-col gap-3">
                    {/* File Upload Area */}
                    <div
                        onClick={handleFileSelect}
                        className="flex-1 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-[#1a2633] hover:border-primary hover:bg-primary/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 min-h-[200px]"
                    >
                        {file ? (
                            <div className="text-center px-6">
                                <div className="size-14 mx-auto mb-3 bg-primary/10 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-[28px]">movie</span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1 truncate max-w-[280px]" title={file}>{file.split(/[\\/]/).pop()}</p>
                                <p className="text-xs text-slate-400">Click to change file</p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                    className="mt-3 px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-lg"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div className="text-center px-6">
                                <div className="size-14 mx-auto mb-3 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-400 text-[28px]">upload_file</span>
                                </div>
                                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">Drop file here</p>
                                <p className="text-xs text-slate-400 mb-3">or click to browse</p>
                                <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-medium rounded">MP3</span>
                                    <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-[10px] font-medium rounded">MP4</span>
                                    <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-medium rounded">WAV</span>
                                    <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-medium rounded">M4A</span>
                                    <span className="px-2 py-0.5 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-[10px] font-medium rounded">FLAC</span>
                                </div>
                                <p className="text-[10px] text-slate-400">Upload audio/video to generate subtitles</p>
                            </div>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {status === 'transcribing' && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-medium text-blue-800 dark:text-blue-300">{progress.message || 'Processing...'}</span>
                                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{progress.percent}%</span>
                            </div>
                            <div className="h-1.5 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress.percent}%` }}></div>
                            </div>
                        </div>
                    )}

                    {/* Start Button */}
                    <button
                        onClick={handleTranscribe}
                        disabled={!file || groqApiKeys.length === 0 || status === 'transcribing'}
                        className="h-10 bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 text-white text-sm font-medium rounded-xl shadow-md shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <span className={`material-symbols-outlined text-[18px] ${status === 'transcribing' ? 'animate-spin' : ''}`}>{status === 'transcribing' ? 'progress_activity' : 'auto_awesome'}</span>
                        {status === 'transcribing' ? 'Transcribing...' : 'Start Transcription'}
                    </button>

                    {/* Cancel Button - show during transcription */}
                    {status === 'transcribing' && (
                        <button
                            onClick={() => {
                                window.api.cancelTranscription?.();
                                setStatus('idle');
                                setProgress({ stage: '', message: '', percent: 0 });
                                toast.info('Transcription cancelled');
                            }}
                            className="h-8 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5"
                        >
                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                            Cancel
                        </button>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 relative group">
                            <div className="font-medium mb-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">error</span>
                                Error
                            </div>
                            {error}
                            <button
                                onClick={() => setError('')}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-[10px] font-medium transition-opacity"
                            >
                                CLEAR
                            </button>
                        </div>
                    )}

                    {/* Features */}
                    <div className="bg-white dark:bg-[#1a2633] rounded-xl p-3 border border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                            Whisper Features
                        </h4>
                        <ul className="text-xs xl:text-sm text-slate-500 dark:text-slate-400 space-y-1.5 xl:space-y-2">
                            <li className="flex items-center gap-2">
                                <span className="size-1.5 bg-primary rounded-full"></span>
                                Precise word-level timestamps
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="size-1.5 bg-primary rounded-full"></span>
                                Complete transcription
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="size-1.5 bg-primary rounded-full"></span>
                                Multi-language support
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Right Column - Transcription Result */}
                <div className="flex-1 flex flex-col bg-white dark:bg-[#1a2633] rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden min-h-0">
                    {/* Header with title and action buttons - 不换行，左右间距至少4 */}
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0 gap-4 min-w-0">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <h3 className="text-sm font-medium text-slate-900 dark:text-white whitespace-nowrap">Transcription Result</h3>
                            {/* View Mode Toggle */}
                            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                                <button
                                    onClick={() => setViewMode('text')}
                                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${viewMode === 'text' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    Text
                                </button>
                                <button
                                    onClick={() => setViewMode('srt')}
                                    className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${viewMode === 'srt' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    SRT
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                            <button
                                onClick={async () => {
                                    const contentToCopy = viewMode === 'srt' ? srtContent : transcription;
                                    if (window.api?.copyToClipboard) {
                                        try {
                                            const result = await window.api.copyToClipboard(contentToCopy);
                                            if (result?.success) {
                                                toast.success(`Copied ${viewMode === 'srt' ? 'SRT' : 'text'} to clipboard`);
                                            } else {
                                                toast.error('Failed to copy');
                                            }
                                        } catch (err) {
                                            toast.error('Failed to copy');
                                        }
                                    }
                                }}
                                disabled={viewMode === 'srt' ? !srtContent : !transcription}
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                Copy
                            </button>
                            <button
                                onClick={handleDownloadSRT}
                                disabled={!srtContent}
                                className="px-2 py-1 bg-primary hover:bg-primary/90 text-white rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-[14px]">save_as</span>
                                Save SRT
                            </button>
                            <button
                                onClick={() => {
                                    if (transcription) {
                                        const blob = new Blob([transcription], { type: 'text/plain' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `${file?.split(/[\\/]/).pop().replace(/\.[^/.]+$/, '')}_transcription.txt`;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                    }
                                }}
                                disabled={!transcription}
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                                <span className="material-symbols-outlined text-[14px]">save_as</span>
                                Save TXT
                            </button>
                        </div>
                    </div>
                    {/* Content area - Text or SRT view */}
                    <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-0">
                        {viewMode === 'text' ? (
                            // Text View
                            transcription ? (
                                <textarea
                                    ref={textareaRef}
                                    value={transcription}
                                    onChange={(e) => setTranscription(e.target.value)}
                                    className="flex-1 w-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 resize-none focus:outline-none rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm overflow-y-auto custom-scrollbar text-editor-area"
                                    placeholder="Transcription will appear here..."
                                />
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm xl:text-base bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                    <div className="text-center">
                                        <span className="material-symbols-outlined text-[48px] xl:text-[56px] 2xl:text-[64px] mb-2 opacity-50">subtitles</span>
                                        <p>Transcription will appear here...</p>
                                    </div>
                                </div>
                            )
                        ) : (
                            // SRT View - Full width for better readability - 响应式字体
                            srtContent ? (
                                <textarea
                                    value={srtContent}
                                    onChange={(e) => setSrtContent(e.target.value)}
                                    className="flex-1 w-full bg-slate-900 text-green-400 resize-none focus:outline-none rounded-xl p-4 xl:p-5 2xl:p-6 border border-slate-700 shadow-sm overflow-y-auto custom-scrollbar srt-editor-area"
                                    placeholder="SRT content will appear here..."
                                />
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm xl:text-base bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                                    <div className="text-center">
                                        <span className="material-symbols-outlined text-[48px] xl:text-[56px] 2xl:text-[64px] mb-2 opacity-50">closed_caption</span>
                                        <p>SRT subtitles will appear here...</p>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Settings Sidebar - 固定定位覆盖层 */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* 背景遮罩 */}
                    <div className="absolute inset-0 bg-black/20" onClick={() => setShowSettings(false)}></div>
                    {/* 侧边栏 */}
                    <aside className="relative w-96 max-w-[90vw] h-full flex flex-col bg-white dark:bg-[#1a2633] shadow-2xl animate-slide-in">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <h2 className="text-[14px] font-bold tracking-tight uppercase text-slate-900 dark:text-white">API Configuration</h2>
                            <button onClick={() => setShowSettings(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            {/* Groq Keys */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Groq API Key Pool</label>
                                        <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Get free key →</a>
                                        <span className="text-xs text-slate-400">({groqApiKeys.length} keys)</span>
                                    </div>
                                    <button onClick={() => setShowGroqKeys(!showGroqKeys)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title={showGroqKeys ? 'Hide keys' : 'Show keys'}>
                                        <span className="material-symbols-outlined text-[16px] text-slate-500">{showGroqKeys ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type={showGroqKeys ? 'text' : 'password'}
                                        value={newGroqKey}
                                        onChange={(e) => setNewGroqKey(e.target.value)}
                                        placeholder="Paste new Groq API key here..."
                                    className="flex-1 h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
                                />
                                <button onClick={handleAddKey} className="px-4 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">add</span>
                                    Add
                                </button>
                            </div>
                            <div className="space-y-2">
                                {groqApiKeys.map((keyObj, index) => {
                                    const maskedKey = keyObj.key.slice(0, 8) + '...';
                                    const cooldownUntil = keyCountdowns[maskedKey];
                                    const remainingSec = cooldownUntil ? Math.ceil((cooldownUntil - Date.now()) / 1000) : 0;
                                    const isCooling = remainingSec > 0;

                                    return (
                                        <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                            <div className={`size-2 rounded-full ${isCooling ? 'bg-orange-500 animate-pulse' : 'bg-green-500'}`}></div>
                                            <span className="flex-1 text-xs font-mono text-slate-600 dark:text-slate-400 truncate">
                                                {showGroqKeys ? keyObj.key : keyObj.key.slice(0, 8) + '...'}
                                            </span>
                                            {isCooling && (
                                                <span className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded">
                                                    ⏳ {remainingSec}s
                                                </span>
                                            )}
                                            {!isCooling && (
                                                <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold">
                                                    ✓ Ready
                                                </span>
                                            )}
                                            <button onClick={() => handleRemoveKey(index)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                                                <span className="material-symbols-outlined text-[14px] text-slate-400">delete</span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Test API Button */}
                            {groqApiKeys.length > 0 && (
                                <button
                                    onClick={async () => {
                                        const testKey = groqApiKeys[0]?.key;
                                        if (!testKey) return;
                                        try {
                                            const response = await fetch('https://api.groq.com/openai/v1/models', {
                                                method: 'GET',
                                                headers: {
                                                    'Authorization': `Bearer ${testKey}`,
                                                    'Content-Type': 'application/json'
                                                }
                                            });
                                            if (response.ok) {
                                                toast.success('✅ API Connection Successful! Status: ' + response.status);
                                            } else {
                                                toast.error('❌ API Error: ' + response.status);
                                            }
                                        } catch (err) {
                                            toast.error('❌ Connection Failed: ' + err.message);
                                        }
                                    }}
                                    className="mt-3 w-full h-8 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px]">science</span>
                                    Test API Connection
                                </button>
                            )}
                        </div>

                        {/* Whisper Model Selection - placed near Groq for logical grouping */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    Whisper Model (Speech Recognition)
                                </label>
                                <button
                                    onClick={checkWhisperModels}
                                    disabled={isCheckingWhisper || groqApiKeys.length === 0}
                                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 disabled:opacity-50"
                                >
                                    <span className={`material-symbols-outlined text-[14px] ${isCheckingWhisper ? 'animate-spin' : ''}`}>
                                        {isCheckingWhisper ? 'progress_activity' : 'refresh'}
                                    </span>
                                    Check All
                                </button>
                            </div>
                            <select
                                value={whisperModel}
                                onChange={(e) => {
                                    setWhisperModel(e.target.value);
                                    localStorage.setItem('whisper_model', e.target.value);
                                }}
                                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                            >
                                {WHISPER_MODELS.map(model => {
                                    const status = whisperStatus[model.id];
                                    const statusIcon = status === 'available' ? '✅' :
                                        status === 'unavailable' ? '❌' :
                                            status === 'checking' ? '⏳' : '🔹';
                                    return (
                                        <option key={model.id} value={model.id}>
                                            {statusIcon} {model.recommended ? '⭐ ' : ''}{model.name} ({model.speed}) - {model.description}
                                        </option>
                                    );
                                })}
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1">
                                {whisperStatus[whisperModel] === 'available' && '✅ Model available'}
                                {whisperStatus[whisperModel] === 'unavailable' && '❌ Model unavailable'}
                                {whisperStatus[whisperModel] === 'checking' && '⏳ Checking...'}
                                {!whisperStatus[whisperModel] && 'All Whisper models are free. Turbo is fastest, V3 may be more accurate.'}
                            </p>
                        </div>

                        {/* Gemini Key - Auto Error Correction */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Gemini API Key</label>
                                <span className="text-xs text-slate-500">(Auto Error Correction)</span>
                                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Get free key →</a>
                            </div>
                            <div className="relative">
                                <input
                                    type={showGeminiKey ? 'text' : 'password'}
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    onBlur={async (e) => {
                                        const key = e.target.value.trim();
                                        if (!key) {
                                            localStorage.removeItem('gemini_api_key');
                                            return;
                                        }
                                        if (key === localStorage.getItem('gemini_api_key')) return;

                                        try {
                                            console.log('[Gemini] Testing API key with model:', geminiModel);
                                            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${key}`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ contents: [{ parts: [{ text: 'test' }] }] })
                                            });
                                            console.log('[Gemini] Response status:', response.status);
                                            if (response.ok) {
                                                toast.success('✅ Gemini key valid, AI correction enabled');
                                                localStorage.setItem('gemini_api_key', key);
                                            } else {
                                                const errorData = await response.json().catch(() => ({}));
                                                console.log('[Gemini] Error response:', errorData);
                                                toast.error(`Gemini validation failed: ${errorData?.error?.message || response.status}`);
                                                setGeminiApiKey('');
                                                localStorage.removeItem('gemini_api_key');
                                            }
                                        } catch (err) {
                                            console.log('[Gemini] Network error:', err.message);
                                            toast.error(`Network error: ${err.message}`);
                                            setGeminiApiKey('');
                                            localStorage.removeItem('gemini_api_key');
                                        }
                                    }}
                                    placeholder="Leave empty to skip AI correction"
                                    className="w-full h-9 px-3 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                                >
                                    <span className="material-symbols-outlined text-[16px] text-slate-400">{showGeminiKey ? 'visibility_off' : 'visibility'}</span>
                                </button>
                            </div>
                            {/* Gemini Test Button */}
                            {geminiApiKey && (
                                <button
                                    onClick={async () => {
                                        try {
                                            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ contents: [{ parts: [{ text: 'hi' }] }] })
                                            });
                                            if (response.ok) {
                                                toast.success(`✅ Connected to ${geminiModel}`);
                                                localStorage.setItem('gemini_api_key', geminiApiKey);
                                            } else {
                                                const errorData = await response.json().catch(() => ({}));
                                                const errorMsg = errorData?.error?.message || response.status;
                                                if (errorMsg.includes('quota') || errorMsg.includes('limit')) {
                                                    toast.error('⚠️ Daily quota exceeded, try again tomorrow');
                                                } else if (errorMsg.includes('not found') || errorMsg.includes('not supported')) {
                                                    toast.error('⚠️ Model requires Pro plan or is unavailable');
                                                } else {
                                                    toast.error(`Validation failed: ${errorMsg}`);
                                                }
                                            }
                                        } catch (err) {
                                            toast.error(`Network error: ${err.message}`);
                                        }
                                    }}
                                    className="mt-2 w-full h-8 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-[14px]">psychology</span>
                                    Test Gemini Connection
                                </button>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1">Leave empty to skip auto-correction</p>
                        </div>

                        {/* Gemini Model Selection */}
                        {geminiApiKey && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                        Gemini Model
                                    </label>
                                    <button
                                        onClick={() => checkAllModels(geminiApiKey)}
                                        disabled={isCheckingModels}
                                        className="text-[10px] text-primary hover:underline disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {isCheckingModels ? (
                                            <>
                                                <span className="material-symbols-outlined text-[12px] animate-spin">progress_activity</span>
                                                Checking...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[12px]">refresh</span>
                                                Check All
                                            </>
                                        )}
                                    </button>
                                </div>
                                <select
                                    value={geminiModel}
                                    onChange={(e) => {
                                        setGeminiModel(e.target.value);
                                        localStorage.setItem('gemini_model', e.target.value);
                                    }}
                                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                                >
                                    {GEMINI_MODELS.map(model => {
                                        const status = modelStatus[model.id];
                                        const statusIcon = status === 'available' ? '✅' :
                                            status === 'quota_exceeded' ? '⛔' :
                                                status === 'unavailable' ? '❌' :
                                                    status === 'checking' ? '⏳' : '🔹';
                                        return (
                                            <option key={model.id} value={model.id}>
                                                {statusIcon} {model.name} ({model.quota})
                                                {model.recommended ? ' ⭐' : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    {modelStatus[geminiModel] === 'available' && '✅ Model available'}
                                    {modelStatus[geminiModel] === 'quota_exceeded' && '❌ Daily quota exceeded, try another model'}
                                    {modelStatus[geminiModel] === 'unavailable' && '❌ Model unavailable, try another'}
                                    {modelStatus[geminiModel] === 'checking' && '⏳ Checking availability...'}
                                    {!modelStatus[geminiModel] && 'Click "Check All" to verify model availability'}
                                </p>
                            </div>
                        )}

                        {/* Language */}
                        <div>
                            <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block mb-2">Language</label>
                            <select value={language} onChange={(e) => { setLanguage(e.target.value); localStorage.setItem('transcribe_language', e.target.value); }} className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white">
                                <option value="zh">中文 (Chinese)</option>
                                <option value="en">English</option>
                                <option value="ja">日本語 (Japanese)</option>
                                <option value="ko">한국어 (Korean)</option>
                                <option value="es">Español (Spanish)</option>
                                <option value="fr">Français (French)</option>
                                <option value="de">Deutsch (German)</option>
                                <option value="">Auto Detect</option>
                            </select>
                        </div>

                        {/* Manual Duration */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Manual Duration</label>
                                <span className="text-xs text-slate-500">(Optional)</span>
                            </div>
                            <input
                                type="text"
                                value={manualDuration}
                                onChange={(e) => setManualDuration(e.target.value)}
                                placeholder="Example: 02:01:25"
                                autoComplete="off"
                                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white font-mono"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Format: HH:MM:SS or MM:SS. Leave empty for auto-detect</p>
                        </div>

                        {/* Transcription Mode Selector */}
                        <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-lg">🎙️</span>
                                <label className="text-sm font-bold text-violet-900 dark:text-violet-100">
                                    Transcription Mode
                                </label>
                            </div>
                            <div className="space-y-2">
                                {/* Standard Mode */}
                                <label
                                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${transcriptionMode === 'standard'
                                        ? 'bg-violet-100 dark:bg-violet-800/30 border-2 border-violet-400'
                                        : 'bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-violet-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="transcriptionMode"
                                        value="standard"
                                        checked={transcriptionMode === 'standard'}
                                        onChange={(e) => {
                                            setTranscriptionMode(e.target.value);
                                            localStorage.setItem('transcription_mode', e.target.value);
                                        }}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-semibold text-sm text-slate-900 dark:text-white">
                                            Standard Mode
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            Whisper + text correction. Fast, timestamps accurate.
                                        </div>
                                    </div>
                                </label>

                                {/* Dual Verification Mode */}
                                <label
                                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${transcriptionMode === 'dual'
                                        ? 'bg-violet-100 dark:bg-violet-800/30 border-2 border-violet-400'
                                        : 'bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-violet-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="transcriptionMode"
                                        value="dual"
                                        checked={transcriptionMode === 'dual'}
                                        onChange={(e) => {
                                            setTranscriptionMode(e.target.value);
                                            localStorage.setItem('transcription_mode', e.target.value);
                                        }}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                            Dual Verification
                                            <span className="text-xs px-1.5 py-0.5 bg-amber-200 dark:bg-amber-700 text-amber-700 dark:text-amber-200 rounded">Recommended</span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            Whisper timestamps + Gemini accurate text. No garbled text.
                                        </div>
                                    </div>
                                </label>

                                {/* Gemini Direct Mode */}
                                <label
                                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${transcriptionMode === 'gemini'
                                        ? 'bg-violet-100 dark:bg-violet-800/30 border-2 border-violet-400'
                                        : 'bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-violet-300'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="transcriptionMode"
                                        value="gemini"
                                        checked={transcriptionMode === 'gemini'}
                                        onChange={(e) => {
                                            setTranscriptionMode(e.target.value);
                                            localStorage.setItem('transcription_mode', e.target.value);
                                        }}
                                        className="mt-1"
                                    />
                                    <div>
                                        <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                            Gemini Direct
                                            <span className="text-xs px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-700 text-emerald-700 dark:text-emerald-200 rounded">No Garbled</span>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            Gemini only. Most accurate, timestamps estimated by AI.
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Audio Preprocessing */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">🔇</span>
                                        <label className="text-sm font-bold text-blue-900 dark:text-blue-100">
                                            Audio Preprocessing
                                        </label>
                                    </div>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                        Noise reduction & volume normalization before transcription
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        const newValue = !audioPreprocessing;
                                        setAudioPreprocessing(newValue);
                                        localStorage.setItem('audio_preprocessing', String(newValue));
                                    }}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${audioPreprocessing ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${audioPreprocessing ? 'translate-x-6' : ''}`}></span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 space-y-3">
                        <button onClick={() => {
                            // Save all settings to localStorage
                            localStorage.setItem('groq_api_keys', JSON.stringify(groqApiKeys.map(k => k.key)));
                            localStorage.setItem('gemini_api_key', geminiApiKey);
                            localStorage.setItem('transcribe_language', language);
                            localStorage.setItem('transcribe_manual_duration', manualDuration);
                            toast.success('✅ Settings saved');
                        }} className="w-full h-10 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2">
                            Save Settings
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const config = {
                                        groqApiKeys: groqApiKeys.map(k => ({ key: k.key })),
                                        geminiApiKey,
                                        language
                                    };
                                    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'transcriber_config.json';
                                    a.click();
                                    URL.revokeObjectURL(url);
                                }}
                                className="flex-1 h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg flex items-center justify-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[14px]">download</span>
                                Export Config
                            </button>
                            <label className="flex-1 h-9 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg flex items-center justify-center gap-1 cursor-pointer">
                                <span className="material-symbols-outlined text-[14px]">upload</span>
                                Import Config
                                <input
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                try {
                                                    const config = JSON.parse(event.target.result);
                                                    console.log('[Import] Config loaded:', config);

                                                    // Support both old format (groq_api_keys) and new format (groqApiKeys)
                                                    const rawKeys = config.groq_api_keys || config.groqApiKeys;
                                                    if (rawKeys && Array.isArray(rawKeys)) {
                                                        const keys = rawKeys.map(k => {
                                                            // Support both string format and object format
                                                            const keyValue = typeof k === 'string' ? k : (k.key || k);
                                                            return { key: keyValue, status: 'available', cooldownUntil: 0 };
                                                        }).filter(k => k.key);
                                                        console.log('[Import] Parsed keys:', keys.length);
                                                        setGroqApiKeys(keys);
                                                        localStorage.setItem('groq_api_keys', JSON.stringify(keys.map(k => ({ key: k.key }))));
                                                        // Sync to main process
                                                        window.api.groqUpdateKeys(keys.map(k => k.key));
                                                    }

                                                    // Support both old format and new format for gemini key
                                                    const geminiKey = config.gemini_api_key || config.geminiApiKey;
                                                    if (geminiKey) {
                                                        setGeminiApiKey(geminiKey);
                                                        localStorage.setItem('gemini_api_key', geminiKey);
                                                    }

                                                    // Support both old format and new format for language
                                                    const lang = config.transcribe_language || config.language;
                                                    if (lang) {
                                                        setLanguage(lang);
                                                        localStorage.setItem('transcribe_language', lang);
                                                    }

                                                    alert('Config imported successfully! Keys: ' + (rawKeys?.length || 0));
                                                } catch (err) {
                                                    console.error('[Import] Error:', err);
                                                    alert('Failed to import config: ' + err.message);
                                                }
                                            };
                                            reader.readAsText(file);
                                        }
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        </div>
                    </div>
                    </aside>
                </div>
            )}

            {/* History Panel */}
            {showHistory && (
                <aside className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setShowHistory(false)}></div>
                    <div className="relative w-[450px] bg-white dark:bg-[#1a2633] h-full shadow-2xl flex flex-col animate-slide-in">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">history</span>
                                    Transcription History
                                </h2>
                                <p className="text-xs text-slate-500 mt-1">Recent {transcriptionHistory.length} transcriptions</p>
                            </div>
                            <button onClick={() => setShowHistory(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {transcriptionHistory.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <span className="material-symbols-outlined text-[48px] mb-2">folder_open</span>
                                    <p>No transcriptions yet</p>
                                </div>
                            ) : (
                                transcriptionHistory.map((item) => (
                                    <div key={item.id} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start gap-3">
                                            <div className="size-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <span className="material-symbols-outlined text-primary text-[20px]">movie</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate" title={item.fileName}>
                                                    {item.fileName}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                                                        {new Date(item.date).toLocaleDateString()}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                                                        {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3">
                                            <button
                                                onClick={() => {
                                                    // Format the transcription for display
                                                    setTranscription(formatTextForTxt(item.transcription));
                                                    setSrtContent(item.srt);
                                                    setFile(item.filePath);
                                                    setShowHistory(false);
                                                    toast.success('Loaded transcription');
                                                }}
                                                className="flex-1 h-8 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                View
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    // Try to find and select the SRT file in output directory
                                                    if (item.outputDir) {
                                                        // Construct the SRT file path based on original filename
                                                        const baseName = item.fileName.replace(/\.[^/.]+$/, ''); // Remove extension
                                                        // Use the same path separator as outputDir
                                                        const separator = item.outputDir.includes('\\') ? '\\' : '/';
                                                        const srtPath = `${item.outputDir}${separator}${baseName}.srt`;
                                                        // Open folder and select the SRT file
                                                        window.api.openFolder?.(srtPath);
                                                    } else {
                                                        // Fallback to original file path (will select the original file)
                                                        window.api.openFolder?.(item.filePath);
                                                    }
                                                }}
                                                className="h-8 px-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
                                                title={item.outputDir ? '打开并选中导出的SRT文件' : '打开并选中原始文件'}
                                            >
                                                <span className="material-symbols-outlined text-[14px]">folder_open</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newHistory = transcriptionHistory.filter(h => h.id !== item.id);
                                                    setTranscriptionHistory(newHistory);
                                                    localStorage.setItem('transcription_history', JSON.stringify(newHistory));
                                                    toast.info('Removed from history');
                                                }}
                                                className="h-8 px-3 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {transcriptionHistory.length > 0 && (
                            <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={() => {
                                        setTranscriptionHistory([]);
                                        localStorage.removeItem('transcription_history');
                                        toast.info('History cleared');
                                    }}
                                    className="w-full h-9 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 text-red-600 text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                                    Clear All History
                                </button>
                            </div>
                        )}
                    </div>
                </aside>
            )}
        </div>
    );
};

export default AudioTranscriber;
