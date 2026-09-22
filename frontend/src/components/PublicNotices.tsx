import Box from '@mui/material/Box';
import { keyframes } from '@mui/material/styles';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import CampaignIcon from '@mui/icons-material/Campaign';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import BugReportIcon from '@mui/icons-material/BugReport';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ScheduleIcon from '@mui/icons-material/Schedule';
import type { ReactElement } from 'react';
import type { HealthNotice } from '../api/endpoints/public';
import { CardsGridSkeleton } from './common';

const marquee = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const PRIORITY: Record<string, { label: string; color: 'error' | 'warning' | 'info' | 'default'; tone: string }> = {
  HIGH: { label: 'عاجل', color: 'error', tone: '#d32f2f' },
  MEDIUM: { label: 'متوسط', color: 'warning', tone: '#ed6c02' },
  LOW: { label: 'منخفض', color: 'info', tone: '#1976d2' },
};

const CATEGORY_META: Record<string, { label: string; icon: ReactElement }> = {
  ENTRY_REQUIREMENTS: { label: 'متطلبات الدخول', icon: <FactCheckIcon /> },
  FLIGHT_SUSPENSION: { label: 'تعليق رحلات', icon: <FlightTakeoffIcon /> },
  EPIDEMIC_ALERT: { label: 'إنذار وبائي', icon: <BugReportIcon /> },
};

const categoryMeta = (category: string): { label: string; icon: ReactElement } =>
  CATEGORY_META[category] ?? { label: 'إشعار صحي', icon: <WarningAmberIcon /> };

const formatDate = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return '';
  }
};

interface PublicNoticesProps {
  notices: HealthNotice[];
  loading?: boolean;
}

const PublicNotices = ({ notices, loading = false }: PublicNoticesProps) => {
  const urgent = notices.filter((n) => n.priority === 'HIGH');

  if (loading) {
    return <CardsGridSkeleton count={3} />;
  }

  if (notices.length === 0) {
    return null;
  }

  return (
    <Stack spacing={4}>
      {urgent.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'stretch',
            overflow: 'hidden',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'error.light',
            background:
              'linear-gradient(135deg, rgba(211,47,47,0.10), rgba(211,47,47,0.02))',
            color: 'error.dark',
            boxShadow: '0 12px 28px -18px rgba(211,47,47,0.65)',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              flexShrink: 0,
              px: 2.5,
              py: 1.5,
              background: 'linear-gradient(135deg, #c62828, #e53935)',
              color: '#fff',
              maxHeight: '100%',
            }}
          >
            <Box
              className="pulse-dot"
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: '#fff',
                boxShadow: '0 0 10px rgba(255,255,255,0.9)',
                flexShrink: 0,
              }}
            />
            <CampaignIcon fontSize="small" />
            <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
              تنبيه عاجل
            </Typography>
          </Stack>

          <Box
            role="marquee"
            aria-label="التنبيهات العاجلة"
            sx={{ position: 'relative', overflow: 'hidden', flex: 1, py: 1.5 }}
          >
            <Box sx={{ display: 'flex', width: 'max-content', animation: `${marquee} 28s linear infinite` }}>
              {[0, 1].map((dup) => (
                <Box key={dup} aria-hidden={dup === 1} sx={{ display: 'flex', flexShrink: 0 }}>
                  {urgent.map((n) => (
                    <Typography
                      key={`${dup}-${n.id}`}
                      variant="body2"
                      sx={{ px: 4, fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      {n.title} — {n.description}
                    </Typography>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}

      <Grid container spacing={2.5}>
        {notices.map((n) => {
          const p = PRIORITY[n.priority] ?? PRIORITY.LOW;
          const meta = categoryMeta(n.category);
          return (
            <Grid item xs={12} sm={6} md={4} key={n.id}>
              <Card
                className="fade-up"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    left: 0,
                    height: 4,
                    background: `linear-gradient(90deg, ${p.tone}, ${p.tone}55)`,
                  },
                  transition: 'box-shadow 250ms ease, transform 250ms ease, border-color 250ms ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    borderColor: p.tone,
                    boxShadow: `0 16px 32px -18px ${p.tone}cc`,
                  },
                }}
              >
                <CardContent sx={{ p: 2.5, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2.5,
                        display: 'grid',
                        placeItems: 'center',
                        color: p.tone,
                        bgcolor: `${p.tone}18`,
                        flexShrink: 0,
                      }}
                    >
                      {meta.icon}
                    </Box>
                    <Chip
                      size="small"
                      color={p.color}
                      label={p.label}
                      variant="filled"
                      icon={<NotificationsActiveIcon />}
                      sx={{ fontWeight: 700, '& .MuiChip-icon': { fontSize: 16 } }}
                    />
                  </Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {n.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, flex: 1 }}>
                    {n.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={meta.label}
                      icon={meta.icon}
                      sx={{ fontWeight: 700 }}
                    />
                    {n.published_at && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon sx={{ fontSize: 14 }} />
                        {formatDate(n.published_at)}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
};

export default PublicNotices;
