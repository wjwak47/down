import React, { createContext, useContext, useState, useCallback } from 'react';

// Toast Context
const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

// Toast Types with icons and colors
const TOAST_TYPES = {
    success: {
        icon: 'check_circle',
        bgColor: 'bg-green-50 dark:bg-green-900/30',
        borderColor: 'border-green-200 dark:border-green-800',
        iconColor: 'text-green-500',
        textColor: 'text-green-800 dark:text-green-200'
    },
    error: {
        icon: 'error',
        bgColor: 'bg-red-50 dark:bg-red-900/30',
        borderColor: 'border-red-200 dark:border-red-800',
        iconColor: 'text-red-500',
        textColor: 'text-red-800 dark:text-red-200'
    },
    warning: {
        icon: 'warning',
        bgColor: 'bg-amber-50 dark:bg-amber-900/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
        iconColor: 'text-amber-500',
        textColor: 'text-amber-800 dark:text-amber-200'
    },
    info: {
        icon: 'info',
        bgColor: 'bg-blue-50 dark:bg-blue-900/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        iconColor: 'text-blue-500',
        textColor: 'text-blue-800 dark:text-blue-200'
    },
    // 任务完成通知类型
    downloadComplete: {
        icon: 'download_done',
        bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        iconColor: 'text-emerald-500',
        textColor: 'text-emerald-800 dark:text-emerald-200'
    },
    downloadFailed: {
        icon: 'error_outline',
        bgColor: 'bg-rose-50 dark:bg-rose-900/30',
        borderColor: 'border-rose-200 dark:border-rose-800',
        iconColor: 'text-rose-500',
        textColor: 'text-rose-800 dark:text-rose-200'
    },
    crackComplete: {
        icon: 'lock_open',
        bgColor: 'bg-violet-50 dark:bg-violet-900/30',
        borderColor: 'border-violet-200 dark:border-violet-800',
        iconColor: 'text-violet-500',
        textColor: 'text-violet-800 dark:text-violet-200'
    },
    crackFailed: {
        icon: 'lock',
        bgColor: 'bg-slate-50 dark:bg-slate-900/30',
        borderColor: 'border-slate-200 dark:border-slate-800',
        iconColor: 'text-slate-500',
        textColor: 'text-slate-800 dark:text-slate-200'
    }
};

// Single Toast Component
const Toast = ({ id, message, type = 'info', title, onClick, onClose, actionLabel, onAction }) => {
    const config = TOAST_TYPES[type] || TOAST_TYPES.info;
    const isClickable = !!onClick;

    const handleClick = (e) => {
        if (onClick && e.target.tagName !== 'BUTTON') {
            onClick();
            onClose(id);
        }
    };

    return (
        <div
            onClick={handleClick}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm animate-slide-in ${config.bgColor} ${config.borderColor} ${isClickable ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''}`}
            style={{ animation: 'slideIn 0.3s ease-out' }}
        >
            <span className={`material-symbols-outlined mt-0.5 ${config.iconColor}`}>
                {config.icon}
            </span>
            <div className="flex-1 min-w-0">
                {title && (
                    <p className={`text-sm font-semibold ${config.textColor} truncate`}>
                        {title}
                    </p>
                )}
                <p className={`text-sm ${title ? 'text-slate-600 dark:text-slate-400' : `font-medium ${config.textColor}`} ${title ? '' : ''}`}>
                    {message}
                </p>
                {actionLabel && onAction && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onAction(); onClose(id); }}
                        className="mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                        {actionLabel}
                    </button>
                )}
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onClose(id); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0"
            >
                <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
        </div>
    );
};

// Toast Container
const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-80">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    {...toast}
                    onClose={removeToast}
                />
            ))}
        </div>
    );
};

// Toast Provider
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((options) => {
        // 支持简单调用 addToast(message, type, duration) 或对象调用
        let toastOptions = {};
        if (typeof options === 'string') {
            toastOptions = { message: options };
        } else {
            toastOptions = options;
        }

        const id = Date.now() + Math.random();
        const { message, type = 'info', title, onClick, actionLabel, onAction, duration = 4000 } = toastOptions;
        
        setToasts(prev => [...prev, { id, message, type, title, onClick, actionLabel, onAction }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // 简单的 toast 方法
    const toast = {
        success: (msg, duration) => addToast({ message: msg, type: 'success', duration }),
        error: (msg, duration) => addToast({ message: msg, type: 'error', duration }),
        warning: (msg, duration) => addToast({ message: msg, type: 'warning', duration }),
        info: (msg, duration) => addToast({ message: msg, type: 'info', duration }),
        
        // 任务完成通知方法
        downloadComplete: (options) => addToast({ 
            ...options, 
            type: 'downloadComplete',
            duration: options.duration || 5000 
        }),
        downloadFailed: (options) => addToast({ 
            ...options, 
            type: 'downloadFailed',
            duration: options.duration || 6000 
        }),
        crackComplete: (options) => addToast({ 
            ...options, 
            type: 'crackComplete',
            duration: options.duration || 5000 
        }),
        crackFailed: (options) => addToast({ 
            ...options, 
            type: 'crackFailed',
            duration: options.duration || 6000 
        }),
        
        // 通用方法
        custom: addToast,
        dismiss: removeToast
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

export default ToastProvider;
