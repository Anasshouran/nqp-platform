import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BiotechIcon from '@mui/icons-material/Biotech';
import GavelIcon from '@mui/icons-material/Gavel';
import TableChartIcon from '@mui/icons-material/TableChart';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AirplanemodeActiveIcon from '@mui/icons-material/AirplanemodeActive';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import GroupsIcon from '@mui/icons-material/Groups';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import RefreshIcon from '@mui/icons-material/Refresh';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import {
  AppButton,
  CardsGridSkeleton,
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormDialog,
  FormSelect,
  FormTextField,
  ListSkeleton,
  PageTabs,
  SectionCard,
  StatCard,
  StatusChip,
} from '../../components/uikit';
import type { DataTableColumn, FormSelectOption, StatusTone } from '../../components/uikit';
import { ErrorState } from '../../components/common';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import {
  createAirportStaff,
  deleteAirportStaff,
  getAirportDashboard,
  getAirportPorts,
  getAirportStaff,
  getAirportTerminals,
  getCrewHealthRecords,
  getScreeningPoints,
  updateAirportStaff,
  getAirportActivityLog,
} from '../../api/endpoints/airport';
import { getProfile, type ProfileData } from '../../api/endpoints/auth';
import { getPermissionTree } from '../../api/endpoints/roles';
import { AIRPORT_ACTIVITY_ACTION_LABELS, AIRPORT_STAFF_ROLE_LABELS } from '../../types/airport';
import type {
  AirportActivityLog,
  AirportDashboard,
  AirportDashboardReport,
  AirportPort,
  AirportStaff,
  AirportStaffRole,
  AirportStaffSummary,
  AirportTerminal,
  CrewHealthRecord,
  RecentInspection,
  RecentScreening,
  ScreeningPoint,
  UpcomingFlight,
} from '../../types/airport';
import { notifyError, notifySuccess } from '../../utils/toast';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

type Period = 'DAY' | 'WEEK' | 'MONTH';

/** عيّنات لوحة مدير المطار — الحد الأقصى لكل قائمة حديثة. */
const RECENT_LIMIT = 20;
const REFERENCE_PAGE_SIZE = 100;

/**
 * كتالوج مصفوفة الصلاحيات لمدير المطار.
 *
 * `AIRPORT_RESOURCES` = الموارد التي تهمّ هذه اللوحة. يُفضّل جلب أكوادها من
 * `/auth/permissions/tree/`؛ وعند تعذّر ذلك (دور غير موظّف بلا `permissions:view`)
 * نسقط إلى `AIRPORT_PERMISSION_CATALOG` المحلي بنفس الأكواد القياسية.
 */
const AIRPORT_RESOURCES = ['airport_health', 'airport_staff', 'screening'] as const;

const RESOURCE_LABELS: Record<(typeof AIRPORT_RESOURCES)[number], string> = {
  airport_health: 'airportdirector.resources.airport_health',
  airport_staff: 'airportdirector.resources.airport_staff',
  screening: 'airportdirector.resources.screening',
};

const ACTION_LABELS: Record<string, string> = {
  view: 'airportdirector.actions.view',
  add: 'airportdirector.actions.add',
  edit: 'airportdirector.actions.edit',
  delete: 'airportdirector.actions.delete',
  export: 'airportdirector.actions.export',
};

const AIRPORT_PERMISSION_CATALOG = [
  'airport_health:view', 'airport_health:add', 'airport_health:edit', 'airport_health:export',
  'airport_staff:view', 'airport_staff:add', 'airport_staff:edit', 'airport_staff:export',
  'screening:view', 'screening:add', 'screening:edit', 'screening:delete', 'screening:export',
] as const;

/** تسمية مقروءة لكود صلاحية (`resource:action`). */
const permissionLabel = (t: TFunction, code: string): string => {
  const [resource, action] = code.split(':');
  const resourceKey = RESOURCE_LABELS[resource as keyof typeof RESOURCE_LABELS];
  const actionKey = ACTION_LABELS[action];
  return resourceKey && actionKey ? `${t(resourceKey)} · ${t(actionKey)}` : code;
};

const SECTIONS = [
  { id: 'overview', label: 'airportdirector.sections.overview', icon: <DashboardIcon fontSize="small" /> },
  { id: 'alerts', label: 'airportdirector.sections.alerts', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'operations', label: 'airportdirector.sections.operations', icon: <HealthAndSafetyIcon fontSize="small" /> },
  { id: 'flights', label: 'airportdirector.sections.flights', icon: <VerifiedUserIcon fontSize="small" /> },
  { id: 'screening', label: 'airportdirector.sections.screening', icon: <BiotechIcon fontSize="small" /> },
  { id: 'inspections', label: 'airportdirector.sections.inspections', icon: <AirplanemodeActiveIcon fontSize="small" /> },
  { id: 'crew', label: 'airportdirector.sections.crew', icon: <AirlineSeatReclineNormalIcon fontSize="small" /> },
  { id: 'terminals', label: 'airportdirector.sections.terminals', icon: <TableChartIcon fontSize="small" /> },
  { id: 'decision', label: 'airportdirector.sections.decision', icon: <GavelIcon fontSize="small" /> },
  { id: 'reports', label: 'airportdirector.sections.reports', icon: <PictureAsPdfIcon fontSize="small" /> },
  { id: 'staff', label: 'airportdirector.sections.staff', icon: <VerifiedUserIcon fontSize="small" /> },
  { id: 'permissions', label: 'airportdirector.sections.permissions', icon: <GavelIcon fontSize="small" /> },
] as const;

/** بيانات مرجعية تُجلب بشكل متوازٍ مع لوحة التحكم (طاقم + مواقع + نقاط فحص). */
interface ReferenceData {
  crew: CrewHealthRecord[];
  terminals: AirportTerminal[];
  points: ScreeningPoint[];
}

/** توصية تشغيلية مشتقة من بيانات اللوحة الحقيقية (لا محتوى مُصطنع). */
interface Recommendation {
  topic: string;
  finding: string;
  cause: string;
  recommendation: string;
}

/**
 * دعم القرار — ثلاث قواعد بسيطة وشفافة فوق حمولة `/airport/dashboard/` فقط:
 * A) وجود حالات مشتبهة (> 0) — تصعيد الفحص الحراري.
 * B) تفتيشات بحالة FAILED/CONDITIONAL في آخر التفتيشات — إجراءات تصحيحية.
 * C) تراكم الفحوصات المعلّقة (معلّق > منجز × 1.5) — تعزيز الموارد.
 * لا نداءات جديدة ولا نماذج جديدة؛ تُحسب في الواجهة من نفس الحمولة.
 */
const computeRecommendations = (t: TFunction, dashboard: AirportDashboard | null): Recommendation[] => {
  if (!dashboard) return [];
  const k = dashboard.kpis;
  const recs: Recommendation[] = [];

  // A) حالات مشتبهة
  if (k.suspected_cases > 0) {
    recs.push({
      topic: t('airportdirector.recommendations.suspected_cases.topic'),
      finding: t('airportdirector.recommendations.suspected_cases.finding', { count: k.suspected_cases }),
      cause: t('airportdirector.recommendations.suspected_cases.cause'),
      recommendation: t('airportdirector.recommendations.suspected_cases.recommendation'),
    });
  }

  // B) تفتيشات غير مطابقة أو مشروطة
  const failed = dashboard.recent_inspections.filter(
    (i) => i.overall_status === 'FAILED' || i.overall_status === 'CONDITIONAL'
  ).length;
  if (failed > 0) {
    recs.push({
      topic: t('airportdirector.recommendations.non_compliant_inspections.topic'),
      finding: t('airportdirector.recommendations.non_compliant_inspections.finding', { count: failed }),
      cause: t('airportdirector.recommendations.non_compliant_inspections.cause'),
      recommendation: t('airportdirector.recommendations.non_compliant_inspections.recommendation'),
    });
  }

  // C) تراكم الفحوصات المعلّقة مقابل المنجزة
  if (k.screened_today > 0 && k.pending_screenings > k.screened_today * 1.5) {
    recs.push({
      topic: t('airportdirector.recommendations.pending_screenings.topic'),
      finding: t('airportdirector.recommendations.pending_screenings.finding', {
        count: k.pending_screenings,
        screened: k.screened_today,
      }),
      cause: t('airportdirector.recommendations.pending_screenings.cause'),
      recommendation: t('airportdirector.recommendations.pending_screenings.recommendation'),
    });
  }

  return recs;
};

const AirportDirectorPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('DAY');
  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], []);

  // لوحة القيادة الموسّعة (من /api/v1/airport/dashboard/ — #69)
  const dashboardApi = useApi<AirportDashboard>(() =>
    getAirportDashboard().then((res) => res.data.data)
  );

  // ثلاث نداءات متوازية للبيانات المرجعية (طاقم، صالات، نقاط الفحص)
  const referenceApi = useApi<ReferenceData>(() =>
    Promise.all([
      getCrewHealthRecords({ page_size: RECENT_LIMIT }),
      getAirportTerminals({ page_size: REFERENCE_PAGE_SIZE }),
      getScreeningPoints({ page_size: REFERENCE_PAGE_SIZE }),
    ]).then(([crew, terminals, points]) => ({
      crew: crew.data.data.results ?? [],
      terminals: terminals.data.data.results ?? [],
      points: points.data.data.results ?? [],
    }))
  );

  const dashboard = dashboardApi.data;
  const k = dashboard?.kpis;
  const alerts = dashboard?.alerts ?? [];
  const report = dashboard?.report;
  const recommendations = computeRecommendations(t, dashboard);

  /** سجل الأنشطة الإدارية — استطلاع دوري كل 30 ثانية. */
  const [activityLog, setActivityLog] = useState<AirportActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<unknown>(null);

  const loadActivity = () => {
    getAirportActivityLog({ page_size: 20 })
      .then((res) => {
        setActivityLog(res.data?.data?.results ?? []);
        setActivityError(null);
      })
      .catch((err) => {
        setActivityError(err);
      })
      .finally(() => {
        setActivityLoading(false);
      });
  };

  useEffect(() => {
    loadActivity();
    const id = setInterval(loadActivity, 30_000);
    return () => {
      clearInterval(id);
    };
  }, []);

  /** الصالات مع عدد نقاط الفحص لكل صالة (تجميع مخاطب). */
  const terminalRows = useMemo<TerminalAggregate[]>(() => {
    const terminals = referenceApi.data?.terminals ?? [];
    const points = referenceApi.data?.points ?? [];
    return terminals.map((t) => ({
      id: t.id,
      name_ar: t.name_ar,
      terminal_code: t.terminal_code,
      point_count: points.filter((p) => p.terminal === t.id).length,
    }));
  }, [referenceApi.data]);

  const flightColumns = useMemo(() => getFlightColumns(t), [t]);
  const screeningColumns = useMemo(() => getScreeningColumns(t), [t]);
  const inspectionColumns = useMemo(() => getInspectionColumns(t), [t]);
  const crewColumns = useMemo(() => getCrewColumns(t), [t]);
  const terminalColumns = useMemo(() => getTerminalColumns(t), [t]);

  const kpis: Array<{ label: string; value: number; accent: string; icon: ReactElement }> = [
    { label: t('airportdirector.kpis.flights_today'), value: k?.flights_today ?? 0, accent: 'primary.main', icon: <FlightLandIcon /> },
    { label: t('airportdirector.kpis.passengers_today'), value: k?.passengers_today ?? 0, accent: 'info.main', icon: <GroupsIcon /> },
    { label: t('airportdirector.kpis.arrivals_today'), value: k?.arrivals_today ?? 0, accent: 'success.main', icon: <FlightTakeoffIcon /> },
    { label: t('airportdirector.kpis.departures_today'), value: k?.departures_today ?? 0, accent: 'warning.main', icon: <FlightLandIcon /> },
    { label: t('airportdirector.kpis.screened_today'), value: k?.screened_today ?? 0, accent: 'primary.main', icon: <ManageSearchIcon /> },
    { label: t('airportdirector.kpis.pending_screenings'), value: k?.pending_screenings ?? 0, accent: 'warning.main', icon: <FactCheckIcon /> },
    { label: t('airportdirector.kpis.suspected_cases'), value: k?.suspected_cases ?? 0, accent: 'error.main', icon: <WarningAmberIcon /> },
    { label: t('airportdirector.kpis.clinic_referrals'), value: k?.clinic_referrals ?? 0, accent: 'error.light', icon: <HealthAndSafetyIcon /> },
    { label: t('airportdirector.kpis.completed_today'), value: k?.completed_today ?? 0, accent: 'success.dark', icon: <CheckCircleIcon /> },
    { label: t('airportdirector.kpis.inspections_today'), value: k?.inspections_today ?? 0, accent: 'primary.dark', icon: <AirplanemodeActiveIcon /> },
    { label: t('airportdirector.kpis.crew_records_today'), value: k?.crew_records_today ?? 0, accent: 'info.dark', icon: <AirlineSeatReclineNormalIcon /> },
    { label: t('airportdirector.kpis.vaccinations'), value: k?.vaccinations ?? 0, accent: 'success.main', icon: <VaccinesIcon /> },
  ];

  return (
    <Box>
      {/* ===== Welcome ===== */}
      <DashboardHero
        eyebrow={t('airportdirector.hero.eyebrow')}
        title={t('airportdirector.hero.title', { name: user?.full_name || t('airportdirector.hero.title_fallback') })}
        subtitle={t('airportdirector.hero.subtitle')}
        gradient="emerald"
        avatarLabel={(user?.full_name || t('airportdirector.hero.avatar_fallback')).slice(0, 1)}
        action={
          <ToggleButtonGroup
            size="small"
            exclusive
            value={period}
            onChange={(_, v: Period) => v && setPeriod(v)}
            sx={{ '& .MuiToggleButton-root': { fontWeight: 700, borderRadius: 2, px: 1.5 } }}
          >
            <ToggleButton value="DAY">{t('airportdirector.period.day')}</ToggleButton>
            <ToggleButton value="WEEK">{t('airportdirector.period.week')}</ToggleButton>
            <ToggleButton value="MONTH">{t('airportdirector.period.month')}</ToggleButton>
          </ToggleButtonGroup>
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {t('airportdirector.live')}
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label="airportdirector.rail.label"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          {/* KPI */}
          <Grid container ref={register('overview')} data-section="overview" spacing={1.5} sx={{ mb: 3, scrollMarginTop: '80px' }}>
            {dashboardApi.error ? (
              <Grid item xs={12}><ErrorState compact onRetry={dashboardApi.retry} /></Grid>
            ) : dashboardApi.loading ? (
              <Grid item xs={12}><CardsGridSkeleton count={6} /></Grid>
            ) : (
              kpis.map((kpi) => (
                <Grid item key={kpi.label} xs={12} sm={6} md={4} xl={3} data-testid="kpi-card">
                  <StatCard icon={kpi.icon} label={kpi.label} value={kpi.value} accent={kpi.accent} />
                </Grid>
              ))
            )}
          </Grid>

          {/* ===== Alerts ===== */}
          <Box ref={register('alerts')} data-section="alerts" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title={t('airportdirector.alerts.title')} subtitle={t('airportdirector.alerts.subtitle')}>
              {dashboardApi.error ? (
                <ErrorState compact onRetry={dashboardApi.retry} />
              ) : dashboardApi.loading ? (
                <ListSkeleton count={3} />
              ) : alerts.length === 0 ? (
                <EmptyState title={t('airportdirector.alerts.empty_title')} description={t('airportdirector.alerts.empty_description')} />
              ) : (
                <Stack spacing={1}>
                  {alerts.map((a) => (
                    <Stack key={a.id} direction="row" spacing={1} sx={{ p: 1.25, borderRadius: 2.5, border: '1px solid rgba(16,40,34,0.07)', bgcolor: '#FCFDFD' }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', mt: 0.6, flexShrink: 0 }} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {a.subject} · {new Date(a.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{a.body}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </SectionCard>
          </Box>

          {/* ===== Operations Indicators ===== */}
          <Box ref={register('operations')} data-section="operations" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title={t('airportdirector.operations.title')} subtitle={t('airportdirector.operations.subtitle')}>
              {dashboardApi.error ? (
                <ErrorState compact onRetry={dashboardApi.retry} />
              ) : dashboardApi.loading ? (
                <ListSkeleton count={1} />
              ) : (
                <Grid container spacing={1.5}>
                  {[
                    { label: t('airportdirector.kpis.arrivals_today'), value: k?.arrivals_today ?? 0, accent: 'success.main' },
                    { label: t('airportdirector.kpis.departures_today'), value: k?.departures_today ?? 0, accent: 'warning.main' },
                    { label: t('airportdirector.kpis.screened_today'), value: k?.screened_today ?? 0, accent: 'primary.main' },
                    { label: t('airportdirector.kpis.pending_screenings'), value: k?.pending_screenings ?? 0, accent: 'error.main' },
                    { label: t('airportdirector.kpis.inspections_today'), value: k?.inspections_today ?? 0, accent: 'info.main' },
                    { label: t('airportdirector.kpis.crew_records_today'), value: k?.crew_records_today ?? 0, accent: 'info.dark' },
                  ].map((op) => (
                    <Grid item key={op.label} xs={12} sm={6} md={4} xl={2}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 3,
                          border: '1px solid rgba(16,40,34,0.07)',
                          bgcolor: '#FCFDFD',
                          textAlign: 'center',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block' }}>
                          {op.label}
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: op.accent, fontVariantNumeric: 'tabular-nums' }}>
                          {op.value}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
            </SectionCard>
          </Box>

          {/* ===== لوحة الرحلات ===== */}
          <Box ref={register('flights')} data-section="flights" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title={t('airportdirector.flightsBoard.title')} subtitle={t('airportdirector.flightsBoard.subtitle')}>
              <DirectorTable<UpcomingFlight>
                columns={flightColumns}
                rows={dashboard?.upcoming_flights ?? []}
                rowKey={(f) => f.id}
                loading={dashboardApi.loading}
                error={dashboardApi.error}
                onRetry={dashboardApi.retry}
                emptyTitle={t('airportdirector.flightsBoard.empty_title')}
                emptyDescription={t('airportdirector.flightsBoard.empty_description')}
              />
            </SectionCard>
          </Box>

          {/* ===== فحص المسافرين + بؤر ===== */}
          <Box ref={register('screening')} data-section="screening" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title={t('airportdirector.passengerScreening.title')} subtitle={t('airportdirector.passengerScreening.subtitle')}>
              <DirectorTable<RecentScreening>
                columns={screeningColumns}
                rows={dashboard?.recent_screenings ?? []}
                rowKey={(s) => s.id}
                loading={dashboardApi.loading}
                error={dashboardApi.error}
                onRetry={dashboardApi.retry}
                emptyTitle={t('airportdirector.passengerScreening.empty_title')}
                emptyDescription={t('airportdirector.passengerScreening.empty_description')}
              />
            </SectionCard>
          </Box>

          {/* ===== تفتيش الطائرات ===== */}
          <Box ref={register('inspections')} data-section="inspections" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title={t('airportdirector.aircraftInspections.title')} subtitle={t('airportdirector.aircraftInspections.subtitle')}>
              <DirectorTable<RecentInspection>
                columns={inspectionColumns}
                rows={dashboard?.recent_inspections ?? []}
                rowKey={(i) => i.id}
                loading={dashboardApi.loading}
                error={dashboardApi.error}
                onRetry={dashboardApi.retry}
                emptyTitle={t('airportdirector.aircraftInspections.empty_title')}
                emptyDescription={t('airportdirector.aircraftInspections.empty_description')}
              />
            </SectionCard>
          </Box>

          {/* ===== صحة الطاقم ===== */}
          <Box ref={register('crew')} data-section="crew" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title={t('airportdirector.crewHealth.title')} subtitle={t('airportdirector.crewHealth.subtitle')}>
              <DirectorTable<CrewHealthRecord>
                columns={crewColumns}
                rows={referenceApi.data?.crew ?? []}
                rowKey={(c) => c.id}
                loading={referenceApi.loading}
                error={referenceApi.error}
                onRetry={referenceApi.retry}
                emptyTitle={t('airportdirector.crewHealth.empty_title')}
                emptyDescription={t('airportdirector.crewHealth.empty_description')}
              />
            </SectionCard>
          </Box>

          {/* ===== أداء المواقع + الإيرادات ===== */}
          <Box ref={register('terminals')} data-section="terminals" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title={t('airportdirector.terminalPerformance.title')} subtitle={t('airportdirector.terminalPerformance.subtitle')}>
              <DirectorTable<TerminalAggregate>
                columns={terminalColumns}
                rows={terminalRows}
                rowKey={(t) => t.id}
                loading={referenceApi.loading}
                error={referenceApi.error}
                onRetry={referenceApi.retry}
                emptyTitle={t('airportdirector.terminalPerformance.empty_title')}
                emptyDescription={t('airportdirector.terminalPerformance.empty_description')}
              />
            </SectionCard>
          </Box>

          {/* ===== دعم القرار ===== */}
          <Box ref={register('decision')} data-section="decision" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <SectionCard title={t('airportdirector.decisionSupport.title')} subtitle={t('airportdirector.decisionSupport.subtitle')}>
              {dashboardApi.loading && !dashboard ? (
                <ListSkeleton count={1} />
              ) : dashboardApi.error && !dashboard ? (
                <ErrorState compact onRetry={dashboardApi.retry} />
              ) : recommendations.length === 0 ? (
                <EmptyState
                  title={t('airportdirector.decisionSupport.empty_title')}
                  description={t('airportdirector.decisionSupport.empty_description')}
                />
              ) : (
                <Grid container spacing={2}>
                  {recommendations.map((r) => (
                    <Grid item xs={12} md={4} key={r.topic}>
                      <Card
                        sx={{
                          height: '100%',
                          borderRadius: 3,
                          border: '1px solid rgba(47,109,208,0.15)',
                          bgcolor: 'rgba(47,109,208,0.035)',
                        }}
                      >
                        <CardContent>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <LightbulbIcon color="warning" />
                            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                              {r.topic}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {r.finding}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                            {t('airportdirector.decisionSupport.probable_cause', { cause: r.cause })}
                          </Typography>
                          <Typography variant="body2" color="success.main" sx={{ mt: 1, fontWeight: 700 }}>
                            {r.recommendation}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </SectionCard>
          </Box>

          {/* ===== التقارير ===== */}
          <Box ref={register('reports')} data-section="reports" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <ReportsSection
              report={report}
              loading={dashboardApi.loading}
              error={dashboardApi.error}
              onRetry={dashboardApi.retry}
            />
          </Box>

          {/* ===== الموظفون ===== */}
          <Box ref={register('staff')} data-section="staff" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <StaffSection
              fallbackRows={dashboard?.staff ?? []}
              fallbackLoading={dashboardApi.loading}
              fallbackError={dashboardApi.error}
              fallbackRetry={dashboardApi.retry}
            />
          </Box>

          {/* ===== الصلاحيات + النشاط ===== */}
          <Box ref={register('permissions')} data-section="permissions" sx={{ mb: 3, scrollMarginTop: '80px' }}>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={6}>
                <SectionCard title={t('airportdirector.permissionsMatrix.title')} subtitle={t('airportdirector.permissionsMatrix.subtitle')}>
                  <PermissionsSection />
                </SectionCard>
              </Grid>
              <Grid item xs={12} lg={6}>
                <SectionCard
                  title={t('airportdirector.activityLog.title')}
                  subtitle={t('airportdirector.activityLog.subtitle')}
                  sx={{ height: '100%' }}
                  action={
                    <IconButton
                      size="small"
                      title={t('airportdirector.activityLog.refresh')}
                      onClick={loadActivity}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  }
                >
                  {activityLoading ? (
                    <ListSkeleton count={1} />
                  ) : activityError ? (
                    <ErrorState compact onRetry={loadActivity} />
                  ) : activityLog.length === 0 ? (
                    <EmptyState
                      title={t('airportdirector.activityLog.empty_title')}
                      description={t('airportdirector.activityLog.empty_description')}
                    />
                  ) : (
                    <Stack direction="column" spacing={1} sx={{ height: '100%', overflowY: 'auto', p: 1 }}>
                      {activityLog.map((entry) => (
                        <Box
                          key={entry.id}
                          sx={{ p: 1, borderBottom: 1, borderColor: 'rgba(16,40,34,0.06)' }}
                        >
                          <Stack direction="row" spacing={1} alignItems="baseline" sx={{ flexWrap: 'wrap' }}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ minWidth: 70, fontSize: 11 }}
                            >
                              {entry.created_at
                                ? new Date(entry.created_at).toLocaleTimeString('ar-SA', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </Typography>
                            <StatusChip
                              label={
                                entry.action_label ??
                                AIRPORT_ACTIVITY_ACTION_LABELS[entry.action as keyof typeof AIRPORT_ACTIVITY_ACTION_LABELS]
                              }
                              tone="neutral"
                              size="small"
                            />
                            <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                              {entry.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                              {entry.actor_display}
                            </Typography>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </SectionCard>
              </Grid>
            </Grid>
          </Box>

          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 4 }}>
            {t('airportdirector.footer')}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

/* ============================= تسميات الحالة ============================= */

interface ChipMeta {
  labelKey: string;
  tone: StatusTone;
}

const chipFor = (t: TFunction, metas: Record<string, ChipMeta>, code: string) => {
  const meta = metas[code];
  return <StatusChip label={meta ? t(meta.labelKey) : code} tone={meta?.tone ?? 'neutral'} />;
};

const RISK_META: Record<string, ChipMeta> = {
  GREEN: { labelKey: 'airportdirector.risk.green', tone: 'success' },
  YELLOW: { labelKey: 'airportdirector.risk.yellow', tone: 'warning' },
  RED: { labelKey: 'airportdirector.risk.red', tone: 'error' },
};

const SCREENING_STATUS_META: Record<string, ChipMeta> = {
  PENDING: { labelKey: 'airportdirector.clearance.pending', tone: 'warning' },
  CLEARED: { labelKey: 'airportdirector.clearance.cleared', tone: 'success' },
  QUARANTINED: { labelKey: 'airportdirector.clearance.quarantined', tone: 'error' },
  REFERRED: { labelKey: 'airportdirector.clearance.referred', tone: 'info' },
};

const INSPECTION_STATUS_META: Record<string, ChipMeta> = {
  PASSED: { labelKey: 'airportdirector.inspectionStatus.passed', tone: 'success' },
  FAILED: { labelKey: 'airportdirector.inspectionStatus.failed', tone: 'error' },
  CONDITIONAL: { labelKey: 'airportdirector.inspectionStatus.conditional', tone: 'warning' },
};

const HEALTH_STATUS_META: Record<string, ChipMeta> = {
  FIT: { labelKey: 'airportdirector.crewFitness.fit', tone: 'success' },
  UNFIT: { labelKey: 'airportdirector.crewFitness.unfit', tone: 'error' },
  UNDER_OBSERVATION: { labelKey: 'airportdirector.crewFitness.under_observation', tone: 'warning' },
};

const dateTime = (iso: string) => new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

/* ============================= أعمدة الجداول ============================= */

const getFlightColumns = (t: TFunction): DataTableColumn<UpcomingFlight>[] => [
  {
    key: 'flight_number',
    label: t('airportdirector.columns.flight'),
    render: (f) => <Box sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{f.flight_number}</Box>,
  },
  { key: 'origin_country', label: t('airportdirector.columns.origin') },
  { key: 'scheduled_arrival', label: t('airportdirector.columns.arrival_time'), render: (f) => dateTime(f.scheduled_arrival) },
  { key: 'status', label: t('airportdirector.columns.status'), render: (f) => <StatusChip label={f.status} tone="info" /> },
];

const getScreeningColumns = (t: TFunction): DataTableColumn<RecentScreening>[] => [
  {
    key: 'traveler_name',
    label: t('airportdirector.columns.traveler'),
    render: (s) => <Box sx={{ fontWeight: 700 }}>{s.traveler_name}</Box>,
  },
  { key: 'risk_level', label: t('airportdirector.columns.risk_level'), render: (s) => chipFor(t, RISK_META, s.risk_level) },
  { key: 'status', label: t('airportdirector.columns.status'), render: (s) => chipFor(t, SCREENING_STATUS_META, s.status) },
  { key: 'screened_at', label: t('airportdirector.columns.screening_time'), render: (s) => dateTime(s.screened_at) },
];

const getInspectionColumns = (t: TFunction): DataTableColumn<RecentInspection>[] => [
  {
    key: 'aircraft_registration',
    label: t('airportdirector.columns.aircraft_registration'),
    render: (i) => <Box sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{i.aircraft_registration}</Box>,
  },
  { key: 'flight_number', label: t('airportdirector.columns.flight'), render: (i) => <Box sx={{ fontFamily: 'monospace' }}>{i.flight_number}</Box> },
  { key: 'overall_status', label: t('airportdirector.columns.overall_status'), render: (i) => chipFor(t, INSPECTION_STATUS_META, i.overall_status) },
  {
    key: 'certificate_issued',
    label: t('airportdirector.columns.certificate'),
    render: (i) => (
      <StatusChip label={i.certificate_issued ? t('airportdirector.columns.certificate_issued') : t('airportdirector.columns.certificate_not_issued')} tone={i.certificate_issued ? 'success' : 'neutral'} />
    ),
  },
  { key: 'inspection_date', label: t('airportdirector.columns.inspection_date'), render: (i) => dateTime(i.inspection_date) },
];

const getCrewColumns = (t: TFunction): DataTableColumn<CrewHealthRecord>[] => [
  { key: 'crew_name', label: t('airportdirector.columns.crew'), render: (c) => <Box sx={{ fontWeight: 700 }}>{c.crew_name || '—'}</Box> },
  { key: 'flight_number', label: t('airportdirector.columns.flight'), render: (c) => <Box sx={{ fontFamily: 'monospace' }}>{c.flight_number || '—'}</Box> },
  { key: 'health_status', label: t('airportdirector.columns.health_status'), render: (c) => chipFor(t, HEALTH_STATUS_META, c.health_status) },
  { key: 'temperature', label: t('airportdirector.columns.temperature'), align: 'center', render: (c) => (c.temperature ?? 0) > 0 ? `${c.temperature}°` : '—' },
  { key: 'next_clearance_date', label: t('airportdirector.columns.next_clearance'), render: (c) => c.next_clearance_date || '—' },
];

const staffRoleOptions: FormSelectOption[] = (
  Object.keys(AIRPORT_STAFF_ROLE_LABELS) as AirportStaffRole[]
).map((value) => ({ value, label: AIRPORT_STAFF_ROLE_LABELS[value] }));

/** تحويل صف لوحة القيادة المختصر إلى موظف كامل (للاستخدام كبيانات احتياطية). */
const toFullStaff = (s: AirportStaffSummary): AirportStaff => ({
  ...s,
  airport: '',
  airport_name: '',
  user: null,
  user_email: '',
  notes: '',
  created_at: '',
  updated_at: '',
});

interface TerminalAggregate {
  id: string;
  name_ar: string;
  terminal_code: string;
  point_count: number;
}

const getTerminalColumns = (t: TFunction): DataTableColumn<TerminalAggregate>[] => [
  { key: 'name_ar', label: t('airportdirector.columns.terminal'), render: (row) => <Box sx={{ fontWeight: 700 }}>{row.name_ar}</Box> },
  { key: 'terminal_code', label: t('airportdirector.columns.code'), render: (row) => <Box sx={{ fontFamily: 'monospace' }}>{row.terminal_code}</Box> },
  {
    key: 'point_count',
    label: t('airportdirector.columns.screening_points'),
    align: 'center',
    render: (row) => <StatusChip label={String(row.point_count)} tone={row.point_count > 0 ? 'success' : 'neutral'} />,
  },
];

/* ============================= جدول مساعد ============================= */

interface DirectorTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  actions?: (row: T) => ReactElement;
  actionsLabel?: string;
}

const DirectorTable = <T,>({
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  actions,
  actionsLabel,
}: DirectorTableProps<T>) => {
  if (error) return <ErrorState compact onRetry={onRetry} />;
  return (
    <DataTable<T>
      columns={columns}
      rows={rows}
      rowKey={rowKey}
      count={rows.length}
      page={1}
      rowsPerPage={Math.max(rows.length, 10)}
      hidePagination
      loading={loading}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      actions={actions}
      actionsLabel={actionsLabel}
    />
  );
};

/* ============================= مكونات فرعية ============================= */

interface StaffFormValues {
  full_name: string;
  role: AirportStaffRole;
  email: string;
  phone: string;
  shift: string;
  airport: string;
  is_active: boolean;
}

const emptyStaffForm: StaffFormValues = {
  full_name: '',
  role: 'INSPECTOR',
  email: '',
  phone: '',
  shift: '',
  airport: '',
  is_active: true,
};

/** حقول نموذج الموظف — تُستخدم في الإضافة والتعديل. */
const StaffFormFields = ({
  value,
  onChange,
  portOptions,
}: {
  value: StaffFormValues;
  onChange: (next: StaffFormValues) => void;
  portOptions: FormSelectOption[];
}) => {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} sx={{ pt: 1 }}>
      <FormTextField
        label={t('airportdirector.staff_form.full_name')}
        requiredMark
        value={value.full_name}
        onChange={(e) => onChange({ ...value, full_name: e.target.value })}
      />
      <FormSelect
        label={t('airportdirector.staff_form.role')}
        requiredMark
        value={value.role}
        onChange={(next) => onChange({ ...value, role: next as AirportStaffRole })}
        options={staffRoleOptions}
        SelectDisplayProps={{ 'aria-label': t('airportdirector.staff_form.role') }}
      />
      <FormTextField
        label={t('airportdirector.staff_form.email')}
        type="email"
        value={value.email}
        onChange={(e) => onChange({ ...value, email: e.target.value })}
      />
      <FormTextField
        label={t('airportdirector.staff_form.phone')}
        value={value.phone}
        onChange={(e) => onChange({ ...value, phone: e.target.value })}
      />
      <FormTextField
        label={t('airportdirector.staff_form.shift')}
        value={value.shift}
        onChange={(e) => onChange({ ...value, shift: e.target.value })}
        placeholder={t('airportdirector.staff_form.shift_placeholder')}
      />
      <FormSelect
        label={t('airportdirector.staff_form.airport')}
        requiredMark
        value={value.airport}
        onChange={(next) => onChange({ ...value, airport: next })}
        options={portOptions}
        placeholder={t('airportdirector.staff_form.airport_placeholder')}
        SelectDisplayProps={{ 'aria-label': t('airportdirector.staff_form.airport') }}
      />
      <FormControlLabel
        control={
          <Switch
            checked={value.is_active}
            onChange={(e) => onChange({ ...value, is_active: e.target.checked })}
          />
        }
        label={t('airportdirector.staff_form.active')}
      />
    </Stack>
  );
};

/**
 * قسم موظفي المطار — قراءة من `getAirportStaff` (لدعم التحديث بعد التعديل)
 * مع بيانات اللوحة كاحتياط أثناء التحميل/الخطأ، وإضافة/تعديل/حذف.
 */
const StaffSection = ({
  fallbackRows,
  fallbackLoading,
  fallbackError,
  fallbackRetry,
}: {
  fallbackRows: AirportStaffSummary[];
  fallbackLoading: boolean;
  fallbackError: unknown;
  fallbackRetry: () => void;
}) => {
  const { t } = useTranslation();
  const staffApi = useApi<AirportStaff[]>(() =>
    getAirportStaff({ page_size: 100 }).then((res) => res.data.data.results ?? [])
  );
  const portsApi = useApi<AirportPort[]>(() =>
    getAirportPorts({ page_size: 100 }).then((res) => res.data.data.results ?? [])
  );

  const ports = useMemo<AirportPort[]>(() => portsApi.data ?? [], [portsApi.data]);
  const portOptions = useMemo<FormSelectOption[]>(
    () => ports.map((p) => ({ value: p.id, label: p.name_ar || p.code })),
    [ports]
  );

  // القراءة من الـAPI الحي؛ واللوحة احتياط أثناء التحميل/الخطأ.
  const rows = useMemo<AirportStaff[]>(
    () => staffApi.data ?? fallbackRows.map(toFullStaff),
    [staffApi.data, fallbackRows]
  );
  const loading = rows.length === 0 && (staffApi.loading || fallbackLoading);
  const error =
    staffApi.data === null && rows.length === 0 ? staffApi.error ?? fallbackError : null;

  // إضافة
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<StaffFormValues>(emptyStaffForm);

  // تعديل
  const [editTarget, setEditTarget] = useState<AirportStaff | null>(null);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState<StaffFormValues>(emptyStaffForm);

  // حذف
  const [deleteTarget, setDeleteTarget] = useState<AirportStaff | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = () => {
    staffApi.retry();
    fallbackRetry();
  };

  const openCreate = () => {
    setCreateForm({ ...emptyStaffForm, airport: ports.length === 1 ? ports[0].id : '' });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createAirportStaff({
        full_name: createForm.full_name.trim(),
        role: createForm.role,
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        shift: createForm.shift.trim(),
        airport: createForm.airport,
        is_active: createForm.is_active,
      });
      notifySuccess(t('airportdirector.staff_notifications.added'));
      setCreateOpen(false);
      refresh();
    } catch {
      notifyError(t('airportdirector.staff_notifications.add_error'));
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (row: AirportStaff) => {
    setEditTarget(row);
    setEditForm({
      full_name: row.full_name ?? '',
      role: (row.role as AirportStaffRole) || 'OTHER',
      email: row.email ?? '',
      phone: row.phone ?? '',
      shift: row.shift ?? '',
      airport: row.airport ?? '',
      is_active: row.is_active,
    });
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      await updateAirportStaff(editTarget.id, {
        full_name: editForm.full_name.trim(),
        role: editForm.role,
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        shift: editForm.shift.trim(),
        airport: editForm.airport,
        is_active: editForm.is_active,
      });
      notifySuccess(t('airportdirector.staff_notifications.updated'));
      setEditTarget(null);
      refresh();
    } catch {
      notifyError(t('airportdirector.staff_notifications.update_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAirportStaff(deleteTarget.id);
      notifySuccess(t('airportdirector.staff_notifications.deleted'));
      setDeleteTarget(null);
      refresh();
    } catch {
      notifyError(t('airportdirector.staff_notifications.delete_error'));
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<DataTableColumn<AirportStaff>[]>(
    () => [
      { key: 'full_name', label: t('airportdirector.staff.col_name'), render: (s) => <Box sx={{ fontWeight: 700 }}>{s.full_name || '—'}</Box> },
      { key: 'role_label', label: t('airportdirector.staff.col_role'), render: (s) => <StatusChip label={s.role_label || s.role} tone="info" /> },
      { key: 'email', label: t('airportdirector.staff.col_email'), render: (s) => s.email || '—' },
      { key: 'phone', label: t('airportdirector.staff.col_phone'), render: (s) => s.phone || '—' },
      { key: 'shift', label: t('airportdirector.staff.col_shift'), render: (s) => s.shift || '—' },
      {
        key: 'is_active',
        label: t('airportdirector.staff.col_active'),
        align: 'center',
        render: (s) => (
          <StatusChip label={s.is_active ? t('airportdirector.staff.status_active') : t('airportdirector.staff.status_inactive')} tone={s.is_active ? 'success' : 'neutral'} />
        ),
      },
    ],
    [t]
  );

  const renderActions = (row: AirportStaff) => (
    <>
      <Tooltip title={t('airportdirector.staff.edit')}>
        <IconButton size="small" aria-label={t('airportdirector.staff.edit')} onClick={() => openEdit(row)}>
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={t('airportdirector.staff.delete')}>
        <IconButton size="small" color="error" aria-label={t('airportdirector.staff.delete')} onClick={() => setDeleteTarget(row)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </>
  );

  const createDisabled = !createForm.full_name.trim() || !createForm.airport;
  const editDisabled = !editForm.full_name.trim() || !editForm.airport;

  return (
    <>
      <SectionCard
        title={t('airportdirector.staff.title')}
        subtitle={t('airportdirector.staff.subtitle')}
        action={
          <AppButton variant="primary" size="small" startIcon={<AddIcon />} onClick={openCreate}>
            {t('airportdirector.staff.add_staff')}
          </AppButton>
        }
      >
        <DirectorTable<AirportStaff>
          columns={columns}
          rows={rows}
          rowKey={(s) => s.id}
          loading={loading}
          error={error}
          onRetry={refresh}
          actions={renderActions}
          actionsLabel={t('airportdirector.staff.actions')}
          emptyTitle={t('airportdirector.staff.empty_title')}
          emptyDescription={t('airportdirector.staff.empty_description')}
        />
      </SectionCard>

      {/* إضافة موظف */}
      <FormDialog
        open={createOpen}
        title={t('airportdirector.staff.add_dialog_title')}
        subtitle={t('airportdirector.staff.add_dialog_subtitle')}
        icon={<AddIcon />}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        submitLabel={t('airportdirector.staff.add_submit')}
        loading={creating}
        submitDisabled={createDisabled}
      >
        <StaffFormFields value={createForm} onChange={setCreateForm} portOptions={portOptions} />
      </FormDialog>

      {/* تعديل موظف */}
      <FormDialog
        open={editTarget !== null}
        title={t('airportdirector.staff.edit_dialog_title')}
        subtitle={editTarget?.full_name ?? ''}
        icon={<EditIcon />}
        onClose={() => setEditTarget(null)}
        onSubmit={handleUpdate}
        submitLabel={t('airportdirector.staff.save')}
        loading={saving}
        submitDisabled={editDisabled}
      >
        <StaffFormFields value={editForm} onChange={setEditForm} portOptions={portOptions} />
      </FormDialog>

      {/* حذف موظف */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('airportdirector.staff.delete_dialog_title')}
        message={deleteTarget ? t('airportdirector.staff.delete_confirm', { name: deleteTarget.full_name }) : ''}
        confirmLabel={t('airportdirector.staff.delete_confirm_label')}
        loading={deleting}
        tone="error"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  );
};

const ReportsSection = ({
  report,
  loading,
  error,
  onRetry,
}: {
  report?: AirportDashboardReport;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: t('airportdirector.reports.tab_daily'), panel: <div>{t('airportdirector.reports.daily_report')}</div> },
    { label: t('airportdirector.reports.tab_weekly'), panel: <div>{t('airportdirector.reports.weekly_report')}</div> },
    { label: t('airportdirector.reports.tab_monthly'), panel: <div>{t('airportdirector.reports.monthly_report')}</div> },
  ];

  const summary = [
    { label: t('airportdirector.reports.flights'), value: report?.flights ?? 0 },
    { label: t('airportdirector.reports.travelers'), value: report?.travelers ?? 0 },
    { label: t('airportdirector.reports.screened'), value: report?.screened ?? 0 },
    { label: t('airportdirector.reports.referrals'), value: report?.referrals ?? 0 },
    { label: t('airportdirector.reports.suspected'), value: report?.suspected ?? 0 },
  ];

  return (
    <SectionCard
      title={t('airportdirector.reports.title')}
      subtitle={t('airportdirector.reports.subtitle')}
      action={
        <Stack direction="row" spacing={1}>
          <Button size="small" color="error" variant="contained" startIcon={<PictureAsPdfIcon />} onClick={() => notifySuccess(t('airportdirector.reports.generating_pdf'))}>PDF</Button>
          <Button size="small" color="success" variant="contained" startIcon={<TableChartIcon />} onClick={() => notifySuccess(t('airportdirector.reports.generating_excel'))}>Excel</Button>
        </Stack>
      }
    >
      {error ? (
        <ErrorState compact onRetry={onRetry} />
      ) : loading ? (
        <ListSkeleton count={2} />
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {summary.map((item) => (
              <Grid item xs={6} sm={4} md={2.4} key={item.label}>
                <Box sx={{ p: 1.5, borderRadius: 3, border: '1px solid rgba(16,40,34,0.07)', bgcolor: '#FCFDFD' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{item.label}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{item.value}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>
            {t('airportdirector.reports.screenings_by_flight_title')}
          </Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} sx={{ mb: 3 }}>
            {(report?.screenings_by_flight ?? []).length === 0 ? (
              <Typography variant="caption" color="text.secondary">{t('airportdirector.reports.no_screenings_today')}</Typography>
            ) : (
              (report?.screenings_by_flight ?? []).map((r) => (
                <StatusChip key={r.flight_number} label={`${r.flight_number} · ${r.count}`} tone="primary" />
              ))
            )}
          </Stack>

          <PageTabs value={tab} onChange={setTab} tabs={tabs} keepMounted />
        </>
      )}
    </SectionCard>
  );
};

/**
 * قسم مصفوفة الصلاحيات — يُركّب من بيانات حقيقية:
 * - `/auth/profile/` (متاح لأي مستخدم مُصادَق) → `effective_permissions`.
 * - `/auth/permissions/tree/` بأفضل جهد؛ دور مدير المطار لا يملك
 *   `permissions:view` فيُرفض النداء (403) ونسقط بصمت إلى الكتالوج المحلي.
 *
 * المتاح = الكتالوج ∩ الصلاحيات الفعلية · المستبعد = الكتالوج − الصلاحيات الفعلية.
 */
const PermissionsSection = () => {
  const { t } = useTranslation();
  const profileApi = useApi<ProfileData>(() => getProfile().then((res) => res.data.data));
  const [treeCodes, setTreeCodes] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPermissionTree()
      .then((res) => {
        if (cancelled) return;
        const tree = res.data?.data ?? {};
        const codes: string[] = [];
        Object.values(tree).forEach((perms) => {
          perms.forEach((perm) => {
            if ((AIRPORT_RESOURCES as readonly string[]).includes(perm.resource)) {
              codes.push(`${perm.resource}:${perm.action}`);
            }
          });
        });
        setTreeCodes(codes);
      })
      .catch(() => {
        // سقوط صامت: أدوار المطار غير الموظفين لا تملك `permissions:view`.
        if (!cancelled) setTreeCodes(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const catalog = useMemo<string[]>(
    () => treeCodes ?? [...AIRPORT_PERMISSION_CATALOG],
    [treeCodes]
  );

  const effective = useMemo(
    () => new Set(profileApi.data?.effective_permissions ?? []),
    [profileApi.data]
  );

  const allowed = useMemo(() => catalog.filter((code) => effective.has(code)), [catalog, effective]);
  const denied = useMemo(() => catalog.filter((code) => !effective.has(code)), [catalog, effective]);

  if (profileApi.error && !profileApi.data) {
    return <ErrorState compact onRetry={profileApi.retry} />;
  }
  if (profileApi.loading && !profileApi.data) {
    return <ListSkeleton count={2} />;
  }
  if (allowed.length === 0 && denied.length === 0) {
    return (
      <EmptyState
        title={t('airportdirector.permissions.empty_title')}
        description={t('airportdirector.permissions.empty_description')}
      />
    );
  }

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>
            {t('airportdirector.permissions.available')}
          </Typography>
          <Stack data-testid="rbac-allowed" direction="row" flexWrap="wrap" useFlexGap gap={1}>
            {allowed.map((code) => (
              <StatusChip key={code} label={permissionLabel(t, code)} tone="success" />
            ))}
          </Stack>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 700 }}>
            {t('airportdirector.permissions.excluded')}
          </Typography>
          <Stack data-testid="rbac-denied" direction="row" flexWrap="wrap" useFlexGap gap={1}>
            {denied.map((code) => (
              <StatusChip key={code} label={permissionLabel(t, code)} tone="neutral" />
            ))}
          </Stack>
        </Grid>
      </Grid>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
        {t('airportdirector.permissions.auto_update')}
      </Typography>
    </>
  );
};

export default AirportDirectorPage;
