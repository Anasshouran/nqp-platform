import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Skeleton from '@mui/material/Skeleton';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import MemoryIcon from '@mui/icons-material/Memory';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RouterIcon from '@mui/icons-material/Router';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Button from '@mui/material/Button';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { SectionCard, StatusChip, AppButton } from '../../components/uikit';
import { getNationalItDashboard } from '../../api/endpoints/nationalIt';
import type { NationalItDashboard } from '../../types/nationalIt';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const CONNECTIVITY: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  STABLE: { label: 'مستقر', tone: 'success' },
  PARTIAL: { label: 'انقطاع جزئي', tone: 'warning' },
  DISRUPTION: { label: 'انقطاع متكرر', tone: 'error' },
};

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <AccountTreeIcon fontSize="small" /> },
  { id: 'report', label: 'تقرير القطاعات', icon: <ReceiptLongIcon fontSize="small" /> },
] as const;

const NationalItSectorsPage = () => {
  const [dash, setDash] = useState<NationalItDashboard | null>(null);
  const [loading, setLoading] = useState(true);

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

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  const fmt = (v?: number) => Number(v ?? 0).toLocaleString('ar-EG');
  const sectors = dash?.sectors ?? [];
  const totalSystems = sectors.reduce((a, s) => a + (s.total_systems || 0), 0);
  const totalTickets = sectors.reduce((a, s) => a + (s.open_tickets || 0), 0);
  const totalPorts = sectors.reduce((a, s) => a + (s.connected_ports || 0), 0);

  return (
    <Box>
      <DashboardHero
        eyebrow="أداء القطاعات"
        title="أداء القطاعات — تقنيًا"
        subtitle="مقارنة جاهزية الأنظمة والتذاكر الحرجة وحالة الاتصال بين القطاعات."
        gradient="amber"
        avatarLabel="أ"
        action={
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" component={Link} to="/dashboard/national/it" startIcon={<ArrowBackIcon />}>
              العودة
            </Button>
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
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="amber.main"
            label="أقسام اللوحة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
        <Grid container spacing={1.5} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={3}>
            <KpiCard icon={<AccountTreeIcon />} value={loading ? '…' : fmt(sectors.length)} label="القطاعات" accent="primary.main" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KpiCard icon={<MemoryIcon />} value={loading ? '…' : fmt(totalSystems)} label="إجمالي الأنظمة" accent="info.main" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KpiCard icon={<ReceiptLongIcon />} value={loading ? '…' : fmt(totalTickets)} label="تذاكر مفتوحة" accent="warning.main" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KpiCard icon={<RouterIcon />} value={loading ? '…' : fmt(totalPorts)} label="منافذ متصلة" accent="success.main" />
          </Grid>
        </Grid>
      </Box>

      <Box component="section" ref={register('report')} data-section="report" sx={{ scrollMarginTop: '80px' }}>
      <SectionCard title="تقرير القطاعات" subtitle="الأنظمة النشطة وتذاكر الدعم وحالة الاتصال لكل قطاع">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>القطاع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الأنظمة النشطة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تحذير</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>متوقفة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>منافذ متصلة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تذاكر حرجة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>حالة الاتصال</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton height={32} /></TableCell></TableRow>
                ))
              ) : sectors.length === 0 ? (
                <TableRow><TableCell colSpan={7} align="center"><Typography color="text.secondary">لا توجد بيانات</Typography></TableCell></TableRow>
              ) : (
                sectors.map((s) => {
                  const c = CONNECTIVITY[s.connectivity] ?? { label: s.connectivity, tone: 'neutral' as const };
                  return (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{s.name_ar}</TableCell>
                      <TableCell>{s.active_systems}/{s.total_systems}</TableCell>
                      <TableCell>
                        <Typography color={s.warning_systems > 0 ? 'warning.main' : 'inherit'} sx={{ fontWeight: 700 }}>
                          {fmt(s.warning_systems)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography color={s.offline_systems > 0 ? 'error.main' : 'inherit'} sx={{ fontWeight: 700 }}>
                          {fmt(s.offline_systems)}
                        </Typography>
                      </TableCell>
                      <TableCell>{fmt(s.connected_ports)}</TableCell>
                      <TableCell>
                        <Typography color={s.critical_tickets > 0 ? 'error.main' : 'inherit'} sx={{ fontWeight: 700 }}>
                          {fmt(s.critical_tickets)}
                        </Typography>
                      </TableCell>
                      <TableCell><StatusChip label={c.label} tone={c.tone} /></TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </SectionCard>
      </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default NationalItSectorsPage;
