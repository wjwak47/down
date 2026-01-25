export const changelog = [
    {
        version: '1.1.7',
        date: '2026-01-16',
        changes: {
            fixed: [
                'Fixed Mac app unable to open - reverted to v1.1.5 build configuration',
                'Removed hardenedRuntime config that caused strict Gatekeeper blocking'
            ],
            improved: [
                'Mac users can now run the app by right-click → Open'
            ]
        }
    },
    {
        version: '1.1.6',
        date: '2026-01-16',
        changes: {
            fixed: [
                'Fixed password cracking jumping to CPU mode after packaging - added john tool to bundled resources',
                'Fixed CPU mode resume starting from beginning - added cpuStartIdx progress saving',
                'Fixed Mac system sharp module loading failure - using lazy loading and error handling',
                'Fixed AI phase executing repeatedly after pause/resume - correctly update currentPhase',
                'Fixed PassGPT temp file path issue - using system temp directory'
            ],
            improved: [
                'CPU multi-threaded cracking now supports checkpoint resume',
                'Pause/resume functionality stability improved'
            ]
        }
    },
    {
        version: '1.1.5',
        date: '2025-01-15',
        changes: {
            added: [
                'Batch testing feature - implemented batch password testing mechanism (batch size: 100 passwords/batch)',
                'Using 7-Zip stdin pipe for batch testing, reducing process creation overhead',
                'New BatchTestManager class for automatic queue management and result parsing'
            ],
            improved: [
                'Password cracking speed increased 100x - from 10 pwd/s to 1000 pwd/s',
                'GPU attack order optimized - moved keyboard patterns from Phase 5 to Phase 2',
                'Common passwords (qwerty123, password123, etc.) cracking time reduced by 60%',
                'Rule library streamlined - from 125+ rules down to ~50 high-frequency rules',
                'Year suffixes reduced by 84%, number suffixes reduced by 43%, Leet speak reduced by 40%',
                'Invalid attempts reduced by 75%, memory usage decreased'
            ],
            fixed: [
                'Fixed inefficient single password testing issue',
                'Fixed unreasonable GPU attack order causing time waste',
                'Fixed rule transformations generating too many invalid passwords'
            ]
        }
    },

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
