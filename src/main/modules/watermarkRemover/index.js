import { ipcMain, dialog } from 'electron';
import path from 'path';
import * as wordRemover from './wordRemover.js';
import * as pdfRemover from './pdfRemover.js';

export const registerWatermarkRemover = () => {
    // Select files
    ipcMain.handle('watermark:select-files', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Supported Files', extensions: ['pdf', 'docx'] },
                { name: 'PDF', extensions: ['pdf'] },
                { name: 'Word', extensions: ['docx'] }
            ]
        });
        return result.filePaths;
    });

    // Detect watermark
    ipcMain.handle('watermark:detect', async (event, filePath) => {
        try {
            const ext = path.extname(filePath).toLowerCase();

            if (ext === '.docx') {
                return await wordRemover.detectWordWatermark(filePath);
            } else if (ext === '.pdf') {
                return await pdfRemover.detectPdfWatermark(filePath);
            } else {
                throw new Error('Unsupported file format');
            }
        } catch (error) {
            console.error('Watermark detection error:', error);
            return { error: error.message };
        }
    });

    // Remove watermark
    ipcMain.on('watermark:remove', async (event, { files, options, id }) => {
        for (const file of files) {
            try {
                event.reply('watermark:progress', { id, file, status: 'processing' });

                const ext = path.extname(file).toLowerCase();
                const fileName = path.basename(file, ext);
                const outputDir = options.outputDir || path.dirname(file);
                const outputPath = path.join(outputDir, `${fileName}_no_watermark${ext}`);

                let result;

                if (ext === '.docx') {
                    result = await wordRemover.removeWordWatermark(file, outputPath);
                } else if (ext === '.pdf') {
                    // Use advanced removal by default
                    if (options.method === 'cover' && options.positions) {
                        result = await pdfRemover.coverPdfWatermark(file, outputPath, options.positions);
                    } else if (options.method === 'advanced') {
                        result = await pdfRemover.removePdfWatermarkAdvanced(file, outputPath, options);
                    } else {
                        result = await pdfRemover.removePdfTextWatermark(file, outputPath, options);
                    }
                } else {
                    throw new Error('Unsupported file format');
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

    // Batch remove watermarks
    ipcMain.handle('watermark:batch-remove', async (event, { files, options }) => {
        const results = [];

        for (const file of files) {
            try {
                const ext = path.extname(file).toLowerCase();
                const fileName = path.basename(file, ext);
                const outputDir = options.outputDir || path.dirname(file);
                const outputPath = path.join(outputDir, `${fileName}_no_watermark${ext}`);

                let result;

                if (ext === '.docx') {
                    result = await wordRemover.removeWordWatermark(file, outputPath);
                } else if (ext === '.pdf') {
                    result = await pdfRemover.removePdfWatermarkAdvanced(file, outputPath, options);
                } else {
                    result = { success: false, message: 'Unsupported format' };
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
