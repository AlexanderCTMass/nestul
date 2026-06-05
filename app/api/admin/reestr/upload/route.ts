// app/api/admin/reestr/upload/route.ts
import { writeFile, mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';
import { UPLOAD_DIR } from '@/lib/excel'; // ИСПРАВЛЕНО: единая директория

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ message: 'File not found' }, { status: 400 });
        }

        // ИСПРАВЛЕНО: Используем единую директорию
        const reestrUploadDir = path.join(UPLOAD_DIR, 'reestr');

        // Создаем директорию, если её нет
        try {
            await access(reestrUploadDir, constants.F_OK);
        } catch {
            await mkdir(reestrUploadDir, { recursive: true });
            console.log('📁 Создана директория:', reestrUploadDir);
        }

        const fileId = crypto.randomUUID();
        const filePath = path.join(reestrUploadDir, `${fileId}.xlsx`);
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Сохраняем файл
        await writeFile(filePath, buffer);
        console.log('💾 Файл сохранен:', filePath);

        // Парсинг Excel
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        console.log('📋 Доступные листы:', workbook.SheetNames);

        // Ищем лист "Продукция"
        const sheetName = workbook.SheetNames.find(
            (name) => name === 'Продукция' || name.toLowerCase().includes('продукц')
        ) || workbook.SheetNames[0];

        console.log('📄 Используем лист:', sheetName);

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        console.log('📊 Всего строк:', jsonData.length);

        const REG_NUMBER_COL = 3; // ИСПРАВЛЕНО: Реестровый номер в колонке D (индекс 3)
        const NAME_COL = 4;        // ИСПРАВЛЕНО: Название в колонке E (индекс 4)
        const OKPD2_COL = 5;       // ИСПРАВЛЕНО: ОКПД2 в колонке F (индекс 5)
        const COMPANY_COL = 0;
        const INN_COL = 1;
        const DATE_COL = 8;
        const EXPIRY_COL = 9;
        const TNVED_COL = 7;
        const BASIS_COL = 10;

        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        let errors = 0;
        let totalRows = 0;

        const DATA_START_ROW = 1; // ИСПРАВЛЕНО: обычно данные начинаются со 2 строки

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

                let dateAdded: Date | null = null;
                let expiryDate: Date | null = null;

                // ИСПРАВЛЕНО: Улучшенная обработка дат
                try {
                    const dateStr = String(row[DATE_COL] || '').trim();
                    if (dateStr && dateStr !== '') {
                        const parsed = new Date(dateStr);
                        if (!isNaN(parsed.getTime())) dateAdded = parsed;
                    }
                } catch (e) {
                    console.warn(`⚠️ Не удалось распарсить дату в строке ${i + 1}:`, row[DATE_COL]);
                }

                try {
                    const expiryStr = String(row[EXPIRY_COL] || '').trim();
                    if (expiryStr && expiryStr !== '') {
                        const parsed = new Date(expiryStr);
                        if (!isNaN(parsed.getTime())) expiryDate = parsed;
                    }
                } catch (e) {
                    console.warn(`⚠️ Не удалось распарсить срок действия в строке ${i + 1}:`, row[EXPIRY_COL]);
                }

                // ИСПРАВЛЕНО: Используем правильный upsert
                const existing = await prisma.reestrEntry.getByRegNumber(regNumber);

                if (existing) {
                    await prisma.reestrEntry.update(existing.id, {
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
                    });
                    updated++;
                } else {
                    await prisma.reestrEntry.create({
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
                    });
                    inserted++;
                }
            } catch (rowError) {
                errors++;
                console.error(`❌ Ошибка в строке ${i + 1}:`, rowError);
            }
        }

        const duration = Date.now() - startTime;

        console.log('✅ Загрузка завершена:', {
            totalRows,
            inserted,
            updated,
            skipped,
            errors,
            duration: `${(duration / 1000).toFixed(1)}s`,
        });

        // Сохраняем информацию о загрузке
        await prisma.verificationCheck.create({
            id: crypto.randomUUID(),
            fileId: fileId,
            fileName: `Registry upload: ${file.name}`,
            status: 'completed',
            totalRows: totalRows,
            criticalErrors: errors,
            warnings: skipped,
            nlpResults: JSON.stringify({
                type: 'registry_upload',
                fileName: file.name,
                sheetName,
                inserted,
                updated,
                skipped,
                errors,
                duration,
                timestamp: new Date().toISOString(),
            }),
            createdAt: new Date().toISOString(),
        });

        return NextResponse.json({
            message: 'Registry uploaded successfully',
            stats: {
                totalRows,
                inserted,
                updated,
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