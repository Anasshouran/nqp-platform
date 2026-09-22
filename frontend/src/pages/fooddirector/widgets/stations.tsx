import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { SectionCard } from '../../../components/uikit';
import { notifySuccess } from '../../../utils/toast';
import { ALERTS, STATION_ROWS, STATION_STATUS_META, SLA_STAGES } from '../data';

const BLUE = '#2f6dd0';

/* ============ التنبيهات الذكية ============ */

const SEVERITY_META = {
  critical: { color: '#c63a3a', bg: 'rgba(198,58,58,0.06)', border: 'rgba(198,58,58,0.25)', label: 'حرجة', icon: <NotificationsActiveIcon /> },
  warning: { color: '#a86400', bg: 'rgba(168,100,0,0.06)', border: 'rgba(168,100,0,0.25)', label: 'تحذير', icon: <ErrorOutlineIcon /> },
  attention: { color: '#2f6dd0', bg: 'rgba(47,109,208,0.05)', border: 'rgba(47,109,208,0.2)', label: 'انتباه', icon: <InfoOutlinedIcon /> },
} as const;

export const SmartAlerts = () => (
  <Box id="alerts" sx={{ scrollMarginTop: 96, mb: 3 }}>
    <SectionCard title="🚨 مركز التنبيهات" subtitle="ما الذي يحدث الآن؟ — تنبيهات تستدعي نظر المدير">
      <Grid container spacing={2}>
        {ALERTS.map((a) => {
          const meta = SEVERITY_META[a.severity];
          return (
            <Grid item xs={12} md={4} key={a.title}>
              <Box
                sx={{
                  p: 1.75,
                  borderRadius: 3,
                  height: '100%',
                  border: `1px solid ${meta.border}`,
                  bgcolor: meta.bg,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.75,
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ color: meta.color, display: 'grid', placeItems: 'center' }}>{meta.icon}</Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: meta.color }}>
                    {a.title}
                  </Typography>
                  <Chip label={meta.label} size="small" sx={{ bgcolor: meta.color, color: '#fff', fontSize: 10, height: 20 }} />
                </Stack>
                <Typography variant="body2" color="text.secondary">{a.body}</Typography>
                <Typography
                  variant="caption"
                  onClick={() => notifySuccess('فتح التحليل التفصيلي')}
                  sx={{ fontWeight: 700, color: meta.color, cursor: 'pointer', mt: 'auto', alignSelf: 'flex-start' }}
                >
                  {a.severity === 'critical' ? 'عرض التحليل ←' : 'عرض التفاصيل ←'}
                </Typography>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </SectionCard>
  </Box>
);

/* ============ أداء المحطات ============ */

export const StationPerformance = () => (
  <SectionCard
    title="أداء المحطات"
    subtitle="مقارنة المحطات حسب الطلبات ومعيار SLA ونسبة الرفض"
    action={
      <Chip
        label="عرض التحليل الكامل ←"
        component="a"
        href="#heatmap"
        color="primary"
        variant="outlined"
        sx={{ fontWeight: 700, cursor: 'pointer' }}
      />
    }
  >
    <TableContainer>
      <Table size="small" sx={{ minWidth: 720 }}>
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
            <TableCell>المحطة</TableCell>
            <TableCell align="center">الطلبات</TableCell>
            <TableCell align="center" sx={{ minWidth: 140 }}>SLA</TableCell>
            <TableCell align="center">الرفض</TableCell>
            <TableCell align="center" sx={{ minWidth: 140 }}>الأداء</TableCell>
            <TableCell align="center">الحالة</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {STATION_ROWS.map((s) => {
            const meta = STATION_STATUS_META[s.status];
            return (
              <TableRow key={s.station} hover>
                <TableCell sx={{ fontWeight: 700 }}>{s.station}</TableCell>
                <TableCell align="center">{s.requests}</TableCell>
                <TableCell align="center">
                  <BarCell value={s.sla} color={s.sla >= 90 ? 'success.main' : s.sla >= 80 ? 'warning.main' : 'error.main'} />
                </TableCell>
                <TableCell align="center">
                  <BarCell value={s.rejection} color={s.rejection > 10 ? 'error.main' : s.rejection > 5 ? 'warning.main' : 'success.main'} inverse max={15} />
                </TableCell>
                <TableCell align="center">
                  <BarCell value={s.performance} color="primary.main" />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={meta.label}
                    size="small"
                    color={meta.tone}
                    variant="filled"
                    sx={{ fontWeight: 700, color: '#fff' }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  </SectionCard>
);

const BarCell = ({ value, color, inverse = false, max = 100 }: { value: number; color: string; inverse?: boolean; max?: number }) => {
  const width = Math.min(100, Math.max(4, (value / max) * 100));
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, width: '100%' }}>
      <Box sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(16,40,34,0.07)', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${width}%`, borderRadius: 4, bgcolor: color, ml: 'auto' }} />
      </Box>
      <Typography variant="caption" sx={{ fontWeight: 700, color, minWidth: 34 }}>
        {value}%
      </Typography>
    </Box>
  );
};

/* ============ تحليل نقاط الاختناق SLA ============ */

export const SlaBottleneck = () => (
  <SectionCard title="تحليل نقاط الاختناق SLA" subtitle="أين يحدث التأخير؟ — متوسط زمن المعالجة في كل مرحلة">
    <Stack spacing={1.25}>
      {SLA_STAGES.map((st, i) => (
        <Box key={st.key}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                flexShrink: 0,
                color: st.isBottleneck ? '#c63a3a' : BLUE,
                bgcolor: st.isBottleneck ? 'rgba(198,58,58,0.08)' : 'rgba(47,109,208,0.08)',
                border: st.isBottleneck ? '2px solid rgba(198,58,58,0.4)' : '2px solid rgba(47,109,208,0.14)',
              }}
            >
              {i + 1}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{st.stage}</Typography>
                <Chip
                  label={st.isBottleneck ? `${st.avgHours} ساعة — اختناق` : `${st.avgHours} ساعة`}
                  size="small"
                  color={st.isBottleneck ? 'error' : st.tone}
                  variant={st.isBottleneck ? 'filled' : 'outlined'}
                  sx={{ fontWeight: 700, color: st.isBottleneck ? '#fff' : undefined }}
                />
              </Stack>
              <Box sx={{ mt: 0.5, height: 7, borderRadius: 4, bgcolor: 'rgba(16,40,34,0.07)', overflow: 'hidden' }}>
                <Box
                  sx={{
                    height: '100%',
                    width: `${Math.min(100, (st.avgHours / 48) * 100)}%`,
                    borderRadius: 4,
                    bgcolor: st.isBottleneck ? '#c63a3a' : st.tone === 'success' ? '#1d7a54' : '#a86400',
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">{st.note}</Typography>
            </Box>
          </Stack>
          {i < SLA_STAGES.length - 1 && (
            <Stack alignItems="center" sx={{ py: 0.25, color: 'text.disabled' }}>
              <ArrowDownwardIcon sx={{ fontSize: 16 }} />
            </Stack>
          )}
        </Box>
      ))}
    </Stack>
  </SectionCard>
);

/* ============ خريطة حرارة المحطات (مبسطة) ============ */

export const StationHeatmap = () => (
  <Box id="heatmap" sx={{ scrollMarginTop: 96 }}>
    <SectionCard
      title="خريطة حرارة المحطات"
      subtitle="تصور جغرافي مبسط لأداء المحطات — الضغط على المحطة يعرض التحليل التفصيلي"
      action={
        <Stack direction="row" spacing={1}>
          <Chip size="small" sx={{ bgcolor: '#1d7a54', color: '#fff', fontWeight: 700 }} label="جيد" />
          <Chip size="small" sx={{ bgcolor: '#a86400', color: '#fff', fontWeight: 700 }} label="انتباه" />
          <Chip size="small" sx={{ bgcolor: '#c63a3a', color: '#fff', fontWeight: 700 }} label="حرج" />
        </Stack>
      }
    >
      <Grid container spacing={2} alignItems="stretch">
        {STATION_ROWS.map((s) => {
          const tone = s.status === 'Excellent' ? '#1d7a54' : s.status === 'Attention' ? '#a86400' : '#c63a3a';
          return (
            <Grid item xs={12} sm={6} md={4} key={s.station}>
              <Paper
                elevation={0}
                onClick={() => notifySuccess(`فتح تحليل محطة ${s.station}`)}
                sx={{
                  p: 2,
                  borderRadius: 3.5,
                  height: '100%',
                  cursor: 'pointer',
                  border: '1px solid rgba(16,40,34,0.08)',
                  borderTop: `4px solid ${tone}`,
                  bgcolor: 'rgba(255,255,255,0.7)',
                  transition: 'transform 150ms ease, box-shadow 150ms ease',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{s.station}</Typography>
                  <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: tone }} />
                </Stack>
                <Grid container spacing={1}>
                  <HeatField label="الطلبات" value={String(s.requests)} />
                  <HeatField label="SLA" value={`${s.sla}%`} />
                  <HeatField label="الرفض" value={`${s.rejection}%`} />
                  <HeatField label="الأداء" value={`${s.performance}%`} />
                </Grid>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </SectionCard>
  </Box>
);

const HeatField = ({ label, value }: { label: string; value: string }) => (
  <Grid item xs={6}>
    <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(16,40,34,0.03)', textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700 }}>{label}</Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{value}</Typography>
    </Box>
  </Grid>
);