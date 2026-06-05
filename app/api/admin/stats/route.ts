// app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [totalEntries, totalChecks, checksToday, checksThisMonth, recentChecks] =
            await Promise.all([
                prisma.reestrEntry.count(),
                prisma.verificationCheck.count({
                    where: { fileName: { not: { startsWith: 'Registry upload:' } } },
                }),
                prisma.verificationCheck.count({
                    where: {
                        createdAt: { gte: startOfDay.toISOString() }, // ИСПРАВЛЕНО: передаем строкой
                        fileName: { not: { startsWith: 'Registry upload:' } },
                    },
                }),
                prisma.verificationCheck.count({
                    where: {
                        createdAt: { gte: startOfMonth.toISOString() }, // ИСПРАВЛЕНО: передаем строкой
                        fileName: { not: { startsWith: 'Registry upload:' } },
                    },
                }),
                prisma.verificationCheck.findMany({
                    where: { fileName: { not: { startsWith: 'Registry upload:' } } },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                    select: {
                        id: true,
                        fileName: true,
                        status: true,
                        criticalErrors: true,
                        createdAt: true,
                    },
                }),
            ]);

        // Сумма критических ошибок
        const errorSum = await prisma.verificationCheck.aggregate({
            where: { fileName: { not: { startsWith: 'Registry upload:' } } },
            _sum: { criticalErrors: true },
        });

        // ИСПРАВЛЕНО: Безопасное преобразование даты
        let lastCheckDate = null;
        if (recentChecks[0]?.createdAt) {
            try {
                const date = new Date(recentChecks[0].createdAt);
                if (!isNaN(date.getTime())) {
                    lastCheckDate = date.toISOString();
                }
            } catch (e) {
                console.warn('Date parsing error:', e);
            }
        }

        return NextResponse.json({
            totalEntries,
            totalChecks,
            checksToday,
            checksThisMonth,
            criticalErrorsTotal: errorSum._sum.criticalErrors || 0,
            lastCheckDate,
            recentChecks: recentChecks.map(check => ({
                ...check,
                createdAt: typeof check.createdAt === 'string' ? check.createdAt : new Date(check.createdAt).toISOString()
            })),
        });
    } catch (error) {
        console.error('Stats error:', error);
        return NextResponse.json(
            {
                totalEntries: 0,
                totalChecks: 0,
                checksToday: 0,
                checksThisMonth: 0,
                criticalErrorsTotal: 0,
                lastCheckDate: null,
                recentChecks: [],
            },
            { status: 200 }
        );
    }
}