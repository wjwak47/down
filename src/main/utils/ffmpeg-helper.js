// Lazy load ffmpeg to avoid startup issues
let ffmpeg = null;
let ffmpegPath = null;

const initFfmpeg = async () => {
    if (ffmpeg) return ffmpeg;

    try {
        const ffmpegModule = await import('fluent-ffmpeg');
        const { app } = await import('electron');
        const path = await import('path');

        ffmpeg = ffmpegModule.default;

        // Use custom ffmpeg from resources/bin (platform-specific)
        const binName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

        if (app.isPackaged) {
            // In production, ffmpeg is in resources/bin
            ffmpegPath = path.join(process.resourcesPath, 'bin', binName);
        } else {
            // In development, use platform-specific folder
            const platformFolder = process.platform === 'win32' ? 'bin-win' : 'bin-mac';
            ffmpegPath = path.join(app.getAppPath(), 'resources', platformFolder, binName);
        }

        console.log('[FFmpeg] Using path:', ffmpegPath);
        ffmpeg.setFfmpegPath(ffmpegPath);
        return ffmpeg;
    } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        throw new Error('FFmpeg is not available');
    }
};

export const getFfmpegPath = async () => {
    await initFfmpeg();
    return ffmpegPath;
};

export const createCommand = async (input) => {
    const ffmpegInstance = await initFfmpeg();
    return ffmpegInstance(input);
};

/**
 * Extract audio from video file
 * @param {string} inputPath - Path to input video file
 * @param {string} outputPath - Path to output audio file (MP3)
 * @param {function} onProgress - Progress callback
 * @returns {Promise<string>} - Path to extracted audio file
 */
export const extractAudio = async (inputPath, outputPath, onProgress, manualDurationSeconds = null) => {
    const ffmpegInstance = await initFfmpeg();
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

    // Delete old output file if exists to avoid cache issues
    const fsSync = fs.default || fs;
    if (fsSync.existsSync(outputPath)) {
        console.log(`[FFmpeg] Deleting old audio file: ${outputPath}`);
        fsSync.unlinkSync(outputPath);
    }

    // First, try normal extraction
    await extractAudioInternal(ffmpegInstance, inputPath, outputPath, onProgress);

    // Verify completeness by comparing with video duration
    const extractedDuration = await getAudioDuration(outputPath);

    // Also check file size to verify
    const audioStats = fsSync.statSync(outputPath);
    const audioSizeMB = audioStats.size / (1024 * 1024);
    // Rough estimate: 128kbps MP3 = 0.96 MB per minute
    const estimatedMinutes = audioSizeMB / 0.96;
    const estimatedDuration = estimatedMinutes * 60;

    console.log(`[FFmpeg] Extracted file size: ${audioSizeMB.toFixed(2)} MB`);
    console.log(`[FFmpeg] Estimated duration from size: ${estimatedDuration.toFixed(0)}s`);
    console.log(`[FFmpeg] ffprobe reported duration: ${extractedDuration}s`);

    // Determine真实时长: manual duration takes precedence
    let videoDuration;
    if (manualDurationSeconds) {
        console.log(`[FFmpeg] ⏰ Using MANUAL DURATION: ${manualDurationSeconds}s`);
        videoDuration = manualDurationSeconds;
    } else {
        // Get video duration using ffprobe
        videoDuration = await new Promise((resolve, reject) => {
            ffmpegInstance.ffprobe(inputPath, (err, metadata) => {
                if (err) reject(err);
                else resolve(metadata.format.duration || 0);
            });
        });
        console.log(`[FFmpeg] Auto-detected video duration: ${videoDuration}s`);
    }

    console.log(`[FFmpeg] Video duration: ${videoDuration}s, Extracted: ${extractedDuration}s`);
    console.log(`[FFmpeg] Difference: ${(videoDuration - extractedDuration).toFixed(1)}s`);

    // If extraction is incomplete (missing > 10 seconds)
    // Also trigger if file size suggests incompleteness
    const durationDiff = videoDuration - extractedDuration;
    const sizeDiff = videoDuration - estimatedDuration;

    if (durationDiff > 10 || sizeDiff > 10) {
        console.log(`[FFmpeg] ⚠️ Incomplete extraction detected!`);
        console.log(`[FFmpeg] Missing by duration check: ${durationDiff.toFixed(1)}s`);
        console.log(`[FFmpeg] Missing by size check: ${sizeDiff.toFixed(1)}s`);
        console.log(`[FFmpeg] 🔄 Attempting segmented extraction...`);

        onProgress?.({
            percent: 50,
            message: `⚠️ Detected incomplete extraction, filling gaps...`
        });

        // Extract the missing segment
        const tempDir = os.tmpdir();
        const segment2Path = path.join(tempDir, `audio_segment2_${Date.now()}.mp3`);

        try {
            const missingDuration = videoDuration - extractedDuration + 10; // Add 10s buffer
            await extractAudioSegment(inputPath, segment2Path, extractedDuration - 5, missingDuration);

            // Merge the two segments
            const mergedPath = path.join(tempDir, `audio_merged_${Date.now()}.mp3`);
            await mergeAudioFiles([outputPath, segment2Path], mergedPath);

            // Wait a bit for file system to flush
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Replace original with merged
            const fsSync = fs.default || fs;
            if (fsSync.existsSync(outputPath)) {
                fsSync.unlinkSync(outputPath);
            }
            fsSync.renameSync(mergedPath, outputPath);
            if (fsSync.existsSync(segment2Path)) {
                fsSync.unlinkSync(segment2Path);
            }

            // Force file system cache refresh by touching the file
            const currentTime = new Date();
            fsSync.utimesSync(outputPath, currentTime, currentTime);

            // Longer wait to ensure file system is fully synced
            console.log('[FFmpeg] Waiting for file system to fully sync...');
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Verify the merged file
            const finalDuration = await getAudioDuration(outputPath);
            console.log(`[FFmpeg] ✅ Segmented extraction complete! Final duration: ${finalDuration}s`);

            // CRITICAL: Re-encode to fix metadata duration
            console.log(`[FFmpeg] Re-encoding merged file to fix metadata...`);
            const reEncodedPath = path.join(tempDir, `audio_reencoded_${Date.now()}.mp3`);

            await new Promise((resolve, reject) => {
                ffmpegInstance(outputPath)
                    .audioCodec('libmp3lame')
                    .audioBitrate('128k')
                    .audioChannels(1)
                    .audioFrequency(16000)
                    .output(reEncodedPath)
                    .on('end', () => {
                        console.log('[FFmpeg] Re-encoding complete');
                        resolve();
                    })
                    .on('error', reject)
                    .run();
            });

            // Replace merged with re-encoded
            fsSync.unlinkSync(outputPath);
            fsSync.renameSync(reEncodedPath, outputPath);

            // Final verification after re-encoding
            await new Promise(resolve => setTimeout(resolve, 1000));
            const reEncodedDuration = await getAudioDuration(outputPath);
            console.log(`[FFmpeg] Re-encoded file duration: ${reEncodedDuration}s`);

            onProgress?.({
                percent: 100,
                message: `✅ Complete audio extracted (${finalDuration.toFixed(0)}s)`
            });
        } catch (segmentError) {
            console.error('[FFmpeg] Segmented extraction failed:', segmentError);
            // Continue with incomplete audio rather than failing completely
        }
    }

    // Final wait to ensure file system is fully synced
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Final verification with detailed logging
    console.log(`[FFmpeg] ═══ FINAL VERIFICATION ═══`);
    console.log(`[FFmpeg] Output path: ${outputPath}`);
    const finalStats = fsSync.statSync(outputPath);
    console.log(`[FFmpeg] File size: ${(finalStats.size / 1024 / 1024).toFixed(2)} MB`);
    const finalCheck = await getAudioDuration(outputPath);
    console.log(`[FFmpeg] Final audio file duration: ${finalCheck}s`);
    console.log(`[FFmpeg] ═══════════════════════════`);
    console.log(`[FFmpeg] 💡 ACTUAL DURATION FROM VIDEO: ${videoDuration}s`);

    return outputPath;
};

// Internal extraction function (original logic)
const extractAudioInternal = async (ffmpegInstance, inputPath, outputPath, onProgress) => {

    return new Promise((resolve, reject) => {
        let duration = 0;

        ffmpegInstance(inputPath)
            .inputOptions([
                '-nostdin',           // No interactive mode
                '-err_detect ignore_err' // Ignore stream errors but continue processing
            ])
            .noVideo()
            .audioCodec('libmp3lame')
            .audioBitrate('128k')
            .audioChannels(1)
            .audioFrequency(16000)
            .outputOptions([
                '-avoid_negative_ts make_zero', // Handle negative timestamps
                '-max_muxing_queue_size 9999',
                '-async 1',           // Audio sync
                '-t 99:99:99'         // Force maximum duration extraction (no early stop)
            ])
            .output(outputPath)
            .on('codecData', (data) => {
                // Parse duration from format like "00:05:30.00"
                const parts = data.duration.split(':');
                if (parts.length === 3) {
                    duration = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
                    console.log(`[FFmpeg] Detected video duration: ${duration}s (${data.duration})`);
                }
            })
            .on('progress', (progress) => {
                if (duration > 0 && progress.timemark) {
                    const parts = progress.timemark.split(':');
                    if (parts.length === 3) {
                        const currentTime = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
                        const percent = Math.min(100, Math.round((currentTime / duration) * 100));
                        onProgress?.({ percent, currentTime, duration });
                    }
                }
            })
            .on('end', () => {
                console.log('[FFmpeg] Audio extraction complete:', outputPath);
                console.log(`[FFmpeg] Expected duration: ${duration}s`);
                // Verify the extracted audio duration matches
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[FFmpeg] Audio extraction error:', err);
                reject(err);
            })
            .run();
    });
};

/**
 * Get duration of an audio file using ffprobe
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<number>} - Duration in seconds
 */
export const getAudioDuration = async (audioPath) => {
    const ffmpegInstance = await initFfmpeg();
    const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe');

    return new Promise((resolve, reject) => {
        ffmpegInstance.ffprobe(audioPath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                resolve(metadata.format.duration || 0);
            }
        });
    });
};

/**
 * Extract a specific segment of audio from video
 * @param {string} inputPath - Path to input video file
 * @param {string} outputPath - Path to output audio file
 * @param {number} startTime - Start time in seconds
 * @param {number} duration - Duration in seconds
 * @returns {Promise<string>} - Path to extracted audio segment
 */
export const extractAudioSegment = async (inputPath, outputPath, startTime, duration) => {
    const ffmpegInstance = await initFfmpeg();

    console.log(`[FFmpeg] Extracting segment: ${startTime}s - ${startTime + duration}s`);

    return new Promise((resolve, reject) => {
        ffmpegInstance(inputPath)
            .setStartTime(startTime)
            .setDuration(duration)
            .noVideo()
            .audioCodec('libmp3lame')
            .audioBitrate('128k')
            .audioChannels(1)
            .audioFrequency(16000)
            .output(outputPath)
            .on('end', () => {
                console.log('[FFmpeg] Segment extraction complete');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[FFmpeg] Segment extraction error:', err);
                reject(err);
            })
            .run();
    });
};

/**
 * Merge multiple audio files into one
 * @param {string[]} inputPaths - Array of input audio file paths
 * @param {string} outputPath - Path to merged output file
 * @returns {Promise<string>} - Path to merged audio file
 */
export const mergeAudioFiles = async (inputPaths, outputPath) => {
    const ffmpegInstance = await initFfmpeg();

    console.log(`[FFmpeg] Merging ${inputPaths.length} audio files`);

    return new Promise((resolve, reject) => {
        const command = ffmpegInstance();

        // Add all input files
        inputPaths.forEach(path => command.input(path));

        // Use concat filter to merge
        const filterComplex = inputPaths.map((_, i) => `[${i}:a]`).join('') +
            `concat=n=${inputPaths.length}:v=0:a=1[outa]`;

        command
            .complexFilter(filterComplex)
            .outputOptions([
                '-map', '[outa]',
                '-write_xing', '0',  // Disable Xing header that might have wrong duration
                '-id3v2_version', '3',  // Force ID3v2.3 for better compatibility
                '-metadata:s:a:0', 'encoder=Lavf'  // Force metadata rewrite
            ])
            .audioCodec('libmp3lame')
            .audioBitrate('128k')
            .output(outputPath)
            .on('end', () => {
                console.log('[FFmpeg] Audio merge complete');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[FFmpeg] Audio merge error:', err);
                reject(err);
            })
            .run();
    });
};

export default { createCommand, getFfmpegPath, extractAudio, getAudioDuration, extractAudioSegment, mergeAudioFiles };
