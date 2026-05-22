'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { Database } from '@phosphor-icons/react/dist/ssr/Database';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import { Funnel } from '@phosphor-icons/react/dist/ssr/Funnel';
import { X } from '@phosphor-icons/react/dist/ssr/X';

interface ReestrEntry {
    id: number;
    regNumber: string;
    name: string;
    okpd2: string | null;
    okved2: string | null;
    category: string | null;
    createdAt: string;
}

interface SearchResponse {
    entries: ReestrEntry[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

type SortField = 'regNumber' | 'name' | 'okpd2' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function ReestrViewPage() {
    const router = useRouter();

    const [entries, setEntries] = React.useState<ReestrEntry[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');
    const [debouncedSearch, setDebouncedSearch] = React.useState('');
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(25);
    const [total, setTotal] = React.useState(0);
    const [sortField, setSortField] = React.useState<SortField>('createdAt');
    const [sortOrder, setSortOrder] = React.useState<SortOrder>('desc');
    const [expandedRow, setExpandedRow] = React.useState<number | null>(null);

    // Debounce поиска
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(0);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Загрузка данных
    React.useEffect(() => {
        const fetchEntries = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    page: String(page + 1),
                    limit: String(rowsPerPage),
                    search: debouncedSearch,
                    sortField,
                    sortOrder,
                });

                const response = await fetch(`/api/admin/reestr/entries?${params}`);
                if (!response.ok) throw new Error('Failed to load entries');

                const data: SearchResponse = await response.json();
                setEntries(data.entries);
                setTotal(data.total);
            } catch (error) {
                console.error('Fetch error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEntries();
    }, [page, rowsPerPage, debouncedSearch, sortField, sortOrder]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
        setPage(0);
    };

    const handleChangePage = (_: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const parseCategory = (category: string | null): Record<string, unknown> => {
        if (!category) return {};
        try {
            return JSON.parse(category);
        } catch {
            return {};
        }
    };

    const columns: { field: SortField; label: string; width?: string }[] = [
        { field: 'regNumber', label: 'Реестр. номер', width: '120px' },
        { field: 'name', label: 'Наименование продукции' },
        { field: 'okpd2', label: 'ОКПД2', width: '140px' },
        { field: 'createdAt', label: 'Добавлен', width: '140px' },
    ];

    return (
        <Box sx={{ p: 4 }}>
            <Stack spacing={4}>
                {/* Заголовок */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                        <Button startIcon={<ArrowLeft />} onClick={() => router.push('/admin')}>
                            Назад
                        </Button>
                        <Box>
                            <Typography variant="h4">Реестр промышленной продукции</Typography>
                            <Typography color="text.secondary" variant="body1">
                                Актуальная база данных ГИСП
                            </Typography>
                        </Box>
                    </Stack>
                    <Chip
                        icon={<Database />}
                        label={`${total.toLocaleString()} записей`}
                        color="primary"
                        variant="outlined"
                    />
                </Stack>

                {/* Поиск и фильтры */}
                <Paper elevation={2} sx={{ p: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
                        <TextField
                            placeholder="Поиск по всем полям..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            size="small"
                            fullWidth
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <MagnifyingGlass size={20} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: search ? (
                                        <InputAdornment position="end">
                                            <Button
                                                size="small"
                                                onClick={() => setSearch('')}
                                                sx={{ minWidth: 'auto', p: 0.5 }}
                                            >
                                                <X size={16} />
                                            </Button>
                                        </InputAdornment>
                                    ) : undefined,
                                },
                            }}
                        />
                        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                            <Chip
                                icon={<Funnel />}
                                label={sortOrder === 'asc' ? '↑ Возр.' : '↓ Убыв.'}
                                size="small"
                                variant="outlined"
                                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                            />
                            <Chip
                                label={`По: ${sortField === 'regNumber' ? 'Номеру' : sortField === 'name' ? 'Названию' : sortField === 'okpd2' ? 'ОКПД2' : 'Дате'}`}
                                size="small"
                                variant="outlined"
                                onDelete={() => {
                                    setSortField('createdAt');
                                    setSortOrder('desc');
                                }}
                            />
                        </Stack>
                    </Stack>
                </Paper>

                {/* Таблица */}
                <Paper elevation={2}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                            <CircularProgress />
                        </Box>
                    ) : entries.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 8 }}>
                            <Database size={64} weight="duotone" style={{ opacity: 0.3 }} />
                            <Typography color="text.secondary" sx={{ mt: 2 }} variant="h6">
                                {debouncedSearch ? 'Ничего не найдено' : 'База данных пуста'}
                            </Typography>
                            <Typography color="text.secondary" variant="body2">
                                {debouncedSearch
                                    ? 'Попробуйте изменить поисковый запрос'
                                    : 'Загрузите Реестр через панель администратора'}
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: '40px' }}>№</TableCell>
                                        {columns.map((col) => (
                                            <TableCell key={col.field} sx={{ width: col.width }}>
                                                <TableSortLabel
                                                    active={sortField === col.field}
                                                    direction={sortField === col.field ? sortOrder : 'asc'}
                                                    onClick={() => handleSort(col.field)}
                                                >
                                                    <Typography variant="body2" sx={{fontWeight:"bold"}}>
                                                        {col.label}
                                                    </Typography>
                                                </TableSortLabel>
                                            </TableCell>
                                        ))}
                                        <TableCell sx={{ width: '80px' }} align="center">
                                            <Typography variant="body2" sx={{fontWeight:"bold"}}>
                                                Детали
                                            </Typography>
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {entries.map((entry, index) => {
                                        const cat = parseCategory(entry.category);
                                        const isExpanded = expandedRow === entry.id;

                                        return (
                                            <React.Fragment key={entry.id}>
                                                <TableRow
                                                    hover
                                                    sx={{
                                                        cursor: 'pointer',
                                                        '&:nth-of-type(even)': { backgroundColor: 'action.hover' },
                                                        backgroundColor: isExpanded ? 'action.selected' : 'inherit',
                                                    }}
                                                    onClick={() => setExpandedRow(isExpanded ? null : entry.id)}
                                                >
                                                    <TableCell>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {page * rowsPerPage + index + 1}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip label={entry.regNumber} size="small" color="primary" variant="outlined" />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2">{entry.name}</Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {entry.okpd2 || '—'}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(entry.createdAt).toLocaleDateString('ru-RU')}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Button
                                                            size="small"
                                                            variant="text"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedRow(isExpanded ? null : entry.id);
                                                            }}
                                                        >
                                                            {isExpanded ? '▲' : '▼'}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>

                                                {/* Расширенная информация */}
                                                {isExpanded && (
                                                    <TableRow>
                                                        <TableCell colSpan={6} sx={{ backgroundColor: 'action.hover', p: 3 }}>
                                                            <Stack spacing={1}>
                                                                <Typography variant="subtitle2" color="primary">
                                                                    Дополнительная информация
                                                                </Typography>
                                                                {Object.keys(cat).length > 0 ? (
                                                                    <Stack spacing={0.5}>
                                                                        {cat.company && (
                                                                            <Typography variant="body2">
                                                                                <strong>Предприятие:</strong> {String(cat.company)}
                                                                            </Typography>
                                                                        )}
                                                                        {cat.inn && (
                                                                            <Typography variant="body2">
                                                                                <strong>ИНН:</strong> {String(cat.inn)}
                                                                            </Typography>
                                                                        )}
                                                                        {cat.tnved && (
                                                                            <Typography variant="body2">
                                                                                <strong>ТН ВЭД:</strong> {String(cat.tnved)}
                                                                            </Typography>
                                                                        )}
                                                                        {cat.basis && (
                                                                            <Typography variant="body2">
                                                                                <strong>Основание:</strong> {String(cat.basis)}
                                                                            </Typography>
                                                                        )}
                                                                        {cat.dateAdded && (
                                                                            <Typography variant="body2">
                                                                                <strong>Дата внесения:</strong>{' '}
                                                                                {new Date(String(cat.dateAdded)).toLocaleDateString('ru-RU')}
                                                                            </Typography>
                                                                        )}
                                                                        {cat.expiryDate && (
                                                                            <Typography variant="body2">
                                                                                <strong>Срок действия:</strong>{' '}
                                                                                {new Date(String(cat.expiryDate)).toLocaleDateString('ru-RU')}
                                                                            </Typography>
                                                                        )}
                                                                    </Stack>
                                                                ) : (
                                                                    <Typography variant="body2" color="text.secondary">
                                                                        Нет дополнительных данных
                                                                    </Typography>
                                                                )}
                                                                <Typography variant="caption" color="text.secondary">
                                                                    ID: {entry.id}
                                                                </Typography>
                                                            </Stack>
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            <TablePagination
                                component="div"
                                count={total}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                                page={page}
                                rowsPerPage={rowsPerPage}
                                rowsPerPageOptions={[10, 25, 50, 100]}
                                labelRowsPerPage="Строк на странице:"
                                labelDisplayedRows={({ from, to, count }) =>
                                    `${from}–${to} из ${count !== -1 ? count.toLocaleString() : `более ${to}`}`
                                }
                            />
                        </>
                    )}
                </Paper>
            </Stack>
        </Box>
    );
}