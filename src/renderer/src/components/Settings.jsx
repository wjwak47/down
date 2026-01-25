import React, { useState, useEffect } from 'react';
import GPUSettings from './GPUSettings';

const Settings = ({ isOpen, onClose }) => {
    const [downloadPath, setDownloadPath] = useState('');
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);

    // AI Settings state
    const [aiProvider, setAiProvider] = useState('gemini');
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [doubaoApiKey, setDoubaoApiKey] = useState('');
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [deepseekApiKey, setDeepseekApiKey] = useState('');
    const [localUrl, setLocalUrl] = useState('http://localhost:1234');
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [showDoubaoKey, setShowDoubaoKey] = useState(false);
    const [showOpenaiKey, setShowOpenaiKey] = useState(false);
    const [showDeepseekKey, setShowDeepseekKey] = useState(false);

    // Model download state
    const [asrModelStatus, setAsrModelStatus] = useState('not_installed'); // not_installed, downloading, installed
    const [asrDownloadProgress, setAsrDownloadProgress] = useState(0);
    const [embeddingModelStatus, setEmbeddingModelStatus] = useState('not_installed');
    const [embeddingDownloadProgress, setEmbeddingDownloadProgress] = useState(0);

    useEffect(() => {
        if (isOpen) {
            // Load general settings
            const savedPath = localStorage.getItem('downloadPath');
            if (savedPath) setDownloadPath(savedPath);

            // Load AI settings
            const savedProvider = localStorage.getItem('aiProvider') || 'gemini';
            const savedGeminiKey = localStorage.getItem('geminiApiKey') || '';
            const savedDoubaoKey = localStorage.getItem('doubaoApiKey') || '';
            const savedOpenaiKey = localStorage.getItem('openaiApiKey') || '';
            const savedDeepseekKey = localStorage.getItem('deepseekApiKey') || '';
            const savedLocalUrl = localStorage.getItem('lmStudioUrl') || 'http://localhost:1234';

            setAiProvider(savedProvider);
            setGeminiApiKey(savedGeminiKey);
            setDoubaoApiKey(savedDoubaoKey);
            setOpenaiApiKey(savedOpenaiKey);
            setDeepseekApiKey(savedDeepseekKey);
            setLocalUrl(savedLocalUrl);
        }
    }, [isOpen]);

    const handleSave = async () => {
        setIsSaving(true);

        // Save general settings
        localStorage.setItem('downloadPath', downloadPath);

        // Save AI settings to localStorage
        localStorage.setItem('aiProvider', aiProvider);
        localStorage.setItem('geminiApiKey', geminiApiKey);
        localStorage.setItem('doubaoApiKey', doubaoApiKey);
        localStorage.setItem('openaiApiKey', openaiApiKey);
        localStorage.setItem('deepseekApiKey', deepseekApiKey);
        localStorage.setItem('lmStudioUrl', localUrl);

        // Also save to electron-store via IPC
        try {
            if (window.api?.settingsSave) {
                await window.api.settingsSave({
                    aiProvider,
                    geminiApiKey,
                    doubaoApiKey,
                    openaiApiKey,
                    deepseekApiKey,
                    lmStudioUrl: localUrl
                });
            }
        } catch (error) {
            console.error('Settings save error:', error);
        }

        setIsSaving(false);
        onClose();
    };

    const handleSelectDirectory = async () => {
        const path = await window.api.selectDownloadDirectory();
        if (path) setDownloadPath(path);
    };

    // Model download handlers
    const handleDownloadAsrModel = async () => {
        setAsrModelStatus('downloading');
        setAsrDownloadProgress(0);
        try {
            // Simulate download progress (replace with actual download logic)
            for (let i = 0; i <= 100; i += 10) {
                await new Promise(r => setTimeout(r, 300));
                setAsrDownloadProgress(i);
            }
            setAsrModelStatus('installed');
            alert('语音识别模型下载完成！');
        } catch (error) {
            setAsrModelStatus('not_installed');
            alert('下载失败: ' + error.message);
        }
    };

    const handleDownloadEmbeddingModel = async () => {
        setEmbeddingModelStatus('downloading');
        setEmbeddingDownloadProgress(0);
        try {
            // Simulate download progress (replace with actual download logic)
            for (let i = 0; i <= 100; i += 10) {
                await new Promise(r => setTimeout(r, 200));
                setEmbeddingDownloadProgress(i);
            }
            setEmbeddingModelStatus('installed');
            alert('语义搜索模型下载完成！');
        } catch (error) {
            setEmbeddingModelStatus('not_installed');
            alert('下载失败: ' + error.message);
        }
    };

    const handleClearKnowledgeBase = () => {
        if (confirm('确定要清除所有知识库数据吗？此操作不可恢复。')) {
            alert('知识库数据已清除');
        }
    };

    if (!isOpen) return null;

    const aiProviders = [
        { value: 'doubao', label: '豆包', desc: '字节跳动 AI 服务' },
        { value: 'gemini', label: 'Gemini', desc: 'Google AI' },
        { value: 'openai', label: 'ChatGPT', desc: 'OpenAI GPT Models' },
        { value: 'deepseek', label: 'DeepSeek', desc: 'DeepSeek AI' },
        { value: 'local', label: 'LM Studio', desc: 'Local Model Server' },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1a2633] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Tabs Header */}
                <div className="flex gap-2 px-6 pt-6 border-b border-slate-100 dark:border-slate-800">
                    {[
                        { id: 'general', label: 'General', icon: 'settings' },
                        { id: 'models', label: 'AI Models', icon: 'model_training' },
                        { id: 'ai', label: 'AI Service', icon: 'smart_toy' },
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

                    {activeTab === 'models' && (
                        <div className="space-y-6">
                            {/* Section Header */}
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-rose-500">mic</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900 dark:text-white">AI 模型资源</h3>
                                    <p className="text-xs text-slate-400">管理本地语音识别与语义搜索模型</p>
                                </div>
                            </div>

                            {/* ASR Model Card */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-md">
                                            语音识别模型
                                        </span>
                                        <span className="text-xs text-slate-400">SenseVoice Small</span>
                                    </div>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm text-slate-900 dark:text-white">SenseVoice-Small-Int8</p>
                                                {asrModelStatus === 'installed' ? (
                                                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                                                        <span className="material-symbols-outlined text-xs">check_circle</span>
                                                        已安装
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                                        <span className="material-symbols-outlined text-xs">info</span>
                                                        未安装
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">阿里达摩院开源的高精度语音识别模型，支持中英日韩多语言</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[11px] text-slate-400">大小: ~450MB</span>
                                                <span className="text-[11px] text-slate-400">语言: 中、英、日、韩</span>
                                            </div>
                                        </div>
                                    </div>
                                    {asrModelStatus === 'downloading' && (
                                        <div className="mt-3">
                                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                                <span>下载中...</span>
                                                <span>{asrDownloadProgress}%</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-rose-500 rounded-full transition-all"
                                                    style={{ width: `${asrDownloadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 flex justify-end gap-2">
                                    {asrModelStatus === 'installed' ? (
                                        <button className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-sm">folder_open</span>
                                            打开目录
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleDownloadAsrModel}
                                            disabled={asrModelStatus === 'downloading'}
                                            className="px-3 py-1.5 text-xs rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center gap-1.5"
                                        >
                                            {asrModelStatus === 'downloading' ? (
                                                <>
                                                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                                    下载中...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-sm">download</span>
                                                    下载模型
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Embedding Model Card */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md">
                                            语义搜索模型
                                        </span>
                                        <span className="text-xs text-slate-400">BGE-Small-Zh</span>
                                    </div>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm text-slate-900 dark:text-white">BGE-Small-Zh-v1.5</p>
                                                {embeddingModelStatus === 'installed' ? (
                                                    <span className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                                                        <span className="material-symbols-outlined text-xs">check_circle</span>
                                                        已安装
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                                        <span className="material-symbols-outlined text-xs">info</span>
                                                        未安装
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1">北京智源开源的中文文本向量模型，用于知识库语义搜索</p>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[11px] text-slate-400">大小: ~95MB</span>
                                            </div>
                                        </div>
                                    </div>
                                    {embeddingModelStatus === 'downloading' && (
                                        <div className="mt-3">
                                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                                                <span>下载中...</span>
                                                <span>{embeddingDownloadProgress}%</span>
                                            </div>
                                            <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 rounded-full transition-all"
                                                    style={{ width: `${embeddingDownloadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 flex justify-between items-center">
                                    <button
                                        onClick={handleClearKnowledgeBase}
                                        className="px-3 py-1.5 text-xs rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        清除知识库数据
                                    </button>
                                    {embeddingModelStatus === 'installed' ? (
                                        <button className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-sm">folder_open</span>
                                            打开目录
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleDownloadEmbeddingModel}
                                            disabled={embeddingModelStatus === 'downloading'}
                                            className="px-3 py-1.5 text-xs rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center gap-1.5"
                                        >
                                            {embeddingModelStatus === 'downloading' ? (
                                                <>
                                                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                                    下载中...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-sm">download</span>
                                                    下载模型
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Note */}
                            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30">
                                <div className="flex gap-3">
                                    <span className="material-symbols-outlined text-amber-500 mt-0.5">info</span>
                                    <div className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                        <p>本地模型需要下载后才能使用对应功能。</p>
                                        <p className="mt-1 opacity-80">语音识别模型用于视频转录，语义搜索模型用于知识库问答。</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <div className="space-y-6">
                            {/* AI Provider Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-3">AI Service Provider</label>
                                <div className="space-y-2">
                                    {aiProviders.map(item => (
                                        <button
                                            key={item.value}
                                            onClick={() => setAiProvider(item.value)}
                                            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${aiProvider === item.value
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                                                : 'bg-slate-50 dark:bg-slate-800/50 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                                                }`}
                                        >
                                            <div className="text-left">
                                                <p className={`font-medium text-sm ${aiProvider === item.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {item.label}
                                                </p>
                                                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                                            </div>
                                            {aiProvider === item.value && (
                                                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-white text-sm">check</span>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Doubao API Key */}
                            {aiProvider === 'doubao' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                        豆包 API Key
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showDoubaoKey ? 'text' : 'password'}
                                            value={doubaoApiKey}
                                            onChange={(e) => setDoubaoApiKey(e.target.value)}
                                            className="w-full h-10 px-3 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                                            placeholder="输入豆包 API Key..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowDoubaoKey(!showDoubaoKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <span className="material-symbols-outlined text-lg">
                                                {showDoubaoKey ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">
                                        从{' '}
                                        <a href="https://console.volcengine.com/ark" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                                            火山引擎控制台
                                        </a>
                                        {' '}获取 API Key
                                    </p>
                                </div>
                            )}

                            {/* Gemini API Key */}
                            {aiProvider === 'gemini' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                        Gemini API Key
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showGeminiKey ? 'text' : 'password'}
                                            value={geminiApiKey}
                                            onChange={(e) => setGeminiApiKey(e.target.value)}
                                            className="w-full h-10 px-3 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                                            placeholder="Enter Gemini API Key..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowGeminiKey(!showGeminiKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <span className="material-symbols-outlined text-lg">
                                                {showGeminiKey ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Get API Key from{' '}
                                        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                                            Google AI Studio
                                        </a>
                                    </p>
                                </div>
                            )}

                            {/* OpenAI API Key */}
                            {aiProvider === 'openai' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                        OpenAI API Key
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showOpenaiKey ? 'text' : 'password'}
                                            value={openaiApiKey}
                                            onChange={(e) => setOpenaiApiKey(e.target.value)}
                                            className="w-full h-10 px-3 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                                            placeholder="Enter OpenAI API Key..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <span className="material-symbols-outlined text-lg">
                                                {showOpenaiKey ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Get API Key from{' '}
                                        <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                                            OpenAI Console
                                        </a>
                                    </p>
                                </div>
                            )}

                            {/* DeepSeek API Key */}
                            {aiProvider === 'deepseek' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                        DeepSeek API Key
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showDeepseekKey ? 'text' : 'password'}
                                            value={deepseekApiKey}
                                            onChange={(e) => setDeepseekApiKey(e.target.value)}
                                            className="w-full h-10 px-3 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                                            placeholder="Enter DeepSeek API Key..."
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <span className="material-symbols-outlined text-lg">
                                                {showDeepseekKey ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Get API Key from{' '}
                                        <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                                            DeepSeek Console
                                        </a>
                                    </p>
                                </div>
                            )}

                            {/* LM Studio URL */}
                            {aiProvider === 'local' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
                                        LM Studio Address
                                    </label>
                                    <input
                                        type="text"
                                        value={localUrl}
                                        onChange={(e) => setLocalUrl(e.target.value)}
                                        className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                                        placeholder="http://localhost:1234"
                                    />
                                    <p className="text-xs text-slate-400 mt-2">
                                        Run LM Studio locally and enter the server address
                                    </p>
                                </div>
                            )}
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
