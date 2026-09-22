import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import PrintIcon from '@mui/icons-material/Print';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import AnchorIcon from '@mui/icons-material/Anchor';
import AirplaneTicketIcon from '@mui/icons-material/AirplaneTicket';
import GroupsIcon from '@mui/icons-material/Groups';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import ScienceIcon from '@mui/icons-material/Science';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import PaidIcon from '@mui/icons-material/Paid';
import VerifiedIcon from '@mui/icons-material/Verified';
import EmergencyShareIcon from '@mui/icons-material/EmergencyShare';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { SectionCard, StatusChip, ExportButton } from '../../components/uikit';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import { statusMeta } from '../../types/commandCenter';
import { notifySuccess } from '../../utils/toast';
import { getSectorDashboard } from '../../api/endpoints/reports';
import type { DashboardWindow } from '../../api/endpoints/reports';
import { buildRedSeaReport } from './redSeaData';
import type { RedSeaReport, RedSeaStation, RedSeaShip, RedSeaFlight } from './redSeaData';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const WINDOWS: Array<{ key: DashboardWindow; label: string }> = [
  { key: 'day', label: 'اليوم' },
  { key: 'week', label: 'الأسبوع' },
  { key: 'month', label: 'الشهر' },
  { key: 'year', label: 'السنة' },
];

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const stationTypeLabel: Record<RedSeaStation['type'], string> = {
  SEAPORT: 'ميناء بحري',
  AIRPORT: 'مطار',
  LAND_PORT: 'معبر / نقطة شحن',
};

const shipStatusMeta: Record<RedSeaShip['status'], { label: string; tone: 'success' | 'warning' | 'error' }> = {
  APPROVED: { label: 'حصلت على تصريح', tone: 'success' },
  INSPECTED: { label: 'خضعت للفحص', tone: 'warning' },
  PENDING: { label: 'تنتظر الفحص', tone: 'error' },
};

const flightStatusMeta: Record<RedSeaFlight['status'], { label: string; tone: 'success' | 'warning' | 'info' }> = {
  CLEARED: { label: 'وصلت وقُبلت', tone: 'success' },
  CHECKED: { label: 'قيد الفحص', tone: 'warning' },
  ARRIVED: { label: 'وصلت حديثاً', tone: 'info' },
};

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <MonitorHeartIcon fontSize="small" /> },
  { id: 'stations', label: 'المنافذ', icon: <AnchorIcon fontSize="small" /> },
  { id: 'shipments', label: 'الشحنات', icon: <LocalShippingIcon fontSize="small" /> },
  { id: 'trends', label: 'الاتجاهات', icon: <TrendingUpIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <WarningAmberIcon fontSize="small" /> },
] as const;

const RedSeaCommandPage = () => {
  const [window, setWindow] = useState<DashboardWindow>('day');
  const [report, setReport] = useState<RedSeaReport>(() => buildRedSeaReport());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getSectorDashboard({ window })
      .then((res) => {
        if (cancelled) return;
        const data = res.data.data as { kpis?: { passengers?: number; suspected?: number; confirmed?: number } };
        setReport(buildRedSeaReport(data?.kpis ? { kpis: data.kpis } : undefined));
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setReport(buildRedSeaReport());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [window]);

  useEffect(() => {
    const scrollToHash = () => {
      const hash = globalThis.location.hash;
      if (hash) {
        const el = document.getElementById(hash.slice(1));
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    scrollToHash();
    globalThis.addEventListener('hashchange', scrollToHash);
    return () => globalThis.removeEventListener('hashchange', scrollToHash);
  }, []);

  const theme = useTheme();

  const kpis = useMemo(
    () => [
      { icon: <AnchorIcon />, value: report.kpis.seaports, label: 'منافذ بحرية', accent: 'primary.main' },
      { icon: <AccountTreeIcon />, value: report.kpis.stations, label: 'محطات القطاع', accent: 'info.main' },
      { icon: <GroupsIcon />, value: report.kpis.passengers.toLocaleString('ar-EG'), label: 'المسافرون اليوم', accent: 'success.main' },
      { icon: <FactCheckIcon />, value: report.kpis.screenings.toLocaleString('ar-EG'), label: 'فحوصات صحية', accent: 'info.main' },
      { icon: <Inventory2Icon />, value: report.kpis.food_shipments, label: 'شحنات أغذية', accent: 'warning.main' },
      { icon: <ScienceIcon />, value: report.kpis.lab_samples, label: 'عينات في المختبر', accent: 'info.main' },
      { icon: <WarningAmberIcon />, value: report.kpis.suspected, label: 'حالات مشتبهة', accent: 'error.main' },
      { icon: <HealthAndSafetyIcon />, value: report.kpis.quarantine, label: 'حالات حجر صحي', accent: 'secondary.main' },
    ],
    [report],
  );

  return (
    <Box aria-busy={loading}>
      <DashboardHero
        eyebrow="Red Sea Sector Command"
        title="لوحة مدير قطاع البحر الأحمر"
        subtitle="القيادة التنفيذية لقطاع البحر الأحمر — الموانئ البحرية، مطار بورتسودان، الفسح الغذائي، المختبر المرجعي، والترصد الساحلي"
        gradient="ocean"
        avatarLabel="ل"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              select
              size="small"
              value={window}
              onChange={(e) => setWindow(e.target.value as DashboardWindow)}
              sx={{ minWidth: 130, bgcolor: 'background.paper' }}
              inputProps={{ 'aria-label': 'الفترة' }}
            >
              {WINDOWS.map((w) => (
                <MenuItem key={w.key} value={w.key}>
                  {w.label}
                </MenuItem>
              ))}
            </TextField>
            <Tooltip title="طباعة التقرير">
              <IconButton aria-label="طباعة" size="small" sx={{ border: '1px solid', borderColor: 'divider' }} onClick={() => { globalThis.print(); notifySuccess('تم تجهيز التقرير للطباعة'); }}>
                <PrintIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <ExportButton
              filename="red-sea-sector-dashboard"
              headers={['المنفذ', 'النوع', 'فحوصات', 'مشتبهة', 'الجاهزية%', 'الحالة']}
              rows={report.stations.map((s) => [s.name, stationTypeLabel[s.type], s.screens, s.suspected, s.readiness, statusMeta[s.status].label])}
              disabled={loading}
            />
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

      {report.emergency && (
        <Box sx={{ mb: 3, p: 2, borderRadius: 3, border: '1px solid', borderColor: 'error.light', background: 'linear-gradient(90deg, rgba(198,58,58,0.09), rgba(255,255,255,0.6))', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'error.main', flexShrink: 0 }}>
            <EmergencyShareIcon fontSize="small" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Chip label={report.emergency.id} size="small" color="error" variant="outlined" />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{report.emergency.title}</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {report.emergency.port} · الإجراء: {report.emergency.action} · المسؤول: {report.emergency.responsible}
            </Typography>
          </Box>
          <Chip label="حالة حرجة — تدخل فوري" size="small" color="error" />
        </Box>
      )}

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} role="status">
          تعذر الاتصال بالخادم — تعرض بيانات محلية تقديرية. آخر تحديث:{' '}
          {new Date(report.last_updated).toLocaleString('ar-EG')}
        </Alert>
      )}

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
      {/* KPI */}
      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {kpis.map((k) => (
            <Grid item xs={6} sm={4} md={3} key={k.label}>
              <KpiCard icon={k.icon} value={loading ? '…' : k.value} label={k.label} accent={k.accent} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* منافذ الوصول */}
      <Box component="section" ref={register('stations')} data-section="stations" sx={{ scrollMarginTop: '80px' }}>
        <SectionCard
          title="منافذ وتحصينات قطاع البحر الأحمر"
          subtitle="محطات الموانئ والمطارات والمعابر في القطاع"
          sx={{ mb: 3 }}
        >
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
          <LegendDot color="success.main" label="طبيعي" />
          <LegendDot color="warning.main" label="متابعة" />
          <LegendDot color="error.main" label="حرجة" />
          <LegendDot color="text.disabled" label="غير متصلة" />
        </Stack>
        <Grid container spacing={2}>
          {loading
            ? Array.from({ length: 7 }).map((_, i) => (
                <Grid item xs={12} sm={6} md={4} lg={4} key={i}>
                  <Skeleton variant="rounded" height={132} />
                </Grid>
              ))
            : report.stations.map((s) => {
                const meta = statusMeta[s.status];
                return (
                  <Grid item xs={12} sm={6} md={4} lg={4} key={s.id}>
                    <Card variant="outlined" sx={{ height: '100%', borderTop: `3px solid ${meta.color}`, transition: '0.15s', '&:hover': { boxShadow: 5 } }}>
                      <CardContent>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                          <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: s.status === 'OFFLINE' ? 'text.disabled' : 'primary.main', bgcolor: 'primary.light' }}>
                            {s.type === 'SEAPORT' ? <AnchorIcon fontSize="small" /> : s.type === 'AIRPORT' ? <AirplaneTicketIcon fontSize="small" /> : <LocalShippingIcon fontSize="small" />}
                          </Box>
                          <Chip label={stationTypeLabel[s.type]} size="small" variant="outlined" />
                        </Stack>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3, minHeight: 38 }}>
                          {s.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                          {s.detail}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                          <StatusChip label={s.status === 'OFFLINE' ? 'غير متصل' : meta.label} tone={s.status === 'OFFLINE' ? 'error' : s.status === 'CRITICAL' ? 'error' : s.status === 'WATCH' ? 'warning' : 'success'} />
                          {s.online && <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>{s.screens.toLocaleString('ar-EG')} فحص · {s.suspected} مشتبه</Typography>}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
        </Grid>
      </SectionCard>
      </Box>

      {/* الموانئ + المطار */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <Box component="section" ref={register('shipments')} data-section="shipments" sx={{ scrollMarginTop: '80px' }}>
          <SectionCard
            title="حركة السفن بالموانئ"
            subtitle={`${report.ships.filter((s) => s.status !== 'APPROVED').length} سفينة تنتظر الفحص أو التصريح`}
          >
            <Stack spacing={1.5}>
              {loading
                ? <Skeleton variant="rounded" height={260} />
                : report.ships.map((ship) => (
                    <Stack key={ship.id} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ p: 1.5, borderRadius: 3, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.5)' }}>
                      <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: 'primary.light', flexShrink: 0 }}>
                        <LocalShippingIcon fontSize="small" />
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{ship.name}</Typography>
                          <Chip label={ship.flag} size="small" variant="outlined" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          من {ship.origin} · {ship.cargo} · طاقم {ship.crew} {ship.passengers ? `+ ${ship.passengers} راكب` : ''}
                        </Typography>
                      </Box>
                      <StatusChip label={shipStatusMeta[ship.status].label} tone={shipStatusMeta[ship.status].tone} />
                      <Chip label={ship.free_pratique ? 'تصريح حر' : 'بلا تصريح'} size="small" color={ship.free_pratique ? 'success' : 'default'} variant={ship.free_pratique ? 'filled' : 'outlined'} />
                    </Stack>
                  ))}
            </Stack>
          </SectionCard>
          </Box>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Stack spacing={3}>
            <Box component="section" ref={register('airport')} data-section="airport" sx={{ scrollMarginTop: '80px' }}>
            <SectionCard title="مطار بورتسودان الدولي" subtitle="آخر الرحلات الواصلة والفحص الصحي">
              <Stack spacing={1.5}>
                {loading
                  ? <Skeleton variant="rounded" height={200} />
                  : report.flights.map((f) => (
                      <Stack key={f.id} direction="row" alignItems="center" spacing={1.5}>
                        <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: 'info.main', bgcolor: 'info.light', flexShrink: 0 }}>
                          <AirplaneTicketIcon fontSize="small" />
                        </Box>
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{f.flight}</Typography>
                            <Typography variant="caption" color="text.secondary">من {f.origin}</Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {f.pax} راكب · {f.screened} مفحوص
                          </Typography>
                        </Box>
                        <StatusChip label={flightStatusMeta[f.status].label} tone={flightStatusMeta[f.status].tone} />
                      </Stack>
                    ))}
              </Stack>
            </SectionCard>
            </Box>
            <Box component="section" ref={register('food')} data-section="food" sx={{ scrollMarginTop: '80px' }}>
            <SectionCard title="الفسح الغذائي" subtitle={`${report.food.imports} وارد · ${report.food.exports} صادر`}>
              <Stack spacing={1.5}>
                <FlowStat icon={<Inventory2Icon fontSize="small" />} label="شحنات قيد الإجراء" value={report.food.in_progress} />
                <FlowStat icon={<CheckCircleIcon fontSize="small" />} label="مفرج عنها" value={report.food.released} />
                <FlowStat icon={<CloseIcon fontSize="small" />} label="محجوزة / مرفوضة" value={report.food.rejected} />
                <FlowStat icon={<ScienceIcon fontSize="small" />} label="عينات غير مطابقة" value={report.food.noncomplying} />
              </Stack>
            </SectionCard>
            </Box>
          </Stack>
        </Grid>
      </Grid>

      {/* منحنى الفحوصات + أداء الإدارات */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>منحنى الفحوصات اليومي</Typography>
                <TrendingUpIcon color="primary" />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                عدد المفحوصين والمشتبهين في محطات القطاع خلال الأسبوع
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={230} />
              ) : (
                <Box sx={{ width: '100%', height: 230 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.surveillance.daily_curve} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" fontSize={11} tick={{ fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} fontSize={11} tick={{ fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} width={34} />
                      <ChartTooltip cursor={{ fill: 'rgba(12,127,106,0.08)' }} />
                      <Bar dataKey="screened" name="مفحوصون" radius={[6, 6, 0, 0]} fill={theme.palette.primary.main} barSize={18} />
                      <Bar dataKey="suspected" name="مشتبهون" radius={[6, 6, 0, 0]} fill={theme.palette.error.main} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SectionCard title="أداء إدارات القطاع" subtitle="تقييم جهوزية الوحدات التشغيلية" sx={{ height: '100%' }}>
            <Stack spacing={1.5}>
              {loading
                ? <Skeleton variant="rounded" height={220} />
                : report.departments.map((d) => (
                    <Stack key={d.name} direction="row" alignItems="center" spacing={1.5}>
                      <Typography variant="body2" sx={{ width: 200, fontWeight: 700 }}>{d.name}</Typography>
                      <Box sx={{ flex: 1, bgcolor: 'rgba(16,40,34,0.06)', borderRadius: 1.5, height: 10, overflow: 'hidden' }}>
                        <Box sx={{ width: `${d.score}%`, height: '100%', bgcolor: d.score >= 90 ? '#0c7f6a' : d.score >= 85 ? '#b98a2e' : '#c63a3a', borderRadius: 1.5 }} />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ width: 38, textAlign: 'right', fontWeight: 700 }}>{d.score}%</Typography>
                    </Stack>
                  ))}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      {/* التنبيهات + ملخص */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px' }}>
          <SectionCard title="التنبيهات وطلبات التدخل" subtitle={`${report.alerts.length} تنبيهات`}>
            <Stack spacing={1.25}>
              {report.alerts.map((a) => (
                <Stack key={a.id} direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.5, borderRadius: 3, border: '1px solid rgba(16,40,34,0.07)', bgcolor: a.severity === 'critical' ? 'rgba(198,58,58,0.05)' : 'rgba(255,255,255,0.5)' }}>
                  <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: a.severity === 'critical' ? 'error.main' : a.severity === 'medium' ? 'warning.main' : 'primary.main', bgcolor: a.severity === 'critical' ? 'error.light' : 'primary.light', flexShrink: 0 }}>
                    <WarningAmberIcon fontSize="small" />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Chip label={a.severity === 'critical' ? 'حرج' : a.severity === 'medium' ? 'متوسط' : 'عادي'} size="small" variant="outlined" color={a.severity === 'critical' ? 'error' : a.severity === 'medium' ? 'warning' : 'primary'} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.time}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary">{a.body}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </SectionCard>
          </Box>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Stack spacing={3}>
            <SectionCard title="الطاقة البشرية" subtitle="المتواجدون اليوم في القطاع">
              <Stack spacing={1.5}>
                <FlowStat icon={<GroupsIcon fontSize="small" />} label="إجمالي المتواجدون" value={report.staff.on_duty} />
                <FlowStat icon={<FactCheckIcon fontSize="small" />} label="مفتشون صحيون" value={report.staff.inspectors} />
                <FlowStat icon={<ScienceIcon fontSize="small" />} label="فنيو مختبر" value={report.staff.lab_techs} />
                <FlowStat icon={<HealthAndSafetyIcon fontSize="small" />} label="تمريض" value={report.staff.nurses} />
                <FlowStat icon={<VerifiedIcon fontSize="small" />} label="إداريون" value={report.staff.admin} />
              </Stack>
            </SectionCard>
            <Box component="section" ref={register('revenue')} data-section="revenue" sx={{ scrollMarginTop: '80px' }}>
            <SectionCard title="الإيرادات وجباية" subtitle="رسوم الشهادات الصحية والفحص">
              <Stack spacing={1.5}>
                <FlowStat icon={<PaidIcon fontSize="small" />} label="إجمالي الإيرادات" value={report.revenue.total} />
                <FlowStat icon={<VerifiedIcon fontSize="small" />} label="شهادات صحية صادرة" value={report.revenue.certificates} />
                <FlowStat icon={<WarningAmberIcon fontSize="small" />} label="مخالفات مسجلة" value={report.revenue.violations} />
              </Stack>
            </SectionCard>
            </Box>
          </Stack>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap spacing={1}>
        <Typography variant="caption" color="text.secondary">
          قطاع البحر الأحمر — الحجر الصحي القومي · وزارة الصحة الاتحادية، السودان
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          آخر تحديث: {new Date(report.last_updated).toLocaleString('ar-EG')}
        </Typography>
      </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

const FlowStat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Stack direction="row" alignItems="center" spacing={1.5}>
    <Box sx={{ width: 36, height: 36, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: 'primary.light', flexShrink: 0 }}>
      {icon}
    </Box>
    <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{label}</Typography>
    <Typography variant="h6" sx={{ fontWeight: 700 }}>{value.toLocaleString('ar-EG')}</Typography>
  </Stack>
);

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <Stack direction="row" spacing={0.75} alignItems="center">
    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
    <Typography variant="body2" color="text.secondary">{label}</Typography>
  </Stack>
);

export default RedSeaCommandPage;