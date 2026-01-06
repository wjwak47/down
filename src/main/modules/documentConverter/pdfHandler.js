import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { Document, Packer, Paragraph, ImageRun, PageBreak } from 'docx';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import poppler from 'pdf-poppler';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const mergePdfs = async (files, outputPath) => {
    const mergedPdf = await PDFDocument.create();

    for (const file of files) {
        const pdfBytes = fs.readFileSync(file);
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const pdfBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, pdfBytes);
    return outputPath;
};

export const createPdfFromImages = async (imageFiles, outputPath) => {
    const pdfDoc = await PDFDocument.create();

    for (const imagePath of imageFiles) {
        const imageBytes = fs.readFileSync(imagePath);
        const ext = path.extname(imagePath).toLowerCase();
        let image;

        if (ext === '.jpg' || ext === '.jpeg') {
            image = await pdfDoc.embedJpg(imageBytes);
        } else if (ext === '.png') {
            image = await pdfDoc.embedPng(imageBytes);
        } else {
            continue;
        }

        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
        });
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    return outputPath;
};

export const convertPdfToText = async (inputPath) => {
    // For scanned PDFs, this will return minimal text
    // Consider using OCR for better results
    throw new Error('Text extraction from scanned PDFs requires OCR. Please use PDF to DOCX conversion instead.');
};

export const convertPdfToDocx = async (inputPath, outputPath) => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-convert-'));

    try {
        // Convert PDF pages to PNG images using pdf-poppler
        const opts = {
            format: 'png',
            out_dir: tempDir,
            out_prefix: 'page',
            page: null, // Convert all pages
            scale: 2048 // Higher resolution for better quality
        };

        await poppler.convert(inputPath, opts);

        // Get all generated PNG files
        const files = fs.readdirSync(tempDir)
            .filter(file => file.endsWith('.png'))
            .sort((a, b) => {
                // Sort by page number
                const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                return numA - numB;
            });

        if (files.length === 0) {
            throw new Error('No pages were converted from the PDF');
        }

        const docChildren = [];

        // Add each page image to the Word document
        for (let i = 0; i < files.length; i++) {
            const imagePath = path.join(tempDir, files[i]);
            const imageBuffer = fs.readFileSync(imagePath);

            // Add image to document with reasonable sizing
            docChildren.push(new Paragraph({
                children: [
                    new ImageRun({
                        data: imageBuffer,
                        transformation: {
                            width: 600, // 600 points ≈ 8.3 inches (A4 width minus margins)
                            height: 776  // Maintain ~A4 aspect ratio
                        }
                    })
                ]
            }));

            // Add page break between pages (except after last page)
            if (i < files.length - 1) {
                docChildren.push(new Paragraph({
                    children: [new PageBreak()]
                }));
            }
        }

        // Create Word document
        const doc = new Document({
            sections: [{
                properties: {},
                children: docChildren,
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(outputPath, buffer);

        return outputPath;
    } catch (error) {
        console.error('Error converting PDF to DOCX:', error);
        throw new Error(`Failed to convert PDF to DOCX: ${error.message}`);
    } finally {
        // Clean up temporary files
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupError) {
            console.warn('Failed to clean up temporary files:', cleanupError);
        }
    }
};

/**
 * Convert PDF to images (one image per page)
 * @param {string} inputPath - Path to PDF file
 * @param {string} outputDir - Directory to save images
 * @param {string} format - Output format ('png' or 'jpg')
 * @returns {Promise<string[]>} Array of output image paths
 */
export const convertPdfToImages = async (inputPath, outputDir, format = 'png') => {
    const opts = {
        format: format,
        out_dir: outputDir,
        out_prefix: path.basename(inputPath, '.pdf'),
        page: null // null means all pages
    };

    try {
        await poppler.convert(inputPath, opts);

        // Return paths to generated images
        const baseName = path.basename(inputPath, '.pdf');
        const files = fs.readdirSync(outputDir);
        const imageFiles = files.filter(f => f.startsWith(baseName) && (f.endsWith('.png') || f.endsWith('.jpg')));

        return imageFiles.map(f => path.join(outputDir, f));
    } catch (error) {
        throw new Error(`PDF to image conversion failed: ${error.message}`);
    }
};
