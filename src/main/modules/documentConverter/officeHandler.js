import mammoth from 'mammoth';
import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';
import libre from 'libreoffice-convert';
import { promisify } from 'util';

const libreConvert = promisify(libre.convert);

/**
 * Convert Word document to PDF
 */
export const convertWordToPdf = async (inputPath, outputPath) => {
    const docxBuffer = fs.readFileSync(inputPath);

    try {
        const pdfBuffer = await libreConvert(docxBuffer, '.pdf', undefined);
        fs.writeFileSync(outputPath, pdfBuffer);
    } catch (error) {
        throw new Error(`Word to PDF conversion failed: ${error.message}`);
    }
};

export const convertWordToHtml = async (inputPath) => {
    const result = await mammoth.convertToHtml({ path: inputPath });
    return result.value;
};

export const convertWordToText = async (inputPath) => {
    const result = await mammoth.extractRawText({ path: inputPath });
    return result.value;
};

export const convertExcelToCsv = (inputPath, outputPath) => {
    const workbook = xlsx.readFile(inputPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const csvContent = xlsx.utils.sheet_to_csv(worksheet);
    fs.writeFileSync(outputPath, csvContent);
    return outputPath;
};

export const convertExcelToJson = (inputPath, outputPath) => {
    const workbook = xlsx.readFile(inputPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonContent = xlsx.utils.sheet_to_json(worksheet);
    fs.writeFileSync(outputPath, JSON.stringify(jsonContent, null, 2));
    return outputPath;
};

/**
 * Convert Excel to PDF
 */
export const convertExcelToPdf = async (inputPath, outputPath) => {
    const xlsxBuffer = fs.readFileSync(inputPath);

    try {
        const pdfBuffer = await libreConvert(xlsxBuffer, '.pdf', undefined);
        fs.writeFileSync(outputPath, pdfBuffer);
    } catch (error) {
        throw new Error(`Excel to PDF conversion failed: ${error.message}`);
    }
};

/**
 * Convert PowerPoint to PDF
 */
export const convertPptToPdf = async (inputPath, outputPath) => {
    const pptxBuffer = fs.readFileSync(inputPath);

    try {
        const pdfBuffer = await libreConvert(pptxBuffer, '.pdf', undefined);
        fs.writeFileSync(outputPath, pdfBuffer);
    } catch (error) {
        throw new Error(`PowerPoint to PDF conversion failed: ${error.message}`);
    }
};
