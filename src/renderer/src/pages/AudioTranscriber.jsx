import React, { useState, useEffect, useRef } from 'react';
import { Mic, Upload, Copy, Download, X, Settings, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const AudioTranscriber = () => {
    const [file, setFile] = useState(null);
    // API Key Pool
    const [groqApiKeys, setGroqApiKeys] = useState([]); // Array of { key: string, status: 'available' | 'cooling', cooldownUntil: number }
    const [newGroqKey, setNewGroqKey] = useState('');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [transcription, setTranscription] = useState('');
    const [srtContent, setSrtContent] = useState('');
    const [status, setStatus] = useState('idle'); // idle, extracting, transcribing, complete, error
    const [progress, setProgress] = useState({ stage: '', message: '', percent: 0 });
    const [error, setError] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [testStatus, setTestStatus] = useState({ testing: false, success: null, message: '' });
    const [language, setLanguage] = useState('zh');
    const [showGroqKeys, setShowGroqKeys] = useState(false);
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    // Gap detection and filling
    const [gaps, setGaps] = useState([]);
    const [showGapDialog, setShowGapDialog] = useState(false);
    const [savedAudioPath, setSavedAudioPath] = useState('');
    const [audioDuration, setAudioDuration] = useState(0);
    const [manualDuration, setManualDuration] = useState('');  // Manual duration input (HH:MM:SS)
    const [keyCountdowns, setKeyCountdowns] = useState({});  // Track cooldown timestamps
    const textareaRef = useRef(null);

    // Listen for real-time key status updates from backend
    useEffect(() => {
        const handleKeyStatusUpdate = (data) => {
            const { key, status, cooldownUntil } = data;
            console.log('[AudioTranscriber] Received key status update:', data);

            // Update key status in groqApiKeys
            setGroqApiKeys(prev => prev.map(k => {
                const maskedKey = k.key.slice(0, 8) + '...';
                if (maskedKey === key) {
                    console.log(`[AudioTranscriber] Updating key ${maskedKey}: ${status}`);
                    return {
                        ...k,
                        status,
                        cooldownUntil: cooldownUntil || 0
                    };
                }
                return k;
            }));

            // Update countdown tracking
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

        // Cleanup on unmount
        return () => {
            window.api.groqOffListeners();
        };
    }, []);

    // Countdown timer - update every second
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

    // Hot-update backend key pool when groqApiKeys changes
    useEffect(() => {
        if (groqApiKeys.length > 0) {
            const keys = groqApiKeys.map(k => k.key);
            window.api.groqUpdateKeys(keys).then(result => {
                if (result.success) {
                    console.log('[AudioTranscriber] ✨ Backend key pool updated');
                } else {
                    console.error('[AudioTranscriber] Failed to update backend keys:', result.error);
                }
            }).catch(err => {
                console.error('[AudioTranscriber] Error updating backend keys:', err);
            });
        }
    }, [groqApiKeys]);

    useEffect(() => {
        // Load saved API keys (pool)
        const savedGroqKeys = localStorage.getItem('groq_api_keys');
        const savedGeminiKey = localStorage.getItem('gemini_api_key');
        const savedLanguage = localStorage.getItem('transcribe_language');

        if (savedGroqKeys) {
            try {
                const keys = JSON.parse(savedGroqKeys);
                if (Array.isArray(keys)) {
                    // Reset cooldown status on load
                    setGroqApiKeys(keys.map(k => ({ key: k.key || k, status: 'available', cooldownUntil: 0 })));
                }
            } catch (e) {
                console.error('Failed to parse saved keys:', e);
            }
        } else {
            // Migrate from old single key format
            const oldSingleKey = localStorage.getItem('groq_api_key');
            if (oldSingleKey) {
                setGroqApiKeys([{ key: oldSingleKey, status: 'available', cooldownUntil: 0 }]);
                // Migrate to new format
                localStorage.setItem('groq_api_keys', JSON.stringify([{ key: oldSingleKey }]));
                localStorage.removeItem('groq_api_key');
            }
        }
        if (savedGeminiKey) setGeminiApiKey(savedGeminiKey);
        if (savedLanguage) setLanguage(savedLanguage);

        // Set up progress listeners
        window.api.onTranscribeExtractProgress((data) => {
            setProgress({ stage: 'extracting', message: 'Extracting audio...', percent: data.percent });
        });
        window.api.onGroqProgress((data) => {
            setProgress({ stage: data.stage, message: data.message, percent: 0 });
        });

        return () => {
            window.api.transcribeOffListeners();
            window.api.groqOffListeners();
        };
    }, []);

    const handleSelectFile = async () => {
        const filePath = await window.api.transcribeSelectFile();
        if (filePath) {
            setFile({ path: filePath, name: filePath.split(/[/\\]/).pop() });
            setTranscription('');
            setSrtContent('');
            setError('');
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setFile({ path: droppedFile.path, name: droppedFile.name });
            setTranscription('');
            setSrtContent('');
            setError('');
        }
    };

    const handleStartTranscription = async () => {
        if (!file || groqApiKeys.length === 0) {
            setError(groqApiKeys.length === 0 ? 'Please add at least one Groq API key' : 'Please select a file');
            return;
        }

        setStatus('extracting');
        setError('');
        setTranscription('');
        setSrtContent('');
        setProgress({ stage: 'extracting', message: 'Extracting audio...', percent: 0 });

        try {
            // Check if file is already an audio file
            const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];
            const fileExt = file.path.toLowerCase().substring(file.path.lastIndexOf('.'));
            const isAudioFile = audioExtensions.includes(fileExt);

            let audioPath;

            if (isAudioFile) {
                // Direct audio file - skip extraction to preserve metadata
                console.log('[Transcriber] Audio file detected, skipping extraction');
                setProgress({ stage: 'preparing', message: 'Preparing audio file...', percent: 10 });
                audioPath = file.path;
            } else {
                // Video file - extract audio
                console.log('[Transcriber] Video file detected, extracting audio');
                const extractResult = await window.api.transcribeExtractAudio(file.path);
                if (!extractResult.success) {
                    throw new Error(extractResult.error || 'Failed to extract audio');
                }
                audioPath = extractResult.audioPath;
            }

            // Step 2: Start Groq Whisper transcription with key pool
            setStatus('transcribing');
            setProgress({ stage: 'transcribing', message: 'Uploading to Groq Whisper...', percent: 0 });

            // Parse manual duration if provided (HH:MM:SS format)
            let manualDurationSeconds = null;
            if (manualDuration.trim()) {
                const parts = manualDuration.trim().split(':');
                if (parts.length === 3) {
                    const hours = parseInt(parts[0]) || 0;
                    const minutes = parseInt(parts[1]) || 0;
                    const seconds = parseInt(parts[2]) || 0;
                    manualDurationSeconds = hours * 3600 + minutes * 60 + seconds;
                    console.log(`[Transcriber] Using manual duration: ${manualDurationSeconds}s (${manualDuration})`);
                }
            }

            const result = await window.api.groqTranscribe({
                audioPath: audioPath,
                apiKeys: groqApiKeys.map(k => k.key), // Pass all keys
                geminiApiKey: geminiApiKey,
                options: {
                    language,
                    manualDuration: manualDurationSeconds  // Pass manual duration if provided
                }
            });

            if (result.success) {
                setTranscription(result.plainText || result.text);
                setSrtContent(result.srt || '');
                setStatus('complete');

                // Save audio path and duration for gap filling
                setSavedAudioPath(audioPath);
                setAudioDuration(result.duration || 0);

                // Auto-detect gaps
                if (result.srt && result.duration) {
                    const gapResult = await window.api.groqDetectGaps({
                        srtContent: result.srt,
                        totalDuration: result.duration
                    });

                    if (gapResult.success && gapResult.gaps.length > 0) {
                        setGaps(gapResult.gaps);
                        setShowGapDialog(true);
                    }
                }
            } else {
                throw new Error(result.error || 'Transcription failed');
            }
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const handleCancel = () => {
        setStatus('idle');
    };

    const handleCopy = () => {
        if (transcription) {
            navigator.clipboard.writeText(transcription);
        }
    };

    const handleExportTxt = () => {
        if (!transcription) return;
        const blob = new Blob([transcription], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file?.name?.replace(/\.[^/.]+$/, '') || 'transcription'}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportSrt = () => {
        if (!srtContent) return;
        const blob = new Blob([srtContent], { type: 'application/x-subrip;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file?.name?.replace(/\.[^/.]+$/, '') || 'transcription'}.srt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSaveSettings = () => {
        // Save key pool (only the key strings, status is runtime)
        localStorage.setItem('groq_api_keys', JSON.stringify(groqApiKeys.map(k => ({ key: k.key }))));
        localStorage.setItem('gemini_api_key', geminiApiKey);
        localStorage.setItem('transcribe_language', language);
        setShowSettings(false);
    };

    const handleExportConfig = () => {
        const config = {
            groq_api_keys: groqApiKeys.map(k => k.key),
            gemini_api_key: geminiApiKey,
            transcribe_language: language,
            exported_at: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proflow-config-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportConfig = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const config = JSON.parse(text);

                // Validate config structure
                if (!config.version) {
                    throw new Error('Invalid config file format');
                }

                // Import keys
                if (config.groq_api_keys && Array.isArray(config.groq_api_keys)) {
                    setGroqApiKeys(config.groq_api_keys.map(key => ({
                        key: key,
                        status: 'available',
                        cooldownUntil: 0
                    })));
                }

                if (config.gemini_api_key) {
                    setGeminiApiKey(config.gemini_api_key);
                }

                if (config.transcribe_language) {
                    setLanguage(config.transcribe_language);
                }

                // Save to localStorage
                localStorage.setItem('groq_api_keys', JSON.stringify(config.groq_api_keys.map(k => ({ key: k }))));
                localStorage.setItem('gemini_api_key', config.gemini_api_key || '');
                localStorage.setItem('transcribe_language', config.transcribe_language || 'zh');

                setTestStatus({
                    testing: false,
                    success: true,
                    message: `✅ Configuration imported successfully! (${config.groq_api_keys?.length || 0} Groq keys)`
                });

                setTimeout(() => {
                    setTestStatus({ testing: false, success: null, message: '' });
                }, 3000);
            } catch (err) {
                setTestStatus({
                    testing: false,
                    success: false,
                    message: `❌ Import failed: ${err.message}`
                });
            }
        };
        input.click();
    };

    const handleManualGapDetection = () => {
        if (!srtContent) {
            setError('需要SRT内容才能检测缺口');
            return;
        }

        try {
            // 纯前端实现 - 解析SRT
            const lines = srtContent.split('\n');
            const segments = [];

            lines.forEach(line => {
                const match = line.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
                if (match) {
                    segments.push({
                        start: parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000,
                        end: parseInt(match[5]) * 3600 + parseInt(match[6]) * 60 + parseInt(match[7]) + parseInt(match[8]) / 1000
                    });
                }
            });

            if (segments.length === 0) {
                setError('无法解析SRT文件');
                return;
            }

            // 检测缺口
            const detectedGaps = [];
            const MIN_GAP = 10; // 10秒以上才算缺口

            // 获取总时长
            const totalDuration = audioDuration || segments[segments.length - 1].end;

            // 检查segment之间的间隔
            for (let i = 0; i < segments.length - 1; i++) {
                const gapSize = segments[i + 1].start - segments[i].end;
                if (gapSize > MIN_GAP) {
                    detectedGaps.push({
                        start: segments[i].end,
                        end: segments[i + 1].start,
                        duration: gapSize
                    });
                }
            }

            // 检查结尾缺口
            const lastEnd = segments[segments.length - 1].end;
            if (totalDuration - lastEnd > MIN_GAP) {
                detectedGaps.push({
                    start: lastEnd,
                    end: totalDuration,
                    duration: totalDuration - lastEnd
                });
            }

            if (detectedGaps.length > 0) {
                setGaps(detectedGaps);
                setShowGapDialog(true);
            } else {
                setProgress({
                    stage: 'complete',
                    message: '✅ 未发现缺口！字幕完整覆盖全部音频。',
                    percent: 100
                });
                setTimeout(() => setProgress({ stage: '', message: '', percent: 0 }), 3000);
            }
        } catch (err) {
            setError('缺口检测失败: ' + err.message);
            console.error('Gap detection error:', err);
        }
    };

    const handleFillGaps = async () => {
        setShowGapDialog(false);
        setStatus('filling');
        setProgress({ stage: 'filling', message: 'Filling gaps...', percent: 0 });

        try {
            const result = await window.api.groqFillGaps({
                audioPath: savedAudioPath,
                gaps: gaps,
                apiKeys: groqApiKeys.map(k => k.key),
                options: { language }
            });

            if (result.success) {
                // Merge new segments into existing SRT
                const mergedSRT = await mergeSRTWithSegments(srtContent, result.newSegments);
                setSrtContent(mergedSRT);
                setGaps([]);
                setStatus('complete');
                setProgress({ stage: 'complete', message: `Filled ${result.newSegments.length} gaps successfully!`, percent: 100 });
            } else {
                throw new Error(result.error || 'Failed to fill gaps');
            }
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')} `;
    };

    const mergeSRTWithSegments = async (existingSRT, newSegments) => {
        // Parse existing SRT to get all segments
        const lines = existingSRT.split('\n');
        const existingSegments = [];
        let currentSegment = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (/^\d+$/.test(line)) {
                currentSegment = { index: parseInt(line), timeText: '', text: [] };
            } else if (currentSegment && line.includes('-->')) {
                currentSegment.timeText = line;
                const match = line.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s+-->\s+(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
                if (match) {
                    currentSegment.start = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000;
                }
            } else if (currentSegment && line && !line.includes('-->')) {
                currentSegment.text.push(line);
            } else if (!line && currentSegment) {
                existingSegments.push(currentSegment);
                currentSegment = null;
            }
        }

        // Convert new segments to SRT format
        const newSRTSegments = newSegments.map(seg => ({
            start: seg.start,
            timeText: `${formatTime(seg.start)} --> ${formatTime(seg.end)} `,
            text: [seg.text]
        }));

        // Merge and sort
        const allSegments = [...existingSegments, ...newSRTSegments];
        allSegments.sort((a, b) => a.start - b.start);

        // Generate new SRT
        return allSegments.map((seg, i) => {
            return `${i + 1} \n${seg.timeText} \n${seg.text.join('\n')} \n`;
        }).join('\n');
    };

    const handleAddGroqKey = async () => {
        if (!newGroqKey.trim()) return;
        if (groqApiKeys.some(k => k.key === newGroqKey.trim())) {
            setTestStatus({ testing: false, success: false, message: 'This key already exists' });
            return;
        }

        // Test the key first
        setTestStatus({ testing: true, success: null, message: 'Testing new key...' });
        try {
            const result = await window.api.groqTestConnection(newGroqKey.trim());
            if (result.success) {
                setGroqApiKeys(prev => [...prev, { key: newGroqKey.trim(), status: 'available', cooldownUntil: 0 }]);
                setNewGroqKey('');
                setTestStatus({ testing: false, success: true, message: 'Key added successfully!' });
            } else {
                setTestStatus({ testing: false, success: false, message: result.message });
            }
        } catch (err) {
            setTestStatus({ testing: false, success: false, message: err.message || 'Invalid key' });
        }
    };

    const handleRemoveGroqKey = (keyToRemove) => {
        setGroqApiKeys(prev => prev.filter(k => k.key !== keyToRemove));
    };

    const isProcessing = status === 'extracting' || status === 'transcribing';

    const LANGUAGES = {
        'zh': '中文 (Chinese)',
        'en': 'English',
        'ja': '日本語 (Japanese)',
        'ko': '한국어 (Korean)',
        'es': 'Español (Spanish)',
        'fr': 'Français (French)',
        'de': 'Deutsch (German)',
        'auto': 'Auto Detect'
    };

    return (
        <div className="h-full flex flex-col p-6 bg-bg-app overflow-y-auto">
            <PageHeader title="AI Audio Transcriber">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                        Powered by Whisper
                    </span>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${showSettings
                            ? 'bg-[#0ea5e9] text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                            } shadow-sm`}
                    >
                        <Settings size={16} />
                        Settings
                    </button>
                </div>
            </PageHeader>

            {/* Settings Panel */}
            {showSettings && (
                <div className="mb-6 bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-fade-in">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">API Configuration</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">
                                Groq API Key Pool
                                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="ml-2 text-primary text-xs hover:underline">
                                    Get free key →
                                </a>
                                <span className="ml-2 text-xs text-gray-400">({groqApiKeys.length} keys)</span>
                            </label>

                            {/* Existing Keys List */}
                            {groqApiKeys.length > 0 && (
                                <div className="mb-3 space-y-2">
                                    {groqApiKeys.map((keyItem, index) => (
                                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                            <span className={`w-2 h-2 rounded-full ${keyItem.status === 'available' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                            <span className="flex-1 text-sm font-mono text-gray-600">
                                                {showGroqKeys
                                                    ? keyItem.key
                                                    : (keyItem.key?.length > 12
                                                        ? `${keyItem.key.slice(0, 8)}...${keyItem.key.slice(-4)} `
                                                        : '****')}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {keyItem.status === 'available' ? '✓ Ready' : (() => {
                                                    const maskedKey = keyItem.key.slice(0, 8) + '...';
                                                    const cooldownUntil = keyCountdowns[maskedKey];
                                                    if (cooldownUntil) {
                                                        const remainingSec = Math.ceil((cooldownUntil - Date.now()) / 1000);
                                                        return remainingSec > 0 ? `⏳ Cooling (${remainingSec}s)` : '✓ Ready';
                                                    }
                                                    return '⏳ Cooling';
                                                })()}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveGroqKey(keyItem.key)}
                                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setShowGroqKeys(!showGroqKeys)}
                                        className="text-xs text-gray-400 hover:text-gray-600"
                                    >
                                        {showGroqKeys ? 'Hide keys' : 'Show keys'}
                                    </button>
                                </div>
                            )}

                            {/* Add New Key */}
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={newGroqKey}
                                        onChange={(e) => setNewGroqKey(e.target.value)}
                                        placeholder="Paste new Groq API key here..."
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <button
                                    onClick={handleAddGroqKey}
                                    disabled={testStatus.testing || !newGroqKey.trim()}
                                    className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${testStatus.testing ? 'bg-gray-200 cursor-wait' : 'bg-primary text-white hover:bg-primary/90'}`}
                                >
                                    <Plus size={16} />
                                    Add
                                </button>
                            </div>

                            {/* Status Message */}
                            {testStatus.message && (
                                <div className={`mt - 2 px - 3 py - 2 rounded - lg text - sm ${testStatus.success === true ? 'bg-green-50 text-green-600' : testStatus.success === false ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} `}>
                                    {testStatus.message}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">
                                Gemini API Key (Auto Error Correction)
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="ml-2 text-primary text-xs hover:underline">
                                    Get free key →
                                </a>
                            </label>
                            <div className="relative">
                                <input
                                    type={showGeminiKey ? "text" : "password"}
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    placeholder="AI...xxxxx (optional, for fixing errors)"
                                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">Leave empty to skip auto-correction</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Language</label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {Object.entries(LANGUAGES).map(([code, name]) => (
                                    <option key={code} value={code}>{name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Manual Duration Override */}
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">
                                Manual Duration (Optional)
                                <span className="text-xs text-gray-400 ml-2">Format: HH:MM:SS or leave empty for auto-detect</span>
                            </label>
                            <input
                                type="text"
                                value={manualDuration}
                                onChange={(e) => setManualDuration(e.target.value)}
                                placeholder="Example: 02:01:25"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]"
                            />
                            <p className="mt-1 text-xs text-gray-400">
                                💡 If auto-detection is inaccurate, manually input actual duration
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={handleSaveSettings}
                                className="px-3 py-2 bg-[#0ea5e9] text-white rounded-lg text-sm font-medium hover:bg-[#0284c7] transition-colors flex items-center justify-center gap-1"
                            >
                                <Settings size={14} />
                                Save Settings
                            </button>
                            <button
                                onClick={handleExportConfig}
                                className="px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                            >
                                <Download size={14} />
                                Export Config
                            </button>
                            <button
                                onClick={handleImportConfig}
                                className="px-3 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors flex items-center justify-center gap-1"
                            >
                                <Upload size={14} />
                                Import Config
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                    <span>⚠️</span> {error}
                    <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex gap-6">
                {/* Left: File Selection & Controls */}
                <div className="w-1/3 flex flex-col gap-4">
                    {/* File Drop Zone */}
                    <div
                        className={`flex-1 min-h-[200px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? 'bg-blue-50 border-primary' : 'bg-white border-gray-200 hover:border-primary/50'
                            }`}
                        onClick={handleSelectFile}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {file ? (
                            <div className="text-center p-4 w-full">
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <Mic size={24} className="text-primary" />
                                </div>
                                <div className="w-full px-4">
                                    <p
                                        className="text-sm font-medium text-gray-800 truncate w-full block"
                                        title={file.name}
                                    >
                                        {file.name}
                                    </p>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">Click to change</p>
                            </div>
                        ) : (
                            <div className="text-center p-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                    <Upload size={24} className="text-gray-400" />
                                </div>
                                <p className="text-sm font-medium text-gray-600">Drop file here</p>
                                <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                            </div>
                        )}
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={isProcessing ? handleCancel : handleStartTranscription}
                        disabled={!file || (!isProcessing && groqApiKeys.length === 0)}
                        className={`w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2 transition-all ${isProcessing
                            ? 'bg-red-500 hover:bg-red-600'
                            : !file || groqApiKeys.length === 0
                                ? 'bg-gray-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl'
                            }`}
                    >
                        {isProcessing ? (
                            <>
                                <span className="animate-spin">⚙️</span>
                                Cancel
                            </>
                        ) : (
                            <>
                                <Mic size={18} />
                                Start Transcription
                            </>
                        )}
                    </button>

                    {/* Progress */}
                    {isProcessing && (
                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="animate-pulse">🔄</span>
                                <span className="text-sm font-medium text-gray-700">{progress.message}</span>
                            </div>
                            {progress.percent > 0 && (
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary transition-all duration-300"
                                        style={{ width: `${progress.percent}% ` }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Info */}
                    <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700">
                        <div className="font-medium mb-1">✨ Whisper Features:</div>
                        <ul className="space-y-1 text-blue-600">
                            <li>• Precise word-level timestamps</li>
                            <li>• Complete transcription</li>
                            <li>• Multi-language support</li>
                        </ul>
                    </div>
                </div>

                {/* Right: Transcription Result */}
                <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-700">Transcription Result</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCopy}
                                disabled={!transcription}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Copy size={14} />
                                Copy
                            </button>
                            <button
                                onClick={handleExportSrt}
                                disabled={!srtContent}
                                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download size={14} />
                                SRT
                            </button>
                            <button
                                onClick={handleExportTxt}
                                disabled={!transcription}
                                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download size={14} />
                                TXT
                            </button>
                        </div>
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={transcription}
                        onChange={(e) => setTranscription(e.target.value)}
                        placeholder={status === 'complete' ? 'Transcription complete!' : 'Transcription will appear here...'}
                        className="flex-1 p-4 resize-none text-sm leading-relaxed focus:outline-none"
                        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                    />
                    {transcription && (
                        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
                            {transcription.split('\n').length} lines • {transcription.length} characters
                            {srtContent && ' • SRT ready'}
                        </div>
                    )}
                </div>
            </div>

            {/* Gap Detection Dialog */}
            {showGapDialog && gaps.length > 0 && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            ⚠️ 检测到 {gaps.length} 处缺口
                        </h3>

                        <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                            {gaps.map((gap, i) => (
                                <div key={i} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">
                                            缺口 {i + 1}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {gap.duration.toFixed(0)} 秒
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                        {formatTime(gap.start)} → {formatTime(gap.end)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-sm text-gray-600 mb-4">
                            这些时间段的音频未能转写。点击"自动补全"将重新尝试转写这些部分。
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleFillGaps}
                                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-medium"
                            >
                                自动补全
                            </button>
                            <button
                                onClick={() => setShowGapDialog(false)}
                                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-all font-medium"
                            >
                                跳过
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioTranscriber;
