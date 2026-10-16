import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Divider from '@mui/material/Divider';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import SearchIcon from '@mui/icons-material/Search';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import GppGoodIcon from '@mui/icons-material/GppGood';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BiotechIcon from '@mui/icons-material/Biotech';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import { useState, useEffect } from 'react';
import { C, KpiCard, PageTitle, RiskBadge, StatusBadge, SurfaceCard, RiskGauge, StateBox, ProgressBar } from '../shared';
import { getAirportScreenings } from '../../../api/endpoints/airport';
import type { AirportScreening } from '../../../types/airport';
import { EmptyState } from '../../../components/uikit';

/* =========================== 4. فحص المسافرين =========================== */

export const Screening = () => {
  const [screenings, setScreenings] = useState<AirportScreening[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getAirportScreenings()
      .then((res) => {
        if (mounted) {
          const data = res.data.data as { results?: AirportScreening[] } | AirportScreening[];
          setScreenings(Array.isArray(data) ? data : data.results ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) { setError(true); setLoading(false); }
      });
    return () => { mounted = false; };
  }, []);

  if (error) {
    return (
      <Box>
        <PageTitle title="فحص المسافرين" subtitle="مكتب بوابة الفحص الصحي الأساسي والثانوي — نقطة الوصول للمسافرين" />
        <EmptyState title="تعذر التحميل" description="لم يتمكن النظام من جلب بيانات الفحص. يُرجى المحاولة لاحقًا." />
      </Box>
    );
  }

  return (
    <Box>
      <PageTitle title="فحص المسافرين" subtitle="مكتب بوابة الفحص الصحي الأساسي والثانوي — نقطة الوصول للمسافرين" />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {loading ? (
          <Grid item xs={12}>
            <EmptyState title="قيد الإعداد" description="يتم تحميل بيانات فحص المسافرين من النظام." />
          </Grid>
        ) : (
          <>
            <KpiCard icon={<SearchIcon />} value={String(screenings.length)} label="مفحوصون اليوم" trend="flat" trendLabel="مباشر" />
            <KpiCard icon={<FactCheckIcon />} value={String(screenings.filter((s) => s.status === 'CLEARED').length)} label="فحص أساسي" trend="flat" trendLabel="مباشر" />
            <KpiCard icon={<BiotechIcon />} value={String(screenings.filter((s) => s.status === 'SECONDARY').length)} label="فحص ثانوي" trend="flat" trendLabel="مباشر" />
            <KpiCard icon={<EditNoteIcon />} value={String(screenings.filter((s) => s.risk_level === 'HIGH').length)} label="تقييم طبي" trend="flat" trendLabel="مباشر" />
          </>
        )}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <SurfaceCard
            title="طابور بوابة الفحص"
            subtitle="أحدث المسافرين المعالجين في النقاط — انقر لفتح ملف المسافر"
            action={<TextField size="small" placeholder="مسح جواز السفر / بحث بالاسم" sx={{ width: 240 }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />}
          >
            <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>المسافر</TableCell>
                    <TableCell>الرحلة</TableCell>
                    <TableCell align="center">درجة الحرارة</TableCell>
                    <TableCell align="center">الأعراض</TableCell>
                    <TableCell align="center">المستوى</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading || screenings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 3 }}>لا توجد فحوصات مسجّلة</TableCell>
                    </TableRow>
                  ) : (
                    screenings.map((s) => (
                      <TableRow key={s.id} hover sx={{ cursor: 'pointer' }}>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>{s.traveler_name || s.traveler}</Typography>
                          <Typography variant="caption" color="text.secondary">{s.screened_by_name || ''}</Typography>
                        </TableCell>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{s.flight_number || s.flight || '—'}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700, color: (s.body_temperature ?? 0) >= 37.5 ? C.danger : C.text }}>{s.body_temperature ?? '—'}°</TableCell>
                        <TableCell align="center">{s.symptoms?.length ? s.symptoms.join('، ') : <Typography variant="caption" color="text.disabled">—</Typography>}</TableCell>
                        <TableCell align="center"><Chip label={s.risk_level} size="small" sx={{ fontWeight: 700, bgcolor: s.risk_level === 'HIGH' ? C.dangerBg : s.risk_level === 'MEDIUM' ? C.warningBg : C.successBg, color: s.risk_level === 'HIGH' ? C.danger : s.risk_level === 'MEDIUM' ? C.warning : C.success }} /></TableCell>
                        <TableCell align="center"><StatusBadge status={s.status as any} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </SurfaceCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Stack spacing={3}>
            <SurfaceCard title="نقطة الفحص الحرارية — مباشر" subtitle="كاشف الحرارة عن بعد للمسافرين">
              <Box sx={{ position: 'relative', borderRadius: 3, overflow: 'hidden', height: 200, bg: 'linear-gradient(180deg,#0B5CAD,#0E7490)', display: 'grid', placeItems: 'center' }}>
                <Typography variant="h6" sx={{ color: '#DFF1FF', fontWeight: 700 }}>لوحة الكاميرا الحرارية</Typography>
                <Chip label="مباشر — LIVE" size="small" sx={{ position: 'absolute', top: 10, right: 10, bgcolor: C.dangerBg, color: C.danger, fontWeight: 700, '& > span:first-of-type': { animation: 'pulse 1.4s infinite' } }} />
              </Box>
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>قراءة مدخل البوابة (متوسط)</Typography>
                <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: C.success }}>36.7°</Typography>
                  <ProgressBar value={42} color={C.success} />
                </Box>
              </Box>
            </SurfaceCard>

            <SurfaceCard title="إجراءات سريعة">
              <Stack spacing={1.25}>
                <Button fullWidth variant="contained" startIcon={<PersonAddIcon />} sx={{ justifyContent: 'flex-start', borderRadius: 2.5 }}>تسجيل مسافر جديد</Button>
                <Button fullWidth variant="outlined" startIcon={<ImageSearchIcon />} sx={{ justifyContent: 'flex-start', borderRadius: 2.5 }}>تحويل إلى فحص ثانوي</Button>
                <Button fullWidth variant="outlined" startIcon={<GppGoodIcon />} sx={{ justifyContent: 'flex-start', borderRadius: 2.5 }}>اصدار قرار الإفراج</Button>
              </Stack>
            </SurfaceCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

/* =========================== 5. الإعلان الصحي =========================== */

export const Declaration = () => (
  <Box>
    <PageTitle title="الإعلان الصحي للمسافرين" subtitle="نموذج إعلان الحالة الصحية — بيانات مطلوبة قبل الوصول للمطار" />
    <EmptyState title="قيد الإعداد" description="الإعلانات الصحية المستلمة تُحمل من نظام الفحص عند توفّرها." />
  </Box>
);

/* ========================== 6. تقييم المخاطر ========================== */

export const RiskAssessment = () => (
  <Box>
    <PageTitle title="تقييم مخاطر المسافر" subtitle="نموذج تقييم المخاطر — يُفتح عند تحديد مسافر من قائمة الفحص" />
    <EmptyState title="قيد الإعداد" description="بيانات تقييم المخاطر تُحمل من ملف المسافر المحدد عند توفّرها." />
  </Box>
);

/* ============================= 7. التطعيم ============================= */

export const Vaccination = () => (
  <Box>
    <PageTitle title="التطعيم والتحقق من الشهادات" subtitle="التحقق من التطعيم الإلزامي (الحمى الصفراء وغيرها) للمسافرين القادمين" />
    <EmptyState title="قيد الإعداد" description="سجلات التطعيم تُحمل من نظام السجلات الطبية عند الربط معها." />
  </Box>
);
