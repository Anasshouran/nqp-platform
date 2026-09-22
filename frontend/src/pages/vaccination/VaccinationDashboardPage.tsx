import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import PreviewIcon from '@mui/icons-material/Preview';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import InsightsIcon from '@mui/icons-material/Insights';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import ScheduleIcon from '@mui/icons-material/Schedule';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, BarChart, Bar, Cell } from 'recharts';
import { PageHeader, EmptyState } from '../../components/common';
import KpiCard from '../../components/dashboard/KpiCard';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { getVaccinationDashboard } from '../../api/endpoints/vaccination';
import type { VaccinationDashboard } from '../../types/vaccination';
import { formatDate } from '../../utils/formatters';
import { extractErrorMessage } from '../../utils/toast';

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <PreviewIcon fontSize="small" /> },
  { id: 'activity', label: 'النشاط والسياق', icon: <InsightsIcon fontSize="small" /> },
  { id: 'stocks', label: 'المخزون والصلاحية', icon: <Inventory2Icon fontSize="small" /> },
  { id: 'recent', label: 'آخر الجرعات', icon: <ScheduleIcon fontSize="small" /> },
] as const;

const BAR_COLORS = ['#0c7f6a', '#2f6dd0', '#0e7490', '#7b4fb3', '#b7791f', '#c63a3a', '#0d6efd', '#6f42c1'];

const VaccinationDashboardPage = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<VaccinationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  const { active, register, scrollTo } = useCommandSections(
    SECTIONS as unknown as CommandSectionDef[],
    [loading],
  );

  const load = () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!data) setLoading(true);
    getVaccinationDashboard()
      .then((res) => setData(res.data.data))
      .catch((err) => setError(extractErrorMessage(err, 'تعذر تحميل لوحة التطعيم الدولي')))
      .finally(() => {
        loadingRef.current = false;
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = useMemo(
    () => [
      {
        icon: <EventAvailableIcon />,
        label: 'جرعات اليوم',
        value: data?.doses_today ?? 0,
        accent: 'success.main',
        hint: 'اليوم',
      },
      {
        icon: <ScheduleIcon />,
        label: 'جرعات الأسبوع',
        value: data?.doses_this_week ?? 0,
        accent: 'info.main',
        hint: 'الأسبوع الحالي',
      },
      {
        icon: <VaccinesIcon />,
        label: 'إجمالي الجرعات',
        value: data?.total_records ?? 0,
        accent: 'primary.main',
        hint: 'الكل',
      },
      {
        icon: <VerifiedUserIcon />,
        label: 'شهادات سارية',
        value: data?.active_certificates ?? 0,
        accent: 'secondary.main',
        hint: 'نشطة',
      },
      {
        icon: <Inventory2Icon />,
        label: 'تشغيلات متاحة',
        value: data?.batches_count ?? 0,
        accent: 'warning.main',
        hint: 'بمخزون',
      },
    ],
    [data],
  );

  const activity = useMemo(() => {
    if (!data) return [];
    const now = new Date();
    const days: { name: string; doses: number }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({
        name: d.toLocaleDateString('ar', { weekday: 'short' }),
        doses: 0,
      });
    }
    days[days.length - 1].doses = data.doses_today;
    days[days.length - 1].name = 'اليوم';
    return days;
  }, [data]);

  return (
    <>
      <PageHeader
        title="بوابة التطعيم الدولي"
        subtitle="إدارة اللقاحات والتشغيلات وسجلات الجرعات والشهادات الصحية الدولية"
        eyebrow="العمليات"
        action={
          <Stack direction="row" spacing={1}>
            <Tooltip title="تحديث اللوحة">
              <Box component="span" sx={{ display: 'inline-flex' }}>
                <IconButton
                  aria-label="تحديث اللوحة"
                  onClick={() => load()}
                  disabled={loading}
                  sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
                >
                  {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                </IconButton>
              </Box>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<PersonAddAlt1Icon />}
              onClick={() => navigate('/app/vaccination/register')}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              تسجيل جرعة
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={0} sx={{ mt: 1 }} columnSpacing={3}>
        <Grid item xs={12} md={2.5} lg={2}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label="أقسام اللوحة"
          />
        </Grid>
        <Grid item xs={12} md={9.5} lg={10}>
          <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px', display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
            {kpis.map((kpi) => (
              <Box key={kpi.label} sx={{ flex: '1 1 190px', minWidth: 190 }}>
                <KpiCard {...kpi} />
              </Box>
            ))}
          </Box>

          <Box component="section" ref={register('activity')} data-section="activity" sx={{ scrollMarginTop: '80px', mb: 4 }}>
            <Card sx={{ borderRadius: 4, border: '1px solid rgba(16,40,34,0.07)', p: { xs: 2, md: 3 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 800 }}>النشاط الأسبوعي</Typography>
                <Chip size="small" label={`${data?.doses_this_week ?? 0} جرعة هذا الأسبوع`} color="info" sx={{ fontWeight: 700 }} />
              </Stack>
              {loading ? (
                <Skeleton variant="rounded" height={220} />
              ) : (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={7}>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={activity} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="vacDoses" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0c7f6a" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#0c7f6a" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e3e8e6" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <ChartTooltip />
                        <Area type="monotone" dataKey="doses" name="الجرعات" stroke="#0c7f6a" strokeWidth={2.5} fill="url(#vacDoses)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data?.by_vaccine ?? []} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="label" width={118} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <ChartTooltip />
                        <Bar dataKey="value" name="جرعات" radius={[0, 8, 8, 0]}>
                          {(data?.by_vaccine ?? []).map((entry, index) => (
                            <Cell key={entry.label} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Grid>
                </Grid>
              )}
            </Card>
          </Box>

          <Box component="section" ref={register('stocks')} data-section="stocks" sx={{ scrollMarginTop: '80px', mb: 4 }}>
            <Card sx={{ borderRadius: 4, border: '1px solid rgba(16,40,34,0.07)', p: { xs: 2, md: 3 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 800 }}>تشغيلات قاربت على الانتهاء</Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/app/vaccination/batches')}
                  sx={{ fontWeight: 700, textTransform: 'none' }}
                >
                  إدارة المخزون
                </Button>
              </Stack>
              {loading ? (
                <Skeleton variant="rounded" height={120} />
              ) : (data?.expiring_soon_batches?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={<Inventory2Icon sx={{ fontSize: 40, color: 'success.main' }} />}
                  title="لا توجد تشغيلات تقترب من الانتهاء"
                  description="لا توجد تشغيلات تنتهي خلال 60 يوماً القادمة."
                />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>اللقاح</TableCell>
                        <TableCell>رقم التشغيلة</TableCell>
                        <TableCell>الانتهاء</TableCell>
                        <TableCell>الكمية المتاحة</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data?.expiring_soon_batches ?? []).map((b) => (
                        <TableRow key={b.id}>
                          <TableCell sx={{ fontWeight: 700 }}>{b.vaccine_name_ar}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{b.lot_number}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              icon={<WarningAmberIcon />}
                              label={formatDate(b.expiry_date)}
                              color="warning"
                              sx={{ fontWeight: 700 }}
                            />
                          </TableCell>
                          <TableCell>{b.available_quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </Box>

          <Box component="section" ref={register('recent')} data-section="recent" sx={{ scrollMarginTop: '80px', mb: 4 }}>
            <Card sx={{ borderRadius: 4, border: '1px solid rgba(16,40,34,0.07)', p: { xs: 2, md: 3 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 800 }}>آخر الجرعات المسجلة</Typography>
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/app/vaccination/records')}
                  sx={{ fontWeight: 700, textTransform: 'none' }}
                >
                  سجل الجرعات
                </Button>
              </Stack>
              {loading ? (
                <Stack spacing={1.5}>
                  <Skeleton variant="rounded" height={52} />
                  <Skeleton variant="rounded" height={52} />
                  <Skeleton variant="rounded" height={52} />
                </Stack>
              ) : error ? (
                <EmptyState
                  icon={<WarningAmberIcon sx={{ fontSize: 40, color: 'error.main' }} />}
                  title="تعذر التحميل"
                  description={error}
                  action={
                    <Button variant="contained" onClick={() => load()} sx={{ fontWeight: 700, textTransform: 'none' }}>
                      إعادة المحاولة
                    </Button>
                  }
                />
              ) : (data?.recent_records?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={<VaccinesIcon sx={{ fontSize: 40, color: 'info.main' }} />}
                  title="لا توجد جرعات مسجلة"
                  description="سجّل أول جرعة لمسافر بالأعلى."
                />
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>المسافر</TableCell>
                        <TableCell>اللقاح</TableCell>
                        <TableCell>الجرعة</TableCell>
                        <TableCell>التشغيلة</TableCell>
                        <TableCell>التاريخ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data?.recent_records ?? []).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell sx={{ fontWeight: 700 }}>{r.traveler_name}</TableCell>
                          <TableCell>
                            <Chip size="small" label={r.vaccine_code} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                          </TableCell>
                          <TableCell>{r.dose_number}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{r.lot_number || '—'}</TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(r.administered_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export default VaccinationDashboardPage;