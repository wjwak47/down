import React from 'react';
import { Download, FileVideo, FileText, Archive, Settings, Sparkles } from 'lucide-react';

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
        // 核心功能：视频下载
        { id: 'video', label: 'Video Downloader', icon: Download },

        // 视频配套功能：转录字幕
        {
            id: 'transcribe', label: 'AI Transcriber', icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
            )
        },

        // 视频配套功能：去水印
        {
            id: 'watermark', label: 'Watermark Remover', icon: () => (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
            )
        },

        // 媒体处理工具
        { id: 'media', label: 'Media Converter', icon: FileVideo },

        // 文档处理工具
        { id: 'document', label: 'Document Converter', icon: FileText },

        // 通用工具
        { id: 'compress', label: 'File Compressor', icon: Archive },

        // 更新日志
        { id: 'changelog', label: 'What\'s New', icon: Sparkles }
    ];

    return (
        <div className="w-64 bg-bg-app border-r border-gray-200 flex flex-col h-full p-4">
            <div className="px-2 mb-8 mt-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0ea5e9] rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                        PF
                    </div>
                    <div className="flex-1">
                        <h1 className="text-lg font-bold text-text-primary tracking-tight leading-tight">ProFlow Studio</h1>
                        <p className="text-[10px] text-gray-400">v1.1.0 | by jonshon</p>
                    </div>
                </div>
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
