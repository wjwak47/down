import React from 'react';
import { Download, FileVideo, FileText, Archive, Settings } from 'lucide-react';

const NavItem = ({ id, icon: Icon, label, active, onClick }) => (
    <button
        onClick={() => onClick(id)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors duration-200 rounded-lg mb-1
      ${active
                ? 'bg-primary text-white shadow-md'
                : 'text-text-secondary hover:bg-white hover:text-primary'
            }`}
    >
        <Icon size={20} />
        <span>{label}</span>
    </button>
);

const Navigation = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'video', label: 'Video Downloader', icon: Download },
        { id: 'media', label: 'Media Converter', icon: FileVideo },
        { id: 'document', label: 'Document Converter', icon: FileText },
        { id: 'compress', label: 'File Compressor', icon: Archive },
        {
            id: 'watermark', label: 'Watermark Remover', icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24  24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
            )
        }
    ];

    return (
        <div className="w-64 bg-bg-app border-r border-gray-200 flex flex-col h-full p-4">
            <div className="flex items-center gap-3 px-2 mb-8 mt-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                    MT
                </div>
                <h1 className="text-lg font-bold text-text-primary tracking-tight">MultiTool</h1>
            </div>

            <nav className="flex-1">
                {tabs.map(tab => (
                    <NavItem
                        key={tab.id}
                        {...tab}
                        active={activeTab === tab.id}
                        onClick={onTabChange}
                    />
                ))}
            </nav>


        </div>
    );
};

export default Navigation;
