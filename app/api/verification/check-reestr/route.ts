import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readExcelFile } from '@/lib/excel';

export async function POST(request: NextRequest) {
    try {
        const { fileId } = await request.json();

        if (!fileId) {
            return NextResponse.json({ message: 'fileId is required' }, { status: 400 });
        }

        const { jsonData } = await readExcelFile(fileId);

        console.log('📊 Всего строк в файле заявки:', jsonData.length);

        // Получаем ВСЕ реестровые номера из заявки одним запросом
        const reestrNumbersFromApplication: string[] = [];

        for (let i = 4; i < jsonData.length; i++) {
            const row = jsonData[i] as any[] | undefined;
            if (!row || row.length === 0 || !row[4]) continue;

            const reestrNumber = row[8]?.toString().trim();
            if (reestrNumber) {
                reestrNumbersFromApplication.push(reestrNumber);
            }
        }

        // Один массовый запрос к БД вместо N отдельных
        const existingEntries = await prisma.reestrEntry.findMany({
            where: {
                regNumber: {
                    in: reestrNumbersFromApplication,
                },
            },
            select: {
                regNumber: true,
                name: true,
                okpd2: true,
                category: true,
            },
        });

        // Создаём Map для быстрого поиска
        const reestrMap = new Map(
            existingEntries.map((entry) => [entry.regNumber, entry])
        );

        console.log(`🗄️ Найдено в БД: ${existingEntries.length} из ${reestrNumbersFromApplication.length} номеров`);

        // Формируем результаты
        const results = [];

        for (let i = 4; i < jsonData.length; i++) {
            const row = jsonData[i] as any[] | undefined;
            if (!row || row.length === 0 || !row[4]) continue;

            const reestrNumber = row[8]?.toString().trim();
            const okpd2 = row[4]?.toString().trim();
            const country = row[7]?.toString().trim();
            const requirementType = row[6]?.toString().trim();
            const okved2 = row[5]?.toString().trim();

            const result = {
                row: i + 1,
                okpd2: okpd2 || 'Не указан',
                okved2: okved2 || 'Не указан',
                reestrNumber: reestrNumber || null,
                country: country || 'Не указана',
                status: 'pending',
                message: '',
                reestrName: null as string | null,
                reestrOkpd2: null as string | null,
                reestrCategory: null as Record<string, unknown> | null,
            };

            if (reestrNumber) {
                const entry = reestrMap.get(reestrNumber);

                if (entry) {
                    result.status = 'valid';
                    result.message = 'Номер найден в Реестре';

                    // Извлекаем название из Реестра
                    result.reestrName = entry.name;

                    // Извлекаем ОКПД2 из Реестра
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
                                result.message += ' | Срок действия записи истёк!';
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