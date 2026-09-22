import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
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
  { id: 'dashboard', label: 'لوحة الترصد', icon: <MonitorHeartIcon fontSize="small" /> },
  { id: 'cases', label: 'الحالات', icon: <HealingIcon fontSize="small" /> },
  { id: 'alerts', label: 'الإنذارات', icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'diseases', label: 'الأمراض', icon: <ScienceIcon fontSize="small" /> },
  { id: 'contacts', label: 'المخالطون', icon: <GroupsIcon fontSize="small" /> },
  { id: 'investigations', label: 'التحقيقات', icon: <AssignmentIcon fontSize="small" /> },
  { id: 'reports', label: 'البلاغات', icon: <AssessmentIcon fontSize="small" /> },
] as const;

const Kpi = ({ icon, value, label, accent }: { icon: React.ReactNode; value: number; label: string; accent: string }) => (
  <KpiCard icon={icon} value={value} label={label} accent={accent} />
);

const SurveillanceModulePage = () => {
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
      notifyError('تعذر تحميل بيانات الترصد');
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
  }, []);

  const kpis = useMemo(() => {
    if (!dashboard) return null;
    return [
      { icon: <MonitorHeartIcon />, value: dashboard.total_cases, label: 'إجمالي الحالات', accent: 'primary.main' },
      { icon: <WarningAmberIcon />, value: dashboard.cases_today, label: 'حالات اليوم', accent: 'info.main' },
      { icon: <ScienceIcon />, value: dashboard.confirmed_cases, label: 'مؤكدة', accent: 'error.main' },
      { icon: <HealingIcon />, value: dashboard.dead_cases, label: 'وفيات', accent: 'error.main' },
      { icon: <WarningAmberIcon />, value: dashboard.active_alerts, label: 'إنذارات نشطة', accent: 'warning.main' },
      { icon: <GroupsIcon />, value: dashboard.open_events, label: 'أحداث مفتوحة', accent: 'warning.main' },
    ];
  }, [dashboard]);

  const levelSummary = dashboard
    ? Object.entries(dashboard.level_counts).map(([k, v]) => ({ level: k, count: v }))
    : [];

  const handleRunEwars = async () => {
    setSubmitting(true);
    try {
      const r = await runEwars();
      notifySuccess(`تم تشغيل المحرك — أُنشئ ${r.data.data.created} إنذاراً`);
      refresh();
    } catch {
      notifyError('فشل تشغيل محرك الإنذار');
    } finally {
      setSubmitting(false);
    }
  };

  const onTransition = async (c: HealthCase, case_type: string, status: string) => {
    try {
      await transitionCase(c.id, { case_type, status, note: 'تحديث من الواجهة' });
      notifySuccess('تم تحديث الحالة');
      refresh();
    } catch {
      notifyError('فشل تحديث الحالة');
    }
  };

  const onAckAlert = async (a: SurveillanceAlert) => {
    try {
      await ackAlert(a.id);
      refresh();
    } catch {
      notifyError('فشل الإقرار');
    }
  };

  const onRespondAlert = async (a: SurveillanceAlert) => {
    try {
      await respondAlert(a.id);
      refresh();
    } catch {
      notifyError('فشل بدء الاستجابة');
    }
  };

  const onCloseAlert = async (a: SurveillanceAlert) => {
    try {
      await closeAlert(a.id);
      refresh();
    } catch {
      notifyError('فشل إغلاق الإنذار');
    }
  };

  const onCreateCase = async () => {
    if (!caseForm.person_name) {
      notifyError('الاسم مطلوب');
      return;
    }
    setSubmitting(true);
    try {
      await createCase(caseForm);
      notifySuccess('تم تسجيل الحالة');
      setOpenCreateCase(false);
      setCaseForm(blankCase);
      refresh();
    } catch {
      notifyError('فشل تسجيل الحالة');
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateContact = async () => {
    if (!contactForm.index_case || !contactForm.person_name) {
      notifyError('الحالة المؤشرة والاسم مطلوبان');
      return;
    }
    setSubmitting(true);
    try {
      await createContact(contactForm);
      notifySuccess('تم تسجيل المخالط');
      setOpenCreateContact(false);
      setContactForm(blankContact);
      refresh();
    } catch {
      notifyError('فشل تسجيل المخالط');
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateInvestigation = async () => {
    if (!investigationForm.title) {
      notifyError('العنوان مطلوب');
      return;
    }
    setSubmitting(true);
    try {
      await createInvestigation(investigationForm);
      notifySuccess('تم فتح التحقيق');
      setOpenCreateInvestigation(false);
      setInvestigationForm(blankInvestigation);
      refresh();
    } catch {
      notifyError('فشل فتح التحقيق');
    } finally {
      setSubmitting(false);
    }
  };

  const onCreateReport = async () => {
    if (!reportForm.period_start || !reportForm.period_end) {
      notifyError('الفترة مطلوبة');
      return;
    }
    if (!reportForm.health_facility && !reportForm.port) {
      notifyError('حدد وحدة صحية أو نقطة دخول');
      return;
    }
    setSubmitting(true);
    try {
      await createWeeklyReport(reportForm);
      notifySuccess('تم تقديم البلاغ الأسبوعي');
      setOpenCreateReport(false);
      setReportForm(blankReport);
      refresh();
    } catch {
      notifyError('فشل تقديم البلاغ');
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
      label: 'لوحة الترصد',
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
              <SectionCard title="مستوى الاستجابة" subtitle="حسب عدد الإنذارات النشطة">
                <Stack spacing={1.25}>
                  {levelSummary.length === 0 ? (
                    <Typography color="text.secondary">لا توجد بيانات</Typography>
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
              <SectionCard title="أكثر الأمراض تسجيلاً" subtitle="حالات الترصد الحالية">
                <Stack spacing={1.25}>
                  {(dashboard?.cases_by_disease ?? []).slice(0, 6).map((d) => (
                    <Stack key={d.disease__name_ar} direction="row" alignItems="center" spacing={1.5}>
                      <ScienceIcon color="primary" />
                      <Typography sx={{ flex: 1 }}>{d.disease__name_ar}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{d.count}</Typography>
                    </Stack>
                  ))}
                  {(dashboard?.cases_by_disease ?? []).length === 0 && (
                    <Typography color="text.secondary">لا توجد بيانات</Typography>
                  )}
                </Stack>
              </SectionCard>
            </Grid>
            <Grid item xs={12} md={6} lg={4}>
              <SectionCard title="أكثر المنافذ تسجيلاً" subtitle="حالات الترصد الحالية">
                <Stack spacing={1.25}>
                  {(dashboard?.cases_by_port ?? []).slice(0, 6).map((p) => (
                    <Stack key={p.port__code} direction="row" alignItems="center" spacing={1.5}>
                      <MonitorHeartIcon color="primary" />
                      <Typography sx={{ flex: 1 }}>{p.port__name_ar ?? p.port__code}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>{p.count}</Typography>
                    </Stack>
                  ))}
                  {(dashboard?.cases_by_port ?? []).length === 0 && (
                    <Typography color="text.secondary">لا توجد بيانات</Typography>
                  )}
                </Stack>
              </SectionCard>
            </Grid>
          </Grid>
        </Box>
      ),
    },
    {
      label: 'الحالات',
      panel: (
        <Box component="section" ref={register('cases')} data-section="cases" sx={{ scrollMarginTop: '80px' }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpenCreateCase(true)}>
              حالة جديدة
            </Button>
          </Stack>
          <DataTable<HealthCase>
            columns={[
              { key: 'case_number', label: 'الرقم', render: (c) => <Typography sx={{ fontWeight: 700 }}>{c.case_number}</Typography> },
              { key: 'disease_name', label: 'المرض', render: (c) => c.disease_name ?? '—' },
              { key: 'case_type', label: 'النوع', render: (c) => { const m = caseType[c.case_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : c.case_type; } },
              { key: 'status', label: 'الحالة', render: (c) => { const m = caseStatus[c.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : c.status; } },
              { key: 'source', label: 'المصدر', render: (c) => { const m = caseSource[c.source]; return m ? <StatusChip label={m.label} tone={m.tone} /> : c.source; } },
              { key: 'port_code', label: 'المنفذ', render: (c) => c.port_code ?? '—' },
              { key: 'person_name', label: 'الشخص', render: (c) => c.person_name || '—', hideOnMobile: true },
              { key: 'created_at', label: 'تاريخ التسجيل', render: (c) => formatDateTime(c.created_at), hideOnMobile: true },
              { key: 'actions', label: 'إجراءات', render: (c) => (
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="تحويل إلى مؤكد"><IconButton size="small" onClick={() => onTransition(c, 'CONFIRMED', c.status)}><CheckIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="تحويل إلى مغلق"><IconButton size="small" onClick={() => onTransition(c, c.case_type, 'CLOSED')}><CloseIcon fontSize="small" /></IconButton></Tooltip>
                </Stack>
              ) },
            ]}
            rows={cases}
            rowKey={(c) => c.id}
            count={cases.length}
            page={1}
            rowsPerPage={10}
            onPageChange={() => undefined}
            title="حالات الترصد"
            subtitle="حالات مشتبهة ومحتملة ومؤكدة ومنفية"
            emptyTitle="لا توجد حالات"
            emptyDescription="سجّل حالة جديدة أو أدر محرك الإنذار"
          />
        </Box>
      ),
    },
    {
      label: 'الإنذارات المبكرة',
      panel: (
        <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px' }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }} alignItems="center">
            <Typography variant="body2" color="text.secondary">
              {alerts.length} إنذاراً حديثاً
            </Typography>
            <Button startIcon={<PlayArrowIcon />} variant="contained" color="primary" onClick={handleRunEwars} disabled={submitting}>
              تشغيل محرك الإنذار
            </Button>
          </Stack>
          <DataTable<SurveillanceAlert>
            columns={[
              { key: 'alert_number', label: 'الرقم', render: (a) => <Typography sx={{ fontWeight: 700 }}>{a.alert_number}</Typography> },
              { key: 'title', label: 'العنوان', render: (a) => <Typography sx={{ maxWidth: 320 }}>{a.title}</Typography>, hideOnMobile: true },
              { key: 'alert_type', label: 'النوع', render: (a) => { const m = alertType[a.alert_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : a.alert_type; } },
              { key: 'level', label: 'المستوى', render: (a) => { const m = alertLevel[a.level]; return m ? <StatusChip label={m.label} tone={m.tone} /> : a.level; } },
              { key: 'status', label: 'الحالة', render: (a) => { const m = alertStatus[a.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : a.status; } },
              { key: 'case_count', label: 'حالات', align: 'center' },
              { key: 'port_code', label: 'المنفذ', render: (a) => a.port_code ?? '—', hideOnMobile: true },
              { key: 'actions', label: 'إجراءات', render: (a) => (
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title="إقرار"><IconButton size="small" onClick={() => onAckAlert(a)}><CheckIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="بدء الاستجابة"><IconButton size="small" onClick={() => onRespondAlert(a)}><DoneAllIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="إغلاق"><IconButton size="small" onClick={() => onCloseAlert(a)}><CloseIcon fontSize="small" /></IconButton></Tooltip>
                </Stack>
              ) },
            ]}
            rows={alerts}
            rowKey={(a) => a.id}
            count={alerts.length}
            page={1}
            rowsPerPage={10}
            onPageChange={() => undefined}
            title="إنذارات الترصد المبكر"
            subtitle="تجاوزات العتبات، أحداث فردية، نتائج مختبر إيجابية"
            emptyTitle="لا توجد إنذارات"
            emptyDescription="شغّل المحرك أو اربط مصادر البيانات"
          />
        </Box>
      ),
    },
    {
      label: 'الأمراض',
      panel: (
        <Box component="section" ref={register('diseases')} data-section="diseases" sx={{ scrollMarginTop: '80px' }}>
          <DataTable<ReportableDisease>
          columns={[
            { key: 'icd_11_code', label: 'ICD-11', render: (d) => <Typography sx={{ fontWeight: 700 }}>{d.icd_11_code}</Typography> },
            { key: 'name_ar', label: 'الاسم', render: (d) => `${d.name_ar} (${d.name_en})` },
            { key: 'notification_timeline', label: 'زمن الإبلاغ', render: (d) => { const m = notificationTimeline[d.notification_timeline]; return m ? <StatusChip label={m.label} tone={m.tone} /> : d.notification_timeline; } },
            { key: 'surveillance_mode', label: 'النمط', render: (d) => { const m = surveillanceMode[d.surveillance_mode]; return m ? <StatusChip label={m.label} tone={m.tone} /> : d.surveillance_mode; } },
            { key: 'ewars_threshold', label: 'العتبة', align: 'center' },
            { key: 'window_days', label: 'النافذة', align: 'center' },
            { key: 'is_enabled', label: 'الحالة', render: (d) => d.is_enabled ? <StatusChip label="مفعّل" tone="success" /> : <StatusChip label="معطّل" tone="neutral" /> },
          ]}
          rows={diseases}
          rowKey={(d) => d.id}
          count={diseases.length}
          page={1}
          rowsPerPage={10}
          onPageChange={() => undefined}
          title="الأمراض واجبة الإبلاغ"
          subtitle="تهيئة العتبات، نطاقات الإشعار، وتعريفات الحالات"
          emptyTitle="لا توجد أمراض"
          emptyDescription="أضف أمراضاً للإبلاغ من خلال الإعدادات"
        />
        </Box>
      ),
    },
    {
      label: 'المخالطون',
      panel: (
        <Box component="section" ref={register('contacts')} data-section="contacts" sx={{ scrollMarginTop: '80px' }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button startIcon={<PersonSearchIcon />} variant="contained" onClick={() => setOpenCreateContact(true)}>
              تسجيل مخالط
            </Button>
          </Stack>
          <DataTable<ContactRow>
            columns={[
              { key: 'contact_number', label: 'الرقم', render: (c) => <Typography sx={{ fontWeight: 700 }}>{c.contact_number}</Typography> },
              { key: 'index_case_number', label: 'الحالة المؤشرة', render: (c) => c.index_case_number },
              { key: 'person_name', label: 'الاسم', render: (c) => c.person_name },
              { key: 'contact_type', label: 'نوع الاتصال', render: (c) => { const m = contactType[c.contact_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : c.contact_type; } },
              { key: 'status', label: 'الحالة', render: (c) => { const m = contactStatus[c.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : c.status; } },
              { key: 'follow_up_days', label: 'أيام المتابعة', align: 'center', hideOnMobile: true },
            ]}
            rows={contacts}
            rowKey={(c) => c.id}
            count={contacts.length}
            page={1}
            rowsPerPage={10}
            onPageChange={() => undefined}
            title="المخالطون"
            subtitle="تتبع يومي لمخالطي الحالات المؤشرة"
            emptyTitle="لا يوجد مخالطون"
            emptyDescription="سجّل مخالطين بعد تأكيد حالة وبائية"
          />
        </Box>
      ),
    },
    {
      label: 'التحقيقات',
      panel: (
        <Box component="section" ref={register('investigations')} data-section="investigations" sx={{ scrollMarginTop: '80px' }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button startIcon={<AssignmentIcon />} variant="contained" onClick={() => setOpenCreateInvestigation(true)}>
              فتح تحقيق
            </Button>
          </Stack>
          <DataTable<InvestigationRow>
            columns={[
              { key: 'investigation_number', label: 'الرقم', render: (i) => <Typography sx={{ fontWeight: 700 }}>{i.investigation_number}</Typography> },
              { key: 'title', label: 'العنوان', render: (i) => i.title },
              { key: 'case_number', label: 'الحالة', render: (i) => i.case_number ?? '—', hideOnMobile: true },
              { key: 'status', label: 'الحالة', render: (i) => { const m = investigationStatus[i.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : i.status; } },
              { key: 'started_at', label: 'تاريخ البدء', render: (i) => i.started_at, hideOnMobile: true },
            ]}
            rows={investigations}
            rowKey={(i) => i.id}
            count={investigations.length}
            page={1}
            rowsPerPage={10}
            onPageChange={() => undefined}
            title="التحقيقات الوبائية"
            subtitle="تحقيقات ميدانية مرتبطة بحالات أو أحداث"
            emptyTitle="لا توجد تحقيقات"
            emptyDescription="ابدأ تحقيقاً وبائياً جديداً"
          />
        </Box>
      ),
    },
    {
      label: 'البلاغات الأسبوعية',
      panel: (
        <Box component="section" ref={register('reports')} data-section="reports" sx={{ scrollMarginTop: '80px' }}>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
            <Button startIcon={<AddIcon />} variant="contained" onClick={() => setOpenCreateReport(true)}>
              بلاغ أسبوعي
            </Button>
          </Stack>
          <DataTable<WeeklyReportRow>
            columns={[
              { key: 'report_number', label: 'الرقم', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.report_number}</Typography> },
              { key: 'period', label: 'الفترة', render: (r) => `${r.period_start} → ${r.period_end}` },
              { key: 'facility_name', label: 'الوحدة', render: (r) => r.facility_name ?? r.port_code ?? '—' },
              { key: 'is_on_time', label: 'الموعد', render: (r) => r.is_on_time ? <StatusChip label="في الموعد" tone="success" /> : <StatusChip label="متأخر" tone="warning" /> },
              { key: 'submitted_at', label: 'وقت التقديم', render: (r) => formatDateTime(r.submitted_at), hideOnMobile: true },
            ]}
            rows={weeklyReports}
            rowKey={(r) => r.id}
            count={weeklyReports.length}
            page={1}
            rowsPerPage={10}
            onPageChange={() => undefined}
            title="البلاغات الأسبوعية"
            subtitle="منشآت صحية ونقاط دخول"
            emptyTitle="لا توجد بلاغات"
            emptyDescription="سجّل البلاغ الأسبوعي لمنشأتك"
          />
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <DashboardHero
        eyebrow="Public Health Surveillance"
        title="الترصد الصحي"
        subtitle="مراقبة الأمراض الوبائية، الإنذار المبكر، التحقيقات، البلاغات الأسبوعية"
        avatarLabel="ا"
        action={
          <Stack direction="row" spacing={1.5} alignItems="center">
            <ExportButton
              filename="surveillance-cases"
              headers={['الرقم', 'المرض', 'النوع', 'الحالة', 'المصدر', 'المنفذ', 'الاسم']}
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
              تشغيل محرك الإنذار
            </Button>
          </Stack>
        }
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
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
            label="أقسام اللوحة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          <PageTabs tabs={tabs} value={tab} onChange={setTab} />
        </Grid>
      </Grid>

      <FormDialog
        open={openCreateCase}
        title="تسجيل حالة جديدة"
        subtitle="إدخال يدوي لحالة ترصد"
        onClose={() => setOpenCreateCase(false)}
        onSubmit={onCreateCase}
        loading={submitting}
        maxWidth="md"
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormTextField label="اسم الشخص" required value={caseForm.person_name ?? ''} onChange={updateCaseField('person_name')} />
            <FormTextField label="العمر" type="number" value={caseForm.person_age ?? ''} onChange={(e) => setCaseForm((p) => ({ ...p, person_age: e.target.value === '' ? null : Number(e.target.value) }))} />
            <FormSelect
              label="الجنس"
              value={caseForm.person_sex ?? 'U'}
              onChange={(v) => setCaseForm((p) => ({ ...p, person_sex: v as 'M' | 'F' | 'U' }))}
              options={[
                { value: 'M', label: 'ذكر' },
                { value: 'F', label: 'أنثى' },
                { value: 'U', label: 'غير محدد' },
              ]}
            />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormSelect
              label="المرض"
              value={caseForm.disease ?? ''}
              onChange={(v) => setCaseForm((p) => ({ ...p, disease: v || null }))}
              options={[
                { value: '', label: '—' },
                ...diseases.map((d) => ({ value: d.disease_id, label: d.name_ar })),
              ]}
            />
            <FormSelect
              label="نوع الحالة"
              value={caseForm.case_type ?? 'SUSPECTED'}
              onChange={(v) => setCaseForm((p) => ({ ...p, case_type: v as HealthCase['case_type'] }))}
              options={Object.entries(caseType).map(([k, v]) => ({ value: k, label: v.label }))}
            />
            <FormSelect
              label="الخطورة"
              value={caseForm.severity ?? 'MODERATE'}
              onChange={(v) => setCaseForm((p) => ({ ...p, severity: v as HealthCase['severity'] }))}
              options={Object.entries(caseSeverity).map(([k, v]) => ({ value: k, label: v.label }))}
            />
            <FormSelect
              label="المصدر"
              value={caseForm.source ?? 'MANUAL'}
              onChange={(v) => setCaseForm((p) => ({ ...p, source: v as HealthCase['source'] }))}
              options={Object.entries(caseSource).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormSelect
              label="القطاع"
              value={caseForm.sector ?? ''}
              onChange={(v) => setCaseForm((p) => ({ ...p, sector: v || null }))}
              options={[{ value: '', label: '—' }, ...sectors.map((s) => ({ value: s.id, label: s.name_ar }))]}
            />
            <FormSelect
              label="المحلية"
              value={caseForm.locality ?? ''}
              onChange={(v) => setCaseForm((p) => ({ ...p, locality: v || null }))}
              options={[{ value: '', label: '—' }, ...localities.map((l) => ({ value: l.id, label: l.name_ar }))]}
            />
            <FormSelect
              label="المنفذ"
              value={caseForm.port ?? ''}
              onChange={(v) => setCaseForm((p) => ({ ...p, port: v || null }))}
              options={[{ value: '', label: '—' }, ...entryPoints.map((e) => ({ value: e.id, label: e.name_ar }))]}
            />
            <FormSelect
              label="الوحدة الصحية"
              value={caseForm.health_facility ?? ''}
              onChange={(v) => setCaseForm((p) => ({ ...p, health_facility: v || null }))}
              options={[{ value: '', label: '—' }, ...healthFacilities.map((h) => ({ value: h.id, label: h.name_ar }))]}
            />
          </Stack>
          <FormTextField label="ملاحظات" value={caseForm.notes ?? ''} onChange={updateCaseField('notes')} multiline rows={2} />
        </Stack>
      </FormDialog>

      <FormDialog
        open={openCreateContact}
        title="تسجيل مخالط"
        subtitle="تتبع المخالطين للحالات المؤكدة"
        onClose={() => setOpenCreateContact(false)}
        onSubmit={onCreateContact}
        loading={submitting}
      >
        <Stack spacing={2}>
          <FormSelect
            label="الحالة المؤشرة"
            required
            value={contactForm.index_case}
            onChange={(v) => setContactForm((p) => ({ ...p, index_case: v }))}
            options={cases.map((c) => ({ value: c.id, label: `${c.case_number} — ${c.person_name}` }))}
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormTextField label="الاسم" required value={contactForm.person_name} onChange={updateContactField('person_name')} />
            <FormTextField label="الهاتف" value={contactForm.phone ?? ''} onChange={updateContactField('phone')} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormSelect
              label="نوع الاتصال"
              value={contactForm.contact_type ?? 'FAMILY'}
              onChange={(v) => setContactForm((p) => ({ ...p, contact_type: v as ContactTraceWrite['contact_type'] }))}
              options={Object.entries(contactType).map(([k, v]) => ({ value: k, label: v.label }))}
            />
            <FormTextField label="صلة القرابة" value={contactForm.relationship ?? ''} onChange={updateContactField('relationship')} />
            <FormTextField label="الموقع" value={contactForm.location ?? ''} onChange={updateContactField('location')} />
          </Stack>
        </Stack>
      </FormDialog>

      <FormDialog
        open={openCreateInvestigation}
        title="فتح تحقيق وبائي"
        subtitle="تحقيق مرتبط بحالة أو حدث"
        onClose={() => setOpenCreateInvestigation(false)}
        onSubmit={onCreateInvestigation}
        loading={submitting}
      >
        <Stack spacing={2}>
          <FormTextField label="العنوان" required value={investigationForm.title} onChange={updateInvestigationField('title')} />
          <FormSelect
            label="الحالة"
            value={investigationForm.case ?? ''}
            onChange={(v) => setInvestigationForm((p) => ({ ...p, case: v || null }))}
            options={[{ value: '', label: '—' }, ...cases.map((c) => ({ value: c.id, label: `${c.case_number} — ${c.person_name}` }))]}
          />
          <FormTextField label="الفرضية" value={investigationForm.hypothesis ?? ''} onChange={updateInvestigationField('hypothesis')} multiline rows={2} />
        </Stack>
      </FormDialog>

      <FormDialog
        open={openCreateReport}
        title="بلاغ أسبوعي"
        subtitle="منشأة صحية أو نقطة دخول"
        onClose={() => setOpenCreateReport(false)}
        onSubmit={onCreateReport}
        loading={submitting}
        maxWidth="md"
      >
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormTextField label="بداية الفترة" type="date" required value={reportForm.period_start} onChange={(e) => setReportForm((p) => ({ ...p, period_start: e.target.value }))} />
            <FormTextField label="نهاية الفترة" type="date" required value={reportForm.period_end} onChange={(e) => setReportForm((p) => ({ ...p, period_end: e.target.value }))} />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <FormSelect
              label="الوحدة الصحية"
              value={reportForm.health_facility ?? ''}
              onChange={(v) => setReportForm((p) => ({ ...p, health_facility: v || null }))}
              options={[{ value: '', label: '—' }, ...healthFacilities.map((h) => ({ value: h.id, label: h.name_ar }))]}
            />
            <FormSelect
              label="نقطة الدخول"
              value={reportForm.port ?? ''}
              onChange={(v) => setReportForm((p) => ({ ...p, port: v || null }))}
              options={[{ value: '', label: '—' }, ...entryPoints.map((e) => ({ value: e.id, label: e.name_ar }))]}
            />
            <FormSelect
              label="القطاع"
              value={reportForm.sector ?? ''}
              onChange={(v) => setReportForm((p) => ({ ...p, sector: v || null }))}
              options={[{ value: '', label: '—' }, ...sectors.map((s) => ({ value: s.id, label: s.name_ar }))]}
            />
          </Stack>
          <FormTextField label="ملاحظات" value={reportForm.notes ?? ''} onChange={(e) => setReportForm((p) => ({ ...p, notes: e.target.value }))} multiline rows={2} />
        </Stack>
      </FormDialog>
    </Box>
  );
};

export default SurveillanceModulePage;
