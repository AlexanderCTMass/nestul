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
    // Нормализация: приводим к нижнему регистру, убираем лишние пробелы
    const normalizedReestr = reestrName.toLowerCase().trim();
    const normalizedTz = tzName.toLowerCase().trim();

    // Точное совпадение
    if (normalizedReestr === normalizedTz) {
        return {
            relationship_type: 'EXACT_MATCH',
            confidence_score: 1.0,
            semantic_explanation: 'Наименования полностью совпадают',
        };
    }

    // token_set_ratio - лучший выбор для названий товаров
    const tokenSetScore = fuzzball.token_set_ratio(normalizedReestr, normalizedTz);

    // token_sort_ratio - сортирует слова перед сравнением
    const tokenSortScore = fuzzball.token_sort_ratio(normalizedReestr, normalizedTz);

    // partial_ratio - проверяет вхождение одной строки в другую
    const partialScore = fuzzball.partial_ratio(normalizedReestr, normalizedTz);

    // Берём максимальный из трёх показателей
    const finalScore = Math.max(tokenSetScore, tokenSortScore, partialScore) / 100;

    // Определяем тип отношения на основе скора
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
 * Массовое сравнение — находит лучшие совпадения для запроса среди списка
 */
export function findBestMatches(
    query: string,
    choices: string[],
    limit: number = 5
): Array<{ matched: string; score: number; originalIndex: number }> {
    const normalizedQuery = query.toLowerCase().trim();

    const results = choices.map((choice, index) => {
        const normalizedChoice = choice.toLowerCase().trim();
        const score = fuzzball.token_set_ratio(normalizedQuery, normalizedChoice);
        return { matched: choice, score, originalIndex: index };
    });

    return results
        .filter(r => r.score > 40)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}