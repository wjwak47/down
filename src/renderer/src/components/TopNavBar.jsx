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
            <div className="flex items-center gap-6">
                <div className="relative group hidden md:block">
                    <label className="flex items-center bg-[#f0f2f4] dark:bg-[#1e2d3d] rounded-lg px-3 py-1.5 w-64 border border-transparent focus-within:border-primary/50 transition-all">
                        <span className="material-symbols-outlined text-slate-blue text-sm">search</span>
                        <input
                            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 text-[#111418] dark:text-white ml-2"
                            placeholder="Search workflow..."
                            type="text"
                        />
                    </label>
                </div>
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-slate-blue dark:text-slate-400 cursor-pointer hover:text-primary transition-colors">notifications</span>
                    <div className="size-8 rounded-full bg-slate-200 border-2 border-primary/20 bg-cover bg-center" style={{ backgroundImage: `url('https://picsum.photos/seed/user123/64/64')` }}></div>
                </div>
            </div>
        </header>
    );
};
