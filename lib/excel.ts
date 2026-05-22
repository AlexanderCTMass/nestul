import * as XLSX from 'xlsx';
import path from 'path';
import { readFile } from 'fs/promises';

export async function readExcelFile(fileId: string) {
    // Определяем директорию в зависимости от окружения
    const isVercel = process.env.VERCEL === '1';
    const uploadDir = isVercel
        ? '/tmp/uploads'
        : path.join(process.cwd(), 'uploads');

    const filePath = path.join(uploadDir, `${fileId}.xlsx`);
    const fileBuffer = await readFile(filePath);
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

    const worksheet = workbook.Sheets['Лист1'];
    if (!worksheet) {
        throw new Error(`Лист "Лист1" не найден. Доступные: ${workbook.SheetNames.join(', ')}`);
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    return { workbook, worksheet, jsonData };
}