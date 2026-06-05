'use client';

import * as React from 'react';
import useSWR from 'swr';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack'; // ← Нужен этот импорт
import Typography from '@mui/material/Typography';
import { CheckCircle } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { WarningCircle } from '@phosphor-icons/react/dist/ssr/WarningCircle';

interface AdminStats {
    totalEntries: number;
    totalChecks: number;
    checksToday: number;
    checksThisMonth: number;
    criticalErrorsTotal: number;
    lastCheckDate: string | null;
    recentChecks: Array<{
        id: string;
        fileName: string | null;
        status: string;
        criticalErrors: number;
        createdAt: string;
    }>;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function LiveStats() {
    const { data: stats, error, isLoading } = useSWR<AdminStats>(
        '/api/admin/stats',
        fetcher,
        {
            refreshInterval: 30000, // Обновляем каждые 30 секунд
            revalidateOnFocus: false
        }
    );

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !stats) {
        return (
            <Box sx={{ textAlign: 'center', py: 2 }}>
                <Typography color="error.main" variant="body2">
                    Ошибка загрузки статистики
                </Typography>
            </Box>
        );
    }

    const passedCount = stats.checksThisMonth - stats.criticalErrorsTotal;
    const failedCount = stats.criticalErrorsTotal;

    return (
        <Stack spacing={2}>
            <Box sx={{ textAlign: 'center' }}>
                <CheckCircle size={48} weight="duotone" style={{ color: '#2E7D32' }} />
                <Typography color="success.main" variant="h4">
                    {passedCount}
                </Typography>
                <Typography color="text.secondary" variant="body2">Пройдено</Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
                <WarningCircle size={48} weight="duotone" style={{ color: '#D32F2F' }} />
                <Typography color="error.main" variant="h4">
                    {failedCount}
                </Typography>
                <Typography color="text.secondary" variant="body2">Отклонено</Typography>
            </Box>

            <Box sx={{ textAlign: 'center', mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                    Всего проверок: {stats.totalChecks}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    За сегодня: {stats.checksToday}
                </Typography>
                {stats.lastCheckDate && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        Последняя проверка: {new Date(stats.lastCheckDate).toLocaleDateString('ru-RU')}
                    </Typography>
                )}
            </Box>
        </Stack>
    );
}