import { useGlobalTasks } from '../contexts/GlobalTaskContext';

// 任务徽章组件
const TaskBadge = ({ count, type }) => {
    if (count === 0) return null;
    
    const colors = {
        download: 'bg-blue-500',
        crack: 'bg-violet-500',
        default: 'bg-primary'
    };
    
    return (
        <span className={`ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full ${colors[type] || colors.default} text-white text-[10px] font-bold flex items-center justify-center`}>
            {count > 99 ? '99+' : count}
        </span>
    );
};

export const Sidebar = ({ currentPage, onNavigate }) => {
    const { derivedState } = useGlobalTasks();
    const { activeDownloadCount, activeCrackJobCount } = derivedState;
    
    const navSections = [
        {
            title: 'Main',
            items: [
                { label: 'Dashboard', icon: 'grid_view', page: 'dashboard' },
                { label: 'Download', icon: 'download', page: 'video-downloader', badgeCount: activeDownloadCount, badgeType: 'download' },
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
                { label: 'Compress', icon: 'folder_zip', page: 'file-compressor', badgeCount: activeCrackJobCount, badgeType: 'crack' },
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
                                        {item.badgeCount !== undefined && (
                                            <TaskBadge count={item.badgeCount} type={item.badgeType} />
                                        )}
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

            {/* Bottom Section - Settings only */}
            <div className="flex flex-col gap-4 mt-4">
                {/* Settings moved to bottom for cleaner look */}
            </div>
        </aside>
    );
};
