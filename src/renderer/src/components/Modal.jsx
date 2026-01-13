import React from 'react';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    type = 'default',
    showClose = true,
    actions = null
}) => {
    if (!isOpen) return null;

    const typeStyles = {
        default: {
            icon: 'info',
            iconBg: 'bg-blue-100 dark:bg-blue-900/40',
            iconColor: 'text-blue-500'
        },
        success: {
            icon: 'check_circle',
            iconBg: 'bg-green-100 dark:bg-green-900/40',
            iconColor: 'text-green-500'
        },
        error: {
            icon: 'error',
            iconBg: 'bg-red-100 dark:bg-red-900/40',
            iconColor: 'text-red-500'
        },
        warning: {
            icon: 'warning',
            iconBg: 'bg-amber-100 dark:bg-amber-900/40',
            iconColor: 'text-amber-500'
        },
        confirm: {
            icon: 'help',
            iconBg: 'bg-purple-100 dark:bg-purple-900/40',
            iconColor: 'text-purple-500'
        }
    };

    const config = typeStyles[type] || typeStyles.default;

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-modal-in">
                {/* Header */}
                <div className="flex items-center gap-4 p-6 pb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.iconBg}`}>
                        <span className={`material-symbols-outlined text-2xl ${config.iconColor}`}>
                            {config.icon}
                        </span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                            {title}
                        </h3>
                    </div>
                    {showClose && (
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="px-6 pb-4">
                    <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {children}
                    </div>
                </div>

                {/* Actions */}
                {actions && (
                    <div className="flex gap-3 p-6 pt-2 bg-slate-50 dark:bg-slate-900/50">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};

// Alert Modal (replacement for alert())
export const AlertModal = ({ isOpen, onClose, title, message, type = 'default' }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            type={type}
            actions={
                <button
                    onClick={onClose}
                    className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
                >
                    确定
                </button>
            }
        >
            {message}
        </Modal>
    );
};

// Confirm Modal (replacement for confirm())
export const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = '确定', cancelText = '取消' }) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            type="confirm"
            actions={
                <>
                    <button
                        onClick={onClose}
                        className="flex-1 h-10 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className="flex-1 h-10 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
                    >
                        {confirmText}
                    </button>
                </>
            }
        >
            {message}
        </Modal>
    );
};

export default Modal;
