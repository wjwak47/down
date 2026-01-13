
import React, { useState } from 'react';
import { Screen } from '../types';
import { processCommand } from '../services/geminiService';

interface DashboardProps {
  onNavigate: (screen: Screen) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [inputValue, setInputValue] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleProcess = async () => {
    if (!inputValue.trim()) return;
    setIsLoading(true);
    const response = await processCommand(inputValue);
    setAiResponse(response);
    setIsLoading(false);
    setTimeout(() => {
        onNavigate(Screen.Processing);
    }, 2000);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10">
      <div className="max-w-4xl w-full flex flex-col gap-12">
        <div className="text-center space-y-2">
          <h2 className="text-[#111418] dark:text-white text-4xl font-bold tracking-tight">What are we working on?</h2>
          <p className="text-slate-blue dark:text-slate-400 text-lg">The center of your creative production</p>
        </div>

        <div className="bg-white dark:bg-[#1a2633] rounded-xl focus-card-shadow p-2">
          <div className="border-2 border-dashed border-[#e5eaf2] dark:border-[#2a3b4d] rounded-lg flex flex-col items-center justify-center p-16 gap-8">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="size-20 bg-primary/5 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-4xl">cloud_upload</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-[#111418] dark:text-white leading-tight">Universal Drop Zone</h3>
                <p className="text-slate-blue dark:text-slate-400 text-sm">Ready for input. Drag and drop files here to begin.</p>
              </div>
            </div>

            <div className="w-full max-w-md flex flex-col gap-4">
              <div className="flex w-full items-stretch">
                <input 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 border border-[#dbe0e6] dark:border-[#2a3b4d] bg-white dark:bg-[#1a2633] text-[#111418] dark:text-white h-12 px-4 rounded-l-lg text-sm focus:outline-none focus:border-primary placeholder:text-slate-400" 
                  placeholder="Paste a URL or type a command..." 
                />
                <div className="bg-[#f0f2f4] dark:bg-[#2a3b4d] border border-l-0 border-[#dbe0e6] dark:border-[#2a3b4d] px-4 flex items-center rounded-r-lg text-slate-blue">
                  <span className="material-symbols-outlined text-xl">link</span>
                </div>
              </div>
              <button 
                onClick={handleProcess}
                disabled={isLoading}
                className={`w-full bg-primary hover:bg-primary/90 text-white font-medium py-3 rounded-lg transition-all shadow-sm active:scale-95 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Thinking...' : 'Start Processing'}
              </button>
              {aiResponse && (
                <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-300 animate-fade-in">
                  <span className="font-bold">AI Assistant:</span> {aiResponse}
                </div>
              )}
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-[#f0f2f4] dark:border-[#2a3b4d] w-full justify-center">
              {[
                { label: 'New Folder', icon: 'create_new_folder' },
                { label: 'Scan', icon: 'document_scanner' },
                { label: 'Voice Memo', icon: 'mic' }
              ].map((action) => (
                <div key={action.label} className="flex flex-col items-center gap-1 group cursor-pointer">
                  <div className="size-10 rounded-lg bg-background-light dark:bg-[#253444] flex items-center justify-center text-slate-blue group-hover:bg-primary group-hover:text-white transition-all">
                    <span className="material-symbols-outlined text-xl">{action.icon}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{action.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center px-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <p className="text-xs text-slate-blue dark:text-slate-400 font-medium">System Ready — Last active 2m ago</p>
          </div>
          <div className="flex gap-4">
            <a className="text-xs text-primary font-semibold hover:underline" href="#">View Recent Activity</a>
            <a className="text-xs text-slate-blue dark:text-slate-400 font-medium hover:underline" href="#">Export Log</a>
          </div>
        </div>
      </div>
    </div>
  );
};
