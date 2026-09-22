import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import BiotechIcon from '@mui/icons-material/Biotech';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { DataTable, StatusChip, ExportButton, NotificationPanel } from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <MonitorHeartIcon fontSize="small" /> },
  { id: 'trends', label: 'الاتجاهات', icon: <TrendingUpIcon fontSize="small" /> },
  { id: 'cases', label: 'الحالات', icon: <PersonSearchIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <WarningAmberIcon fontSize="small" /> },
] as const;

interface CaseRow {
  id: string;
  reference: string;
  port: string;
  condition: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  officer: string;
  date: string;
}

const demoCases: CaseRow[] = [
  { id: '1', reference: 'QC-2026-1041', port: 'مطار الخرطوم', condition: 'حمى نزفية (مشتبه)', severity: 'CRITICAL', officer: 'د. سارة النور', date: '2026-08-06' },
  { id: '2', reference: 'QC-2026-1040', port: 'ميناء بورتسودان', condition: 'كوليرا (مشتبه)', severity: 'HIGH', officer: 'د. محمد عثمان', date: '2026-08-06' },
  { id: '3', reference: 'QC-2026-1039', port: 'معبر القلابات', condition: 'ملاريا', severity: 'MEDIUM', officer: 'د. هالة إبراهيم', date: '2026-08-05' },
  { id: '4', reference: 'QC-2026-1038', port: 'مطار بورتسودان', condition: 'فحص روتيني', severity: 'LOW', officer: 'د. سارة النور', date: '2026-08-05' },
  { id: '5', reference: 'QC-2026-1037', port: 'ميناء بورتسودان', condition: 'حمى الضنك', severity: 'MEDIUM', officer: 'د. علي حسب الله', date: '2026-08-05' },
  { id: '6', reference: 'QC-2026-1036', port: 'معبر عرقي', condition: 'إنفلونزا', severity: 'LOW', officer: 'د. هالة إبراهيم', date: '2026-08-04' },
];

const severityMap: Record<CaseRow['severity'], { label: string; tone: 'error' | 'warning' | 'info' | 'neutral' }> = {
  CRITICAL: { label: 'حرجة', tone: 'error' },
  HIGH: { label: 'عالية', tone: 'warning' },
  MEDIUM: { label: 'متوسطة', tone: 'info' },
  LOW: { label: 'منخفضة', tone: 'neutral' },
};

const weekLabels = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const screenings = [142, 168, 155, 209, 231, 188, 175];
const confirmed = [8, 11, 9, 15, 18, 12, 10];

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { rtl: true, labels: { font: { family: 'IBM Plex Sans Arabic' }, boxWidth: 14, color: '#5b6f68' } },
    tooltip: { rtl: true, backgroundColor: '#14312a', titleFont: { family: 'IBM Plex Sans Arabic' }, bodyFont: { family: 'IBM Plex Sans Arabic' } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'IBM Plex Sans Arabic' }, color: '#5b6f68' } },
    y: { beginAtZero: true, ticks: { precision: 0, font: { family: 'IBM Plex Sans Arabic' }, color: '#5b6f68' }, grid: { color: 'rgba(16,40,34,0.06)' } },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '64%',
  plugins: {
    legend: { position: 'bottom' as const, rtl: true, labels: { font: { family: 'IBM Plex Sans Arabic' }, boxWidth: 12, padding: 12, color: '#5b6f68' } },
    tooltip: { rtl: true, backgroundColor: '#14312a', bodyFont: { family: 'IBM Plex Sans Arabic' } },
  },
};

const HealthDashboardPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[]);

  const filtered = useMemo(
    () =>
      demoCases.filter(
        (c) =>
          !search ||
          c.reference.includes(search) ||
          c.port.includes(search) ||
          c.officer.includes(search),
      ),
    [search],
  );

  const kpis = [
    { icon: <WarningAmberIcon />, value: 3, label: 'حالات حرجة/عالية', accent: 'error.main', trend: { label: 'يتطلب تدخلاً الآن', positive: false } },
    { icon: <MonitorHeartIcon />, value: '4.2س', label: 'متوسط زمن النتيجة', accent: 'warning.main', trend: { label: 'أسرع من المعيار', positive: true } },
    { icon: <PersonSearchIcon />, value: 1284, label: 'فحوصات هذا الأسبوع', accent: 'primary.main', trend: { label: '▲ 12% (مؤشر سبق)', positive: true } },
    { icon: <LocalHospitalIcon />, value: 42, label: 'حالات نشطة', accent: 'info.main', trend: { label: '▼ 4%', positive: true } },
    { icon: <BiotechIcon />, value: '98%', label: 'جاهزية المنافذ', accent: 'success.main', trend: { label: 'جاهزية لباقة', positive: true } },
  ];

  return (
    <Box>
      <DashboardHero
        eyebrow="Health Command Center"
        title="لوحة الرعاية الصحية"
        subtitle="نظرة موحّدة على المراقبة الوبائية، الفحوصات، الحالات النشطة، وتنبيهات النظام"
        gradient="emerald"
        avatarLabel="ل"
        action={<ExportButton filename="health-overview" headers={['المرجع', 'المنفذ', 'الحالة', 'الخطورة']} rows={demoCases.map((c) => [c.reference, c.port, c.condition, severityMap[c.severity].label])} />}
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
          {/* KPI layer */}
          <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <Grid container spacing={1.5}>
              {kpis.map((k) => (
                <Grid item xs={12} sm={6} md={2.4} key={k.label}>
                  <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} trend={k.trend} />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Chart layer */}
          <Box component="section" ref={register('trends')} data-section="trends" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={8}>
                <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        حركة الفحوصات والحالات المؤكدة (آخر 7 أيام)
                      </Typography>
                      <TrendingUpIcon color="primary" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      الفحوصات (مؤشر سبق — أين ترتفع) مقابل الحالات المؤكدة (المحصّلة)؛ القراءة من خط اللحاق قبل الذروة
                    </Typography>
                    <Box sx={{ height: 300, mt: 2 }}>
                      <Line
                        data={{
                          labels: weekLabels,
                          datasets: [
                            {
                              label: 'الفحوصات',
                              data: screenings,
                              borderColor: '#0c7f6a',
                              backgroundColor: 'rgba(12,127,106,0.14)',
                              fill: true,
                              tension: 0.4,
                              pointRadius: 3,
                              pointHoverRadius: 6,
                            },
                            {
                              label: 'حالات مؤكدة',
                              data: confirmed,
                              borderColor: '#c63a3a',
                              backgroundColor: 'transparent',
                              borderDash: [6, 4],
                              fill: false,
                              tension: 0.4,
                              pointRadius: 3,
                              pointHoverRadius: 6,
                            },
                          ],
                        }}
                        options={lineOptions}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} lg={4}>
                <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      توزيع الحالات حسب المنفذ
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      أين تتركز العبء الصحي الآن
                    </Typography>
                    <Box sx={{ height: 260, mt: 2, display: 'grid', placeItems: 'center' }}>
                      <Doughnut
                        data={{
                          labels: ['مطار الخرطوم', 'ميناء بورتسودان', 'معبر القلابات', 'مطار بورتسودان'],
                          datasets: [
                            {
                              data: [38, 34, 17, 11],
                              backgroundColor: ['#0c7f6a', '#a98a2e', '#2f6dd0', '#8a5a00'],
                              borderColor: '#fff',
                              borderWidth: 3,
                            },
                          ],
                        }}
                        options={doughnutOptions}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          {/* Action layer: table + notifications */}
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Box component="section" ref={register('cases')} data-section="cases" sx={{ scrollMarginTop: '80px' }}>
                <DataTable<CaseRow>
                  columns={[
                    { key: 'reference', label: 'المرجع', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.reference}</Typography> },
                    { key: 'port', label: 'المنفذ', render: (r) => <Chip label={r.port} size="small" variant="outlined" color="primary" /> },
                    { key: 'condition', label: 'الحالة الصحية' },
                    { key: 'severity', label: 'الخطورة', render: (r) => <StatusChip label={severityMap[r.severity].label} tone={severityMap[r.severity].tone} /> },
                    { key: 'officer', label: 'المسؤول', hideOnMobile: true },
                    { key: 'date', label: 'التاريخ', hideOnMobile: true },
                  ]}
                  rows={filtered}
                  rowKey={(r) => r.id}
                  count={filtered.length}
                  page={page}
                  rowsPerPage={10}
                  onPageChange={setPage}
                  searchInput={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="بحث بالمرجع أو المنفذ أو المسؤول..."
                  title="حالات اليوم"
                  subtitle={`${filtered.length} حالة`}
                  emptyTitle="لا توجد حالات"
                  emptyDescription="لم يتم العثور على حالات تطابق البحث"
                  actions={(r) => <Chip label={severityMap[r.severity].tone === 'error' ? 'تدخل فوري' : 'متابعة'} size="small" color={severityMap[r.severity].tone === 'error' ? 'error' : 'primary'} variant={severityMap[r.severity].tone === 'error' ? 'filled' : 'outlined'} />}
                  actionsLabel="الإجراء"
                />
              </Box>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px', position: { lg: 'sticky' }, top: 96 }}>
                <NotificationPanel height={460} subtitle="تنبيهات المراقبة والإرسال" />
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default HealthDashboardPage;
