// app/api/verification/nlp-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readExcelFile } from '@/lib/excel';
import { compareNames, findBestMatches } from '@/lib/semantic-matcher';

export async function POST(request: NextRequest) {
    try {
        const { fileId } = await request.json();

        if (!fileId) {
            return NextResponse.json({ message: 'fileId is required' }, { status: 400 });
        }

        const { jsonData } = await readExcelFile(fileId);
        const checkId = crypto.randomUUID();
        const nlpResults = [];

        // Получаем все названия из реестра для массового поиска
        const allReestrEntries = await prisma.reestrEntry.getAll();
        const reestrNames = allReestrEntries.map(e => e.name);
        const reestrMap = new Map(allReestrEntries.map(e => [e.name, e]));

        // Индексы колонок
        const OKPD2_COL = 4;
        const REESTR_NUM_COL = 8;
        const TZ_NAME_COL = 10; // Наименование в ТЗ

        for (let i = 4; i < jsonData.length; i++) {
            const row = jsonData[i] as any[] | undefined;
            if (!row || row.length === 0) continue;

            const tzName = row[TZ_NAME_COL]?.toString().trim();
            const reestrNumber = row[REESTR_NUM_COL]?.toString().trim();
            const okpd2 = row[OKPD2_COL]?.toString().trim();

            if (!tzName && !reestrNumber) continue;

            let result: any = {
                row: i + 1,
                okpd2: okpd2 || 'Не указан',
                tzName: tzName || null,
                reestrNumber: reestrNumber || null,
                status: 'ok',
                explanation: '',
                confidence: 0,
            };

            // Если есть реестровый номер, проверяем конкретную запись
            if (reestrNumber) {
                const reestrEntry = await prisma.reestrEntry.findFirst({
                    regNumber: reestrNumber
                });

                if (reestrEntry) {
                    result.reestrName = reestrEntry.name;
                    result.reestrOkpd2 = reestrEntry.okpd2;

                    if (reestrEntry.category) {
                        try {
                            result.reestrCategory = JSON.parse(reestrEntry.category);
                        } catch {
                            result.reestrCategory = null;
                        }
                    }

                    // Сравниваем названия
                    if (tzName) {
                        const comparison = compareNames(reestrEntry.name, tzName);
                        result.confidence = comparison.confidence_score;
                        result.explanation = comparison.semantic_explanation;

                        if (comparison.relationship_type === 'EXACT_MATCH') {
                            result.status = 'ok';
                        } else if (comparison.relationship_type === 'ACCEPTABLE_SYNONYM') {
                            result.status = 'warning';
                            result.explanation = `⚠️ ${comparison.semantic_explanation}`;
                        } else {
                            result.status = 'critical';
                            result.explanation = `❌ ${comparison.semantic_explanation}`;
                        }
                    } else {
                        result.status = 'ok';
                        result.explanation = 'Номер найден в Реестре';
                    }
                } else {
                    result.status = 'invalid';
                    result.explanation = `Номер "${reestrNumber}" не найден в Реестре`;
                }
            }
            // Если нет реестрового номера, ищем по названию
            else if (tzName) {
                const bestMatches = findBestMatches(tzName, reestrNames, 3);

                if (bestMatches.length > 0 && bestMatches[0].score > 65) {
                    const bestMatch = bestMatches[0];
                    const reestrEntry = reestrMap.get(bestMatch.matched);

                    result.status = 'warning';
                    result.confidence = bestMatch.score / 100;
                    result.reestrName = bestMatch.matched;
                    result.reestrOkpd2 = reestrEntry?.okpd2 || null;
                    result.suggestedRegNumber = reestrEntry?.regNumber;
                    result.explanation = `⚠️ Найдено похожее наименование (${Math.round(bestMatch.score)}% сходства). Рекомендуется использовать реестровый номер: ${reestrEntry?.regNumber}`;

                    if (reestrEntry?.category) {
                        try {
                            result.reestrCategory = JSON.parse(reestrEntry.category);
                        } catch {
                            result.reestrCategory = null;
                        }
                    }
                } else {
                    result.status = 'critical';
                    result.explanation = `❌ Не найдено похожих наименований в Реестре`;
                }
            }

            nlpResults.push(result);
        }

        const criticalCount = nlpResults.filter((r) => r.status === 'critical' || r.status === 'invalid').length;
        const warningCount = nlpResults.filter((r) => r.status === 'warning').length;
        const okCount = nlpResults.filter((r) => r.status === 'ok').length;

        console.log('📊 Результаты NLP анализа:');
        console.log(`   Всего: ${nlpResults.length}`);
        console.log(`   OK: ${okCount}`);
        console.log(`   Предупреждений: ${warningCount}`);
        console.log(`   Критических: ${criticalCount}`);
        console.log(`   Сохраняем с ID: ${checkId}`);

        // ИСПРАВЛЕНО: Сохраняем с правильным форматом даты
        await prisma.verificationCheck.create({
            data: {
                id: checkId,
                fileId: fileId,
                fileName: `Zayavka_${fileId.slice(0, 8)}.xlsx`,
                status: criticalCount > 0 ? 'failed' : 'completed',
                totalRows: jsonData.length - 4,
                criticalErrors: criticalCount,
                warnings: warningCount,
                nlpResults: JSON.stringify(nlpResults),
                createdAt: new Date().toISOString(),
            },
        });

        console.log(`✅ Результаты сохранены с ID: ${checkId}`);

        // ИСПРАВЛЕНО: Возвращаем checkId
        return NextResponse.json({
            checkId: checkId, // Важно: именно checkId
            totalAnalyzed: nlpResults.length,
            critical: criticalCount,
            warnings: warningCount,
            ok: okCount,
            results: nlpResults,
        });
    } catch (error) {
        console.error('NLP analysis error:', error);
        return NextResponse.json(
            {
                message: 'Error during NLP analysis',
                error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown') : undefined,
            },
            { status: 500 }
        );
    }
}