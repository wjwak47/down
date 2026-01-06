import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Settings, Info, RefreshCw, MessageSquare } from 'lucide-react';

const AppMenu = ({ onOpenSettings }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleAction = (action) => {
        setIsOpen(false);
        if (action === 'settings') {
            onOpenSettings();
        } else if (action === 'about') {
            // Show about dialog (placeholder for now)
            alert('MultiTool v1.0.0\nCreated with Electron & React');
        } else if (action === 'update') {
            alert('Checking for updates...');
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-text-secondary hover:text-primary hover:bg-gray-100 rounded-full transition-colors"
                title="Menu"
            >
                <MoreVertical size={20} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 animate-fade-in">
                    <button
                        onClick={() => handleAction('settings')}
                        className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-gray-50 flex items-center gap-2"
                    >
                        <Settings size={16} />
                        <span>Settings</span>
                    </button>
                    <button
                        onClick={() => handleAction('update')}
                        className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-gray-50 flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                        <span>Check for Updates</span>
                    </button>
                    <div className="my-1 border-t border-gray-100"></div>
                    <button
                        onClick={() => handleAction('about')}
                        className="w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-gray-50 flex items-center gap-2"
                    >
                        <Info size={16} />
                        <span>About</span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default AppMenu;
