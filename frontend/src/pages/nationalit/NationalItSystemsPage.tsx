import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import MemoryIcon from '@mui/icons-material/Memory';
import RouterIcon from '@mui/icons-material/Router';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SettingsIcon from '@mui/icons-material/Settings';
import SpeedIcon from '@mui/icons-material/Speed';
import Button from '@mui/material/Button';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { SectionCard, StatusChip, AppButton } from '../../components/uikit';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { getNationalItDashboard } from '../../api/endpoints/nationalIt';
import type { NationalItDashboard } from '../../types/nationalIt';

const TONE: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  ONLINE: { label: 'Online', tone: 'success' },
  WARNING: { label: 'Warning', tone: 'warning' },
  OFFLINE: { label: 'Offline', tone: 'error' },
};

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <MonitorHeartIcon fontSize="small" /> },
  { id: 'systems', label: 'الأنظمة', icon: <SettingsIcon fontSize="small" /> },
  { id: 'performance', label: 'الأداء', icon: <SpeedIcon fontSize="small" /> },
] as const;

const NationalItSystemsPage = () => {
  const [dash, setDash] = useState<NationalItDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  const load = () => {
    setLoading(true);
    getNationalItDashboard()
      .then((res) => setDash(res.data.data))
      .catch(() => setDash(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const fmt = (v?: number) => Number(v ?? 0).toLocaleString('ar-EG');
  const systems = dash?.systems ?? [];

  return (
    <Box aria-busy={loading}>
      <DashboardHero
        eyebrow="الأنظمة القومية"
        title="حالة الأنظمة القومية"
        subtitle="متابعة حالة جميع الأنظمة والخدمات التقنية في الدولة."
        gradient="amber"
        avatarLabel="ح"
        action={
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" component={Link} to="/dashboard/national/it" startIcon={<ArrowBackIcon />}>
              العودة
            </Button>
            <AppButton size="small" startIcon={<RefreshIcon />} onClick={load} loading={loading}>
              تحديث الحالة
            </AppButton>
          </Stack>
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label="أقسام اللوحة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <KpiCard icon={<MemoryIcon />} value={loading ? '…' : fmt(dash?.active_systems)} label="أنظمة نشطة" accent="success.main" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <KpiCard icon={<MemoryIcon />} value={loading ? '…' : fmt(dash?.warning_systems)} label="تحذير" accent="warning.main" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <KpiCard icon={<MemoryIcon />} value={loading ? '…' : fmt(dash?.offline_systems)} label="متوقفة" accent="error.main" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <KpiCard icon={<RouterIcon />} value={loading ? '…' : fmt(dash?.connected_ports)} label="منافذ متصلة" accent="info.main" />
              </Grid>
            </Grid>
          </Box>

          <Box component="section" ref={register('systems')} data-section="systems" sx={{ scrollMarginTop: '80px' }}>
            <SectionCard
              title="قائمة الأنظمة"
              subtitle={`${systems.length} نظام عبر جميع القطاعات`}
              sx={{ mb: 3 }}
              action={
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={`متصل: ${fmt(dash?.active_systems)}`} color="success" variant="outlined" />
                  <Chip size="small" label={`متوقف: ${fmt(dash?.offline_systems)}`} color="error" variant="outlined" />
                </Stack>
              }
            >
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>النظام</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الكود</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الطلبات</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>آخر فحص</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={5}><Skeleton height={32} /></TableCell></TableRow>
                      ))
                    ) : systems.length === 0 ? (
                      <TableRow><TableCell colSpan={5} align="center"><Typography color="text.secondary">لا توجد بيانات</Typography></TableCell></TableRow>
                    ) : (
                      systems.map((s) => {
                        const t = TONE[s.status] ?? { label: s.status, tone: 'neutral' as const };
                        return (
                          <TableRow key={s.id} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{s.name_ar || s.name}</TableCell>
                            <TableCell><Typography variant="caption" color="text.secondary">{s.code}</Typography></TableCell>
                            <TableCell>{fmt(s.request_count)}</TableCell>
                            <TableCell><StatusChip label={t.label} tone={t.tone} /></TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {s.last_checked_at ? new Date(s.last_checked_at).toLocaleString('ar-EG') : '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </Box>

          <Box component="section" ref={register('performance')} data-section="performance" sx={{ scrollMarginTop: '80px' }}>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>أداء الأنظمة</Typography>
                  <SpeedIcon color="primary" />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  ملخص الأداء والمتوسطات الحسابية لكل نظام
                </Typography>
                {loading ? (
                  <Skeleton variant="rounded" height={120} />
                ) : systems.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 3 }}>لا توجد بيانات أداء</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {systems.map((s) => (
                      <Stack key={s.id} direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: 'primary.light', flexShrink: 0 }}>
                          <MemoryIcon fontSize="small" />
                        </Box>
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{s.name_ar || s.name}</Typography>
                        <StatusChip label={TONE[s.status]?.label ?? s.status} tone={TONE[s.status]?.tone ?? 'neutral'} />
                        <Typography variant="caption" color="text.secondary" sx={{ width: 60, textAlign: 'right', fontWeight: 700 }}>
                          {fmt(s.request_count)} طلب
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default NationalItSystemsPage;
