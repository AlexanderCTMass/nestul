// app/api/admin/reestr/status/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stat } from 'fs/promises';
import path from 'path';

export async function GET() {
    try {
        const totalEntries = await prisma.reestrEntry.count();

        // Находим последнюю загрузку Реестра
        const lastUpload = await prisma.verificationCheck.findFirst({
            where: {
                fileName: { startsWith: 'Registry upload:' },
            },
        });

        // Размер файла БД
        let dbSize = '0 MB';
        try {
            const dbPath = path.join(process.cwd(), 'data', 'reestr.json');
            const dbStats = await stat(dbPath);
            dbSize = `${(dbStats.size / (1024 * 1024)).toFixed(1)} MB`;
        } catch {
            dbSize = 'Unknown';
        }

        const status: 'healthy' | 'empty' | 'error' =
            totalEntries > 0 ? 'healthy' : 'empty';

        return NextResponse.json({
            totalEntries,
            lastUpdated: lastUpload?.createdAt || null, // ИСПРАВЛЕНО: возвращаем как есть
            dbSize,
            status,
        });
    } catch (error) {
        console.error('Status error:', error);
        return NextResponse.json(
            { totalEntries: 0, lastUpdated: null, dbSize: '0 MB', status: 'error' },
            { status: 200 }
        );
    }
}