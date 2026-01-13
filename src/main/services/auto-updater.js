// Lazy-loaded electron-updater to avoid initialization during module load
let autoUpdater = null;
let log = null;

const initAutoUpdater = async () => {
    if (autoUpdater) return autoUpdater;

    try {
        const updaterModule = await import('electron-updater');
        const logModule = await import('electron-log');

        autoUpdater = updaterModule.autoUpdater;
        log = logModule.default;

        // Configure logging
        autoUpdater.logger = log;
        autoUpdater.logger.transports.file.level = 'info';

        return autoUpdater;
    } catch (error) {
        console.error('[AutoUpdater] Failed to initialize:', error.message);
        return null;
    }
};

class AutoUpdateService {
    constructor() {
        this.mainWindow = null;
        this.updateDownloaded = false;
        this.silent = false;
        this._initialized = false;
    }

    async initialize() {
        if (this._initialized) return;

        const updater = await initAutoUpdater();
        if (!updater) {
            console.warn('[AutoUpdater] Could not initialize - skipping setup');
            return;
        }

        // Configure auto-updater
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;

        this.setupListeners();
        this._initialized = true;
    }

    setMainWindow(window) {
        this.mainWindow = window;
        // Initialize when main window is set (this happens after app is ready)
        this.initialize().catch(err => {
            console.error('[AutoUpdater] Initialization error:', err.message);
        });
    }

    setupListeners() {
        if (!autoUpdater) return;

        const { dialog } = require('electron');

        // Checking for update
        autoUpdater.on('checking-for-update', () => {
            this.sendStatusToWindow('Checking for updates...');
        });

        // Update available
        autoUpdater.on('update-available', (info) => {
            this.sendStatusToWindow('update-available', info);

            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Update Available',
                message: `A new version ${info.version} is available!`,
                detail: 'Do you want to download it now?',
                buttons: ['Download', 'Later']
            }).then((result) => {
                if (result.response === 0) {
                    autoUpdater.downloadUpdate();
                }
            });
        });

        // Update not available
        autoUpdater.on('update-not-available', (info) => {
            this.sendStatusToWindow('update-not-available');

            if (!this.silent) {
                dialog.showMessageBox(this.mainWindow, {
                    type: 'info',
                    title: 'No Updates',
                    message: 'You are running the latest version!',
                    detail: `Current version: ${info.version}`
                });
            }
        });

        // Download progress
        autoUpdater.on('download-progress', (progressObj) => {
            this.sendStatusToWindow('download-progress', {
                percent: progressObj.percent,
                transferred: progressObj.transferred,
                total: progressObj.total
            });
        });

        // Update downloaded
        autoUpdater.on('update-downloaded', (info) => {
            this.updateDownloaded = true;
            this.sendStatusToWindow('update-downloaded', info);

            dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'Update Ready',
                message: 'Update downloaded successfully!',
                detail: 'The application will restart to install the update.',
                buttons: ['Restart Now', 'Later']
            }).then((result) => {
                if (result.response === 0) {
                    autoUpdater.quitAndInstall(false, true);
                }
            });
        });

        // Error
        autoUpdater.on('error', (err) => {
            this.sendStatusToWindow('error', err);

            if (!this.silent) {
                const isMissingConfig = err.message && err.message.includes('app-update.yml');
                const isEnoent = err.code === 'ENOENT' || (err.message && err.message.includes('ENOENT'));

                if (isMissingConfig || isEnoent) {
                    console.warn('[AutoUpdater] Update configuration not found - this is expected for non-packaged builds');
                    dialog.showMessageBox(this.mainWindow, {
                        type: 'info',
                        title: 'Update Check Unavailable',
                        message: 'Auto-update is not available',
                        detail: 'This feature is only available in packaged releases. Please check GitHub for the latest version manually.'
                    });
                } else {
                    dialog.showMessageBox(this.mainWindow, {
                        type: 'error',
                        title: 'Update Error',
                        message: 'Failed to check for updates',
                        detail: err.message
                    });
                }
            }
        });
    }

    sendStatusToWindow(status, data = null) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('update-status', { status, data });
        }
    }

    async checkForUpdates(silent = false) {
        this.silent = silent;

        if (!this._initialized) {
            await this.initialize();
        }

        if (!autoUpdater) {
            console.warn('[AutoUpdater] Not available - skipping update check');
            return;
        }

        try {
            autoUpdater.checkForUpdates();
        } catch (error) {
            console.error('[AutoUpdater] Failed to check for updates:', error.message);

            if (!silent && this.mainWindow && !this.mainWindow.isDestroyed()) {
                const { dialog } = require('electron');
                dialog.showMessageBox(this.mainWindow, {
                    type: 'error',
                    title: 'Update Check Failed',
                    message: 'Unable to check for updates',
                    detail: 'Please ensure you are using a packaged version of the application.'
                });
            }
        }
    }

    quitAndInstall() {
        if (this.updateDownloaded && autoUpdater) {
            autoUpdater.quitAndInstall(false, true);
        }
    }
}

export default new AutoUpdateService();
