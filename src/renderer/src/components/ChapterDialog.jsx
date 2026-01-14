/**
 * ChapterDialog Component
 * Displays video chapters with option to download as separate files
 * 
 * Requirements: 9.1
 */

import { useState, useEffect } from 'react';
import { formatTime, formatDuration } from '../utils/chapterExtractor';

function ChapterDialog({ isOpen, onClose, chapters, videoInfo, onDownloadChapters }) {
    const [selectedChapters, setSelectedChapters] = useState(new Set());
    const [selectAll, setSelectAll] = useState(true);
    const [downloadMode, setDownloadMode] = useState('separate'); // 'separate' or 'single'

    // Initialize with all chapters selected
    useEffect(() => {
        if (chapters?.length > 0) {
            setSelectedChapters(new Set(chapters.map(c => c.index)));
            setSelectAll(true);
        }
    }, [chapters]);

    if (!isOpen || !chapters || chapters.length === 0) return null;

    const handleToggleChapter = (index) => {
        setSelectedChapters(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            setSelectAll(newSet.size === chapters.length);
            return newSet;
        });
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedChapters(new Set());
            setSelectAll(false);
        } else {
            setSelectedChapters(new Set(chapters.map(c => c.index)));
            setSelectAll(true);
        }
    };

    const handleDownload = () => {
        const selected = chapters.filter(c => selectedChapters.has(c.index));
        onDownloadChapters(selected, downloadMode);
        onClose();
    };

    const totalDuration = chapters
        .filter(c => selectedChapters.has(c.index))
        .reduce((sum, c) => sum + (c.duration || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                                Video Chapters
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                {chapters.length} chapters • {selectedChapters.size} selected
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Download Mode Selection */}
                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Download as:</span>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="downloadMode"
                                value="separate"
                                checked={downloadMode === 'separate'}
                                onChange={() => setDownloadMode('separate')}
                                className="text-[#2196F3] focus:ring-[#2196F3]"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Separate files</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="downloadMode"
                                value="single"
                                checked={downloadMode === 'single'}
                                onChange={() => setDownloadMode('single')}
                                className="text-[#2196F3] focus:ring-[#2196F3]"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Single file with chapters</span>
                        </label>
                    </div>
                </div>

                {/* Select All */}
                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={selectAll}
                            onChange={handleSelectAll}
                            className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-[#2196F3] focus:ring-[#2196F3] focus:ring-offset-0"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Select All
                        </span>
                    </label>
                </div>

                {/* Chapter List */}
                <div className="flex-1 overflow-auto">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {chapters.map((chapter) => (
                            <label
                                key={chapter.index}
                                className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors ${
                                    selectedChapters.has(chapter.index)
                                        ? 'bg-blue-50 dark:bg-blue-900/20'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedChapters.has(chapter.index)}
                                    onChange={() => handleToggleChapter(chapter.index)}
                                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-[#2196F3] focus:ring-[#2196F3] focus:ring-offset-0 flex-shrink-0"
                                />
                                
                                {/* Chapter Number */}
                                <span className="w-8 text-sm text-slate-400 dark:text-slate-500 text-center flex-shrink-0">
                                    {chapter.index}
                                </span>

                                {/* Chapter Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                                        {chapter.title}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                                        <span>{formatTime(chapter.start_time)}</span>
                                        <span className="text-slate-300 dark:text-slate-600">→</span>
                                        <span>{formatTime(chapter.end_time)}</span>
                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                        <span>{formatDuration(chapter.duration)}</span>
                                    </p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {selectedChapters.size} of {chapters.length} chapters • Total: {formatDuration(totalDuration)}
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={selectedChapters.size === 0}
                                className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#2196F3] to-[#42A5F5] hover:from-[#1E88E5] hover:to-[#2196F3] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download {selectedChapters.size > 0 ? `(${selectedChapters.size})` : ''}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChapterDialog;
