/**
 * ParsingAnimation Component - Matches ProFlow Studio style
 */
function ParsingAnimation() {
    const steps = [
        { id: 1, label: 'Connecting to server', icon: 'language' },
        { id: 2, label: 'Fetching video info', icon: 'movie' },
        { id: 3, label: 'Extracting formats', icon: 'format_list_bulleted' },
        { id: 4, label: 'Calculating file sizes', icon: 'storage' }
    ];

    return (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
            <div className="flex flex-col items-center">
                {/* Animated Icon */}
                <div className="relative mb-5">
                    <div className="w-16 h-16 rounded-2xl bg-[#E3F2FD] dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#2196F3] text-3xl animate-pulse">download</span>
                    </div>
                </div>

                <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
                    Parsing Video
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                    Please wait while we fetch video details...
                </p>

                {/* Progress Steps */}
                <div className="w-full max-w-xs space-y-2">
                    {steps.map((step, index) => (
                        <div 
                            key={step.id}
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50"
                            style={{ 
                                animation: `fadeInUp 0.3s ease-out ${index * 0.15}s both`,
                                opacity: 0
                            }}
                        >
                            <span className="material-symbols-outlined text-[#2196F3] text-lg">{step.icon}</span>
                            <span className="flex-1 text-xs text-slate-600 dark:text-slate-300">
                                {step.label}
                            </span>
                            <span className="material-symbols-outlined text-[#2196F3] text-base animate-spin">progress_activity</span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}

export default ParsingAnimation;
