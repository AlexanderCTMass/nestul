'use client';

import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {CloudArrowUp} from '@phosphor-icons/react/dist/ssr/CloudArrowUp';
import {FileXls} from '@phosphor-icons/react/dist/ssr/FileXls';
import {CheckCircle} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {X} from '@phosphor-icons/react/dist/ssr/X';

interface ReestrUploadProps {
    onUploadComplete: () => void;
}

interface UploadState {
    status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
    progress: number;
    message: string;
    stats?: {
        totalRows: number;
        inserted: number;
        updated: number;
        errors: number;
        duration: number;
    };
}

export function ReestrUpload({onUploadComplete}: ReestrUploadProps) {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = React.useState(false);
    const [uploadState, setUploadState] = React.useState<UploadState>({
        status: 'idle',
        progress: 0,
        message: '',
    });

    const handleFileUpload = async (file: File) => {
        // Валидация
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
            setUploadState({
                status: 'error',
                progress: 0,
                message: 'Invalid format. Only .xlsx and .xls files are supported.',
            });
            return;
        }

        const maxSize = 200 * 1024 * 1024; // 200 MB
        if (file.size > maxSize) {
            setUploadState({
                status: 'error',
                progress: 0,
                message: 'File too large. Maximum size: 200 MB.',
            });
            return;
        }

        // Загрузка
        setUploadState({
            status: 'uploading',
            progress: 10,
            message: 'Uploading file to server...',
        });

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Симулируем прогресс загрузки
            const progressInterval = setInterval(() => {
                setUploadState((prev) => ({
                    ...prev,
                    progress: Math.min(prev.progress + 5, 30),
                }));
            }, 200);

            const response = await fetch('/api/admin/reestr/upload', {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Upload failed');
            }

            // Обработка на сервере
            setUploadState({
                status: 'processing',
                progress: 40,
                message: 'Parsing Excel file...',
            });

            // Опрашиваем статус обработки
            const result = await response.json();

            // Симулируем прогресс обработки
            for (let i = 50; i <= 100; i += 10) {
                await new Promise((resolve) => setTimeout(resolve, 300));
                setUploadState((prev) => ({
                    ...prev,
                    progress: i,
                    message:
                        i < 70
                            ? 'Reading rows...'
                            : i < 90
                                ? 'Inserting into database...'
                                : 'Finalizing...',
                }));
            }

            setUploadState({
                status: 'completed',
                progress: 100,
                message: 'Registry successfully updated!',
                stats: result.stats,
            });

            onUploadComplete();
        } catch (error) {
            setUploadState({
                status: 'error',
                progress: 0,
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const handleReset = () => {
        setUploadState({status: 'idle', progress: 0, message: ''});
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <Paper elevation={2} sx={{p: 4}}>
            <Stack spacing={3}>
                <Stack direction="row" spacing={2} sx={{alignItems: 'center'}}>
                    <FileXls size={32} weight="duotone" style={{color: '#2E7D32'}}/>
                    <Box>
                        <Typography variant="h6">Upload Registry Database</Typography>
                        <Typography color="text.secondary" variant="body2">
                            Load the current Russian Industrial Product Registry from GISP portal (.xlsx)
                        </Typography>
                    </Box>
                </Stack>

                {/* Drag-and-Drop зона */}
                {uploadState.status !== 'completed' && (
                    <Box
                        onClick={() => uploadState.status === 'idle' && fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        sx={{
                            border: '2px dashed',
                            borderColor: dragOver ? 'primary.main' : 'divider',
                            borderRadius: 2,
                            p: 6,
                            textAlign: 'center',
                            backgroundColor: dragOver ? 'action.selected' : 'grey.50',
                            cursor: uploadState.status === 'idle' ? 'pointer' : 'default',
                            transition: 'all 0.3s ease',
                            opacity: uploadState.status !== 'idle' ? 0.6 : 1,
                        }}
                    >
                        {uploadState.status === 'idle' ? (
                            <>
                                <CloudArrowUp size={64} weight="duotone" style={{opacity: 0.4}}/>
                                <Typography sx={{mt: 2}} variant="h6">
                                    Drop Registry file here
                                </Typography>
                                <Typography color="text.secondary" variant="body2">
                                    or click to select .xlsx file (max 200 MB)
                                </Typography>
                                <Typography color="text.secondary" sx={{mt: 1}} variant="caption">
                                    Source: https://gisp.gov.ru/pp719v2/pub/prod/
                                </Typography>
                            </>
                        ) : (
                            <Stack spacing={2} sx={{alignItems: "center"}}>
                                <CircularProgress size={48}/>
                                <Typography variant="body1">{uploadState.message}</Typography>
                                <Box sx={{width: '60%'}}>
                                    <LinearProgress
                                        sx={{height: 8, borderRadius: 4}}
                                        value={uploadState.progress}
                                        variant="determinate"
                                    />
                                </Box>
                                <Typography color="text.secondary" variant="body2">
                                    {uploadState.progress}%
                                </Typography>
                            </Stack>
                        )}
                        <input
                            accept=".xlsx,.xls"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                            }}
                            ref={fileInputRef}
                            style={{display: 'none'}}
                            type="file"
                        />
                    </Box>
                )}

                {/* Результат загрузки */}
                {uploadState.status === 'completed' && uploadState.stats && (
                    <Alert
                        severity="success"
                        icon={<CheckCircle size={24}/>}
                        action={
                            <Button color="inherit" onClick={handleReset} size="small">
                                Upload again
                            </Button>
                        }
                    >
                        <Typography variant="subtitle1" sx={{fontWeight:"bold"}}>
                            Registry updated successfully!
                        </Typography>
                        <Typography variant="body2">
                            Total rows: {uploadState.stats.totalRows.toLocaleString()} |
                            Inserted: {uploadState.stats.inserted.toLocaleString()} |
                            Updated: {uploadState.stats.updated.toLocaleString()}
                            {uploadState.stats.errors > 0 && ` | Errors: ${uploadState.stats.errors}`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Duration: {(uploadState.stats.duration / 1000).toFixed(1)}s
                        </Typography>
                    </Alert>
                )}

                {/* Ошибка */}
                {uploadState.status === 'error' && (
                    <Alert
                        severity="error"
                        action={
                            <Button color="inherit" onClick={handleReset} size="small">
                                <X size={16}/>
                            </Button>
                        }
                    >
                        {uploadState.message}
                    </Alert>
                )}
            </Stack>
        </Paper>
    );
}