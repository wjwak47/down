import React, { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, Upload, X, Play, FileSpreadsheet } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const DocumentConverter = () => {
    const [files, setFiles] = useState([]);
    const [targetFormat, setTargetFormat] = useState('docx');
    const [converting, setConverting] = useState(false);
    const [progress, setProgress] = useState({});
    const [isDragging, setIsDragging] = useState(false);

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

        window.api.onDocProgress(handleProgress);
        window.api.onDocComplete(handleComplete);

        return () => { };
    }, []);

    const handleSelectFiles = async () => {
        const selectedPaths = await window.api.docSelectFiles();
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

        window.api.docConvert(files, targetFormat, {}, id);
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
        { value: 'pdf', label: 'PDF' },
        { value: 'docx', label: 'Word' },
        { value: 'xlsx', label: 'Excel' },
        { value: 'html', label: 'HTML' },
        { value: 'txt', label: 'Text' },
        { value: 'csv', label: 'CSV' },
        { value: 'json', label: 'JSON' },
        { value: 'jpg', label: 'JPG' },
        { value: 'png', label: 'PNG' },
        { value: 'webp', label: 'WebP' },
    ];

    return (
        <div className="h-full flex flex-col p-6 bg-bg-app overflow-y-auto">
            <PageHeader title="Document Converter">
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
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-white transition-all shadow-sm hover:shadow-md whitespace-nowrap
              ${files.length === 0 || converting
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-primary hover:bg-primary-hover'}`}
                >
                    <Play size={16} />
                    {converting ? 'Converting...' : 'Convert'}
                </button>
            </PageHeader>

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
                        <h3 className="text-lg font-semibold text-text-primary mb-2">Drop files here or click to upload</h3>
                        <p className="text-text-secondary text-sm">Support PDF, Word, Excel, Images and more</p>
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
                                        <FileText size={20} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between mb-1">
                                            <p className="text-sm font-medium text-text-primary truncate" title={file}>
                                                {file.split(/[\\/]/).pop()}
                                            </p>
                                            <span className={`text-xs font-medium ${isError ? 'text-red-500' : isDone ? 'text-green-500' : 'text-text-secondary'
                                                }`}>
                                                {isError ? 'Failed' : isDone ? 'Completed' : fileProgress.status === 'processing' ? 'Processing...' : 'Ready'}
                                            </span>
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
                                Add more files
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentConverter;
