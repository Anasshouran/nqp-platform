import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Skeleton from '@mui/material/Skeleton';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import AnchorIcon from '@mui/icons-material/Anchor';
import GroupsIcon from '@mui/icons-material/Groups';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScienceIcon from '@mui/icons-material/Science';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import BugReportIcon from '@mui/icons-material/BugReport';
import PaidIcon from '@mui/icons-material/Paid';
import VerifiedIcon from '@mui/icons-material/Verified';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { SectionCard, StatusChip, EmptyState } from '../../../components/uikit';
import KpiCard from '../../../components/dashboard/KpiCard';
import DashboardHero from '../../../components/dashboard/DashboardHero';
import type { StatusTone } from '../../../components/uikit';
import { getSectorDashboard } from '../../../api/endpoints/reports';
import type { DashboardWindow, SectorDashboard, SectorStation } from '../../../api/endpoints/reports';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../../components/command';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const WINDOWS: { value: DashboardWindow; label: string }[] = [
  { value: 'day', label: 'اليوم' },
  { value: 'week', label: 'الأسبوع' },
  { value: 'month', label: 'الشهر' },
  { value: 'year', label: 'السنة' },
  { value: 'all', label: 'الكل' },
];

const statusMeta: Record<SectorStation['status'], { label: string; tone: StatusTone }> = {
  STABLE: { label: 'مستقر', tone: 'success' },
  WATCH: { label: 'متابعة', tone: 'warning' },
  CRITICAL: { label: 'حرج', tone: 'error' },
};

const typeLabels: Record<string, string> = {
  AIRPORT: 'مطار',
  SEAPORT: 'ميناء بحري',
  LAND_PORT: 'معبر بري',
};

const typeIcons: Record<string, React.ReactNode> = {
  AIRPORT: <FlightTakeoffIcon />,
  SEAPORT: <DirectionsBoatIcon />,
  LAND_PORT: <DirectionsBusIcon />,
};

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <HealthAndSafetyIcon fontSize="small" /> },
  { id: 'stations', label: 'نقاط الدخول', icon: <AnchorIcon fontSize="small" /> },
  { id: 'modules', label: 'أنشطة القطاع', icon: <Inventory2Icon fontSize="small" /> },
  { id: 'portStatus', label: 'حالة المنافذ', icon: <DirectionsBoatIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'staff', label: 'الموظفون', icon: <GroupsIcon fontSize="small" /> },
] as const;

const FlowStat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Stack direction="row" spacing={1} alignItems="center">
      <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    </Stack>
    <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
  </Stack>
);

const RedSeaPortalHome = () => {
  const [windowKey, setWindowKey] = useState<DashboardWindow>('month');
  const [data, setData] = useState<SectorDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getSectorDashboard({ window: windowKey })
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [windowKey]);

  const stations = useMemo(() => data?.stations ?? [], [data]);
  const criticalCount = useMemo(
    () => stations.filter((s) => s.status === 'CRITICAL').length,
    [stations]
  );

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  const kpiCards = [
    {
      icon: <AnchorIcon />,
      value: data?.kpis?.ports ?? 0,
      label: 'نقاط الدخول',
      color: 'primary.main' as const,
    },
    {
      icon: <GroupsIcon />,
      value: data?.kpis?.staff ?? 0,
      label: 'الموظفون',
      color: 'info.main' as const,
    },
    {
      icon: <Inventory2Icon />,
      value: data?.kpis?.shipments ?? 0,
      label: 'المعاملات الحالية',
      color: 'success.main' as const,
    },
    {
      icon: <WarningAmberIcon />,
      value: criticalCount,
      label: 'تحتاج متابعة',
      color: 'error.main' as const,
    },
  ];

  const portCount = (type: string) => stations.filter((s) => s.type === type).length;
  const portScreens = (type: string) =>
    stations.filter((s) => s.type === type).reduce((acc, s) => acc + s.screens, 0);

  const food = data?.food;
  const vectors = data?.vectors;
  const surveillance = data?.surveillance;
  const airports = data?.airports;
  const seaports = data?.seaports;
  const landBorders = data?.land_borders;
  const alerts = data?.alerts ?? [];
  const departments = (data?.departments ?? []).slice().sort((a, b) => b.score - a.score);
  const staff = data?.staff ?? [];

  return (
    <Box>
      <DashboardHero
        eyebrow="بوابة قطاع البحر الأحمر"
        title="لوحة التحكم — قطاع البحر الأحمر"
        subtitle="مؤشرات تشغيلية لقطاع البحر الأحمر، معروضة ضمن نطاق القطاع فقط."
        gradient="ocean"
        avatarLabel="ل"
        action={
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <TextField
              select
              size="small"
              value={windowKey}
              onChange={(e) => setWindowKey(e.target.value as DashboardWindow)}
              sx={{ minWidth: 120 }}
            >
              {WINDOWS.map((w) => (
                <MenuItem key={w.value} value={w.value}>{w.label}</MenuItem>
              ))}
            </TextField>
            <Chip label={`${data?.sector?.name_ar ?? 'قطاع البحر الأحمر'}`} color="primary" variant="outlined" />
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
      {loading ? (
        <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
          <Grid container spacing={1.5} sx={{ mb: 4 }}>
            {kpiCards.map((_, i) => (
              <Grid item xs={6} sm={3} key={i}>
                <Skeleton variant="rounded" height={110} />
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : !data ? (
        <EmptyState
          icon={<WarningAmberIcon />}
          title="تعذّر تحميل البيانات"
          description="لم نتمكن من جلب بيانات القطاع. تأكد من أن حسابك ضمن نطاق قطاع البحر الأحمر."
        />
      ) : (
        <>
          {/* KPI band */}
          <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
            <Grid container spacing={1.5} sx={{ mb: 4 }}>
              {kpiCards.map((k) => (
                <Grid item xs={6} sm={3} key={k.label}>
                  <KpiCard
                    icon={k.icon}
                    value={Number(k.value).toLocaleString('ar-EG')}
                    label={k.label}
                    accent={k.color}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Points of entry breakdown */}
          <Box component="section" ref={register('stations')} data-section="stations" sx={{ scrollMarginTop: '80px' }}>
            <SectionCard title="نقاط الدخول" subtitle="توزيع منافذ القطاع حسب النوع" sx={{ mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Stack alignItems="center" spacing={1} p={2} sx={{ borderRadius: 3, bgcolor: 'grey.50' }}>
                  <Box sx={{ color: 'primary.main', display: 'flex' }}><FlightTakeoffIcon /></Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{portCount('AIRPORT')}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>المطارات</Typography>
                  <Typography variant="caption" color="text.secondary">{portScreens('AIRPORT')} فحص</Typography>
                </Stack>
              </Grid>
              <Grid item xs={4}>
                <Stack alignItems="center" spacing={1} p={2} sx={{ borderRadius: 3, bgcolor: 'grey.50' }}>
                  <Box sx={{ color: 'primary.main', display: 'flex' }}><DirectionsBoatIcon /></Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{portCount('SEAPORT')}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>الموانئ</Typography>
                  <Typography variant="caption" color="text.secondary">{portScreens('SEAPORT')} فحص</Typography>
                </Stack>
              </Grid>
              <Grid item xs={4}>
                <Stack alignItems="center" spacing={1} p={2} sx={{ borderRadius: 3, bgcolor: 'grey.50' }}>
                  <Box sx={{ color: 'primary.main', display: 'flex' }}><DirectionsBusIcon /></Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{portCount('LAND_PORT')}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>المعابر البرية</Typography>
                  <Typography variant="caption" color="text.secondary">{portScreens('LAND_PORT')} فحص</Typography>
                </Stack>
              </Grid>
            </Grid>
          </SectionCard>
          </Box>

          <Box component="section" ref={register('modules')} data-section="modules" sx={{ scrollMarginTop: '80px' }}>
            <Grid container spacing={3}>
              {/* Food Safety */}
            <Grid item xs={12} md={6} lg={3}>
              <SectionCard title="🍎 رقابة الأغذية" subtitle="معاملات القطاع">
                <Stack spacing={1.5}>
                  <FlowStat icon={<Inventory2Icon />} label="الوارد" value={food?.imports ?? 0} />
                  <FlowStat icon={<Inventory2Icon />} label="الصادر" value={food?.exports ?? 0} />
                  <FlowStat icon={<Inventory2Icon />} label="قيد المعالجة" value={food?.in_progress ?? 0} />
                  <FlowStat icon={<VerifiedIcon />} label="مفرج عنها" value={food?.released ?? 0} />
                  <FlowStat icon={<WarningAmberIcon />} label="عينات" value={food?.samples ?? 0} />
                </Stack>
              </SectionCard>
            </Grid>

            {/* Vector Control */}
            <Grid item xs={12} md={6} lg={3}>
              <SectionCard title="🦟 مكافحة النواقل" subtitle="بيانات القطاع">
                <Stack spacing={1.5}>
                  <FlowStat icon={<BugReportIcon />} label="البلاغات" value={vectors?.reports ?? 0} />
                  <FlowStat icon={<BugReportIcon />} label="الحملات النشطة" value={vectors?.active_campaigns ?? 0} />
                  <FlowStat icon={<BugReportIcon />} label="مواقع عالية الخطورة" value={vectors?.high_risk_sites ?? 0} />
                  <FlowStat icon={<BugReportIcon />} label="رشّ مكتمل" value={vectors?.completed_sprays ?? 0} />
                  {vectors?.note && (
                    <Typography variant="caption" color="text.disabled">{vectors.note}</Typography>
                  )}
                </Stack>
              </SectionCard>
            </Grid>

            {/* Surveillance */}
            <Grid item xs={12} md={6} lg={3}>
              <SectionCard title="📡 الترصد الوبائي" subtitle="مؤشرات القطاع">
                <Stack spacing={1.5}>
                  <FlowStat icon={<HealthAndSafetyIcon />} label="حالات مشتبهة" value={surveillance?.suspected ?? 0} />
                  <FlowStat icon={<HealthAndSafetyIcon />} label="حالات مؤكدة" value={surveillance?.confirmed ?? 0} />
                  <FlowStat icon={<NotificationsActiveIcon />} label="تنبيهات نشطة" value={surveillance?.active_alerts ?? 0} />
                  <FlowStat icon={<ScienceIcon />} label="مستوى الخطورة" value={surveillance?.risk_level ?? '—'} />
                </Stack>
              </SectionCard>
            </Grid>

            {/* Port modules */}
            <Grid item xs={12} md={6} lg={3}>
              <SectionCard title="🚪 أداء المنافذ" subtitle="مطارات / موانئ / معابر">
                <Stack spacing={1.5}>
                  <FlowStat icon={<FlightTakeoffIcon />} label="رحلات اليوم" value={airports?.flights_today ?? 0} />
                  <FlowStat icon={<DirectionsBoatIcon />} label="سفن" value={seaports?.ships ?? 0} />
                  <FlowStat icon={<DirectionsBoatIcon />} label="فحوص موانئ" value={seaports?.inspected ?? 0} />
                  <FlowStat icon={<DirectionsBusIcon />} label="فحوص معابر" value={landBorders?.screenings ?? 0} />
                </Stack>
              </SectionCard>
            </Grid>
          </Grid>
          </Box>

          {/* Stations table */}
          <Box component="section" ref={register('portStatus')} data-section="portStatus" sx={{ scrollMarginTop: '80px' }}>
            <SectionCard title="حالة المنافذ" subtitle="قائمة نقاط الدخول ضمن القطاع" sx={{ mt: 3 }}>
            {stations.length === 0 ? (
              <EmptyState title="لا توجد منافذ" description="لم تُسجّل منافذ ضمن هذا القطاع بعد." />
            ) : (
              <Grid container spacing={2}>
                {stations.map((s) => (
                  <Grid item xs={12} sm={6} md={4} key={s.id}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent sx={{ p: 2.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                          <Box sx={{ color: 'primary.main', display: 'flex' }}>{typeIcons[s.type]}</Box>
                          <Chip size="small" label={typeLabels[s.type]} variant="outlined" />
                        </Stack>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{s.name}</Typography>
                        <Typography variant="caption" color="text.secondary" dir="ltr">{s.code}</Typography>
                        <Divider sx={{ my: 1.5 }} />
                        <Stack spacing={1}>
                          <FlowStat icon={<HealthAndSafetyIcon />} label="فحوصات" value={s.screens} />
                          <FlowStat icon={<WarningAmberIcon />} label="مشتبهة" value={s.suspected} />
                          <FlowStat icon={<VerifiedIcon />} label="جاهزية" value={`${s.readiness}%`} />
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>الحالة</Typography>
                            <StatusChip label={statusMeta[s.status].label} tone={statusMeta[s.status].tone} />
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </SectionCard>
          </Box>

          <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px' }}>
            <Grid container spacing={3} sx={{ mt: 0 }}>
            {/* Alerts */}
            <Grid item xs={12} lg={7}>
              <SectionCard title="التنبيهات وإجراءات مطلوبة" subtitle="آخر التنبيهات في القطاع">
                {alerts.length === 0 ? (
                  <Typography color="text.secondary">لا توجد تنبيهات معلقة.</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {alerts.slice(0, 7).map((a) => (
                      <Stack key={a.id} direction="row" spacing={1.5} alignItems="center">
                        <Chip
                          size="small"
                          label={a.severity === 'critical' ? 'حرج' : a.severity === 'medium' ? 'متوسط' : 'معلومة'}
                          color={a.severity === 'critical' ? 'error' : a.severity === 'medium' ? 'warning' : 'info'}
                          variant="outlined"
                        />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {a.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.body}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </SectionCard>
            </Grid>

            {/* Departments + revenue */}
            <Grid item xs={12} lg={5}>
              <SectionCard title="📊 أداء الإدارات" subtitle="درجات الأداء">
                <Stack spacing={1.5}>
                  {departments.slice(0, 6).map((d) => (
                    <Box key={d.id}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{d.name}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{d.score}</Typography>
                      </Stack>
                      <Box sx={{ bgcolor: 'grey.100', borderRadius: 1, height: 8, overflow: 'hidden' }}>
                        <Box sx={{ width: `${Math.min(100, d.score)}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 1 }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </SectionCard>
              <SectionCard title="💰 الإيرادات" subtitle="إيرادات القطاع" sx={{ mt: 2 }}>
                <FlowStat icon={<PaidIcon />} label="إجمالي الإيرادات" value={Number(data?.revenue?.total ?? 0).toLocaleString('ar-EG')} />
                {(data?.revenue?.shares ?? []).map((sh) => (
                  <FlowStat key={sh.name} icon={<VerifiedIcon />} label={sh.name} value={`${sh.amount.toLocaleString('ar-EG')} (${sh.pct}%)`} />
                ))}
              </SectionCard>
            </Grid>
          </Grid>
          </Box>

          {/* Staff recent */}
          <Box component="section" ref={register('staff')} data-section="staff" sx={{ scrollMarginTop: '80px' }}>
            {staff.length > 0 && (
              <SectionCard title="👥 الموظفون" subtitle="أحدث الموظفين في القطاع" sx={{ mt: 3 }}>
              <Grid container spacing={2}>
                {staff.slice(0, 8).map((s) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={s.id}>
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{s.name}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {s.department || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                          {s.station || '—'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </SectionCard>
          )}
          </Box>
        </>
      )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default RedSeaPortalHome;
