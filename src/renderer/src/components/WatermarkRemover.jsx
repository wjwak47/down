import { useState, useEffect, useRef } from 'react';

export default function WatermarkRemover() {
    const [files, setFiles] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [results, setResults] = useState([]);
    const [options, setOptions] = useState({
        method: 'advanced',
        coverMode: false
    });
    const completedCount = useRef(0);

    useEffect(() => {
        return () => {
            window.api.watermarkOffProgress();
        };
    }, []);

    const handleSelectFiles = async () => {
        const selectedFiles = await window.api.watermarkSelectFiles();
        if (selectedFiles && selectedFiles.length > 0) {
            const fileData = await Promise.all(
                selectedFiles.map(async (filePath) => {
                    const detection = await window.api.watermarkDetect(filePath);
                    return {
                        path: filePath,
                        name: filePath.split('\\').pop(),
                        type: filePath.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Word',
                        status: 'pending',
                        detection
                    };
                })
            );
            setFiles(fileData);
            setResults([]);
            completedCount.current = 0;
        }
    };

    const handleRemoveWatermarks = () => {
        if (files.length === 0) return;

        setProcessing(true);
        completedCount.current = 0;
        const id = Date.now();

        window.api.watermarkRemove(
            {
                files: files.map(f => f.path),
                options: options,
                id
            },
            (type, result) => {
                if (type === 'progress') {
                    setFiles(prevFiles =>
                        prevFiles.map(f =>
                            f.path === result.file ? { ...f, status: result.status } : f
                        )
                    );
                } else if (type === 'complete') {
                    setFiles(prevFiles =>
                        prevFiles.map(f =>
                            f.path === result.file
                                ? { ...f, status: result.success ? 'completed' : 'failed', result }
                                : f
                        )
                    );

                    setResults(prev => [...prev, result]);
                    completedCount.current++;

                    // Check if all completed
                    if (completedCount.current >= files.length) {
                        setProcessing(false);
                    }
                }
            }
        );
    };

    const handleRemoveFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleClear = () => {
        setFiles([]);
        setResults([]);
        completedCount.current = 0;
    };

    const getFileIcon = (type) => {
        if (type === 'PDF') {
            return (
                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 4h6v6h6v10H6V4z" />
                    <path d="M8 12h8v2H8zm0 3h8v2H8z" />
                </svg>
            );
        }
        return (
            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 4h6v6h6v10H6V4z" />
                <path d="M8 12h8v2H8zm0 3h5v2H8z" />
            </svg>
        );
    };

    const getStatusBadge = (file) => {
        const baseClasses = "px-2 py-1 text-xs font-medium rounded-full inline-flex items-center gap-1";

        switch (file.status) {
            case 'pending':
                return <span className={`${baseClasses} bg-gray-100 text-gray-600`}>⏳ 等待处理</span>;
            case 'processing':
                return <span className={`${baseClasses} bg-blue-100 text-blue-700`}>
                    <span className="animate-spin">⚙️</span> 处理中...
                </span>;
            case 'completed':
                return <span className={`${baseClasses} bg-green-100 text-green-700`}>✓ 已完成</span>;
            case 'failed':
                return <span className={`${baseClasses} bg-red-100 text-red-700`}>✗ 失败</span>;
            default:
                return null;
        }
    };

    return (
        <div className="h-full overflow-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <span className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white text-lg shadow-lg">
                        🗑️
                    </span>
                    水印去除工具
                </h1>
                <p className="text-gray-500 mt-2 ml-13">轻松去除 PDF 和 Word 文档中的水印</p>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Action Bar */}
                <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                    <div className="flex items-center gap-3 flex-wrap">
                        <button
                            onClick={handleSelectFiles}
                            className="btn btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-sm hover:shadow-md transition-all"
                            disabled={processing}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            选择文件
                        </button>

                        {files.length > 0 && (
                            <>
                                <button
                                    onClick={handleRemoveWatermarks}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-sm hover:shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={processing}
                                >
                                    {processing ? (
                                        <>
                                            <span className="animate-spin">⚙️</span>
                                            处理中...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            开始去除水印
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleClear}
                                    className="btn btn-secondary px-4 py-2.5 rounded-xl"
                                    disabled={processing}
                                >
                                    清空列表
                                </button>

                                <div className="ml-auto flex items-center gap-3">
                                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={options.coverMode}
                                            onChange={(e) => setOptions({ ...options, coverMode: e.target.checked })}
                                            className="w-4 h-4 text-purple-500 rounded border-gray-300 focus:ring-purple-500"
                                            disabled={processing}
                                        />
                                        覆盖模式 (PDF)
                                    </label>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* File List */}
                {files.length > 0 ? (
                    <div className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700">
                                已选择 {files.length} 个文件
                            </h3>
                            {results.length > 0 && (
                                <span className="text-sm text-gray-500">
                                    完成: {results.filter(r => r.success).length}/{files.length}
                                </span>
                            )}
                        </div>

                        <div className="space-y-3">
                            {files.map((file, index) => (
                                <div
                                    key={index}
                                    className={`group relative p-4 rounded-xl border transition-all duration-200 ${file.status === 'completed'
                                            ? 'bg-green-50 border-green-200'
                                            : file.status === 'failed'
                                                ? 'bg-red-50 border-red-200'
                                                : file.status === 'processing'
                                                    ? 'bg-blue-50 border-blue-200'
                                                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* File Icon */}
                                        <div className="flex-shrink-0 mt-0.5">
                                            {getFileIcon(file.type)}
                                        </div>

                                        {/* File Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                                    {file.name}
                                                </h4>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${file.type === 'PDF' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {file.type}
                                                </span>
                                            </div>

                                            {/* Detection Info */}
                                            {file.detection && (
                                                <div className="text-xs mb-2">
                                                    {file.detection.hasWatermark ? (
                                                        <span className="text-amber-600 flex items-center gap-1">
                                                            <span>⚠️</span>
                                                            检测到水印
                                                            {file.detection.confidence && (
                                                                <span className="text-gray-400 ml-1">
                                                                    ({file.detection.confidence === 'high' ? '高置信度' : '中置信度'})
                                                                </span>
                                                            )}
                                                        </span>
                                                    ) : (
                                                        <span className="text-green-600 flex items-center gap-1">
                                                            <span>✓</span>
                                                            未检测到水印
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Status */}
                                            <div className="flex items-center gap-2">
                                                {getStatusBadge(file)}
                                                {file.result?.message && file.status === 'completed' && (
                                                    <span className="text-xs text-gray-500">{file.result.message}</span>
                                                )}
                                                {file.result?.error && file.status === 'failed' && (
                                                    <span className="text-xs text-red-500">{file.result.error}</span>
                                                )}
                                            </div>

                                            {/* Output Path */}
                                            {file.result?.outputPath && file.status === 'completed' && (
                                                <div className="mt-2 text-xs text-gray-400 truncate">
                                                    📁 {file.result.outputPath}
                                                </div>
                                            )}
                                        </div>

                                        {/* Remove Button */}
                                        {!processing && (
                                            <button
                                                onClick={() => handleRemoveFile(index)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                                title="移除"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* Empty State */
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center">
                            <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-700 mb-2">选择要处理的文件</h3>
                        <p className="text-gray-400 text-sm mb-6">支持 PDF 和 Word (.docx) 格式</p>
                        <button
                            onClick={handleSelectFiles}
                            className="btn btn-primary px-6 py-2.5 rounded-xl"
                        >
                            选择文件
                        </button>
                    </div>
                )}
            </div>

            {/* Info Card */}
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <span>💡</span>
                    使用说明
                </h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-700">
                    <div className="flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        <span><strong>Word 文档</strong>：支持去除文字和图片水印，成功率较高</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        <span><strong>PDF 文档</strong>：支持去除注释型水印和图层水印</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        <span>输出文件将保存在原文件相同目录</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <span className="text-blue-400">•</span>
                        <span>原始文件不会被修改</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
