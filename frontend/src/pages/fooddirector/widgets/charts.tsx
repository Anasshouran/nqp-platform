import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Chip from '@mui/material/Chip';
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
import { SectionCard } from '../../../components/uikit';
import { notifySuccess } from '../../../utils/toast';
import { OPERATIONS_LABELS, OPERATIONS_SERIES, REVENUE_BY_STATION, REVENUE_BY_SERVICE, REVENUE_TREND, LAB_METRICS, LAB_TESTS, REJECTION_BARS, REJECTION_BY, REJECTION_RANK } from '../data';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, ChartTooltip, Legend, Filler);

const BLUE = '#2f6dd0';
const TEAL = '#12a585';
const NAVY = '#14312a';
const AMBER = '#a86400';
const RED = '#c63a3a';
const LIGHT_BLUE = 'rgba(47,109,208,0.12)';

const CHART_BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { font: { family: 'IBM Plex Sans Arabic', size: 12 }, boxWidth: 14, usePointStyle: true } },
    tooltip: { rtl: true, textDirection: 'rtl' as const, bodyFont: { family: 'IBM Plex Sans Arabic' }, titleFont: { family: 'IBM Plex Sans Arabic' } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'IBM Plex Sans Arabic' } } },
    y: { beginAtZero: true, grid: { color: 'rgba(16,40,34,0.06)' }, ticks: { font: { family: 'IBM Plex Sans Arabic' } } },
  },
};

/* ============ أداء العمليات — خط تنفيذي ============ */

export const ExecutiveChart = () => {
  const [period, setPeriod] = useState<'DAY' | 'WEEK' | 'MONTH'>('DAY');
  const [compare, setCompare] = useState(false);

  const labels = OPERATIONS_LABELS[period];
  const s = OPERATIONS_SERIES[period];

  const data = {
    labels,
    datasets: [
      { label: 'الطلبات', data: s.requests, borderColor: BLUE, backgroundColor: LIGHT_BLUE, fill: true, tension: 0.35, borderWidth: 2, pointRadius: 3 },
      { label: 'التفتيش', data: s.inspections, borderColor: NAVY, backgroundColor: 'rgba(20,49,42,0.08)', fill: true, tension: 0.35, borderWidth: 2, pointRadius: 3 },
      { label: 'العينات', data: s.samples, borderColor: TEAL, backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, pointRadius: 3 },
      { label: 'نتائج المختبر', data: s.labResults, borderColor: AMBER, backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, pointRadius: 3, borderDash: [5, 4] },
      { label: 'القرارات', data: s.decisions, borderColor: RED, backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, pointRadius: 3, borderDash: [2, 4] },
    ],
  };

  return (
    <SectionCard
      title="أداء العمليات"
      subtitle="مؤشرات تدفق العمل من التسجيل حتى القرار — قابلة للمقارنة مع الفترة السابقة"
      action={
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={period}
            onChange={(_, v: 'DAY' | 'WEEK' | 'MONTH') => v && setPeriod(v)}
            sx={{ '& .MuiToggleButton-root': { fontWeight: 700, borderRadius: 2 } }}
          >
            <ToggleButton value="DAY">يومي</ToggleButton>
            <ToggleButton value="WEEK">أسبوعي</ToggleButton>
            <ToggleButton value="MONTH">شهري</ToggleButton>
          </ToggleButtonGroup>
          <Chip
            label="مقارنة مع الفترة السابقة"
            onClick={() => setCompare((c) => !c)}
            color={compare ? 'primary' : 'default'}
            variant={compare ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700 }}
          />
        </Stack>
      }
    >
      <Box sx={{ height: 320 }}>
        <Line
          data={data}
          options={{
            ...CHART_BASE_OPTIONS,
            plugins: {
              ...CHART_BASE_OPTIONS.plugins,
              legend: { ...CHART_BASE_OPTIONS.plugins.legend, display: true },
            },
          }}
        />
      </Box>
      {compare && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          المقارنة مفعلة — يتم عرض خطوط الفترة السابقة للمقارنة (نموذج توضيحي).
        </Typography>
      )}
    </SectionCard>
  );
};

/* ============ أداء المختبر ============ */

export const LaboratoryPerformance = () => (
  <SectionCard title="أداء المختبر" subtitle="جاهزية المعمل المرجعي وجدول زمن التحاليل" sx={{ height: '100%' }}>
    <Grid container spacing={1.5}>
      {LAB_METRICS.map((m) => (
        <Grid item xs={6} sm={4} key={m.label}>
          <Box sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.5)' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>{m.label}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: BLUE }}>{m.value}</Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
    <Stack spacing={1.5} sx={{ mt: 2 }}>
      {LAB_TESTS.map((t) => (
        <Box key={t.category}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{t.category}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: t.tone }}>{t.rate}%</Typography>
          </Stack>
          <Box sx={{ mt: 0.5, height: 8, borderRadius: 4, bgcolor: 'rgba(16,40,34,0.07)' }}>
            <Box sx={{ height: '100%', width: `${t.rate}%`, borderRadius: 4, bgcolor: t.tone }} />
          </Box>
        </Box>
      ))}
    </Stack>
  </SectionCard>
);

/* ============ تحليل الرفض ============ */

const REJECTION_LABELS: Record<string, string[]> = {
  category: ['حبوب', 'ألبان', 'لحوم', 'زيوت', 'معلبات'],
  product: ['أرز', 'قمح', 'جلوكوز', 'سمسم', 'زيت نباتي'],
  origin: ['الهند', 'الصين', 'أوكرانيا', 'روسيا', 'البرازيل'],
  supplier: ['المتحدة', 'النيل', 'البركة', 'الأهلية', 'سلام'],
  station: ['أوسيف', 'الجنوبية', 'الشمالية', 'بورتسودان', 'المطار'],
  reason: ['أفلاتوكسين', 'فساد', 'تلوث ميكروبي', 'رطوبة', 'تغليف'],
};

export const RejectionAnalytics = () => {
  const [by, setBy] = useState('category');
  const labels = REJECTION_LABELS[by] ?? REJECTION_LABELS.category;

  const barData = {
    labels,
    datasets: [{ label: 'نسبة الرفض %', data: REJECTION_BARS[by] ?? REJECTION_BARS.category, backgroundColor: 'rgba(198,58,58,0.75)', borderRadius: 6 }],
  };

  const donutData = {
    labels,
    datasets: [{ data: REJECTION_BARS[by] ?? REJECTION_BARS.category, backgroundColor: [RED, AMBER, TEAL, BLUE, NAVY], borderWidth: 2, borderColor: '#fff' }],
  };

  return (
    <SectionCard
      title="تحليل الرفض"
      subtitle="تصنيف أسباب الرفض حسب الفئة / المنتج / المنشأ / المورد / المحطة"
      action={
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap' }}>
          {REJECTION_BY.map((r) => (
            <Chip key={r.key} label={r.label} size="small" onClick={() => setBy(r.key)} sx={{ fontWeight: 700 }} color={by === r.key ? 'error' : 'default'} variant={by === r.key ? 'filled' : 'outlined'} />
          ))}
        </Stack>
      }
    >
      <Grid container spacing={3} sx={{ mb: 2 }}>
        <Grid item xs={12} md={8}>
          <Box sx={{ height: 260 }}>
            <Bar
              data={barData}
              options={{ ...CHART_BASE_OPTIONS, plugins: { ...CHART_BASE_OPTIONS.plugins, legend: { display: false } } }}
            />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ height: 260, display: 'grid', placeItems: 'center' }}>
            <Doughnut
              data={donutData}
              options={{ cutout: '68%', plugins: { legend: { position: 'bottom', labels: { font: { family: 'IBM Plex Sans Arabic', size: 11 }, boxWidth: 10, usePointStyle: true } } } }}
            />
          </Box>
        </Grid>
      </Grid>
      <Stack spacing={1}>
        {REJECTION_RANK.map((r, i) => (
          <Stack
            key={r.name}
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{
              p: 1.25,
              borderRadius: 2.5,
              border: '1px solid rgba(198,58,58,0.12)',
              bgcolor: 'rgba(198,58,58,0.03)',
            }}
          >
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: 2,
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                color: i === 0 ? 'error.main' : 'text.secondary',
                bgcolor: 'rgba(198,58,58,0.08)',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{r.name}</Typography>
              <Typography variant="caption" color="text.secondary">السبب: {r.cause} · {r.by}</Typography>
            </Box>
            <Chip label={`${r.rate}%`} size="small" color="error" variant="outlined" sx={{ fontWeight: 700 }} />
          </Stack>
        ))}
      </Stack>
    </SectionCard>
  );
};

/* ============ الإيرادات ============ */

export const RevenueAnalytics = () => {
  const labels = ['الشمالية', 'الجنوبية', 'أوسيف', 'بورتسودان', 'مطار الخرطوم'];
  const trendLabels = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

  const byStation = {
    labels,
    datasets: [{ label: 'الإيرادات (مليون SDG)', data: REVENUE_BY_STATION.map((r) => r.value), backgroundColor: BLUE, borderRadius: 8 }],
  };

  const trend = {
    labels: trendLabels,
    datasets: [
      { label: 'هذه الفترة', data: REVENUE_TREND.daily, borderColor: BLUE, backgroundColor: 'rgba(47,109,208,0.12)', fill: true, tension: 0.35, borderWidth: 2 },
      { label: 'الفترة السابقة', data: [16.2, 18.1, 17.4, 20.2, 19.5, 22.3], borderColor: AMBER, backgroundColor: 'transparent', tension: 0.35, borderWidth: 2, borderDash: [5, 4] },
    ],
  };

  return (
    <SectionCard
      title="تحليلات الإيرادات"
      subtitle="الإيرادات المحصلة بالجنيه السوداني (SDG) وتوزيعها على المحطات والخدمات"
      action={
        <Stack direction="row" spacing={1}>
          <ButtonOutlined label="يومي" active />
          <ButtonOutlined label="أسبوعي" />
          <ButtonOutlined label="شهري" />
        </Stack>
      }
    >
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>الإيرادات حسب المحطة</Typography>
          <Box sx={{ height: 220 }}>
            <Bar data={byStation} options={{ ...CHART_BASE_OPTIONS, plugins: { ...CHART_BASE_OPTIONS.plugins, legend: { display: false } } }} />
          </Box>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>الإيرادات حسب الخدمة</Typography>
          <Box sx={{ height: 220, display: 'grid', placeItems: 'center' }}>
            <Doughnut
              data={{
                labels: REVENUE_BY_SERVICE.map((s) => s.service),
                datasets: [{ data: REVENUE_BY_SERVICE.map((s) => s.value), backgroundColor: [BLUE, TEAL, AMBER, NAVY], borderWidth: 2, borderColor: '#fff' }],
              }}
              options={{ cutout: '66%', plugins: { legend: { position: 'bottom', labels: { font: { family: 'IBM Plex Sans Arabic', size: 11 }, boxWidth: 10, usePointStyle: true } } } }}
            />
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>منحنى الإيرادات — مقارنة مع الفترة السابقة</Typography>
          <Box sx={{ height: 220 }}>
            <Line data={trend} options={{ ...CHART_BASE_OPTIONS, plugins: { ...CHART_BASE_OPTIONS.plugins, legend: { position: 'top' } } }} />
          </Box>
        </Grid>
      </Grid>
    </SectionCard>
  );
};

const ButtonOutlined = ({ label, active }: { label: string; active?: boolean }) => (
  <Chip label={label} size="small" onClick={() => notifySuccess(`عرض الإيرادات ${label}`)} color={active ? 'secondary' : 'default'} variant={active ? 'filled' : 'outlined'} sx={{ fontWeight: 700 }} />
);