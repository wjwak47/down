import { autoUpdater } from 'electron-updater';
import { dialog, BrowserWindow } from 'electron';
import log from 'electron-log';

// Configure logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

class AutoUpdateService {
    constructor() {
        this.mainWindow = null;
        this.updateDownloaded = false;
        this.silent = false; // Flag for silent checks (no dialog if already latest)

        // Configure auto-updater
        autoUpdater.autoDownload = false; // Manual download control
        autoUpdater.autoInstallOnAppQuit = true;

        this.setupListeners();
    }

    setMainWindow(window) {
        this.mainWindow = window;
    }

    setupListeners() {
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

            // Only show dialog if not in silent mode (manual check)
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

            // Only show error dialog if not in silent mode
            if (!this.silent) {
                dialog.showMessageBox(this.mainWindow, {
                    type: 'error',
                    title: 'Update Error',
                    message: 'Failed to check for updates',
                    detail: err.message
                });
            }
        });
    }

    sendStatusToWindow(status, data = null) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('update-status', { status, data });
        }
    }

    checkForUpdates(silent = false) {
        this.silent = silent;
        autoUpdater.checkForUpdates();
    }

    quitAndInstall() {
        if (this.updateDownloaded) {
            autoUpdater.quitAndInstall(false, true);
        }
    }
}

export default new AutoUpdateService();
