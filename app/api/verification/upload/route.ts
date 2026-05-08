import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

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
        const uploadDir = path.join(process.cwd(), 'uploads');

        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, `${fileId}.xlsx`);
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        return NextResponse.json({
            fileId,
            fileName: file.name,
            size: file.size,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { message: 'Internal server error during upload' },
            { status: 500 }
        );
    }
}