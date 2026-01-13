
import React from 'react';
import { Screen } from '../types';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentScreen, onNavigate }) => {
  const navItems = [
    { label: 'Dashboard', icon: 'grid_view', screen: Screen.Dashboard },
    { label: 'Projects', icon: 'inventory_2', screen: Screen.Processing },
    { label: 'Assets', icon: 'folder_open', screen: Screen.Downloader },
    { label: 'Archive', icon: 'archive', screen: Screen.Library },
  ];

  return (
    <aside className="w-64 bg-sidebar-light dark:bg-[#15202b] border-r border-[#e5eaf2] dark:border-[#1e2d3d] flex flex-col justify-between p-6 flex-shrink-0">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2 cursor-pointer" onClick={() => onNavigate(Screen.Dashboard)}>
          <div className="bg-primary size-8 rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">rocket_launch</span>
          </div>
          <div>
            <h1 className="text-[#111418] dark:text-white text-base font-semibold leading-tight">ProFlow Studio</h1>
            <p className="text-slate-blue dark:text-slate-400 text-[10px] font-medium tracking-wider uppercase">Premium Suite</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <div
              key={item.screen}
              onClick={() => onNavigate(item.screen)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                currentScreen === item.screen
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-blue dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <span className={`material-symbols-outlined ${currentScreen === item.screen ? 'text-primary' : 'text-slate-blue dark:text-slate-400'}`}>
                {item.icon}
              </span>
              <p className="text-sm font-medium">{item.label}</p>
            </div>
          ))}
          
          <div className="mt-4 pt-4 border-t border-[#e5eaf2] dark:border-[#1e2d3d]">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-blue dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
              <span className="material-symbols-outlined text-slate-blue dark:text-slate-400">settings</span>
              <p className="text-sm font-medium">Settings</p>
            </div>
          </div>
        </nav>
      </div>

      <div className="flex flex-col gap-4">
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
