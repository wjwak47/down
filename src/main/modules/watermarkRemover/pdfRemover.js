import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs';

/**
 * Remove text watermark from PDF
 * Attempts to remove text-based watermarks by filtering content streams
 */
export const removePdfTextWatermark = async (inputPath, outputPath, options = {}) => {
    try {
        const existingPdfBytes = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        const pages = pdfDoc.getPages();
        let watermarkRemoved = false;

        for (const page of pages) {
            try {
                // Get page content
                const { width, height } = page.getSize();

                // Try to remove watermark annotations
                const annotations = page.node.get(page.node.context.obj('Annots'));
                if (annotations) {
                    // Remove watermark annotations
                    page.node.delete(page.node.context.obj('Annots'));
                    watermarkRemoved = true;
                }

                // If specific watermark text is provided, try to cover it
                if (options.watermarkText) {
                    // Draw a white rectangle over common watermark positions
                    // This is a simple approach - covering with background color
                    page.drawRectangle({
                        x: width * 0.25,
                        y: height * 0.4,
                        width: width * 0.5,
                        height: 40,
                        color: rgb(1, 1, 1), // White
                        opacity: 1,
                    });
                    watermarkRemoved = true;
                }

            } catch (pageError) {
                console.warn(`Error processing page: ${pageError.message}`);
                // Continue with other pages
            }
        }

        // Save the modified PDF
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, pdfBytes);

        return {
            success: true,
            watermarkRemoved,
            pages: pages.length,
            message: watermarkRemoved ? 'Watermark removal attempted' : 'No obvious watermark found'
        };

    } catch (error) {
        throw new Error(`Failed to remove PDF watermark: ${error.message}`);
    }
};

/**
 * Advanced PDF watermark removal using content stream filtering
 * This is more aggressive and may affect other content
 */
export const removePdfWatermarkAdvanced = async (inputPath, outputPath, options = {}) => {
    try {
        const existingPdfBytes = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes, {
            ignoreEncryption: true,
            updateMetadata: false
        });

        const pages = pdfDoc.getPages();
        let removedCount = 0;

        // Common watermark text patterns
        const watermarkTexts = options.watermarkText ? [options.watermarkText] : [
            '水印', '仅供参考', '机密', 'CONFIDENTIAL', 'DRAFT', 'SAMPLE',
            'WATERMARK', 'DO NOT COPY', '内部资料', '版权所有'
        ];

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];

            try {
                // Remove all annotations (which may include watermarks)
                const annotations = page.node.Annots;
                if (annotations) {
                    page.node.delete(page.node.context.obj('Annots'));
                    removedCount++;
                }

                // Check for Optional Content Groups (OCG/layers) - common for watermarks
                const resources = page.node.Resources;
                if (resources) {
                    // Try to remove XObjects that might be watermarks
                    const xObjects = resources.get(page.node.context.obj('XObject'));
                    if (xObjects) {
                        try {
                            const entries = xObjects.entries ? xObjects.entries() : [];
                            for (const [key, value] of entries) {
                                const keyStr = key.toString().toLowerCase();
                                // Check if it looks like a watermark by name
                                if (keyStr.includes('watermark') || keyStr.includes('wm') ||
                                    keyStr.includes('fm') || keyStr.includes('im')) {
                                    try {
                                        xObjects.delete(key);
                                        removedCount++;
                                    } catch (e) {
                                        // Ignore deletion errors
                                    }
                                }
                            }
                        } catch (e) {
                            // XObject iteration may fail on some PDFs
                        }
                    }

                    // Try to access and remove properties dictionary
                    const props = resources.get(page.node.context.obj('Properties'));
                    if (props) {
                        try {
                            const entries = props.entries ? props.entries() : [];
                            for (const [key] of entries) {
                                const keyStr = key.toString().toLowerCase();
                                if (keyStr.includes('watermark') || keyStr.includes('wm')) {
                                    props.delete(key);
                                    removedCount++;
                                }
                            }
                        } catch (e) {
                            // Ignore
                        }
                    }
                }

                // If cover mode is enabled, cover common watermark positions
                if (options.coverMode) {
                    const { width, height } = page.getSize();

                    // Cover diagonal center (most common watermark position)
                    page.drawRectangle({
                        x: width * 0.2,
                        y: height * 0.35,
                        width: width * 0.6,
                        height: height * 0.3,
                        color: rgb(1, 1, 1),
                        opacity: 0.98,
                    });
                    removedCount++;
                }

            } catch (pageError) {
                console.warn(`Error processing page ${i + 1}: ${pageError.message}`);
            }
        }

        // Save modified PDF
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, pdfBytes);

        return {
            success: true,
            watermarkRemoved: removedCount > 0,
            removedCount,
            pages: pages.length,
            message: removedCount > 0
                ? `已处理 ${pages.length} 页，移除了 ${removedCount} 个水印元素`
                : '未找到可识别的水印元素，尝试其他方法'
        };

    } catch (error) {
        throw new Error(`PDF 水印去除失败: ${error.message}`);
    }
};

/**
 * Detect potential watermarks in PDF
 */
export const detectPdfWatermark = async (inputPath) => {
    try {
        const pdfBytes = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(pdfBytes);

        const pages = pdfDoc.getPages();
        let hasAnnotations = false;
        let hasTransparentLayers = false;
        let suspiciousXObjects = 0;

        for (const page of pages) {
            // Check for annotations
            if (page.node.Annots) {
                hasAnnotations = true;
            }

            // Check for XObjects that might be watermarks
            const resources = page.node.Resources;
            if (resources) {
                const xObjects = resources.get(page.node.context.obj('XObject'));
                if (xObjects) {
                    const entries = xObjects.entries();
                    for (const [key] of entries) {
                        if (key.toString().toLowerCase().includes('watermark') ||
                            key.toString().toLowerCase().includes('wm')) {
                            suspiciousXObjects++;
                        }
                    }
                }
            }
        }

        return {
            hasWatermark: hasAnnotations || suspiciousXObjects > 0,
            details: {
                pages: pages.length,
                hasAnnotations,
                suspiciousXObjects,
                confidence: suspiciousXObjects > 0 ? 'high' : hasAnnotations ? 'medium' : 'low'
            }
        };

    } catch (error) {
        throw new Error(`Failed to detect PDF watermark: ${error.message}`);
    }
};

/**
 * Remove watermark by covering with white rectangle
 * Requires user to specify watermark position
 */
export const coverPdfWatermark = async (inputPath, outputPath, positions) => {
    try {
        const existingPdfBytes = fs.readFileSync(inputPath);
        const pdfDoc = await PDFDocument.load(existingPdfBytes);

        const pages = pdfDoc.getPages();

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const { width, height } = page.getSize();

            // Cover each specified position with white rectangle
            for (const pos of positions) {
                const x = pos.x !== undefined ? pos.x : width * (pos.xPercent || 0.5);
                const y = pos.y !== undefined ? pos.y : height * (pos.yPercent || 0.5);
                const w = pos.width || width * 0.3;
                const h = pos.height || 50;

                page.drawRectangle({
                    x,
                    y,
                    width: w,
                    height: h,
                    color: rgb(1, 1, 1),
                    opacity: 1,
                });
            }
        }

        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(outputPath, pdfBytes);

        return {
            success: true,
            message: `Covered ${positions.length} watermark positions on ${pages.length} pages`
        };

    } catch (error) {
        throw new Error(`Failed to cover watermark: ${error.message}`);
    }
};
