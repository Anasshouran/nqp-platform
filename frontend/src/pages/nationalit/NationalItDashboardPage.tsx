import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import MemoryIcon from '@mui/icons-material/Memory';
import RouterIcon from '@mui/icons-material/Router';
import BugReportIcon from '@mui/icons-material/BugReport';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HubIcon from '@mui/icons-material/Hub';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import type { SxProps, Theme } from '@mui/material/styles';

import MetricTile from '../../components/dashboard/MetricTile';
import StatusBar from '../../components/dashboard/StatusBar';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { SectionCard, StatusChip, AppButton, EmptyState } from '../../components/uikit';
import { getNationalItDashboard } from '../../api/endpoints/nationalIt';
import type { NationalItDashboard, ItSystemStatus, SectorConnectivity } from '../../types/nationalIt';
import { formatNumber, formatStamp, formatDateTime, sharePercent } from '../../utils/formatters';
import {
  selectDegraded,
  selectBusiest,
  toSparkPoints,
  countByStatus,
  healthVerdict,
} from './dashboardLogic';

/* ------------------------------------------------------------------ */
/*  Status vocabulary — Arabic labels, one tone per state              */
/* ------------------------------------------------------------------ */

type Tone = 'success' | 'warning' | 'error' | 'neutral';

const SYSTEM_STATUS: Record<ItSystemStatus, { label: string; tone: Tone; color: string }> = {
  ONLINE: { label: 'متصل', tone: 'success', color: '#1d7a54' },
  WARNING: { label: 'تحذير', tone: 'warning', color: '#a86400' },
  OFFLINE: { label: 'متوقف', tone: 'error', color: '#c63a3a' },
};

const CONNECTIVITY: Record<SectorConnectivity, { label: string; tone: Tone; color: string }> = {
  STABLE: { label: 'مستقر', tone: 'success', color: '#1d7a54' },
  PARTIAL: { label: 'انقطاع جزئي', tone: 'warning', color: '#a86400' },
  DISRUPTION: { label: 'انقطاع متكرر', tone: 'error', color: '#c63a3a' },
};

const INTEGRATION_STATUS: Record<string, { label: string; tone: Tone; color: string }> = {
  CONNECTED: { label: 'متصل', tone: 'success', color: '#1d7a54' },
  WARNING: { label: 'تأخير', tone: 'warning', color: '#a86400' },
  ERROR: { label: 'خطأ', tone: 'error', color: '#c63a3a' },
};

const PRIORITY: Record<string, { label: string; tone: Tone }> = {
  CRITICAL: { label: 'حرجة', tone: 'error' },
  HIGH: { label: 'عالية', tone: 'warning' },
  MEDIUM: { label: 'متوسطة', tone: 'info' as Tone },
  LOW: { label: 'منخفضة', tone: 'neutral' },
};

const TICKET_STATUS: Record<string, { label: string; tone: Tone }> = {
  OPEN: { label: 'مفتوحة', tone: 'error' },
  IN_PROGRESS: { label: 'قيد المعالجة', tone: 'warning' },
  RESOLVED: { label: 'مُعالجة', tone: 'success' },
  CLOSED: { label: 'مغلقة', tone: 'neutral' },
};

/** Severity order for the "needs attention" triage list — worst first. */

const todayArabic = () =>
  new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

/* ------------------------------------------------------------------ */

const NationalItDashboardPage = () => {
  const navigate = useNavigate();
  const [dash, setDash] = useState<NationalItDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /* Re-renders every 30s so relative timestamps stay honest on a wall display. */
  const [now, setNow] = useState(() => new Date());

  const load = useCallback(() => {
    setLoading(true);
    getNationalItDashboard()
      .then((res) => {
        setDash(res.data.data);
        setError(null);
      })
      .catch(() => setError('تعذّر تحميل بيانات اللوحة. تحقق من الاتصال ثم أعد المحاولة.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  /* ---- Derived views ---- */

  const systems = useMemo(() => dash?.systems ?? [], [dash]);
  const sectors = useMemo(() => dash?.sectors ?? [], [dash]);
  const integrations = useMemo(() => dash?.integrations ?? [], [dash]);
  const tickets = useMemo(() => dash?.recent_tickets ?? [], [dash]);

  const degraded = useMemo(() => selectDegraded(systems), [systems]);

  const busiest = useMemo(() => selectBusiest(systems), [systems]);

  const counts = useMemo(() => countByStatus(systems), [systems]);
  const online = counts.ONLINE;
  const warning = counts.WARNING;
  const offline = counts.OFFLINE;
  const totalSystems = systems.length;
  const availability = sharePercent(online, totalSystems);

  const integrationErrors = integrations.filter((i) => i.status === 'ERROR').length;
  const integrationWarnings = integrations.filter((i) => i.status === 'WARNING').length;

  /* Cards degrade to empty (not stale-zero) tiles when the request failed. */
  const value = (n: number | undefined) => (error ? null : n);

  const systemSegments = [
    { label: 'متصل', value: online, color: SYSTEM_STATUS.ONLINE.color },
    { label: 'تحذير', value: warning, color: SYSTEM_STATUS.WARNING.color },
    { label: 'متوقف', value: offline, color: SYSTEM_STATUS.OFFLINE.color },
  ];

  const integrationSegments = [
    { label: 'متصل', value: integrations.filter((i) => i.status === 'CONNECTED').length, color: INTEGRATION_STATUS.CONNECTED.color },
    { label: 'تأخير', value: integrationWarnings, color: INTEGRATION_STATUS.WARNING.color },
    { label: 'خطأ', value: integrationErrors, color: INTEGRATION_STATUS.ERROR.color },
  ];

  const kpis = [
    {
      label: 'أنظمة متصلة',
      value: value(dash?.active_systems),
      icon: <MemoryIcon />,
      accent: 'success.main',
      caption: totalSystems > 0 ? `من ${formatNumber(totalSystems)} نظامًا` : undefined,
      series: toSparkPoints(busiest),
      onClick: () => navigate('/dashboard/national/it/systems'),
    },
    {
      label: 'منافذ دخول متصلة',
      value: value(dash?.connected_ports),
      icon: <RouterIcon />,
      accent: 'info.main',
      caption: 'نقاط دخول نشطة',
      onClick: () => navigate('/dashboard/national/it/sectors-performance'),
    },
    {
      label: 'تذاكر مفتوحة',
      value: value(dash?.open_tickets),
      icon: <ConfirmationNumberIcon />,
      accent: 'warning.main',
      caption: 'قيد المعالجة',
      onClick: () => navigate('/dashboard/national/it/systems?tab=tickets'),
    },
    {
      label: 'تذاكر حرجة',
      value: value(dash?.critical_tickets),
      icon: <BugReportIcon />,
      accent: 'error.main',
      alert: (dash?.critical_tickets ?? 0) > 0,
      caption: (dash?.critical_tickets ?? 0) > 0 ? 'تحتاج تدخلًا' : 'لا شيء حرج',
      onClick: () => navigate('/dashboard/national/it/systems?tab=tickets'),
    },
    {
      label: 'الأصول والأجهزة',
      value: value(dash?.asset_count),
      icon: <StorageIcon />,
      accent: 'primary.main',
      caption: 'مسجّلة في الجرد',
    },
    {
      label: 'تكاملات حكومية',
      value: error ? null : integrations.length,
      icon: <HubIcon />,
      accent: integrationErrors > 0 ? 'error.main' : 'success.main',
      alert: integrationErrors > 0,
      caption:
        integrationErrors > 0
          ? `${formatNumber(integrationErrors)} في حالة خطأ`
          : integrationWarnings > 0
            ? `${formatNumber(integrationWarnings)} بتأخير`
            : 'الكل متصل',
    },
  ];

  /* ---- Shared row styling ---- */

  const rowSx: SxProps<Theme> = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    px: 1.5,
    py: 1.25,
    borderRadius: 2.5,
    minHeight: 56,
    transition: 'background-color 150ms ease',
    '&:hover': { bgcolor: 'rgba(12,127,106,0.05)' },
  };

  const metaSx: SxProps<Theme> = { fontSize: '0.75rem', fontWeight: 600 };

  return (
    <Box>
      <DashboardHero
        eyebrow="الإدارة العامة للحجر الصحي القومي"
        title="لوحة التحكم الوطنية — تقنية المعلومات"
        subtitle="نظرة شاملة على الأنظمة والبنية التحتية والتكاملات الحكومية وأداء القطاعات في الدولة."
        gradient="emerald"
        avatarLabel="ل"
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <AppButton size="small" variant="ghost" startIcon={<RefreshIcon />} onClick={load} loading={loading}>
              تحديث
            </AppButton>
          </Stack>
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            {todayArabic()}
          </Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box
              aria-hidden
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: error ? '#ffc9c9' : '#8ff5d4',
                flexShrink: 0,
                boxShadow: error ? 'none' : '0 0 0 3px rgba(143,245,212,0.25)',
              }}
            />
            {error ? 'انقطع الاتصال' : 'مباشر'}
          </Box>,
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2.5, borderRadius: 3 }} action={<Button onClick={load}>إعادة المحاولة</Button>}>
          {error}
        </Alert>
      )}

      {/* ---------- KPI grid: 2 cols on mobile, 3 tablet, 6 desktop ---------- */}
      <Grid container spacing={1.5} sx={{ mt: 3 }}>
        {kpis.map((k) => (
          <Grid item xs={6} sm={4} lg={2} key={k.label}>
            <MetricTile
              label={k.label}
              value={k.value}
              icon={k.icon}
              accent={k.accent}
              caption={k.caption}
              series={k.series}
              alert={k.alert}
              onClick={k.onClick}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>

      {/* ---------- Availability + triage ---------- */}
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid item xs={12} lg={5}>
          <SectionCard
            title="جاهزية البنية التحتية"
            subtitle="توزيع حالة الأنظمة القومية"
            sx={{ height: '100%' }}
            action={
              loading ? null : (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {formatNumber(Math.round(availability))}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    إتاحة
                  </Typography>
                </Box>
              )
            }
          >
            {loading ? (
              <Stack spacing={1.5}>
                <Skeleton variant="rounded" height={10} />
                <Skeleton height={24} />
              </Stack>
            ) : (
              <>
                <StatusBar segments={systemSegments} ariaLabel="توزيع حالة الأنظمة" />
                <Box
                  sx={{
                    mt: 2.5,
                    p: 2,
                    borderRadius: 3,
                    bgcolor: 'rgba(12,127,106,0.05)',
                    border: '1px solid rgba(12,127,106,0.14)',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    {offline > 0 ? (
                      <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 22 }} />
                    ) : (
                      <CloudDoneIcon sx={{ color: 'success.main', fontSize: 22 }} />
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {healthVerdict(counts, formatNumber)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        آخر تحديث {formatDateTime(now)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={7}>
          <SectionCard
            title="يحتاج انتباهك"
            subtitle="الأنظمة غير السليمة مرتبة حسب درجة الخطورة"
            sx={{ height: '100%' }}
            action={
              degraded.length > 0 ? (
                <Button size="small" onClick={() => navigate('/dashboard/national/it/systems?tab=errors')} endIcon={<ChevronLeftIcon />}>
                  عرض الكل
                </Button>
              ) : null
            }
          >
            {loading ? (
              <Stack spacing={1}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height={56} />
                ))}
              </Stack>
            ) : degraded.length === 0 ? (
              <EmptyState
                icon={<CloudDoneIcon />}
                title="لا توجد مشاكل"
                description="جميع الأنظمة القومية تعمل بحالة طبيعية."
              />
            ) : (
              <Stack spacing={0.5}>
                {degraded.slice(0, 6).map((s) => {
                  const meta = SYSTEM_STATUS[s.status] ?? { label: s.status, tone: 'neutral' as Tone, color: '#78948b' };
                  return (
                    <Box key={s.id} sx={rowSx}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                          {s.name_ar || s.name}
                        </Typography>
                        <Typography variant="caption" sx={metaSx} color="text.secondary" noWrap>
                          <Box component="span" sx={{ fontFamily: 'monospace' }}>{s.code}</Box>
                          {' · '}
                          {formatNumber(s.request_count)} طلب
                          {s.last_error ? ` · ${s.last_error}` : ''}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
                        {(() => {
                          const stamp = formatStamp(s.last_checked_at, now);
                          return stamp.anomaly ? (
                            <StatusChip label={stamp.text} tone="error" />
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              sx={{ whiteSpace: 'nowrap' }}
                              title={formatDateTime(s.last_checked_at)}
                            >
                              {stamp.text}
                            </Typography>
                          );
                        })()}
                        <StatusChip label={meta.label} tone={meta.tone} />
                      </Stack>
                    </Box>
                  );
                })}
                {degraded.length > 6 && (
                  <Typography variant="caption" color="text.secondary" sx={{ pt: 1, textAlign: 'center' }}>
                    و{formatNumber(degraded.length - 6)} نظامًا آخر
                  </Typography>
                )}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* ---------- Sectors + integrations ---------- */}
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid item xs={12} lg={7}>
          <SectionCard
            title="أداء القطاعات"
            subtitle="الأنظمة النشطة وحالة الاتصال لكل قطاع"
            sx={{ height: '100%' }}
            action={
              <Button size="small" onClick={() => navigate('/dashboard/national/it/sectors-performance')}>
                التقرير الكامل
              </Button>
            }
          >
            {loading ? (
              <Stack spacing={1.5}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} height={44} />
                ))}
              </Stack>
            ) : (
              <Stack spacing={1.5}>
                {sectors.map((s) => {
                  const conn = CONNECTIVITY[s.connectivity] ?? { label: s.connectivity, tone: 'neutral' as Tone, color: '#78948b' };
                  const pct = sharePercent(s.active_systems, s.total_systems);
                  return (
                    <Box key={s.id}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {s.name_ar}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {formatNumber(s.active_systems)}/{formatNumber(s.total_systems)} نظام
                          </Typography>
                          <StatusChip label={conn.label} tone={conn.tone} />
                        </Stack>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        aria-label={`نسبة الأنظمة النشطة في ${s.name_ar}: ${Math.round(pct)}%`}
                        sx={{
                          height: 7,
                          borderRadius: 99,
                          bgcolor: 'rgba(16,40,34,0.07)',
                          '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: conn.color },
                        }}
                      />
                      {(s.offline_systems > 0 || s.critical_tickets > 0) && (
                        <Typography variant="caption" sx={{ ...metaSx, color: 'error.dark', mt: 0.5, display: 'block' }}>
                          {s.offline_systems > 0 && `${formatNumber(s.offline_systems)} متوقف`}
                          {s.offline_systems > 0 && s.critical_tickets > 0 && ' · '}
                          {s.critical_tickets > 0 && `${formatNumber(s.critical_tickets)} تذكرة حرجة`}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={5}>
          <SectionCard
            title="التكامل الحكومي"
            subtitle="حالة المزامنة مع الجهات الخارجية"
            sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            {loading ? (
              <Stack spacing={1}>
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} height={44} />
                ))}
              </Stack>
            ) : (
              <>
                <StatusBar segments={integrationSegments} ariaLabel="توزيع حالة التكاملات" height={8} />
                <Stack spacing={0.25} sx={{ mt: 1.5, flex: 1 }}>
                  {integrations.map((i) => {
                    const meta = INTEGRATION_STATUS[i.status] ?? { label: i.status, tone: 'neutral' as Tone, color: '#78948b' };
                    return (
                      <Box key={i.id} sx={rowSx}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                            {i.name_ar}
                          </Typography>
                          <Typography variant="caption" sx={metaSx} color="text.secondary" noWrap>
                            {i.error_count > 0 ? `${formatNumber(i.error_count)} أخطاء` : 'سليم'}
                            {' · '}
                            {formatStamp(i.last_sync_at, now).text}
                          </Typography>
                        </Box>
                        <StatusChip label={meta.label} tone={meta.tone} />
                      </Box>
                    );
                  })}
                </Stack>
              </>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {/* ---------- Recent tickets ---------- */}
      <Box sx={{ mt: 2 }}>
        <SectionCard
          title="أحدث تذاكر الدعم"
          subtitle="آخر التذاكر المسجّلة على المستوى القومي"
          action={
            tickets.length > 0 ? (
              <Button size="small" onClick={() => navigate('/dashboard/national/it/systems?tab=tickets')}>
                كل التذاكر
              </Button>
            ) : null
          }
        >
          {loading ? (
            <Stack spacing={1}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={48} />
              ))}
            </Stack>
          ) : tickets.length === 0 ? (
            <EmptyState icon={<ConfirmationNumberIcon />} title="لا توجد تذاكر" description="لم تُسجَّل أي تذاكر دعم حتى الآن." />
          ) : (
            <Stack spacing={0.5}>
              {tickets.map((t) => {
                const pr = PRIORITY[t.priority] ?? { label: t.priority, tone: 'neutral' as Tone };
                const st = TICKET_STATUS[t.status] ?? { label: t.status, tone: 'neutral' as Tone };
                return (
                  <Box
                    key={t.id}
                    sx={{
                      ...rowSx,
                      flexWrap: { xs: 'wrap', sm: 'nowrap' },
                      gap: 1.5,
                      borderBottom: '1px solid rgba(16,40,34,0.06)',
                      borderRadius: 0,
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                          {t.subject}
                        </Typography>
                        <StatusChip label={pr.label} tone={pr.tone} size="small" />
                      </Stack>
                      <Typography variant="caption" sx={metaSx} color="text.secondary" noWrap>
                        <Box component="span" sx={{ fontFamily: 'monospace' }}>{t.ticket_no}</Box>
                      </Typography>
                    </Box>
                    <StatusChip label={st.label} tone={st.tone} />
                  </Box>
                );
              })}
            </Stack>
          )}
        </SectionCard>
      </Box>
    </Box>
  );
};

export default NationalItDashboardPage;
