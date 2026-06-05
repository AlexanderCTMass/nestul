import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE() {
    try {
        const count = await prisma.reestrEntry.count();

        // Удаляем все записи Реестра
        await prisma.reestrEntry.deleteMany();

        // Логируем очистку - ИСПРАВЛЕНО: убираем обертку data
        await prisma.verificationCheck.create({
            id: crypto.randomUUID(),
            fileId: 'admin-clear',
            fileName: 'Database cleared by admin',
            status: 'completed',
            totalRows: count,
            criticalErrors: 0,
            warnings: 0,
            nlpResults: JSON.stringify({
                type: 'database_clear',
                deletedEntries: count,
                timestamp: new Date().toISOString(),
            }),
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({
            message: `Deleted ${count} entries`,
            deletedCount: count,
        });
    } catch (error) {
        console.error('Clear error:', error);
        return NextResponse.json(
            { message: 'Error clearing database' },
            { status: 500 }
        );
    }
}