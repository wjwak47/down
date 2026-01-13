import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

/**
 * Check if audio format needs conversion for better transcription
 * Now converts ALL files except MP3 for better compatibility
 */
export function needsFormatConversion(audioPath) {
    const ext = path.extname(audioPath).toLowerCase();
    // Only MP3 doesn't need conversion - all other formats will be converted
    const noConversionNeeded = ['.mp3'];
    const needs = !noConversionNeeded.includes(ext);
    if (needs) {
        console.log(`[Groq Whisper] Format ${ext} will be converted to MP3 for optimal quality`);
    }
    return needs;
}

/**
 * Convert audio to MP3 format for better transcription compatibility
 */
export async function convertToMP3(audioPath, ffmpegPath) {
    return new Promise((resolve, reject) => {
        const tempDir = os.tmpdir();
        const baseName = path.basename(audioPath, path.extname(audioPath));
        const outputPath = path.join(tempDir, `${baseName}_temp_${Date.now()}.mp3`);

        const ffmpeg = ffmpegPath || 'ffmpeg';
        const args = [
            '-y',
            '-i', audioPath,
            '-acodec', 'libmp3lame',
            '-ar', '16000',
            '-ac', '1',
            '-b:a', '64k',
            outputPath
        ];

        console.log('[Groq Whisper] Converting to MP3 for transcription:', outputPath);
        const proc = spawn(ffmpeg, args);

        proc.on('close', (code) => {
            if (code === 0) {
                console.log('[Groq Whisper] Conversion successful');
                resolve(outputPath);
            } else {
                reject(new Error(`FFmpeg conversion failed with code ${code}`));
            }
        });

        proc.on('error', reject);
    });
}
