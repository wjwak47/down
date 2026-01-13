import React from 'react';

export const Input = ({
    type = 'text',
    placeholder,
    value,
    onChange,
    icon,
    iconPosition = 'left',
    endButton,
    className = ''
}) => {
    return (
        <div className={`flex items-stretch border border-[#dbe0e6] dark:border-[#2a3b4d] rounded-lg overflow-hidden focus-within:border-primary transition-colors ${className}`}>
            {icon && iconPosition === 'left' && (
                <div className="bg-[#f0f2f4] dark:bg-[#2a3b4d] px-4 flex items-center text-slate-blue">
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                </div>
            )}

            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="flex-1 bg-white dark:bg-[#1a2633] text-[#111418] dark:text-white px-4 py-3 text-sm focus:outline-none placeholder:text-slate-400"
            />

            {icon && iconPosition === 'right' && (
                <div className="bg-[#f0f2f4] dark:bg-[#2a3b4d] px-4 flex items-center text-slate-blue">
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                </div>
            )}

            {endButton}
        </div>
    );
};
