// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Для Prisma 7 нужно передавать конфигурацию
export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Опционально: для serverless окружения
export async function getPrismaClient() {
    await prisma.$connect()
    return prisma
}