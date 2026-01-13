import { ipcMain, dialog } from 'electron';
import path from 'path';
import * as wordRemover from './wordRemover.js';
import * as pdfRemover from './pdfRemover.js';
import * as imageRemover from './imageRemover.js';

// Supported file extensions
const docExtensions = ['pdf', 'docx'];
const imageExtensions = imageRemover.supportedFormats;
const allExtensions = [...docExtensions, ...imageExtensions];

export const registerWatermarkRemover = () => {
    // Select files (documents only)
    ipcMain.handle('watermark:select-files', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Supported Files', extensions: allExtensions },
                { name: 'Documents', extensions: docExtensions },
                { name: 'Images', extensions: imageExtensions }
            ]
        });
        return result.filePaths;
    });

    // Select images only
    ipcMain.handle('watermark:select-images', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Images', extensions: imageExtensions }
            ]
        });
        return result.filePaths;
    });

    // Detect watermark
    ipcMain.handle('watermark:detect', async (event, filePath) => {
        try {
            const ext = path.extname(filePath).toLowerCase().slice(1);

            if (ext === 'docx') {
                return await wordRemover.detectWordWatermark(filePath);
            } else if (ext === 'pdf') {
                return await pdfRemover.detectPdfWatermark(filePath);
            } else if (imageExtensions.includes(ext)) {
                return await imageRemover.detectImageWatermark(filePath);
            } else {
                throw new Error('不支持的文件格式');
            }
        } catch (error) {
            console.error('Watermark detection error:', error);
            return { error: error.message };
        }
    });

    // Get image info with preview
    ipcMain.handle('watermark:get-image-info', async (event, filePath) => {
        try {
            return await imageRemover.getImageInfo(filePath);
        } catch (error) {
            console.error('Get image info error:', error);
            return { error: error.message };
        }
    });

    // Remove watermark (documents)
    ipcMain.on('watermark:remove', async (event, { files, options, id }) => {
        for (const file of files) {
            try {
                event.reply('watermark:progress', { id, file, status: 'processing' });

                const ext = path.extname(file).toLowerCase().slice(1);
                const fileName = path.basename(file, path.extname(file));
                const outputDir = options.outputDir || path.dirname(file);
                const outputPath = path.join(outputDir, `${fileName}_no_watermark.${ext}`);

                let result;

                if (ext === 'docx') {
                    result = await wordRemover.removeWordWatermark(file, outputPath);
                } else if (ext === 'pdf') {
                    if (options.method === 'cover' && options.positions) {
                        result = await pdfRemover.coverPdfWatermark(file, outputPath, options.positions);
                    } else if (options.method === 'advanced') {
                        result = await pdfRemover.removePdfWatermarkAdvanced(file, outputPath, options);
                    } else {
                        result = await pdfRemover.removePdfTextWatermark(file, outputPath, options);
                    }
                } else if (imageExtensions.includes(ext)) {
                    result = await imageRemover.removeImageWatermark(file, outputPath, options.regions || [], options);
                } else {
                    throw new Error('不支持的文件格式');
                }

                event.reply('watermark:complete', {
                    id,
                    file,
                    success: true,
                    outputPath,
                    result
                });

            } catch (error) {
                console.error('Watermark removal error:', error);
                event.reply('watermark:complete', {
                    id,
                    file,
                    success: false,
                    error: error.message
                });
            }
        }
    });

    // Remove watermark from image with regions
    ipcMain.handle('watermark:remove-image', async (event, { filePath, regions, options }) => {
        try {
            const ext = path.extname(filePath).toLowerCase().slice(1);
            const fileName = path.basename(filePath, path.extname(filePath));
            const outputDir = options?.outputDir || path.dirname(filePath);
            const outputPath = path.join(outputDir, `${fileName}_no_watermark.${ext}`);

            const result = await imageRemover.removeImageWatermark(filePath, outputPath, regions, options || {});

            return {
                success: true,
                outputPath,
                ...result
            };
        } catch (error) {
            console.error('Image watermark removal error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Batch remove watermarks
    ipcMain.handle('watermark:batch-remove', async (event, { files, options }) => {
        const results = [];

        for (const file of files) {
            try {
                const ext = path.extname(file).toLowerCase().slice(1);
                const fileName = path.basename(file, path.extname(file));
                const outputDir = options.outputDir || path.dirname(file);
                const outputPath = path.join(outputDir, `${fileName}_no_watermark.${ext}`);

                let result;

                if (ext === 'docx') {
                    result = await wordRemover.removeWordWatermark(file, outputPath);
                } else if (ext === 'pdf') {
                    result = await pdfRemover.removePdfWatermarkAdvanced(file, outputPath, options);
                } else if (imageExtensions.includes(ext)) {
                    result = await imageRemover.removeImageWatermark(file, outputPath, options.regions || [], options);
                } else {
                    result = { success: false, message: '不支持的格式' };
                }

                results.push({
                    file,
                    outputPath,
                    ...result
                });

            } catch (error) {
                results.push({
                    file,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    });
};
