// app/api/manual-check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db'; // ИСПРАВЛЕНО: единый импорт

export async function POST(request: NextRequest) {
    try {
        const { query, okpd2 } = await request.json();

        if (!query || typeof query !== 'string' || !query.trim()) {
            return NextResponse.json({ message: 'Введите запрос' }, { status: 400 });
        }

        const trimmedQuery = query.trim();
        const checkId = crypto.randomUUID();

        // 1. Пробуем найти точное совпадение по реестровому номеру
        let exactMatch = await prisma.reestrEntry.findFirst({
            where: { regNumber: trimmedQuery }
        });

        // 2. Если не нашли по номеру — ищем по названию
        if (!exactMatch) {
            const allEntries = await prisma.reestrEntry.getAll();
            exactMatch = allEntries.find(entry =>
                entry.name.toLowerCase().includes(trimmedQuery.toLowerCase())
            ) || null;
        }

        // 3. Ищем частичные совпадения (похожие)
        const allEntries = await prisma.reestrEntry.getAll();
        let partialMatches = allEntries.filter(entry =>
            entry.regNumber.includes(trimmedQuery) ||
            entry.name.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
            (entry.okpd2 && entry.okpd2.includes(trimmedQuery)) ||
            (entry.category && entry.category.includes(trimmedQuery))
        ).slice(0, 10);

        // Исключаем точное совпадение
        if (exactMatch) {
            partialMatches = partialMatches.filter(m => m.id !== exactMatch.id);
        }

        const totalMatches = exactMatch ? partialMatches.length + 1 : partialMatches.length;

        const result = {
            id: checkId,
            query: trimmedQuery,
            queryOkpd2: okpd2 || '',
            timestamp: new Date(),
            exactMatch: exactMatch
                ? {
                    regNumber: exactMatch.regNumber,
                    name: exactMatch.name,
                    okpd2: exactMatch.okpd2,
                    category: exactMatch.category,
                }
                : null,
            partialMatches: partialMatches.map((m) => ({
                regNumber: m.regNumber,
                name: m.name,
                okpd2: m.okpd2,
                category: m.category,
            })),
            totalMatches: totalMatches - (exactMatch ? 1 : 0),
        };

        // ИСПРАВЛЕНО: Добавлен await для сохранения истории
        await prisma.verificationCheck.create({
            id: checkId,
            fileId: 'manual-check',
            fileName: `Manual check: ${trimmedQuery}`,
            status: exactMatch ? 'completed' : 'failed',
            totalRows: 1,
            criticalErrors: exactMatch ? 0 : 1,
            warnings: partialMatches.length > 0 && !exactMatch ? 1 : 0,
            nlpResults: JSON.stringify(result),
            createdAt: new Date().toISOString(),
        });

        console.log(`📝 История сохранена: ${checkId}`);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Manual check error:', error);
        return NextResponse.json(
            { message: 'Ошибка при проверке' },
            { status: 500 }
        );
    }
}