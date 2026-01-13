import { useState, useEffect, useRef, useCallback } from 'react';

export default function WatermarkRemover() {
    const [mode, setMode] = useState('documents');
    const [files, setFiles] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [options, setOptions] = useState({
        coverMode: false,
        useBlur: false,
        coverColor: '#FFFFFF'
    });

    const [selectedImage, setSelectedImage] = useState(null);
    const [imageInfo, setImageInfo] = useState(null);
    const [regions, setRegions] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentRect, setCurrentRect] = useState(null);
    const canvasRef = useRef(null);
    const completedCount = useRef(0);

    useEffect(() => {
        return () => window.api.watermarkOffProgress();
    }, []);

    // Document handlers
    const handleSelectFiles = async () => {
        const selected = await window.api.watermarkSelectFiles();
        if (selected?.length > 0) {
            const fileData = await Promise.all(selected.map(async (path) => {
                const detection = await window.api.watermarkDetect(path);
                const ext = path.toLowerCase().split('.').pop();
                return { path, name: path.split('\\').pop(), type: ext === 'pdf' ? 'PDF' : 'Word', status: 'pending', detection };
            }));
            setFiles(fileData);
            completedCount.current = 0;
        }
    };

    const handleProcess = () => {
        if (files.length === 0) return;
        setProcessing(true);
        completedCount.current = 0;
        window.api.watermarkRemove(
            { files: files.map(f => f.path), options, id: Date.now() },
            (type, result) => {
                if (type === 'progress') {
                    setFiles(prev => prev.map(f => f.path === result.file ? { ...f, status: result.status } : f));
                } else if (type === 'complete') {
                    setFiles(prev => prev.map(f => f.path === result.file ? { ...f, status: result.success ? 'completed' : 'failed', result } : f));
                    completedCount.current++;
                    if (completedCount.current >= files.length) setProcessing(false);
                }
            }
        );
    };

    // Image handlers
    const handleSelectImage = async () => {
        const selected = await window.api.watermarkSelectImages();
        if (selected?.length > 0) {
            setSelectedImage(selected[0]);
            setRegions([]);
            try {
                setImageInfo(await window.api.watermarkGetImageInfo(selected[0]));
            } catch (e) { console.error(e); }
        }
    };

    const handleMouseDown = useCallback((e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        setIsDrawing(true);
        setCurrentRect({ startX: e.clientX - rect.left, startY: e.clientY - rect.top, x: e.clientX - rect.left, y: e.clientY - rect.top, width: 0, height: 0 });
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isDrawing || !canvasRef.current || !currentRect) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        setCurrentRect(prev => ({
            ...prev,
            x: x - prev.startX >= 0 ? prev.startX : x,
            y: y - prev.startY >= 0 ? prev.startY : y,
            width: Math.abs(x - prev.startX),
            height: Math.abs(y - prev.startY)
        }));
    }, [isDrawing, currentRect]);

    const handleMouseUp = useCallback(() => {
        if (currentRect?.width > 10 && currentRect?.height > 10 && imageInfo && canvasRef.current) {
            const scaleX = imageInfo.width / canvasRef.current.width;
            const scaleY = imageInfo.height / canvasRef.current.height;
            setRegions(prev => [...prev, {
                id: Date.now(), x: currentRect.x * scaleX, y: currentRect.y * scaleY,
                width: currentRect.width * scaleX, height: currentRect.height * scaleY,
                displayX: currentRect.x, displayY: currentRect.y,
                displayWidth: currentRect.width, displayHeight: currentRect.height
            }]);
        }
        setIsDrawing(false);
        setCurrentRect(null);
    }, [currentRect, imageInfo]);

    const handleProcessImage = async () => {
        if (!selectedImage || regions.length === 0) return;
        setProcessing(true);
        try {
            const result = await window.api.watermarkRemoveImage({
                filePath: selectedImage,
                regions: regions.map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height, color: options.coverColor })),
                options: { useBlur: options.useBlur, blurAmount: 20, coverColor: options.coverColor }
            });
            if (result.success) {
                alert(`Done! Saved to: ${result.outputPath}`);
                setSelectedImage(null); setImageInfo(null); setRegions([]);
            } else alert(`Failed: ${result.error}`);
        } catch (e) { alert(`Error: ${e.message}`); }
        finally { setProcessing(false); }
    };

    const completedFiles = files.filter(f => f.status === 'completed').length;

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#fafbfc] dark:bg-[#0d1117]">
            {/* Minimal Header */}
            <div className="px-8 py-5 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">Watermark Remover</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Remove watermarks from documents and images instantly</p>
                    </div>
                    {/* Elegant Tab Switch */}
                    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                        {['documents', 'images'].map(m => (
                            <button key={m} onClick={() => { setMode(m); setFiles([]); setSelectedImage(null); setImageInfo(null); setRegions([]); }}
                                className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${mode === m 
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                {m === 'documents' ? 'Documents' : 'Images'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content - Centered */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-5xl mx-auto px-8 py-8">
                    {mode === 'documents' ? (
                        /* ===== DOCUMENT MODE ===== */
                        <div className="space-y-6">
                            {/* Upload Zone */}
                            <div 
                                onClick={!processing ? handleSelectFiles : undefined}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
                                className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer
                                    ${dragOver ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50'}
                                    ${files.length > 0 ? 'p-6' : 'p-16'}`}
                            >
                                {files.length === 0 ? (
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-slate-400 text-3xl">upload_file</span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Drop your files here</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">or click to browse</p>
                                        <div className="flex justify-center gap-3">
                                            <span className="px-3 py-1.5 text-[#E53935] text-xs font-semibold">PDF</span>
                                            <span className="px-3 py-1.5 text-[#2196F3] text-xs font-semibold">DOCX</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {files.map((file, i) => (
                                            <div key={i} className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                                                file.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                                                file.status === 'processing' ? 'bg-primary/5 dark:bg-primary/10' :
                                                file.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20' :
                                                'bg-slate-50 dark:bg-slate-800/50'}`}>
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#E3F2FD] dark:bg-blue-900/30">
                                                    <span className="material-symbols-outlined text-[#2196F3]">
                                                        {file.type === 'PDF' ? 'picture_as_pdf' : 'description'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5 capitalize">{file.status}</p>
                                                </div>
                                                {file.status === 'completed' && <span className="text-emerald-500 material-symbols-outlined">check_circle</span>}
                                                {file.status === 'processing' && <span className="text-primary material-symbols-outlined animate-spin">progress_activity</span>}
                                                {file.status === 'failed' && <span className="text-red-500 material-symbols-outlined">error</span>}
                                                {file.status === 'pending' && !processing && (
                                                    <button onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, j) => j !== i)); }}
                                                        className="text-slate-400 hover:text-red-500 transition-colors">
                                                        <span className="material-symbols-outlined text-xl">close</span>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {!processing && (
                                            <button onClick={(e) => { e.stopPropagation(); handleSelectFiles(); }}
                                                className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 hover:text-primary hover:border-primary/50 transition-all text-sm font-medium">
                                                + Add more files
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Options & Actions */}
                            {files.length > 0 && (
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                                        <input type="checkbox" checked={options.coverMode} onChange={e => setOptions({...options, coverMode: e.target.checked})}
                                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" disabled={processing} />
                                        Cover mode for PDF
                                    </label>
                                    <div className="flex items-center gap-3">
                                        {!processing && files.length > 0 && (
                                            <button onClick={() => { setFiles([]); }} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                                                Clear all
                                            </button>
                                        )}
                                        <button onClick={handleProcess} disabled={processing || files.length === 0}
                                            className="px-6 py-2.5 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] text-white text-sm font-medium rounded-xl  transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                            {processing ? (
                                                <><span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>Processing {completedFiles}/{files.length}</>
                                            ) : (
                                                <><span className="material-symbols-outlined text-lg">auto_fix_high</span>Remove Watermarks</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Info Cards */}
                            <div className="grid grid-cols-3 gap-4 mt-8">
                                {[
                                    { icon: 'description', title: 'Word Documents', desc: 'Remove text & image watermarks' },
                                    { icon: 'picture_as_pdf', title: 'PDF Files', desc: 'Remove annotation & layer watermarks' },
                                    { icon: 'folder_copy', title: 'Batch Processing', desc: 'Process multiple files at once' }
                                ].map((item, i) => (
                                    <div key={i} className="p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                        <span className="material-symbols-outlined text-[#2196F3] text-2xl mb-3 block">{item.icon}</span>
                                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{item.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* ===== IMAGE MODE ===== */
                        <div className="space-y-6">
                            {!selectedImage ? (
                                /* Upload Zone */
                                <div onClick={handleSelectImage}
                                    className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary p-16 cursor-pointer transition-all">
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-slate-400 text-3xl">add_photo_alternate</span>
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Select an image</h3>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">Click to choose a file</p>
                                        <div className="flex justify-center gap-3">
                                            <span className="px-3 py-1.5 text-[#4CAF50] text-xs font-semibold">JPG</span>
                                            <span className="px-3 py-1.5 text-[#2196F3] text-xs font-semibold">PNG</span>
                                            <span className="px-3 py-1.5 text-[#9C27B0] text-xs font-semibold">WebP</span>
                                            <span className="px-3 py-1.5 text-[#FF9800] text-xs font-semibold">GIF</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Image Editor */
                                <div className="space-y-4">
                                    {/* Toolbar */}
                                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-4">
                                            <button onClick={handleSelectImage} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary transition-colors flex items-center gap-2">
                                                <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                                                Change Image
                                            </button>
                                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                                            <span className="text-sm text-slate-500 dark:text-slate-400">
                                                {regions.length} region{regions.length !== 1 ? 's' : ''} selected
                                            </span>
                                            {regions.length > 0 && (
                                                <button onClick={() => setRegions([])} className="text-sm text-red-500 hover:text-red-600 transition-colors">
                                                    Clear all
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                                <input type="checkbox" checked={options.useBlur} onChange={e => setOptions({...options, useBlur: e.target.checked})}
                                                    className="w-4 h-4 rounded border-slate-300 text-primary" disabled={processing} />
                                                Blur effect
                                            </label>
                                            {!options.useBlur && (
                                                <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                    Fill:
                                                    <input type="color" value={options.coverColor} onChange={e => setOptions({...options, coverColor: e.target.value})}
                                                        className="w-7 h-7 rounded-lg cursor-pointer border border-slate-200" disabled={processing} />
                                                </label>
                                            )}
                                            <button onClick={handleProcessImage} disabled={processing || regions.length === 0}
                                                className="px-5 py-2 bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] text-white text-sm font-medium rounded-xl  transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                                {processing ? (
                                                    <><span className="material-symbols-outlined animate-spin">progress_activity</span>Processing</>
                                                ) : (
                                                    <><span className="material-symbols-outlined">check</span>Apply</>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Canvas Area */}
                                    <div className="rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden">
                                        <div className="p-2 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                            <span className="text-xs text-slate-500 dark:text-slate-400 px-2">{selectedImage?.split('\\').pop()}</span>
                                            {imageInfo && <span className="text-xs text-slate-400 px-2">{imageInfo.width} × {imageInfo.height}</span>}
                                        </div>
                                        <div className="p-6 flex items-center justify-center min-h-[400px] bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#fff_0%_50%)] dark:bg-[repeating-conic-gradient(#1e293b_0%_25%,#0f172a_0%_50%)] bg-[length:20px_20px]">
                                            {imageInfo && (
                                                <div className="relative inline-block shadow-2xl rounded-lg overflow-hidden">
                                                    <img src={imageInfo.preview} alt="Preview" className="max-w-full max-h-[55vh] object-contain"
                                                        onLoad={e => { if (canvasRef.current) { canvasRef.current.width = e.target.width; canvasRef.current.height = e.target.height; }}} />
                                                    <canvas ref={canvasRef} className="absolute inset-0 cursor-crosshair" style={{ width: '100%', height: '100%' }}
                                                        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
                                                    
                                                    {regions.map(r => (
                                                        <div key={r.id} className="absolute border-2 border-rose-500 bg-rose-500/20 group"
                                                            style={{ left: r.displayX, top: r.displayY, width: r.displayWidth, height: r.displayHeight }}>
                                                            <button onClick={() => setRegions(prev => prev.filter(x => x.id !== r.id))}
                                                                className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow">
                                                                �?
                                                            </button>
                                                        </div>
                                                    ))}
                                                    
                                                    {currentRect && (
                                                        <div className="absolute border-2 border-dashed border-primary bg-primary/20 pointer-events-none"
                                                            style={{ left: currentRect.x, top: currentRect.y, width: currentRect.width, height: currentRect.height }} />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Help Text */}
                                    <p className="text-center text-sm text-slate-400 dark:text-slate-500">
                                        Drag on the image to select watermark areas �?Click �?to remove a selection
                                    </p>
                                </div>
                            )}

                            {/* Info Cards - Only show when no image */}
                            {!selectedImage && (
                                <div className="grid grid-cols-3 gap-4 mt-8">
                                    {[
                                        { icon: 'gesture', title: 'Select Regions', desc: 'Draw rectangles over watermarks' },
                                        { icon: 'blur_on', title: 'Blur or Fill', desc: 'Choose blur effect or solid color' },
                                        { icon: 'download', title: 'Save Result', desc: 'Original file stays untouched' }
                                    ].map((item, i) => (
                                        <div key={i} className="p-5 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                            <span className="material-symbols-outlined text-[#2196F3] text-2xl mb-3 block">{item.icon}</span>
                                            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{item.title}</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
