import { spawn } from 'child_process';
import path from 'path';
import os from 'os';

/**
 * Check if audio format needs conversion for better transcription
 */
export function needsFormatConversion(audioPath) {
    const ext = path.extname(audioPath).toLowerCase();
    // WebM, Opus, and other formats that may cause garbled output
    const problematicFormats = ['.webm', '.opus', '.ogg', '.flac'];
    const needs = problematicFormats.includes(ext);
    if (needs) {
        console.log(`[Groq Whisper] Format ${ext} needs conversion for better compatibility`);
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
