import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const count = await prisma.reestrEntry.count();

        if (count > 0) {
            return NextResponse.json({
                message: `Database already contains ${count} records.`,
                count,
            });
        }

        const testData = [
            { regNumber: '10618244', name: 'Office desks wooden', okpd2: 'Office desks wooden', okved2: 'Office furniture production' },
            { regNumber: '10618255', name: 'Office cabinets wooden', okpd2: 'Office cabinets wooden', okved2: 'Office furniture production' },
            { regNumber: '10618270', name: 'Wardrobes wooden', okpd2: 'Wardrobes wooden', okved2: 'Office furniture production' },
            { regNumber: '10618259', name: 'Office furniture wooden other', okpd2: 'Office furniture wooden other', okved2: 'Office furniture production' },
            { regNumber: '10618249', name: 'Office shelving wooden', okpd2: 'Office shelving wooden', okved2: 'Office furniture production' },
            { regNumber: '10690678', name: 'Seating with metal frame', okpd2: 'Seating with metal frame', okved2: 'Office furniture production' },
            { regNumber: '10690685', name: 'Seating with wooden frame', okpd2: 'Seating with wooden frame', okved2: 'Office furniture production' },
            { regNumber: '10690681', name: 'Metal shelving', okpd2: 'Metal shelving', okved2: 'Other furniture production' },
            { regNumber: '10618291', name: 'Metal household furniture', okpd2: 'Metal household furniture', okved2: 'Other furniture production' },
            { regNumber: '10618241', name: 'Coffee tables wooden', okpd2: 'Coffee tables wooden', okved2: 'Other furniture production' },
            { regNumber: '10618317', name: 'Kitchen furniture sets', okpd2: 'Kitchen furniture sets', okved2: 'Kitchen furniture production' },
            { regNumber: '10618267', name: 'Archive cabinets metal', okpd2: 'Archive cabinets metal', okved2: 'Office furniture production' },
            { regNumber: '10618263', name: 'Wardrobes wooden', okpd2: 'Wardrobes wooden', okved2: 'Office furniture production' },
        ];

        for (const item of testData) {
            await prisma.reestrEntry.create({ data: item });
        }

        return NextResponse.json({
            message: `Created ${testData.length} test records.`,
            data: testData,
        });
    } catch (error) {
        console.error('Seed error:', error);
        return NextResponse.json(
            { message: 'Seed error', error: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}