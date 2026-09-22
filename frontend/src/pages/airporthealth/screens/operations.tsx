import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
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
import { FLIGHTS, PASSENGERS, ANALYTICS, NOTIFICATIONS, LAB_DASHBOARD, CREW, INSPECTION_AIRCRAFT, INSPECTION_CHECKLIST, CONTACT_TRACE, EMERGENCY } from '../data';
import { getAirportDashboard } from '../../../api/endpoints/airport';
import type { AirportDashboard as AirportDashboardData } from '../../../types/airport';

export interface Props {
  nav: (id: string) => void;
}

/* ============================= 1. مركز القيادة ============================= */

export const Dashboard = ({ nav }: Props) => {
  const [live, setLive] = React.useState<AirportDashboardData | null>(null);
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    getAirportDashboard()
      .then((res) => {
        if (mounted) setLive(res.data.data);
      })
      .catch(() => {
        if (mounted) setOffline(true);
      });
    return () => {
      mounted = false;
    };
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

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ mb: 2, gap: 1 }}>
        <PageTitle title="مركز قيادة صحة المطارات" subtitle={offline ? 'بيانات مباشرة غير متاحة — تعذر الاتصال بالخادم' : 'مطار بورتسودان الدولي — بيانات مباشرة من النظام'} />
        <OfflinePill state={offline ? 'OFFLINE' : 'ONLINE'} />
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((kpi) => (
          <Grid item xs={12} sm={6} md={4} xl={3} key={kpi.label}>
            <KpiCard {...kpi} />
          </Grid>
        ))}
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
                  {upcoming.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>لا رحلات قادمة مسجّلة</TableCell>
                    </TableRow>
                  )}
                  {upcoming.map((f) => (
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
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Stack spacing={3}>
            <SurfaceCard title="حالة الطوارئ" subtitle="أعلى أولوية حالياً">
              <Stack spacing={1.5}>
                <Chip size="small" label={`${EMERGENCY.severity} — ${EMERGENCY.event}`} sx={{ bgcolor: C.dangerBg, color: C.danger, fontWeight: 700, alignSelf: 'flex-start' }} />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>الحادث: {EMERGENCY.incidentId} · {EMERGENCY.flight}</Typography>
                <Stack direction="row" spacing={1} sx={{ color: 'text.secondary' }}>
                  <Typography variant="caption">المتأثرون: {EMERGENCY.affected}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>الفريق: {EMERGENCY.team}</Typography>
                </Stack>
                <Button size="small" variant="contained" sx={{ alignSelf: 'flex-start' }} onClick={() => nav('emergency')}>فتح شاشة الطوارئ</Button>
              </Stack>
            </SurfaceCard>
            <SurfaceCard title="قائمة المختبر" subtitle="حالة أوامر التحاليل">
              <Grid container spacing={1.5}>
                {(
                  [['بانتظار', LAB_DASHBOARD.pending, C.primary], ['عيّنات مجمعة', LAB_DASHBOARD.collected, C.medicalBlue], ['في المختبر', LAB_DASHBOARD.inLab, C.warning], ['نتائج جاهزة', LAB_DASHBOARD.resultsReady, C.success], ['موجبة', LAB_DASHBOARD.positive, C.danger], ['حرجة', LAB_DASHBOARD.critical, C.danger]] as const
                ).map(([l, v, color]) => (
                  <Grid item xs={4} key={l as string}>
                    <Box sx={{ p: 1.25, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: '#FAFBFD', textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color }}>{v}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{l}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </SurfaceCard>
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <SurfaceCard title="توزيع المخاطر" subtitle="المسافرون المفحوصون اليوم">
            <Box sx={{ height: 220, display: 'grid', placeItems: 'center' }}>
              <DoughnutMini />
            </Box>
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SurfaceCard title="آخر التنبيهات" subtitle="إشعارات تستدعي النظر">
            <Stack spacing={1}>
              {NOTIFICATIONS.slice(0, 3).map((n) => (
                <Stack key={n.time} direction="row" spacing={1} sx={{ p: 1.1, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: '#FCFDFD' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: n.tone === 'danger' ? C.danger : n.tone === 'warning' ? C.warning : C.success, mt: 0.5 }} />
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{n.title} · {n.time}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{n.body}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SurfaceCard title="حالات تستدعي الانتباه" subtitle="مشتبهة (RED) وإحالات عيادة — مباشر">
            <Stack spacing={1}>
              {suspected.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>لا حالات مشتبهة أو إحالات حاليًا</Typography>
              )}
              {suspected.slice(0, 4).map((s, i) => (
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
              ))}
            </Stack>
          </SurfaceCard>
        </Grid>
      </Grid>
    </Box>
  );
};

const ScorePill = ({ score }: { score: number }) => (
  <Chip label={`النقاط ${score}`} size="small" sx={{ fontWeight: 700, bgcolor: score >= 50 ? C.dangerBg : score >= 25 ? C.warningBg : C.successBg, color: score >= 50 ? C.danger : score >= 25 ? C.warning : C.success }} />
);

const DoughnutMini = () => {
  const total = 7420 + 860 + 118 + 22;
  const data = [7420, 860, 118, 22];
  const colors = [C.success, C.warning, C.danger, C.medicalBlue];
  let acc = 0;
  const segs = data.map((v, i) => {
    const offset = acc;
    acc += (v / total) * 260;
    return <circle key={i} cx="60" cy="60" r="48" fill="none" stroke={colors[i]} strokeWidth="18" strokeDasharray={`${(v / total) * 260} 260`} strokeDashoffset={-offset} transform="rotate(-90 60 60)" strokeLinecap="round" />;
  });
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', position: 'relative' }}>
      <svg width={160} height={160} viewBox="0 0 120 120">{segs}</svg>
      <Box sx={{ position: 'absolute', textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>8,420</Typography>
        <Typography variant="caption" color="text.secondary">مفحوصون</Typography>
      </Box>
    </Box>
  );
};

/* ============================= 2. الرحلات ============================= */

export const Flights = ({ nav }: Props) => (
  <Box>
    <PageTitle title="إدارة الرحلات" subtitle="متابعة لحظية للرحلات والوضع الصحي لكل رحلة" />
    <SurfaceCard title="قائمة الرحلات" subtitle={`${FLIGHTS.length} رحلة في نافذة المراقبة`}>
      <TableContainer sx={{ '& th': { fontWeight: 700, fontSize: 12.5 } }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الرحلة</TableCell>
              <TableCell>شركة الطيران</TableCell>
              <TableCell>من</TableCell>
              <TableCell>إلى</TableCell>
              <TableCell align="center">وصول</TableCell>
              <TableCell align="center">مغادرة</TableCell>
              <TableCell align="center">مسافرون</TableCell>
              <TableCell align="center">مخاطر</TableCell>
              <TableCell align="center">الحالة الصحية</TableCell>
              <TableCell align="center">الطائرة</TableCell>
              <TableCell align="center">إجراء</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {FLIGHTS.map((f) => (
              <TableRow key={f.id} hover>
                <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{f.flightNo}</TableCell>
                <TableCell>{f.airline}</TableCell>
                <TableCell>{f.origin}</TableCell>
                <TableCell>{f.destination}</TableCell>
                <TableCell align="center">{f.arrival}</TableCell>
                <TableCell align="center">{f.departs}</TableCell>
                <TableCell align="center">{f.passengers}</TableCell>
                <TableCell align="center"><RiskBadge risk={f.risk} /></TableCell>
                <TableCell align="center"><StatusBadge status={f.status} /></TableCell>
                <TableCell align="center" sx={{ fontFamily: 'monospace' }}>{f.aircraft}</TableCell>
                <TableCell align="center">
                  <Button size="small" variant="outlined" onClick={() => nav('flight-details')}>تفاصيل</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </SurfaceCard>
  </Box>
);

/* ============================= 3. تفاصيل الرحلة ============================= */

export const FlightDetails = ({ nav }: Props) => {
  const f = FLIGHTS[3];
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton aria-label="رجوع" size="small" onClick={() => nav('flights')} sx={{ border: `1px solid ${C.border}` }}><ArrowBackIosNewIcon sx={{ fontSize: 18, transform: 'rotate(180deg)' }} /></IconButton>
        <Typography variant="body2" color="text.secondary">رجوع إلى الرحلات</Typography>
      </Stack>
      <PageTitle title={`تفاصيل الرحلة ${f.flightNo}`} subtitle={`${f.airline} · ${f.origin} → ${f.destination}`} />

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6} lg={3}><InfoBox label="الطائرة" value={f.aircraft} /></Grid>
        <Grid item xs={12} md={6} lg={3}><InfoBox label="الوصول" value={f.arrival} extra={`المغادرة ${f.departs}`} /></Grid>
        <Grid item xs={12} md={6} lg={3}><InfoBox label="المسافرون" value={String(f.passengers)} extra={`طاقم ${f.crewCount}`} /></Grid>
        <Grid item xs={12} md={6} lg={3}><InfoBox label="الحالة" value={<StatusBadge status={f.status} />} extra={<RiskBadge risk={f.risk} />} /></Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <SurfaceCard title="مسافرو الرحلة المفتاحيون" subtitle="أعلى المخاطر بين مسافري الرحلة">
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>المسافر</TableCell>
                    <TableCell align="center">المقعد</TableCell>
                    <TableCell align="center">الحرارة</TableCell>
                    <TableCell align="center">النقاط</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {PASSENGERS.filter((p) => p.flight === f.flightNo || true).slice(0, 4).map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{p.name}</TableCell>
                      <TableCell align="center">{p.seat}</TableCell>
                      <TableCell align="center">{p.temperature}</TableCell>
                      <TableCell align="center"><ScorePill score={p.score} /></TableCell>
                      <TableCell align="center"><StatusBadge status={p.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SurfaceCard title="الطاقم" subtitle="فحص الصحة لطاقم الرحلة">
            <Stack spacing={1}>
              {CREW.slice(0, 4).map((c) => (
                <Stack key={c.name} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1, borderRadius: 2.5, border: `1px solid ${C.border}` }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{c.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.role}</Typography>
                  </Box>
                  <Chip label={c.status} size="small" sx={{ fontWeight: 700 }} color={c.status === 'تم الفحص' ? 'success' : 'warning'} variant="outlined" />
                </Stack>
              ))}
            </Stack>
          </SurfaceCard>
          <Box sx={{ mt: 3 }}>
            <StateBox type="empty" text="المزيد من تفاصيل الرحلة متاح عبر التكامل مع نظام العمليات الجوية" />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export const Crew = () => (
  <Box>
    <PageTitle title="إدارة الطاقم" subtitle="الفحص الصحي لأطقم الرحلات الواصلة والمغادرة" />
    <SurfaceCard title="أطقم الرحلات">
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>الدور</TableCell>
              <TableCell align="center">الرحلة</TableCell>
              <TableCell align="center">نتيجة الفحص</TableCell>
              <TableCell align="center">الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {CREW.map((c) => (
              <TableRow key={c.name} hover>
                <TableCell sx={{ fontWeight: 700 }}>{c.name}</TableCell>
                <TableCell>{c.role}</TableCell>
                <TableCell align="center" sx={{ fontFamily: 'monospace' }}>{c.flight}</TableCell>
                <TableCell align="center">
                  <Chip label={c.checked} size="small" sx={{ fontWeight: 700 }} color={c.checked === 'سليم' ? 'success' : 'warning'} variant="outlined" />
                </TableCell>
                <TableCell align="center">{c.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </SurfaceCard>
  </Box>
);

export const InfoBox = ({ label, value, extra }: { label: string; value: React.ReactNode; extra?: React.ReactNode }) => (
  <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: C.surface }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{label}</Typography>
    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{value}</Typography>
    {extra && <Typography variant="caption" color="text.secondary">{extra}</Typography>}
  </Box>
);