import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';
import xml2js from 'xml2js';

/**
 * Remove watermark from Word (.docx) document
 * Word watermarks are stored in the document's XML structure
 */
export const removeWordWatermark = async (inputPath, outputPath) => {
    try {
        // Read the .docx file
        const data = fs.readFileSync(inputPath);
        const zip = await JSZip.loadAsync(data);

        // Word documents are ZIP files containing XML
        // Watermarks are typically in word/header*.xml files
        const filesToCheck = [
            'word/header1.xml',
            'word/header2.xml',
            'word/header3.xml',
            'word/document.xml'
        ];

        let watermarkRemoved = false;

        for (const fileName of filesToCheck) {
            const file = zip.file(fileName);
            if (!file) continue;

            const content = await file.async('string');

            // Parse XML
            const parser = new xml2js.Parser();
            const builder = new xml2js.Builder();
            const xml = await parser.parseStringPromise(content);

            // Remove watermark elements
            if (xml && xml['w:hdr']) {
                // Check for watermark in header
                const removed = removeWatermarkFromXml(xml['w:hdr']);
                if (removed) {
                    watermarkRemoved = true;
                    const newXml = builder.buildObject(xml);
                    zip.file(fileName, newXml);
                }
            } else if (xml && xml['w:document']) {
                // Check for watermark in document
                const removed = removeWatermarkFromXml(xml['w:document']);
                if (removed) {
                    watermarkRemoved = true;
                    const newXml = builder.buildObject(xml);
                    zip.file(fileName, newXml);
                }
            }
        }

        // Generate the modified .docx file
        const modifiedData = await zip.generateAsync({ type: 'nodebuffer' });
        fs.writeFileSync(outputPath, modifiedData);

        return {
            success: true,
            watermarkRemoved,
            message: watermarkRemoved ? 'Watermark removed successfully' : 'No watermark found'
        };

    } catch (error) {
        throw new Error(`Failed to remove Word watermark: ${error.message}`);
    }
};

/**
 * Remove watermark elements from XML object
 * @param {Object} xmlObj - Parsed XML object
 * @returns {boolean} - Whether watermark was found and removed
 */
function removeWatermarkFromXml(xmlObj) {
    let removed = false;

    // Common watermark identifiers (including Chinese versions)
    const watermarkPatterns = [
        'watermark', 'Watermark', 'WATERMARK',
        'PowerPlusWaterMarkObject', 'WordPictureWatermark',
        '水印', '仅供参考', '机密', 'CONFIDENTIAL', 'DRAFT', 'SAMPLE',
        '_x0000_s', 'Wordmark'
    ];

    // Check if a string contains watermark patterns
    const isWatermarkRelated = (str) => {
        if (!str) return false;
        const lowerStr = String(str).toLowerCase();
        return watermarkPatterns.some(pattern =>
            lowerStr.includes(pattern.toLowerCase())
        );
    };

    // Recursively search and remove watermark elements
    function traverse(obj, parent = null, key = null) {
        if (!obj || typeof obj !== 'object') return;

        // Check for VML shapes (v:shape) - common watermark container
        if (obj['v:shape']) {
            const shapes = Array.isArray(obj['v:shape']) ? obj['v:shape'] : [obj['v:shape']];
            const filtered = shapes.filter(shape => {
                const id = shape.$?.id || '';
                const type = shape.$?.type || '';
                const style = shape.$?.style || '';

                // Check if it's a watermark shape
                if (isWatermarkRelated(id) || isWatermarkRelated(type)) {
                    removed = true;
                    return false;
                }

                // Check for diagonal text (common watermark style)
                if (style.includes('rotation:') && style.includes('position:absolute')) {
                    removed = true;
                    return false;
                }

                return true;
            });

            if (filtered.length === 0) {
                delete obj['v:shape'];
            } else if (filtered.length !== shapes.length) {
                obj['v:shape'] = filtered.length === 1 ? filtered[0] : filtered;
            }
        }

        // Check for VML textbox (v:textbox) - text watermarks
        if (obj['v:textbox']) {
            delete obj['v:textbox'];
            removed = true;
        }

        // Check for Word picture elements (w:pict) that contain watermarks
        if (obj['w:pict']) {
            const picts = Array.isArray(obj['w:pict']) ? obj['w:pict'] : [obj['w:pict']];
            const filtered = picts.filter(pict => {
                // Check if pict contains watermark shapes
                const pictStr = JSON.stringify(pict);
                if (isWatermarkRelated(pictStr)) {
                    removed = true;
                    return false;
                }
                return true;
            });

            if (filtered.length === 0) {
                delete obj['w:pict'];
            } else if (filtered.length !== picts.length) {
                obj['w:pict'] = filtered.length === 1 ? filtered[0] : filtered;
            }
        }

        // Check for AlternateContent (mc:AlternateContent) - modern watermark container
        if (obj['mc:AlternateContent']) {
            const contents = Array.isArray(obj['mc:AlternateContent'])
                ? obj['mc:AlternateContent']
                : [obj['mc:AlternateContent']];
            const filtered = contents.filter(content => {
                const contentStr = JSON.stringify(content);
                if (isWatermarkRelated(contentStr)) {
                    removed = true;
                    return false;
                }
                return true;
            });

            if (filtered.length === 0) {
                delete obj['mc:AlternateContent'];
            } else if (filtered.length !== contents.length) {
                obj['mc:AlternateContent'] = filtered.length === 1 ? filtered[0] : filtered;
            }
        }

        // Check for text watermarks (w:p with specific styles)
        if (obj['w:p']) {
            const paragraphs = Array.isArray(obj['w:p']) ? obj['w:p'] : [obj['w:p']];
            const filtered = paragraphs.filter(para => {
                // Check if paragraph contains watermark text
                const pPr = para['w:pPr'];
                if (pPr && pPr[0] && pPr[0]['w:pStyle']) {
                    const style = pPr[0]['w:pStyle'][0].$?.['w:val'];
                    if (isWatermarkRelated(style)) {
                        removed = true;
                        return false;
                    }
                }
                return true;
            });

            if (filtered.length === 0) {
                delete obj['w:p'];
            } else if (filtered.length !== paragraphs.length) {
                obj['w:p'] = filtered.length === 1 ? filtered[0] : filtered;
            }
        }

        // Recursively traverse all properties
        for (const k in obj) {
            if (obj.hasOwnProperty(k) && typeof obj[k] === 'object') {
                traverse(obj[k], obj, k);
            }
        }
    }

    traverse(xmlObj);
    return removed;
}

/**
 * Detect if Word document has watermark
 */
export const detectWordWatermark = async (inputPath) => {
    try {
        const data = fs.readFileSync(inputPath);
        const zip = await JSZip.loadAsync(data);

        const filesToCheck = [
            'word/header1.xml',
            'word/header2.xml',
            'word/header3.xml',
            'word/document.xml',
            'word/settings.xml'
        ];

        // Extended watermark patterns including Chinese
        const watermarkPatterns = [
            'Watermark', 'watermark', 'PowerPlusWaterMarkObject',
            'WordPictureWatermark', 'v:shape', 'v:textbox',
            '水印', '仅供参考', '机密', 'CONFIDENTIAL', 'DRAFT', 'SAMPLE',
            'mc:AlternateContent', '_x0000_s'
        ];

        for (const fileName of filesToCheck) {
            const file = zip.file(fileName);
            if (!file) continue;

            const content = await file.async('string');

            // Check for watermark indicators
            for (const pattern of watermarkPatterns) {
                if (content.includes(pattern)) {
                    return {
                        hasWatermark: true,
                        location: fileName,
                        pattern: pattern,
                        confidence: pattern.toLowerCase().includes('watermark') ? 'high' : 'medium'
                    };
                }
            }
        }

        return { hasWatermark: false };

    } catch (error) {
        throw new Error(`Failed to detect watermark: ${error.message}`);
    }
};
