'use client';

import * as React from 'react';
import useSWR from 'swr';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {Database} from '@phosphor-icons/react/dist/ssr/Database';
import {Trash} from '@phosphor-icons/react/dist/ssr/Trash';
import {CheckCircle} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {WarningCircle} from '@phosphor-icons/react/dist/ssr/WarningCircle';

interface ReestrStatusProps {
    onClearComplete: () => void;
}

interface DBStatus {
    totalEntries: number;
    lastUpdated: string | null;
    dbSize: string;
    status: 'healthy' | 'empty' | 'error';
}

const fetcher = (url: string): Promise<DBStatus> =>
    fetch(url).then((res) => res.json());

export function ReestrStatus({onClearComplete}: ReestrStatusProps) {
    const {
        data: status,
        error,
        isLoading,
        mutate,
    } = useSWR<DBStatus>('/api/admin/reestr/status', fetcher);

    const [clearDialogOpen, setClearDialogOpen] = React.useState(false);
    const [clearing, setClearing] = React.useState(false);

    const handleClear = async () => {
        setClearing(true);
        try {
            const response = await fetch('/api/admin/reestr/clear', {
                method: 'DELETE',
            });

            if (response.ok) {
                await mutate();
                onClearComplete();
            }
        } catch (error) {
            console.error('Clear error:', error);
        } finally {
            setClearing(false);
            setClearDialogOpen(false);
        }
    };

    if (isLoading) {
        return (
            <Paper elevation={2} sx={{p: 3, textAlign: 'center'}}>
                <CircularProgress/>
            </Paper>
        );
    }

    if (error || !status) {
        return (
            <Paper elevation={2} sx={{p: 3}}>
                <Stack spacing={2} sx={{alignItems: 'center'}}>
                    <WarningCircle size={48} weight="duotone" style={{color: '#D32F2F'}}/>
                    <Typography color="error.main">Failed to load database status</Typography>
                    <Button variant="outlined" onClick={() => mutate()}>
                        Retry
                    </Button>
                </Stack>
            </Paper>
        );
    }

    return (
        <>
            <Paper elevation={2} sx={{p: 3}}>
                <Stack spacing={3}>
                    <Stack direction="row" spacing={2} sx={{alignItems: 'center'}}>
                        <Database size={24} weight="duotone"/>
                        <Typography variant="h6">Database Status</Typography>
                    </Stack>

                    <Stack spacing={2}>
                        <Box sx={{textAlign: 'center'}}>
                            {status.status === 'healthy' ? (
                                <CheckCircle size={48} weight="duotone" style={{color: '#2E7D32'}}/>
                            ) : status.status === 'empty' ? (
                                <WarningCircle size={48} weight="duotone" style={{color: '#ED6C02'}}/>
                            ) : (
                                <WarningCircle size={48} weight="duotone" style={{color: '#D32F2F'}}/>
                            )}
                            <Typography sx={{mt: 1}} variant="h4">
                                {status.totalEntries.toLocaleString()}
                            </Typography>
                            <Typography color="text.secondary" variant="body2">
                                Total entries
                            </Typography>
                        </Box>

                        <LinearProgress
                            sx={{height: 8, borderRadius: 4}}
                            value={status.status === 'healthy' ? 100 : status.status === 'empty' ? 0 : 50}
                            variant="determinate"
                            color={status.status === 'healthy' ? 'success' : status.status === 'empty' ? 'warning' : 'error'}
                        />

                        <Box>
                            <Typography variant="body2">
                                <strong>Size:</strong> {status.dbSize}
                            </Typography>
                            <Typography variant="body2">
                                <strong>Last updated:</strong>{' '}
                                {status.lastUpdated
                                    ? new Date(status.lastUpdated).toLocaleDateString('ru-RU', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })
                                    : 'Never'}
                            </Typography>
                        </Box>

                        <Box sx={{display: 'flex', gap: 1}}>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => mutate()}
                                sx={{flex: 1}}
                            >
                                Refresh
                            </Button>
                            <Button
                                startIcon={<Trash/>}
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => setClearDialogOpen(true)}
                                disabled={status.totalEntries === 0}
                                sx={{flex: 1}}
                            >
                                Clear
                            </Button>
                        </Box>
                    </Stack>
                </Stack>
            </Paper>

            <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
                <DialogTitle>Clear Database?</DialogTitle>
                <DialogContent>
                    <Typography>
                        This action will delete all {status.totalEntries.toLocaleString()} entries
                        from the Registry database.
                    </Typography>
                    <Typography sx={{mt: 2, fontWeight: "bold"}} color="error.main">
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setClearDialogOpen(false)} disabled={clearing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleClear}
                        color="error"
                        variant="contained"
                        disabled={clearing}
                        startIcon={clearing ? <CircularProgress size={16}/> : <Trash/>}
                    >
                        {clearing ? 'Clearing...' : 'Clear All'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}