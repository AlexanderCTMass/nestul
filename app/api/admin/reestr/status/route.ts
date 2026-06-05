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
            orderBy: { createdAt: 'desc' },
        });

        // Размер файла БД
        let dbSize = '0 MB';
        try {
            const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
            const dbStats = await stat(dbPath);
            dbSize = `${(dbStats.size / (1024 * 1024)).toFixed(1)} MB`;
        } catch {
            // Файл может быть в корне
            try {
                const dbPath = path.join(process.cwd(), 'dev.db');
                const dbStats = await stat(dbPath);
                dbSize = `${(dbStats.size / (1024 * 1024)).toFixed(1)} MB`;
            } catch {
                dbSize = 'Unknown';
            }
        }

        const status: 'healthy' | 'empty' | 'error' =
            totalEntries > 0 ? 'healthy' : 'empty';

        return NextResponse.json({
            totalEntries,
            lastUpdated: lastUpload?.createdAt?.toISOString() || null,
            dbSize,
            status,
        });
    } catch (error) {
        console.error('Status error:', error);
        return NextResponse.json(
            { totalEntries: 0, lastUpdated: null, dbSize: '0 MB', status: 'error' },
            { status: 200 } // Возвращаем 200 даже при ошибке
        );
    }
}