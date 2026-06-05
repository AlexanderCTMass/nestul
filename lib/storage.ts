// lib/storage.ts
import fs from 'fs/promises';
import path from 'path';

// Типы данных
export interface ReestrEntry {
    id: number;
    regNumber: string;
    name: string;
    okpd2: string | null;
    okved2: string | null;
    category: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface VerificationCheck {
    id: string;
    fileId: string;
    fileName: string | null;
    status: string;
    totalRows: number;
    criticalErrors: number;
    warnings: number;
    nlpResults: string | null;
    createdAt: string;
    updatedAt: string;
}

// Путь к файлам хранилища
const DATA_DIR = path.join(process.cwd(), 'data');
const REESTR_FILE = path.join(DATA_DIR, 'reestr.json');
const CHECKS_FILE = path.join(DATA_DIR, 'checks.json');

// Инициализация хранилища
async function initStorage() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }

    try {
        await fs.access(REESTR_FILE);
    } catch {
        await fs.writeFile(REESTR_FILE, JSON.stringify({ entries: [], nextId: 1 }, null, 2));
    }

    try {
        await fs.access(CHECKS_FILE);
    } catch {
        await fs.writeFile(CHECKS_FILE, JSON.stringify({ checks: [] }, null, 2));
    }
}

// Загрузка реестра
async function loadReestr() {
    await initStorage();
    const data = await fs.readFile(REESTR_FILE, 'utf-8');
    return JSON.parse(data);
}

// Сохранение реестра
async function saveReestr(data: any) {
    await initStorage();
    await fs.writeFile(REESTR_FILE, JSON.stringify(data, null, 2));
}

// Загрузка проверок - ИСПРАВЛЕНО
async function loadChecks() {
    await initStorage();
    const data = await fs.readFile(CHECKS_FILE, 'utf-8');
    const parsed = JSON.parse(data);

    // Нормализуем структуру
    if (parsed.checks && Array.isArray(parsed.checks)) {
        const normalizedChecks = parsed.checks.map((item: any) => {
            // Если есть поле data, извлекаем его содержимое
            if (item.data && typeof item.data === 'object') {
                return item.data;
            }
            return item;
        });
        return { checks: normalizedChecks };
    }

    return { checks: [] };
}

// Сохранение проверок - ИСПРАВЛЕНО
async function saveChecks(data: any) {
    await initStorage();
    // Сохраняем в чистом формате без вложенного data
    const toSave = {
        checks: data.checks.map((check: any) => {
            if (check.data) {
                return check.data;
            }
            return check;
        })
    };
    await fs.writeFile(CHECKS_FILE, JSON.stringify(toSave, null, 2));
}

// CRUD операции для реестра
export const reestrStorage = {
    async getAll(): Promise<ReestrEntry[]> {
        const { entries } = await loadReestr();
        return entries;
    },

    async findFirst(where: { regNumber?: string }): Promise<ReestrEntry | null> {
        const { entries } = await loadReestr();
        if (where.regNumber) {
            return entries.find((e: ReestrEntry) => e.regNumber === where.regNumber) || null;
        }
        return null;
    },

    async getById(id: number): Promise<ReestrEntry | null> {
        const { entries } = await loadReestr();
        return entries.find((e: ReestrEntry) => e.id === id) || null;
    },

    async getByRegNumber(regNumber: string): Promise<ReestrEntry | null> {
        const { entries } = await loadReestr();
        return entries.find((e: ReestrEntry) => e.regNumber === regNumber) || null;
    },

    async getManyByRegNumbers(regNumbers: string[]): Promise<ReestrEntry[]> {
        const { entries } = await loadReestr();
        return entries.filter((e: ReestrEntry) => regNumbers.includes(e.regNumber));
    },

    async create(data: Omit<ReestrEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReestrEntry> {
        const state = await loadReestr();
        const entry: ReestrEntry = {
            ...data,
            id: state.nextId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        state.entries.push(entry);
        state.nextId++;
        await saveReestr(state);
        return entry;
    },

    async upsert(data: Omit<ReestrEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReestrEntry> {
        const existing = await this.getByRegNumber(data.regNumber);
        if (existing) {
            return this.update(existing.id, data);
        }
        return this.create(data);
    },

    async update(id: number, data: Partial<Omit<ReestrEntry, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ReestrEntry> {
        const state = await loadReestr();
        const index = state.entries.findIndex((e: ReestrEntry) => e.id === id);
        if (index === -1) throw new Error('Entry not found');

        state.entries[index] = {
            ...state.entries[index],
            ...data,
            updatedAt: new Date().toISOString(),
        };
        await saveReestr(state);
        return state.entries[index];
    },

    async deleteMany(where?: { regNumber?: { in: string[] } }): Promise<{ count: number }> {
        const state = await loadReestr();
        if (where?.regNumber?.in) {
            const filtered = state.entries.filter(
                (e: ReestrEntry) => !where.regNumber!.in.includes(e.regNumber)
            );
            const count = state.entries.length - filtered.length;
            state.entries = filtered;
            await saveReestr(state);
            return { count };
        }
        const count = state.entries.length;
        state.entries = [];
        state.nextId = 1;
        await saveReestr(state);
        return { count };
    },

    async count(where?: { regNumber?: { in: string[] } }): Promise<number> {
        const { entries } = await loadReestr();
        if (where?.regNumber?.in) {
            return entries.filter((e: ReestrEntry) => where.regNumber!.in.includes(e.regNumber)).length;
        }
        return entries.length;
    },

    async findUnique(where: { id: number }): Promise<ReestrEntry | null> {
        return this.getById(where.id);
    },

    async findMany(options?: {
        where?: Record<string, any>;
        orderBy?: Record<string, 'asc' | 'desc'>;
        skip?: number;
        take?: number;
    }): Promise<ReestrEntry[]> {
        let { entries } = await loadReestr();

        if (options?.where) {
            if (options.where.regNumber?.in) {
                entries = entries.filter((e: ReestrEntry) => options.where.regNumber.in.includes(e.regNumber));
            }
            if (options.where.OR) {
                const search = options.where.OR[0]?.regNumber?.contains ||
                    options.where.OR[0]?.name?.contains ||
                    options.where.OR[0]?.okpd2?.contains;
                if (search) {
                    entries = entries.filter((e: ReestrEntry) =>
                        e.regNumber.includes(search) ||
                        e.name.toLowerCase().includes(search.toLowerCase()) ||
                        (e.okpd2 && e.okpd2.includes(search))
                    );
                }
            }
        }

        if (options?.orderBy) {
            const [field, order] = Object.entries(options.orderBy)[0];
            entries.sort((a: any, b: any) => {
                if (order === 'asc') return a[field] > b[field] ? 1 : -1;
                return a[field] < b[field] ? 1 : -1;
            });
        }

        if (options?.skip) entries = entries.slice(options.skip);
        if (options?.take) entries = entries.slice(0, options.take);

        return entries;
    },
};

// CRUD операции для проверок
export const checksStorage = {
    async getAll(): Promise<VerificationCheck[]> {
        const { checks } = await loadChecks();
        return checks;
    },

    async findFirst(where: { fileName?: { startsWith: string } }): Promise<VerificationCheck | null> {
        const { checks } = await loadChecks();
        if (where.fileName?.startsWith) {
            return checks.find((c: VerificationCheck) =>
                c.fileName?.startsWith(where.fileName!.startsWith)
            ) || null;
        }
        return null;
    },

    async getById(id: string): Promise<VerificationCheck | null> {
        const { checks } = await loadChecks();
        const found = checks.find((c: VerificationCheck) => c.id === id) || null;
        console.log(`🔍 getById(${id}): ${found ? 'found' : 'not found'}`);
        return found;
    },

    async create(data: Omit<VerificationCheck, 'updatedAt'>): Promise<VerificationCheck> {
        const state = await loadChecks();
        const check: VerificationCheck = {
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        state.checks.unshift(check);
        await saveChecks(state);
        console.log(`✅ Created check: ${check.id}, total checks now: ${state.checks.length}`);
        return check;
    },

    async count(where?: { fileName?: { startsWith?: string; not?: { startsWith?: string } }; createdAt?: { gte?: Date } }): Promise<number> {
        let { checks } = await loadChecks();
        if (where?.fileName?.startsWith) {
            checks = checks.filter((c: VerificationCheck) => c.fileName?.startsWith(where.fileName!.startsWith!));
        }
        if (where?.fileName?.not?.startsWith) {
            checks = checks.filter((c: VerificationCheck) => !c.fileName?.startsWith(where.fileName!.not!.startsWith!));
        }
        if (where?.createdAt?.gte) {
            const gte = new Date(where.createdAt.gte);
            checks = checks.filter((c: VerificationCheck) => new Date(c.createdAt) >= gte);
        }
        return checks.length;
    },

    async findMany(options?: {
        where?: Record<string, any>;
        orderBy?: Record<string, 'asc' | 'desc'>;
        skip?: number;
        take?: number;
        select?: Record<string, boolean>;
    }): Promise<VerificationCheck[]> {
        let { checks } = await loadChecks();

        if (options?.where) {
            if (options.where.fileName?.startsWith) {
                checks = checks.filter((c: VerificationCheck) => c.fileName?.startsWith(options.where.fileName.startsWith));
            }
            if (options.where.fileName?.not?.startsWith) {
                checks = checks.filter((c: VerificationCheck) => !c.fileName?.startsWith(options.where.fileName.not.startsWith));
            }
            if (options.where.fileName?.contains) {
                const search = options.where.fileName.contains;
                checks = checks.filter((c: VerificationCheck) => c.fileName?.includes(search));
            }
            if (options.where.status) {
                checks = checks.filter((c: VerificationCheck) => c.status === options.where.status);
            }
            if (options.where.createdAt?.gte) {
                const gte = new Date(options.where.createdAt.gte);
                checks = checks.filter((c: VerificationCheck) => new Date(c.createdAt) >= gte);
            }
        }

        if (options?.orderBy) {
            const [field, order] = Object.entries(options.orderBy)[0];
            checks.sort((a: any, b: any) => {
                if (order === 'asc') return a[field] > b[field] ? 1 : -1;
                return a[field] < b[field] ? 1 : -1;
            });
        }

        if (options?.skip) checks = checks.slice(options.skip);
        if (options?.take) checks = checks.slice(0, options.take);

        if (options?.select) {
            return checks.map((c: any) => {
                const result: any = {};
                if (options.select!.id) result.id = c.id;
                if (options.select!.fileName) result.fileName = c.fileName;
                if (options.select!.status) result.status = c.status;
                if (options.select!.criticalErrors) result.criticalErrors = c.criticalErrors;
                if (options.select!.createdAt) result.createdAt = c.createdAt;
                if (options.select!.nlpResults) result.nlpResults = c.nlpResults;
                return result;
            });
        }

        return checks;
    },

    async aggregate(options?: {
        where?: Record<string, any>;
        _sum?: { criticalErrors?: boolean };
    }): Promise<{ _sum: { criticalErrors: number } }> {
        let { checks } = await loadChecks();
        if (options?.where?.fileName?.not?.startsWith) {
            checks = checks.filter((c: VerificationCheck) => !c.fileName?.startsWith(options.where.fileName.not.startsWith));
        }
        const sum = checks.reduce((acc, c) => acc + (c.criticalErrors || 0), 0);
        return { _sum: { criticalErrors: sum } };
    },

    async findUnique(where: { id: string }): Promise<VerificationCheck | null> {
        console.log(`🔍 findUnique called with id: ${where.id}`);
        const result = await this.getById(where.id);
        console.log(`📊 findUnique result: ${result ? 'found' : 'not found'}`);
        return result;
    },

    async deleteMany(where?: { fileName?: { startsWith: string } }): Promise<{ count: number }> {
        const state = await loadChecks();
        if (where?.fileName?.startsWith) {
            const filtered = state.checks.filter(
                (c: VerificationCheck) => !c.fileName?.startsWith(where.fileName!.startsWith)
            );
            const count = state.checks.length - filtered.length;
            state.checks = filtered;
            await saveChecks(state);
            return { count };
        }
        const count = state.checks.length;
        state.checks = [];
        await saveChecks(state);
        return { count };
    },
};

// Единый экспорт prisma
export const prisma = {
    reestrEntry: reestrStorage,
    verificationCheck: checksStorage,
};