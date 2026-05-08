'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import type { Icon } from '@phosphor-icons/react';

interface SummaryProps {
    amount: number;
    diff: number;
    icon: Icon;
    title: string;
    trend: 'up' | 'down' | 'neutral';
}

export function Summary({ amount, diff, icon: IconComponent, title, trend }: SummaryProps) {
    const trendColor =
        trend === 'up' ? 'success.main' :
            trend === 'down' ? 'error.main' :
                'text.secondary';

    const trendArrow =
        trend === 'up' ? '↑' :
            trend === 'down' ? '↓' :
                '→';

    return (
        <Card elevation={2}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography color="text.secondary" variant="body2">{title}</Typography>
                        <Typography variant="h4">{amount}</Typography>
                        <Typography color={trendColor} variant="body2">
                            {trendArrow} {Math.abs(diff)}%
                        </Typography>
                    </Box>
                    {IconComponent && <IconComponent size={32} weight="duotone" />}
                </Box>
            </CardContent>
        </Card>
    );
}