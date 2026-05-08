import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readExcelFile } from '@/lib/excel';

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8001';

interface NLPResponse {
    relationship_type: string;
    confidence_score: number;
    semantic_explanation: string;
}

async function callNLPService(entityA: string, entityB: string): Promise<NLPResponse> {
    try {
        const response = await fetch(`${NLP_SERVICE_URL}/api/v1/compare`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entity_A: entityA, entity_B: entityB }),
        });

        if (!response.ok) throw new Error(`NLP service error: ${response.statusText}`);

        return await response.json();
    } catch (error) {
        console.warn('NLP service unavailable, using fallback:', error);
        const similarity = entityA.toLowerCase() === entityB.toLowerCase() ? 1 : 0;
        return {
            relationship_type: similarity === 1 ? 'EXACT_MATCH' : 'UNRELATED',
            confidence_score: similarity,
            semantic_explanation: 'Fallback: string comparison (NLP service unavailable)',
        };
    }
}

export async function POST(request: NextRequest) {
    try {
        const { fileId } = await request.json();

        if (!fileId) {
            return NextResponse.json({ message: 'fileId is required' }, { status: 400 });
        }

        const { jsonData } = await readExcelFile(fileId);
        const checkId = crypto.randomUUID();
        const nlpResults = [];

        for (let i = 4; i < jsonData.length; i++) {
            const row = jsonData[i] as any[] | undefined;
            if (!row || row.length === 0 || !row[4]) continue;

            const entityK = row[10]?.toString().trim();
            const entityL = row[11]?.toString().trim();

            if (entityK && entityL) {
                const nlpResult = await callNLPService(entityK, entityL);

                const status =
                    nlpResult.relationship_type === 'EXACT_MATCH' ||
                    nlpResult.relationship_type === 'ACCEPTABLE_SYNONYM'
                        ? 'ok'
                        : nlpResult.relationship_type === 'RISK_OF_DIVERGENCE'
                            ? 'critical'
                            : 'warning';

                nlpResults.push({
                    row: i + 1,
                    okpd2: String(row[4]),
                    reestrName: entityK,
                    tzName: entityL,
                    relationshipType: nlpResult.relationship_type,
                    confidence: nlpResult.confidence_score,
                    explanation: nlpResult.semantic_explanation,
                    status,
                });
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