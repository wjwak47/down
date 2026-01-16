import path from 'path';

// Try to load sharp, but handle gracefully if it fails (e.g., on Mac without native bindings)
let sharp = null;
let sharpError = null;
let sharpLoaded = false;

// Lazy load sharp on first use
const loadSharp = async () => {
    if (sharpLoaded) return;
    sharpLoaded = true;
    try {
        const sharpModule = await import('sharp');
        sharp = sharpModule.default;
    } catch (err) {
        sharpError = err.message;
        console.warn('[ImageHandler] Sharp module not available:', err.message);
    }
};

// Helper to check if sharp is available
const checkSharp = async () => {
    await loadSharp();
    if (!sharp) {
        throw new Error(`图片处理模块不可用: ${sharpError || 'sharp module not loaded'}. 请尝试重新安装应用。`);
    }
    return sharp;
};

export const convertImage = async (inputPath, outputPath, options = {}) => {
    // options: { width, height, quality, format }
    const sharpModule = await checkSharp(); // Verify sharp is available
    let pipeline = sharpModule(inputPath);

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
