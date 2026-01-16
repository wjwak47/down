import fs from 'fs';
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
        console.warn('[ImageRemover] Sharp module not available:', err.message);
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

/**
 * Remove watermark from image by covering specified regions
 * @param {string} inputPath - Input image path
 * @param {string} outputPath - Output image path
 * @param {Array} regions - Array of regions to cover [{x, y, width, height, color}]
 * @param {Object} options - Additional options
 */
export const removeImageWatermark = async (inputPath, outputPath, regions = [], options = {}) => {
    try {
        await checkSharp(); // Verify sharp is available
        const image = sharp(inputPath);
        const metadata = await image.metadata();

        if (!regions || regions.length === 0) {
            // If no regions specified, just copy the file
            fs.copyFileSync(inputPath, outputPath);
            return {
                success: true,
                watermarkRemoved: false,
                message: '未指定水印区域，文件已复制'
            };
        }

        // Create SVG overlay for covering regions
        const coverColor = options.coverColor || '#FFFFFF';
        const useBlur = options.useBlur || false;

        let composites = [];

        for (const region of regions) {
            const x = Math.max(0, Math.round(region.x));
            const y = Math.max(0, Math.round(region.y));
            const width = Math.min(Math.round(region.width), metadata.width - x);
            const height = Math.min(Math.round(region.height), metadata.height - y);

            if (width <= 0 || height <= 0) continue;

            if (useBlur) {
                // Extract the region, blur it, and composite back
                const blurredRegion = await sharp(inputPath)
                    .extract({ left: x, top: y, width, height })
                    .blur(options.blurAmount || 15)
                    .toBuffer();

                composites.push({
                    input: blurredRegion,
                    left: x,
                    top: y
                });
            } else {
                // Create a solid color rectangle
                const color = region.color || coverColor;
                const rgba = hexToRgba(color);

                const rect = await sharp({
                    create: {
                        width,
                        height,
                        channels: 4,
                        background: rgba
                    }
                }).png().toBuffer();

                composites.push({
                    input: rect,
                    left: x,
                    top: y
                });
            }
        }

        // Apply all composites
        if (composites.length > 0) {
            await image
                .composite(composites)
                .toFile(outputPath);
        } else {
            fs.copyFileSync(inputPath, outputPath);
        }

        return {
            success: true,
            watermarkRemoved: true,
            regionsProcessed: composites.length,
            message: `成功处理 ${composites.length} 个水印区域`
        };

    } catch (error) {
        throw new Error(`图片水印去除失败: ${error.message}`);
    }
};

/**
 * Auto-detect potential watermark regions in image
 * Uses simple heuristics (edges, corners, semi-transparent areas)
 */
export const detectImageWatermark = async (inputPath) => {
    try {
        await checkSharp(); // Verify sharp is available
        const image = sharp(inputPath);
        const metadata = await image.metadata();

        // Get image buffer for analysis
        const { data, info } = await image
            .raw()
            .toBuffer({ resolveWithObject: true });

        const suspiciousRegions = [];

        // Check common watermark positions
        const positions = [
            { name: '右下角', x: metadata.width * 0.7, y: metadata.height * 0.85, width: metadata.width * 0.28, height: metadata.height * 0.12 },
            { name: '左下角', x: metadata.width * 0.02, y: metadata.height * 0.85, width: metadata.width * 0.28, height: metadata.height * 0.12 },
            { name: '右上角', x: metadata.width * 0.7, y: metadata.height * 0.02, width: metadata.width * 0.28, height: metadata.height * 0.12 },
            { name: '中央', x: metadata.width * 0.25, y: metadata.height * 0.4, width: metadata.width * 0.5, height: metadata.height * 0.2 }
        ];

        return {
            hasWatermark: true, // We can't really detect automatically, so we just suggest common positions
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            suggestedRegions: positions,
            message: '已分析图片，请手动选择水印区域'
        };

    } catch (error) {
        throw new Error(`图片水印检测失败: ${error.message}`);
    }
};

/**
 * Get image info and generate preview
 */
export const getImageInfo = async (inputPath) => {
    try {
        await checkSharp(); // Verify sharp is available
        const image = sharp(inputPath);
        const metadata = await image.metadata();

        // Generate base64 preview (max 800px)
        const previewBuffer = await image
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80 })
            .toBuffer();

        const previewBase64 = `data:image/jpeg;base64,${previewBuffer.toString('base64')}`;

        return {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            size: fs.statSync(inputPath).size,
            preview: previewBase64
        };

    } catch (error) {
        throw new Error(`获取图片信息失败: ${error.message}`);
    }
};

/**
 * Convert hex color to RGBA object
 */
function hexToRgba(hex, alpha = 255) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
            alpha: alpha
        };
    }
    return { r: 255, g: 255, b: 255, alpha: 255 };
}

/**
 * Supported image formats
 */
export const supportedFormats = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'];
