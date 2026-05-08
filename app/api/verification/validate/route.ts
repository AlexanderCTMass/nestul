import { NextRequest, NextResponse } from 'next/server';
import { readExcelFile } from '@/lib/excel';

export async function POST(request: NextRequest) {
    try {
        const { fileId } = await request.json();

        if (!fileId) {
            return NextResponse.json({ message: 'fileId is required' }, { status: 400 });
        }

        const { jsonData } = await readExcelFile(fileId);

        const headerRow = jsonData[3] as any[] | undefined;
        if (!headerRow || headerRow.length < 8) {
            return NextResponse.json(
                {
                    message: 'Invalid file structure. Missing column headers.',
                    details: { expectedColumns: 8, actualColumns: headerRow?.length || 0 },
                },
                { status: 422 }
            );
        }

        let dataRows = 0;
        for (let i = 4; i < jsonData.length; i++) {
            if (jsonData[i] && jsonData[i].length > 0 && jsonData[i][4]) {
                dataRows++;
            }
        }

        return NextResponse.json({
            fileId,
            isValid: true,
            sheetName: 'Лист1',
            totalRows: dataRows,
            structure: {
                hasOKPD2: !!headerRow[4],
                hasOKVED2: !!headerRow[5],
                hasRequirementType: !!headerRow[6],
                hasCountry: !!headerRow[7],
                hasReestrNumber: !!headerRow[8],
            },
        });
    } catch (error) {
        console.error('Validation error:', error);
        return NextResponse.json(
            {
                message: 'Error during structure validation',
                error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown') : undefined,
            },
            { status: 500 }
        );
    }
}