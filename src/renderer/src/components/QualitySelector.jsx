import { useState, useEffect, useRef } from 'react';
import { getQualityOptions } from '../utils/qualityExtractor';

/**
 * QualitySelector Component
 * Dropdown for selecting video quality with file size estimates
 */
function QualitySelector({ formats, selectedQuality, onQualityChange, disabled = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Calculate options directly from formats
    const options = formats && formats.length > 0 ? getQualityOptions(formats) : [];

    // Auto-select best quality if none selected
    useEffect(() => {
        if (options.length > 0 && !selectedQuality) {
            onQualityChange(options[0]);
        }
    }, [formats, selectedQuality, onQualityChange]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        onQualityChange(option);
        setIsOpen(false);
    };

    // Don't render anything if no options available
    if (options.length === 0) {
        return null;
    }

    const currentOption = selectedQuality || options[0];

    return (
        <div className="relative" ref={dropdownRef} style={{ zIndex: isOpen ? 100 : 'auto' }}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
                    flex items-center justify-between gap-2 px-3 py-2 
                    bg-white dark:bg-slate-800 
                    border border-slate-200 dark:border-slate-700 
                    rounded-lg text-sm
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer'}
                    transition-colors min-w-[140px]
                `}
            >
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                        {currentOption?.displayLabel || 'Quality'}
                    </span>
                </div>
                <svg 
                    className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path strokeWidth="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>

            {isOpen && (
                <div 
                    className="absolute mt-1 w-full min-w-[240px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden"
                    style={{ zIndex: 9999 }}
                >
                    <div className="py-1">
                        {options.map((option, index) => (
                            <button
                                key={option.formatId || index}
                                onClick={() => handleSelect(option)}
                                className={`
                                    w-full px-3 py-2 text-left text-sm
                                    flex items-center gap-2
                                    ${currentOption?.formatId === option.formatId 
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }
                                    transition-colors
                                `}
                            >
                                <div className="w-4 flex-shrink-0">
                                    {currentOption?.formatId === option.formatId && (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                        </svg>
                                    )}
                                </div>
                                <span className={`flex-shrink-0 ${currentOption?.formatId === option.formatId ? 'font-medium' : ''}`}>
                                    {option.displayLabel}
                                </span>
                                {index === 0 && (
                                    <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded flex-shrink-0">
                                        Best
                                    </span>
                                )}
                                <div className="flex-1"></div>
                                {option.displaySize && (
                                    <span className="text-xs text-slate-400 flex-shrink-0">
                                        ~{option.displaySize}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default QualitySelector;
