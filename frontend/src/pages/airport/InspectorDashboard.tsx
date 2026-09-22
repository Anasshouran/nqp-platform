import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Avatar from '@mui/material/Avatar';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import GroupsIcon from '@mui/icons-material/Groups';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import AirlineStopsIcon from '@mui/icons-material/AirlineStops';
import { SectionCard, StatusChip } from '../../components/uikit';
import AirportHero from '../../components/airport/AirportHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { useAuth } from '../../hooks/useAuth';
import { getAirportDashboard } from '../../api/endpoints/airport';
import { flightStatus } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import type { AirportDashboard } from '../../types/airport';

const getShift = () => {
  const h = new Date().getHours();
  if (h >= 6 && h < 14) return 'الصباحية';
  if (h >= 14 && h < 22) return 'المسائية';
  return 'الليلية';
};

const todayArabic = () =>
  new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const quickActions: { icon: React.ReactNode; label: string; path: string }[] = [
  { icon: <AddCircleIcon />, label: 'بدء فحص رحلة', path: '/app/airport?tab=1' },
  { icon: <PersonSearchIcon />, label: 'البحث عن مسافر', path: '/app/travelers' },
  { icon: <LocalHospitalIcon />, label: 'إحالة إلى العيادة', path: '/app/clinic' },
  { icon: <DescriptionIcon />, label: 'تقرير تفتيش الطائرة', path: '/app/airport?tab=2' },
];

const FlightNumberChip = ({ code }: { code: string }) => (
  <Box
    component="span"
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      px: 1,
      py: 0.35,
      borderRadius: 1.5,
      bgcolor: 'primary.light',
      color: 'primary.dark',
      fontFamily: 'monospace',
      fontWeight: 800,
      fontSize: 12,
      letterSpacing: '0.02em',
    }}
  >
    {code}
  </Box>
);

const InspectorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AirportDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAirportDashboard()
      .then((r) => setData(r.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const k = data?.kpis;
  const kpiCards = useMemo(
    () => [
      { icon: <FlightTakeoffIcon />, label: 'الرحلات اليوم', value: k?.flights_today ?? 0, accent: 'primary.main' },
      { icon: <GroupsIcon />, label: 'المسافرون', value: k?.passengers_today ?? 0, accent: 'info.main' },
      { icon: <HourglassTopIcon />, label: 'بانتظار الفحص', value: k?.pending_screenings ?? 0, accent: 'warning.main' },
      { icon: <FactCheckIcon />, label: 'تم فحصهم', value: k?.screened_today ?? 0, accent: 'primary.main' },
      { icon: <LocalHospitalIcon />, label: 'إحالات للعيادة', value: k?.clinic_referrals ?? 0, accent: 'secondary.main' },
      { icon: <WarningAmberIcon />, label: 'حالات مشتبه بها', value: k?.suspected_cases ?? 0, accent: 'error.main' },
      { icon: <VaccinesIcon />, label: 'تطعيمات', value: k?.vaccinations ?? 0, accent: 'success.main' },
      { icon: <CheckCircleIcon />, label: 'مكتملة', value: k?.completed_today ?? 0, accent: 'success.main' },
    ],
    [k]
  );

  if (loading) {
    return (
      <Stack spacing={2.5}>
        <Skeleton variant="rounded" height={148} sx={{ borderRadius: 4.5 }} />
        <Grid container spacing={1.5}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={6} sm={4} lg={3} key={i}>
              <Skeleton variant="rounded" height={132} sx={{ borderRadius: 4 }} />
            </Grid>
          ))}
        </Grid>
        <Grid container spacing={2.5}>
          {[8, 4].map((lg, i) => (
            <Grid item xs={12} lg={lg} key={i}>
              <Skeleton variant="rounded" height={320} sx={{ borderRadius: 4 }} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <WarningAmberIcon sx={{ fontSize: 52, color: 'warning.main', mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          تعذر تحميل لوحة المطار
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          حدث خطأ أثناء جلب بيانات اللوحة، حاول مرة أخرى.
        </Typography>
        <Button variant="contained" sx={{ textTransform: 'none' }} onClick={() => {
          setLoading(true);
          setError(false);
          getAirportDashboard()
            .then((r) => setData(r.data.data))
            .catch(() => setError(true))
            .finally(() => setLoading(false));
        }}>
          إعادة المحاولة
        </Button>
      </Box>
    );
  }

  return (
    <Stack spacing={2.5}>
      <AirportHero
        name={user?.full_name || ''}
        role="مفتش الحجر الصحي — قسم صحة المطار"
        date={todayArabic()}
        shift={getShift()}
      />

      <Grid container spacing={1.5}>
        {kpiCards.map((c) => (
          <Grid item xs={6} sm={4} lg={3} key={c.label}>
            <KpiCard icon={<Box color="inherit">{c.icon}</Box>} value={c.value} label={c.label} accent={c.accent} />
          </Grid>
        ))}
      </Grid>

      <SectionCard title="إجراءات سريعة" subtitle="نفّذ المهام الشائعة بضغطة واحدة">
        <Grid container spacing={1.5}>
          {quickActions.map((a) => (
            <Grid item xs={12} sm={6} lg={3} key={a.label}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={a.icon}
                onClick={() => navigate(a.path)}
                sx={{
                  justifyContent: 'flex-start',
                  px: 1.5,
                  minHeight: 56,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  color: 'primary.dark',
                }}
              >
                {a.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </SectionCard>

      <Grid container spacing={2.5}>
        {/* --- main column --- */}
        <Grid item xs={12} lg={8}>
          <SectionCard title="الرحلات القادمة" subtitle="مواعيد الوصول عبر منافذ المطارات">
            {data?.upcoming_flights?.length ? (
              <Stack
                divider={<Box sx={{ height: 1, bgcolor: 'rgba(16,40,34,0.07)' }} />}
              >
                {data.upcoming_flights.map((f) => {
                  const m = flightStatus[f.status];
                  return (
                    <Stack
                      key={f.id}
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      sx={{ py: 1.5, borderRadius: 2,px: 1, transition: 'background-color 150ms ease', '&:hover': { bgcolor: 'rgba(12,127,106,0.05)' } }}
                    >
                      <Box
                        aria-hidden
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2.5,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'primary.light',
                          color: 'primary.dark',
                          flexShrink: 0,
                        }}
                      >
                        <FlightTakeoffIcon sx={{ fontSize: 22 }} />
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <FlightNumberChip code={f.flight_number} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }}>
                          {f.origin_country}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {formatDateTime(f.scheduled_arrival)}
                        </Typography>
                      </Box>
                      <Box sx={{ flexShrink: 0 }}>
                        {m ? <StatusChip label={m.label} tone={m.tone} /> : f.status}
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            ) : (
              <Typography color="text.secondary">لا توجد رحلات قادمة</Typography>
            )}
          </SectionCard>

          <SectionCard title="الحالات المشتبه بها" subtitle="إحالات تتطلب انتباهاً فورياً" sx={{ mt: 2.5 }}>
            {data?.suspected?.length ? (
              <Stack spacing={1}>
                {data.suspected.map((s, i) => (
                  <Stack
                    key={`${s.traveler_name}-${i}`}
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ py: 1.25, '&:not(:last-child)': { borderBottom: '1px dashed rgba(16,40,34,0.08)' } }}
                  >
                    <Avatar
                      sx={{
                        width: 42,
                        height: 42,
                        fontSize: 15,
                        fontWeight: 800,
                        flexShrink: 0,
                        bgcolor: s.kind === 'RED' ? 'error.light' : 'warning.light',
                        color: s.kind === 'RED' ? 'error.main' : 'warning.main',
                      }}
                    >
                      {(s.traveler_name || '؟').slice(0, 1)}
                    </Avatar>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography component="span" sx={{ fontWeight: 700, fontSize: 14 }}>
                          {s.traveler_name}
                        </Typography>
                        <StatusChip label={s.kind === 'RED' ? 'خطرة' : 'إحالة'} tone={s.kind === 'RED' ? 'error' : 'warning'} size="small" />
                        {s.flight_number && <FlightNumberChip code={s.flight_number} />}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        {s.detail}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {formatDateTime(s.at)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">لا توجد حالات مشتبه بها حالياً</Typography>
            )}
          </SectionCard>
        </Grid>

        {/* --- side column --- */}
        <Grid item xs={12} lg={4}>
          <SectionCard title="المهام المكلف بها" subtitle="أولويات الوردية الحالية">
            {data?.tasks?.length ? (
              <Stack spacing={1.5}>
                {data.tasks.map((t, i) => (
                  <Stack key={`${t.title}-${i}`} direction="row" spacing={1.5} alignItems="center">
                    <StatusChip
                      label={t.priority === 'high' ? 'عاجل' : t.priority === 'medium' ? 'مهم' : 'روتيني'}
                      tone={t.priority === 'high' ? 'error' : t.priority === 'medium' ? 'warning' : 'neutral'}
                      size="small"
                    />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography component="span" sx={{ fontWeight: 600, fontSize: 14, display: 'block' }}>
                        {t.title}
                      </Typography>
                      {t.kind && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {t.kind}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">لا توجد مهام معلقة</Typography>
            )}
          </SectionCard>

          <SectionCard title="التنبيهات" subtitle="آخر إشعارات النظام" sx={{ mt: 2.5 }}>
            {data?.alerts?.length ? (
              <Stack spacing={1.5}>
                {data.alerts.map((a) => (
                  <Box
                    key={a.id}
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      bgcolor: 'rgba(16,40,34,0.035)',
                      border: '1px solid rgba(16,40,34,0.05)',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <NotificationsActiveIcon sx={{ fontSize: 18, color: 'secondary.main', flexShrink: 0 }} />
                      <Typography component="span" sx={{ fontWeight: 700, fontSize: 14, minWidth: 0 }}>
                        {a.subject}
                      </Typography>
                    </Stack>
                    {a.body && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {a.body}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                      {formatDateTime(a.created_at)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">لا توجد تنبيهات</Typography>
            )}
          </SectionCard>

          <SectionCard title="التقرير اليومي" subtitle="إحصاءات الفحص المتراكمة" sx={{ mt: 2.5 }}>
            {data?.report && (
              <Stack spacing={1.25}>
                <ReportRow label="الرحلات" value={data.report.flights} />
                <ReportRow label="المسافرون" value={data.report.travelers} />
                <ReportRow label="المفحوصون" value={data.report.screened} />
                <ReportRow label="الإحالات" value={data.report.referrals} />
                <ReportRow label="الحالات المشتبه بها" value={data.report.suspected} />

                {data.report.screenings_by_flight?.length ? (
                  <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed rgba(16,40,34,0.1)' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <AirlineStopsIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      <Typography variant="caption" component="span" color="text.secondary" sx={{ fontWeight: 700 }}>
                        الفحوصات حسب الرحلة
                      </Typography>
                    </Stack>
                    <Stack spacing={1}>
                      {data.report.screenings_by_flight.map((s) => {
                        const max = Math.max(...data.report.screenings_by_flight.map((x) => x.count), 1);
                        const pct = Math.round((s.count / max) * 100);
                        return (
                          <Stack key={s.flight_number} direction="row" spacing={1.25} alignItems="center">
                            <Typography variant="caption" component="span" sx={{ fontFamily: 'monospace', fontWeight: 800, minWidth: 84 }}>
                              {s.flight_number}
                            </Typography>
                            <Box sx={{ flexGrow: 1, height: 6, borderRadius: 99, bgcolor: 'rgba(16,40,34,0.07)' }}>
                              <Box
                                aria-hidden
                                sx={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  borderRadius: 99,
                                  background: 'linear-gradient(90deg, #0c7f6a, #12a585)',
                                  transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)',
                                }}
                              />
                            </Box>
                            <Typography variant="caption" component="span" sx={{ fontWeight: 700, minWidth: 30, textAlign: 'end', fontVariantNumeric: 'tabular-nums' }}>
                              {s.count}
                            </Typography>
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Box>
                ) : null}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Stack>
  );
};

const ReportRow = ({ label, value }: { label: string; value: number }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
    <Typography component="span" sx={{ fontWeight: 600, fontSize: 14 }}>
      {label}
    </Typography>
    <Typography
      component="span"
      sx={{ fontWeight: 800, fontSize: 15, fontVariantNumeric: 'tabular-nums', color: 'primary.dark' }}
    >
      {value.toLocaleString('en-US')}
    </Typography>
  </Stack>
);

export default InspectorDashboard;