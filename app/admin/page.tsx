'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {Grid} from '@mui/material';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { Database } from '@phosphor-icons/react/dist/ssr/Database';
import { ShieldCheck } from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import { Table } from '@phosphor-icons/react/dist/ssr/Table';
import { ReestrUpload } from '@/components/admin/reestr-upload';
import { ReestrStatus } from '@/components/admin/reestr-status';
import { AdminStats } from '@/components/admin/admin-stats';

export default function AdminPage() {
    const router = useRouter();
    const [refreshKey, setRefreshKey] = React.useState(0);

    const handleUploadComplete = () => {
        setRefreshKey((prev) => prev + 1);
    };

    const handleClearComplete = () => {
        setRefreshKey((prev) => prev + 1);
    };

    return (
        <Box sx={{ p: 4 }}>
            <Stack spacing={4}>
                {/* Заголовок */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <Button startIcon={<ArrowLeft />} onClick={() => router.push('/')}>
                            Back
                        </Button>
                        <Box sx={{ flex: '1 1 auto' }}>
                            <Typography variant="h4">Admin Panel</Typography>
                            <Typography color="text.secondary" variant="body1">
                                Registry Database Management
                            </Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <Button
                            startIcon={<Database />}
                            variant="outlined"
                            onClick={() => router.push('/api/admin/reestr/status')}
                        >
                            API Status
                        </Button>
                        <Button
                            startIcon={<ShieldCheck />}
                            variant="contained"
                            color="primary"
                        >
                            Admin Mode
                        </Button>

                        <Button
                            startIcon={<Table />}
                            variant="outlined"
                            onClick={() => router.push('/admin/reestr')}
                        >
                            View Registry
                        </Button>
                    </Stack>
                </Stack>

                {/* Основной контент */}
                <Grid container spacing={4}>
                    {/* Загрузка Реестра */}
                    <Grid size={{ md: 8, xs: 12 }}>
                        <ReestrUpload
                            key={`upload-${refreshKey}`}
                            onUploadComplete={handleUploadComplete}
                        />
                    </Grid>

                    {/* Статус базы данных */}
                    <Grid size={{ md: 4, xs: 12 }}>
                        <ReestrStatus
                            key={`status-${refreshKey}`}
                            onClearComplete={handleClearComplete}
                        />
                    </Grid>

                    {/* Статистика */}
                    <Grid size={{ md: 12, xs: 12 }}>
                        <AdminStats key={`stats-${refreshKey}`} />
                    </Grid>
                </Grid>
            </Stack>
        </Box>
    );
}