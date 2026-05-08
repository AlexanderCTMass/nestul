'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Collapse from '@mui/material/Collapse';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { DownloadSimple } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import { Info } from '@phosphor-icons/react/dist/ssr/Info';
import { CheckCircle } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { WarningCircle } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { XCircle } from '@phosphor-icons/react/dist/ssr/XCircle';
import { CaretDown } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretUp } from '@phosphor-icons/react/dist/ssr/CaretUp';
import { Clock } from '@phosphor-icons/react/dist/ssr/Clock';
import { Building } from '@phosphor-icons/react/dist/ssr/Building';
import { Tag } from '@phosphor-icons/react/dist/ssr/Tag';

interface ReestrCategory {
    company?: string;
    inn?: string;
    tnved?: string;
    basis?: string;
    dateAdded?: string;
    expiryDate?: string;
}

interface NLPResult {
    row: number;
    okpd2: string;
    okved2?: string;
    reestrName?: string | null;
    reestrOkpd2?: string | null;
    reestrCategory?: ReestrCategory | null;
    tzName?: string;
    reestrNumber?: string | null;
    country?: string;
    status: 'ok' | 'valid' | 'critical' | 'warning' | 'invalid' | 'not_required' | 'error';
    explanation?: string;
    message?: string;
    confidence?: number;
    relationshipType?: string;
}

interface CheckData {
    fileName: string | null;
    totalRows: number;
    criticalErrors: number;
    warnings: number;
    nlpResults?: string | NLPResult[];
    results?: NLPResult[];
}

export default function ResultsPage() {
    const params = useParams();
    const router = useRouter();
    const checkId = params.checkId as string;

    const [loading, setLoading] = React.useState(true);
    const [data, setData] = React.useState<CheckData | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());

    const toggleRow = (rowIndex: number) => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(rowIndex)) {
                newSet.delete(rowIndex);
            } else {
                newSet.add(rowIndex);
            }
            return newSet;
        });
    };

    React.useEffect(() => {
        const fetchResults = async () => {
            try {
                const response = await fetch(`/api/verification/results/${checkId}`);
                if (!response.ok) throw new Error('Failed to load results');

                const result = await response.json();

                if (result.nlpResults && typeof result.nlpResults === 'string') {
                    result.nlpResults = JSON.parse(result.nlpResults);
                }

                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        if (checkId) fetchResults();
    }, [checkId]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    if (!data) return null;

    const results: NLPResult[] =
        (Array.isArray(data.nlpResults) ? data.nlpResults : data.results) || [];

    const criticalCount = results.filter(
        (r) => r.status === 'critical' || r.status === 'invalid'
    ).length;
    const warningCount = results.filter((r) => r.status === 'warning').length;
    const okCount = results.filter(
        (r) => r.status === 'ok' || r.status === 'valid' || r.status === 'not_required'
    ).length;

    const getStatusLabel = (status: string): string => {
        switch (status) {
            case 'ok':
            case 'valid':
                return 'Пройдено';
            case 'critical':
                return 'Критическое расхождение';
            case 'invalid':
                return 'Номер не найден';
            case 'warning':
                return 'Предупреждение';
            case 'not_required':
                return 'Без требований';
            default:
                return status;
        }
    };

    const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'default' => {
        switch (status) {
            case 'ok':
            case 'valid':
            case 'not_required':
                return 'success';
            case 'critical':
            case 'invalid':
                return 'error';
            case 'warning':
                return 'warning';
            default:
                return 'default';
        }
    };

    const formatDate = (dateStr: string | undefined): string => {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };

    const isExpired = (expiryDate: string | undefined): boolean => {
        if (!expiryDate) return false;
        try {
            return new Date(expiryDate) < new Date();
        } catch {
            return false;
        }
    };

    return (
        <Box sx={{ p: 4 }}>
            <Stack spacing={4}>
                {/* Заголовок */}
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button startIcon={<ArrowLeft />} onClick={() => router.back()}>
                        Назад
                    </Button>
                    <Box sx={{ flex: '1 1 auto' }}>
                        <Typography variant="h4">
                            Результаты: {data.fileName || 'Заявка.xlsx'}
                        </Typography>
                    </Box>
                    <Chip
                        color={criticalCount > 0 ? 'error' : warningCount > 0 ? 'warning' : 'success'}
                        label={`Найдено: ${criticalCount} критических, ${warningCount} предупреждений`}
                    />
                    <Button startIcon={<DownloadSimple />} variant="contained">
                        Скачать отчёт
                    </Button>
                </Stack>

                {/* Предупреждение */}
                {criticalCount > 0 && (
                    <Alert severity="warning" variant="filled">
                        Обнаружены критические расхождения по {criticalCount} позициям. Данные позиции подлежат
                        отклонению в соответствии с ПП РФ 1875.
                    </Alert>
                )}

                {/* Сводка */}
                <Grid container spacing={4}>
                    <Grid size={{ md: 3, xs: 6 }}>
                        <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
                            <CheckCircle size={32} style={{ color: '#2E7D32' }} />
                            <Typography variant="h5">{okCount}</Typography>
                            <Typography variant="body2">Пройдено</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ md: 3, xs: 6 }}>
                        <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
                            <XCircle size={32} style={{ color: '#D32F2F' }} />
                            <Typography variant="h5">{criticalCount}</Typography>
                            <Typography variant="body2">Критических</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ md: 3, xs: 6 }}>
                        <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
                            <WarningCircle size={32} style={{ color: '#ED6C02' }} />
                            <Typography variant="h5">{warningCount}</Typography>
                            <Typography variant="body2">Предупреждений</Typography>
                        </Paper>
                    </Grid>
                    <Grid size={{ md: 3, xs: 6 }}>
                        <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
                            <Info size={32} style={{ color: '#1E3A5F' }} />
                            <Typography variant="h5">{data.totalRows || 0}</Typography>
                            <Typography variant="body2">Всего позиций</Typography>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Таблица результатов */}
                <Paper elevation={2} sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3 }}>
                        Детальные результаты проверки
                    </Typography>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: '40px' }}>№</TableCell>
                                <TableCell>ОКПД2 (заявка)</TableCell>
                                <TableCell sx={{ width: '100px' }}>Реестр. номер</TableCell>
                                <TableCell>Наименование в Реестре</TableCell>
                                <TableCell sx={{ width: '100px' }}>Статус</TableCell>
                                <TableCell sx={{ width: '40px' }} />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {results.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography color="text.secondary">Нет результатов для отображения</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                results.map((row, index) => {
                                    const isExpanded = expandedRows.has(index);
                                    const expired = isExpired(row.reestrCategory?.expiryDate);

                                    return (
                                        <React.Fragment key={index}>
                                            {/* Основная строка */}
                                            <TableRow
                                                hover
                                                onClick={() => toggleRow(index)}
                                                sx={{
                                                    cursor: 'pointer',
                                                    backgroundColor:
                                                        row.status === 'critical' || row.status === 'invalid'
                                                            ? 'rgba(211, 47, 47, 0.04)'
                                                            : row.status === 'warning'
                                                                ? 'rgba(237, 108, 2, 0.04)'
                                                                : 'inherit',
                                                    '&:nth-of-type(even)': {
                                                        backgroundColor:
                                                            row.status === 'critical' || row.status === 'invalid'
                                                                ? 'rgba(211, 47, 47, 0.08)'
                                                                : row.status === 'warning'
                                                                    ? 'rgba(237, 108, 2, 0.08)'
                                                                    : 'action.hover',
                                                    },
                                                }}
                                            >
                                                <TableCell>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {row.row}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">{row.okpd2 || '—'}</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    {row.reestrNumber ? (
                                                        <Chip
                                                            label={row.reestrNumber}
                                                            size="small"
                                                            color={
                                                                row.status === 'valid' || row.status === 'ok'
                                                                    ? 'primary'
                                                                    : 'error'
                                                            }
                                                            variant="outlined"
                                                        />
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">
                                                            —
                                                        </Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Stack spacing={0.5}>
                                                        <Typography variant="body2">
                                                            {row.reestrName || '—'}
                                                        </Typography>
                                                        {row.reestrOkpd2 && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                ОКПД2: {row.reestrOkpd2}
                                                            </Typography>
                                                        )}
                                                    </Stack>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        color={getStatusColor(row.status)}
                                                        label={getStatusLabel(row.status)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <IconButton size="small">
                                                        {isExpanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>

                                            {/* Расширенная информация */}
                                            <TableRow>
                                                <TableCell colSpan={6} sx={{ p: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                                                    <Collapse in={isExpanded}>
                                                        <Box sx={{ p: 3, backgroundColor: 'action.hover' }}>
                                                            <Grid container spacing={3}>
                                                                {/* Информация из заявки */}
                                                                <Grid size={{ md: 6, xs: 12 }}>
                                                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: 'grey.50' }}>
                                                                        <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                                                                            <Tag size={16} style={{ marginRight: 4 }} />
                                                                            Данные из заявки
                                                                        </Typography>
                                                                        <Stack spacing={0.5}>
                                                                            <Typography variant="body2">
                                                                                <strong>ОКПД2:</strong> {row.okpd2 || '—'}
                                                                            </Typography>
                                                                            {row.okved2 && (
                                                                                <Typography variant="body2">
                                                                                    <strong>ОКВЭД2:</strong> {row.okved2}
                                                                                </Typography>
                                                                            )}
                                                                            {row.country && (
                                                                                <Typography variant="body2">
                                                                                    <strong>Страна:</strong> {row.country}
                                                                                </Typography>
                                                                            )}
                                                                        </Stack>
                                                                    </Paper>
                                                                </Grid>

                                                                {/* Информация из Реестра */}
                                                                <Grid size={{ md: 6, xs: 12 }}>
                                                                    <Paper elevation={0} sx={{ p: 2, backgroundColor: 'grey.50' }}>
                                                                        <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
                                                                            <Building size={16} style={{ marginRight: 4 }} />
                                                                            Данные из Реестра ГИСП
                                                                        </Typography>
                                                                        <Stack spacing={0.5}>
                                                                            {row.reestrCategory?.company && (
                                                                                <Typography variant="body2">
                                                                                    <strong>Предприятие:</strong>{' '}
                                                                                    {row.reestrCategory.company}
                                                                                </Typography>
                                                                            )}
                                                                            {row.reestrCategory?.inn && (
                                                                                <Typography variant="body2">
                                                                                    <strong>ИНН:</strong> {row.reestrCategory.inn}
                                                                                </Typography>
                                                                            )}
                                                                            {row.reestrCategory?.tnved && (
                                                                                <Typography variant="body2">
                                                                                    <strong>ТН ВЭД:</strong> {row.reestrCategory.tnved}
                                                                                </Typography>
                                                                            )}
                                                                            {row.reestrCategory?.basis && (
                                                                                <Typography variant="body2">
                                                                                    <strong>Основание:</strong>{' '}
                                                                                    {row.reestrCategory.basis}
                                                                                </Typography>
                                                                            )}
                                                                            {row.reestrCategory?.dateAdded && (
                                                                                <Typography variant="body2">
                                                                                    <strong>Дата внесения:</strong>{' '}
                                                                                    {formatDate(row.reestrCategory.dateAdded)}
                                                                                </Typography>
                                                                            )}
                                                                            {row.reestrCategory?.expiryDate && (
                                                                                <Typography
                                                                                    variant="body2"
                                                                                    sx={{
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        gap: 0.5,
                                                                                        color: expired ? 'error.main' : 'inherit',
                                                                                    }}
                                                                                >
                                                                                    <Clock size={14} />
                                                                                    <strong>Срок действия:</strong>{' '}
                                                                                    {formatDate(row.reestrCategory.expiryDate)}
                                                                                    {expired && (
                                                                                        <Chip
                                                                                            label="Истёк"
                                                                                            size="small"
                                                                                            color="error"
                                                                                            sx={{ ml: 1 }}
                                                                                        />
                                                                                    )}
                                                                                </Typography>
                                                                            )}
                                                                        </Stack>
                                                                    </Paper>
                                                                </Grid>

                                                                {/* Комментарий проверки */}
                                                                {(row.message || row.explanation) && (
                                                                    <Grid size={{ md: 12, xs: 12 }}>
                                                                        <Alert
                                                                            severity={
                                                                                row.status === 'critical' || row.status === 'invalid'
                                                                                    ? 'error'
                                                                                    : row.status === 'warning'
                                                                                        ? 'warning'
                                                                                        : 'info'
                                                                            }
                                                                            variant="outlined"
                                                                        >
                                                                            <Typography variant="body2">
                                                                                {row.message || row.explanation}
                                                                            </Typography>
                                                                            {row.confidence !== undefined && (
                                                                                <Typography variant="caption" color="text.secondary">
                                                                                    Уверенность NLP-модели:{' '}
                                                                                    {(row.confidence * 100).toFixed(1)}%
                                                                                </Typography>
                                                                            )}
                                                                        </Alert>
                                                                    </Grid>
                                                                )}
                                                            </Grid>
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </Paper>
            </Stack>
        </Box>
    );
}