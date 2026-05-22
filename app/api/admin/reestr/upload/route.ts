import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ message: 'File not found' }, { status: 400 });
        }

        // Генерируем ID для файла
        const fileId = crypto.randomUUID();

        // Читаем файл напрямую в память без сохранения на диск
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Парсим Excel напрямую из buffer
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        console.log('📋 Доступные листы:', workbook.SheetNames);

        // Ищем лист "Продукция" (основной лист Реестра ГИСП)
        const sheetName = workbook.SheetNames.find(
            (name) => name === 'Продукция' || name.toLowerCase().includes('продукц')
        ) || workbook.SheetNames[0];

        console.log('📄 Используем лист:', sheetName);

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        console.log('📊 Всего строк:', jsonData.length);

        // Реальная структура ГИСП:
        // Строка 0: "Время выгрузки: 30.04.2026, 01:01:05"
        // Строка 1: пустая
        // Строка 2: ЗАГОЛОВКИ (0-based)
        //   Колонка 0 (A): "Предприятие"
        //   Колонка 1 (B): "ИНН"
        //   Колонка 2 (C): "ОГРН"
        //   Колонка 6 (G): "Реестровый номер" ← ВАЖНО!
        //   Колонка 8 (I): "Дата внесения в реестр"
        //   Колонка 9 (J): "Срок действия"
        //   Колонка 11 (L): "Наименование продукции" ← ВАЖНО!
        //   Колонка 12 (M): "ОКПД2" ← ВАЖНО!
        //   Колонка 13 (N): "ТН ВЭД"
        //   Колонка 22 (W): "Основание: Наименование" (СТ-1)
        // Строка 3+: ДАННЫЕ

        const REG_NUMBER_COL = 6;   // Колонка G - Реестровый номер
        const NAME_COL = 11;         // Колонка L - Наименование продукции
        const OKPD2_COL = 12;        // Колонка M - ОКПД2
        const COMPANY_COL = 0;       // Колонка A - Предприятие
        const INN_COL = 1;           // Колонка B - ИНН
        const DATE_COL = 8;          // Колонка I - Дата внесения
        const EXPIRY_COL = 9;        // Колонка J - Срок действия
        const TNVED_COL = 13;        // Колонка N - ТН ВЭД
        const BASIS_COL = 22;        // Колонка W - Основание (СТ-1 и др.)

        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        let errors = 0;
        let totalRows = 0;

        // Начинаем со строки 3 (после заголовков)
        const DATA_START_ROW = 3;

        for (let i = DATA_START_ROW; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const regNumber = String(row[REG_NUMBER_COL] || '').trim();
            if (!regNumber) {
                skipped++;
                continue;
            }

            totalRows++;

            try {
                const name = String(row[NAME_COL] || '').trim();
                const okpd2 = String(row[OKPD2_COL] || '').trim();
                const company = String(row[COMPANY_COL] || '').trim();
                const inn = String(row[INN_COL] || '').trim();
                const tnved = String(row[TNVED_COL] || '').trim();
                const basis = String(row[BASIS_COL] || '').trim();

                // Парсим даты
                let dateAdded: Date | null = null;
                let expiryDate: Date | null = null;

                try {
                    const dateStr = String(row[DATE_COL] || '').trim();
                    if (dateStr) {
                        dateAdded = new Date(dateStr);
                        if (isNaN(dateAdded.getTime())) dateAdded = null;
                    }
                } catch {
                    // Игнорируем ошибки парсинга даты
                }

                try {
                    const expiryStr = String(row[EXPIRY_COL] || '').trim();
                    if (expiryStr) {
                        expiryDate = new Date(expiryStr);
                        if (isNaN(expiryDate.getTime())) expiryDate = null;
                    }
                } catch {
                    // Игнорируем ошибки парсинга даты
                }

                // Сохраняем в БД
                await prisma.reestrEntry.upsert({
                    where: { regNumber },
                    create: {
                        regNumber,
                        name,
                        okpd2: okpd2 || null,
                        okved2: null,
                        category: JSON.stringify({
                            company,
                            inn,
                            tnved,
                            basis,
                            dateAdded: dateAdded?.toISOString() || null,
                            expiryDate: expiryDate?.toISOString() || null,
                        }),
                    },
                    update: {
                        name,
                        okpd2: okpd2 || null,
                        category: JSON.stringify({
                            company,
                            inn,
                            tnved,
                            basis,
                            dateAdded: dateAdded?.toISOString() || null,
                            expiryDate: expiryDate?.toISOString() || null,
                        }),
                    },
                });

                inserted++;
            } catch (rowError) {
                errors++;
                console.error(`❌ Ошибка в строке ${i + 1} (реестр. № ${regNumber}):`, rowError);
            }
        }

        const duration = Date.now() - startTime;
        const updatedCount = inserted; // upsert создаёт или обновляет

        console.log('✅ Загрузка завершена:', {
            totalRows,
            inserted,
            updated: updatedCount,
            skipped,
            errors,
            duration: `${(duration / 1000).toFixed(1)}s`,
        });

        // Сохраняем информацию о загрузке в БД
        await prisma.verificationCheck.create({
            data: {
                id: crypto.randomUUID(),
                fileId,
                fileName: `Registry upload: ${file.name}`,
                status: 'completed',
                totalRows,
                criticalErrors: errors,
                warnings: skipped,
                nlpResults: JSON.stringify({
                    type: 'registry_upload',
                    fileName: file.name,
                    sheetName,
                    inserted,
                    updated: updatedCount,
                    skipped,
                    errors,
                    duration,
                    timestamp: new Date().toISOString(),
                }),
                createdAt: new Date(),
            },
        });

        return NextResponse.json({
            message: 'Registry uploaded successfully',
            stats: {
                totalRows,
                inserted,
                updated: updatedCount,
                skipped,
                errors,
                duration,
            },
        });
    } catch (error) {
        console.error('💥 Registry upload error:', error);
        return NextResponse.json(
            {
                message: 'Error uploading registry',
                error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown') : undefined,
            },
            { status: 500 }
        );
    }
}