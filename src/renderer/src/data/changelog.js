export const changelog = [
    {
        version: '1.1.4',
        date: '2026-01-15',
        changes: {
            added: [
                'Extract mode advanced options - password input and custom output path',
                'Custom app icon (rocket design)'
            ],
            improved: [
                'Simplified UI - removed search box, notifications, and user info',
                'GPU settings now always enabled by default (removed toggle switches)',
                'PDF watermark removal enhanced with CamScanner support'
            ],
            fixed: [
                'Removed unused Eudic integration from Settings'
            ]
        }
    },
    {
        version: '1.1.3',
        date: '2026-01-11',
        changes: {
            fixed: [
                'Auto-update functionality - removed --publish never flag that blocked app-update.yml generation',
                'Version number now correctly updates in packaged app',
                'Manual update check now works properly'
            ]
        }
    },
    {
        version: '1.1.2',
        date: '2026-01-11',
        changes: {
            improved: [
                'Disabled Windows code signing for unsigned builds',
                'Streamlined build process configuration'
            ]
        }
    },
    {
        version: '1.1.1',
        date: '2026-01-11',
        changes: {
            added: [
                'Automatic update system with silent startup checks',
                'Manual update check via menu (Check for Updates)',
                'Smart update notifications - only alerts when new version available'
            ],
            fixed: [
                'Auto-update functionality in packaged application',
                'Missing app-update.yml configuration file',
                'Silent mode for startup update checks to avoid interrupting users'
            ]
        }
    },
    {
        version: '1.1.0',
        date: '2026-01-11',
        changes: {
            added: [
                'Configuration import/export feature for API keys and settings',
                'Save configurations to JSON file for backup and sharing',
                'Load configurations from file for quick setup on new devices'
            ],
            improved: [
                'Navigation bar reordered by workflow priority',
                'Settings panel UI optimization with cleaner button layout'
            ],
            fixed: [
                'MP4 video audio extraction truncation issue',
                'Manual duration now correctly used for gap detection in video transcription'
            ]
        }
    },
    {
        version: '1.0.0',
        date: '2026-01-10',
        changes: {
            added: [
                'Cross-platform support (Windows and macOS)',
                'Video downloader with preview',
                'AI-powered audio transcription (Groq Whisper & Gemini)',
                'Watermark remover for documents',
                'Media converter',
                'Document converter',
                'File compressor'
            ]
        }
    }
];
