'use client';

import * as React from 'react';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import { ChartBar } from '@phosphor-icons/react/dist/ssr/ChartBar';
import { Clock } from '@phosphor-icons/react/dist/ssr/Clock';
import { Files } from '@phosphor-icons/react/dist/ssr/Files';
import { Warning } from '@phosphor-icons/react/dist/ssr/Warning';

interface Stats {
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

export function AdminStats() {
    const [stats, setStats] = React.useState<Stats | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch('/api/admin/stats');
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Stats fetch error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress />
            </Paper>
        );
    }

    if (!stats) return null;

    return (
        <Paper elevation={2} sx={{ p: 3 }}>
            <Stack spacing={3}>
                <Typography variant="h6">Platform Statistics</Typography>

                <Grid container spacing={3}>
                    <Grid size={{ md: 3, xs: 6 }}>
                        <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                            <ChartBar size={24} weight="duotone" style={{ color: '#1E3A5F' }} />
                            <Typography variant="h5">{stats.totalEntries.toLocaleString()}</Typography>
                            <Typography variant="caption">Registry Entries</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ md: 3, xs: 6 }}>
                        <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                            <Files size={24} weight="duotone" style={{ color: '#2C5282' }} />
                            <Typography variant="h5">{stats.totalChecks}</Typography>
                            <Typography variant="caption">Total Checks</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ md: 3, xs: 6 }}>
                        <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                            <Clock size={24} weight="duotone" style={{ color: '#ED6C02' }} />
                            <Typography variant="h5">{stats.checksToday}</Typography>
                            <Typography variant="caption">Checks Today</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ md: 3, xs: 6 }}>
                        <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                            <Warning size={24} weight="duotone" style={{ color: '#D32F2F' }} />
                            <Typography variant="h5">{stats.criticalErrorsTotal}</Typography>
                            <Typography variant="caption">Total Errors Found</Typography>
                        </Paper>
                    </Grid>
                </Grid>

                <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Recent Checks
                </Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>File</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Errors</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {stats.recentChecks.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} sx={{ textAlign: 'center' }}>
                                    <Typography color="text.secondary" variant="body2">
                                        No checks yet
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            stats.recentChecks.map((check) => (
                                <TableRow key={check.id}>
                                    <TableCell>{check.fileName || 'Unknown'}</TableCell>
                                    <TableCell>
                                        {new Date(check.createdAt).toLocaleDateString('ru-RU')}
                                    </TableCell>
                                    <TableCell>{check.status}</TableCell>
                                    <TableCell>{check.criticalErrors}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Stack>
        </Paper>
    );
}