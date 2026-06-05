import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        const where: Record<string, unknown> = {};

        if (search) {
            where.fileName = { contains: search };
        }

        if (status !== 'all') {
            where.status = status;
        }

        const [checks, total] = await Promise.all([
            prisma.verificationCheck.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.verificationCheck.count({ where }),
        ]);

        return NextResponse.json({ checks, total, page, limit });
    } catch (error) {
        console.error('History fetch error:', error);
        return NextResponse.json(
            { message: 'Error loading history' },
            { status: 500 }
        );
    }
}