import React from 'react';

export const TopNavBar = ({ currentPage, onNavigate }) => {
    const getBreadcrumb = () => {
        const breadcrumbs = {
            'dashboard': 'General',
            'video-downloader': 'Media Downloader',
            'ai-transcriber': 'Video Assets / Converter',
            'watermark-remover': 'File Processing',
            'media-converter': 'File Processing',
            'document-converter': 'File Processing',
            'file-compressor': 'File Processing',
            'whats-new': 'Task History'
        };
        return breadcrumbs[currentPage] || 'General';
    };

    return (
        <header className="flex items-center justify-between px-10 py-5 bg-white/50 dark:bg-background-dark/50 backdrop-blur-sm sticky top-0 z-10 border-b border-[#e5eaf2] dark:border-[#1e2d3d]">
            <div className="flex items-center gap-4">
                <p className="text-slate-blue dark:text-slate-400 text-sm font-medium">
                    Workspace / <span className="text-[#111418] dark:text-white font-semibold">{getBreadcrumb()}</span>
                </p>
            </div>
        </header>
    );
};
