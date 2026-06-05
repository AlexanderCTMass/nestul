// lib/db.ts
import { reestrStorage, checksStorage } from './storage';

// Экспортируем единый объект для совместимости с существующим кодом
export const prisma = {
    reestrEntry: reestrStorage,
    verificationCheck: checksStorage,
};

// Для совместимости с кодом, который ожидает PrismaClient
export { reestrStorage, checksStorage };