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
        const allReestrEntries = await prisma.reestrEntry.findMany({
            select: { regNumber: true, name: true, okpd2: true }
        });
        const reestrNames = allReestrEntries.map(e => e.name);
        const reestrMap = new Map(allReestrEntries.map(e => [e.name, e]));

        for (let i = 4; i < jsonData.length; i++) {
            const row = jsonData[i] as any[] | undefined;
            if (!row || row.length === 0 || !row[4]) continue;

            const tzName = row[11]?.toString().trim();
            const reestrNumber = row[8]?.toString().trim();

            if (tzName) {
                // Если есть реестровый номер, проверяем конкретную запись
                if (reestrNumber) {
                    const reestrEntry = await prisma.reestrEntry.findFirst({
                        where: { regNumber: reestrNumber }
                    });

                    if (reestrEntry) {
                        const comparison = compareNames(reestrEntry.name, tzName);
                        nlpResults.push({
                            row: i + 1,
                            okpd2: String(row[4]),
                            reestrName: reestrEntry.name,
                            tzName: tzName,
                            relationshipType: comparison.relationship_type,
                            confidence: comparison.confidence_score,
                            explanation: comparison.semantic_explanation,
                            status: comparison.relationship_type === 'EXACT_MATCH' ? 'ok' :
                                comparison.relationship_type === 'RISK_OF_DIVERGENCE' ? 'critical' : 'warning',
                        });
                        continue;
                    }
                }

                // Если нет реестрового номера или запись не найдена — ищем по названию
                const bestMatches = findBestMatches(tzName, reestrNames, 3);

                if (bestMatches.length > 0 && bestMatches[0].score > 65) {
                    const bestMatch = bestMatches[0];
                    const reestrEntry = reestrMap.get(bestMatch.matched);

                    nlpResults.push({
                        row: i + 1,
                        okpd2: String(row[4]),
                        reestrName: bestMatch.matched,
                        tzName: tzName,
                        relationshipType: 'ACCEPTABLE_SYNONYM',
                        confidence: bestMatch.score / 100,
                        explanation: `Найдено похожее наименование в реестре с ${Math.round(bestMatch.score)}% сходством`,
                        status: 'warning',
                        suggestedRegNumber: reestrEntry?.regNumber,
                    });
                } else {
                    nlpResults.push({
                        row: i + 1,
                        okpd2: String(row[4]),
                        reestrName: null,
                        tzName: tzName,
                        relationshipType: 'UNRELATED',
                        confidence: bestMatches[0]?.score / 100 || 0,
                        explanation: 'Не найдено похожих наименований в реестре',
                        status: 'critical',
                    });
                }
            }
        }

        const criticalCount = nlpResults.filter((r) => r.status === 'critical').length;
        const warningCount = nlpResults.filter((r) => r.status === 'warning').length;

        await prisma.verificationCheck.create({
            data: {
                id: checkId,
                fileId,
                fileName: `Zayavka_${fileId.slice(0, 8)}.xlsx`,
                status: 'completed',
                totalRows: jsonData.length - 4,
                criticalErrors: criticalCount,
                warnings: warningCount,
                nlpResults: JSON.stringify(nlpResults),
                createdAt: new Date(),
            },
        });

        return NextResponse.json({
            checkId,
            totalAnalyzed: nlpResults.length,
            critical: criticalCount,
            warnings: warningCount,
            ok: nlpResults.filter((r) => r.status === 'ok').length,
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