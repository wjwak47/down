
import React, { useState } from 'react';
import { Asset } from '../types';

export const FileProcessing: React.FC = () => {
  const [assets] = useState<Asset[]>([
    { id: '1', name: 'interview_recording_01.mp4', status: 'Processing', progress: 65, size: '1.2 GB', type: 'video', timeLeft: '42s' },
    { id: '2', name: 'background_music_v2.wav', status: 'Ready', progress: 0, size: '45 MB', type: 'audio' },
    { id: '3', name: 'transcript_draft.docx', status: 'Completed', progress: 100, size: '1.2 MB', type: 'document' },
  ]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Table Section */}
      <section className="flex-1 flex flex-col bg-white dark:bg-background-dark border-r border-[#e5eaf2] dark:border-[#1e2d3d]">
        <div className="px-8 pt-8 pb-4 flex flex-wrap justify-between items-end gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black tracking-tight text-[#111418] dark:text-white">File Processing</h1>
            <p className="text-slate-500 text-[14px]">Refining {assets.length} assets for Project Alpha.</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 h-9 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-900 dark:text-white text-sm font-semibold rounded-lg transition-all">
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>Add Files</span>
            </button>
            <button className="flex items-center gap-2 h-9 px-4 bg-primary hover:bg-primary/90 text-white text-sm font-semibold rounded-lg shadow-sm transition-all">
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              <span>Process All</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900 text-slate-500 text-[12px] uppercase tracking-wider font-semibold">
                  <th className="px-6 py-4">Asset Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Progress</th>
                  <th className="px-6 py-4 text-right">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded flex items-center justify-center ${
                          asset.type === 'video' ? 'bg-primary/10 text-primary' : 
                          asset.type === 'audio' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className="material-symbols-outlined text-[20px]">
                            {asset.type === 'video' ? 'movie' : asset.type === 'audio' ? 'audio_file' : 'description'}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-200">{asset.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-bold ${
                        asset.status === 'Processing' ? 'bg-blue-50 text-blue-600' :
                        asset.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-slate-100 text-slate-500 uppercase tracking-tight'
                      }`}>
                        {asset.status === 'Processing' && <span className="size-1.5 rounded-full bg-blue-600 animate-pulse"></span>}
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-2 w-full max-w-[180px]">
                        <div className={`flex justify-between items-center text-[11px] font-bold ${asset.status === 'Completed' ? 'text-emerald-600' : 'text-slate-400'}`}>
                          <span>{asset.progress}%</span>
                          {asset.timeLeft && <span className="opacity-0 group-hover:opacity-100 transition-opacity">~ {asset.timeLeft} left</span>}
                        </div>
                        <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${asset.status === 'Completed' ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${asset.progress}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right text-sm text-slate-500 font-medium">{asset.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-8 p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-4 text-center">
            <div className="size-12 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined text-[32px]">upload_file</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Drag more assets here</p>
              <p className="text-xs text-slate-400 mt-1">Supports MP4, WAV, DOCX, and PDF up to 2GB</p>
            </div>
          </div>
        </div>

        <div className="h-12 border-t border-slate-100 dark:border-slate-800 px-8 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-slate-400">
          <div className="flex gap-4">
            <span>{assets.length} Assets Total</span>
            <span>1.29 GB Total Size</span>
          </div>
          <div className="flex gap-4">
            <span>Auto-Save: Active</span>
            <span className="flex items-center gap-1 text-emerald-500">
              <span className="size-1.5 bg-emerald-500 rounded-full"></span>
              System Online
            </span>
          </div>
        </div>
      </section>

      {/* Sidebar Properties Section */}
      <aside className="w-80 border-l border-[#e5eaf2] dark:border-[#1e2d3d] flex flex-col bg-white dark:bg-[#1a2633] overflow-y-auto custom-scrollbar">
        <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-[14px] font-bold tracking-tight uppercase text-slate-900 dark:text-white">Task Properties</h2>
          <button className="size-7 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
          </button>
        </div>
        <div className="flex-1 p-6 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[12px] font-bold text-primary uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">settings</span>
              Export Configuration
            </div>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Output Format</span>
                <select className="w-full h-10 px-3 bg-input-tint dark:bg-slate-800 border-none rounded-lg text-sm font-medium focus:ring-1 focus:ring-primary cursor-pointer text-slate-900 dark:text-white">
                  <option>MP4 Video (H.264)</option>
                  <option>MOV Quicktime</option>
                  <option>MP3 Audio</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">Quality Preset</span>
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <button className="py-1.5 text-[11px] font-bold rounded bg-white dark:bg-slate-700 shadow-sm text-primary">480p</button>
                  <button className="py-1.5 text-[11px] font-bold text-slate-400">720p</button>
                  <button className="py-1.5 text-[11px] font-bold text-slate-400">1080p</button>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[12px] font-bold text-primary uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              AI Processing Tools
            </div>
            <div className="space-y-4">
              {[
                { label: 'AI Speech Enhancement', desc: 'Removes background noise', enabled: true },
                { label: 'Auto-Transcribe', desc: 'Generate .srt and .vtt', enabled: true },
                { label: 'Scene Detection', desc: 'Marker insertion at cuts', enabled: false }
              ].map((tool) => (
                <div key={tool.label} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-slate-900 dark:text-white">{tool.label}</span>
                    <span className="text-[11px] text-slate-400 leading-tight">{tool.desc}</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${tool.enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}>
                    <div className={`size-3 bg-white rounded-full transition-transform ${tool.enabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
          <button className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95">
            <span>Start Processing</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
          <p className="text-[10px] text-center mt-3 text-slate-400 font-medium">Estimated time: 14 mins</p>
        </div>
      </aside>
    </div>
  );
};
