
import React, { useState } from 'react';

export const MediaDownloader: React.FC = () => {
  const [url, setUrl] = useState('https://vimeo.com/creative/high-quality-render-0042');

  const downloads = [
    { name: 'Campaign_Launch_Main_4K.mp4', size: '1.2 GB', current: '842.4 MB', speed: '12 MB/s', progress: 75, status: 'Active', icon: 'video_camera_back' },
    { name: 'Interview_Audio_Draft.wav', size: '42.0 MB', current: '18.1 MB', speed: '5 MB/s', progress: 42, status: 'Active', icon: 'music_note' },
    { name: 'Assets_Branding_Pack.zip', size: '120.5 MB', current: '0 MB', speed: '0 MB/s', progress: 0, status: 'Paused', icon: 'image' },
    { name: 'Social_Post_Export_01.mp4', size: '15.4 MB', current: '15.4 MB', speed: '0 MB/s', progress: 100, status: 'Completed', icon: 'check_circle' },
  ];

  return (
    <div className="max-w-[960px] mx-auto px-6 py-12 flex flex-col gap-8 w-full">
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="w-full max-w-[720px]">
          <label className="flex flex-col h-14 w-full rounded-xl overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-primary/10">
            <div className="flex w-full flex-1 items-stretch rounded-xl h-full border border-[#e5e7eb] dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="text-[#617589] flex items-center justify-center pl-5">
                <span className="material-symbols-outlined text-[22px]">link</span>
              </div>
              <input 
                className="form-input flex w-full min-w-0 flex-1 border-none bg-transparent focus:ring-0 h-full placeholder:text-slate-400 px-4 text-base font-normal" 
                placeholder="Paste URL here to fetch media..." 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <div className="flex items-center justify-center pr-3">
                <button className="bg-primary text-white p-2 rounded-lg flex items-center justify-center hover:bg-primary/90 transition-colors">
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>
          </label>
          <p className="text-xs text-slate-400 mt-3 text-center">Supports YouTube, Vimeo, Soundcloud, and direct CDN links</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-[#f0f2f4] dark:border-slate-800 p-6 flex flex-col gap-2 shadow-sm">
        <div className="flex items-center justify-between px-2 pb-4 pt-2">
          <h3 className="text-slate-500 text-xs font-bold leading-tight tracking-widest uppercase">ACTIVE DOWNLOADS</h3>
          <button className="border border-primary text-primary hover:bg-primary/5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">download</span>
            Download All
          </button>
        </div>

        <div className="flex flex-col">
          {downloads.map((dl, i) => (
            <div key={i} className="flex items-center gap-4 bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 px-4 min-h-[72px] py-3 justify-between transition-colors rounded-xl group">
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center rounded-xl shrink-0 size-12 ${
                  dl.status === 'Completed' ? 'bg-green-50 text-green-500' : 
                  dl.status === 'Paused' ? 'bg-slate-100 text-slate-400' : 'bg-primary/10 text-primary'
                }`}>
                  <span className="material-symbols-outlined">{dl.icon}</span>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-[#111418] dark:text-slate-100 text-base font-medium leading-normal line-clamp-1">{dl.name}</p>
                  <p className="text-slate-400 text-sm font-normal">
                    {dl.status === 'Completed' ? `Completed • ${dl.size}` : 
                     dl.status === 'Paused' ? `Paused • ${dl.size} remaining` : 
                     `${dl.current} / ${dl.size} • ${dl.speed}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="shrink-0 flex items-center gap-2">
                  {dl.status === 'Active' && (
                    <>
                      <span className="text-primary text-sm font-bold">{dl.progress}%</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                    </>
                  )}
                  {dl.status === 'Paused' && (
                    <span className="text-slate-400 text-sm font-medium">Paused</span>
                  )}
                  {dl.status === 'Completed' && (
                    <button className="text-primary hover:underline text-sm font-semibold">Open Folder</button>
                  )}
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-400 hover:text-red-500">
                  <span className="material-symbols-outlined text-[20px]">{dl.status === 'Completed' ? 'delete' : 'close'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="mt-8 flex justify-center gap-12 text-slate-400 text-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">verified</span>
          <span>Secure Transfer</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">bolt</span>
          <span>Multi-threaded Engine</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">folder_open</span>
          <span>Auto-organize Files</span>
        </div>
      </footer>
    </div>
  );
};
