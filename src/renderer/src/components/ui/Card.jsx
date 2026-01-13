import React from 'react';

export const Card = ({ children, className = '', shadow = true }) => {
    const shadowClass = shadow ? 'focus-card-shadow' : 'shadow-sm';

    return (
        <div className={`bg-white dark:bg-[#1a2633] rounded-xl border border-[#f0f2f4] dark:border-[#2a3b4d] ${shadowClass} ${className}`}>
            {children}
        </div>
    );
};
