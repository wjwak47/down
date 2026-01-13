import React from 'react';

export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    onClick,
    disabled = false,
    className = ''
}) => {
    const baseStyles = 'font-medium rounded-lg transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2';

    const variants = {
        primary: 'bg-primary hover:bg-primary/90 text-white',
        secondary: 'border border-primary text-primary hover:bg-primary/5',
        outline: 'border border-[#dbe0e6] dark:border-[#2a3b4d] hover:bg-slate-50 dark:hover:bg-slate-800',
        ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base'
    };

    const disabledStyles = disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer';

    return (
        <button
            onClick={disabled ? undefined : onClick}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${className}`}
        >
            {icon && <span className="material-symbols-outlined text-inherit">{icon}</span>}
            {children}
        </button>
    );
};
