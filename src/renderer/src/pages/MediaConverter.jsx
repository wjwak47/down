import React, { useState, useEffect } from 'react';
import { FileVideo, Music, Upload, X, Play, ChevronDown, ChevronUp } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const MediaConverter = () => {
    const [files, setFiles] = useState([]);
    const [targetFormat, setTargetFormat] = useState('mp4');
    const [converting, setConverting] = useState(false);
    const [progress, setProgress] = useState({});
    const [isDragging, setIsDragging] = useState(false);

    // Quality settings
    const [qualityPreset, setQualityPreset] = useState('high');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [customCrf, setCustomCrf] = useState(18);
    const [encoderPreset, setEncoderPreset] = useState('slow');
    const [resolution, setResolution] = useState('original');
    const [audioBitrate, setAudioBitrate] = useState('256k');

    useEffect(() => {
        const handleProgress = ({ id, file, status, percent }) => {
            setProgress(prev => ({
                ...prev,
                [file]: { status, percent: Math.round(percent || 0) }
            }));
        };

        const handleComplete = ({ id, file, success, error, outputPath }) => {
            setProgress(prev => ({
                ...prev,
                [file]: {
                    status: success ? 'completed' : 'error',
                    percent: 100,
                    error,
                    outputPath
                }
            }));
            setConverting(false);
        };

        window.api.onMediaProgress(handleProgress);
        window.api.onMediaComplete(handleComplete);

        return () => { };
    }, []);

    const handleSelectFiles = async () => {
        const selectedPaths = await window.api.mediaSelectFiles();
        if (selectedPaths && selectedPaths.length > 0) {
            const newFiles = selectedPaths.filter(p => !files.includes(p));
            setFiles([...files, ...newFiles]);
        }
    };

    const handleRemoveFile = (path) => {
        setFiles(files.filter(f => f !== path));
        const newProgress = { ...progress };
        delete newProgress[path];
        setProgress(newProgress);
    };

    const handleConvert = () => {
        if (files.length === 0) return;

        setConverting(true);
        const id = Date.now().toString();

        const initialProgress = {};
        files.forEach(f => {
            initialProgress[f] = { status: 'pending', percent: 0 };
        });
        setProgress(prev => ({ ...prev, ...initialProgress }));

        const options = {
            qualityPreset,
            customCrf: showAdvanced ? customCrf : undefined,
            encoderPreset: showAdvanced ? encoderPreset : undefined,
            resolution: showAdvanced ? resolution : 'original',
            audioBitrate: showAdvanced ? audioBitrate : undefined,
        };

        window.api.mediaConvert(files, targetFormat, options, id);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        const filePaths = droppedFiles.map(f => f.path);

        if (filePaths.length > 0) {
            const newFiles = filePaths.filter(p => !files.includes(p));
            setFiles([...files, ...newFiles]);
        }
    };

    const formats = [
        { value: 'mp4', label: 'MP4 Video' },
        { value: 'avi', label: 'AVI Video' },
        { value: 'mkv', label: 'MKV Video' },
        { value: 'mov', label: 'MOV Video' },
        { value: 'mp3', label: 'MP3 Audio' },
        { value: 'wav', label: 'WAV Audio' },
        { value: 'flac', label: 'FLAC Audio' },
        { value: 'm4a', label: 'M4A Audio' },
    ];

    const qualityPresets = [
        { id: 'fast', label: '快速', desc: '较大文件', icon: '⚡' },
        { id: 'standard', label: '标准', desc: '平衡', icon: '⭐' },
        { id: 'high', label: '高质量', desc: '较小文件', icon: '💎' },
        { id: 'lossless', label: '无损', desc: '最大文件', icon: '🎯' },
    ];

    return (
        <div className="h-full flex flex-col p-6 bg-bg-app overflow-y-auto">
            <PageHeader title="Media Converter">
                <select
                    value={targetFormat}
                    onChange={(e) => setTargetFormat(e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary shadow-sm hover:shadow transition-shadow min-w-[120px]"
                    disabled={converting}
                >
                    {formats.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>
                <button
                    onClick={handleConvert}
                    disabled={files.length === 0 || converting}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-white transition-all shadow-sm hover:shadow-md whitespace-nowrap ${files.length === 0 || converting
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-primary hover:bg-primary-hover'
                        }`}
                >
                    <Play size={16} />
                    {converting ? 'Converting...' : 'Convert'}
                </button>
            </PageHeader>

            {/* Quality Presets */}
            <div className="mb-6 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-text-primary mb-3">质量预设</label>
                    <div className="grid grid-cols-4 gap-3">
                        {qualityPresets.map(preset => (
                            <button
                                key={preset.id}
                                onClick={() => setQualityPreset(preset.id)}
                                disabled={converting}
                                className={`p-4 border-2 rounded-lg transition-all ${qualityPreset === preset.id
                                    ? 'border-primary bg-blue-50 shadow-md'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="text-2xl mb-2">{preset.icon}</div>
                                <div className="font-semibold text-sm">{preset.label}</div>
                                <div className="text-xs text-gray-500 mt-1">{preset.desc}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Advanced Settings Toggle */}
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary-hover font-medium transition-colors"
                    disabled={converting}
                >
                    {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    高级设置
                </button>

                {/* Advanced Options */}
                {showAdvanced && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        {/* CRF Slider */}
                        <div>
                            <label className="flex justify-between text-sm font-medium text-text-primary mb-2">
                                <span>视频质量 (CRF)</span>
                                <span className="text-gray-500">
                                    {customCrf} ({customCrf < 20 ? '极高' : customCrf < 24 ? '高' : '中'})
                                </span>
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="51"
                                value={customCrf}
                                onChange={(e) => setCustomCrf(Number(e.target.value))}
                                disabled={converting || qualityPreset === 'lossless'}
                                className="w-full accent-primary"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>最高质量</span>
                                <span>推荐: 18-23</span>
                                <span>最小文件</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Encoder Preset */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">编码速度</label>
                                <select
                                    value={encoderPreset}
                                    onChange={(e) => setEncoderPreset(e.target.value)}
                                    disabled={converting || qualityPreset === 'lossless'}
                                    className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="ultrafast">极快</option>
                                    <option value="fast">快速</option>
                                    <option value="medium">中等</option>
                                    <option value="slow">慢速（推荐）</option>
                                    <option value="veryslow">极慢</option>
                                </select>
                            </div>

                            {/* Resolution */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">分辨率</label>
                                <select
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                    disabled={converting}
                                    className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="original">保持原始</option>
                                    <option value="720p">720p (HD)</option>
                                    <option value="1080p">1080p (Full HD)</option>
                                    <option value="4k">4K (UHD)</option>
                                </select>
                            </div>

                            {/* Audio Bitrate */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">音频码率</label>
                                <select
                                    value={audioBitrate}
                                    onChange={(e) => setAudioBitrate(e.target.value)}
                                    disabled={converting || qualityPreset === 'lossless'}
                                    className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value="128k">128 kbps</option>
                                    <option value="192k">192 kbps</option>
                                    <option value="256k">256 kbps</option>
                                    <option value="320k">320 kbps</option>
                                </select>
                            </div>
                        </div>

                        {qualityPreset === 'lossless' && (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                                💡 无损模式将直接复制视频和音频流，不进行重新编码，保证100%质量。
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* File Drop Zone */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[300px]">
                {files.length === 0 ? (
                    <div
                        className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-colors border-2 border-dashed m-4 rounded-xl ${isDragging
                            ? 'bg-blue-50 border-primary'
                            : 'border-transparent hover:border-primary/20 hover:bg-gray-50'
                            }`}
                        onClick={handleSelectFiles}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mb-4">
                            <Upload size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">拖拽文件到此处或点击上传</h3>
                        <p className="text-text-secondary text-sm">支持 MP4, AVI, MKV, MP3, WAV 等格式</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {files.map((file) => {
                            const fileProgress = progress[file] || { status: 'idle', percent: 0 };
                            const isError = fileProgress.status === 'error';
                            const isDone = fileProgress.status === 'completed';

                            return (
                                <div key={file} className="bg-gray-50 rounded-lg p-4 flex items-center gap-4 group">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-gray-400 shadow-sm">
                                        {targetFormat.includes('mp3') || targetFormat.includes('wav') ? <Music size={20} /> : <FileVideo size={20} />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-sm font-medium text-text-primary truncate" title={file}>
                                                {file.split(/[\\/]/).pop()}
                                            </p>
                                            <span className={`text-xs font-medium ${isError ? 'text-red-500' : isDone ? 'text-green-500' : 'text-text-secondary'
                                                }`}>
                                                {isError ? 'Failed' : isDone ? 'Completed' : fileProgress.status === 'processing' ? `${fileProgress.percent}%` : 'Ready'}
                                            </span>
                                        </div>

                                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${isError ? 'bg-red-500' : isDone ? 'bg-green-500' : 'bg-primary'}`}
                                                style={{ width: `${fileProgress.percent}%` }}
                                            />
                                        </div>

                                        {isError && (
                                            <p className="text-xs text-red-500 mt-1">{fileProgress.error}</p>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleRemoveFile(file)}
                                        className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                        disabled={converting && fileProgress.status === 'processing'}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            );
                        })}

                        <div className="pt-4 flex justify-center">
                            <button
                                onClick={handleSelectFiles}
                                className="text-primary text-sm font-medium hover:underline flex items-center gap-1"
                                disabled={converting}
                            >
                                <Upload size={14} />
                                添加更多文件
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MediaConverter;
