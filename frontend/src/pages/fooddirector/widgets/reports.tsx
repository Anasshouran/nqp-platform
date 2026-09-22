import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import { SectionCard, PageTabs } from '../../../components/uikit';
import { notifySuccess } from '../../../utils/toast';
import { STATION_ROWS } from '../data';

const BLUE = '#2f6dd0';

export const ReportsCenter = () => {
  const [tab, setTab] = useState(0);
  const [station, setStation] = useState('all');

  const tabs = [
    { label: '📅 يومي', icon: undefined, panel: <DailyReport station={station} /> },
    { label: '📆 أسبوعي', icon: undefined, panel: <WeeklyReport /> },
    { label: '📊 شهري', icon: undefined, panel: <MonthlyReport /> },
  ];

  return (
    <Box id="reports" sx={{ scrollMarginTop: 96 }}>
      <SectionCard
        title="مركز التقارير"
        subtitle="تقارير تنفيذية تغطي العمليات والمعمل والمالية مع مرشحات وتصدير"
        action={
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <TextField
              select
              size="small"
              label="المرشحات"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">جميع المحطات</MenuItem>
              <MenuItem value="north">الشمالية</MenuItem>
              <MenuItem value="south">الجنوبية</MenuItem>
              <MenuItem value="osif">أوسيف</MenuItem>
            </TextField>
            <TextField size="small" label="النوع" select value="import" sx={{ minWidth: 130 }}>
              <MenuItem value="import">وارد / صادر</MenuItem>
              <MenuItem value="insp">تفتيش وعينات</MenuItem>
              <MenuItem value="fin">مالية</MenuItem>
            </TextField>
            <TextField size="small" label="الفترة من" type="date" InputLabelProps={{ shrink: true }} />
          </Stack>
        }
      >
        <Stack direction="row" spacing={1} sx={{ mb: 2, justifyContent: 'flex-end' }}>
          <Button size="small" variant="contained" color="error" startIcon={<PictureAsPdfIcon />} onClick={() => notifySuccess('جارٍ تجهيز ملف PDF')}>
            PDF
          </Button>
          <Button size="small" variant="contained" color="success" startIcon={<TableChartIcon />} onClick={() => notifySuccess('جارٍ تجهيز ملف Excel')}>
            Excel
          </Button>
        </Stack>
        <PageTabs value={tab} onChange={setTab} tabs={tabs} keepMounted />
      </SectionCard>
    </Box>
  );
};

const DailyReport = ({ station }: { station: string }) => (
  <Grid container spacing={2}>
    <Grid item xs={6} md={3}>
      <ReportMetric label="وارد اليوم" value="96" detail="شحنة" color={BLUE} />
    </Grid>
    <Grid item xs={6} md={3}>
      <ReportMetric label="شركات / صادر" value="46" detail="شحنة" color="#1d7a54" />
    </Grid>
    <Grid item xs={6} md={3}>
      <ReportMetric label="العينات" value="187" detail="مستلمة" color="#7b61c2" />
    </Grid>
    <Grid item xs={6} md={3}>
      <ReportMetric label="الإيرادات" value="25.4M" detail="SDG" color="#a86400" />
    </Grid>
    <Grid item xs={12}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
              <TableCell>المحطة</TableCell>
              <TableCell align="center">وارد</TableCell>
              <TableCell align="center">صادر</TableCell>
              <TableCell align="center">تفتيش</TableCell>
              <TableCell align="center">عينات</TableCell>
              <TableCell align="center">نتائج معمل</TableCell>
              <TableCell align="center">قرارات</TableCell>
              <TableCell align="center">رفض</TableCell>
              <TableCell align="center">قيد المعالجة</TableCell>
              <TableCell align="center">الإيرادات (M)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {STATION_ROWS.map((s) => (
              <TableRow key={s.station} hover>
                <TableCell sx={{ fontWeight: 700 }}>{s.station}</TableCell>
                <TableCell align="center">{Math.round(s.requests * 0.6)}</TableCell>
                <TableCell align="center">{Math.round(s.requests * 0.4)}</TableCell>
                <TableCell align="center">{Math.round(s.requests * 0.65)}</TableCell>
                <TableCell align="center">{Math.round(s.requests * 0.25)}</TableCell>
                <TableCell align="center">{Math.round(s.requests * 0.21)}</TableCell>
                <TableCell align="center">{Math.round(s.requests * 0.48)}</TableCell>
                <TableCell align="center">{s.rejection}%</TableCell>
                <TableCell align="center">{Math.round(s.requests * 0.2)}</TableCell>
                <TableCell align="center">{(s.requests * 0.028).toFixed(1)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
    {station !== 'all' && (
      <Grid item xs={12}>
        <Typography variant="caption" color="text.secondary">المرشح: محطة مختارة — يعرض التقرير المحطة المحددة فقط.</Typography>
      </Grid>
    )}
  </Grid>
);

const WEEK_ROWS = [
  { day: 'السبت', requests: 1080, avg: 1080, delay: 4.2, best: 'الشمالية' },
  { day: 'الأحد', requests: 1204, avg: 1080, delay: 5.1, best: 'الشمالية' },
  { day: 'الاثنين', requests: 1310, avg: 1080, delay: 6.8, best: 'الجنوبية' },
  { day: 'الثلاثاء', requests: 1162, avg: 1080, delay: 4.9, best: 'الشمالية' },
  { day: 'الأربعاء', requests: 1246, avg: 1080, delay: 7.3, best: 'الجنوبية' },
  { day: 'الخميس', requests: 1200, avg: 1080, delay: 5.6, best: 'الشمالية' },
  { day: 'الجمعة', requests: 1210, avg: 1080, delay: 6.1, best: 'الشمالية' },
];

const WeeklyReport = () => (
  <Grid container spacing={2}>
    <Grid item xs={12}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
              <TableCell>اليوم</TableCell>
              <TableCell align="center">إجمالي الطلبات</TableCell>
              <TableCell align="center">المتوسط اليومي</TableCell>
              <TableCell align="center">نسبة التأخير</TableCell>
              <TableCell align="center">أفضل محطة</TableCell>
              <TableCell align="center">أداء المختبر</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {WEEK_ROWS.map((w) => (
              <TableRow key={w.day} hover>
                <TableCell sx={{ fontWeight: 700 }}>{w.day}</TableCell>
                <TableCell align="center">{w.requests}</TableCell>
                <TableCell align="center">{w.avg}</TableCell>
                <TableCell align="center">
                  <Chip label={`${w.delay}%`} size="small" color={w.delay > 7 ? 'error' : w.delay > 5.5 ? 'warning' : 'success'} variant="outlined" sx={{ fontWeight: 700 }} />
                </TableCell>
                <TableCell align="center">{w.best}</TableCell>
                <TableCell align="center">87%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
  </Grid>
);

const MONTH_ROWS = [
  { month: 'يونيو', ops: 3_860, revenue: '124.5M', rejection: 4.2, labSamples: 1_450, prevDelta: -6 },
  { month: 'يوليو', ops: 4_120, revenue: '131.8M', rejection: 3.8, labSamples: 1_680, prevDelta: 8 },
  { month: 'أغسطس (الحالي)', ops: 3_180, revenue: '97.9M', rejection: 3.5, labSamples: 1_120, prevDelta: 12 },
];

const MonthlyReport = () => (
  <Grid container spacing={2}>
    {MONTH_ROWS.map((m) => (
      <Grid item xs={12} md={4} key={m.month}>
        <Box sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.5)', height: '100%' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>{m.month}</Typography>
          <MetricLine label="إجمالي العمليات" value={m.ops.toLocaleString('en-US')} />
          <MetricLine label="الإيرادات" value={`${m.revenue} SDG`} />
          <MetricLine label="نسبة الرفض" value={`${m.rejection}%`} />
          <MetricLine label="عينات المعمل" value={m.labSamples.toLocaleString('en-US')} />
          <MetricLine label="أداء المحطات" value="88%" />
          <Box sx={{ borderTop: '1px dashed rgba(16,40,34,0.12)', mt: 1, pt: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>مقارنة مع الشهر السابق</Typography>
              <Chip label={`${m.prevDelta > 0 ? '+' : ''}${m.prevDelta}%`} size="small" color={m.prevDelta > 0 ? 'success' : 'error'} variant="outlined" sx={{ fontWeight: 700 }} />
            </Stack>
          </Box>
        </Box>
      </Grid>
    ))}
  </Grid>
);

const MetricLine = ({ label, value }: { label: string; value: string }) => (
  <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
  </Stack>
);

const ReportMetric = ({ label, value, detail, color }: { label: string; value: string; detail: string; color: string }) => (
  <Box sx={{ p: 1.5, borderRadius: 3, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.5)', height: '100%' }}>
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.25 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{label}</Typography>
    </Stack>
    <Typography variant="h6" sx={{ fontWeight: 700 }}>{value}</Typography>
    <Typography variant="caption" color="text.secondary">{detail}</Typography>
  </Box>
);