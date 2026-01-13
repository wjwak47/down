
import React from 'react';
import { Screen } from '../types';

interface HeaderProps {
  currentScreen: Screen;
}

export const Header: React.FC<HeaderProps> = ({ currentScreen }) => {
  const getBreadcrumb = () => {
    switch (currentScreen) {
      case Screen.Dashboard: return 'General';
      case Screen.Processing: return 'Video Assets / Converter';
      case Screen.Downloader: return 'Media Downloader';
      case Screen.Library: return 'Task History';
      default: return 'General';
    }
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
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-400 text-[#111418] dark:text-white" 
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
