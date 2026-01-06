import { ipcMain, dialog } from 'electron';
import archiver from 'archiver';
import decompress from 'decompress';
import fs from 'fs';
import path from 'path';

export const registerFileCompressor = () => {
    // Select files
    ipcMain.handle('zip:select-files', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile', 'multiSelections', 'openDirectory'],
        });
        return result.filePaths;
    });

    // Compress
    ipcMain.on('zip:compress', (event, { files, options, id }) => {
        // options: { outputName, level }
        const outputName = options.outputName || 'archive.zip';
        const outputDir = options.outputDir || path.dirname(files[0]);
        const outputPath = path.join(outputDir, outputName);

        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            event.reply('zip:complete', { id, success: true, outputPath, size: archive.pointer() });
        });

        archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
                console.warn(err);
            } else {
                event.reply('zip:complete', { id, success: false, error: err.message });
            }
        });

        archive.on('error', function (err) {
            event.reply('zip:complete', { id, success: false, error: err.message });
        });

        archive.on('progress', (progress) => {
            event.reply('zip:progress', {
                id,
                status: 'compressing',
                entries: progress.entries.processed,
                total: progress.entries.total
            });
        });

        archive.pipe(output);

        files.forEach(file => {
            const stat = fs.statSync(file);
            if (stat.isDirectory()) {
                archive.directory(file, path.basename(file));
            } else {
                archive.file(file, { name: path.basename(file) });
            }
        });

        archive.finalize();
    });

    // Decompress
    ipcMain.on('zip:decompress', async (event, { file, options, id }) => {
        try {
            const outputDir = options.outputDir || path.join(path.dirname(file), path.basename(file, path.extname(file)));

            event.reply('zip:progress', { id, status: 'extracting', percent: 0 });

            await decompress(file, outputDir);

            event.reply('zip:complete', { id, success: true, outputPath: outputDir });
        } catch (error) {
            event.reply('zip:complete', { id, success: false, error: error.message });
        }
    });
};
