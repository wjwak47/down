import React from 'react';
import { changelog } from '../data/changelog';

const Changelog = () => {
    return (
        <div className="flex-1 flex overflow-hidden">
            <section className="flex-1 flex flex-col bg-white dark:bg-background-dark">
                <div className="px-8 pt-8 pb-4">
                    <h1 className="text-3xl font-black tracking-tight text-[#111418] dark:text-white">What's New</h1>
                    <p className="text-slate-500 text-[14px] mt-1">Version history and updates</p>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                    <div className="space-y-6 max-w-4xl">
                        {changelog.map((release, index) => (
                            <div key={release.version} className="bg-white dark:bg-[#1a2633] rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold">Version {release.version}</h2>
                                            <p className="text-blue-100 text-sm mt-1">{release.date}</p>
                                        </div>
                                        {index === 0 && (
                                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">Latest</span>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 space-y-4">
                                    {Object.entries(release.changes).map(([type, items]) => (
                                        <div key={type}>
                                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-bold mb-3 ${type === 'added' ? 'bg-green-50 text-green-600' :
                                                    type === 'improved' ? 'bg-blue-50 text-blue-600' :
                                                        type === 'fixed' ? 'bg-red-50 text-red-600' :
                                                            'bg-slate-100 text-slate-600'
                                                }`}>
                                                <span className="material-symbols-outlined text-sm">
                                                    {type === 'added' ? 'add_circle' : type === 'improved' ? 'upgrade' : 'bug_report'}
                                                </span>
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </div>
                                            <ul className="space-y-2 ml-4">
                                                {items.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-slate-700 dark:text-slate-300 text-sm">
                                                        <span className="text-slate-400 mt-1">•</span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-800 text-center text-sm text-slate-400">
                    <p>Thank you for using ProFlow Studio! 🚀</p>
                </div>
            </section>
        </div>
    );
};

export default Changelog;
