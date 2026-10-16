import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useOfflineSync } from '../../../hooks/useOfflineSync';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import GroupsIcon from '@mui/icons-material/Groups';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import BiotechIcon from '@mui/icons-material/Biotech';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import * as React from 'react';
import { C, KpiCard, PageTitle, RiskBadge, StatusBadge, SurfaceCard, RiskGauge, OfflinePill, StateBox } from '../shared';
import { getAirportDashboard } from '../../../api/endpoints/airport';
import type { AirportDashboard as AirportDashboardData } from '../../../types/airport';
import { EmptyState } from '../../../components/uikit';

export interface Props {
  nav: (id: string) => void;
}

/* ============================= 1. مركز القيادة ============================= */

export const Dashboard = ({ nav }: Props) => {
  const [live, setLive] = React.useState<AirportDashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [offline, setOffline] = React.useState(false);
  const { status } = useOfflineSync();
  const offlineConn = status === 'OFFLINE';
  const pillState = offlineConn ? 'OFFLINE' : status === 'SYNC_PENDING' ? 'SYNCING' : 'ONLINE';

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    getAirportDashboard()
      .then((res) => {
        if (mounted) { setLive(res.data.data); setLoading(false); }
      })
      .catch(() => {
        if (mounted) { setOffline(true); setLoading(false); }
      });
    return () => { mounted = false; };
  }, []);

  const k = live?.kpis;
  const kpis = [
    { icon: <FlightTakeoffIcon />, value: k ? String(k.flights_today) : '—', label: 'رحلات اليوم', trend: 'flat' as const, trendLabel: 'مباشر' },
    { icon: <GroupsIcon />, value: k ? k.passengers_today.toLocaleString('ar-EG') : '—', label: 'مسافرون اليوم', trend: 'flat' as const, trendLabel: 'مباشر' },
    { icon: <ManageSearchIcon />, value: k ? String(k.screened_today) : '—', label: 'فُحصوا اليوم', trend: 'flat' as const, trendLabel: 'مباشر' },
    { icon: <FactCheckIcon />, value: k ? String(k.pending_screenings) : '—', label: 'فحوصات معلّقة', status: k && k.pending_screenings > 0 ? 'بانتظار الإجراء' : undefined, statusColor: C.warning },
    { icon: <WarningAmberIcon />, value: k ? String(k.suspected_cases) : '—', label: 'حالات مشتبهة', status: k && k.suspected_cases > 0 ? 'يرتفع' : undefined, statusColor: C.danger },
    { icon: <HealthAndSafetyOutlinedIcon />, value: k ? String(k.clinic_referrals) : '—', label: 'إحالات العيادة', status: k && k.clinic_referrals > 0 ? 'نشطة' : undefined, statusColor: C.primary },
    { icon: <CheckCircleIcon />, value: k ? String(k.completed_today) : '—', label: 'اكتملت اليوم', trend: 'up' as const, trendLabel: 'مباشر' },
    { icon: <BiotechIcon />, value: k ? String(k.vaccinations) : '—', label: 'تطعيمات', trend: 'flat' as const, trendLabel: 'مباشر' },
  ];
  const upcoming = live?.upcoming_flights ?? [];
  const suspected = live?.suspected ?? [];
  const alerts = live?.alerts ?? [];

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ mb: 2, gap: 1 }}>
        <PageTitle title="مركز قيادة صحة المطارات" subtitle={offline ? 'بيانات مباشرة غير متاحة — تعذر الاتصال بالخادم' : loading ? 'جارٍ التحميل…' : 'مطار بورتسودان الدولي — بيانات مباشرة من النظام'} />
        <OfflinePill state={pillState} />
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {loading ? (
          <Grid item xs={12}>
            <EmptyState title="قيد الإعداد" description="يتم تحميل بيانات مركز القيادة من النظام." />
          </Grid>
        ) : (
          kpis.map((kpi) => (
            <Grid item xs={12} sm={6} md={4} xl={3} key={kpi.label}>
              <KpiCard {...kpi} />
            </Grid>
          ))
        )}
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={7}>
          <SurfaceCard
            title="الرحلات المباشرة"
            subtitle="الوضع الصحي للرحلات الواصلة والمغادرة الآن"
            action={<Button size="small" variant="outlined" onClick={() => nav('flights')}>عرض الكل ←</Button>}
          >
            <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الرحلة</TableCell>
                    <TableCell>من</TableCell>
                    <TableCell align="center">موعد الوصول</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                    <TableCell align="center">الإجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {upcoming.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>لا رحلات قادمة مسجّلة</TableCell>
                    </TableRow>
                  ) : (
                    upcoming.map((f) => (
                      <TableRow key={f.id} hover onClick={() => nav('flight-details')} sx={{ cursor: 'pointer' }}>
                        <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{f.flight_number}</TableCell>
                        <TableCell>{f.origin_country}</TableCell>
                        <TableCell align="center">{new Date(f.scheduled_arrival).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell align="center"><Chip size="small" label={f.status} sx={{ fontWeight: 700, bgcolor: `${C.primary}10`, color: C.primary }} /></TableCell>
                        <TableCell align="center">
                          <Tooltip title="تفاصيل الرحلة">
                            <IconButton aria-label="رجوع" size="small" onClick={(e) => { e.stopPropagation(); nav('flight-details'); }}><ArrowBackIosNewIcon fontSize="small" sx={{ transform: 'rotate(180deg)' }} /></IconButton>
                          </Tooltip>
                        </TableCell>
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
            <SurfaceCard title="حالة الطوارئ" subtitle="أعلى أولوية حالياً">
              <EmptyState title="قيد الإعداد" description="بيانات حالات الطوارئ تُحمل من غرفة العمليات عند توفّرها من النظام." />
            </SurfaceCard>
            <SurfaceCard title="قائمة المختبر" subtitle="حالة أوامر التحاليل">
              <EmptyState title="قيد الإعداد" description="إحصاءات المختبر تُحمل من نظام المعامل عند توفّرها." />
            </SurfaceCard>
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <SurfaceCard title="توزيع المخاطر" subtitle="المسافرون المفحوصون اليوم">
            <EmptyState title="قيد الإعداد" description="توزيع المخاطر يُحمل من نظام الترصد عند توفّره." />
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SurfaceCard title="آخر التنبيهات" subtitle="إشعارات تستدعي النظر">
            <Stack spacing={1}>
              {alerts.length === 0 ? (
                <EmptyState title="لا توجد تنبيهات" description="لا توجد تنبيهات نظامية مسجّلة حاليًا." />
              ) : (
                alerts.slice(0, 3).map((a) => (
                  <Stack key={a.id} direction="row" spacing={1} sx={{ p: 1.1, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: '#FCFDFD' }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: C.danger, mt: 0.5 }} />
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{a.subject} · {new Date(a.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{a.body}</Typography>
                    </Box>
                  </Stack>
                ))
              )}
            </Stack>
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SurfaceCard title="حالات تستدعي الانتباه" subtitle="مشتبهة (RED) وإحالات عيادة — مباشر">
            <Stack spacing={1}>
              {suspected.length === 0 ? (
                <Typography variant="caption" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>لا حالات مشتبهة أو إحالات حاليًا</Typography>
              ) : (
                suspected.slice(0, 4).map((s, i) => (
                  <Stack key={`${s.kind}-${i}`} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: '#FCFDFD' }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {s.kind === 'RED'
                        ? <WarningAmberIcon sx={{ color: C.danger, fontSize: 18 }} />
                        : <HealthAndSafetyOutlinedIcon sx={{ color: C.primary, fontSize: 18 }} />}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.traveler_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.flight_number ? `${s.flight_number} · ` : ''}{s.detail}
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip size="small" label={s.kind === 'RED' ? 'مشتبه' : 'إحالة'} sx={{ bgcolor: s.kind === 'RED' ? C.dangerBg : `${C.primary}14`, color: s.kind === 'RED' ? C.danger : C.primary, fontWeight: 700 }} />
                  </Stack>
                ))
              )}
            </Stack>
          </SurfaceCard>
        </Grid>
      </Grid>
    </Box>
  );
};

/* ============================= 2. الرحلات ============================= */

export const Flights = ({ nav }: Props) => (
  <Box>
    <PageTitle title="إدارة الرحلات" subtitle="متابعة لحظية للرحلات والوضع الصحي لكل رحلة" />
    <EmptyState title="قيد الإعداد" description="بيانات الرحلات تُحمل من نظام العمليات الجوية عند توفّرها." />
  </Box>
);

/* ============================= 3. تفاصيل الرحلة ============================= */

export const FlightDetails = ({ nav }: Props) => (
  <Box>
    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
      <IconButton aria-label="رجوع" size="small" onClick={() => nav('flights')} sx={{ border: `1px solid ${C.border}` }}><ArrowBackIosNewIcon sx={{ fontSize: 18, transform: 'rotate(180deg)' }} /></IconButton>
      <Typography variant="body2" color="text.secondary">رجوع إلى الرحلات</Typography>
    </Stack>
    <PageTitle title="تفاصيل الرحلة" subtitle="تفاصيل الرحلة المحددة" />
    <EmptyState title="قيد الإعداد" description="بيانات رحلة التفاصيل تُحمل من نظام العمليات عند اختيار رحلة." />
  </Box>
);

/* ============================= 4. الطاقم ============================= */

export const Crew = () => (
  <Box>
    <PageTitle title="إدارة الطاقم" subtitle="الفحص الصحي لأطقم الرحلات الواصلة والمغادرة" />
    <EmptyState title="قيد الإعداد" description="بيانات أطقم الرحلات تُحمل من سجلات الطاقم عند توفّرها." />
  </Box>
);

export const InfoBox = ({ label, value, extra }: { label: string; value: React.ReactNode; extra?: React.ReactNode }) => (
  <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: C.surface }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{label}</Typography>
    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{value}</Typography>
    {extra && <Typography variant="caption" color="text.secondary">{extra}</Typography>}
  </Box>
);
