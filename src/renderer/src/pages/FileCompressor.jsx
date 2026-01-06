import React, { useState, useEffect } from 'react';
import { Archive, Upload, X, Check, Play, FolderArchive, FileArchive } from 'lucide-react';
import PageHeader from '../components/PageHeader';

const FileCompressor = () => {
    const [files, setFiles] = useState([]);
    const [mode, setMode] = useState('compress'); // 'compress' or 'decompress'
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState({});

    useEffect(() => {
        const handleProgress = ({ id, status, entries, total, percent }) => {
            // For zip, we might not get exact percent, so we estimate or show status
            const p = percent || (total ? Math.round((entries / total) * 100) : 0);

            // Since we don't track per-file progress easily for batch zip (it's one job),
            // we'll just update a global status or the first file's status if single
            // For simplicity, let's assume one job = one entry in progress map keyed by 'job'
            setProgress(prev => ({
                ...prev,
                ['current-job']: { status, percent: p }
            }));
        };

        const handleComplete = ({ id, success, error, outputPath }) => {
            setProgress(prev => ({
                ...prev,
                ['current-job']: {
                    status: success ? 'completed' : 'error',
                    percent: 100,
                    error,
                    outputPath
                }
            }));
            setProcessing(false);
        };

        window.api.onZipProgress(handleProgress);
        window.api.onZipComplete(handleComplete);

        return () => { };
    }, []);

    const handleSelectFiles = async () => {
        const selectedPaths = await window.api.zipSelectFiles();
        if (selectedPaths && selectedPaths.length > 0) {
            const newFiles = selectedPaths.filter(p => !files.includes(p));
            setFiles([...files, ...newFiles]);
        }
    };

    const handleRemoveFile = (path) => {
        setFiles(files.filter(f => f !== path));
    };

    const handleAction = () => {
        if (files.length === 0) return;

        setProcessing(true);
        const id = Date.now().toString();

        setProgress({ ['current-job']: { status: 'starting', percent: 0 } });

        if (mode === 'compress') {
            window.api.zipCompress(files, { outputName: `archive_${id}.zip` }, id);
        } else {
            // Decompress usually handles one file at a time, but let's loop if multiple
            // For now, just take the first one for simplicity or loop
            files.forEach(file => {
                window.api.zipDecompress(file, {}, id);
            });
        }
    };

    const jobProgress = progress['current-job'];

    return (
        <div className="h-full flex flex-col p-6 bg-bg-app overflow-y-auto">
            <PageHeader title="File Compressor">
                <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    <button
                        onClick={() => setMode('compress')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${mode === 'compress' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-primary'
                            }`}
                    >
                        Compress
                    </button>
                    <button
                        onClick={() => setMode('decompress')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${mode === 'decompress' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-primary'
                            }`}
                    >
                        Decompress
                    </button>
                </div>
            </PageHeader>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[300px]">
                {files.length === 0 ? (
                    <div
                        className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors border-2 border-dashed border-transparent hover:border-primary/20 m-4 rounded-xl"
                        onClick={handleSelectFiles}
                    >
                        <div className="w-16 h-16 bg-blue-50 text-primary rounded-full flex items-center justify-center mb-4">
                            {mode === 'compress' ? <FolderArchive size={32} /> : <FileArchive size={32} />}
                        </div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">
                            {mode === 'compress' ? 'Drop files to compress' : 'Drop archives to extract'}
                        </h3>
                        <p className="text-text-secondary text-sm">
                            {mode === 'compress' ? 'Support multi-file selection' : 'Support ZIP, RAR, 7Z, TAR'}
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col">
                        <div className="flex-1 space-y-3">
                            {files.map((file) => (
                                <div key={file} className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 border border-gray-100">
                                        <Archive size={16} />
                                    </div>
                                    <p className="flex-1 text-sm font-medium text-text-primary truncate" title={file}>
                                        {file.split(/[\\/]/).pop()}
                                    </p>
                                    <button
                                        onClick={() => handleRemoveFile(file)}
                                        className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                                        disabled={processing}
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Progress Area */}
                        {jobProgress && (
                            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-blue-900">
                                        {jobProgress.status === 'completed' ? 'Success!' :
                                            jobProgress.status === 'error' ? 'Failed' :
                                                mode === 'compress' ? 'Compressing...' : 'Extracting...'}
                                    </span>
                                    <span className="text-xs font-bold text-blue-700">
                                        {jobProgress.status === 'completed' ? <Check size={16} /> :
                                            jobProgress.status === 'error' ? 'Error' :
                                                `${jobProgress.percent}%`}
                                    </span>
                                </div>
                                {jobProgress.status === 'error' ? (
                                    <p className="text-xs text-red-600">{jobProgress.error}</p>
                                ) : (
                                    <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{ width: `${jobProgress.percent}%` }}
                                        />
                                    </div>
                                )}
                                {jobProgress.outputPath && (
                                    <p className="text-xs text-text-secondary mt-2 truncate">
                                        Output: {jobProgress.outputPath}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="pt-4 flex gap-3 border-t border-gray-100 mt-4">
                            <button
                                onClick={handleSelectFiles}
                                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-text-secondary hover:bg-gray-50 transition-colors"
                                disabled={processing}
                            >
                                Add Files
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={processing}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 transition-all
                  ${processing
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-primary hover:bg-primary-hover shadow-md hover:shadow-lg'}`}
                            >
                                {processing ? 'Processing...' : (mode === 'compress' ? 'Compress Now' : 'Extract Now')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FileCompressor;
