import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        const checks = await prisma.verificationCheck.findMany({
            where: {
                fileName: { startsWith: 'Manual check:' },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                fileName: true,
                nlpResults: true,
                createdAt: true,
            },
        });

        const parsed = checks
            .map((check) => {
                try {
                    const data = check.nlpResults ? JSON.parse(check.nlpResults) : null;
                    return data ? { ...data, id: check.id, timestamp: check.createdAt } : null;
                } catch {
                    return null;
                }
            })
            .filter(Boolean);

        return NextResponse.json({ checks: parsed });
    } catch (error) {
        console.error('History error:', error);
        return NextResponse.json({ checks: [] });
    }
}

export async function DELETE() {
    try {
        await prisma.verificationCheck.deleteMany({
            where: { fileName: { startsWith: 'Manual check:' } },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ message: 'Ошибка' }, { status: 500 });
    }
}