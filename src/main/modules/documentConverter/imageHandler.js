import sharp from 'sharp';
import path from 'path';

export const convertImage = async (inputPath, outputPath, options = {}) => {
    // options: { width, height, quality, format }
    let pipeline = sharp(inputPath);

    if (options.width || options.height) {
        pipeline = pipeline.resize(options.width, options.height);
    }

    // Format is usually determined by outputPath extension, but sharp can force it
    const ext = path.extname(outputPath).toLowerCase().slice(1);

    if (ext === 'jpg' || ext === 'jpeg') {
        pipeline = pipeline.jpeg({ quality: options.quality || 80 });
    } else if (ext === 'png') {
        pipeline = pipeline.png({ quality: options.quality || 80 });
    } else if (ext === 'webp') {
        pipeline = pipeline.webp({ quality: options.quality || 80 });
    }

    await pipeline.toFile(outputPath);
    return outputPath;
};
