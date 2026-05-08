import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ checkId: string }> }
) {
    try {
        const { checkId } = await params;

        const check = await prisma.verificationCheck.findUnique({
            where: { id: checkId },
        });

        if (!check) {
            return NextResponse.json({ message: 'Check not found' }, { status: 404 });
        }

        return NextResponse.json(check);
    } catch (error) {
        console.error('Results fetch error:', error);
        return NextResponse.json(
            { message: 'Error fetching results' },
            { status: 500 }
        );
    }
}