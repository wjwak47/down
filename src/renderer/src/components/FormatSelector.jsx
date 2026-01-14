import { useState, useEffect, useRef } from 'react';

/**
 * FormatSelector Component
 * Dropdown for selecting output format (video or audio)
 * Only shows formats that the platform natively supports
 */

const VIDEO_FORMATS = [
    { id: 'mp4', label: 'MP4', description: 'Most compatible', recommended: true },
    { id: 'webm', label: 'WebM', description: 'Open format' },
    { id: 'mkv', label: 'MKV', description: 'High quality container' }
];

const AUDIO_FORMATS = [
    { id: 'm4a', label: 'M4A', description: 'Best quality', recommended: true },
    { id: 'mp3', label: 'MP3', description: 'Most compatible' },
    { id: 'wav', label: 'WAV', description: 'Lossless' }
];

// Bilibili only supports MP4/MKV (H.264 source)
const BILIBILI_VIDEO_FORMATS = [
    { id: 'mp4', label: 'MP4', description: 'Most compatible', recommended: true },
    { id: 'mkv', label: 'MKV', description: 'High quality container' }
];

const BILIBILI_AUDIO_FORMATS = [
    { id: 'm4a', label: 'M4A', description: 'Best quality', recommended: true },
    { id: 'mp3', label: 'MP3', description: 'Most compatible' }
];

function FormatSelector({ type = 'video', selectedFormat, onFormatChange, disabled = false, platform = null }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Use platform-specific formats
    const isBilibili = platform === 'bilibili';
    const formats = type === 'audio' 
        ? (isBilibili ? BILIBILI_AUDIO_FORMATS : AUDIO_FORMATS)
        : (isBilibili ? BILIBILI_VIDEO_FORMATS : VIDEO_FORMATS);
    const defaultFormat = formats.find(f => f.recommended) || formats[0];

    useEffect(() => {
        // Auto-select default format if none selected
        if (!selectedFormat) {
            onFormatChange(defaultFormat);
        }
    }, [type]);

    // Reset to default format when platform changes
    useEffect(() => {
        if (selectedFormat && !formats.find(f => f.id === selectedFormat.id)) {
            onFormatChange(defaultFormat);
        }
    }, [platform, formats]);

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

    const handleSelect = (format) => {
        onFormatChange(format);
        setIsOpen(false);
    };

    const currentFormat = selectedFormat || defaultFormat;

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
                    transition-colors min-w-[100px]
                `}
            >
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                    </svg>
                    <span className="font-medium text-slate-700 dark:text-slate-200 uppercase">
                        {currentFormat?.label || 'Format'}
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
                    className="absolute mt-1 w-auto min-w-[200px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg"
                    style={{ zIndex: 9999 }}
                >
                    <div className="py-1">
                        {formats.map((format) => (
                            <button
                                key={format.id}
                                onClick={() => handleSelect(format)}
                                className={`
                                    w-full px-3 py-2 text-left text-sm
                                    flex items-center gap-3
                                    ${currentFormat?.id === format.id 
                                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }
                                    transition-colors
                                `}
                            >
                                <div className="flex items-center gap-2 flex-1">
                                    {currentFormat?.id === format.id && (
                                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                                        </svg>
                                    )}
                                    <span className="font-medium uppercase">
                                        {format.label}
                                    </span>
                                    {format.recommended && (
                                        <span className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded whitespace-nowrap">
                                            Recommended
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-slate-400 whitespace-nowrap">
                                    {format.description}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// Export format constants for use elsewhere
export const getDefaultVideoFormat = () => VIDEO_FORMATS.find(f => f.recommended) || VIDEO_FORMATS[0];
export const getDefaultAudioFormat = () => AUDIO_FORMATS.find(f => f.recommended) || AUDIO_FORMATS[0];
export const VIDEO_FORMAT_OPTIONS = VIDEO_FORMATS;
export const AUDIO_FORMAT_OPTIONS = AUDIO_FORMATS;

export default FormatSelector;
