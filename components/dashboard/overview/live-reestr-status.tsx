'use client';

import * as React from 'react';
import useSWR from 'swr';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack'; // ← ЭТОТ ИМПОРТ НУЖНО ДОБАВИТЬ
import Typography from '@mui/material/Typography';
import { CheckCircle } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { WarningCircle } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { Database } from '@phosphor-icons/react/dist/ssr/Database';

interface DBStatus {
    totalEntries: number;
    lastUpdated: string | null;
    dbSize: string;
    status: 'healthy' | 'empty' | 'error';
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function LiveReestrStatus() {
    const { data: status, error, isLoading } = useSWR<DBStatus>(
        '/api/admin/reestr/status',
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            refreshInterval: 30000,
        }
    );

    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (error || !status) {
        return (
            <Box sx={{ textAlign: 'center', py: 2 }}>
                <WarningCircle size={32} style={{ color: '#D32F2F' }} />
                <Typography color="error.main" variant="body2" sx={{ mt: 1 }}>
                    Не удалось загрузить статус
                </Typography>
            </Box>
        );
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'Нет данных';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Нет данных';
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch {
            return 'Нет данных';
        }
    };

    const getProgressValue = () => {
        if (status.status === 'healthy') return 100;
        if (status.status === 'empty') return 0;
        return 50;
    };

    const getProgressColor = (): 'success' | 'warning' | 'error' => {
        if (status.status === 'healthy') return 'success';
        if (status.status === 'empty') return 'warning';
        return 'error';
    };

    const getStatusIcon = () => {
        if (status.status === 'healthy') {
            return <CheckCircle size={24} style={{ color: '#2E7D32' }} />;
        }
        return <WarningCircle size={24} style={{ color: '#ED6C02' }} />;
    };

    return (
        <Stack spacing={2}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusIcon()}
                <Typography variant="body2">
                    <strong>Реестр промышленной продукции</strong>
                </Typography>
            </Box>

            <Box sx={{ textAlign: 'center' }}>
                <Database size={32} weight="duotone" style={{ opacity: 0.6 }} />
                <Typography variant="h5" sx={{ mt: 1 }}>
                    {status.totalEntries.toLocaleString()}
                </Typography>
                <Typography color="text.secondary" variant="caption">
                    записей в базе
                </Typography>
            </Box>

            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Заполненность базы
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        {getProgressValue()}%
                    </Typography>
                </Box>
                <LinearProgress
                    sx={{ height: 8, borderRadius: 4 }}
                    value={getProgressValue()}
                    variant="determinate"
                    color={getProgressColor()}
                />
            </Box>

            <Box>
                <Typography variant="body2">
                    <strong>Размер БД:</strong> {status.dbSize}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                    <strong>Последнее обновление:</strong>{' '}
                    {formatDate(status.lastUpdated)}
                </Typography>
                {status.totalEntries > 0 && (
                    <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block' }}>
                        ✓ База данных готова к проверкам
                    </Typography>
                )}
                {status.totalEntries === 0 && (
                    <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                        ⚠️ База данных пуста. Загрузите Реестр через панель администратора
                    </Typography>
                )}
            </Box>
        </Stack>
    );
}