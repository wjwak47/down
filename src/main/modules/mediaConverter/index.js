import { ipcMain, dialog } from 'electron';
import path from 'path';

const activeConversions = new Map();

// Quality presets configuration
const QUALITY_PRESETS = {
    fast: {
        video: { codec: 'libx264', crf: 28, preset: 'fast' },
        audio: { codec: 'aac', bitrate: '128k' }
    },
    standard: {
        video: { codec: 'libx264', crf: 23, preset: 'medium' },
        audio: { codec: 'aac', bitrate: '192k' }
    },
    high: {
        video: { codec: 'libx264', crf: 18, preset: 'slow' },
        audio: { codec: 'aac', bitrate: '256k' }
    },
    lossless: {
        video: { codec: 'copy' },
        audio: { codec: 'copy' }
    }
};

export const registerMediaConverter = () => {
    // Handle file selection
    ipcMain.handle('media:select-files', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Media Files', extensions: ['mp4', 'mkv', 'avi', 'mov', 'mp3', 'wav', 'flac', 'm4a'] },
                { name: 'Video', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm'] },
                { name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        return result.filePaths;
    });

    // Handle conversion with quality presets
    ipcMain.on('media:convert', async (event, { files, format, options, id }) => {
        try {
            // Lazy load ffmpeg helper and GPU builder
            const { createCommand } = await import('../../utils/ffmpeg-helper.js');
            const ffmpegGPUBuilder = (await import('../../services/ffmpegGPUBuilder.js')).default;

            const runConversion = async (filePath) => {
                const fileName = path.basename(filePath, path.extname(filePath));
                const outputDir = options.outputDir || path.dirname(filePath);
                const outputPath = path.join(outputDir, `${fileName}_converted.${format}`);

                const command = await createCommand(filePath);

                // Get GPU-accelerated parameters if available
                const gpuParams = await ffmpegGPUBuilder.buildVideoParams({
                    codec: options.codec || 'h264',
                    quality: options.qualityPreset || 'standard',
                    preset: options.encoderPreset || 'balanced',
                    resolution: options.resolution,
                    fps: options.fps,
                    bitrate: options.bitrate,
                    crf: options.customCrf
                });

                console.log(`[MediaConverter] Using ${gpuParams.hwaccel} acceleration with ${gpuParams.videoCodec}`);

                // Apply input options (hardware decoding)
                if (gpuParams.inputOptions && gpuParams.inputOptions.length > 0) {
                    command.inputOptions(gpuParams.inputOptions);
                }

                // Get quality preset or use custom settings
                const qualityPreset = options.qualityPreset || 'high';
                const preset = QUALITY_PRESETS[qualityPreset];

                // Apply video settings with GPU codec
                if (preset.video.codec === 'copy') {
                    command.videoCodec('copy');
                } else {
                    command.videoCodec(gpuParams.videoCodec);

                    // Apply GPU-generated output options
                    if (gpuParams.outputOptions && gpuParams.outputOptions.length > 0) {
                        command.outputOptions(gpuParams.outputOptions);
                    }
                }

                // Apply audio settings
                if (preset.audio.codec === 'copy') {
                    command.audioCodec('copy');
                } else {
                    // Use appropriate audio codec based on output format
                    let audioCodec = preset.audio.codec;

                    // Format-specific codec overrides
                    if (format === 'wav') {
                        audioCodec = 'pcm_s16le';  // WAV needs PCM encoding
                        command.audioCodec(audioCodec);
                        // WAV doesn't use bitrate, use sample rate instead
                        command.audioFrequency(48000);
                    } else if (format === 'flac') {
                        audioCodec = 'flac';  // FLAC lossless
                        command.audioCodec(audioCodec);
                    } else if (format === 'ogg') {
                        audioCodec = 'libvorbis';  // OGG Vorbis
                        command.audioCodec(audioCodec);
                        if (options.audioBitrate) {
                            command.audioBitrate(options.audioBitrate);
                        } else if (preset.audio.bitrate) {
                            command.audioBitrate(preset.audio.bitrate);
                        }
                    } else {
                        // MP3, M4A, and other formats use AAC or MP3
                        if (format === 'mp3') {
                            audioCodec = 'libmp3lame';
                        }
                        command.audioCodec(audioCodec);
                        if (options.audioBitrate) {
                            command.audioBitrate(options.audioBitrate);
                        } else if (preset.audio.bitrate) {
                            command.audioBitrate(preset.audio.bitrate);
                        }
                    }
                }

                command
                    .on('start', (commandLine) => {
                        console.log('Spawned Ffmpeg with command: ' + commandLine);
                        event.reply('media:progress', { id, file: filePath, status: 'started' });
                    })
                    .on('progress', (progress) => {
                        event.reply('media:progress', {
                            id,
                            file: filePath,
                            status: 'processing',
                            percent: progress.percent
                        });
                    })
                    .on('error', (err) => {
                        console.error('An error occurred: ' + err.message);
                        event.reply('media:complete', { id, file: filePath, success: false, error: err.message });
                        activeConversions.delete(id);
                    })
                    .on('end', () => {
                        console.log('Processing finished!');
                        event.reply('media:complete', { id, file: filePath, success: true, outputPath });
                        activeConversions.delete(id);
                    });

                activeConversions.set(id, command);
                command.save(outputPath);
            };

            for (const file of files) {
                await runConversion(file);
            }
        } catch (error) {
            console.error('FFmpeg conversion error:', error);
            event.reply('media:complete', {
                id,
                file: files[0],
                success: false,
                error: 'FFmpeg is not available. Please check installation.'
            });
        }
    });

    // Handle cancellation
    ipcMain.on('media:cancel', (event, id) => {
        const command = activeConversions.get(id);
        if (command) {
            command.kill();
            activeConversions.delete(id);
            event.reply('media:cancelled', { id });
        }
    });
};
