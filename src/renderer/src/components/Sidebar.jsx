import React from 'react';

export const Sidebar = ({ currentPage, onNavigate }) => {
    const navSections = [
        {
            title: 'Main',
            items: [
                { label: 'Dashboard', icon: 'grid_view', page: 'dashboard' },
                { label: 'Download', icon: 'download', page: 'video-downloader' },
            ]
        },
        {
            title: 'Media',
            items: [
                { label: 'Convert', icon: 'movie', page: 'media-converter' },
                { label: 'AI Transcribe', icon: 'mic', page: 'ai-transcriber' },
                { label: 'Watermark', icon: 'cleaning_services', page: 'watermark-remover' },
            ]
        },
        {
            title: 'Files',
            items: [
                { label: 'Document', icon: 'article', page: 'document-converter' },
                { label: 'Compress', icon: 'folder_zip', page: 'file-compressor' },
            ]
        },
        {
            title: 'Other',
            items: [
                { label: 'Updates', icon: 'new_releases', page: 'whats-new' },
            ]
        }
    ];

    return (
        <aside className="w-64 bg-sidebar-light dark:bg-[#15202b] border-r border-[#e5eaf2] dark:border-[#1e2d3d] flex flex-col justify-between p-6 flex-shrink-0 overflow-y-auto custom-scrollbar">
            <div className="flex flex-col gap-8">
                {/* Logo */}
                <div className="flex items-center gap-3 px-2 cursor-pointer" onClick={() => onNavigate('dashboard')}>
                    <div className="bg-primary size-8 rounded-lg flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-xl">rocket_launch</span>
                    </div>
                    <div>
                        <h1 className="text-[#111418] dark:text-white text-base font-semibold leading-tight">ProFlow Studio</h1>
                        <p className="text-slate-blue dark:text-slate-400 text-[10px] font-medium tracking-wider uppercase">Premium Suite</p>
                    </div>
                </div>

                {/* Navigation Sections */}
                <nav className="flex flex-col gap-6">
                    {navSections.map((section) => (
                        <div key={section.title}>
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-3">{section.title}</h3>
                            <div className="flex flex-col gap-1">
                                {section.items.map((item) => (
                                    <div
                                        key={item.page}
                                        onClick={() => onNavigate(item.page)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${currentPage === item.page
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-slate-blue dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
                                            }`}
                                    >
                                        <span className={`material-symbols-outlined text-[18px] ${currentPage === item.page ? 'text-primary' : 'text-slate-blue dark:text-slate-400'}`}>
                                            {item.icon}
                                        </span>
                                        <p className="text-sm font-medium">{item.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {/* Settings */}
                    <div className="pt-4 border-t border-[#e5eaf2] dark:border-[#1e2d3d]">
                        <div
                            onClick={() => onNavigate('settings')}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${currentPage === 'settings'
                                ? 'bg-primary/10 text-primary'
                                : 'text-slate-blue dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-[18px] ${currentPage === 'settings' ? 'text-primary' : 'text-slate-blue dark:text-slate-400'}`}>
                                settings
                            </span>
                            <p className="text-sm font-medium">Settings</p>
                        </div>
                    </div>
                </nav>
            </div>

            {/* Bottom Section - Support + User */}
            <div className="flex flex-col gap-4 mt-4">
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-blue dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
                    <span className="material-symbols-outlined text-slate-blue dark:text-slate-400">help_outline</span>
                    <p className="text-sm font-medium">Support</p>
                </div>
                <div className="flex items-center gap-3 px-2 py-2 border-t border-[#e5eaf2] dark:border-[#1e2d3d] pt-4">
                    <div className="size-8 rounded-full bg-center bg-no-repeat bg-cover bg-slate-200" style={{ backgroundImage: `url('https://picsum.photos/seed/alex/64/64')` }}></div>
                    <div className="flex flex-col">
                        <p className="text-[#111418] dark:text-white text-xs font-semibold">Alex Sterling</p>
                        <p className="text-slate-blue dark:text-slate-400 text-[10px]">Pro Member</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};
