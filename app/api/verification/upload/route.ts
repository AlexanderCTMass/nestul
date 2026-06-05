// app/api/verification/upload/route.ts
import { writeFile, mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { UPLOAD_DIR } from '@/lib/excel'; // ИСПРАВЛЕНО: единая директория

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ message: 'File not found in request' }, { status: 400 });
        }

        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
            return NextResponse.json(
                { message: 'Unsupported format. Only .xlsx and .xls allowed' },
                { status: 400 }
            );
        }

        const fileId = crypto.randomUUID();

        // ИСПРАВЛЕНО: Создаем директорию если её нет
        try {
            await access(UPLOAD_DIR, constants.F_OK);
        } catch {
            await mkdir(UPLOAD_DIR, { recursive: true });
            console.log('📁 Создана директория:', UPLOAD_DIR);
        }

        const filePath = path.join(UPLOAD_DIR, `${fileId}.xlsx`);
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        console.log('💾 Файл сохранен:', filePath);

        return NextResponse.json({
            fileId,
            fileName: file.name,
            size: file.size,
            uploadDir: UPLOAD_DIR,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { message: 'Internal server error during upload' },
            { status: 500 }
        );
    }
}