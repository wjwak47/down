export const changelog = [
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
