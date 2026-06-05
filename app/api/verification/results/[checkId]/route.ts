// app/api/verification/results/[checkId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ checkId: string }> | { checkId: string } }
) {
    try {
        // Универсальный способ получить params
        let checkId: string;

        if ('then' in context.params) {
            // Если params - Promise
            const resolved = await context.params;
            checkId = resolved.checkId;
        } else {
            // Если params - обычный объект
            checkId = context.params.checkId;
        }

        console.log(`🔍 Поиск результатов для ID: ${checkId}`);

        if (!checkId || checkId === 'undefined') {
            console.error('❌ Invalid checkId provided');
            return NextResponse.json({ message: 'Invalid check ID' }, { status: 400 });
        }

        const check = await prisma.verificationCheck.getById(checkId);

        if (!check) {
            console.error(`❌ Проверка с ID ${checkId} не найдена`);
            const allChecks = await prisma.verificationCheck.getAll();
            console.log(`📋 Доступные ID в базе (${allChecks.length}): ${allChecks.map(c => c.id).join(', ')}`);
            return NextResponse.json({ message: 'Check not found' }, { status: 404 });
        }

        let parsedResults = null;
        if (check.nlpResults) {
            try {
                parsedResults = JSON.parse(check.nlpResults);
            } catch (e) {
                console.error('Ошибка парсинга nlpResults:', e);
                parsedResults = [];
            }
        }

        const response = {
            id: check.id,
            fileId: check.fileId,
            fileName: check.fileName,
            status: check.status,
            totalRows: check.totalRows,
            criticalErrors: check.criticalErrors,
            warnings: check.warnings,
            createdAt: check.createdAt,
            nlpResults: parsedResults,
            results: parsedResults,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Results fetch error:', error);
        return NextResponse.json(
            { message: 'Error fetching results', error: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}