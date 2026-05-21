'use client';

import * as React from 'react';
import {useRouter} from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import {ArrowLeft} from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import {MagnifyingGlass} from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import {CheckCircle} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {WarningCircle} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {XCircle} from '@phosphor-icons/react/dist/ssr/XCircle';
import {Clock} from '@phosphor-icons/react/dist/ssr/Clock';
import {Building} from '@phosphor-icons/react/dist/ssr/Building';
import {Tag} from '@phosphor-icons/react/dist/ssr/Tag';
import {Trash} from '@phosphor-icons/react/dist/ssr/Trash';
import {ClockCounterClockwise} from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import {Lightning} from '@phosphor-icons/react/dist/ssr/Lightning';

interface ReestrMatch {
    regNumber: string;
    name: string;
    okpd2: string | null;
    category: string | null;
    parsedCategory?: {
        company?: string;
        inn?: string;
        tnved?: string;
        basis?: string;
        dateAdded?: string;
        expiryDate?: string;
    };
}

interface CheckResult {
    id: string;
    query: string;
    queryOkpd2: string;
    timestamp: Date;
    exactMatch: ReestrMatch | null;
    partialMatches: ReestrMatch[];
    totalMatches: number;
}

export default function ManualCheckPage() {
    const router = useRouter();

    const [query, setQuery] = React.useState('');
    const [queryOkpd2, setQueryOkpd2] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [result, setResult] = React.useState<CheckResult | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [history, setHistory] = React.useState<CheckResult[]>([]);
    const [tabValue, setTabValue] = React.useState(0);
    const [historyLoading, setHistoryLoading] = React.useState(false);

    // Загрузка истории при монтировании
    React.useEffect(() => {
        const loadHistory = async () => {
            setHistoryLoading(true);
            try {
                const response = await fetch('/api/manual-check/history?limit=20');
                if (response.ok) {
                    const data = await response.json();
                    setHistory(data.checks || []);
                }
            } catch (error) {
                console.error('History load error:', error);
            } finally {
                setHistoryLoading(false);
            }
        };
        loadHistory();
    }, []);

    const handleCheck = async () => {
        if (!query.trim()) {
            setError('Введите номер или название для поиска');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch('/api/manual-check', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    query: query.trim(),
                    okpd2: queryOkpd2.trim() || undefined,
                }),
            });

            if (!response.ok) {
                throw new Error((await response.json()).message || 'Ошибка проверки');
            }

            const data: CheckResult = await response.json();
            setResult(data);

            // Добавляем в историю
            setHistory((prev) => [data, ...prev.slice(0, 19)]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !loading) {
            handleCheck();
        }
    };

    const clearHistory = async () => {
        try {
            await fetch('/api/manual-check/history', {method: 'DELETE'});
            setHistory([]);
        } catch (error) {
            console.error('Clear history error:', error);
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

    const parseCategory = (category: string | null) => {
        if (!category) return undefined;
        try {
            return JSON.parse(category);
        } catch {
            return undefined;
        }
    };

    return (
        <Box sx={{p: 4}}>
            <Stack spacing={4}>
                {/* Заголовок */}
                <Stack direction="row" spacing={2} sx={{alignItems: 'center'}}>
                    <Button startIcon={<ArrowLeft/>} onClick={() => router.push('/')}>
                        Назад
                    </Button>
                    <Box sx={{flex: '1 1 auto'}}>
                        <Typography variant="h4">Ручная проверка</Typography>
                        <Typography color="text.secondary" variant="body1">
                            Мгновенная сверка позиции с Реестром промышленной продукции
                        </Typography>
                    </Box>
                </Stack>

                {/* Форма поиска */}
                <Paper elevation={2} sx={{p: 4}}>
                    <Stack spacing={3}>
                        <Stack direction="row" spacing={2} sx={{alignItems: 'flex-start'}}>
                            <Lightning size={32} weight="duotone" style={{color: '#ED6C02'}}/>
                            <Box>
                                <Typography variant="h6">Экспресс-проверка</Typography>
                                <Typography color="text.secondary" variant="body2">
                                    Введите реестровый номер или наименование продукции для мгновенной проверки
                                </Typography>
                            </Box>
                        </Stack>

                        <Grid container spacing={2}>
                            <Grid size={{md: 8, xs: 12}}>
                                <TextField
                                    fullWidth
                                    placeholder="Введите реестровый номер (например: 10618244) или название товара..."
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading}
                                    slotProps={{
                                        input: {
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <MagnifyingGlass size={20}/>
                                                </InputAdornment>
                                            ),
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid size={{md: 4, xs: 12}}>
                                <TextField
                                    fullWidth
                                    placeholder="ОКПД2 (опционально)"
                                    value={queryOkpd2}
                                    onChange={(e) => setQueryOkpd2(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading}
                                />
                            </Grid>
                        </Grid>

                        <Stack direction="row" spacing={2}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={handleCheck}
                                disabled={loading || !query.trim()}
                                startIcon={loading ? <CircularProgress size={20}/> : <MagnifyingGlass/>}
                            >
                                {loading ? 'Проверка...' : 'Проверить'}
                            </Button>
                        </Stack>

                        {error && (
                            <Alert severity="error" onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}
                    </Stack>
                </Paper>

                {/* Результат проверки */}
                {result && (
                    <Stack spacing={4}>
                        {/* Точное совпадение */}
                        {result.exactMatch ? (
                            <Card
                                elevation={2}
                                sx={{
                                    borderLeft: 4,
                                    borderColor: 'success.main',
                                }}
                            >
                                <CardContent>
                                    <Stack spacing={3}>
                                        <Stack direction="row" spacing={2} sx={{alignItems: 'center'}}>
                                            <CheckCircle size={32} style={{color: '#2E7D32'}}/>
                                            <Box>
                                                <Typography variant="h6" color="success.main">
                                                    Найдено в Реестре
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Точное совпадение по реестровому номеру
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={result.exactMatch.regNumber}
                                                color="primary"
                                                sx={{ml: 'auto'}}
                                            />
                                        </Stack>

                                        <Divider/>

                                        <Grid container spacing={3}>
                                            <Grid size={{md: 6, xs: 12}}>
                                                <Stack spacing={1}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Наименование продукции
                                                    </Typography>
                                                    <Typography variant="body1" sx={{fontWeight: "bold"}}>
                                                        {result.exactMatch.name}
                                                    </Typography>
                                                    {result.exactMatch.okpd2 && (
                                                        <Typography variant="body2">
                                                            <Tag size={14} style={{verticalAlign: 'middle'}}/>{' '}
                                                            ОКПД2: {result.exactMatch.okpd2}
                                                        </Typography>
                                                    )}
                                                </Stack>
                                            </Grid>

                                            {(() => {
                                                const cat = parseCategory(result.exactMatch.category);
                                                if (!cat) return null;
                                                return (
                                                    <Grid size={{md: 6, xs: 12}}>
                                                        <Stack spacing={1}>
                                                            {cat.company && (
                                                                <Typography variant="body2">
                                                                    <Building size={14}
                                                                              style={{verticalAlign: 'middle'}}/>{' '}
                                                                    <strong>Предприятие:</strong> {cat.company}
                                                                </Typography>
                                                            )}
                                                            {cat.inn && (
                                                                <Typography variant="body2">
                                                                    <strong>ИНН:</strong> {cat.inn}
                                                                </Typography>
                                                            )}
                                                            {cat.tnved && (
                                                                <Typography variant="body2">
                                                                    <strong>ТН ВЭД:</strong> {cat.tnved}
                                                                </Typography>
                                                            )}
                                                            {cat.basis && (
                                                                <Typography variant="body2">
                                                                    <strong>Основание:</strong> {cat.basis}
                                                                </Typography>
                                                            )}
                                                            {cat.expiryDate && (
                                                                <Stack direction="row" spacing={1}
                                                                       sx={{alignItems: 'center'}}>
                                                                    <Clock size={14}/>
                                                                    <Typography variant="body2">
                                                                        <strong>Срок действия:</strong>{' '}
                                                                        {formatDate(cat.expiryDate)}
                                                                    </Typography>
                                                                    {isExpired(cat.expiryDate) && (
                                                                        <Chip label="Истёк" size="small" color="error"/>
                                                                    )}
                                                                </Stack>
                                                            )}
                                                        </Stack>
                                                    </Grid>
                                                );
                                            })()}
                                        </Grid>

                                        {/* Проверка ОКПД2 */}
                                        {queryOkpd2 && result.exactMatch.okpd2 && (
                                            <Alert
                                                severity={
                                                    queryOkpd2.substring(0, 5) === result.exactMatch.okpd2.substring(0, 5)
                                                        ? 'success'
                                                        : 'warning'
                                                }
                                                variant="outlined"
                                            >
                                                {queryOkpd2.substring(0, 5) === result.exactMatch.okpd2.substring(0, 5)
                                                    ? 'ОКПД2 совпадает'
                                                    : `ОКПД2 различается: в запросе "${queryOkpd2}", в Реестре "${result.exactMatch.okpd2}"`}
                                            </Alert>
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card
                                elevation={2}
                                sx={{
                                    borderLeft: 4,
                                    borderColor: result.partialMatches.length > 0 ? 'warning.main' : 'error.main',
                                }}
                            >
                                <CardContent>
                                    <Stack spacing={3}>
                                        <Stack direction="row" spacing={2} sx={{alignItems: 'center'}}>
                                            {result.partialMatches.length > 0 ? (
                                                <WarningCircle size={32} style={{color: '#ED6C02'}}/>
                                            ) : (
                                                <XCircle size={32} style={{color: '#D32F2F'}}/>
                                            )}
                                            <Box>
                                                <Typography
                                                    variant="h6"
                                                    color={
                                                        result.partialMatches.length > 0 ? 'warning.main' : 'error.main'
                                                    }
                                                >
                                                    {result.partialMatches.length > 0
                                                        ? 'Точного совпадения нет, но найдены похожие'
                                                        : 'Не найдено в Реестре'}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {result.partialMatches.length > 0
                                                        ? `Найдено ${result.totalMatches} похожих записей`
                                                        : 'Продукция с таким номером или названием отсутствует в Реестре'}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        {result.partialMatches.length > 0 && (
                                            <>
                                                <Divider/>
                                                <Typography variant="subtitle2">
                                                    Возможные совпадения ({result.partialMatches.length}):
                                                </Typography>
                                                <Stack spacing={2}>
                                                    {result.partialMatches.slice(0, 5).map((match) => {
                                                        const cat = parseCategory(match.category);
                                                        return (
                                                            <Paper key={match.regNumber} elevation={0}
                                                                   sx={{p: 2, backgroundColor: 'grey.50'}}>
                                                                <Stack spacing={1}>
                                                                    <Stack direction="row" spacing={1}
                                                                           sx={{alignItems: 'center'}}>
                                                                        <Chip label={match.regNumber} size="small"
                                                                              color="primary" variant="outlined"/>
                                                                        <Typography variant="body2"
                                                                                    sx={{fontWeight: "bold"}}>
                                                                            {match.name}
                                                                        </Typography>
                                                                    </Stack>
                                                                    {match.okpd2 && (
                                                                        <Typography variant="caption"
                                                                                    color="text.secondary">
                                                                            ОКПД2: {match.okpd2}
                                                                        </Typography>
                                                                    )}
                                                                    {cat?.company && (
                                                                        <Typography variant="caption"
                                                                                    color="text.secondary">
                                                                            {cat.company}
                                                                        </Typography>
                                                                    )}
                                                                </Stack>
                                                            </Paper>
                                                        );
                                                    })}
                                                </Stack>
                                            </>
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>
                        )}
                    </Stack>
                )}

                {/* История проверок */}
                <Paper elevation={2}>
                    <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}
                          sx={{borderBottom: 1, borderColor: 'divider', px: 2}}>
                        <Tab
                            label={`История (${history.length})`}
                            icon={<ClockCounterClockwise size={16}/>}
                            iconPosition="start"
                        />
                    </Tabs>

                    <Box sx={{p: 2}}>
                        {history.length > 0 && (
                            <Stack direction="row" spacing={2} sx={{mb: 2}}>
                                <Button
                                    size="small"
                                    color="error"
                                    startIcon={<Trash/>}
                                    onClick={clearHistory}
                                >
                                    Очистить историю
                                </Button>
                            </Stack>
                        )}

                        {historyLoading ? (
                            <Box sx={{textAlign: 'center', py: 4}}>
                                <CircularProgress/>
                            </Box>
                        ) : history.length === 0 ? (
                            <Box sx={{textAlign: 'center', py: 4}}>
                                <Typography color="text.secondary">История проверок пуста</Typography>
                            </Box>
                        ) : (
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Запрос</TableCell>
                                        <TableCell>ОКПД2</TableCell>
                                        <TableCell>Результат</TableCell>
                                        <TableCell>Время</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {history.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Typography variant="body2">{item.query}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" color="text.secondary">
                                                    {item.queryOkpd2 || '—'}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                {item.exactMatch ? (
                                                    <Chip
                                                        icon={<CheckCircle size={14}/>}
                                                        label="Найдено"
                                                        size="small"
                                                        color="success"
                                                    />
                                                ) : item.partialMatches.length > 0 ? (
                                                    <Chip
                                                        icon={<WarningCircle size={14}/>}
                                                        label={`${item.totalMatches} похожих`}
                                                        size="small"
                                                        color="warning"
                                                    />
                                                ) : (
                                                    <Chip
                                                        icon={<XCircle size={14}/>}
                                                        label="Не найдено"
                                                        size="small"
                                                        color="error"
                                                    />
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(item.timestamp).toLocaleTimeString('ru-RU')}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </Box>
                </Paper>
            </Stack>
        </Box>
    );
}