'use client';

import * as React from 'react';
import {useRouter} from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import {CheckCircle} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {ClockCounterClockwise} from '@phosphor-icons/react/dist/ssr/ClockCounterClockwise';
import {CloudArrowUp} from '@phosphor-icons/react/dist/ssr/CloudArrowUp';
import {DownloadSimple} from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import {Gavel} from '@phosphor-icons/react/dist/ssr/Gavel';
import {WarningCircle} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {X} from '@phosphor-icons/react/dist/ssr/X';
import { MagnifyingGlass } from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import {config} from '@/config';
import {Summary} from '@/components/dashboard/overview/summary';
import {Stack, Grid} from '@mui/material';

const VERIFICATION_STEPS = [
    'Загрузить файл',
    'Проверить структуру',
    'Проверить реестр',
    'Семантический анализ',
    'Отчет готов',
];

interface RecentCheck {
    id: string;
    file: string;
    date: string;
    positions: number;
    status: 'success' | 'error' | 'warning' | 'pending';
    statusText: string;
}

export default function Page() {
    const router = useRouter();
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [dragOver, setDragOver] = React.useState(false);
    const [activeStep, setActiveStep] = React.useState(0);
    const [isProcessing, setIsProcessing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [progressPercent, setProgressPercent] = React.useState(0);
    const [progressMessage, setProgressMessage] = React.useState('');
    const [showLimitDialog, setShowLimitDialog] = React.useState(false);

    const [recentChecks, setRecentChecks] = React.useState<RecentCheck[]>([
        {
            id: 'chk_001',
            file: 'Zayavka_567.xlsx',
            date: '12 May 2026, 15:30',
            positions: 93,
            status: 'success',
            statusText: 'Passed'
        },
        {
            id: 'chk_002',
            file: 'Zayavka_342.xlsx',
            date: '10 May 2026, 11:15',
            positions: 47,
            status: 'error',
            statusText: '15 errors'
        },
        {
            id: 'chk_003',
            file: 'Zayavka_891.xlsx',
            date: '08 May 2026, 09:45',
            positions: 112,
            status: 'success',
            statusText: 'Passed'
        },
        {
            id: 'chk_004',
            file: 'Zayavka_203.xlsx',
            date: '05 May 2026, 16:00',
            positions: 68,
            status: 'warning',
            statusText: '3 warnings'
        },
    ]);

    const validateFile = (file: File) => {
        const validExtensions = ['.xlsx', '.xls'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!validExtensions.includes(fileExtension)) {
            return {valid: false, error: 'Invalid format. Use .xlsx or .xls'};
        }

        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            setShowLimitDialog(true);
            return {valid: false, error: 'File too large. Max: 100 MB'};
        }

        return {valid: true, error: null};
    };

    const handleFileUpload = async (file: File) => {
        const validation = validateFile(file);
        if (!validation.valid) {
            setError(validation.error);
            return;
        }

        setError(null);
        setIsProcessing(true);
        setActiveStep(1);

        try {
            setProgressPercent(10);
            setProgressMessage('Uploading file...');

            const formData = new FormData();
            formData.append('file', file);

            const uploadResponse = await fetch('/api/verification/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                const errData = await uploadResponse.json();
                throw new Error(errData.message || 'Upload failed');
            }

            const {fileId} = await uploadResponse.json();

            setActiveStep(2);
            setProgressPercent(25);
            setProgressMessage('Validating structure...');

            const validateResponse = await fetch('/api/verification/validate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({fileId}),
            });

            if (!validateResponse.ok) {
                const errData = await validateResponse.json();
                throw new Error(errData.message || 'Validation failed');
            }

            setActiveStep(3);
            setProgressPercent(45);
            setProgressMessage('Checking Registry...');

            const reestrResponse = await fetch('/api/verification/check-reestr', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({fileId}),
            });

            if (!reestrResponse.ok) {
                const errData = await reestrResponse.json();
                throw new Error(errData.message || 'Registry check failed');
            }

            setActiveStep(4);
            setProgressPercent(75);
            setProgressMessage('NLP analysis...');

            const nlpResponse = await fetch('/api/verification/nlp-analysis', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({fileId}),
            });

            if (!nlpResponse.ok) {
                const errData = await nlpResponse.json();
                throw new Error(errData.message || 'NLP analysis failed');
            }

            const {checkId} = await nlpResponse.json();

            setActiveStep(5);
            setProgressPercent(100);
            setProgressMessage('Report ready!');

            setRecentChecks((prev) => [
                {
                    id: checkId,
                    file: file.name,
                    date: new Date().toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                    positions: 0,
                    status: 'pending',
                    statusText: 'Processing...',
                },
                ...prev.slice(0, 3),
            ]);

            setTimeout(() => {
                setIsProcessing(false);
                router.push(`/results/${checkId}`);
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            setIsProcessing(false);
            setActiveStep(0);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
    };

    return (
        <Box sx={{p: 4}}>
            <Stack spacing={4}>
                <Stack direction={{xs: 'column', sm: 'row'}} spacing={3} sx={{alignItems: 'flex-start'}}>
                    <Box sx={{flex: '1 1 auto'}}>
                        <Typography variant="h4">Реестр-Закупка</Typography>
                        <Typography color="text.secondary" variant="body1">
                            Автоматическая проверка соответствия требованиям ТР ТС в Реестре промышленной продукции
                        </Typography>
                    </Box>
                    <Button
                        startIcon={<MagnifyingGlass />}
                        variant="outlined"
                        onClick={() => router.push('/manual-check')}
                    >
                        Ручная проверка
                    </Button>
                    <Button
                        startIcon={<ClockCounterClockwise/>}
                        variant="outlined"
                        onClick={() => router.push('/history')}
                    >
                        История
                    </Button>
                </Stack>

                <Grid container spacing={4}>
                    <Grid size={{md: 4, xs: 12}}>
                        <Summary amount={143} diff={12} icon={CheckCircle} title="Пройдено" trend="up"/>
                    </Grid>
                    <Grid size={{md: 4, xs: 12}}>
                        <Summary amount={12} diff={-5} icon={WarningCircle} title="Отклонено" trend="down"/>
                    </Grid>
                    <Grid size={{md: 4, xs: 12}}>
                        <Summary amount={85} diff={0} icon={Gavel} title="Всего" trend="neutral"/>
                    </Grid>

                    <Grid size={{md: 8, xs: 12}}>
                        <Paper elevation={2} sx={{p: 3}}>
                            <Stack spacing={3}>
                                <Typography variant="h6">Новая сверка</Typography>
                                <Typography color="text.secondary" variant="body2">
                                    Загрузите файл заявки в формате .xlsx для проверки в Реестре
                                </Typography>

                                <Box
                                    onClick={() => !isProcessing && fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    sx={{
                                        border: '2px dashed',
                                        borderColor: dragOver ? 'primary.main' : 'primary.light',
                                        borderRadius: 2,
                                        p: 6,
                                        textAlign: 'center',
                                        backgroundColor: dragOver ? 'action.selected' : 'action.hover',
                                        cursor: isProcessing ? 'wait' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        opacity: isProcessing ? 0.6 : 1,
                                        pointerEvents: isProcessing ? 'none' : 'auto',
                                    }}
                                >
                                    {isProcessing ? (
                                        <Stack spacing={2} sx={{alignItems: "center"}}>
                                            <CircularProgress size={48}/>
                                            <Typography variant="body1">{progressMessage}</Typography>
                                            <Box sx={{width: '60%'}}>
                                                <LinearProgress
                                                    sx={{height: 8, borderRadius: 4}}
                                                    value={progressPercent}
                                                    variant="determinate"
                                                />
                                            </Box>
                                            <Typography color="text.secondary" variant="body2">
                                                {progressPercent}%
                                            </Typography>
                                        </Stack>
                                    ) : (
                                        <>
                                            <CloudArrowUp size={48} weight="duotone" style={{opacity: 0.6}}/>
                                            <Typography sx={{mt: 2}} variant="body1">
                                                Сбросьте файл .xlsx сюда
                                            </Typography>
                                            <Typography color="text.secondary" variant="body2">
                                                или нажмите, чтобы выбрать
                                            </Typography>
                                        </>
                                    )}
                                    <input
                                        accept=".xlsx,.xls"
                                        disabled={isProcessing}
                                        onChange={handleFileInputChange}
                                        ref={fileInputRef}
                                        style={{display: 'none'}}
                                        type="file"
                                    />
                                </Box>

                                <Stepper activeStep={activeStep} alternativeLabel>
                                    {VERIFICATION_STEPS.map((label) => (
                                        <Step key={label}>
                                            <StepLabel>{label}</StepLabel>
                                        </Step>
                                    ))}
                                </Stepper>
                            </Stack>
                        </Paper>

                        {error && (
                            <Alert
                                action={
                                    <Button color="inherit" onClick={() => setError(null)} size="small">
                                        <X size={16}/>
                                    </Button>
                                }
                                severity="error"
                                sx={{mt: 2}}
                            >
                                {error}
                            </Alert>
                        )}
                    </Grid>

                    <Grid size={{md: 4, xs: 12}}>
                        <Stack spacing={4}>
                            <Paper elevation={2} sx={{p: 3}}>
                                <Typography variant="h6">Статистика за Апрель 2026</Typography>
                                <Stack spacing={2} sx={{mt: 2}}>
                                    <Box sx={{textAlign: 'center'}}>
                                        <CheckCircle size={48} weight="duotone" style={{color: '#2E7D32'}}/>
                                        <Typography color="success.main" variant="h4">143</Typography>
                                        <Typography color="text.secondary" variant="body2">Пройдено</Typography>
                                    </Box>
                                    <Box sx={{textAlign: 'center'}}>
                                        <WarningCircle size={48} weight="duotone" style={{color: '#D32F2F'}}/>
                                        <Typography color="error.main" variant="h4">12</Typography>
                                        <Typography color="text.secondary" variant="body2">Отклонено</Typography>
                                    </Box>
                                </Stack>
                            </Paper>

                            <Paper elevation={2} sx={{p: 3}}>
                                <Stack spacing={2}>
                                    <Typography variant="h6">ГИСП статус</Typography>
                                    <Box>
                                        <Typography color="text.secondary" variant="body2">
                                            Реестр обновлен:
                                        </Typography>
                                        <LinearProgress
                                            sx={{mt: 1, height: 8, borderRadius: 4}}
                                            value={100}
                                            variant="determinate"
                                        />
                                        <Typography sx={{mt: 1, textAlign: 'right'}} variant="body2">
                                            Актуальная версия • • 57 / 57 MB
                                        </Typography>
                                    </Box>
                                    <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                                        <CheckCircle size={16} style={{color: '#2E7D32'}}/>
                                        <Typography color="text.secondary" variant="caption">
                                            Данные обновлены 26.04.2026
                                        </Typography>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Stack>
                    </Grid>

                    <Grid size={{md: 12, xs: 12}}>
                        <Paper elevation={2} sx={{p: 3}}>
                            <Stack spacing={3}>
                                <Typography variant="h6">Последние проверки</Typography>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>File</TableCell>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Items</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell align="right">Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {recentChecks.map((row) => (
                                            <TableRow
                                                key={row.id}
                                                hover
                                                onClick={() => router.push(`/results/${row.id}`)}
                                                sx={{
                                                    cursor: 'pointer',
                                                    '&:nth-of-type(even)': {backgroundColor: 'action.hover'},
                                                }}
                                            >
                                                <TableCell>{row.file}</TableCell>
                                                <TableCell>{row.date}</TableCell>
                                                <TableCell>{row.positions}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        color={
                                                            row.status === 'success' ? 'success' :
                                                                row.status === 'error' ? 'error' :
                                                                    row.status === 'warning' ? 'warning' :
                                                                        'default'
                                                        }
                                                        label={row.statusText}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Button
                                                        startIcon={<DownloadSimple/>}
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            window.open(`/api/verification/results/${row.id}`, '_blank');
                                                        }}
                                                    >
                                                        Отчет
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>
            </Stack>

            <Dialog onClose={() => setShowLimitDialog(false)} open={showLimitDialog}>
                <DialogTitle>File too large</DialogTitle>
                <DialogContent>
                    <Typography>
                        File size exceeds 100 MB. Processing may take longer.
                    </Typography>
                    <Typography sx={{mt: 2}}>
                        Consider splitting the file into smaller parts.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowLimitDialog(false)}>OK</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}