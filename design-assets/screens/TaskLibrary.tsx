
import React from 'react';
import { Task } from '../types';

export const TaskLibrary: React.FC = () => {
  const tasks: Task[] = [
    { id: '1', identifier: 'Q3 Architecture Review', category: 'ENG-492 · Infrastructure', status: 'COMPLETED', modifiedAt: 'Oct 24, 2023 · 2:15 PM', duration: '4h 32m' },
    { id: '2', identifier: 'User Persona Workshop', category: 'DSGN-102 · Research', status: 'IN PROGRESS', modifiedAt: 'Oct 24, 2023 · 11:02 AM', duration: '12h 15m' },
    { id: '3', identifier: 'API Documentation Sync', category: 'DOCS-05 · Technical', status: 'ARCHIVED', modifiedAt: 'Oct 23, 2023 · 9:45 AM', duration: '1h 10m' },
    { id: '4', identifier: 'Marketing Landing Page', category: 'MKTG-88 · Growth', status: 'COMPLETED', modifiedAt: 'Oct 22, 2023 · 5:20 PM', duration: '22h 40m' },
    { id: '5', identifier: 'Database Migration v2', category: 'OPS-221 · Infrastructure', status: 'FAILED', modifiedAt: 'Oct 22, 2023 · 1:00 PM', duration: '0h 45m' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-8 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-[#111418] dark:text-white tracking-tight">Task Library</h2>
            <p className="text-[#617589] text-sm font-normal">Showing 1,284 entries from your historical workflow data.</p>
          </div>
          <div className="flex gap-2">
            <button className="h-9 px-4 rounded-lg bg-white dark:bg-slate-800 border border-[#f0f2f4] dark:border-slate-700 text-[#111418] dark:text-white text-xs font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined text-lg">download</span>
              Export CSV
            </button>
            <button className="h-9 px-4 rounded-lg bg-white dark:bg-slate-800 border border-[#f0f2f4] dark:border-slate-700 text-[#111418] dark:text-white text-xs font-bold flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              <span className="material-symbols-outlined text-lg">view_stream</span>
              Display Options
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button className="h-8 flex items-center gap-2 px-3 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20">
            <span className="material-symbols-outlined text-base">calendar_today</span>
            Last 30 Days
            <span className="material-symbols-outlined text-base">close</span>
          </button>
          {['Status: All', 'Category: Development', 'Assignee'].map((filter) => (
            <button key={filter} className="h-8 flex items-center gap-2 px-3 rounded-lg bg-white dark:bg-slate-800 border border-[#f0f2f4] dark:border-slate-700 text-[#617589] text-xs font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
              {filter}
              <span className="material-symbols-outlined text-base">expand_more</span>
            </button>
          ))}
          <div className="h-4 w-[1px] bg-[#f0f2f4] dark:bg-slate-700 mx-1"></div>
          <button className="text-xs font-bold text-primary hover:underline">Clear all filters</button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-[#1a242d] rounded-xl border border-[#f0f2f4] dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-white dark:bg-[#1a242d] z-10 border-b border-[#f0f2f4] dark:border-slate-800">
              <tr className="text-[#617589] text-[10px] font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Task Identifier</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Modified</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]/50 dark:divide-slate-800/50">
              {tasks.map((task) => (
                <tr key={task.id} className="group hover:bg-primary/[0.03] transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`size-2 rounded-full ${
                        task.status === 'COMPLETED' ? 'bg-blue-500' :
                        task.status === 'IN PROGRESS' ? 'bg-orange-500' :
                        task.status === 'FAILED' ? 'bg-red-500' : 'bg-gray-400'
                      }`}></div>
                      <div>
                        <p className="text-sm font-bold text-[#111418] dark:text-white">{task.identifier}</p>
                        <p className="text-[11px] text-[#617589] font-medium tracking-tight">{task.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      task.status === 'IN PROGRESS' ? 'bg-blue-100 text-blue-700' :
                      task.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-[#617589]">{task.modifiedAt}</td>
                  <td className="px-6 py-3 text-sm font-medium text-[#111418] dark:text-slate-300">{task.duration}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
                      {['visibility', 'share', 'delete'].map((action) => (
                        <button key={action} className={`p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-600 ${action === 'delete' ? 'text-red-500' : 'text-[#617589]'} transition-all`}>
                          <span className="material-symbols-outlined text-[18px]">{action}</span>
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-[#f0f2f4] dark:border-slate-800 flex items-center justify-between bg-white dark:bg-[#1a242d]">
          <p className="text-xs text-[#617589] font-medium">
            Showing <span className="text-[#111418] dark:text-white font-bold">1-50</span> of <span className="text-[#111418] dark:text-white font-bold">1,284</span> tasks
          </p>
          <div className="flex items-center gap-1">
            <button className="size-8 flex items-center justify-center rounded-lg border border-[#f0f2f4] dark:border-slate-700 text-[#617589] opacity-50">
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button className="size-8 flex items-center justify-center rounded-lg bg-primary text-white text-xs font-bold">1</button>
            <button className="size-8 flex items-center justify-center rounded-lg hover:bg-background-light dark:hover:bg-slate-800 text-xs font-bold">2</button>
            <button className="size-8 flex items-center justify-center rounded-lg border border-[#f0f2f4] dark:border-slate-700 text-[#617589] hover:bg-background-light">
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
