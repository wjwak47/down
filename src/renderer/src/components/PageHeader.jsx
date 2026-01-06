import React from 'react';

const PageHeader = ({ title, children }) => {
    return (
        <div className="mb-6">
            {/* Top Row: Title */}
            {/* Added pr-20 to ensure title never overlaps with the absolute positioned global menu */}
            <div className="flex items-center justify-between mb-4 min-h-[40px] pr-20">
                <h1 className="text-3xl font-bold text-text-primary tracking-tight">
                    {title}
                </h1>
            </div>

            {/* Bottom Row: Actions / Toolbar */}
            {/* Added a subtle background container for the actions to distinguish the toolbar area */}
            {children && (
                <div className="flex items-center gap-3 p-2 bg-gray-50/80 rounded-xl border border-gray-100 backdrop-blur-sm">
                    {children}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
