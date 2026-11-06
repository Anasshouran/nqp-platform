import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Skeleton from '@mui/material/Skeleton';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckIcon from '@mui/icons-material/Check';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CloseIcon from '@mui/icons-material/Close';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScienceIcon from '@mui/icons-material/Science';
import GroupsIcon from '@mui/icons-material/Groups';
import HealingIcon from '@mui/icons-material/Healing';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import AssignmentIcon from '@mui/icons-material/Assignment';
import {
  SectionCard,
  DataTable,
  StatusChip,
  ExportButton,
  PageTabs,
  FormDialog,
  FormTextField,
  FormSelect,
} from '../../components/uikit';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { formatDateTime } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import {
  caseSource,
  caseStatus,
  caseType,
  surveillanceAlertStatus as alertStatus,
  surveillanceAlertType as alertType,
  alertLevel,
  caseSeverity,
  contactStatus,
  contactType,
  investigationStatus,
  notificationTimeline,
  surveillanceMode,
} from '../../utils/status';
import {
  ackAlert,
  addContactFollowUp,
  closeAlert,
  createCase,
  createContact,
  createInvestigation,
  createWeeklyReport,
  getSurveillanceDashboard,
  listAlerts,
  listCases,
  listContacts,
  listInvestigations,
  listReportableDiseases,
  listWeeklyReports,
  respondAlert,
  runEwars,
  transitionCase,
} from '../../api/endpoints/surveillance';
import type {
  ContactTraceWrite,
  HealthCase,
  HealthCaseWrite,
  InvestigationWrite,
  ReportableDisease,
  SurveillanceAlert,
  SurveillanceDashboard,
  WeeklySurveillanceReportWrite,
} from '../../types/surveillance';
import { getMasterEntryPoints } from '../../api/endpoints/masterdata';
import { getSectors } from '../../api/endpoints/organization';
import type { MasterEntryPoint } from '../../types/masterdata';
import type { Sector } from '../../types/organization';
import apiClient from '../../api/client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import AssessmentIcon from '@mui/icons-material/Assessment';

interface Locality {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  sector: string;
}

interface HealthFacility {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  kind: string;
  locality: string | null;
  sector: string | null;
}

interface ContactRow {
  id: string;
  contact_number: string;
  index_case_number: string;
  person_name: string;
  contact_type: string;
  status: string;
  follow_up_days: number;
}

interface InvestigationRow {
  id: string;
  investigation_number: string;
  title: string;
  case_number: string | null;
  status: string;
  started_at: string;
}

interface WeeklyReportRow {
  id: string;
  report_number: string;
  period_start: string;
  period_end: string;
  facility_name: string | null;
  port_code: string | null;
  is_on_time: boolean;
  submitted_at: string;
}

const listSectors = getSectors;
const listEntryPoints = (params?: Record<string, unknown>) => getMasterEntryPoints(params);
const listLocalities = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Locality>>>('/organization/localities/', { params });
const listHealthFacilities = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<HealthFacility>>>('/master-data/health-facilities/', { params });

const todayArabic = () =>
  new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const blankCase: HealthCaseWrite = {
  case_type: 'SUSPECTED',
  status: 'UNDER_INVESTIGATION',
  severity: 'MODERATE',
  source: 'MANUAL',
  person_name: '',
  person_sex: 'U',
  symptoms: [],
};

const blankContact: ContactTraceWrite = {
  index_case: '',
  person_name: '',
  contact_type: 'FAMILY',
};

const blankInvestigation: InvestigationWrite = {
  title: '',
  status: 'OPEN',
};

const blankReport: WeeklySurveillanceReportWrite = {
  period_start: new Date().toISOString().slice(0, 10),
  period_end: new Date().toISOString().slice(0, 10),
  lines: [],
};

const SECTIONS = [
  { id: 'dashboard', label: 'surveillance.sections.dashboard', icon: <MonitorHeartIcon fontSize="small" /> },
  { id: 'cases', label: 'surveillance.sections.cases', icon: <HealingIcon fontSize="small" /> },
  { id: 'alerts', label: 'surveillance.sections.alerts', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'diseases', label: 'surveillance.sections.diseases', icon: <ScienceIcon fontSize="small" /> },
  { id: 'contacts', label: 'surveillance.sections.contacts', icon: <GroupsIcon fontSize="small" /> },
  { id: 'investigations', label: 'surveillance.sections.investigations', icon: <AssignmentIcon fontSize="small" /> },
  { id: 'reports', label: 'surveillance.sections.reports', icon: <AssessmentIcon fontSize="small" /> },
] as const;

const Kpi = ({ icon, value, label, accent }: { icon: React.ReactNode; value: number; label: string; accent: string }) => (
  <KpiCard icon={icon} value={value} label={label} accent={accent} />
);

const SurveillanceModulePage = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [dashboard, setDashboard] = useState<SurveillanceDashboard | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  const [cases, setCases] = useState<HealthCase[]>([]);
  const [alerts, setAlerts] = useState<SurveillanceAlert[]>([]);
  const [diseases, setDiseases] = useState<ReportableDisease[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [investigations, setInvestigations] = useState<InvestigationRow[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReportRow[]>([]);

  const [sectors, setSectors] = useState<Sector[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [entryPoints, setEntryPoints] = useState<MasterEntryPoint[]>([]);
  const [healthFacilities, setHealthFacilities] = useState<HealthFacility[]>([]);

  const [openCreateCase, setOpenCreateCase] = useState(false);
  const [openCreateContact, setOpenCreateContact] = useState(false);
  const [openCreateInvestigation, setOpenCreateInvestigation] = useState(false);
  const [openCreateReport, setOpenCreateReport] = useState(false);

  const [caseForm, setCaseForm] = useState<HealthCaseWrite>(blankCase);
  const [contactForm, setContactForm] = useState<ContactTraceWrite>(blankContact);
  const [investigationForm, setInvestigationForm] = useState<InvestigationWrite>(blankInvestigation);
  const [reportForm, setReportForm] = useState<WeeklySurveillanceReportWrite>(blankReport);
  const [submitting, setSubmitting] = useState(false);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loadingDashboard]);

  const refresh = async () => {
    setLoadingDashboard(true);
    try {
      const [d, c, a, dz, ct, inv, wr] = await Promise.all([
        getSurveillanceDashboard(),
        listCases({ page_size: '10', ordering: '-created_at' }),
        listAlerts({ page_size: '10', ordering: '-generated_at' }),
        listReportableDiseases({ page_size: '100' }),
        listContacts({ page_size: '10', ordering: '-created_at' }),
        listInvestigations({ page_size: '10', ordering: '-started_at' }),
        listWeeklyReports({ page_size: '10', ordering: '-submitted_at' }),
      ]);
      setDashboard(d.data.data);
      setCases(c.data.data.results);
      setAlerts(a.data.data.results);
      setDiseases(dz.data.data.results);
      setContacts(ct.data.data.results);
      setInvestigations(inv.data.data.results);
      setWeeklyReports(wr.data.data.results);
    } catch {
      notifyError(t('surveillance.messages.loadError'));
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    refresh();
    Promise.all([listSectors(), listLocalities(), listEntryPoints(), listHealthFacilities()])
      .then(([s, l, e, h]) => {
        setSectors(s.data.data.results);
        setLocalities(l.data.data.results);
        setEntryPoints(e.data.data.results);
        setHealthFacilities(h.data.data.results);
      })
      .catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpis = useMemo(() => {
    if (!dashboard) return null;
    return [
      { icon: <MonitorHeartIcon />, value: dashboard.total_cases, label: t('surveillance.kpi.totalCases'), accent: 'primary.main' },
      { icon: <WarningAmberIcon />, value: dashboard.cases_today, label: t('surveillance.kpi.casesToday'), accent: 'info.main' },
      { icon: <ScienceIcon />, value: dashboard.confirmed_cases, label: t('surveillance.kpi.confirmed'), accent: 'error.main' },
      { icon: <HealingIcon />, value: dashboard.dead_cases, label: t('surveillance.kpi.deaths'), accent: 'error.main' },
      { icon: <WarningAmberIcon />, value: dashboard.active_alerts, label: t('surveillance.kpi.activeAlerts'), accent: 'warning.main' },
      { icon: <GroupsIcon />, value: dashboard.open_events, label: t('surveillance.kpi.openEvents'), accent: 'warning.main' },
    ];
  }, [dashboard, t]);

  const levelSummary = dashboard
    ? Object.entries(dashboard.level_counts).map(([k, v]) => ({ level: k, count: v }))
    : [];

  const handleRunEwars = async () => {
    setSubmitting(true);
    try {
      const r = await runEwars();
      notifySuccess(t('surveillance.messages.engineRun', { count: r.data.data.created }));
      refresh();
    } catch {
      notifyError(t('surveillance.messages.engineRunError'));
    } finally {
      setSubmitting(false);
    }
  };

  const onTransition = async (c: HealthCase, case_type: string, status: string) => {
    try {
      await transitionCase(c.id, { case_type, status, note: t('surveillance.messages.updateFromInterface') });
      notifySuccess(t('surveillance.messages.statusUpdated'));
      refresh();
    } catch {
      notifyError(t('surveillance.messages.statusUpdateError'));
    }
  };

  const onAckAlert = async (a: SurveillanceAlert) => {
    try {
      await ackAlert(a.id);
      refresh();
    } catch {
      notifyError(t('surveillance.messages.ackError'));
    }
  };

  const onRespondAlert = async (a: SurveillanceAlert) => {
    try {
      await respondAlert(a.id);
      refresh();
    } catch {
      notifyError(t('surveillance.messages.respondError'));
    }
  };

  const onCloseAlert = async (a: SurveillanceAlert) => {
    try {
      await closeAlert(a.id);
      refresh();
    } catch {
      notifyError(t('surveillance.messages.closeError'));
    }
  };

  const onCreateCase = async () => {
    if (!caseForm.person_name) {
      notifyError(t('surveillance.messages.nameRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await createCase(caseForm);
      notifySuccess(t('surveillance.messages.caseRegistered'));
      setOpenCreateCase(false);
      setCaseForm(blankCase);
      refresh();
    } catch {
      notifyError(t('surveillance.messages.caseRegisterError'));
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateContact = async () => {
    if (!contactForm.index_case || !contactForm.person_name) {
      notifyError(t('surveillance.messages.caseIndexAndNameRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await createContact(contactForm);
      notifySuccess(t('surveillance.messages.contactRegistered'));
      setOpenCreateContact(false);
      setContactForm(blankContact);
      refresh();
    } catch {
      notifyError(t('surveillance.messages.contactRegisterError'));
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateInvestigation = async () => {
    if (!investigationForm.title) {
      notifyError(t('surveillance.messages.titleRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await createInvestigation(investigationForm);
      notifySuccess(t('surveillance.messages.investigationOpened'));
      setOpenCreateInvestigation(false);
      setInvestigationForm(blankInvestigation);
      refresh();
    } catch {
      notifyError(t('surveillance.messages.investigationOpenError'));
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateReport = async () => {
    if (!reportForm.period_start || !reportForm.period_end) {
      notifyError(t('surveillance.messages.periodRequired'));
      return;
    }
    if (!reportForm.health_facility && !reportForm.port) {
      notifyError(t('surveillance.messages.facilityOrEntryPointRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await createWeeklyReport(reportForm);
      notifySuccess(t('surveillance.messages.weeklyReportSubmitted'));
      setOpenCreateReport(false);
      setReportForm(blankReport);
      refresh();
    } catch {
      notifyError(t('surveillance.messages.weeklyReportSubmitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const updateCaseField = (key: keyof HealthCaseWrite) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setCaseForm((prev) => ({ ...prev, [key]: e.target.value }));

  const updateContactField = (key: keyof ContactTraceWrite) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setContactForm((prev) => ({ ...prev, [key]: e.target.value }));

  const updateInvestigationField = (key: keyof InvestigationWrite) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInvestigationForm((prev) => ({ ...prev, [key]: e.target.value }));

  const tabs = [
    {
      label: t('surveillance.tabs.dashboard'),
      panel: (
        <Box component="section" ref={register('dashboard')} data-section="dashboard" sx={{ scrollMarginTop: '80px' }}>
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {(kpis ?? []).map((k) => (
              <Grid key={k.label} item xs={12} sm={6} md={4} lg={2}>
                {loadingDashboard ? <Skeleton variant="rounded" height={124} /> : <Kpi {...k} />}
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6} lg={4}>
              <SectionCard title={t('surveillance.sectionCards.responseLevel')} subtitle={t('surveillance.sectionCards.byActiveAlerts')}>
                <Stack spacing={1.25}>
                  {levelSummary.length === 0 ? (
                    <Typography color="text.secondary">{t('surveillance.empty.noData')}</Typography>
                  ) : (
                    levelSummary.map((l) => {
                      const meta = alertLevel[l.level];
                      return (
                        <Stack key={l.level} direction="row" alignItems="center" spacing={1.5}>
                          <StatusChip label={meta?.label ?? l.level} tone={meta?.tone ?? 'neutral'} />
                          <Typography sx={{ flex: 1 }} color="text.secondary">{l.level}</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{l.count}</Typography>
                        </Stack>
                      );
                    })
                  )}
                </Stack>
              </SectionCard>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <SectionCard title={t('surveillance.sectionCards.topDiseases')} subtitle={t('surveillance.sectionCards.currentCases')}>
                <Stack spacing={1.25}>
                  {(dashboard?.cases_by_disease ?? []).slice(0, 6).map((d) => (
                    <Stack key={d.disease__name_ar} direction="row" alignItems="center" spacing={1.5}>
                      <ScienceIcon color="primary" />
                      <Typography sx={{ flex: 1 }}>{d.disease__name_ar}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{d.count}</Typography>
                    </Stack>
                  ))}
                  {(dashboard?.cases_by_disease ?? []).length === 0 && (
                    <Typography color="text.secondary">{t('surveillance.empty.noData')}</Typography>
                  )}
                </Stack>
              </SectionCard>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <SectionCard title={t('surveillance.sectionCards.topPorts')} subtitle={t('surveillance.sectionCards.currentCases')}>
                <Stack spacing={1.25}>
                  {(dashboard?.cases_by_port ?? []).slice(0, 6).map((p) => (
                    <Stack key={p.port__code} direction="row" alignItems="center" spacing={1.5}>
                      <MonitorHeartIcon color="primary" />
                      <Typography sx={{ flex: 1 }}>{p.port__name_ar ?? p.port__code}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{p.count}</Typography>
                    </Stack>
                  ))}
                  {(dashboard?.cases_by_port ?? []).length === 0 && (
                    <Typography color="text.secondary">{t('surveillance.empty.noData')}</Typography>
                  )}
                </Stack>
              </SectionCard>
            </Grid>
          </Grid>
        </Box>
      ),
    },
    {
      label: t('surveillance.tabs.cases'),
      panel: (
        <Box component="section" ref={register('cases')} data-section="cases" sx={{ scrollMarginTop: '80px' }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpenCreateCase(true)}>
              {t('surveillance.actions.newCase')}
            </Button>
          </Stack>
          <DataTable<HealthCase>
            columns={[
              { key: 'case_number', label: t('surveillance.columns.caseNumber'), render: (c) => <Typography sx={{ fontWeight: 700 }}>{c.case_number}</Typography> },
              { key: 'disease_name', label: t('surveillance.columns.disease'), render: (c) => c.disease_name ?? '—' },
              { key: 'case_type', label: t('surveillance.columns.type'), render: (c) => { const m = caseType[c.case_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : c.case_type; } },
              { key: 'status', label: t('surveillance.columns.status'), render: (c) => { const m = caseStatus[c.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : c.status; } },
              { key: 'source', label: t('surveillance.columns.source'), render: (c) => { const m = caseSource[c.source]; return m ? <StatusChip label={m.label} tone={m.tone} /> : c.source; } },
              { key: 'port_code', label: t('surveillance.columns.port'), render: (c) => c.port_code ?? '—' },
              { key: 'person_name', label: t('surveillance.columns.person'), render: (c) => c.person_name || '—', hideOnMobile: true },
              { key: 'created_at', label: t('surveillance.columns.registeredAt'), render: (c) => formatDateTime(c.created_at), hideOnMobile: true },
              { key: 'actions', label: t('surveillance.columns.actions'), render: (c) => (
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title={t('surveillance.tooltips.confirm')}><IconButton size="small" onClick={() => onTransition(c, 'CONFIRMED', c.status)}><CheckIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title={t('surveillance.tooltips.close')}><IconButton size="small" onClick={() => onTransition(c, c.case_type, 'CLOSED')}><CloseIcon fontSize="small" /></IconButton></Tooltip>
                </Stack>
              ) },
            ]}
            rows={cases}
            rowKey={(c) => c.id}
            count={cases.length}
            page={1}
            rowsPerPage={10}
            onPageChange={() => undefined}
            title={t('surveillance.cases.title')}
            subtitle={t('surveillance.cases.subtitle')}
            emptyTitle={t('surveillance.cases.emptyTitle')}
            emptyDescription={t('surveillance.cases.emptyDescription')}
          />
        </Box>
      ),
    },
    {
      label: t('surveillance.tabs.earlyWarnings'),
      panel: (
        <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px' }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {t('surveillance.alerts.recentCount', { count: alerts.length })}
            </Typography>
            <Button startIcon={<PlayArrowIcon />} variant="contained" color="primary" onClick={handleRunEwars} disabled={submitting}>
              {t('surveillance.actions.runEngine')}
            </Button>
          </Stack>
          <DataTable<SurveillanceAlert>
            columns={[
              { key: 'alert_number', label: t('surveillance.columns.alertNumber'), render: (a) => <Typography sx={{ fontWeight: 700 }}>{a.alert_number}</Typography> },
              { key: 'title', label: t('surveillance.columns.title'), render: (a) => <Typography sx={{ maxWidth: 320 }}>{a.title}</Typography>, hideOnMobile: true },
              { key: 'alert_type', label: t('surveillance.columns.type'), render: (a) => { const m = alertType[a.alert_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : a.alert_type; } },
              { key: 'level', label: t('surveillance.columns.level'), render: (a) => { const m = alertLevel[a.level]; return m ? <StatusChip label={m.label} tone={m.tone} /> : a.level; } },
              { key: 'status', label: t('surveillance.columns.status'), render: (a) => { const m = alertStatus[a.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : a.status; } },
              { key: 'case_count', label: t('surveillance.columns.cases'), align: 'center' },
              { key: 'port_code', label: t('surveillance.columns.port'), render: (a) => a.port_code ?? '—', hideOnMobile: true },
              { key: 'actions', label: t('surveillance.columns.actions'), render: (a) => (
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title={t('surveillance.tooltips.acknowledge')}><IconButton size="small" onClick={() => onAckAlert(a)}><CheckIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title={t('surveillance.tooltips.startResponse')}><IconButton size="small" onClick={() => onRespondAlert(a)}><DoneAllIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title={t('surveillance.tooltips.close')}><IconButton size="small" onClick={() => onCloseAlert(a)}><CloseIcon fontSize="small" /></IconButton></Tooltip>
                </Stack>
              ) },
            ]}
            rows={alerts}
            rowKey={(a) => a.id}
            count={alerts.length}
            page={1}
            rowsPerPage={10}
            onPageChange={() => undefined}
            title={t('surveillance.alerts.earlyWarningTitle')}
            subtitle={t('surveillance.alerts.earlyWarningSubtitle')}
            emptyTitle={t('surveillance.alerts.emptyTitle')}
            emptyDescription={t('surveillance.alerts.emptyDescription')}
          />
        </Box>
      ),
    },
    {
      label: t('surveillance.tabs.diseases'),
      panel: (
        <Box component="section" ref={register('diseases')} data-section="diseases" sx={{ scrollMarginTop: '80px' }}>
          <DataTable<ReportableDisease>
          columns={[
            { key: 'icd_11_code', label: 'ICD-11', render: (d) => <Typography sx={{ fontWeight: 700 }}>{d.icd_11_code}</Typography> },
            { key: 'name_ar', label: t('surveillance.columns.name'), render: (d) => `${d.name_ar} (${d.name_en})` },
            { key: 'notification_timeline', label: t('surveillance.columns.notificationTimeline'), render: (d) => { const m = notificationTimeline[d.notification_timeline]; return m ? <StatusChip label={m.label} tone={m.tone} /> : d.notification_timeline; } },
            { key: 'surveillance_mode', label: t('surveillance.columns.mode'), render: (d) => { const m = surveillanceMode[d.surveillance_mode]; return m ? <StatusChip label={m.label} tone={m.tone} /> : d.surveillance_mode; } },
            { key: 'ewars_threshold', label: t('surveillance.columns.threshold'), align: 'center' },
            { key: 'window_days', label: t('surveillance.columns.window'), align: 'center' },
            { key: 'is_enabled', label: t('surveillance.columns.status'), render: (d) => d.is_enabled ? <StatusChip label={t('surveillance.statuses.enabled')} tone="success" /> : <StatusChip label={t('surveillance.statuses.disabled')} tone="neutral" /> },
          ]}
          rows={diseases}
          rowKey={(d) => d.id}
          count={diseases.length}
          page={1}
          rowsPerPage={10}
          onPageChange={() => undefined}
          title={t('surveillance.diseases.title')}
          subtitle={t('surveillance.diseases.subtitle')}
          emptyTitle={t('surveillance.diseases.emptyTitle')}
          emptyDescription={t('surveillance.diseases.emptyDescription')}
        />
        </Box>
      ),
    },
    {
      label: t('surveillance.tabs.contacts'),
      panel: (
        <Box component="section" ref={register('contacts')} data-section="contacts" sx={{ scrollMarginTop: '80px' }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button startIcon={<PersonSearchIcon />} variant="contained" onClick={() => setOpenCreateContact(true)}>
              {t('surveillance.contacts.registerContact')}
            </Button>
          </Stack>
          <DataTable<ContactRow>
            columns={[
              { key: 'contact_number', label: t('surveillance.columns.number'), render: (c) => <Typography sx={{ fontWeight: 700 }}>{c.contact_number}</Typography> },
              { key: 'index_case_number', label: t('surveillance.columns.indexCase'), render: (c) => c.index_case_number },
              { key: 'person_name', label: t('surveillance.columns.name'), render: (c) => c.person_name },
              { key: 'contact_type', label: t('surveillance.columns.contactType'), render: (c) => { const m = contactType[c.contact_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : c.contact_type; } },
              { key: 'status', label: t('surveillance.columns.status'), render: (c) => { const m = contactStatus[c.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : c.status; } },
              { key: 'follow_up_days', label: t('surveillance.columns.followUpDays'), align: 'center', hideOnMobile: true },
            ]}
            rows={contacts}
            rowKey={(c) => c.id}
            count={contacts.length}
            page={1}
            rowsPerPage={10}
            onPageChange={() => undefined}
            title={t('surveillance.contacts.title')}
            subtitle={t('surveillance.contacts.subtitle')}
            emptyTitle={t('surveillance.contacts.emptyTitle')}
            emptyDescription={t('surveillance.contacts.emptyDescription')}
          />
        </Box>
      ),
    },
    {
      label: t('surveillance.tabs.investigations'),
      panel: (
        <Box component="section" ref={register('investigations')} data-section="investigations" sx={{ scrollMarginTop: '80px' }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button startIcon={<AssignmentIcon />} variant="contained" onClick={() => setOpenCreateInvestigation(true)}>
              {t('surveillance.investigations.openInvestigation')}
            </Button>
          </Stack>
          <DataTable<InvestigationRow>
            columns={[
              { key: 'investigation_number', label: t('surveillance.columns.number'), render: (i) => <Typography sx={{ fontWeight: 700 }}>{i.investigation_number}</Typography> },
              { key: 'title', label: t('surveillance.columns.title'), render: (i) => i.title },
              { key: 'case_number', label: t('surveillance.columns.case'), render: (i) => i.case_number ?? '—', hideOnMobile: true },
              { key: 'status', label: t('surveillance.columns.status'), render: (i) => { const m = investigationStatus[i.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : i.status; } },
              { key: 'started_at', label: t('surveillance.columns.startedAt'), render: (i) => i.started_at, hideOnMobile: true },
            ]}
            rows={investigations}
            rowKey={(i) => i.id}
            count={investigations.length}
            page={1}
            rowsPerPage={10}
            onPageChange={() => undefined}
            title={t('surveillance.investigations.title')}
            subtitle={t('surveillance.investigations.subtitle')}
            emptyTitle={t('surveillance.investigations.emptyTitle')}
            emptyDescription={t('surveillance.investigations.emptyDescription')}
          />
        </Box>
      ),
    },
    {
      label: t('surveillance.tabs.weeklyReports'),
      panel: (
        <Box component="section" ref={register('reports')} data-section="reports" sx={{ scrollMarginTop: '80px' }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpenCreateReport(true)}>
              {t('surveillance.reports.weeklyReport')}
            </Button>
          </Stack>
          <DataTable<WeeklyReportRow>
            columns={[
              { key: 'report_number', label: t('surveillance.columns.number'), render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.report_number}</Typography> },
              { key: 'period', label: t('surveillance.columns.period'), render: (r) => `${r.period_start} → ${r.period_end}` },
              { key: 'facility_name', label: t('surveillance.columns.facility'), render: (r) => r.facility_name ?? r.port_code ?? '—' },
              { key: 'is_on_time', label: t('surveillance.columns.timeliness'), render: (r) => r.is_on_time ? <StatusChip label={t('surveillance.statuses.onTime')} tone="success" /> : <StatusChip label={t('surveillance.statuses.late')} tone="warning" /> },
              { key: 'submitted_at', label: t('surveillance.columns.submittedAt'), render: (r) => formatDateTime(r.submitted_at), hideOnMobile: true },
            ]}
            rows={weeklyReports}
            rowKey={(r) => r.id}
            count={weeklyReports.length}
            page={1}
            rowsPerPage={10}
            onPageChange={() => undefined}
            title={t('surveillance.reports.title')}
            subtitle={t('surveillance.reports.subtitle')}
            emptyTitle={t('surveillance.reports.emptyTitle')}
            emptyDescription={t('surveillance.reports.emptyDescription')}
          />
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <DashboardHero
        eyebrow="Public Health Surveillance"
        title={t('surveillance.pageHeader.title')}
        subtitle={t('surveillance.pageHeader.subtitle')}
        avatarLabel={t('surveillance.pageHeader.avatarLabel')}
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ExportButton
              filename="surveillance-cases"
              headers={[t('surveillance.columns.number'), t('surveillance.columns.disease'), t('surveillance.columns.type'), t('surveillance.columns.status'), t('surveillance.columns.source'), t('surveillance.columns.port'), t('surveillance.columns.name')]}
              rows={cases.map((c) => [
                c.case_number,
                c.disease_name ?? '',
                caseType[c.case_type]?.label ?? c.case_type,
                caseStatus[c.status]?.label ?? c.status,
                caseSource[c.source]?.label ?? c.source,
                c.port_code ?? '',
                c.person_name,
              ])}
              disabled={loadingDashboard}
            />
            <Button startIcon={<PlayArrowIcon />} variant="contained" color="primary" onClick={handleRunEwars} disabled={submitting}>
              {t('surveillance.actions.runEngine')}
            </Button>
          </Stack>
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {t('surveillance.pageHeader.live')}
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
            label={t('surveillance.pageHeader.sectionsLabel')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          <PageTabs tabs={tabs} value={tab} onChange={setTab} />
        </Grid>
      </Grid>

      <FormDialog
        open={openCreateCase}
        title={t('surveillance.cases.createTitle')}
        subtitle={t('surveillance.cases.createSubtitle')}
        onClose={() => setOpenCreateCase(false)}
        onSubmit={onCreateCase}
        loading={submitting}
        maxWidth="md"
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormTextField label={t('surveillance.forms.personName')} required value={caseForm.person_name ?? ''} onChange={updateCaseField('person_name')} />
            <FormTextField label={t('surveillance.forms.age')} type="number" value={caseForm.person_age ?? ''} onChange={(e) => setCaseForm((p) => ({ ...p, person_age: e.target.value === '' ? null : Number(e.target.value) }))} />
            <FormSelect
              label={t('surveillance.forms.sex')}
              value={caseForm.person_sex ?? 'U'}
              onChange={(v) => setCaseForm((p) => ({ ...p, person_sex: v as 'M' | 'F' | 'U' }))}
              options={[
                { value: 'M', label: t('surveillance.forms.male') },
                { value: 'F', label: t('surveillance.forms.female') },
                { value: 'U', label: t('surveillance.forms.unspecified') },
              ]}
            />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormSelect
              label={t('surveillance.forms.disease')}
              value={caseForm.disease ?? ''}
              onChange={(v) => setCaseForm((p) => ({ ...p, disease: v || null }))}
              options={[
                { value: '', label: '—' },
                ...diseases.map((d) => ({ value: d.disease_id, label: d.name_ar })),
              ]}
            />
            <FormSelect
              label={t('surveillance.forms.caseType')}
              value={caseForm.case_type ?? 'SUSPECTED'}
              onChange={(v) => setCaseForm((p) => ({ ...p, case_type: v as HealthCase['case_type'] }))}
              options={Object.entries(caseType).map(([k, v]) => ({ value: k, label: v.label }))}
            />
            <FormSelect
              label={t('surveillance.forms.severity')}
              value={caseForm.severity ?? 'MODERATE'}
              onChange={(v) => setCaseForm((p) => ({ ...p, severity: v as HealthCase['severity'] }))}
              options={Object.entries(caseSeverity).map(([k, v]) => ({ value: k, label: v.label }))}
            />
            <FormSelect
              label={t('surveillance.forms.source')}
              value={caseForm.source ?? 'MANUAL'}
              onChange={(v) => setCaseForm((p) => ({ ...p, source: v as HealthCase['source'] }))}
              options={Object.entries(caseSource).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormSelect
              label={t('surveillance.forms.sector')}
              value={caseForm.sector ?? ''}
              onChange={(v) => setCaseForm((p) => ({ ...p, sector: v || null }))}
              options={[{ value: '', label: '—' }, ...sectors.map((s) => ({ value: s.id, label: s.name_ar }))]}
            />
            <FormSelect
              label={t('surveillance.forms.locality')}
              value={caseForm.locality ?? ''}
              onChange={(v) => setCaseForm((p) => ({ ...p, locality: v || null }))}
              options={[{ value: '', label: '—' }, ...localities.map((l) => ({ value: l.id, label: l.name_ar }))]}
            />
            <FormSelect
              label={t('surveillance.forms.port')}
              value={caseForm.port ?? ''}
              onChange={(v) => setCaseForm((p) => ({ ...p, port: v || null }))}
              options={[{ value: '', label: '—' }, ...entryPoints.map((e) => ({ value: e.id, label: e.name_ar }))]}
            />
            <FormSelect
              label={t('surveillance.forms.healthFacility')}
              value={caseForm.health_facility ?? ''}
              onChange={(v) => setCaseForm((p) => ({ ...p, health_facility: v || null }))}
              options={[{ value: '', label: '—' }, ...healthFacilities.map((h) => ({ value: h.id, label: h.name_ar }))]}
            />
          </Stack>
          <FormTextField label={t('surveillance.forms.notes')} value={caseForm.notes ?? ''} onChange={updateCaseField('notes')} multiline rows={2} />
        </Stack>
      </FormDialog>

      <FormDialog
        open={openCreateContact}
        title={t('surveillance.contacts.createTitle')}
        subtitle={t('surveillance.contacts.createSubtitle')}
        onClose={() => setOpenCreateContact(false)}
        onSubmit={onCreateContact}
        loading={submitting}
      >
        <Stack spacing={2}>
          <FormSelect
            label={t('surveillance.contacts.indexCase')}
            required
            value={contactForm.index_case}
            onChange={(v) => setContactForm((p) => ({ ...p, index_case: v }))}
            options={cases.map((c) => ({ value: c.id, label: `${c.case_number} — ${c.person_name}` }))}
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormTextField label={t('surveillance.forms.name')} required value={contactForm.person_name} onChange={updateContactField('person_name')} />
            <FormTextField label={t('surveillance.forms.phone')} value={contactForm.phone ?? ''} onChange={updateContactField('phone')} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormSelect
              label={t('surveillance.forms.contactType')}
              value={contactForm.contact_type ?? 'FAMILY'}
              onChange={(v) => setContactForm((p) => ({ ...p, contact_type: v as ContactTraceWrite['contact_type'] }))}
              options={Object.entries(contactType).map(([k, v]) => ({ value: k, label: v.label }))}
            />
            <FormTextField label={t('surveillance.forms.relationship')} value={contactForm.relationship ?? ''} onChange={updateContactField('relationship')} />
            <FormTextField label={t('surveillance.forms.location')} value={contactForm.location ?? ''} onChange={updateContactField('location')} />
          </Stack>
        </Stack>
      </FormDialog>

      <FormDialog
        open={openCreateInvestigation}
        title={t('surveillance.investigations.openTitle')}
        subtitle={t('surveillance.investigations.openSubtitle')}
        onClose={() => setOpenCreateInvestigation(false)}
        onSubmit={onCreateInvestigation}
        loading={submitting}
      >
        <Stack spacing={2}>
          <FormTextField label={t('surveillance.forms.title')} required value={investigationForm.title} onChange={updateInvestigationField('title')} />
          <FormSelect
            label={t('surveillance.columns.status')}
            value={investigationForm.case ?? ''}
            onChange={(v) => setInvestigationForm((p) => ({ ...p, case: v || null }))}
            options={[{ value: '', label: '—' }, ...cases.map((c) => ({ value: c.id, label: `${c.case_number} — ${c.person_name}` }))]}
          />
          <FormTextField label={t('surveillance.forms.hypothesis')} value={investigationForm.hypothesis ?? ''} onChange={updateInvestigationField('hypothesis')} multiline rows={2} />
        </Stack>
      </FormDialog>

      <FormDialog
        open={openCreateReport}
        title={t('surveillance.reports.weeklyTitle')}
        subtitle={t('surveillance.reports.weeklySubtitle')}
        onClose={() => setOpenCreateReport(false)}
        onSubmit={onCreateReport}
        loading={submitting}
        maxWidth="md"
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormTextField label={t('surveillance.forms.periodStart')} type="date" required value={reportForm.period_start} onChange={(e) => setReportForm((p) => ({ ...p, period_start: e.target.value }))} />
            <FormTextField label={t('surveillance.forms.periodEnd')} type="date" required value={reportForm.period_end} onChange={(e) => setReportForm((p) => ({ ...p, period_end: e.target.value }))} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormSelect
              label={t('surveillance.forms.healthFacility')}
              value={reportForm.health_facility ?? ''}
              onChange={(v) => setReportForm((p) => ({ ...p, health_facility: v || null }))}
              options={[{ value: '', label: '—' }, ...healthFacilities.map((h) => ({ value: h.id, label: h.name_ar }))]}
            />
            <FormSelect
              label={t('surveillance.forms.entryPoint')}
              value={reportForm.port ?? ''}
              onChange={(v) => setReportForm((p) => ({ ...p, port: v || null }))}
              options={[{ value: '', label: '—' }, ...entryPoints.map((e) => ({ value: e.id, label: e.name_ar }))]}
            />
            <FormSelect
              label={t('surveillance.forms.sector')}
              value={reportForm.sector ?? ''}
              onChange={(v) => setReportForm((p) => ({ ...p, sector: v || null }))}
              options={[{ value: '', label: '—' }, ...sectors.map((s) => ({ value: s.id, label: s.name_ar }))]}
            />
          </Stack>
          <FormTextField label={t('surveillance.forms.notes')} value={reportForm.notes ?? ''} onChange={(e) => setReportForm((p) => ({ ...p, notes: e.target.value }))} multiline rows={2} />
        </Stack>
      </FormDialog>
    </Box>
  );
};

export default SurveillanceModulePage;
