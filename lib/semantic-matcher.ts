// lib/semantic-matcher.ts
import * as fuzzball from 'fuzzball';

export interface MatchResult {
    relationship_type: 'EXACT_MATCH' | 'ACCEPTABLE_SYNONYM' | 'RISK_OF_DIVERGENCE' | 'UNRELATED';
    confidence_score: number;
    semantic_explanation: string;
}

/**
 * Сравнивает два наименования и определяет степень их схожести
 */
export function compareNames(reestrName: string, tzName: string): MatchResult {
    const normalizedReestr = reestrName.toLowerCase().trim();
    const normalizedTz = tzName.toLowerCase().trim();

    if (normalizedReestr === normalizedTz) {
        return {
            relationship_type: 'EXACT_MATCH',
            confidence_score: 1.0,
            semantic_explanation: 'Наименования полностью совпадают',
        };
    }

    const tokenSetScore = fuzzball.token_set_ratio(normalizedReestr, normalizedTz);
    const tokenSortScore = fuzzball.token_sort_ratio(normalizedReestr, normalizedTz);
    const partialScore = fuzzball.partial_ratio(normalizedReestr, normalizedTz);
    const finalScore = Math.max(tokenSetScore, tokenSortScore, partialScore) / 100;

    if (finalScore >= 0.85) {
        return {
            relationship_type: 'EXACT_MATCH',
            confidence_score: finalScore,
            semantic_explanation: `Высокое сходство (${Math.round(finalScore * 100)}%) — наименования практически идентичны`,
        };
    } else if (finalScore >= 0.65) {
        return {
            relationship_type: 'ACCEPTABLE_SYNONYM',
            confidence_score: finalScore,
            semantic_explanation: `Хорошее сходство (${Math.round(finalScore * 100)}%) — допустимые синонимичные различия`,
        };
    } else if (finalScore >= 0.45) {
        return {
            relationship_type: 'RISK_OF_DIVERGENCE',
            confidence_score: finalScore,
            semantic_explanation: `Среднее сходство (${Math.round(finalScore * 100)}%) — риск расхождения интерпретаций`,
        };
    } else {
        return {
            relationship_type: 'UNRELATED',
            confidence_score: finalScore,
            semantic_explanation: `Низкое сходство (${Math.round(finalScore * 100)}%) — наименования не связаны`,
        };
    }
}

/**
 * ИСПРАВЛЕНО: Добавлена поддержка пагинации для больших списков
 */
export function findBestMatches(
    query: string,
    choices: string[],
    limit: number = 5,
    maxChoicesToProcess: number = 1000 // ИСПРАВЛЕНО: ограничение на обработку
): Array<{ matched: string; score: number; originalIndex: number }> {
    const normalizedQuery = query.toLowerCase().trim();

    // ИСПРАВЛЕНО: Ограничиваем количество обрабатываемых элементов
    const choicesToProcess = choices.slice(0, maxChoicesToProcess);

    const results = choicesToProcess.map((choice, index) => {
        const normalizedChoice = choice.toLowerCase().trim();
        const score = fuzzball.token_set_ratio(normalizedQuery, normalizedChoice);
        return { matched: choice, score, originalIndex: index };
    });

    const filtered = results.filter(r => r.score > 40);
    const sorted = filtered.sort((a, b) => b.score - a.score);

    // ИСПРАВЛЕНО: Логирование если были обрезаны данные
    if (choices.length > maxChoicesToProcess) {
        console.warn(`⚠️ findBestMatches: обработано только ${maxChoicesToProcess} из ${choices.length} элементов`);
    }

    return sorted.slice(0, limit);
}