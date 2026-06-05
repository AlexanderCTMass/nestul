import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ message: 'File not found' }, { status: 400 });
        }

        // Используем ТОЛЬКО /tmp директорию на Vercel
        const uploadDir = '/tmp/uploads/reestr';

        // Создаем директорию, если её нет
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
            console.log('📁 Создана директория:', uploadDir);
        }

        const fileId = crypto.randomUUID();
        const filePath = path.join(uploadDir, `${fileId}.xlsx`);
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

        const REG_NUMBER_COL = 6;
        const NAME_COL = 11;
        const OKPD2_COL = 12;
        const COMPANY_COL = 0;
        const INN_COL = 1;
        const DATE_COL = 8;
        const EXPIRY_COL = 9;
        const TNVED_COL = 13;
        const BASIS_COL = 22;

        let inserted = 0;
        let skipped = 0;
        let errors = 0;
        let totalRows = 0;

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

                let dateAdded: Date | null = null;
                let expiryDate: Date | null = null;

                try {
                    const dateStr = String(row[DATE_COL] || '').trim();
                    if (dateStr) {
                        dateAdded = new Date(dateStr);
                        if (isNaN(dateAdded.getTime())) dateAdded = null;
                    }
                } catch {}

                try {
                    const expiryStr = String(row[EXPIRY_COL] || '').trim();
                    if (expiryStr) {
                        expiryDate = new Date(expiryStr);
                        if (isNaN(expiryDate.getTime())) expiryDate = null;
                    }
                } catch {}

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
                console.error(`❌ Ошибка в строке ${i + 1}:`, rowError);
            }
        }

        const duration = Date.now() - startTime;

        console.log('✅ Загрузка завершена:', {
            totalRows,
            inserted,
            skipped,
            errors,
            duration: `${(duration / 1000).toFixed(1)}s`,
        });

        // Сохраняем информацию о загрузке
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