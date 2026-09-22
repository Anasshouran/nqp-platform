import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import MemoryIcon from '@mui/icons-material/Memory';
import DnsIcon from '@mui/icons-material/Dns';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import AssessmentIcon from '@mui/icons-material/Assessment';
import RefreshIcon from '@mui/icons-material/Refresh';
import RouterIcon from '@mui/icons-material/Router';
import { PageHeader, SectionCard, AppButton } from '../../../../components/uikit';
import { StatusChip } from '../../../../components/ui';
import { getItDashboard, recheckItSystems } from '../../../../api/endpoints/it';
import type { ItDashboard } from '../../../../types/it';

const STATUS_LABEL: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  ONLINE: { label: 'مُتصل', tone: 'success' },
  WARNING: { label: 'تحذير', tone: 'warning' },
  OFFLINE: { label: 'متوقف', tone: 'error' },
};

const navCards = [
  { label: 'حالة الأنظمة', target: '/dashboard/sector/red-sea/it/systems', icon: <MemoryIcon />, tone: '#1565c0' },
  { label: 'الأصول والأجهزة', target: '/dashboard/sector/red-sea/it/assets', icon: <DnsIcon />, tone: '#0e7490' },
  { label: 'تذاكر الدعم', target: '/dashboard/sector/red-sea/it/tickets', icon: <SupportAgentIcon />, tone: '#6f42c1' },
  { label: 'الشبكات', target: '/dashboard/sector/red-sea/it/networks', icon: <NetworkCheckIcon />, tone: '#1d7a54' },
  { label: 'التقارير الفنية', target: '/dashboard/sector/red-sea/it/reports', icon: <AssessmentIcon />, tone: '#b02a37' },
];

const RedSeaItAdminPage = () => {
  const [dash, setDash] = useState<ItDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [rechecking, setRechecking] = useState(false);

  const load = () => {
    setLoading(true);
    getItDashboard()
      .then((res) => setDash(res.data.data))
      .catch(() => setDash(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleRecheck = () => {
    setRechecking(true);
    recheckItSystems()
      .then(() => load())
      .finally(() => setRechecking(false));
  };

  const count = (v?: number) => v ?? 0;

  const kpis = [
    { label: 'أنظمة نشطة', value: count(dash?.active_systems), icon: <MemoryIcon />, tone: 'success.main' as const },
    { label: 'منافذ متصلة', value: count(dash?.connected_ports), icon: <RouterIcon />, tone: 'info.main' as const },
    { label: 'الأصول والأجهزة', value: count(dash?.asset_count), icon: <DnsIcon />, tone: 'primary.main' as const },
    { label: 'تذاكر مفتوحة', value: count(dash?.open_tickets), icon: <SupportAgentIcon />, tone: 'warning.main' as const },
    { label: 'تذاكر حرجة', value: count(dash?.critical_tickets), icon: <AssessmentIcon />, tone: 'error.main' as const },
  ];

  return (
    <Box>
      <PageHeader
        eyebrow="قسم تقنية المعلومات"
        title="لوحة تقنية المعلومات — قطاع البحر الأحمر"
        subtitle="مراقبة حالة الأنظمة والشبكات والأصول وتذاكر الدعم ضمن نطاق القطاع."
        action={
          <Stack direction="row" spacing={1}>
            <Chip label="قطاع البحر الأحمر" color="primary" variant="outlined" />
            <AppButton size="small" startIcon={<RefreshIcon />} onClick={handleRecheck} loading={rechecking}>
              إعادة الفحص
            </AppButton>
          </Stack>
        }
      />

      {/* KPI band */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {kpis.map((k) => (
          <Grid item xs={6} sm={3} md={2.4} key={k.label}>
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box sx={{ color: k.tone, display: 'flex' }}>{k.icon}</Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {loading ? <Skeleton width={40} /> : Number(k.value).toLocaleString('ar-EG')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{k.label}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Systems status table */}
        <Grid item xs={12} lg={7}>
          <SectionCard
            title="حالة الأنظمة"
            subtitle="جاهزية الأنظمة التقنية الأساسية"
            action={
              <Stack direction="row" spacing={1}>
                <Chip size="small" label={`تحذير: ${count(dash?.warning_systems)}`} color="warning" variant="outlined" />
                <Chip size="small" label={`متوقف: ${count(dash?.offline_systems)}`} color="error" variant="outlined" />
              </Stack>
            }
          >
            {loading ? (
              <Stack spacing={1}><Skeleton height={44} /><Skeleton height={44} /><Skeleton height={44} /></Stack>
            ) : (
              <Stack divider={<Divider />} spacing={1.25}>
                {(dash?.systems ?? []).map((s) => {
                  const tone = STATUS_LABEL[s.status] ?? { label: s.status, tone: 'neutral' as const };
                  return (
                    <Stack key={s.id} direction="row" justifyContent="space-between" alignItems="center" px={0.5}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.name_ar || s.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.code}</Typography>
                      </Box>
                      <StatusChip label={tone.label} tone={tone.tone} />
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </SectionCard>
        </Grid>

        {/* Tickets + ports */}
        <Grid item xs={12} lg={5}>
          <SectionCard title="آخر تذاكر الدعم" subtitle="أحدث التذاكر حسب الأولوية">
            {loading ? (
              <Stack spacing={1}><Skeleton height={32} /><Skeleton height={32} /></Stack>
            ) : (
              <Stack divider={<Divider />} spacing={1.25}>
                {(dash?.recent_tickets ?? []).map((t) => (
                  <Stack key={t.id} direction="row" justifyContent="space-between" alignItems="center" px={0.5}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.subject}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{t.ticket_no} — {t.priority}</Typography>
                    </Box>
                    <StatusChip label={t.status} tone={
                      t.status === 'CLOSED' || t.status === 'RESOLVED' ? 'success' : t.status === 'IN_PROGRESS' ? 'info' : 'warning'
                    } />
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>

          <SectionCard title="الوصول السريع" sx={{ mt: 2 }}>
            <Grid container spacing={1.5}>
              {navCards.map((c) => (
                <Grid item xs={6} sm={4} key={c.label}>
                  <Card variant="outlined" sx={{ height: '100%', borderRadius: 2 }}>
                    <CardActionArea component={Link} to={c.target} sx={{ height: '100%' }}>
                      <CardContent sx={{ p: 1.5 }}>
                        <Stack spacing={1} alignItems="center">
                          <Box sx={{ color: c.tone, display: 'flex', fontSize: 30 }}>{c.icon}</Box>
                          <Typography variant="caption" sx={{ fontWeight: 700 }} align="center">{c.label}</Typography>
                        </Stack>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RedSeaItAdminPage;