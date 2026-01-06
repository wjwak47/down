import fs from 'fs';
import path from 'path';
import { app } from 'electron';

/**
 * GPU Settings Store
 * Manages user preferences for GPU acceleration using JSON file storage
 */
class GPUSettingsStore {
    constructor() {
        // Store settings in userData directory
        const userDataPath = app.getPath('userData');
        this.settingsPath = path.join(userDataPath, 'gpu-settings.json');

        this.defaults = {
            enabled: true,  // GPU acceleration master switch
            video: {
                enabled: true,
                preferredGPU: 'auto', // 'auto', 'nvidia', 'amd', 'intel'
                encoder: 'auto',       // or specific encoder like 'h264_nvenc'
                concurrency: 'auto'    // or number 1-6
            },
            image: {
                enabled: true,
                useGPUFilters: false  // GPU.js filters (experimental)
            },
            document: {
                enabled: true,
                pdfRendering: true,
                officeConversion: true
            },
            fallbackToCPU: true,  // Auto fallback if GPU fails
            showPerformanceStats: true
        };

        this.settings = this.load();
    }

    // Load settings from file
    load() {
        try {
            if (fs.existsSync(this.settingsPath)) {
                const data = fs.readFileSync(this.settingsPath, 'utf8');
                return { ...this.defaults, ...JSON.parse(data) };
            }
        } catch (error) {
            console.error('Error loading GPU settings:', error);
        }
        return { ...this.defaults };
    }

    // Save settings to file
    save() {
        try {
            const dir = path.dirname(this.settingsPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving GPU settings:', error);
        }
    }

    // Get all settings
    getSettings() {
        return this.settings;
    }

    // Update settings
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.save();
        return this.settings;
    }

    // Get specific setting (supports nested paths like 'video.enabled')
    get(key, defaultValue) {
        const keys = key.split('.');
        let value = this.settings;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return defaultValue;
            }
        }

        return value !== undefined ? value : defaultValue;
    }

    // Set specific setting (supports nested paths)
    set(key, value) {
        const keys = key.split('.');
        let target = this.settings;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in target) || typeof target[k] !== 'object') {
                target[k] = {};
            }
            target = target[k];
        }

        target[keys[keys.length - 1]] = value;
        this.save();
    }

    // Check if GPU acceleration is enabled globally
    isGPUEnabled() {
        return this.get('enabled', true);
    }

    // Check if video GPU acceleration is enabled
    isVideoGPUEnabled() {
        return this.get('enabled', true) && this.get('video.enabled', true);
    }

    // Check if image GPU acceleration is enabled
    isImageGPUEnabled() {
        return this.get('enabled', true) && this.get('image.enabled', true);
    }

    // Check if document GPU acceleration is enabled
    isDocumentGPUEnabled() {
        return this.get('enabled', true) && this.get('document.enabled', true);
    }

    // Get preferred GPU type
    getPreferredGPU() {
        return this.get('video.preferredGPU', 'auto');
    }

    // Get video concurrency setting
    getConcurrency() {
        return this.get('video.concurrency', 'auto');
    }

    // Reset to defaults
    reset() {
        this.settings = { ...this.defaults };
        this.save();
    }
}

export default new GPUSettingsStore();
