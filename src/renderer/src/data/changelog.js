export const changelog = [
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
