'use client';

import * as React from 'react';
import {useRouter} from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {ArrowLeft} from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import {DownloadSimple} from '@phosphor-icons/react/dist/ssr/DownloadSimple';

interface Check {
    id: string;
    fileName: string | null;
    totalRows: number;
    criticalErrors: number;
    warnings: number;
    status: string;
    createdAt: string;
}

export default function HistoryPage() {
    const router = useRouter();

    const [checks, setChecks] = React.useState<Check[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);
    const [total, setTotal] = React.useState(0);

    React.useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    search,
                    status: statusFilter,
                    page: String(page + 1),
                    limit: String(rowsPerPage),
                });

                const response = await fetch(`/api/verification/history?${params}`);
                if (!response.ok) throw new Error('Ошибка загрузки');

                const data = await response.json();
                setChecks(data.checks || []);
                setTotal(data.total || 0);
            } catch (error) {
                console.error('History fetch error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [search, statusFilter, page, rowsPerPage]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 4 }}>
            <Stack spacing={4}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Button startIcon={<ArrowLeft />} onClick={() => router.push('/')}>
                        Назад
                    </Button>
                    <Box sx={{ flex: '1 1 auto' }}>
                        <Typography variant="h4">История операций</Typography>
                    </Box>
                </Stack>

                <Paper elevation={2} sx={{ p: 3 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <TextField
                            placeholder="Искать по имени файла..."
                            size="small"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(0);
                            }}
                            sx={{ minWidth: 300 }}
                        />
                        <Stack direction="row" spacing={1}>
                            {['all', 'completed', 'failed'].map((status) => (
                                <Chip
                                    key={status}
                                    label={status === 'all' ? 'Все' : status === 'completed' ? 'Завершено' : 'Ошибки'}
                                    color={statusFilter === status ? 'primary' : 'default'}
                                    onClick={() => {
                                        setStatusFilter(status);
                                        setPage(0);
                                    }}
                                    variant={statusFilter === status ? 'filled' : 'outlined'}
                                    sx={{ cursor: 'pointer' }}
                                />
                            ))}
                        </Stack>
                    </Stack>
                </Paper>

                <Paper elevation={2} sx={{ p: 3 }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Действие</TableCell>
                                <TableCell>Дата</TableCell>
                                <TableCell>Пункты</TableCell>
                                <TableCell>Ошибки</TableCell>
                                <TableCell>Предупреждения</TableCell>
                                <TableCell>Статус</TableCell>
                                <TableCell align="right">Действия</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {checks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography color="text.secondary">Не найдено проверок</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                checks.map((check) => (
                                    <TableRow
                                        key={check.id}
                                        hover
                                        onClick={() => router.push(`/results/${check.id}`)}
                                        sx={{
                                            cursor: 'pointer',
                                            '&:nth-of-type(even)': { backgroundColor: 'action.hover' },
                                        }}
                                    >
                                        <TableCell>{check.fileName || 'Не известно'}</TableCell>
                                        <TableCell>
                                            {new Date(check.createdAt).toLocaleDateString('ru-RU', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </TableCell>
                                        <TableCell>{check.totalRows}</TableCell>
                                        <TableCell>
                                            {check.criticalErrors > 0 ? (
                                                <Typography color="error.main" sx={{fontWeight:"bold"}}>
                                                    {check.criticalErrors}
                                                </Typography>
                                            ) : (
                                                '0'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {check.warnings > 0 ? (
                                                <Typography color="warning.main" sx={{fontWeight:"bold"}}>
                                                    {check.warnings}
                                                </Typography>
                                            ) : (
                                                '0'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                color={check.status === 'completed' ? 'success' : 'error'}
                                                label={check.status === 'completed' ? 'Passed' : 'Failed'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button
                                                startIcon={<DownloadSimple />}
                                                size="small"
                                                variant="outlined"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(`/api/verification/results/${check.id}`, '_blank');
                                                }}
                                            >
                                                Отчет
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <TablePagination
                        component="div"
                        count={total}
                        onPageChange={(_, newPage) => setPage(newPage)}
                        onRowsPerPageChange={(e) => {
                            setRowsPerPage(parseInt(e.target.value, 10));
                            setPage(0);
                        }}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        labelRowsPerPage={"Строк на странице"}
                    />
                </Paper>
            </Stack>
        </Box>
    );
}