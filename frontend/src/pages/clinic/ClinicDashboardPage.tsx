import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import InsightsIcon from '@mui/icons-material/Insights';
import MenuItem from '@mui/material/MenuItem';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import { EmptyState } from '../../components/common';
import KpiCard from '../../components/dashboard/KpiCard';
import { ConfirmDialog, StatusChip } from '../../components/ui';
import {
  acceptReferral,
  closeVisit,
  getClinicDashboard,
  getClinicReport,
  getClinics,
  getClinicVisits,
  getIsolations,
  getReferrals,
  holdReferral,
  releaseReferral,
  rejectReferral,
} from '../../api/endpoints/clinic';
import type { Clinic, ClinicDashboard, ClinicReferral, ClinicReport, ClinicVisit, IsolationRow } from '../../types/clinic';
import { formatDateTime, formatDate } from '../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';
import { referralStatus } from '../../utils/status';
import { getHealthStatusMeta, getIsolationTypeMeta } from '../../utils/clinicStatus';
import { GlassPanel, NotificationPanel, PassportChip, PersonAvatar, QueueRail, type NotifItem, ScreenReaderText, SectionHeader, type QueueRailItem } from './ui';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { ReferralDecisionDrawer } from './ReferralDecisionDrawer';

const DONUT_ORDER = ['PENDING', 'PRE_ACCEPT', 'ACCEPTED', 'REJECTED', 'COMPLETED'] as const;
const DONUT_COLORS: Record<string, string> = {
  PENDING: '#b7791f',
  PRE_ACCEPT: '#0891b2',
  ACCEPTED: '#2f6dd0',
  REJECTED: '#b3261e',
  COMPLETED: '#0c7f6a',
};

const VISIT_PHASES = ['REGISTERED', 'TRIAGED', 'EXAMINED', 'LABORATORY', 'DECISION', 'CERTIFICATE'] as const;

const phaseColor: Record<string, string> = {
  REGISTERED: '#8a8f98',
  TRIAGED: '#b7791f',
  EXAMINED: '#0c7f6a',
  LABORATORY: '#2f6dd0',
  DECISION: '#7b4fb3',
  CERTIFICATE: '#0e7490',
  CLOSED: '#c63a3a',
};

const dayKey = (iso: string): string => iso.slice(0, 10);

const buildActivity = (visits: ClinicVisit[], locale = 'ar') => {
  const now = new Date();
  const days: { date: string; label: string; opened: number; closed: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    days.push({
      date: `${year}-${month}-${day}`,
      label: d.toLocaleDateString(locale, { weekday: 'long' }),
      opened: 0,
      closed: 0,
    });
  }
  const byDate = new Map(days.map((d) => [d.date, d]));
  visits.forEach((v) => {
    if (v.opened_at && byDate.has(dayKey(v.opened_at))) byDate.get(dayKey(v.opened_at))!.opened += 1;
    if (v.closed_at && byDate.has(dayKey(v.closed_at))) byDate.get(dayKey(v.closed_at))!.closed += 1;
  });
  return days;
};

export const ClinicDashboardPage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isolationTypeMeta = useMemo(() => getIsolationTypeMeta(t), [t]);
  const healthStatusMeta = useMemo(() => getHealthStatusMeta(t), [t]);
  const phaseShortLabel = useMemo<Record<string, string>>(
    () => ({
      REGISTERED: t('clinic.dashboard.phase.registered'),
      TRIAGED: t('clinic.dashboard.phase.triaged'),
      EXAMINED: t('clinic.dashboard.phase.examined'),
      LABORATORY: t('clinic.dashboard.phase.laboratory'),
      DECISION: t('clinic.dashboard.phase.decision'),
      CERTIFICATE: t('clinic.dashboard.phase.certificate'),
      CLOSED: t('clinic.dashboard.phase.closed'),
    }),
    [t]
  );
  const SECTIONS = useMemo(
    () =>
      [
        { id: 'overview', label: t('clinic.dashboard.sections.overview'), icon: <MedicalServicesIcon fontSize="small" /> },
        { id: 'referrals', label: t('clinic.dashboard.sections.referrals'), icon: <PendingActionsIcon fontSize="small" /> },
        { id: 'visits', label: t('clinic.dashboard.sections.visits'), icon: <ScheduleIcon fontSize="small" /> },
        { id: 'charts', label: t('clinic.dashboard.sections.charts'), icon: <InsightsIcon fontSize="small" /> },
        { id: 'isolation', label: t('clinic.dashboard.sections.isolation'), icon: <VaccinesIcon fontSize="small" /> },
        { id: 'report', label: t('clinic.dashboard.sections.report'), icon: <HealthAndSafetyIcon fontSize="small" /> },
      ] as const,
    [t]
  );
  const { user } = useAuth();
  const [data, setData] = useState<ClinicDashboard | null>(null);
  const [referrals, setReferrals] = useState<ClinicReferral[]>([]);
  const [visits, setVisits] = useState<ClinicVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<ClinicReferral | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [decisionTarget, setDecisionTarget] = useState<ClinicReferral | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [acceptedVisit, setAcceptedVisit] = useState<ClinicVisit | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const nextRef = useRef<ClinicReferral | null>(null);
  const [closeTarget, setCloseTarget] = useState<ClinicVisit | null>(null);
  const [closing, setClosing] = useState(false);
  const [visitPhase, setVisitPhase] = useState<string>('ALL');
  const [isolations, setIsolations] = useState<IsolationRow[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<string>('');
  const [clinicReport, setClinicReport] = useState<ClinicReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [showCharts, setShowCharts] = useState(false);
  const chartsBoxRef = useRef<HTMLDivElement | null>(null);

  const { active, register, scrollTo } = useCommandSections(
    SECTIONS as unknown as CommandSectionDef[],
    [loading]
  );

  const load = (light = false) => {
    if (!light) setLoading(true);
    Promise.allSettled([
      light ? Promise.resolve(null) : getClinicDashboard(),
      getReferrals({ page_size: 200, ordering: '-created_at' }),
      getClinicVisits({ page_size: 200, ordering: '-opened_at' }),
      getIsolations({ page_size: 50, status: 'ACTIVE', ordering: '-started_at' }),
      light ? Promise.resolve(null) : getClinics({ page_size: 200 }),
    ]).then(([dash, refs, visitsRes, isoRes, clinicsRes]) => {
      if (dash.status === 'fulfilled' && dash.value) setData(dash.value.data.data);
      if (refs.status === 'fulfilled') setReferrals(refs.value.data.data.results ?? []);
      if (visitsRes.status === 'fulfilled') setVisits(visitsRes.value.data.data.results ?? []);
      if (isoRes.status === 'fulfilled') setIsolations(isoRes.value.data.data.results ?? []);
      if (clinicsRes.status === 'fulfilled' && clinicsRes.value) {
        const c = clinicsRes.value.data.data.results ?? [];
        setClinics(c);
        if (c.length > 0 && !selectedClinic) setSelectedClinic(c[0].id);
      }
      setLastUpdated(new Date().toLocaleTimeString(i18n.language || 'ar', { hour: '2-digit', minute: '2-digit' }));
    }).finally(() => {
      if (!light) setLoading(false);
    });
  };

  const loadReport = (id: string) => {
    if (!id) return;
    setReportLoading(true);
    getClinicReport(id)
      .then((res) => setClinicReport(res.data.data))
      .catch(() => {
        notifyError(t('clinic.dashboard.errors.loadReportFailed'));
        setClinicReport(null);
      })
      .finally(() => setReportLoading(false));
  };

  useEffect(() => {
    if (selectedClinic) loadReport(selectedClinic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClinic]);

  useEffect(() => {
    const el = chartsBoxRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShowCharts(true);
          obs.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    load();
  }, []);

  const pickNext = (justAccepted: ClinicReferral): ClinicReferral | null => {
    const actionable = (s: string | undefined) =>
      s === 'PENDING' || s === 'PRE_ACCEPT';
    return referrals.find((r) => actionable(r.status) && r.id !== justAccepted.id) ?? null;
  };

  const handleDrawerAccept = async (referral: ClinicReferral) => {
    if (deciding) return;
    setDeciding(true);
    try {
      const res = await acceptReferral(referral.id);
      const visit = res.data.data;
      nextRef.current = pickNext(referral);
      setHasNext(Boolean(nextRef.current));
      setAcceptedVisit(visit);
      notifySuccess(t('clinic.dashboard.messages.referralAccepted'));
      load(true);
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.dashboard.errors.acceptReferralFailed')));
    } finally {
      setDeciding(false);
    }
  };

  const handleDrawerHold = async (referral: ClinicReferral) => {
    if (deciding) return;
    setDeciding(true);
    try {
      await holdReferral(referral.id);
      notifySuccess(t('clinic.dashboard.messages.referralHeld'));
      setDecisionTarget(null);
      setAcceptedVisit(null);
      load(true);
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.dashboard.errors.holdReferralFailed')));
    } finally {
      setDeciding(false);
    }
  };

  const handleDrawerRelease = async (referral: ClinicReferral) => {
    if (deciding) return;
    setDeciding(true);
    try {
      await releaseReferral(referral.id);
      notifySuccess(t('clinic.dashboard.messages.referralReleased'));
      setDecisionTarget(null);
      setAcceptedVisit(null);
      load(true);
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.dashboard.errors.releaseReferralFailed')));
    } finally {
      setDeciding(false);
    }
  };

  const handleProcessNext = () => {
    const nextReferral = nextRef.current;
    setAcceptedVisit(null);
    setHasNext(false);
    nextRef.current = null;
    if (nextReferral) {
      setDecisionTarget(nextReferral);
    } else {
      setDecisionTarget(null);
    }
    load(true);
  };

  const openVisitFile = (visit: ClinicVisit) => {
    setDecisionTarget(null);
    setAcceptedVisit(null);
    navigate(`/app/clinic/visits/${visit.id}`);
  };

  const handleCloseVisit = async () => {
    if (!closeTarget || closing) return;
    setClosing(true);
    try {
      await closeVisit(closeTarget.id, {
        summary: t('clinic.dashboard.messages.visitClosedBy', {
          by: user?.full_name || t('common.fallback.doctor'),
        }),
      });
      notifySuccess(t('clinic.dashboard.messages.visitClosed'));
      setCloseTarget(null);
      load(true);
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.dashboard.errors.closeVisitFailed')));
    } finally {
      setClosing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || rejecting) return;
    setRejecting(true);
    try {
      await rejectReferral(rejectTarget.id, rejectReason.trim() ? { notes: rejectReason.trim() } : {});
      notifySuccess(t('clinic.dashboard.messages.referralRejected'));
      setRejectTarget(null);
      setRejectReason('');
      load(true);
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.dashboard.errors.rejectReferralFailed')));
    } finally {
      setRejecting(false);
    }
  };

  const handleDrawerReject = async (referral: ClinicReferral, reason: string) => {
    if (deciding) return;
    setDeciding(true);
    try {
      await rejectReferral(referral.id, reason ? { notes: reason } : {});
      notifySuccess(t('clinic.dashboard.messages.referralRejected'));
      setDecisionTarget(null);
      load(true);
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.dashboard.errors.rejectReferralFailed')));
    } finally {
      setDeciding(false);
    }
  };

  const today = new Date().toLocaleDateString(i18n.language || 'ar', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const stats = data?.stats;
  const queuePending = referrals.filter((r) => r.status === 'PENDING').length;
  const queueHeld = referrals.filter((r) => r.status === 'PRE_ACCEPT').length;
  const openVisits = visits.filter((v) => v.visit_status === 'OPEN');
  const awaitingDecision = openVisits.filter(
    (v) => v.phase === 'DECISION' || v.phase === 'CERTIFICATE'
  ).length;
  const shownVisits = visitPhase === 'ALL' ? openVisits : openVisits.filter((v) => v.phase === visitPhase);

  const railItems = useMemo<QueueRailItem[]>(
    () => [
      { id: 'overview', label: t('clinic.dashboard.sections.overview'), icon: <MedicalServicesIcon fontSize="small" /> },
      { id: 'referrals', label: t('clinic.dashboard.sections.referrals'), icon: <PendingActionsIcon fontSize="small" />, count: queuePending, tone: '#b7791f', hint: t('clinic.dashboard.rail.hintPending') },
      { id: 'visits', label: t('clinic.dashboard.sections.visits'), icon: <ScheduleIcon fontSize="small" />, count: openVisits.length, tone: '#0c7f6a', hint: t('clinic.dashboard.rail.hintProgress') },
      { id: 'charts', label: t('clinic.dashboard.sections.charts'), icon: <InsightsIcon fontSize="small" /> },
      { id: 'isolation', label: t('clinic.dashboard.rail.isolation'), icon: <VaccinesIcon fontSize="small" />, count: isolations.length, tone: '#7b4fb3', hint: t('clinic.dashboard.rail.hintActive') },
      { id: 'report', label: t('clinic.dashboard.rail.report'), icon: <HealthAndSafetyIcon fontSize="small" /> },
    ],
    [t, queuePending, openVisits, isolations]
  );

  const notifItems = useMemo<NotifItem[]>(
    () =>
      [
        {
          id: 'decisions',
          label: t('clinic.dashboard.notif.decisions.label'),
          detail: t('clinic.dashboard.notif.decisions.detail'),
          count: queuePending,
          tone: '#b7791f',
          icon: <PendingActionsIcon fontSize="small" />,
          onClick: () => scrollTo('referrals'),
        },
        {
          id: 'held',
          label: t('clinic.dashboard.notif.held.label'),
          detail: t('clinic.dashboard.notif.held.detail'),
          count: queueHeld,
          tone: '#0891b2',
          icon: <ScheduleIcon fontSize="small" />,
          onClick: () => scrollTo('referrals'),
        },
        {
          id: 'decision-visits',
          label: t('clinic.dashboard.notif.decisionVisits.label'),
          detail: t('clinic.dashboard.notif.decisionVisits.detail'),
          count: awaitingDecision,
          tone: '#2f6dd0',
          icon: <HealthAndSafetyIcon fontSize="small" />,
          onClick: () => scrollTo('visits'),
        },
        {
          id: 'isolation',
          label: t('clinic.dashboard.notif.isolation.label'),
          detail: t('clinic.dashboard.notif.isolation.detail'),
          count: isolations.length,
          tone: '#7b4fb3',
          icon: <VaccinesIcon fontSize="small" />,
          onClick: () => scrollTo('isolation'),
        },
      ].filter((n) => n.count > 0),
    [t, queuePending, queueHeld, awaitingDecision, isolations, scrollTo]
  );

  const kpis = useMemo(
    () => [
      {
        value: loading ? '...' : queuePending,
        label: t('clinic.dashboard.kpi.yourDecisions'),
        icon: <PendingActionsIcon />,
        accent: 'warning.main',
        trend: stats
          ? { label: t('clinic.dashboard.kpi.trend.inReview', { count: queueHeld }) }
          : undefined,
      },
      {
        value: loading ? '...' : openVisits.length,
        label: t('clinic.dashboard.kpi.openVisits'),
        icon: <MedicalServicesIcon />,
        accent: 'primary.main',
        trend: stats
          ? { label: t('clinic.dashboard.kpi.trend.ofClosed', { count: stats.closed_visits }) }
          : undefined,
      },
      {
        value: loading ? '...' : awaitingDecision,
        label: t('clinic.dashboard.kpi.awaitingDecision'),
        icon: <ScheduleIcon />,
        accent: 'info.main',
      },
      {
        value: loading || !stats ? '...' : stats.completed_today,
        label: t('clinic.dashboard.kpi.completedToday'),
        icon: <EventAvailableIcon />,
        accent: 'success.main',
      },
      {
        value: loading || !stats ? '...' : stats.total_patients,
        label: t('clinic.dashboard.kpi.patients'),
        icon: <GroupsIcon />,
        accent: 'neutral',
        trend: stats
          ? { label: t('clinic.dashboard.kpi.trend.inIsolation', { count: isolations.length }) }
          : undefined,
      },
    ],
    [t, loading, queuePending, queueHeld, openVisits, awaitingDecision, stats, isolations]
  );

  const donut = useMemo(() => {
    const counts = Object.fromEntries(DONUT_ORDER.map((s) => [s, 0])) as Record<string, number>;
    referrals.forEach((r) => {
      if (r.status in counts) counts[r.status] += 1;
    });
    const total = DONUT_ORDER.reduce((sum, s) => sum + counts[s], 0);
    return {
      total,
      items: DONUT_ORDER.map((s) => ({
        status: s,
        value: counts[s],
        meta: referralStatus[s],
        color: DONUT_COLORS[s],
      })),
    };
  }, [referrals]);

  const activity = useMemo(() => buildActivity(visits, i18n.language || 'ar'), [visits, i18n.language]);

  const tableRows = referrals.slice(0, 10);

  return (
    <Box>
      {/* ===== Context bar (replaces hero) ===== */}
      <Box
        sx={{
          mb: 2.5,
          borderRadius: 3.5,
          border: '1px solid rgba(16,40,34,0.07)',
          bgcolor: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(18px) saturate(1.35)',
          boxShadow: '0 1px 2px rgba(16,40,34,0.03), 0 10px 30px rgba(16,40,34,0.06)',
          p: { xs: 2, md: 2.25 },
          display: 'flex',
          flexWrap: 'wrap',
          rowGap: 1.5,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              background: 'linear-gradient(135deg, #075447, #0c7f6a)',
              color: '#fff',
              boxShadow: '0 10px 22px -10px rgba(7,84,71,0.6)',
            }}
          >
            <HealthAndSafetyIcon sx={{ fontSize: 26 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
              {t('clinic.dashboard.header.title')}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <ScheduleIcon sx={{ fontSize: 14, opacity: 0.7 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {today}
              </Typography>
              {user?.full_name && (
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  · {user.full_name}
                </Typography>
              )}
            </Stack>
          </Box>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ flexShrink: 0 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PersonAddAlt1Icon />}
            onClick={() => navigate('/app/clinic/register')}
            sx={{ fontWeight: 700, borderRadius: 2.5, color: 'primary.main', borderColor: 'rgba(12,127,106,0.45)' }}
          >
            {t('clinic.dashboard.actions.registerCase')}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<ArrowForwardIcon />}
            onClick={() => navigate('/app/clinic?tab=referrals')}
            sx={{
              fontWeight: 700,
              borderRadius: 2.5,
              bgcolor: 'primary.main',
              boxShadow: '0 8px 20px -10px rgba(12,127,106,0.6)',
              '&:hover': { bgcolor: '#0a6b58' },
            }}
          >
            {t('clinic.dashboard.actions.manageReferrals')}
          </Button>
          <Tooltip title={t('clinic.dashboard.actions.refresh')}>
            <Box component="span" sx={{ display: 'inline-flex' }}>
              <IconButton
                aria-label={t('clinic.dashboard.actions.refresh')}
                size="small"
                onClick={() => load()}
                disabled={loading}
                sx={{ color: 'primary.main', bgcolor: 'rgba(12,127,106,0.08)', '&:hover': { bgcolor: 'rgba(12,127,106,0.16)' } }}
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </Box>
          </Tooltip>
        </Stack>
      </Box>

      {/* ===== Canvas: queue rail + main + notification rail ===== */}
      <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
        {/* Queue rail (lg+) */}
        <Box
          component="nav"
          aria-label={t('clinic.shared.queueRail.label')}
          sx={{
            display: { xs: 'none', lg: 'block' },
            position: 'sticky',
            top: { lg: 140, md: 140 },
            width: 208,
            flexShrink: 0,
          }}
        >
          <QueueRail items={railItems} active={active} onNavigate={scrollTo} />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>

      {/* ===== Section rail fallback (< lg) ===== */}
      <Box sx={{ display: { xs: 'block', lg: 'none' }, mb: 2 }}>
        <CommandSectionRail
          sections={SECTIONS as unknown as CommandSectionDef[]}
          active={active}
          onNavigate={scrollTo}
          accent="primary.main"
          label={t('clinic.shared.queueRail.label')}
        />
      </Box>

      {/* ===== KPI Cards ===== */}
      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '140px', display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        {kpis.map((kpi) => (
          <Box key={kpi.label} sx={{ flex: '1 1 170px', minWidth: 170 }}>
            <KpiCard {...kpi} />
          </Box>
        ))}
      </Box>

      {/* ===== Notifications inline (< xl) ===== */}
      <Box sx={{ display: { xs: 'block', xl: 'none' }, mb: 4 }}>
        <NotificationPanel items={notifItems} />
      </Box>

      {/* ===== Decision Table ===== */}
      <Box component="section" ref={register('referrals')} data-section="referrals" sx={{ scrollMarginTop: '140px', mb: 4 }}>
        <GlassPanel accent="linear-gradient(90deg, #075447, transparent)">
          <Box sx={{ p: { xs: 2, md: 3 } }}>
            <SectionHeader
              icon={<PendingActionsIcon fontSize="small" />}
              title={t('clinic.dashboard.sections.referrals')}
              count={referrals.length}
              action={
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/app/clinic?tab=referrals')}
                  sx={{ fontWeight: 700, textTransform: 'none' }}
                >
                  {t('clinic.dashboard.actions.viewAll')}
                </Button>
              }
            />
            {loading ? (
              <Stack spacing={1.5}>
                <Skeleton variant="rounded" height={52} />
                <Skeleton variant="rounded" height={52} />
                <Skeleton variant="rounded" height={52} />
              </Stack>
            ) : tableRows.length === 0 ? (
              <EmptyState
                icon={<MedicalServicesIcon sx={{ fontSize: 40 }} />}
                title={t('clinic.dashboard.table.emptyTitle')}
                description={t('clinic.dashboard.table.emptyDesc')}
              />
            ) : (
              <TableContainer sx={{ mt: 1, overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 760 }}>
                  <TableHead>
                    <TableRow sx={{ '& th': { bgcolor: 'rgba(16,40,34,0.03)', color: 'text.secondary', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.02em' } }}>
                      <TableCell>{t('clinic.dashboard.table.cols.traveler')}</TableCell>
                      <TableCell>{t('clinic.dashboard.table.cols.symptoms')}</TableCell>
                      <TableCell>{t('clinic.dashboard.table.cols.station')}</TableCell>
                      <TableCell>{t('clinic.dashboard.table.cols.status')}</TableCell>
                      <TableCell align="center">{t('clinic.dashboard.table.cols.actions')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tableRows.map((r) => {
                      const meta = referralStatus[r.status];
                      const actionable = r.status === 'PENDING' || r.status === 'PRE_ACCEPT';
                      const fever = (r.body_temperature ?? 0) >= 38;
                      const symptoms = r.observed_symptoms ?? [];
                      return (
                        <TableRow
                          key={r.id}
                          hover={actionable}
                          onClick={() => actionable && setDecisionTarget(r)}
                          onKeyDown={(e) => {
                            if (actionable && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              setDecisionTarget(r);
                            }
                          }}
                          role={actionable ? 'button' : undefined}
                          tabIndex={actionable ? 0 : undefined}
                          aria-label={actionable ? t('clinic.dashboard.table.openDecisionAria', { name: r.traveler_name }) : undefined}
                          sx={{
                            cursor: actionable ? 'pointer' : 'default',
                            '& td': { borderBottomColor: 'rgba(16,40,34,0.07)', py: 1.25 },
                            ...(actionable
                              ? { '&:focus-visible': { outline: 'none', boxShadow: 'inset 0 0 0 4px rgba(12,127,106,0.35)' } }
                              : {}),
                          }}
                        >
                          <TableCell>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                              <PersonAvatar name={r.traveler_name} size={36} square />
                              <Box sx={{ minWidth: 0, maxWidth: 200 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: 13 }} noWrap>
                                  {r.traveler_name}
                                </Typography>
                                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.25 }} flexWrap="wrap">
                                  <PassportChip number={r.passport_number} />
                                  {fever && <Chip size="small" label={t('clinic.dashboard.chips.fever')} color="error" sx={{ height: 22, fontWeight: 700, fontSize: 12 }} />}
                                  {r.queue_no != null && <Chip size="small" label={t('clinic.dashboard.chips.queueTurn', { no: r.queue_no })} sx={{ height: 22, fontWeight: 700, fontSize: 12 }} />}
                                </Stack>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ minWidth: 220 }}>
                            <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap>
                              {r.body_temperature != null && (
                                <Chip
                                  size="small"
                                  icon={<ThermostatIcon sx={{ fontSize: 13 }} />}
                                  label={`${r.body_temperature}°م`}
                                  color={fever ? 'error' : 'default'}
                                  variant="outlined"
                                  sx={{ height: 22, fontWeight: 700, fontSize: 12 }}
                                />
                              )}
                              {symptoms.slice(0, 3).map((s) => (
                                <Chip
                                  key={s}
                                  size="small"
                                  label={s}
                                  variant="outlined"
                                  color={fever ? 'error' : 'warning'}
                                  sx={{ height: 22, fontWeight: 600, fontSize: 12 }}
                                />
                              ))}
                              {symptoms.length === 0 && r.body_temperature == null && (
                                <Typography variant="caption" color="text.secondary">
                                  {t('clinic.dashboard.table.noSymptoms')}
                                </Typography>
                              )}
                              {symptoms.length > 3 && (
                                <Typography variant="caption" color="text.secondary">
                                  +{symptoms.length - 3}
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 12.5 }}>{r.port_name || '—'}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                              {formatDateTime(r.created_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <StatusChip label={meta?.label ?? r.status} tone={meta?.tone ?? 'neutral'} size="small" />
                          </TableCell>
<TableCell align="center" sx={{ flex: 1, minWidth: 0 }}>
                            {actionable ? (
                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                <Tooltip title={t('clinic.dashboard.referrals.viewExamination')}>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    aria-label={t('clinic.dashboard.referrals.viewExaminationAria', { name: r.traveler_name })}
                                    onClick={(e) => { e.stopPropagation(); setDecisionTarget(r); }}
                                    sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
                                  >
                                    <VisibilityIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('clinic.dashboard.referrals.acceptReferral')}>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    aria-label={t('clinic.dashboard.referrals.acceptAria', { name: r.traveler_name })}
                                    onClick={(e) => { e.stopPropagation(); setDecisionTarget(r); }}
                                    sx={{ bgcolor: 'rgba(12,127,106,0.1)', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
                                  >
                                    <CheckCircleOutlineIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title={t('clinic.dashboard.referrals.rejectReferral')}>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    aria-label={t('clinic.dashboard.referrals.rejectAria', { name: r.traveler_name })}
                                    onClick={(e) => { e.stopPropagation(); setRejectReason(''); setRejectTarget(r); }}
                                    sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}
                                  >
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            ) : (
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                {r.status === 'COMPLETED' ? t('clinic.dashboard.table.completed') : '—'}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </GlassPanel>
      </Box>

      {/* ===== Open visits ===== */}
      <Box component="section" ref={register('visits')} data-section="visits" sx={{ scrollMarginTop: '140px' }}>
      <GlassPanel accent="linear-gradient(90deg, #0c7f6a, transparent)" sx={{ mb: 4 }}>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <SectionHeader
            icon={<MedicalServicesIcon fontSize="small" />}
            title={t('clinic.dashboard.sections.visits')}
            count={openVisits.length}
            action={
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/app/clinic?tab=visits')}
                sx={{ fontWeight: 700, textTransform: 'none' }}
              >
                {t('clinic.dashboard.actions.allVisits')}
              </Button>
            }
          />
          {loading ? (
            <Grid container spacing={2}>
              {[0, 1, 2].map((i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Skeleton variant="rounded" height={96} />
                </Grid>
              ))}
            </Grid>
          ) : openVisits.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2.5, textAlign: 'center' }}>
              {t('clinic.dashboard.visits.emptyNote')}
            </Typography>
          ) : (
            <>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
                <Chip
                  size="small"
                  label={t('clinic.dashboard.visits.allChip')}
                  onClick={() => setVisitPhase('ALL')}
                  variant={visitPhase === 'ALL' ? 'filled' : 'outlined'}
                  color={visitPhase === 'ALL' ? 'primary' : 'default'}
                  sx={{ fontWeight: 700, height: 26 }}
                />
                {VISIT_PHASES.map((p) => {
                  const n = openVisits.filter((v) => v.phase === p).length;
                  if (n === 0) return null;
                  const c = phaseColor[p] || '#0c7f6a';
                  const selected = visitPhase === p;
                  return (
                    <Chip
                      key={p}
                      size="small"
                      label={`${phaseShortLabel[p] || p} (${n})`}
                      onClick={() => setVisitPhase(p)}
                      variant={selected ? 'filled' : 'outlined'}
                      sx={{
                        fontWeight: 700,
                        height: 26,
                        bgcolor: selected ? `${c}1f` : 'rgba(16,40,34,0.05)',
                        color: selected ? c : 'inherit',
                        borderColor: selected ? c : 'rgba(16,40,34,0.18)',
                      }}
                    />
                  );
                })}
              </Stack>
              {shownVisits.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2.5, textAlign: 'center' }}>
                  {t('clinic.dashboard.visits.emptyPhase')}
                </Typography>
              ) : (
                <Grid container spacing={2}>
                  {shownVisits.map((v) => {
                    const pc = phaseColor[v.phase ?? ''] || '#0c7f6a';
                    const needsDecision = v.phase === 'DECISION' || v.phase === 'CERTIFICATE';
                    return (
                      <Grid item xs={12} sm={6} md={4} key={v.id}>
                        <Box
                          sx={{
                            p: 1.75,
                            height: '100%',
                            borderRadius: 3,
                            border: '1px solid rgba(16,40,34,0.07)',
                            borderInlineStart: `4px solid ${pc}`,
                            bgcolor: needsDecision ? 'rgba(47,109,208,0.05)' : 'rgba(255,255,255,0.72)',
                            transition: 'border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease',
                            '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: '0 8px 22px -12px rgba(16,40,34,0.35)',
                              transform: 'translateY(-1px)',
                            },
                          }}
                        >
                          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.25 }}>
                            <PersonAvatar name={v.traveler_name} size={40} />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>
                                {v.traveler_name}
                              </Typography>
                              <PassportChip number={v.passport_number} />
                            </Box>
                            <Chip
                              size="small"
                              label={phaseShortLabel[v.phase ?? ''] ?? v.phase}
                              sx={{ bgcolor: `${pc}1a`, color: pc, fontWeight: 700, height: 22 }}
                            />
                          </Stack>
                          <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                            <Tooltip title={t('clinic.dashboard.visits.openFile')}>
                              <IconButton
                                size="small"
                                color="primary"
                                aria-label={t('clinic.dashboard.visits.openFileAria', { name: v.traveler_name })}
                                onClick={() => navigate(`/app/clinic/visits/${v.id}`)}
                                sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
                              >
                                <MedicalServicesIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={t('clinic.dashboard.dialogs.closeVisit')}>
                              <IconButton
                                size="small"
                                color="error"
                                aria-label={t('clinic.dashboard.visits.closeVisitAria', { name: v.traveler_name })}
                                onClick={() => setCloseTarget(v)}
                                sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}
                              >
                                <CheckCircleOutlineIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </>
          )}
        </Box>
      </GlassPanel>
      </Box>

      {/* ===== Charts (lazy) ===== */}
      <Box component="section" ref={register('charts')} data-section="charts" sx={{ scrollMarginTop: '140px' }}>
      <Box ref={chartsBoxRef}>
      {showCharts ? (
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 4 }}>
        {/* Donut: referral funnel */}
        <Grid item xs={12} lg={5}>
          <GlassPanel accent="linear-gradient(90deg, #a86400, transparent)">
            <Box sx={{ p: { xs: 2, md: 3 } }} aria-label={t('clinic.dashboard.charts.funnelAria')}>
              <SectionHeader
                icon={<PendingActionsIcon fontSize="small" />}
                title={t('clinic.dashboard.charts.funnelTitle')}
                count={donut.total}
                tone="#a86400"
              />
              {loading ? (
                <Box sx={{ display: 'grid', placeItems: 'center', height: 260 }}>
                  <CircularProgress size={36} sx={{ color: 'primary.main' }} />
                </Box>
              ) : donut.total === 0 ? (
                <EmptyState
                  icon={<PendingActionsIcon sx={{ fontSize: 40 }} />}
                  title={t('clinic.dashboard.charts.emptyTitle')}
                  description={t('clinic.dashboard.charts.emptyDesc')}
                />
              ) : (
                <Box sx={{ position: 'relative', height: 220 }}>
                  <ScreenReaderText>
                    {t('clinic.dashboard.charts.srDonut', {
                      total: donut.total,
                      items: donut.items
                        .map((i) => `${i.meta?.label}: ${i.value}`)
                        .join(t('clinic.dashboard.charts.srDonutSep')),
                    })}
                  </ScreenReaderText>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donut.items}
                        dataKey="value"
                        nameKey="status"
                        innerRadius="62%"
                        outerRadius="92%"
                        paddingAngle={2}
                        stroke="none"
                      >
                        {donut.items.map((item) => (
                          <Cell key={item.status} fill={item.color} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        formatter={(value: number | string | Array<number | string>) => (
                          [value, t('clinic.dashboard.charts.referralUnit')]
                        )}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid rgba(16,40,34,0.1)',
                          boxShadow: '0 12px 30px -12px rgba(16,40,34,0.3)',
                          fontFamily: 'inherit',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      textAlign: 'center',
                      pointerEvents: 'none',
                    }}
                  >
                    <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
                      {donut.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t('clinic.dashboard.charts.referralUnit')}
                    </Typography>
                  </Box>
                </Box>
              )}
              {!loading && donut.total > 0 && (
                <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 2, justifyContent: 'center' }}>
                  {donut.items.map((item) => (
                    <Stack key={item.status} direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: item.color }} />
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {item.meta?.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({item.value})
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
          </GlassPanel>
        </Grid>

        {/* Area: 7-day activity */}
        <Grid item xs={12} lg={7}>
          <GlassPanel accent="linear-gradient(90deg, #0c7f6a, transparent)">
            <Box sx={{ p: { xs: 2, md: 3 } }} aria-label={t('clinic.dashboard.charts.activityAria')}>
              <SectionHeader
                icon={<EventAvailableIcon fontSize="small" />}
                title={t('clinic.dashboard.charts.activityTitle')}
                count={visits.length}
                action={
                  <Chip
                    size="small"
                    label={t('clinic.dashboard.charts.openedVsClosed')}
                    sx={{
                      bgcolor: 'rgba(12,127,106,0.08)',
                      color: 'text.secondary',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  />
                }
              />
              {loading ? (
                <Box sx={{ display: 'grid', placeItems: 'center', height: 260 }}>
                  <CircularProgress size={36} sx={{ color: 'primary.main' }} />
                </Box>
              ) : activity.every((d) => d.opened === 0 && d.closed === 0) ? (
                <EmptyState
                  icon={<EventAvailableIcon sx={{ fontSize: 40 }} />}
                  title={t('clinic.dashboard.charts.emptyActivityTitle')}
                  description={t('clinic.dashboard.charts.emptyActivityDesc')}
                />
              ) : (
                <Box sx={{ height: 260 }}>
                  <ScreenReaderText>
                    {t('clinic.dashboard.charts.srActivity', {
                      items: activity
                        .map((d) =>
                          t('clinic.dashboard.charts.srDay', {
                            label: d.label,
                            opened: d.opened,
                            closed: d.closed,
                          })
                        )
                        .join(t('clinic.dashboard.charts.srActivitySep')),
                    })}
                  </ScreenReaderText>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={activity} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="openedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0c7f6a" stopOpacity={0.32} />
                          <stop offset="95%" stopColor="#0c7f6a" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="closedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2f6dd0" stopOpacity={0.28} />
                          <stop offset="95%" stopColor="#2f6dd0" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(16,40,34,0.08)" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#44554f', fontWeight: 600 }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#44554f' }} tickLine={false} axisLine={false} />
                      <ChartTooltip
                        formatter={(value: number | string | Array<number | string>, name: string) => [
                          value,
                          name === 'opened' ? t('clinic.dashboard.kpi.openVisits') : t('clinic.dashboard.kpi.closedVisits'),
                        ]}
                        contentStyle={{
                          borderRadius: 12,
                          border: '1px solid rgba(16,40,34,0.1)',
                          boxShadow: '0 12px 30px -12px rgba(16,40,34,0.3)',
                          fontFamily: 'inherit',
                        }}
                      />
                      <Area type="monotone" dataKey="opened" stroke="#0c7f6a" strokeWidth={2.5} fill="url(#openedGrad)" />
                      <Area type="monotone" dataKey="closed" stroke="#2f6dd0" strokeWidth={2.5} fill="url(#closedGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </Box>
          </GlassPanel>
        </Grid>
      </Grid>
      ) : (
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, flexDirection: 'column', minHeight: 170, borderRadius: 3.5, border: '1px dashed rgba(16,40,34,0.14)', bgcolor: 'rgba(255,255,255,0.42)' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t('clinic.dashboard.charts.lazyHint')}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {t('clinic.dashboard.charts.lazyNote')}
          </Typography>
        </Box>
      )}
      </Box>
      </Box>

      {/* ===== العزل والحجر الصحي ===== */}
      <Box component="section" ref={register('isolation')} data-section="isolation" sx={{ scrollMarginTop: '140px' }}>
      <GlassPanel accent="linear-gradient(90deg, #7b4fb3, transparent)" sx={{ mb: 4 }}>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <SectionHeader
            icon={<VaccinesIcon fontSize="small" />}
            title={t('clinic.dashboard.sections.isolation')}
            count={isolations.length}
            action={
              <Button
                size="small"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/app/clinic/isolation')}
                sx={{ fontWeight: 700, textTransform: 'none' }}
              >
                {t('clinic.dashboard.actions.viewAll')}
              </Button>
            }
          />
          {loading ? (
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={52} />
              <Skeleton variant="rounded" height={52} />
            </Stack>
          ) : isolations.length === 0 ? (
            <EmptyState
              icon={<VaccinesIcon sx={{ fontSize: 40 }} />}
              title={t('clinic.dashboard.isolation.emptyTitle')}
              description={t('clinic.dashboard.isolation.emptyDesc')}
            />
          ) : (
            <TableContainer sx={{ borderRadius: 3, '& .MuiTableCell-root': { borderColor: 'rgba(16,40,34,0.08)' } }}>
              <Table size="small" aria-label={t('clinic.dashboard.sections.isolation')}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{t('clinic.dashboard.table.cols.traveler')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12, display: { xs: 'none', sm: 'table-cell' } }}>{t('clinic.dashboard.isolation.cols.type')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{t('clinic.dashboard.isolation.cols.health')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>{t('clinic.dashboard.isolation.cols.started')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isolations.slice(0, 5).map((r) => {
                    const type = isolationTypeMeta[r.isolation_type];
                    const health = healthStatusMeta[r.health_status];
                    return (
                      <TableRow key={r.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ py: 1.5 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <PersonAvatar name={r.traveler_name} size={38} square />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontWeight: 700, fontSize: 13.5 }} noWrap>
                                {r.traveler_name}
                              </Typography>
                              <PassportChip number={r.passport_number} />
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                          {type ? <StatusChip label={type.label} tone={type.tone} size="small" /> : r.isolation_type}
                        </TableCell>
                        <TableCell>
                          {health ? <StatusChip label={health.label} tone={health.tone} size="small" /> : (r.health_status ?? '—')}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {formatDate(r.start_date)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </GlassPanel>
      </Box>

      {/* ===== تقرير وحدات العيادة ===== */}
      <Box component="section" ref={register('report')} data-section="report" sx={{ scrollMarginTop: '140px' }}>
      <GlassPanel accent="linear-gradient(90deg, #a86400, transparent)" sx={{ mb: 4 }}>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <SectionHeader
            icon={<InsightsIcon fontSize="small" />}
            title={t('clinic.dashboard.sections.report')}
            tone="#a86400"
            action={
              <TextField
                select
                size="small"
                sx={{ minWidth: 280, bgcolor: 'rgba(255,255,255,0.7)' }}
                value={selectedClinic}
                onChange={(e) => setSelectedClinic(e.target.value)}
              >
                {clinics.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name_ar}</MenuItem>
                ))}
              </TextField>
            }
          />
          {reportLoading ? (
            <Stack spacing={1.5}>
              <Skeleton variant="rounded" height={52} />
              <Skeleton variant="rounded" height={52} />
            </Stack>
          ) : clinicReport ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ flex: '1 1 150px', minWidth: 150 }}>
                <KpiCard value={clinicReport.stats.total_visits} label={t('clinic.dashboard.report.totalVisits')} icon={<MedicalServicesIcon />} accent="success.main" />
              </Box>
              <Box sx={{ flex: '1 1 150px', minWidth: 150 }}>
                <KpiCard value={clinicReport.stats.open_visits} label={t('clinic.dashboard.kpi.openVisits')} icon={<ScheduleIcon />} accent="info.main" />
              </Box>
              <Box sx={{ flex: '1 1 150px', minWidth: 150 }}>
                <KpiCard value={clinicReport.stats.closed_visits} label={t('clinic.dashboard.kpi.closedVisits')} icon={<CheckCircleIcon />} accent="warning.main" />
              </Box>
              <Box sx={{ flex: '1 1 150px', minWidth: 150 }}>
                <KpiCard value={clinicReport.stats.isolated} label={t('clinic.dashboard.report.isolated')} icon={<VaccinesIcon />} accent="secondary.main" />
              </Box>
              <Box sx={{ flex: '1 1 150px', minWidth: 150 }}>
                <KpiCard value={clinicReport.stats.certificates} label={t('clinic.dashboard.report.certificates')} icon={<HealthAndSafetyIcon />} accent="info.main" />
              </Box>
              <Box sx={{ flex: '1 1 150px', minWidth: 150 }}>
                <KpiCard value={clinicReport.stats.patients} label={t('clinic.dashboard.report.uniquePatients')} icon={<GroupsIcon />} accent="success.main" />
              </Box>
              <Box sx={{ flex: '1 1 150px', minWidth: 150 }}>
                <KpiCard value={clinicReport.stats.completed_today} label={t('clinic.dashboard.report.completedToday')} icon={<EventAvailableIcon />} accent="warning.main" />
              </Box>
              <Box sx={{ flexBasis: '100%' }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Typography sx={{ fontWeight: 700, fontSize: 13, pt: 0.5 }}>{t('clinic.dashboard.report.phaseDistribution')}</Typography>
                  {Object.keys(clinicReport.stats.by_phase).length === 0 ? (
                    <Chip size="small" label={t('clinic.dashboard.report.noData')} variant="outlined" />
                  ) : (
                    Object.entries(clinicReport.stats.by_phase).map(([p, n]) => (
                      <Chip
                        key={p}
                        size="small"
                        label={`${phaseShortLabel[p] || p}: ${n}`}
                        sx={{ fontWeight: 700, bgcolor: `${phaseColor[p] || '#0c7f6a'}1a`, color: phaseColor[p] || '#0c7f6a' }}
                      />
                    ))
                  )}
                </Stack>
              </Box>
            </Box>
          ) : (
            <Typography color="text.secondary">{t('clinic.dashboard.report.empty')}</Typography>
          )}
        </Box>
      </GlassPanel>
      </Box>

        {/* ===== Footer ===== */}
        <Box
          sx={{
            mt: 3.5,
            pt: 2.5,
            borderTop: '1px dashed rgba(16,40,34,0.12)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            {t('clinic.dashboard.footer.updatedPrefix')}{lastUpdated || t('clinic.dashboard.footer.loading')}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            {t('clinic.dashboard.footer.brand')}
          </Typography>
        </Box>
        </Box>

        {/* Notification rail (xl+) */}
        <Box
          component="aside"
          aria-label={t('clinic.dashboard.a11y.notifRegion')}
          sx={{
            display: { xs: 'none', xl: 'block' },
            position: 'sticky',
            top: { lg: 140, md: 140 },
            width: 292,
            flexShrink: 0,
            mt: 0.25,
          }}
        >
          <NotificationPanel items={notifItems} />
        </Box>
      </Box>

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        tone="error"
        title={t('clinic.dashboard.referrals.rejectReferral')}
        message={
          rejectTarget
            ? t('clinic.dashboard.dialogs.rejectQuestion', { name: rejectTarget.traveler_name })
            : ''
        }
        confirmLabel={t('clinic.dashboard.dialogs.rejectConfirm')}
        loading={rejecting}
        onConfirm={handleReject}
        onClose={() => { setRejectTarget(null); setRejectReason(''); }}
      >
        <TextField
          label={t('clinic.dashboard.dialogs.rejectReason')}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          size="small"
          disabled={rejecting}
          sx={{ mt: 2 }}
        />
      </ConfirmDialog>
    <ConfirmDialog
        open={Boolean(closeTarget)}
        title={t('clinic.dashboard.dialogs.closeVisit')}
        message={
          closeTarget
            ? t('clinic.dashboard.dialogs.closeQuestion', { name: closeTarget.traveler_name })
            : ''
        }
        confirmLabel={t('clinic.dashboard.dialogs.closeVisit')}
        loading={closing}
        onConfirm={handleCloseVisit}
        onClose={() => setCloseTarget(null)}
      />

      <ReferralDecisionDrawer
        open={Boolean(decisionTarget) || Boolean(acceptedVisit)}
        referral={decisionTarget}
        submitting={deciding}
        acceptedVisit={acceptedVisit}
        hasNext={hasNext}
        onClose={() => setDecisionTarget(null)}
        onAccept={handleDrawerAccept}
        onReject={handleDrawerReject}
        onHold={handleDrawerHold}
        onRelease={handleDrawerRelease}
        onOpenVisit={openVisitFile}
        onProcessNext={handleProcessNext}
      />
    </Box>
  );
};

export default ClinicDashboardPage;