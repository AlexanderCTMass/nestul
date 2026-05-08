import {NextRequest, NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const {query, okpd2} = await request.json();

        if (!query || typeof query !== 'string' || !query.trim()) {
            return NextResponse.json({message: 'Введите запрос'}, {status: 400});
        }

        const trimmedQuery = query.trim();
        const checkId = crypto.randomUUID();

        // 1. Пробуем найти точное совпадение по реестровому номеру
        let exactMatch = await prisma.reestrEntry.findFirst({
            where: {regNumber: trimmedQuery},
        });

        // 2. Если не нашли по номеру — ищем по названию
        if (!exactMatch) {
            exactMatch = await prisma.reestrEntry.findFirst({
                where: {
                    name: {
                        contains: trimmedQuery,
                    },
                },
            });
        }

        // 3. Ищем частичные совпадения (похожие)
        const partialMatches = await prisma.reestrEntry.findMany({
            where: {
                OR: [
                    {regNumber: {contains: trimmedQuery}},
                    {name: {contains: trimmedQuery}},
                    {okpd2: {contains: trimmedQuery}},
                    {category: {contains: trimmedQuery}},
                ],
                // Исключаем точное совпадение из частичных
                ...(exactMatch ? {id: {not: exactMatch.id}} : {}),
            },
            take: 10,
            orderBy: {regNumber: 'asc'},
        });

        const totalMatches = await prisma.reestrEntry.count({
            where: {
                OR: [
                    {regNumber: {contains: trimmedQuery}},
                    {name: {contains: trimmedQuery}},
                    {okpd2: {contains: trimmedQuery}},
                    {category: {contains: trimmedQuery}},
                ],
            },
        });

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
            totalMatches: exactMatch ? totalMatches - 1 : totalMatches,
        };

        // Сохраняем в историю (асинхронно, не блокируем ответ)
        prisma.verificationCheck
            .create({
                data: {
                    id: checkId,
                    fileId: 'manual-check',
                    fileName: `Manual check: ${trimmedQuery}`,
                    status: exactMatch ? 'completed' : 'failed',
                    totalRows: 1,
                    criticalErrors: exactMatch ? 0 : 1,
                    warnings: partialMatches.length > 0 && !exactMatch ? 1 : 0,
                    nlpResults: JSON.stringify(result),
                    createdAt: new Date(),
                },
            })
            .then(() => {
                console.log(`📝 История сохранена: ${checkId}`);
            })
            .catch((err) => {
                console.error('Ошибка сохранения истории:', err);
            });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Manual check error:', error);
        return NextResponse.json(
            {message: 'Ошибка при проверке'},
            {status: 500}
        );
    }
}