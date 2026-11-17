import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useOfflineSync } from '../../../hooks/useOfflineSync';
import { alpha, Typography } from '@mui/material';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
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
import { C, KpiCard, PageTitle, ProgressBar, RiskBadge, RiskGauge, OfflinePill, StateBox, StatusBadge, SurfaceCard } from '../shared';
import { getAirportDashboard, getAirportFlights, getCrewHealthRecords, getAirportPortIds } from '../../../api/endpoints/airport';
import { getFlightManifestStatus, getFlightTimeline } from '../../../api/endpoints/carriers';
import { getLabDashboard } from '../../../api/endpoints/laboratory';
import { getAlerts } from '../../../api/endpoints/emergency';
import type { AirportDashboard as AirportDashboardData, CrewHealthRecord } from '../../../types/airport';
import type { EmergencyAlert } from '../../../types/emergency';
import type { Flight, FlightManifestStatus, FlightTimelineEvent } from '../../../types/carrier';
import type { LabDashboard } from '../../../types/laboratory';
import { DataTable, EmptyState, StatusChip, type StatusTone } from '../../../components/uikit';
import { useServerTable } from '../../../hooks/useServerTable';
import { useTableExport } from '../../../hooks/useTableExport';
import { formatDate, formatDateTime } from '../../../utils/formatters';

/* ============================ تسميات الحالات ============================ */

const FLIGHT_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  SCHEDULED: { label: 'مجدولة', tone: 'info' },
  MANIFEST_UPLOADED: { label: 'تم رفع الكشف', tone: 'primary' },
  IN_TRANSIT: { label: 'في الطريق', tone: 'info' },
  ARRIVED: { label: 'وصلت', tone: 'success' },
  CANCELLED: { label: 'ملغاة', tone: 'error' },
};

const CREW_HEALTH_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  FIT: { label: 'لائق', tone: 'success' },
  UNFIT: { label: 'غير لائق', tone: 'error' },
  UNDER_OBSERVATION: { label: 'قيد المراقبة', tone: 'warning' },
};

const LAB_STATUS_LABELS: Record<string, string> = {
  REGISTERED: 'مسجلة',
  RECEIVED: 'تم الاستلام',
  ACCEPTED: 'مقبولة',
  CONDITIONALLY_ACCEPTED: 'قبول مشروط',
  PROCESSING: 'قيد التحليل',
  UNDER_TESTING: 'قيد التحليل',
  READY_FOR_APPROVAL: 'جاهزة للاعتماد',
  COMPLETED: 'مكتملة',
  REJECTED: 'مرفوضة',
};

export interface Props {
  nav: (id: string) => void;
}

/* ============================= 1. مركز القيادة ============================= */

export const Dashboard = ({ nav }: Props) => {
  const [live, setLive] = React.useState<AirportDashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [offline, setOffline] = React.useState(false);
  const [lab, setLab] = React.useState<LabDashboard | null>(null);
  const [labLoading, setLabLoading] = React.useState(true);
  const [emergencyAlerts, setEmergencyAlerts] = React.useState<EmergencyAlert[]>([]);
  const [emergencyLoading, setEmergencyLoading] = React.useState(true);
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

  React.useEffect(() => {
    let mounted = true;
    setLabLoading(true);
    getLabDashboard()
      .then((res) => {
        if (mounted) { setLab(res.data.data); setLabLoading(false); }
      })
      .catch(() => {
        if (mounted) { setLabLoading(false); }
      });
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    setEmergencyLoading(true);
    const loadEmergencyAlerts = async () => {
      const portIds = await getAirportPortIds();
      const params: Record<string, unknown> = {};
      if (portIds.length > 0) {
        params.port = portIds.join(',');
      }
      try {
        const res = await getAlerts(params);
        if (mounted) { setEmergencyAlerts(res.data.data.results ?? []); setEmergencyLoading(false); }
      } catch {
        if (mounted) { setEmergencyLoading(false); }
      }
    };
    loadEmergencyAlerts();
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
              {emergencyLoading ? (
                <EmptyState title="جارٍ التحميل" description="تُحمَّل التنبيهات من غرفة العمليات…" />
              ) : emergencyAlerts.length === 0 ? (
                <EmptyState title="لا تنبيهات" description="لا توجد تنبيهات طوارئ مسجّلة حاليًا." />
              ) : (
                <Stack spacing={1}>
                  {emergencyAlerts.slice(0, 3).map((a) => (
                    <Stack key={a.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: 'action.hover' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: C.danger, mt: 0.5 }} />
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>{a.alert_type || a.alert_type !== undefined ? a.description.slice(0, 30) : 'تنبيه'} · {new Date(a.triggered_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{a.description}</Typography>
                      </Box>
                      <Chip size="small" label={a.status} sx={{ bgcolor: `${C.primary}14`, color: C.primary, fontWeight: 700 }} />
                    </Stack>
                  ))}
                  <Button size="small" variant="text" fullWidth onClick={() => nav('emergency')}>عرض جميع التنبيهات →</Button>
                </Stack>
              )}
            </SurfaceCard>
            <SurfaceCard
              title="قائمة المختبر"
              subtitle="حالة أوامر التحاليل"
              action={
                lab && lab.totals.samples > 0 ? (
                  <Button size="small" variant="outlined" onClick={() => nav('lab')}>عرض المختبر ←</Button>
                ) : undefined
              }
            >
              {labLoading ? (
                <EmptyState title="جارٍ التحميل" description="تُحمَّل إحصاءات المختبر من نظام المعامل…" />
              ) : !lab || lab.totals.samples === 0 ? (
                <EmptyState title="لا توجد عينات" description="لم تصل عينات مخبرية من نظام المعامل بعد." />
              ) : (
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1}>
                    {[
                      { label: 'قيد التحليل', value: lab.totals.under_testing, color: C.primary },
                      { label: 'جاهزة للاعتماد', value: lab.totals.ready_for_approval, color: C.warning },
                      { label: 'عاجلة', value: lab.totals.urgent, color: lab.totals.urgent > 0 ? C.danger : C.textMuted },
                      { label: 'مكتملة', value: lab.totals.completed, color: C.success },
                    ].map((s) => (
                      <Box key={s.label} sx={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 2, p: 1, textAlign: 'center' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: s.color, fontFamily: 'monospace' }}>
                          {s.value.toLocaleString('ar-EG')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      </Box>
                    ))}
                  </Stack>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {Object.entries(lab.by_status)
                      .filter(([, n]) => n > 0)
                      .map(([st, n]) => (
                        <Chip
                          key={st}
                          size="small"
                          label={`${LAB_STATUS_LABELS[st] || st}: ${n.toLocaleString('ar-EG')}`}
                          sx={{ fontWeight: 600, bgcolor: `${C.primary}10`, color: C.primary }}
                        />
                      ))}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    إجمالي العينات: {lab.totals.samples.toLocaleString('ar-EG')} · وصلت اليوم: {lab.totals.received_today.toLocaleString('ar-EG')}
                  </Typography>
                </Stack>
              )}
            </SurfaceCard>
          </Stack>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={4}>
          <SurfaceCard title="توزيع المخاطر" subtitle="المسافرون المفحوصون اليوم">
            {loading ? (
              <EmptyState title="جارٍ التحميل" description="تُحمَّل توزيعات المخاطر من النظام…" />
            ) : !live || !live.risk_distribution?.length ? (
              <EmptyState title="لا توجد بيانات" description="لا توجد فحوصات مسجّلة اليوم لحساب توزيع المخاطر." />
            ) : (
              <Stack spacing={1}>
                {live.risk_distribution.map((r) => {
                  const meta = { GREEN: { label: 'أخضر', color: C.success, bg: C.successBg }, YELLOW: { label: 'أصفر', color: C.warning, bg: C.warningBg }, RED: { label: 'أحمر', color: C.danger, bg: C.dangerBg } }[r.level] || { label: r.level, color: C.textMuted, bg: alpha(C.text, 0.06) };
                  return (
                    <Stack key={r.level} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: 'action.hover' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: meta.color }} />
                        <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 50 }}>{meta.label}</Typography>
                      </Box>
                      <ProgressBar value={r.count} color={meta.color} />
                      <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 28, fontFamily: 'monospace' }}>{r.count}</Typography>
                    </Stack>
                  );
                })}
                <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: 1 }}>
                  الإجمالي: {live.risk_distribution.reduce((s, r) => s + r.count, 0)}
                </Typography>
              </Stack>
            )}
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SurfaceCard title="آخر التنبيهات" subtitle="إشعارات تستدعي النظر">
            <Stack spacing={1}>
              {alerts.length === 0 ? (
                <EmptyState title="لا توجد تنبيهات" description="لا توجد تنبيهات نظامية مسجّلة حاليًا." />
              ) : (
                alerts.slice(0, 3).map((a) => (
                  <Stack key={a.id} direction="row" spacing={1} sx={{ p: 1.1, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: 'action.hover' }}>
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
                  <Stack key={`${s.kind}-${i}`} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: 'action.hover' }}>
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

export const Flights = () => {
  const t = useServerTable<Flight>({ fetchData: getAirportFlights });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `airport-flights-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['رقم الرحلة', 'الناقل', 'دولة المغادرة', 'الوجهة', 'الوصول المجدول', 'الحالة'],
    mapRow: (r: Flight) => [
      r.flight_number,
      r.carrier_name || '',
      r.origin_country_name || r.origin_code || '',
      r.destination_port_name || '',
      r.scheduled_arrival ? formatDateTime(r.scheduled_arrival) : '',
      FLIGHT_STATUS[r.status]?.label || r.status,
    ],
    message: 'تم تصدير الرحلات',
  });

  return (
    <Box>
      <PageTitle title="إدارة الرحلات" subtitle="متابعة لحظية لرحلات المنافذ الجوية والوضع الصحي لكل رحلة" />
      <DataTable<Flight>
        columns={[
          { key: 'flight_number', label: 'الرحلة', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.flight_number}</Typography> },
          { key: 'carrier_name', label: 'الناقل', render: (r) => r.carrier_name || '—', hideOnMobile: true },
          { key: 'origin_country_name', label: 'من', render: (r) => r.origin_country_name || r.origin_code || '—', hideOnMobile: true },
          { key: 'destination_port_name', label: 'الوجهة', render: (r) => r.destination_port_name || '—' },
          { key: 'scheduled_arrival', label: 'الوصول المجدول', render: (r) => (r.scheduled_arrival ? formatDateTime(r.scheduled_arrival) : '—'), hideOnMobile: true },
          { key: 'status', label: 'الحالة', render: (r) => { const m = FLIGHT_STATUS[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="رحلات المنافذ الجوية" subtitle={`${t.count} رحلة مسجّلة`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث برقم الرحلة أو الناقل"
        filters={[{ key: 'status', label: 'الحالة', options: Object.entries(FLIGHT_STATUS).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) }]}
        sortBy={t.sortBy} sortOrder={t.sortOrder} onSortChange={t.setSorting}
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={t.refresh}
        emptyTitle="لا توجد رحلات" emptyDescription="لم تُسجَّل رحلات في منافذ المطار مطابقة لهذه المعايير."
      />
    </Box>
  );
};

/* ============================= 3. تفاصيل الرحلة ============================= */

const MANIFEST_STATUS: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'بانتظار المعالجة', tone: 'warning' },
  PROCESSING: { label: 'قيد المعالجة', tone: 'info' },
  COMPLETED: { label: 'مكتمل', tone: 'success' },
  FAILED: { label: 'فشل', tone: 'error' },
};

const TIMELINE_CATEGORY: Record<string, string> = {
  FLIGHT: 'الرحلة',
  MANIFEST: 'كشف الركاب',
  SCREENING: 'الفحص',
  HEALTH: 'الصحة',
  DECLARATION: 'الإقرار الصحي',
  INSPECTION: 'التفتيش',
};

export const FlightDetails = ({ nav }: Props) => {
  const [flights, setFlights] = React.useState<Flight[]>([]);
  const [flightsLoading, setFlightsLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState('');
  const [timeline, setTimeline] = React.useState<FlightTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = React.useState(false);
  const [manifest, setManifest] = React.useState<FlightManifestStatus | null>(null);

  React.useEffect(() => {
    let mounted = true;
    getAirportFlights({ page_size: 100 })
      .then((res) => {
        if (!mounted) return;
        const data = res.data.data as { results?: Flight[] } | Flight[];
        const list = Array.isArray(data) ? data : data.results ?? [];
        setFlights(list);
        setSelectedId((current) => current || list[0]?.id || '');
        setFlightsLoading(false);
      })
      .catch(() => { if (mounted) setFlightsLoading(false); });
    return () => { mounted = false; };
  }, []);

  React.useEffect(() => {
    if (!selectedId) return;
    let mounted = true;
    setTimelineLoading(true);
    setManifest(null);
    getFlightTimeline(selectedId)
      .then((res) => { if (mounted) { setTimeline(res.data.data.events ?? []); setTimelineLoading(false); } })
      .catch(() => { if (mounted) { setTimeline([]); setTimelineLoading(false); } });
    getFlightManifestStatus(selectedId)
      .then((res) => { if (mounted) setManifest(res.data.data); })
      .catch(() => { if (mounted) setManifest(null); });
    return () => { mounted = false; };
  }, [selectedId]);

  const selected = flights.find((f) => f.id === selectedId);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton aria-label="رجوع" size="small" onClick={() => nav('flights')} sx={{ border: `1px solid ${C.border}` }}><ArrowBackIosNewIcon sx={{ fontSize: 18, transform: 'rotate(180deg)' }} /></IconButton>
        <Typography variant="body2" color="text.secondary">رجوع إلى الرحلات</Typography>
      </Stack>
      <PageTitle title="تفاصيل الرحلة" subtitle="الخط الزمني وحالة الكشف للرحلة المحددة — مباشر من النظام" />

      {flightsLoading ? (
        <EmptyState title="قيد الإعداد" description="يتم تحميل رحلات المنافذ الجوية." />
      ) : flights.length === 0 ? (
        <EmptyState title="لا توجد رحلات" description="لم تُسجَّل رحلات في منافذ المطار لعرض تفاصيلها." />
      ) : (
        <>
          <TextField
            select size="small" label="اختر الرحلة" value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)} sx={{ minWidth: 280, mb: 3 }}
          >
            {flights.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.flight_number}{f.carrier_name ? ` — ${f.carrier_name}` : ''}
              </MenuItem>
            ))}
          </TextField>

          {selected && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} md={3}><InfoBox label="الرحلة" value={selected.flight_number} /></Grid>
              <Grid item xs={6} md={3}><InfoBox label="الناقل" value={selected.carrier_name || '—'} /></Grid>
              <Grid item xs={6} md={3}><InfoBox label="من" value={selected.origin_country_name || selected.origin_code || '—'} /></Grid>
              <Grid item xs={6} md={3}><InfoBox label="الوصول المجدول" value={selected.scheduled_arrival ? formatDateTime(selected.scheduled_arrival) : '—'} /></Grid>
            </Grid>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12} lg={7}>
              <SurfaceCard title="الخط الزمني للرحلة" subtitle="الأحداث المسجّلة على الرحلة مرتبة زمنياً">
                {timelineLoading ? (
                  <StateBox type="loading" text="يتم تحميل الخط الزمني…" />
                ) : timeline.length === 0 ? (
                  <EmptyState title="لا توجد أحداث" description="لم تُسجَّل أحداث على هذه الرحلة بعد." />
                ) : (
                  <Stack spacing={1.25}>
                    {timeline.map((ev, i) => (
                      <Stack key={`${ev.event_type}-${i}`} direction="row" spacing={1.5} sx={{ p: 1.2, borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: 'action.hover' }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: C.primary, mt: 0.75, flexShrink: 0 }} />
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" justifyContent="space-between" gap={1}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{ev.title || ev.event_type}</Typography>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary' }}>
                              {ev.timestamp ? formatDateTime(ev.timestamp) : ''}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {TIMELINE_CATEGORY[ev.category] || ev.category}{ev.actor_name ? ` · ${ev.actor_name}` : ''}
                          </Typography>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </SurfaceCard>
            </Grid>

            <Grid item xs={12} lg={5}>
              <SurfaceCard title="كشف الركاب" subtitle="حالة معالجة كشف الرحلة">
                {!manifest ? (
                  <EmptyState title="لا يوجد كشف" description="لم يُرفع كشف ركاب لهذه الرحلة بعد." />
                ) : (
                  <Stack spacing={1.5} divider={<Divider />}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>الحالة</Typography>
                      {(() => { const m = MANIFEST_STATUS[manifest.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : manifest.status; })()}
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>عدد الركاب</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{manifest.total_passengers}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>وقت المعالجة</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{manifest.processed_at ? formatDateTime(manifest.processed_at) : '—'}</Typography>
                    </Stack>
                  </Stack>
                )}
              </SurfaceCard>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

/* ============================= 4. الطاقم ============================= */

export const Crew = () => {
  const t = useServerTable<CrewHealthRecord>({ fetchData: getCrewHealthRecords });
  const { exporting, exportAll } = useTableExport(t.fetchAllRows);
  const handleExport = () => exportAll({
    filename: `airport-crew-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['الطاقم', 'الرحلة', 'الحالة الصحية', 'درجة الحرارة', 'آخر فحص طبي', 'الفحص القادم'],
    mapRow: (r: CrewHealthRecord) => [
      r.crew_name || '',
      r.flight_number || '',
      CREW_HEALTH_STATUS[r.health_status]?.label || r.health_status,
      r.temperature != null ? String(r.temperature) : '',
      r.medical_clearance_date || '',
      r.next_clearance_date || '',
    ],
    message: 'تم تصدير سجلات الطاقم',
  });

  return (
    <Box>
      <PageTitle title="إدارة الطاقم" subtitle="الفحص الصحي لأطقم الرحلات الواصلة والمغادرة" />
      <DataTable<CrewHealthRecord>
        columns={[
          { key: 'crew_name', label: 'الطاقم', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.crew_name || '—'}</Typography> },
          { key: 'flight_number', label: 'الرحلة', render: (r) => <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{r.flight_number || '—'}</Typography>, hideOnMobile: true },
          { key: 'health_status', label: 'الحالة الصحية', render: (r) => { const m = CREW_HEALTH_STATUS[r.health_status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.health_status; } },
          { key: 'temperature', label: 'الحرارة', render: (r) => (r.temperature != null ? `${r.temperature}°` : '—'), hideOnMobile: true },
          { key: 'medical_clearance_date', label: 'آخر فحص طبي', render: (r) => (r.medical_clearance_date ? formatDate(r.medical_clearance_date) : '—'), hideOnMobile: true },
          { key: 'next_clearance_date', label: 'الفحص القادم', render: (r) => (r.next_clearance_date ? formatDate(r.next_clearance_date) : '—'), hideOnMobile: true },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="سجلات صحة الطاقم" subtitle={`${t.count} سجل مسجّل`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث باسم الطاقم أو رقم الرحلة"
        filters={[{ key: 'health_status', label: 'الحالة الصحية', options: Object.entries(CREW_HEALTH_STATUS).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('health_status', v) }]}
        sortBy={t.sortBy} sortOrder={t.sortOrder} onSortChange={t.setSorting}
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onExport={handleExport} exporting={exporting} onRefresh={t.refresh}
        emptyTitle="لا توجد سجلات طاقم" emptyDescription="لم تُسجَّل فحوصات صحية لأطقم الرحلات مطابقة لهذه المعايير."
      />
    </Box>
  );
};

export const InfoBox = ({ label, value, extra }: { label: string; value: React.ReactNode; extra?: React.ReactNode }) => (
  <Box sx={{ p: 2, borderRadius: 3, border: `1px solid ${C.border}`, bgcolor: C.surface }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{label}</Typography>
    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{value}</Typography>
    {extra && <Typography variant="caption" color="text.secondary">{extra}</Typography>}
  </Box>
);
