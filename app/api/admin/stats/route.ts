import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
                        createdAt: { gte: startOfDay },
                        fileName: { not: { startsWith: 'Registry upload:' } },
                    },
                }),
                prisma.verificationCheck.count({
                    where: {
                        createdAt: { gte: startOfMonth },
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
            _sum: { criticalErrors: true },
            where: { fileName: { not: { startsWith: 'Registry upload:' } } },
        });

        return NextResponse.json({
            totalEntries,
            totalChecks,
            checksToday,
            checksThisMonth,
            criticalErrorsTotal: errorSum._sum.criticalErrors || 0,
            lastCheckDate: recentChecks[0]?.createdAt?.toISOString() || null,
            recentChecks,
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