import { useEffect, useState } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import MemoryIcon from '@mui/icons-material/Memory';
import RouterIcon from '@mui/icons-material/Router';
import DnsIcon from '@mui/icons-material/Dns';
import BugReportIcon from '@mui/icons-material/BugReport';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { SectionCard, StatusChip, AppButton } from '../../components/uikit';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { getNationalItDashboard } from '../../api/endpoints/nationalIt';
import type { NationalItDashboard } from '../../types/nationalIt';

const CONNECTIVITY: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  STABLE: { label: 'مستقر', tone: 'success' },
  PARTIAL: { label: 'انقطاع جزئي', tone: 'warning' },
  DISRUPTION: { label: 'انقطاع متكرر', tone: 'error' },
};

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SYSTEM_TONE: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  ONLINE: { label: 'Online', tone: 'success' },
  WARNING: { label: 'Warning', tone: 'warning' },
  OFFLINE: { label: 'Offline', tone: 'error' },
};

const INT_TONE: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  CONNECTED: { label: 'متصل', tone: 'success' },
  WARNING: { label: 'تأخير', tone: 'warning' },
  ERROR: { label: 'خطأ', tone: 'error' },
};

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <MemoryIcon fontSize="small" /> },
  { id: 'systems', label: 'الأنظمة', icon: <RouterIcon fontSize="small" /> },
  { id: 'integrations', label: 'التكاملات', icon: <DnsIcon fontSize="small" /> },
] as const;

const NationalItDashboardPage = () => {
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

  const count = (v?: number) => v ?? 0;
  const fmt = (v?: number) => Number(v ?? 0).toLocaleString('ar-EG');

  const kpis = [
    { label: 'أنظمة نشطة', value: fmt(dash?.active_systems), icon: <MemoryIcon />, accent: 'success.main' as const },
    { label: 'منافذ متصلة', value: fmt(dash?.connected_ports), icon: <RouterIcon />, accent: 'info.main' as const },
    { label: 'الأصول والأجهزة', value: fmt(dash?.asset_count), icon: <DnsIcon />, accent: 'primary.main' as const },
    { label: 'تذاكر مفتوحة', value: fmt(dash?.open_tickets), icon: <ReceiptLongIcon />, accent: 'warning.main' as const },
    { label: 'تذاكر حرجة', value: fmt(dash?.critical_tickets), icon: <BugReportIcon />, accent: 'error.main' as const },
  ];

  return (
    <Box>
      <DashboardHero
        eyebrow="الإدارة العامة للحجر الصحي القومي"
        title="لوحة التحكم الوطنية — تقنية المعلومات"
        subtitle="نظرة شاملة على الأنظمة والبنية التحتية والتكاملات الحكومية وأداء القطاعات في الدولة."
        gradient="amber"
        avatarLabel="ل"
        action={
          <Stack direction="row" spacing={1}>
            <Chip label="نطاق وطني" color="primary" variant="outlined" />
            <AppButton size="small" startIcon={<RefreshIcon />} onClick={load} loading={loading}>
              تحديث
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
          <CommandSectionRail sections={SECTIONS as unknown as CommandSectionDef[]} active={active} onNavigate={scrollTo} accent="primary.main" label="أقسام اللوحة" />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          <Grid container spacing={1.5} sx={{ mb: 4, scrollMarginTop: '80px' }} ref={register('overview')} data-section="overview">
            {kpis.map((k) => (
          <Grid item xs={6} sm={4} md={2.4} key={k.label}>
            <KpiCard icon={k.icon} value={loading ? '…' : k.value} label={k.label} accent={k.accent} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ scrollMarginTop: '80px' }} ref={register('systems')} data-section="systems">
        <Grid item xs={12} lg={7}>
          <SectionCard
            title="حالة الأنظمة القومية"
            subtitle="جاهزية الأنظمة عبر جميع القطاعات"
            action={
              <Stack direction="row" spacing={1}>
                <Chip size="small" label={`تحذير: ${fmt(dash?.warning_systems)}`} color="warning" variant="outlined" />
                <Chip size="small" label={`متوقف: ${fmt(dash?.offline_systems)}`} color="error" variant="outlined" />
              </Stack>
            }
          >
            {loading ? (
              <Stack spacing={1}><Skeleton height={44} /><Skeleton height={44} /><Skeleton height={44} /></Stack>
            ) : (
              <Stack divider={<Divider />} spacing={1.25}>
                {(dash?.systems ?? []).map((s) => {
                  const t = SYSTEM_TONE[s.status] ?? { label: s.status, tone: 'neutral' as const };
                  return (
                    <Stack key={s.id} direction="row" justifyContent="space-between" alignItems="center" px={0.5}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.name_ar || s.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.code}</Typography>
                      </Box>
                      <StatusChip label={t.label} tone={t.tone} />
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          {/* Sector performance */}
          <SectionCard title="أداء القطاعات (تقنيًا)" subtitle="الأنظمة النشطة والتذاكر الحرجة وحالة الاتصال">
            {loading ? (
              <Stack spacing={1}><Skeleton height={32} /><Skeleton height={32} /><Skeleton height={32} /></Stack>
            ) : (
              <Stack divider={<Divider />} spacing={1}>
                {(dash?.sectors ?? []).map((s) => {
                  const c = CONNECTIVITY[s.connectivity] ?? { label: s.connectivity, tone: 'neutral' as const };
                  return (
                    <Stack key={s.id} direction="row" justifyContent="space-between" alignItems="center" px={0.5}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.name_ar}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          {s.active_systems}/{s.total_systems} أنظمة
                        </Typography>
                        <StatusChip label={c.label} tone={c.tone} />
                      </Stack>
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </SectionCard>

          {/* Integrations */}
          <SectionCard title="التكامل الحكومي" subtitle="حالة المزامنة مع الجهات الخارجية" sx={{ mt: 2 }}>
            {loading ? (
              <Stack spacing={1}><Skeleton height={32} /><Skeleton height={32} /></Stack>
            ) : (
              <Stack divider={<Divider />} spacing={1}>
                {(dash?.integrations ?? []).map((i) => {
                  const t = INT_TONE[i.status] ?? { label: i.status, tone: 'neutral' as const };
                  return (
                    <Stack key={i.id} direction="row" justifyContent="space-between" alignItems="center" px={0.5}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{i.name_ar}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {i.error_count > 0 ? `${i.error_count} أخطاء` : 'سليم'}
                        </Typography>
                      </Box>
                      <StatusChip label={t.label} tone={t.tone} />
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default NationalItDashboardPage;
