// app/api/verification/check-reestr/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { readExcelFile } from '@/lib/excel';

export async function POST(request: NextRequest) {
    try {
        const { fileId } = await request.json();

        if (!fileId) {
            return NextResponse.json({ message: 'fileId is required' }, { status: 400 });
        }

        const { jsonData } = await readExcelFile(fileId);

        console.log('📊 Всего строк в файле заявки:', jsonData.length);

        // ИСПРАВЛЕНО: Правильные индексы колонок согласно тестовому файлу
        const OKPD2_COL = 4;      // Колонка E (индекс 4)
        const OKVED2_COL = 5;     // Колонка F (индекс 5)
        const REQUIREMENT_COL = 6; // Колонка G (индекс 6)
        const COUNTRY_COL = 7;     // Колонка H (индекс 7)
        const REESTR_NUM_COL = 8;  // Колонка I (индекс 8)
        const REESTR_NAME_COL = 9; // Колонка J (индекс 9)
        const TZ_NAME_COL = 10;    // Колонка K (индекс 10)

        // Получаем ВСЕ реестровые номера из заявки одним запросом
        const reestrNumbersFromApplication: string[] = [];

        const DATA_START_ROW = 4; // Данные начинаются с 5 строки (индекс 4)

        for (let i = DATA_START_ROW; i < jsonData.length; i++) {
            const row = jsonData[i] as any[] | undefined;
            if (!row || row.length === 0) continue;

            const reestrNumber = row[REESTR_NUM_COL]?.toString().trim();
            if (reestrNumber && reestrNumber !== '') {
                reestrNumbersFromApplication.push(reestrNumber);
            }
        }

        // Удаляем дубликаты для оптимизации
        const uniqueReestrNumbers = [...new Set(reestrNumbersFromApplication)];

        // Один массовый запрос к БД вместо N отдельных
        const existingEntries = await prisma.reestrEntry.getManyByRegNumbers(uniqueReestrNumbers);

        // Создаём Map для быстрого поиска
        const reestrMap = new Map(
            existingEntries.map((entry) => [entry.regNumber, entry])
        );

        console.log(`🗄️ Найдено в БД: ${existingEntries.length} из ${uniqueReestrNumbers.length} уникальных номеров`);

        // Формируем результаты
        const results = [];

        for (let i = DATA_START_ROW; i < jsonData.length; i++) {
            const row = jsonData[i] as any[] | undefined;
            if (!row || row.length === 0) continue;

            const okpd2 = row[OKPD2_COL]?.toString().trim();
            const okved2 = row[OKVED2_COL]?.toString().trim();
            const requirementType = row[REQUIREMENT_COL]?.toString().trim();
            const country = row[COUNTRY_COL]?.toString().trim();
            const reestrNumber = row[REESTR_NUM_COL]?.toString().trim();
            const reestrNameFromFile = row[REESTR_NAME_COL]?.toString().trim();
            const tzName = row[TZ_NAME_COL]?.toString().trim();

            const result: any = {
                row: i + 1,
                okpd2: okpd2 || 'Не указан',
                okved2: okved2 || 'Не указан',
                reestrNumber: reestrNumber || null,
                country: country || 'Не указана',
                tzName: tzName || null,
                status: 'pending',
                message: '',
                reestrName: null as string | null,
                reestrOkpd2: null as string | null,
                reestrCategory: null as Record<string, unknown> | null,
            };

            if (reestrNumber && reestrNumber !== '') {
                const entry = reestrMap.get(reestrNumber);

                if (entry) {
                    result.status = 'valid';
                    result.message = 'Номер найден в Реестре';
                    result.reestrName = entry.name;
                    result.reestrOkpd2 = entry.okpd2;

                    // Парсим категорию для доп. информации
                    if (entry.category) {
                        try {
                            result.reestrCategory = JSON.parse(entry.category);
                        } catch {
                            result.reestrCategory = null;
                        }
                    }

                    // Проверяем соответствие ОКПД2 (если указан в Реестре)
                    if (entry.okpd2 && okpd2) {
                        const reestrOkpd2Prefix = entry.okpd2.substring(0, 5);
                        const appOkpd2Prefix = okpd2.substring(0, 5);

                        if (reestrOkpd2Prefix !== appOkpd2Prefix) {
                            result.status = 'warning';
                            result.message = `Номер найден, но ОКПД2 различается: в Реестре "${entry.okpd2}", в заявке "${okpd2}"`;
                        }
                    }

                    // Проверяем срок действия
                    if (result.reestrCategory) {
                        const expiryDate = result.reestrCategory.expiryDate as string | undefined;
                        if (expiryDate) {
                            const expiry = new Date(expiryDate);
                            const now = new Date();
                            if (expiry < now) {
                                result.status = 'warning';
                                result.message += result.message ? ' | Срок действия записи истёк!' : 'Срок действия записи истёк!';
                            }
                        }
                    }

                    console.log(`✅ Строка ${i + 1}: номер ${reestrNumber} найден (${entry.name})`);
                } else {
                    result.status = 'invalid';
                    result.message = `Номер "${reestrNumber}" НЕ найден в Реестре промышленной продукции`;
                    console.warn(`❌ Строка ${i + 1}: номер ${reestrNumber} НЕ найден`);
                }
            } else {
                // Реестровый номер не указан
                if (requirementType && (
                    requirementType.includes('Ограничение') ||
                    requirementType.includes('Запрет')
                )) {
                    result.status = 'warning';
                    result.message = 'Не указан реестровый номер при наличии требования ПП РФ 1875';
                } else {
                    result.status = 'not_required';
                    result.message = 'Реестровый номер не требуется (нет ограничений/запретов)';
                }
            }

            results.push(result);
        }

        const validCount = results.filter((r) => r.status === 'valid').length;
        const invalidCount = results.filter((r) => r.status === 'invalid').length;
        const warningCount = results.filter((r) => r.status === 'warning').length;
        const notRequiredCount = results.filter((r) => r.status === 'not_required').length;

        console.log('✅ Проверка завершена');
        console.log(`   Всего: ${results.length}`);
        console.log(`   Валидных: ${validCount}`);
        console.log(`   Невалидных: ${invalidCount}`);
        console.log(`   Предупреждений: ${warningCount}`);
        console.log(`   Без требований: ${notRequiredCount}`);

        return NextResponse.json({
            fileId,
            totalChecked: results.length,
            valid: validCount,
            invalid: invalidCount,
            warnings: warningCount,
            notRequired: notRequiredCount,
            results,
        });
    } catch (error) {
        console.error('💥 Reestr check error:', error);
        return NextResponse.json(
            {
                message: 'Ошибка при сверке с Реестром',
                error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown') : undefined,
            },
            { status: 500 }
        );
    }
}