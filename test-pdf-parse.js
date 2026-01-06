const fs = require('fs');
const path = require('path');

async function test() {
    try {
        const pdfModule = require('pdf-parse');
        const PDFParse = pdfModule.PDFParse;

        // We need a real PDF to test image extraction. 
        // Since we don't have the user's PDF, we'll try to use a dummy one or just check the API behavior if possible.
        // Actually, without a real PDF with images, getImage might return nothing.
        // Let's try to find ANY pdf in the user's workspace to test, or create a minimal one using pdf-lib if needed.

        // Let's just check the class and method existence first, and maybe try to run on a non-existent file to see if it throws or what.

        const parser = new PDFParse({ data: Buffer.from('%PDF-1.4\n...') });
        console.log('Parser created');

        if (typeof parser.getImage === 'function') {
            console.log('getImage is a function');
            // We can't really test output without a valid PDF.
            // But we can check if we can import ImageRun from docx
            try {
                const docx = require('docx');
                console.log('docx.ImageRun exists:', !!docx.ImageRun);
                console.log('docx.PageBreak exists:', !!docx.PageBreak);
            } catch (e) {
                console.log('Error requiring docx:', e.message);
            }
        } else {
            console.log('getImage is NOT a function');
        }

    } catch (e) {
        console.error('Fatal error:', e);
    }
}

test();
