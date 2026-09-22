import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VerifiedIcon from '@mui/icons-material/Verified';
import BlockIcon from '@mui/icons-material/Block';
import GavelIcon from '@mui/icons-material/Gavel';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BiotechIcon from '@mui/icons-material/Biotech';
import DashboardIcon from '@mui/icons-material/Dashboard';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import KpiCard from '../../components/dashboard/KpiCard';
import { SectionCard, PageTabs, StatusChip } from '../../components/uikit';
import { useAuth } from '../../hooks/useAuth';
import { notifySuccess } from '../../utils/toast';
import {
  PERIOD_KPIS,
  OPERATIONS_LABELS,
  OPERATIONS_SERIES,
  FLIGHTS,
  SCREENING_META,
  SCREENING_CHART,
  CARGO,
  LAB_METRICS,
  ALERTS,
  DECISIONS,
  TERMINALS,
  AIRPORT_USERS,
  ACTIVITY_LOG,
  PERMISSIONS,
  REVENUE_BY_AREA,
  REVENUE_TREND,
} from './data';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, ChartTooltip, Legend, Filler);

const BLUE = '#2f6dd0';
const TEAL = '#12a585';
const NAVY = '#14312a';
const AMBER = '#a86400';
const RED = '#c63a3a';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const CHART_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { font: { family: 'IBM Plex Sans Arabic', size: 12 }, boxWidth: 14, usePointStyle: true } },
    tooltip: { rtl: true, textDirection: 'rtl' as const, bodyFont: { family: 'IBM Plex Sans Arabic' } },
  },
  scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(16,40,34,0.06)' } } },
};

type Period = 'DAY' | 'WEEK' | 'MONTH';

const flightStatusMeta = {
  CLEARED: { label: 'صُرف — سليم', tone: 'success' as const },
  CHECKING: { label: 'قيد الفحص', tone: 'warning' as const },
  SUSPECTED: { label: 'حالة مشتبهة', tone: 'error' as const },
};

const alertMeta = {
  critical: { color: RED, bg: 'rgba(198,58,58,0.06)', border: 'rgba(198,58,58,0.25)', label: 'حرجة' },
  warning: { color: AMBER, bg: 'rgba(168,100,0,0.06)', border: 'rgba(168,100,0,0.25)', label: 'تحذير' },
  attention: { color: BLUE, bg: 'rgba(47,109,208,0.05)', border: 'rgba(47,109,208,0.2)', label: 'انتباه' },
} as const;

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <DashboardIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'operations', label: 'العمليات', icon: <HealthAndSafetyIcon fontSize="small" /> },
  { id: 'flights', label: 'الرحلات', icon: <FlightLandIcon fontSize="small" /> },
  { id: 'screening', label: 'الفحص', icon: <VerifiedUserIcon fontSize="small" /> },
  { id: 'terminals', label: 'المواقع', icon: <TableChartIcon fontSize="small" /> },
  { id: 'decision', label: 'دعم القرار', icon: <LightbulbIcon fontSize="small" /> },
  { id: 'reports', label: 'التقارير', icon: <PictureAsPdfIcon fontSize="small" /> },
  { id: 'staff', label: 'الموظفون', icon: <BiotechIcon fontSize="small" /> },
  { id: 'permissions', label: 'الصلاحيات', icon: <GavelIcon fontSize="small" /> },
] as const;

const AirportDirectorPage = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('DAY');
  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], []);

  return (
    <Box>
      {/* ===== ترحيب ===== */}
      <DashboardHero
        eyebrow="لوحة القيادة التنفيذية — صحة المطارات"
        title={`مرحباً، ${user?.full_name || 'مديرة الحجر الصحي بالمطار'} 👋`}
        subtitle="نظرة تنفيذية شاملة على صحة المطارات: الرحلات، فحص المسافرين، الشحن الجوي، المختبر، والإيرادات"
        gradient="emerald"
        avatarLabel={(user?.full_name || 'م').slice(0, 1)}
        action={
          <ToggleButtonGroup
            size="small"
            exclusive
            value={period}
            onChange={(_, v: Period) => v && setPeriod(v)}
            sx={{ '& .MuiToggleButton-root': { fontWeight: 700, borderRadius: 2, px: 1.5 } }}
          >
            <ToggleButton value="DAY">اليوم</ToggleButton>
            <ToggleButton value="WEEK">هذا الأسبوع</ToggleButton>
            <ToggleButton value="MONTH">هذا الشهر</ToggleButton>
          </ToggleButtonGroup>
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
          {/* KPI */}
          <Grid container ref={register('overview')} data-section="overview" spacing={1.5} sx={{ mb: 3, scrollMarginTop: '80px' }}>
            {PERIOD_KPIS[period].map((k) => (
              <Grid item xs={12} sm={6} md={4} xl={2} key={k.label}>
                <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} trend={k.trend} />
              </Grid>
            ))}
          </Grid>

          {/* ===== التنبيهات ===== */}
          <Box ref={register('alerts')} data-section="alerts" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title="🚨 مركز التنبيهات" subtitle="أحداث تستدعي النظر الفوري — الرحلة، الطاقم، الشحن">
              <Grid container spacing={2}>
                {ALERTS.map((a) => {
                  const m = alertMeta[a.severity];
                  return (
                    <Grid item xs={12} md={4} key={a.title}>
                      <Box sx={{ p: 1.75, borderRadius: 3, height: '100%', border: `1px solid ${m.border}`, bgcolor: m.bg, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <WarningAmberIcon sx={{ color: m.color }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: m.color }}>{a.title}</Typography>
                          <Chip label={m.label} size="small" sx={{ bgcolor: m.color, color: '#fff', fontSize: 10, height: 20 }} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">{a.body}</Typography>
                        <Typography variant="caption" onClick={() => notifySuccess('فتح التفاصيل')} sx={{ fontWeight: 700, color: m.color, cursor: 'pointer', mt: 'auto' }}>
                          عرض التحليل ←
                        </Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </SectionCard>
          </Box>

          {/* ===== مؤشر العمليات + المختبر ===== */}
          <Box ref={register('operations')} data-section="operations" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <SectionCard
                  title="مؤشرات العمليات"
                  subtitle="وصول / مغادرة / فحص / عينات / فسح — اتجاه عام لكل فترة"
                  action={
                    <Chip label="مقارنة مع الفترة السابقة" color="primary" variant="outlined" sx={{ fontWeight: 700 }} onClick={() => notifySuccess('تم تفعيل المقارنة')} />
                  }
                >
                  <ExecutiveChart period={period} />
                </SectionCard>
              </Grid>
              <Grid item xs={12} lg={4}>
                <SectionCard title="أداء المختبر بالمطار" subtitle="معمل المطار — عينات المسافرين والأغذية" sx={{ height: '100%' }}>
                  <Grid container spacing={1.5}>
                    {LAB_METRICS.map((m) => (
                      <Grid item xs={6} key={m.label}>
                        <Box sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.5)' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>{m.label}</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: BLUE }}>{m.value}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </SectionCard>
              </Grid>
            </Grid>
          </Box>

          {/* ===== لوحة الرحلات ===== */}
          <Box ref={register('flights')} data-section="flights" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title="✈️ لوحة الرحلات" subtitle="الواصلة والمغادرة قيد الفحص الصحي — الحالة الفورية">
              <TableContainer>
                <Table size="small" sx={{ minWidth: 720 }}>
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
                      <TableCell>الرحلة</TableCell>
                      <TableCell>المسار</TableCell>
                      <TableCell align="center">النوع</TableCell>
                      <TableCell align="center">المسافرون</TableCell>
                      <TableCell align="center">الوقت</TableCell>
                      <TableCell align="center">الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {FLIGHTS.map((f) => {
                      const meta = flightStatusMeta[f.status];
                      return (
                        <TableRow key={f.flight} hover>
                          <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{f.flight}</TableCell>
                          <TableCell>{f.route}</TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              variant="outlined"
                              icon={f.type === 'arrival' ? <FlightLandIcon /> : <FlightTakeoffIcon />}
                              label={f.type === 'arrival' ? 'واصلة' : 'مغادرة'}
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell align="center">{f.passengers}</TableCell>
                          <TableCell align="center">{f.time}</TableCell>
                          <TableCell align="center">
                            <Chip size="small" color={meta.tone} label={meta.label} sx={{ fontWeight: 700, color: f.status !== 'CHECKING' ? '#fff' : undefined }} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </Box>

          {/* ===== فحص المسافرين + بؤر ===== */}
          <Box ref={register('screening')} data-section="screening" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={7}>
                <SectionCard title="فحص المسافرين" subtitle="الفحص الصحي بالحرارة وفحوصات الدخول — ورصد الحالات">
                  <Grid container spacing={2}>
                    <MetricChip icon={<VerifiedUserIcon />} color="primary" label="تم الفحص" value={SCREENING_META.screened.toLocaleString('en-US')} />
                    <MetricChip icon={<WarningAmberIcon />} color="warning" label="مشتبهة" value={SCREENING_META.suspected} />
                    <MetricChip icon={<HealthAndSafetyIcon />} color="error" label="عالقات/عزل" value={SCREENING_META.quarantine} />
                    <MetricChip icon={<LoginIcon />} color="info" label="محالة للطوارئ" value={SCREENING_META.referred} />
                  </Grid>
                  <Box sx={{ height: 220, mt: 2 }}>
                    <Line
                      data={{
                        labels: SCREENING_CHART.labels,
                        datasets: [
                          { label: 'مسافرون فُحصوا', data: SCREENING_CHART.screened, borderColor: BLUE, backgroundColor: 'rgba(47,109,208,0.12)', fill: true, tension: 0.35, borderWidth: 2 },
                          { label: 'محالات للطوارئ', data: SCREENING_CHART.referred, borderColor: RED, backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, borderDash: [5, 4] },
                        ],
                      }}
                      options={{ ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { ...CHART_OPTS.plugins.legend, display: true } } }}
                    />
                  </Box>
                </SectionCard>
              </Grid>
              <Grid item xs={12} lg={5}>
                <SectionCard title="الشحن الجوي الغذائي" subtitle="وارد / صادر — شهادات وعينات الأغذية" sx={{ height: '100%' }}>
                <Grid container spacing={1.5}>
                  <MetricChip icon={<FlightLandIcon />} color="primary" label="بضائع وارد" value={`${CARGO.importPallets} طبلية`} />
                  <MetricChip icon={<FlightTakeoffIcon />} color="success" label="بضائع صادر" value={`${CARGO.exportPallets} طبلية`} />
                  <MetricChip icon={<VerifiedIcon />} color="info" label="شهادات صحية" value={CARGO.foodDocs} />
                  <MetricChip icon={<BiotechIcon />} color="warning" label="عينات أغذية" value={CARGO.samples} />
                </Grid>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>أهم الأصناف</Typography>
                <Stack spacing={0.75}>
                  {CARGO.topGoods.map(([g, c]) => (
                    <Stack key={g} direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">{g}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{c}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </SectionCard>
              </Grid>
            </Grid>
          </Box>

          {/* ===== أداء المواقع + الإيرادات ===== */}
          <Box ref={register('terminals')} data-section="terminals" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={7}>
                <SectionCard title="أداء مواقع المطار" subtitle="المباني والشحن — الإشغال والالتزام بمعايير الفحص">
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
                          <TableCell>الموقع</TableCell>
                          <TableCell align="center">مسافرون</TableCell>
                          <TableCell align="center" sx={{ minWidth: 150 }}>التزام الفحص</TableCell>
                          <TableCell align="center">اختناق</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {TERMINALS.map((t) => (
                          <TableRow key={t.name} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{t.name}</TableCell>
                            <TableCell align="center">{t.screened.toLocaleString('en-US')}</TableCell>
                            <TableCell align="center">
                              <ProgressBar value={t.sla} color={t.sla >= 92 ? 'success.main' : t.sla >= 88 ? 'warning.main' : 'error.main'} />
                            </TableCell>
                            <TableCell align="center">
                              <Chip size="small" label={t.bottleneck} color={t.bottleneck === 'نعم' ? 'error' : 'success'} variant="outlined" sx={{ fontWeight: 700 }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </SectionCard>
              </Grid>
              <Grid item xs={12} lg={5}>
                <SectionCard title="الإيرادات" subtitle="رسوم الفحص والشهادات وفسح الشحن (SDG)" sx={{ height: '100%' }}>
                <Box sx={{ height: 180, display: 'grid', placeItems: 'center' }}>
                  <Doughnut
                    data={{
                      labels: REVENUE_BY_AREA.map((r) => r.area),
                      datasets: [{ data: REVENUE_BY_AREA.map((r) => r.value), backgroundColor: [BLUE, TEAL, AMBER, NAVY], borderWidth: 2, borderColor: '#fff' }],
                    }}
                    options={{ cutout: '66%', plugins: { legend: { position: 'bottom', labels: { font: { family: 'IBM Plex Sans Arabic', size: 11 }, boxWidth: 10, usePointStyle: true } } } }}
                  />
                </Box>
                <Box sx={{ height: 150 }}>
                  <Line
                    data={{
                      labels: ['06ص', '09ص', '12م', '03م', '06م', '09م'],
                      datasets: [
                        { label: 'هذا اليوم', data: REVENUE_TREND.daily, borderColor: BLUE, backgroundColor: 'rgba(47,109,208,0.12)', fill: true, tension: 0.35, borderWidth: 2 },
                        { label: 'اليوم السابق', data: REVENUE_TREND.previous, borderColor: AMBER, backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, borderDash: [5, 4] },
                      ],
                    }}
                    options={CHART_OPTS}
                  />
                </Box>
              </SectionCard>
              </Grid>
            </Grid>
          </Box>

          {/* ===== دعم القرار ===== */}
          <Box ref={register('decision')} data-section="decision" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title="💡 دعم اتخاذ القرار" subtitle="النظام يوصي — والمديرة تقرر">
              <Grid container spacing={2}>
                {DECISIONS.map((d) => (
                  <Grid item xs={12} md={4} key={d.topic}>
                    <Box sx={{ p: 1.75, borderRadius: 3, height: '100%', border: '1px solid rgba(47,109,208,0.15)', bgcolor: 'rgba(47,109,208,0.035)', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 32, height: 32, borderRadius: 2, display: 'grid', placeItems: 'center', color: BLUE, bgcolor: 'rgba(47,109,208,0.1)' }}>
                          <LightbulbIcon sx={{ fontSize: 18 }} />
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{d.topic}</Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ fontSize: 13 }}>{d.finding}</Typography>
                      <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>{d.cause}</Typography>
                      <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>{d.recommendation}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </SectionCard>
          </Box>

          {/* ===== التقارير ===== */}
          <Box ref={register('reports')} data-section="reports" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <ReportsSection />
          </Box>

          {/* ===== الموظفون ===== */}
          <Box ref={register('staff')} data-section="staff" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard
              title="موظفو المطار"
              subtitle="مفتشون، فنيو مختبر، كتّاب إدخال — إدارة المواقع"
              action={<Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => notifySuccess('فتح إضافة موظف')}>إضافة موظف</Button>}
            >
              <TableContainer>
                <Table size="small" sx={{ minWidth: 680 }}>
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
                      <TableCell>الموظف</TableCell>
                      <TableCell>الدور</TableCell>
                      <TableCell>الموقع</TableCell>
                      <TableCell align="center">آخر نشاط</TableCell>
                      <TableCell align="center">الحالة</TableCell>
                      <TableCell align="center">إجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {AIRPORT_USERS.map((u) => (
                      <TableRow key={u.name} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar sx={{ width: 30, height: 30, fontSize: 13, bgcolor: 'primary.main' }}>{u.name.charAt(0)}</Avatar>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{u.name}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{u.role}</TableCell>
                        <TableCell>{u.area}</TableCell>
                        <TableCell align="center">{u.lastActive}</TableCell>
                        <TableCell align="center"><StatusChip tone={u.status === 'نشط' ? 'success' : 'neutral'} label={u.status} /></TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="تعديل الصلاحيات"><IconButton aria-label="تعديل الصلاحيات" size="small" onClick={() => notifySuccess(`تعديل ${u.name}`)}><GavelIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="إعادة تعيين كلمة المرور"><IconButton aria-label="إعادة تعيين كلمة المرور" size="small" onClick={() => notifySuccess(`إعادة تعيين ${u.name}`)}><RestartAltIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="سجل النشاط"><IconButton aria-label="السجل" size="small" onClick={() => notifySuccess(`سجل ${u.name}`)}><HistoryIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title={u.status === 'نشط' ? 'إيقاف' : 'تفعيل'}>
                              <IconButton aria-label="إيقاف" size="small" color={u.status === 'نشط' ? 'error' : 'success'} onClick={() => notifySuccess(`تم ${u.status === 'نشط' ? 'إيقاف' : 'تفعيل'} ${u.name}`)}>
                                {u.status === 'نشط' ? <BlockIcon fontSize="small" /> : <VerifiedIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </Box>

          {/* ===== الصلاحيات + النشاط ===== */}
          <Box ref={register('permissions')} data-section="permissions" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={6}>
                <SectionCard title="مصفوفة الصلاحيات" subtitle="متاح للمديرة / مستبعد تشغيليًا">
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>✔ المتاح</Typography>
                  <Stack spacing={0.75} sx={{ mb: 2 }}>
                    {PERMISSIONS.allowed.map((p) => (
                      <Stack key={p} direction="row" alignItems="center" spacing={1.25} sx={{ p: 1, borderRadius: 2.5, border: '1px solid rgba(29,122,84,0.16)', bgcolor: 'rgba(29,122,84,0.04)' }}>
                        <VerifiedIcon sx={{ fontSize: 18, color: 'success.main' }} />
                        <Typography variant="body2" sx={{ fontSize: 13.5, fontWeight: 600 }}>{p}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'error.main', mb: 1 }}>✖ غير متاح</Typography>
                  <Stack spacing={0.75}>
                    {PERMISSIONS.denied.map((p) => (
                      <Stack key={p} direction="row" alignItems="center" spacing={1.25} sx={{ p: 1, borderRadius: 2.5, border: '1px solid rgba(198,58,58,0.16)', bgcolor: 'rgba(198,58,58,0.035)' }}>
                        <BlockIcon sx={{ fontSize: 18, color: 'error.main' }} />
                        <Typography variant="body2" sx={{ fontSize: 13.5, fontWeight: 600 }}>{p}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </SectionCard>
              </Grid>
              <Grid item xs={12} lg={6}>
                <SectionCard title="📋 سجل الأنشطة" subtitle="آخر الإجراءات الإدارية" sx={{ height: '100%' }}>
                  <Stack spacing={0.75}>
                    {ACTIVITY_LOG.map((a) => (
                      <Stack
                        key={`${a.time}-${a.action}`}
                        direction="row"
                        alignItems="center"
                        spacing={1.5}
                        sx={{ p: 1.1, borderRadius: 2.5, border: '1px solid rgba(16,40,34,0.06)', bgcolor: 'rgba(255,255,255,0.5)' }}
                      >
                        <Box sx={{ width: 30, height: 30, borderRadius: 2, display: 'grid', placeItems: 'center', color: a.tone === 'success' ? 'success.main' : a.tone === 'info' ? 'info.main' : a.tone === 'warning' ? 'warning.main' : 'primary.main', bgcolor: 'rgba(16,40,34,0.04)', flexShrink: 0 }}>
                          {a.tone === 'warning' ? <BlockIcon sx={{ fontSize: 16 }} /> : a.tone === 'info' ? <LoginIcon sx={{ fontSize: 16 }} /> : a.tone === 'primary' ? <LogoutIcon sx={{ fontSize: 16 }} /> : <VerifiedIcon sx={{ fontSize: 16 }} />}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13.5 }}>{a.action}</Typography>
                          <Typography variant="caption" color="text.secondary">{a.actor}</Typography>
                        </Box>
                        <Chip label={a.time} size="small" variant="outlined" sx={{ fontWeight: 700 }} />
                      </Stack>
                    ))}
                  </Stack>
                </SectionCard>
              </Grid>
            </Grid>
          </Box>

          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 4 }}>
            وزارة الصحة الاتحادية — منصة الحجر الصحي القومي · إدارة الحجر الصحي بالمطار · بيانات استرشادية للعرض
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

/* ============================= مكونات فرعية ============================= */

const ExecutiveChart = ({ period }: { period: Period }) => {
  const labels = OPERATIONS_LABELS[period];
  const s = OPERATIONS_SERIES[period];
  return (
    <Box sx={{ height: 300 }}>
      <Line
        data={{
          labels,
          datasets: [
            { label: 'الوصول', data: s.arrivals, borderColor: BLUE, backgroundColor: 'rgba(47,109,208,0.1)', fill: true, tension: 0.35, borderWidth: 2, pointRadius: 3 },
            { label: 'المغادرة', data: s.departures, borderColor: NAVY, backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, pointRadius: 3, borderDash: [4, 3] },
            { label: 'الفحص', data: s.screened, borderColor: TEAL, backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, pointRadius: 2, yAxisID: 'y1' },
            { label: 'الفسح', data: s.cleared, borderColor: AMBER, backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, pointRadius: 2, yAxisID: 'y1', borderDash: [2, 4] },
          ],
        }}
        options={{
          ...CHART_OPTS,
          scales: {
            ...CHART_OPTS.scales,
            y: { beginAtZero: true, grid: { color: 'rgba(16,40,34,0.06)' }, title: { display: true, text: 'رحلات', font: { family: 'IBM Plex Sans Arabic' } } },
            y1: { beginAtZero: true, position: 'right', grid: { display: false }, title: { display: true, text: 'مسافرون', font: { family: 'IBM Plex Sans Arabic' } } },
          },
        }}
      />
    </Box>
  );
};

const MetricChip = ({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: string | number }) => (
  <Grid item xs={6} sm={3}>
    <Box sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
      <Box sx={{ color, display: 'grid', placeItems: 'center', mb: 0.5 }}>{icon}</Box>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{label}</Typography>
    </Box>
  </Grid>
);

const ProgressBar = ({ value, color }: { value: number; color: string }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, width: '100%' }}>
    <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(16,40,34,0.07)', overflow: 'hidden' }}>
      <Box sx={{ height: '100%', width: `${value}%`, borderRadius: 4, bgcolor: color, ml: 'auto' }} />
    </Box>
    <Typography variant="caption" sx={{ fontWeight: 700, color, minWidth: 34 }}>{value}%</Typography>
  </Box>
);

const ReportsSection = () => {
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: '📅 يومي', panel: <div>التقرير اليومي</div> },
    { label: '📆 أسبوعي', panel: <div>التقرير الأسبوعي</div> },
    { label: '📊 شهري', panel: <div>التقرير الشهري</div> },
  ];
  return (
    <SectionCard
      title="مركز التقارير"
      subtitle="تقارير الرحلات والفحص والمعمل والإيرادات"
      action={
        <Stack direction="row" spacing={1}>
          <Button size="small" color="error" variant="contained" startIcon={<PictureAsPdfIcon />} onClick={() => notifySuccess('جارٍ تجهيز PDF')}>PDF</Button>
          <Button size="small" color="success" variant="contained" startIcon={<TableChartIcon />} onClick={() => notifySuccess('جارٍ تجهيز Excel')}>Excel</Button>
        </Stack>
      }
    >
      <PageTabs value={tab} onChange={setTab} tabs={tabs} keepMounted />
    </SectionCard>
  );
};

export default AirportDirectorPage;