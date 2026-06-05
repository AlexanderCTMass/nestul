// lib/excel.ts
import * as XLSX from 'xlsx';
import path from 'path';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';

// ИСПРАВЛЕНО: Единая константа для директории загрузок
export const UPLOAD_DIR = process.env.VERCEL === '1' ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');

export async function readExcelFile(fileId: string) {
    const filePath = path.join(UPLOAD_DIR, `${fileId}.xlsx`);

    // ИСПРАВЛЕНО: Проверка существования файла
    try {
        await access(filePath, constants.R_OK);
    } catch {
        throw new Error(`File not found: ${fileId}.xlsx`);
    }

    const fileBuffer = await readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    // ИСПРАВЛЕНО: Поиск первого доступного листа, если "Лист1" не найден
    let worksheet = workbook.Sheets['Лист1'];
    if (!worksheet && workbook.SheetNames.length > 0) {
        worksheet = workbook.Sheets[workbook.SheetNames[0]];
        console.log(`⚠️ Лист "Лист1" не найден, используем: ${workbook.SheetNames[0]}`);
    }

    if (!worksheet) {
        throw new Error(`Нет доступных листов. Доступные: ${workbook.SheetNames.join(', ')}`);
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    return { workbook, worksheet, jsonData };
}