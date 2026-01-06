import { ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

export const registerDocumentConverter = () => {
    // Select files
    ipcMain.handle('doc:select-files', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'Documents', extensions: ['pdf', 'docx', 'xlsx', 'pptx', 'jpg', 'png', 'webp'] },
                { name: 'PDF', extensions: ['pdf'] },
                { name: 'Word', extensions: ['docx'] },
                { name: 'Excel', extensions: ['xlsx'] },
                { name: 'PowerPoint', extensions: ['pptx'] },
                { name: 'Images', extensions: ['jpg', 'png', 'webp', 'jpeg'] }
            ]
        });
        return result.filePaths;
    });

    // Convert
    ipcMain.on('doc:convert', async (event, { files, targetFormat, options, id }) => {
        // Simple sequential processing
        for (const file of files) {
            try {
                event.reply('doc:progress', { id, file, status: 'processing', percent: 0 });

                const ext = path.extname(file).toLowerCase();
                const fileName = path.basename(file, ext);
                const outputDir = options.outputDir || path.dirname(file);
                const outputPath = path.join(outputDir, `${fileName}_converted.${targetFormat}`);

                // Dispatch based on input type and target format
                let success = false;

                // 1. Image Conversion
                if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                    const imageHandler = await import('./imageHandler');
                    if (['jpg', 'png', 'webp'].includes(targetFormat)) {
                        await imageHandler.convertImage(file, outputPath, options);
                        success = true;
                    } else if (targetFormat === 'pdf') {
                        const pdfHandler = await import('./pdfHandler');
                        // Image to PDF (single file)
                        await pdfHandler.createPdfFromImages([file], outputPath);
                        success = true;
                    }
                }

                // 2. Word Conversion
                else if (ext === '.docx') {
                    const officeHandler = await import('./officeHandler');
                    if (targetFormat === 'pdf') {
                        await officeHandler.convertWordToPdf(file, outputPath);
                        success = true;
                    } else if (targetFormat === 'html') {
                        const html = await officeHandler.convertWordToHtml(file);
                        fs.writeFileSync(outputPath, html);
                        success = true;
                    } else if (targetFormat === 'txt') {
                        const text = await officeHandler.convertWordToText(file);
                        fs.writeFileSync(outputPath, text);
                        success = true;
                    }
                }

                // 3. Excel Conversion
                else if (ext === '.xlsx') {
                    const officeHandler = await import('./officeHandler');
                    if (targetFormat === 'pdf') {
                        await officeHandler.convertExcelToPdf(file, outputPath);
                        success = true;
                    } else if (targetFormat === 'csv') {
                        officeHandler.convertExcelToCsv(file, outputPath);
                        success = true;
                    } else if (targetFormat === 'json') {
                        officeHandler.convertExcelToJson(file, outputPath);
                        success = true;
                    }
                }

                // 4. PowerPoint Conversion
                else if (ext === '.pptx') {
                    const officeHandler = await import('./officeHandler');
                    if (targetFormat === 'pdf') {
                        await officeHandler.convertPptToPdf(file, outputPath);
                        success = true;
                    }
                }

                // 5. PDF Operations
                else if (ext === '.pdf') {
                    const pdfHandler = await import('./pdfHandler');
                    if (targetFormat === 'docx') {
                        await pdfHandler.convertPdfToDocx(file, outputPath);
                        success = true;
                    } else if (targetFormat === 'txt') {
                        const text = await pdfHandler.convertPdfToText(file);
                        fs.writeFileSync(outputPath, text);
                        success = true;
                    } else if (targetFormat === 'png' || targetFormat === 'jpg') {
                        // PDF to images - outputs multiple files
                        const outputDir = options.outputDir || path.dirname(file);
                        await pdfHandler.convertPdfToImages(file, outputDir, targetFormat);
                        success = true;
                    } else {
                        throw new Error(`Conversion from PDF to ${targetFormat} not supported yet`);
                    }
                }

                if (success) {
                    event.reply('doc:complete', { id, file, success: true, outputPath });
                } else {
                    throw new Error(`Conversion from ${ext} to ${targetFormat} not supported`);
                }

            } catch (error) {
                console.error(error);
                event.reply('doc:complete', { id, file, success: false, error: error.message });
            }
        }
    });

    // Merge PDFs
    ipcMain.handle('doc:merge-pdfs', async (event, { files, outputPath }) => {
        try {
            const pdfHandler = await import('./pdfHandler');
            await pdfHandler.mergePdfs(files, outputPath);
            return { success: true, outputPath };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });
};
