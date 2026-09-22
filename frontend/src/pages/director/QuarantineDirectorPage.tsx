import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AnchorIcon from '@mui/icons-material/Anchor';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  SectionCard,
  DataTable,
  StatusChip,
  ExportButton,
  NotificationPanel,
} from '../../components/uikit';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { formatDateTime } from '../../utils/formatters';
import { notifySuccess } from '../../utils/toast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, ChartTooltip, Legend, Filler);

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <MonitorHeartIcon fontSize="small" /> },
  { id: 'trends', label: 'الاتجاهات', icon: <TrendingUpIcon fontSize="small" /> },
  { id: 'approvals', label: 'قرارات اليوم', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'ports', label: 'أولويات المنافذ', icon: <AnchorIcon fontSize="small" /> },
] as const;

type RiskLevel = 'HIGH' | 'WATCH' | 'NORMAL';

interface PortRow {
  id: string;
  name: string;
  sector: string;
  cases: number;
  screenings: number;
  risk: RiskLevel;
  trend: string;
}

const portRows: PortRow[] = [
  { id: '1', name: 'ميناء بورتسودان', sector: 'البحر الأحمر', cases: 18, screenings: 421, risk: 'HIGH', trend: '▲ +40%' },
  { id: '2', name: 'مطار الخرطوم', sector: 'الخرطوم', cases: 9, screenings: 388, risk: 'WATCH', trend: '▲ +15%' },
  { id: '3', name: 'معبر القلابات', sector: 'كسلا', cases: 6, screenings: 214, risk: 'WATCH', trend: '— ثابت' },
  { id: '4', name: 'معبر عرقي', sector: 'كسلا', cases: 4, screenings: 187, risk: 'NORMAL', trend: '▼ -8%' },
  { id: '5', name: 'مطار بورتسودان', sector: 'البحر الأحمر', cases: 3, screenings: 142, risk: 'NORMAL', trend: '▼ -5%' },
];

const riskMeta: Record<RiskLevel, { label: string; tone: 'error' | 'warning' | 'neutral' }> = {
  HIGH: { label: 'انتباه عالٍ', tone: 'error' },
  WATCH: { label: 'مراقبة', tone: 'warning' },
  NORMAL: { label: 'مستقر', tone: 'neutral' },
};

interface ApprovalItem {
  id: string;
  type: string;
  ref: string;
  requester: string;
  time: string;
}

const approvalQueue: ApprovalItem[] = [
  { id: '1', type: 'شهادة تحليل', ref: 'FCL-9F2A', requester: 'معمل بورتسودان', time: '2026-08-06T09:12:00Z' },
  { id: '2', type: 'اعتماد نتائج', ref: 'QC-2026-1041', requester: 'مطار الخرطوم', time: '2026-08-06T08:45:00Z' },
  { id: '3', type: 'إفراج شحنة', ref: 'FS-2026-3321', requester: 'ميناء بورتسودان', time: '2026-08-06T08:20:00Z' },
  { id: '4', type: 'تقرير أسبوعي', ref: 'RPT-014', requester: 'إدارة قطاع البحر الأحمر', time: '2026-08-06T07:55:00Z' },
];

const weekLabels = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const screenings = [1250, 1320, 1410, 1380, 1490, 1550, 1510];
const confirmed = [38, 41, 45, 43, 52, 57, 54];

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

const QuarantineDirectorPage = () => {
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState<ApprovalItem[]>(approvalQueue);
  const { active: activeSection, register, scrollTo } = useCommandSections(
    SECTIONS as unknown as CommandSectionDef[],
    [],
  );

  const highRiskCount = useMemo(() => portRows.filter((p) => p.risk === 'HIGH').length, []);

  const resolve = (id: string, approved: boolean) => {
    setQueue((prev) => prev.filter((i) => i.id !== id));
    notifySuccess(approved ? 'تمت الموافقة' : 'تم الرفض');
  };

  const kpis = [
    { icon: <WarningAmberIcon />, value: 3, label: 'حالات حرجة/عالية', accent: 'error.main', trend: { label: 'فوري — انتباه', positive: false } },
    { icon: <FactCheckIcon />, value: queue.length, label: 'قرارات بانتظار الاعتماد', accent: 'warning.main', trend: { label: 'أولوية توقيع اليوم', positive: true } },
    { icon: <MonitorHeartIcon />, value: '4.2س', label: 'متوسط زمن النتيجة', accent: 'primary.main', trend: { label: 'داخل المعيار', positive: true } },
    { icon: <AnchorIcon />, value: highRiskCount, label: 'منافذ في حالة انتباه', accent: 'info.main', trend: { label: 'تحتاج مراجعة', positive: false } },
    { icon: <PersonSearchIcon />, value: 9870, label: 'فحوصات الأسبوع', accent: 'success.main', trend: { label: '▲ 12%', positive: true } },
  ];

  return (
    <Box>
      <DashboardHero
        eyebrow="Executive Command"
        title="لوحة مدير الحجر الصحي"
        subtitle="الوضع الوطني، أولويات الموارد، وقرارات اليوم — نظرة قيادية قابلة للدفاع أمام الوزارة"
        gradient="emerald"
        avatarLabel="ل"
        action={
          <Stack direction="row" spacing={1.5}>
            <ExportButton
              filename="director-brief"
              headers={['المنفذ', 'القطاع', 'الحالات', 'الفحوصات', 'مستوى الانتباه']}
              rows={portRows.map((p) => [p.name, p.sector, p.cases, p.screenings, riskMeta[p.risk].label])}
            />
          </Stack>
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
          </Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{highRiskCount} منافذ عالية</Box>,
        ]}
      />

      {/* ===== التخطيط الرئيسي: قائمة أقسام + محتوى ===== */}
      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={activeSection}
            onNavigate={scrollTo}
            accent="primary.main"
            label="أقسام القيادة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          <Grid container ref={register('overview')} data-section="overview" spacing={1.5} sx={{ mb: 3, scrollMarginTop: '80px' }}>
            {kpis.map((k) => (
              <Grid item xs={12} sm={6} md={2.4} key={k.label}>
                <KpiCard icon={k.icon} value={k.value} label={k.label} accent={k.accent} trend={k.trend} />
              </Grid>
            ))}
          </Grid>

          <Grid container ref={register('trends')} data-section="trends" spacing={3} sx={{ mb: 3, scrollMarginTop: '80px' }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: '100%', border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  المنحنى الوطني
                </Typography>
                <TrendingUpIcon color="primary" />
              </Stack>
              <Typography variant="caption" color="text.secondary">
                الفحوصات (مؤشر سبق) مقابل الحالات المؤكدة (المحصّلة) — كل من المنافذ والأقاليم
              </Typography>
              <Box sx={{ height: 280, mt: 2 }}>
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
                الحالات حسب القطاع
              </Typography>
              <Typography variant="caption" color="text.secondary">
                أين يتركز العبء الوبائي الآن
              </Typography>
              <Box sx={{ height: 240, mt: 2, display: 'grid', placeItems: 'center' }}>
                <Doughnut
                  data={{
                    labels: ['البحر الأحمر', 'الخرطوم', 'كسلا'],
                    datasets: [
                      {
                        data: [52, 31, 17],
                        backgroundColor: ['#0c7f6a', '#a98a2e', '#2f6dd0'],
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

      <Grid container ref={register('approvals')} data-section="approvals" spacing={3} sx={{ mb: 3, scrollMarginTop: '80px' }}>
        <Grid item xs={12}>
          <SectionCard
            title="قرارات بانتظار اعتمادك"
            subtitle={`${queue.length} عنصر يحتاج توقيعك اليوم`}
            action={<Chip label="أولوية عالية" size="small" color="error" variant="outlined" />}
          >
            <Stack spacing={1.25}>
              {queue.length === 0 ? (
                <Typography color="success.main" sx={{ fontWeight: 700 }}>
                  اكتمل — لا توجد قرارات معلقة. ✓
                </Typography>
              ) : (
                queue.map((item) => (
                  <Stack
                    key={item.id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      border: '1px solid rgba(16,40,34,0.07)',
                      bgcolor: 'rgba(255,255,255,0.5)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box
                      sx={{
                        width: 38,
                        height: 38,
                        borderRadius: 2.5,
                        display: 'grid',
                        placeItems: 'center',
                        color: 'primary.main',
                        bgcolor: 'primary.light',
                        flexShrink: 0,
                      }}
                    >
                      <FactCheckIcon fontSize="small" />
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Chip label={item.type} size="small" color="primary" variant="outlined" />
                        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                          {item.ref}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {item.requester} · {formatDateTime(item.time)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="اعتماد">
                        <IconButton aria-label="تأكيد" size="small" color="success" onClick={() => resolve(item.id, true)}>
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="رفض">
                        <IconButton aria-label="إغلاق" size="small" color="error" onClick={() => resolve(item.id, false)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                ))
              )}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>

      <Grid container ref={register('ports')} data-section="ports" spacing={3} sx={{ scrollMarginTop: '80px' }}>
        <Grid item xs={12} lg={8}>
          <DataTable<PortRow>
            columns={[
              { key: 'name', label: 'المنفذ', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.name}</Typography> },
              { key: 'sector', label: 'القطاع', hideOnMobile: true },
              { key: 'cases', label: 'حالات نشطة', align: 'center' },
              { key: 'screenings', label: 'فحوصات الأسبوع', align: 'center', hideOnMobile: true },
              { key: 'risk', label: 'مستوى الانتباه', render: (r) => <StatusChip label={riskMeta[r.risk].label} tone={riskMeta[r.risk].tone} /> },
              { key: 'trend', label: 'الاتجاه', render: (r) => <Typography variant="body2" sx={{ fontWeight: 700, color: r.trend.startsWith('▲') ? 'error.main' : r.trend.startsWith('▼') ? 'success.main' : 'text.secondary' }}>{r.trend}</Typography> },
            ]}
            rows={portRows}
            rowKey={(r) => r.id}
            count={portRows.length}
            page={page}
            rowsPerPage={10}
            onPageChange={setPage}
            title="أولويات المنافذ — أين توجّه الموارد"
            subtitle="مرتبة حسب العبء والاتجاه"
            emptyTitle="لا توجد منافذ"
            emptyDescription="لا توجد بيانات مطابقة"
            actions={(r) => <Chip label={r.risk === 'HIGH' ? 'مراجعة فورية' : 'خطة متابعة'} size="small" color={r.risk === 'HIGH' ? 'error' : 'primary'} variant={r.risk === 'HIGH' ? 'filled' : 'outlined'} />}
            actionsLabel="الإجراء"
          />
        </Grid>
        <Grid item xs={12} lg={4}>
          <Box sx={{ position: { lg: 'sticky' }, top: 96 }}>
            <NotificationPanel height={500} subtitle="تنبيهات وطنية وإرسال" />
          </Box>
        </Grid>
        </Grid>
      </Grid>
      </Grid>
    </Box>
  );
};

export default QuarantineDirectorPage;
