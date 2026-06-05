import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '25');
        const sortField = searchParams.get('sortField') || 'createdAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        // Безопасные поля для сортировки
        const allowedSortFields = ['regNumber', 'name', 'okpd2', 'createdAt'];
        const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'createdAt';
        const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';

        // Поиск по всем полям
        const where = search
            ? {
                OR: [
                    { regNumber: { contains: search } },
                    { name: { contains: search } },
                    { okpd2: { contains: search } },
                    { okved2: { contains: search } },
                    { category: { contains: search } },
                ],
            }
            : {};

        const [entries, total] = await Promise.all([
            prisma.reestrEntry.findMany({
                where,
                orderBy: { [safeSortField]: safeSortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.reestrEntry.count({ where }),
        ]);

        return NextResponse.json({
            entries,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Entries fetch error:', error);
        return NextResponse.json(
            { message: 'Error loading entries', error: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}