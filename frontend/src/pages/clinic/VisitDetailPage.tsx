import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import LogoutIcon from '@mui/icons-material/Logout';
import ScienceIcon from '@mui/icons-material/Science';
import MedicationIcon from '@mui/icons-material/Medication';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import BadgeIcon from '@mui/icons-material/Badge';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import HomeIcon from '@mui/icons-material/Home';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import EditNoteIcon from '@mui/icons-material/EditNote';
import NotesIcon from '@mui/icons-material/Notes';
import { PageHeader, EmptyState, ListSkeleton } from '../../components/common';
import { useAuth } from '../../hooks/useAuth';
import {
  addPrescription,
  closeVisit,
  getClinicMedications,
  getClinicVisit,
  getVisitLabResults,
  isolateVisit,
  issueCertificate,
  releaseIsolation,
  requestClinicLab,
  submitEmr,
  submitTriage,
  transitionVisit,
  updateIsolationStatus,
} from '../../api/endpoints/clinic';
import type { ClinicDisposition, ClinicVisitDetail, LabResultSummary } from '../../types/clinic';
import { getHealthStatusMeta, getIsoSeverityMeta, getIsolationTypeMeta } from '../../utils/clinicStatus';
import { getDiseases } from '../../api/endpoints/laboratory';
import type { Disease } from '../../types/laboratory';
import { visitStatus } from '../../utils/status';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';
import { GlassPanel, MetaLine, PassportChip, PersonAvatar, SectionHeader } from './ui';

const visitStatusColors: Record<string, 'success' | 'error'> = {
  OPEN: 'success',
  CLOSED: 'error',
};

const priorityColors: Record<string, 'default' | 'warning' | 'error'> = {
  ROUTINE: 'default',
  HIGH: 'warning',
  URGENT: 'error',
};

const PHASE_ORDER = [
  'REGISTERED',
  'TRIAGED',
  'EXAMINED',
  'LABORATORY',
  'DECISION',
  'CERTIFICATE',
  'CLOSED',
] as const;

const fieldValue = (obj: Record<string, unknown> | undefined, key: string) => {
  const value = obj?.[key];
  return value == null ? '' : String(value);
};

const ClinicTextField = (props: TextFieldProps) => (
  <TextField
    {...props}
    sx={{
      ...(props.sx || {}),
      '& .MuiOutlinedInput-root': {
        bgcolor: 'rgba(16,40,34,0.03)',
        borderRadius: 2.5,
        transition: 'background-color 150ms ease, box-shadow 150ms ease',
        '&:hover': { bgcolor: 'rgba(16,40,34,0.05)' },
        '&.Mui-focused': { bgcolor: '#fff', boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}26` },
      },
    }}
  />
);

const SectionLabel = ({ children, color = 'primary.main' }: { children: React.ReactNode; color?: string }) => (
  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5, mb: 1.5 }}>
    <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{children}</Typography>
  </Stack>
);

const VisitDetailPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const priorityLabels = useMemo<Record<string, string>>(
    () => ({
      ROUTINE: t('clinic.visitDetail.triage.priority.routine'),
      HIGH: t('clinic.visitDetail.triage.priority.high'),
      URGENT: t('clinic.visitDetail.triage.priority.urgent'),
    }),
    [t]
  );
  const sampleTypeLabels = useMemo<Record<string, string>>(
    () => ({
      SWAB: t('clinic.visitDetail.triage.sample.swab'),
      BLOOD: t('clinic.visitDetail.triage.sample.blood'),
      STOOL: t('clinic.visitDetail.triage.sample.stool'),
      URINE: t('clinic.visitDetail.triage.sample.urine'),
      OTHER: t('clinic.visitDetail.sections.other'),
    }),
    [t]
  );
  const decisionOptions = useMemo(
    () => [
      { value: 'RELEASE', label: t('clinic.visitDetail.triage.disposition.release'), icon: <HomeIcon />, color: 'success' as const, accent: '#1d7a54' },
      { value: 'FOLLOW_UP', label: t('clinic.visitDetail.triage.disposition.followUp'), icon: <HealthAndSafetyIcon />, color: 'warning' as const, accent: '#a86400' },
      { value: 'HOSPITAL', label: t('clinic.visitDetail.triage.disposition.hospital'), icon: <LocalHospitalIcon />, color: 'error' as const, accent: '#c63a3a' },
    ],
    [t]
  );
  const vitalSignFields = useMemo(
    () => [
      { key: 'temperature', label: t('clinic.visitDetail.emr.vitals.temperature') },
      { key: 'heart_rate', label: t('clinic.visitDetail.emr.vitals.heartRate') },
      { key: 'respiratory_rate', label: t('clinic.visitDetail.emr.vitals.respiratoryRate') },
      { key: 'blood_pressure', label: t('clinic.visitDetail.emr.vitals.bloodPressure') },
      { key: 'oxygen_saturation', label: t('clinic.visitDetail.emr.vitals.oxygenSaturation') },
    ],
    [t]
  );
  const physicalExamFields = useMemo(
    () => [
      { key: 'general_condition', label: t('clinic.visitDetail.emr.exam.generalCondition') },
      { key: 'chest', label: t('clinic.visitDetail.emr.exam.chest') },
      { key: 'throat', label: t('clinic.visitDetail.emr.exam.throat') },
      { key: 'abdomen', label: t('clinic.visitDetail.emr.exam.abdomen') },
      { key: 'skin', label: t('clinic.visitDetail.emr.exam.skin') },
      { key: 'other', label: t('clinic.visitDetail.sections.other') },
    ],
    [t]
  );
  const severityOptions = useMemo(() => [t('clinic.visitDetail.triage.severityOptions.low'), t('clinic.shared.isoSeverity.medium'), t('clinic.visitDetail.triage.severityOptions.severe'), t('clinic.shared.isoSeverity.critical')], [t]);
  const phaseMeta = useMemo<Record<string, { label: string; color: string; icon: React.ReactNode }>>(
    () => ({
      REGISTERED: { label: t('clinic.dashboard.phase.registered'), color: '#8a8f98', icon: <EditNoteIcon sx={{ fontSize: 16 }} /> },
      TRIAGED: { label: t('clinic.dashboard.phase.triaged'), color: '#b7791f', icon: <MonitorHeartIcon sx={{ fontSize: 16 }} /> },
      EXAMINED: { label: t('clinic.dashboard.phase.examined'), color: 'primary.main', icon: <BadgeIcon sx={{ fontSize: 16 }} /> },
      LABORATORY: { label: t('clinic.dashboard.phase.laboratory'), color: 'info.main', icon: <ScienceIcon sx={{ fontSize: 16 }} /> },
      DECISION: { label: t('clinic.dashboard.phase.decision'), color: '#7b4fb3', icon: <NotesIcon sx={{ fontSize: 16 }} /> },
      CERTIFICATE: { label: t('clinic.dashboard.phase.certificate'), color: '#0e7490', icon: <HealthAndSafetyIcon sx={{ fontSize: 16 }} /> },
      CLOSED: { label: t('clinic.dashboard.phase.closed'), color: 'error.main', icon: <LockIcon sx={{ fontSize: 16 }} /> },
    }),
    [t]
  );
  const severityMeta = useMemo<Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' }>>(
    () => ({
      LOW: { label: t('clinic.shared.isoSeverity.low'), color: 'success' },
      MEDIUM: { label: t('clinic.shared.isoSeverity.medium'), color: 'warning' },
      HIGH: { label: t('clinic.shared.isoSeverity.high'), color: 'error' },
      EMERGENCY: { label: t('clinic.visitDetail.triage.severity.emergency'), color: 'error' },
    }),
    [t]
  );
  const routingOptions = useMemo(
    () => [
      { value: 'CLINIC', label: t('clinic.visitDetail.triage.routing.clinic') },
      { value: 'HOSPITAL', label: t('clinic.shared.isolationType.hospital') },
      { value: 'ISOLATION', label: t('clinic.visitDetail.triage.routing.isolation') },
      { value: 'RELEASE', label: t('clinic.visitDetail.triage.routing.release') },
    ],
    [t]
  );
  const resultMeta = useMemo<Record<string, { label: string; color: 'success' | 'error' | 'warning' }>>(
    () => ({
      NEGATIVE: { label: t('clinic.visitDetail.lab.result.negative'), color: 'success' },
      POSITIVE: { label: t('clinic.visitDetail.lab.result.positive'), color: 'error' },
      INCONCLUSIVE: { label: t('clinic.visitDetail.lab.result.inconclusive'), color: 'warning' },
    }),
    [t]
  );
  const resultApproval = useMemo<Record<string, { label: string }>>(
    () => ({
      PENDING: { label: t('clinic.visitDetail.lab.approval.pending') },
      APPROVED: { label: t('clinic.visitDetail.lab.approval.approved') },
    }),
    [t]
  );
  const certTypeLabels = useMemo<Record<string, string>>(
    () => ({
      CLEARANCE: t('clinic.visitDetail.certificate.type.clearance'),
      NEGATIVE: t('clinic.visitDetail.certificate.type.negative'),
      MEDICAL: t('clinic.visitDetail.certificate.type.medical'),
    }),
    [t]
  );
  const certVerdictLabels = useMemo<Record<string, string>>(
    () => ({
      RELEASE: t('clinic.visitDetail.certificate.verdict.release'),
      HOSPITAL: t('clinic.shared.isolationType.hospital'),
      ISOLATION: t('clinic.visitDetail.certificate.verdict.isolation'),
    }),
    [t]
  );
  const isolationTypeMeta = useMemo(() => getIsolationTypeMeta(t), [t]);
  const isoSeverityMeta = useMemo(() => getIsoSeverityMeta(t), [t]);
  const healthStatusMeta = useMemo(() => getHealthStatusMeta(t), [t]);
  const { id = '' } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [visit, setVisit] = useState<ClinicVisitDetail | null>(null);
  const [labResults, setLabResults] = useState<LabResultSummary[]>([]);
  const [medications, setMedications] = useState<Array<{ id: string; name: string; unit?: string; interactions?: string[] }>>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vitals, setVitals] = useState<Record<string, string>>({});
  const [exam, setExam] = useState<Record<string, string>>({});
  const [diagnosis, setDiagnosis] = useState('');
  const [severity, setSeverity] = useState('');
  const [notes, setNotes] = useState('');

  const [sampleType, setSampleType] = useState('SWAB');
  const [diseaseCode, setDiseaseCode] = useState('');
  const [labPriority, setLabPriority] = useState('ROUTINE');

  const [medicationId, setMedicationId] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [instructions, setInstructions] = useState('');

  const [decision, setDecision] = useState('');
  const [summary, setSummary] = useState('');
  const [closeConfirming, setCloseConfirming] = useState(false);

  const [triageOpen, setTriageOpen] = useState(false);
  const [triaging, setTriaging] = useState(false);
  const [triageForm, setTriageForm] = useState<Record<string, string>>({
    severity: 'MEDIUM',
    temperature: '',
    oxygen_saturation: '',
    heart_rate: '',
    respiratory_rate: '',
    systolic_bp: '',
    diastolic_bp: '',
    symptoms: '',
    chief_complaint: '',
    routing: 'CLINIC',
  });

  const [isolateOpen, setIsolateOpen] = useState(false);
  const [isolating, setIsolating] = useState(false);
  const [isolateForm, setIsolateForm] = useState<Record<string, string>>({
    isolation_type: 'CLINIC_ISOLATION',
    severity: 'MEDIUM',
    required_days: '14',
    expected_end_date: '',
    notes: '',
  });
  const [releaseConfirm, setReleaseConfirm] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [dischargeSummary, setDischargeSummary] = useState('');

  const [certOpen, setCertOpen] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [certForm, setCertForm] = useState<Record<string, string>>({
    certificate_type: 'CLEARANCE',
    verdict: 'RELEASE',
    decision: '',
  });

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      getClinicVisit(id),
      getVisitLabResults(id).catch(() => ({ data: { data: [] } })),
      getClinicMedications().catch(() => ({ data: { data: [] } })),
      getDiseases({ page_size: 100 }).catch(() => ({ data: { data: { results: [] } } })),
    ])
      .then(([visitResponse, labResponse, medsResponse, diseasesResponse]) => {
        const data = visitResponse.data.data;
setVisit(data);
        setLabResults(labResponse.data.data);
        setMedications(medsResponse.data.data);
        setDiseases(diseasesResponse.data.data.results);

        const emr = data.emr;
        if (emr) {
          const vitalsMap: Record<string, string> = {};
          vitalSignFields.forEach((f) => {
            vitalsMap[f.key] = fieldValue(emr.vital_signs, f.key);
          });
          setVitals(vitalsMap);
          const examMap: Record<string, string> = {};
          physicalExamFields.forEach((f) => {
            examMap[f.key] = fieldValue(emr.physical_exam, f.key);
          });
          setExam(examMap);
          setDiagnosis(fieldValue(emr.clinical_notes, 'diagnosis'));
          setSeverity(fieldValue(emr.clinical_notes, 'severity'));
          setNotes(fieldValue(emr.clinical_notes, 'notes'));
        }
      })
      .catch(() => setError(t('clinic.visitDetail.page.errors.loadVisit')))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id]);

  const isOpen = visit?.visit_status === 'OPEN';

  const selectedMedication = medications.find((m) => m.id === medicationId);
  const interactions = selectedMedication?.interactions || [];

  const handleSaveEmr = async () => {
    if (!visit || saving) return;
    setSaving(true);
    try {
      await submitEmr(visit.id, {
        clinical_notes: { diagnosis, severity, notes },
        vital_signs: vitals,
        physical_exam: exam,
      });
      notifySuccess(t('clinic.visitDetail.emr.messages.saved'));
      load();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.visitDetail.emr.errors.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleRequestLab = async () => {
    if (!visit || saving) return;
    if (!diseaseCode) {
      notifyError(t('clinic.visitDetail.lab.errors.selectDisease'));
      return;
    }
    setSaving(true);
    try {
      await requestClinicLab(visit.id, { sample_type: sampleType, disease_code: diseaseCode, priority: labPriority });
      notifySuccess(t('clinic.visitDetail.lab.messages.requested'));
      setDiseaseCode('');
      load();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.visitDetail.lab.errors.requestFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleAddPrescription = async () => {
    if (!visit || saving) return;
    if (!medicationId || !dosage || !frequency || !durationDays) {
      notifyError(t('clinic.visitDetail.emr.errors.completePrescription'));
      return;
    }
    setSaving(true);
    try {
      await addPrescription(visit.id, {
        medication: medicationId,
        dosage,
        frequency,
        duration_days: Number(durationDays),
        instructions,
      });
      notifySuccess(t('clinic.visitDetail.emr.prescription.added'));
      setMedicationId('');
      setDosage('');
      setFrequency('');
      setDurationDays('');
      setInstructions('');
      load();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.visitDetail.emr.prescription.failed')));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!visit || saving || !decision) return;
    setSaving(true);
    try {
      await closeVisit(visit.id, { decision, summary });
      notifySuccess(t('clinic.visitDetail.certificate.messages.closed'));
      load();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.clinic.messages.closeVisitFailed')));
    } finally {
      setSaving(false);
    }
  };

  const canTransitionTo = (p: string) => (visit?.allowed_transitions ?? []).includes(p);

  const handleTransition = async (phase: string) => {
    if (!visit || saving) return;
    setSaving(true);
    try {
      await transitionVisit(visit.id, phase);
      notifySuccess(t('clinic.visitDetail.journey.messages.transitioned'));
      load();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.visitDetail.journey.errors.transitionFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitTriage = async () => {
    if (!visit || triaging) return;
    setTriaging(true);
    const payload: Record<string, unknown> = {
      severity: triageForm.severity,
      routing: triageForm.routing,
      chief_complaint: triageForm.chief_complaint,
      symptoms: triageForm.symptoms
        .split(/[,،]|\n/)
        .map((s) => s.trim())
        .filter(Boolean),
    };
    ['temperature', 'oxygen_saturation', 'heart_rate', 'respiratory_rate', 'systolic_bp', 'diastolic_bp'].forEach(
      (k) => {
        if (triageForm[k]) payload[k] = Number(triageForm[k]);
      },
    );
    try {
      await submitTriage(visit.id, payload);
      notifySuccess(t('clinic.visitDetail.triage.messages.saved'));
      setTriageOpen(false);
      load();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.visitDetail.triage.errors.saveFailed')));
    } finally {
      setTriaging(false);
    }
  };

  const handleIsolate = async () => {
    if (!visit || isolating) return;
    setIsolating(true);
    const payload: Record<string, unknown> = {
      isolation_type: isolateForm.isolation_type,
      severity: isolateForm.severity,
      required_days: Number(isolateForm.required_days) || 14,
      notes: isolateForm.notes,
    };
    if (isolateForm.expected_end_date) payload.expected_end_date = isolateForm.expected_end_date;
    try {
      await isolateVisit(visit.id, payload);
      notifySuccess(t('clinic.visitDetail.isolation.messages.registered'));
      setIsolateOpen(false);
      load();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.visitDetail.isolation.errors.registerFailed')));
    } finally {
      setIsolating(false);
    }
  };

  const handleUpdateHealth = async (value: string) => {
    if (!visit?.isolation) return;
    try {
      await updateIsolationStatus(visit.isolation.id, value);
      notifySuccess(t('clinic.visitDetail.isolation.messages.healthUpdated'));
      load();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.visitDetail.isolation.errors.updateFailed')));
    }
  };

  const handleReleaseIsolation = async () => {
    if (!visit?.isolation || releasing) return;
    setReleasing(true);
    try {
      await releaseIsolation(visit.isolation.id, { discharge_summary: dischargeSummary });
      notifySuccess(t('clinic.isolation.messages.released'));
      setReleaseConfirm(false);
      setDischargeSummary('');
      load();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.isolation.messages.releaseFailed')));
    } finally {
      setReleasing(false);
    }
  };

  const handleIssueCertificate = async () => {
    if (!visit || issuing) return;
    setIssuing(true);
    try {
      await issueCertificate(visit.id, {
        certificate_type: certForm.certificate_type,
        verdict: certForm.verdict,
        decision: certForm.decision,
      });
      notifySuccess(t('clinic.visitDetail.certificate.messages.issued'));
      setCertOpen(false);
      setCertForm({ certificate_type: 'CLEARANCE', verdict: 'RELEASE', decision: '' });
      load();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.visitDetail.certificate.errors.issueFailed')));
    } finally {
      setIssuing(false);
    }
  };

  const disposition = useMemo<ClinicDisposition | null>(() => {
    const d = visit?.emr?.clinical_notes?.disposition as ClinicDisposition | undefined;
    return d || null;
  }, [visit]);

  const decisionMeta = decisionOptions.find((d) => d.value === disposition?.decision);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <PageHeader title={t('clinic.visitDetail.page.header.title')} subtitle={t('clinic.visitDetail.page.header.loading')} eyebrow={t('clinic.visitDetail.page.header.eyebrow')} />
        <GlassPanel>
          <Box sx={{ p: 3 }}>
            <ListSkeleton count={6} />
          </Box>
        </GlassPanel>
      </Container>
    );
  }

  if (error || !visit) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 } }}>
        <PageHeader title={t('clinic.visitDetail.page.header.title')} subtitle={t('clinic.visitDetail.page.header.eyebrow')} eyebrow={t('clinic.visitDetail.page.header.eyebrow')} />
        <GlassPanel>
          <Box sx={{ p: 3 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <EmptyState
              icon={<HealthAndSafetyIcon />}
              title={t('clinic.visitDetail.page.error.title')}
              description={t('clinic.visitDetail.page.error.description')}
            />
            <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mt: 2 }}>
              <Button variant="contained" onClick={() => navigate('/app/clinic')}>
                {t('clinic.visitDetail.page.back')}
              </Button>
            </Stack>
          </Box>
        </GlassPanel>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/app/clinic')} sx={{ mb: 2, fontWeight: 700 }}>
        {t('clinic.visitDetail.page.back')}
      </Button>

      {/* Hero header */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 4.5,
          mb: 3,
          background: 'linear-gradient(135deg, #075447 0%, #0a6b58 55%, #0c7f6a 100%)',
          boxShadow: '0 18px 44px -16px rgba(7,84,71,0.5)',
          color: '#fff',
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            width: 240,
            height: 240,
            borderRadius: '50%',
            top: -110,
            insetInlineEnd: -30,
            background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 65%)',
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            width: 170,
            height: 170,
            borderRadius: '50%',
            bottom: -90,
            insetInlineStart: '18%',
            background: 'radial-gradient(circle, rgba(44,120,210,0.2), transparent 65%)',
          }}
        />
        <Box sx={{ p: { xs: 3, md: 4 }, position: 'relative' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ minWidth: 0 }}>
            <PersonAvatar name={visit.traveler_name} size={72} square />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="overline" component="span" sx={{ fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.75)' }}>
                {t('clinic.visitDetail.page.overline')}
              </Typography>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: '#fff', mb: 0.5, textWrap: 'balance' }}>
                {visit.traveler_name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <PassportChip number={visit.passport_number} />
<Chip
                  label={visitStatus[visit.visit_status]?.label || visit.visit_status}
                  color={visitStatusColors[visit.visit_status] || 'default'}
                  size="small"
                  sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.92)' }}
                />
                <Chip
                  label={phaseMeta[visit.phase ?? '']?.label || visit.phase}
                  size="small"
                  sx={{ fontWeight: 700, bgcolor: phaseMeta[visit.phase ?? '']?.color || '#0c7f6a', color: '#fff' }}
                />
              </Stack>
            </Box>
          </Stack>
        </Box>
        <Box sx={{ px: { xs: 3, md: 4 }, pb: 3, position: 'relative' }}>
          <Grid container spacing={{ xs: 2, md: 3 }}>
            <Grid item xs={6} md={3}>
              <MetaLine label={t('clinic.clinic.cols.doctor')} value={visit.doctor_name || '—'} />
            </Grid>
            <Grid item xs={6} md={3}>
              <MetaLine label={t('clinic.clinic.cols.openedAt')} value={formatDateTime(visit.opened_at)} />
            </Grid>
            <Grid item xs={6} md={3}>
              <MetaLine label={t('clinic.visitDetail.page.meta.closedAt')} value={visit.closed_at ? formatDateTime(visit.closed_at) : '—'} />
            </Grid>
            <Grid item xs={6} md={3}>
              <MetaLine label={t('clinic.visitDetail.page.meta.user')} value={user?.full_name || '—'} />
            </Grid>
          </Grid>
        </Box>
      </Box>

      {!isOpen && disposition && (
        <Alert
          severity={decisionMeta?.color === 'error' ? 'error' : decisionMeta?.color === 'warning' ? 'warning' : 'success'}
          icon={decisionMeta?.icon}
          sx={{ mb: 3, borderRadius: 3 }}
        >
          <Typography sx={{ fontWeight: 700 }}>{decisionMeta?.label || disposition.decision}</Typography>
          {disposition.summary && <Typography variant="body2">{disposition.summary}</Typography>}
          <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.8 }}>
            {disposition.closed_by ? t('clinic.visitDetail.page.meta.closedBy', { name: disposition.closed_by }) : ''}
            {disposition.closed_at ? formatDateTime(disposition.closed_at) : ''}
          </Typography>
        </Alert>
      )}

      <Grid container spacing={{ xs: 2, md: 3 }}>
        <Grid item xs={12} md={7}>
          <Stack spacing={{ xs: 2, md: 3 }}>
            {/* EMR */}
            <GlassPanel accent="linear-gradient(90deg, #0c7f6a, transparent)">
              <Box sx={{ p: { xs: 2.5, md: 3 }, pt: { xs: 2.5, md: 3 } }}>
                <SectionHeader
                  icon={<BadgeIcon fontSize="small" />}
                  title={t('clinic.visitDetail.emr.title')}
                  action={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" variant="outlined" label={visit.emr ? t('clinic.visitDetail.emr.savedChip.saved') : t('clinic.visitDetail.emr.savedChip.unsaved')} color={visit.emr ? 'success' : 'default'} sx={{ fontWeight: 700 }} />
                      {isOpen && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                          onClick={handleSaveEmr}
                          disabled={saving}
                          sx={{ fontWeight: 700 }}
                        >
                          {t('common.save')}
                        </Button>
                      )}
                    </Stack>
                  }
                />
                <SectionLabel color="primary.main">
                  <MonitorHeartIcon sx={{ fontSize: 16, color: 'primary.main' }} /> {t('clinic.visitDetail.emr.sections.vitals')}
                </SectionLabel>
                <Grid container spacing={2} sx={{ mb: 1 }}>
                  {vitalSignFields.map((f) => (
                    <Grid item xs={6} sm={4} key={f.key}>
                      <ClinicTextField
                        label={f.label}
                        value={vitals[f.key] || ''}
                        onChange={(e) => setVitals((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        size="small"
                        fullWidth
                        disabled={!isOpen}
                      />
                    </Grid>
                  ))}
                </Grid>

                <SectionLabel color="#2f6dd0">
                  <EditNoteIcon sx={{ fontSize: 16, color: 'info.main' }} /> {t('clinic.visitDetail.emr.sections.physicalExam')}
                </SectionLabel>
                <Grid container spacing={2} sx={{ mb: 1 }}>
                  {physicalExamFields.map((f) => (
                    <Grid item xs={6} key={f.key}>
                      <ClinicTextField
                        label={f.label}
                        value={exam[f.key] || ''}
                        onChange={(e) => setExam((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        size="small"
                        fullWidth
                        disabled={!isOpen}
                      />
                    </Grid>
                  ))}
                </Grid>

                <SectionLabel color="#a86400">
                  <NotesIcon sx={{ fontSize: 16, color: '#a86400' }} /> {t('clinic.visitDetail.emr.sections.clinicalNotes')}
                </SectionLabel>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <ClinicTextField
                      label={t('clinic.visitDetail.emr.fields.diagnosis')}
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      size="small"
                      fullWidth
                      disabled={!isOpen}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <ClinicTextField
                      select
                      label={t('clinic.visitDetail.emr.fields.severity')}
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      size="small"
                      fullWidth
                      disabled={!isOpen}
                    >
                      <MenuItem value="">—</MenuItem>
                      {severityOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </ClinicTextField>
                  </Grid>
                  <Grid item xs={12}>
                    <ClinicTextField
                      label={t('clinic.visitDetail.sections.notes')}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                      disabled={!isOpen}
                    />
                  </Grid>
                </Grid>

                {isOpen && (
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                    onClick={handleSaveEmr}
                    disabled={saving}
                    sx={{ mt: 2.5, fontWeight: 700 }}
                  >
                    {t('clinic.visitDetail.emr.actions.saveEmr')}
                  </Button>
                )}
              </Box>
            </GlassPanel>

            {/* Prescriptions */}
            <GlassPanel accent="linear-gradient(90deg, #4a3383, transparent)">
              <Box sx={{ p: { xs: 2.5, md: 3 }, pt: { xs: 2.5, md: 3 } }}>
                <SectionHeader
                  icon={<MedicationIcon fontSize="small" />}
                  title={t('clinic.visitDetail.emr.prescriptions.title')}
                  count={visit.prescriptions.length}
                  tone="#4a3383"
                />
                {visit.prescriptions.length > 0 && (
                  <Stack spacing={1.5} sx={{ mb: 3 }}>
                    {visit.prescriptions.map((p) => (
                      <Card key={p.id} variant="outlined" sx={{ borderColor: 'divider', borderRadius: 3, bgcolor: 'rgba(255,255,255,0.66)' }}>
                        <CardContent sx={{ p: 2, py: 1.5 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                            <Box>
                              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{p.medication_name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {p.dosage} · {p.frequency} · {p.duration_days} {t('clinic.visitDetail.emr.prescriptions.daysUnit')}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {formatDateTime(p.created_at)}
                            </Typography>
                          </Stack>
                          {p.instructions && <Typography variant="body2" sx={{ mt: 0.5 }}>{p.instructions}</Typography>}
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}

                {isOpen && (
                  <>
                    <SectionLabel color="#4a3383">{t('clinic.visitDetail.emr.prescriptions.newDrug')}</SectionLabel>
                    {interactions.length > 0 && (
                      <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2, borderRadius: 2.5 }}>
                        {t('clinic.visitDetail.emr.prescriptions.interactionAlert', { items: interactions.join(t('clinic.visitDetail.separator.list')) })}
                      </Alert>
                    )}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12}>
                        <ClinicTextField
                          select
                          label={t('clinic.visitDetail.emr.prescriptions.drug')}
                          value={medicationId}
                          onChange={(e) => setMedicationId(e.target.value)}
                          size="small"
                          fullWidth
                        >
                          <MenuItem value="">{t('clinic.visitDetail.emr.prescriptions.selectDrug')}</MenuItem>
                          {medications.map((m) => (
                            <MenuItem key={m.id} value={m.id}>
                              {m.name}{m.unit ? ` (${m.unit})` : ''}
                            </MenuItem>
                          ))}
                        </ClinicTextField>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <ClinicTextField label={t('clinic.visitDetail.emr.prescriptions.dosage')} value={dosage} onChange={(e) => setDosage(e.target.value)} size="small" fullWidth placeholder="500mg" />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <ClinicTextField label={t('clinic.visitDetail.emr.prescriptions.frequency')} value={frequency} onChange={(e) => setFrequency(e.target.value)} size="small" fullWidth placeholder={t('clinic.visitDetail.emr.prescriptions.frequencyPlaceholder')} />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <ClinicTextField label={t('clinic.visitDetail.emr.prescriptions.duration')} type="number" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} size="small" fullWidth />
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <ClinicTextField label={t('clinic.visitDetail.emr.prescriptions.instructions')} value={instructions} onChange={(e) => setInstructions(e.target.value)} size="small" fullWidth />
                      </Grid>
                    </Grid>
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <MedicationIcon />}
                      onClick={handleAddPrescription}
                      disabled={saving}
                      sx={{ fontWeight: 700 }}
                    >
                      {t('clinic.visitDetail.emr.prescriptions.add')}
                    </Button>
                  </>
                )}
              </Box>
            </GlassPanel>
          </Stack>
        </Grid>

        <Grid item xs={12} md={5}>
          <Stack spacing={{ xs: 2, md: 3 }}>
            {/* Workflow phases */}
            <GlassPanel accent="linear-gradient(90deg, #7b4fb3, transparent)">
              <Box sx={{ p: { xs: 2.5, md: 3 }, pt: { xs: 2.5, md: 3 } }}>
                <SectionHeader
                  icon={<NotesIcon fontSize="small" />}
                  title={t('clinic.visitDetail.journey.title')}
                  tone="#7b4fb3"
                  action={
                    isOpen && visit?.phase !== 'DECISION' && visit?.phase !== 'CERTIFICATE' &&
                    canTransitionTo('CLOSED') ? (
                      <Button size="small" onClick={() => handleTransition('CLOSED')} disabled={saving} sx={{ fontWeight: 700 }}>
                        {t('clinic.clinic.actions.closeVisit')}
                      </Button>
                    ) : undefined
                  }
                />
                <Stack spacing={0.75}>
                  {PHASE_ORDER.map((p, idx) => {
                    const meta = phaseMeta[p];
                    const current = p === visit?.phase;
                    const done = PHASE_ORDER.indexOf((visit?.phase as (typeof PHASE_ORDER)[number]) ?? '') > idx;
                    return (
                      <Stack key={p} direction="row" alignItems="center" spacing={1.5}>
                        <Box
                          sx={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                            fontSize: 12,
                            fontWeight: 700,
                            color: done || current ? '#fff' : 'rgba(16,40,34,0.35)',
                            bgcolor: done ? '#0c7f6a' : current ? meta.color : 'rgba(16,40,34,0.07)',
                            border: current ? `2px solid ${meta.color}` : 'none',
                            boxShadow: current ? `0 0 0 4px ${meta.color}22` : 'none',
                          }}
                        >
                          {done ? <CheckCircleIcon sx={{ fontSize: 15 }} /> : idx + 1}
                        </Box>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontWeight: current ? 800 : 600,
                              fontSize: 14,
                              color: current ? meta.color : 'text.secondary',
                            }}
                          >
                            {meta.label}
                          </Typography>
                          {current && (
                            <Chip size="small" label={t('clinic.visitDetail.journey.currentChip')} sx={{ height: 20, bgcolor: `${meta.color}1a`, color: meta.color, fontWeight: 700, fontSize: 10.5 }} />
                          )}
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>

                <Divider sx={{ my: 2 }} />

                {isOpen && visit?.phase === 'REGISTERED' && (
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<MonitorHeartIcon />}
                    onClick={() => setTriageOpen(true)}
                    sx={{ fontWeight: 700, mb: 1.5 }}
                  >
                    {t('clinic.visitDetail.triage.title')}
                  </Button>
                )}
                {isOpen && visit?.phase === 'TRIAGED' && (
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<BadgeIcon />}
                    onClick={() => handleTransition('EXAMINED')}
                    disabled={saving}
                    sx={{ fontWeight: 700, mb: 1.5 }}
                  >
                    {t('clinic.visitDetail.journey.steps.examined')}
                  </Button>
                )}
                {isOpen && canTransitionTo('LABORATORY') && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ScienceIcon />}
                    onClick={() => handleTransition('LABORATORY')}
                    disabled={saving}
                    sx={{ fontWeight: 700, mb: 1.5 }}
                  >
                    {t('clinic.visitDetail.journey.steps.laboratory')}
                  </Button>
                )}
                {isOpen && canTransitionTo('DECISION') && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<NotesIcon />}
                    onClick={() => handleTransition('DECISION')}
                    disabled={saving}
                    sx={{ fontWeight: 700, mb: 1.5 }}
                  >
                    {t('clinic.visitDetail.journey.steps.decision')}
                  </Button>
                )}
                {isOpen && !visit.isolation && ['EXAMINED', 'LABORATORY', 'DECISION'].includes(visit.phase ?? '') && (
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<VaccinesIcon />}
                    onClick={() => setIsolateOpen(true)}
                    sx={{ fontWeight: 700, mb: 1.5 }}
                  >
                    {t('clinic.visitDetail.journey.steps.isolation')}
                  </Button>
                )}
                {isOpen && canTransitionTo('CERTIFICATE') && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<HealthAndSafetyIcon />}
                    onClick={() => handleTransition('CERTIFICATE')}
                    disabled={saving}
                    sx={{ fontWeight: 700, mb: 1.5 }}
                  >
                    {t('clinic.visitDetail.certificate.actions.issue')}
                  </Button>
                )}
                {isOpen && !visit.health_certificate && ['DECISION', 'CERTIFICATE'].includes(visit.phase ?? '') && (
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<VerifiedUserIcon />}
                    onClick={() => setCertOpen(true)}
                    sx={{ fontWeight: 700, mb: 1.5, bgcolor: '#0e7490', '&:hover': { bgcolor: '#0b5f74' } }}
                  >
                    {t('clinic.visitDetail.certificate.dialogTitle')}
                  </Button>
                )}
                {!isOpen && (
                  <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                    {t('clinic.visitDetail.journey.completed')}
                  </Alert>
                )}

                {(visit?.triages?.length ?? 0) > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <SectionLabel color="#b7791f">{t('clinic.visitDetail.triage.log.title')}</SectionLabel>
                    <Stack spacing={1}>
                      {visit!.triages!.map((triage) => (
                        <Card key={triage.id} variant="outlined" sx={{ borderColor: 'divider', borderRadius: 3, bgcolor: 'rgba(255,255,255,0.7)' }}>
                          <CardContent sx={{ p: 2, py: 1.5 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                              <Chip size="small" label={severityMeta[triage.severity]?.label || triage.severity} color={severityMeta[triage.severity]?.color || 'default'} sx={{ fontWeight: 700 }} />
                              <Typography variant="caption" color="text.secondary">
                                {triage.triaged_by_name || ''} · {formatDateTime(triage.triaged_at)}
                              </Typography>
                            </Stack>
                            {triage.chief_complaint && (
                              <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>{triage.chief_complaint}</Typography>
                            )}
                            {(triage.symptoms?.length ?? 0) > 0 && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {t('clinic.visitDetail.triage.log.symptoms', { items: (triage.symptoms || []).join(t('clinic.visitDetail.separator.list')) })}
                              </Typography>
                            )}
                            {triage.routing && (
                              <Chip size="small" variant="outlined" sx={{ mt: 1 }} label={routingOptions.find((r) => r.value === triage.routing)?.label || triage.routing} />
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </>
                )}
              </Box>
            </GlassPanel>

            {/* Isolation */}
            {visit.isolation && (
              <GlassPanel accent="linear-gradient(90deg, #7b4fb3, transparent)">
                <Box sx={{ p: { xs: 2.5, md: 3 }, pt: { xs: 2.5, md: 3 } }}>
                  <SectionHeader icon={<VaccinesIcon fontSize="small" />} title={t('clinic.visitDetail.isolation.title')} tone="#7b4fb3" />
                  <Stack spacing={1}>
                    {(() => {
                      const iso = visit.isolation!;
                      const type = isolationTypeMeta[iso.isolation_type];
                      const sev = isoSeverityMeta[iso.severity];
                      const health = healthStatusMeta[iso.health_status];
                      return (
                        <>
                          <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
                            {type && <Chip size="small" label={type.label} sx={{ fontWeight: 700, bgcolor: `${type.tone === 'info' ? '#0e7490' : type.tone === 'error' ? '#c63a3a' : '#7b4fb3'}1a`, color: type.tone === 'info' ? '#0e7490' : type.tone === 'error' ? '#c63a3a' : '#7b4fb3' }} />}
                            {sev && <Chip size="small" color={sev.color} label={sev.label} sx={{ fontWeight: 700 }} />}
                            {health && <Chip size="small" label={health.label} color={health.tone === 'primary' ? 'info' : health.tone} sx={{ fontWeight: 700 }} variant="outlined" />}
                            <Chip size="small" label={t('clinic.visitDetail.isolation.sinceChip', { date: formatDate(iso.start_date) })} sx={{ fontWeight: 700 }} variant="outlined" />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {t('clinic.visitDetail.isolation.durationLine', { days: iso.required_days })}
                            {iso.expected_end_date ? t('clinic.visitDetail.isolation.expectedEnd', { date: formatDate(iso.expected_end_date) }) : ''}
                            {iso.end_date ? t('clinic.visitDetail.isolation.endedAt', { date: formatDate(iso.end_date) }) : ''}
                          </Typography>
                          {iso.notes && <Typography variant="body2">{iso.notes}</Typography>}
                          {iso.status === 'ACTIVE' && (
                            <Stack spacing={1} sx={{ pt: 1 }}>
                              <TextField
                                select
                                size="small"
                                label={t('clinic.visitDetail.isolation.fields.healthStatus')}
                                value={iso.health_status}
                                onChange={(e) => handleUpdateHealth(e.target.value)}
                              >
                                {Object.entries(healthStatusMeta).map(([k, m]) => (
                                  <MenuItem key={k} value={k}>{m.label}</MenuItem>
                                ))}
                              </TextField>
                              <Button
                                fullWidth
                                variant="outlined"
                                color="error"
                                startIcon={<LogoutIcon />}
                                onClick={() => {
                                  setDischargeSummary('');
                                  setReleaseConfirm(true);
                                }}
                                sx={{ fontWeight: 700 }}
                              >
                                {t('clinic.visitDetail.isolation.releaseTitle')}
                              </Button>
                            </Stack>
                          )}
                        </>
                      );
                    })()}
                  </Stack>
                </Box>
              </GlassPanel>
            )}

            {/* Health certificate */}
            {visit.health_certificate && (
              <GlassPanel accent="linear-gradient(90deg, #0e7490, transparent)">
                <Box sx={{ p: { xs: 2.5, md: 3 }, pt: { xs: 2.5, md: 3 } }}>
                  <SectionHeader
                    icon={<VerifiedUserIcon fontSize="small" />}
                    title={t('clinic.visitDetail.certificate.title')}
                    tone="#0e7490"
                    action={
                      <Chip
                        label={visit.health_certificate.status === 'ACTIVE' ? t('clinic.visitDetail.certificate.status.active') : t('clinic.visitDetail.certificate.status.revoked')}
                        color={visit.health_certificate.status === 'ACTIVE' ? 'success' : 'error'}
                        size="small"
                        sx={{ fontWeight: 700 }}
                      />
                    }
                  />
                  <Stack spacing={1}>
                    <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {visit.health_certificate.certificate_number}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('clinic.visitDetail.certificate.typeLine', { type: certTypeLabels[visit.health_certificate.certificate_type] || visit.health_certificate.certificate_type })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('clinic.visitDetail.certificate.verdictLine', { verdict: certVerdictLabels[visit.health_certificate.verdict] || visit.health_certificate.verdict })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('clinic.visitDetail.certificate.issuedBy', { by: visit.health_certificate.issued_by_name || '—', at: formatDateTime(visit.health_certificate.issued_at) })}
                    </Typography>
                    {visit.health_certificate.valid_until && (
                      <Typography variant="body2" color="text.secondary">
                        {t('clinic.visitDetail.certificate.validUntilPrefix')}<b>{formatDate(visit.health_certificate.valid_until)}</b>
                      </Typography>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<VerifiedUserIcon />}
                      onClick={() => window.open(`/verify/certificates/${visit.health_certificate!.certificate_number}`, '_blank')}
                      sx={{ fontWeight: 700 }}
                    >
                      {t('clinic.visitDetail.certificate.publicVerify')}
                    </Button>
                  </Stack>
                </Box>
              </GlassPanel>
            )}

            {/* Lab results */}
            {labResults.length > 0 && (
              <GlassPanel accent="linear-gradient(90deg, #7b4fb3, transparent)">
                <Box sx={{ p: { xs: 2.5, md: 3 }, pt: { xs: 2.5, md: 3 } }}>
                  <SectionHeader icon={<ScienceIcon fontSize="small" />} title={t('clinic.visitDetail.lab.results.title')} count={labResults.length} tone="#7b4fb3" />
                  <Stack spacing={1.5}>
                    {labResults.map((r) => (
                      <Card key={r.id} variant="outlined" sx={{ borderColor: 'divider', borderRadius: 3, bgcolor: 'rgba(255,255,255,0.66)' }}>
                        <CardContent sx={{ p: 2, py: 1.5 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                            <Box>
                              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{r.disease_name || t('clinic.visitDetail.lab.results.defaultName')}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                {r.sample_barcode}{r.sample_type ? ` · ${r.sample_type}` : ''} · {formatDateTime(r.result_date)}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={1}>
                              <Chip
                                size="small"
                                label={resultMeta[r.result]?.label || r.result}
                                color={resultMeta[r.result]?.color || 'default'}
                                sx={{ fontWeight: 700 }}
                              />
                              <Chip
                                size="small"
                                variant="outlined"
                                label={resultApproval[r.approval_status]?.label || r.approval_status}
                                sx={{ fontWeight: 700 }}
                              />
                            </Stack>
                          </Stack>
                          {r.entered_by_name && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {t('clinic.visitDetail.lab.results.entered', { name: r.entered_by_name })}{r.approved_by_name ? t('clinic.visitDetail.lab.results.approved', { name: r.approved_by_name }) : ''}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              </GlassPanel>
            )}

            {/* Lab requests */}
            <GlassPanel accent="linear-gradient(90deg, #2f6dd0, transparent)">
              <Box sx={{ p: { xs: 2.5, md: 3 }, pt: { xs: 2.5, md: 3 } }}>
                <SectionHeader
                  icon={<ScienceIcon fontSize="small" />}
                  title={t('clinic.visitDetail.lab.title')}
                  count={visit.lab_requests.length}
                  tone="#2f6dd0"
                />
                {visit.lab_requests.length > 0 && (
                  <Stack spacing={1.5} sx={{ mb: 3 }}>
                    {visit.lab_requests.map((r) => (
                      <Card key={r.id} variant="outlined" sx={{ borderColor: 'divider', borderRadius: 3, bgcolor: 'rgba(255,255,255,0.66)' }}>
                        <CardContent sx={{ p: 2, py: 1.5 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                            <Box>
                              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{r.disease_name || r.disease_code || r.sample_type}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                {r.barcode}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              label={priorityLabels[r.priority] || r.priority}
                              color={priorityColors[r.priority] || 'default'}
                              sx={{ fontWeight: 700 }}
                            />
                          </Stack>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }} alignItems="center">
                            <Chip size="small" variant="outlined" label={sampleTypeLabels[r.sample_type] || r.sample_type} sx={{ fontWeight: 600 }} />
                            <Typography variant="caption" color="text.secondary">{r.status}</Typography>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}

                {isOpen && (
                  <>
                    <SectionLabel color="#2f6dd0">{t('clinic.visitDetail.lab.newRequest')}</SectionLabel>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6}>
                        <ClinicTextField
                          select
                          label={t('clinic.visitDetail.lab.fields.sampleType')}
                          value={sampleType}
                          onChange={(e) => setSampleType(e.target.value)}
                          size="small"
                          fullWidth
                        >
                          {Object.entries(sampleTypeLabels).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                        </ClinicTextField>
                      </Grid>
                      <Grid item xs={6}>
                        <ClinicTextField
                          select
                          label={t('clinic.visitDetail.lab.fields.priority')}
                          value={labPriority}
                          onChange={(e) => setLabPriority(e.target.value)}
                          size="small"
                          fullWidth
                        >
                          {Object.entries(priorityLabels).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                        </ClinicTextField>
                      </Grid>
                      <Grid item xs={12}>
                        <ClinicTextField
                          select
                          label={t('clinic.visitDetail.lab.fields.disease')}
                          value={diseaseCode}
                          onChange={(e) => setDiseaseCode(e.target.value)}
                          size="small"
                          fullWidth
                        >
                          <MenuItem value="">{t('clinic.visitDetail.lab.selectDisease')}</MenuItem>
                          {diseases.map((d) => (
                            <MenuItem key={d.icd_11_code} value={d.icd_11_code}>
                              {d.icd_11_code} — {d.name_ar}
                            </MenuItem>
                          ))}
                        </ClinicTextField>
                      </Grid>
                    </Grid>
                    <Button
                      variant="contained"
                      startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <ScienceIcon />}
                      onClick={handleRequestLab}
                      disabled={saving}
                      sx={{ fontWeight: 700 }}
                    >
                      {t('clinic.visitDetail.lab.actions.request')}
                    </Button>
                  </>
                )}
              </Box>
            </GlassPanel>

            {/* Close visit */}
            <GlassPanel accent="linear-gradient(90deg, #c63a3a, transparent)">
              <Box sx={{ p: { xs: 2.5, md: 3 }, pt: { xs: 2.5, md: 3 } }}>
                <SectionHeader
                  icon={isOpen ? <LockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                  title={isOpen ? t('clinic.clinic.actions.closeVisit') : t('clinic.visitDetail.page.actions.visitClosed')}
                  tone="#c63a3a"
                />
                {isOpen ? (
                  <>
                    <SectionLabel color="#c63a3a">{t('clinic.visitDetail.page.finalDecision')}</SectionLabel>
                    <Stack spacing={1.5} sx={{ mb: 2 }}>
                      {decisionOptions.map((d) => (
                        <Button
                          key={d.value}
                          fullWidth
                          variant={decision === d.value ? 'contained' : 'outlined'}
                          color={decision === d.value ? d.color : 'inherit'}
                          startIcon={d.icon}
                          onClick={() => setDecision(d.value)}
                          sx={{
                            fontWeight: 700,
                            justifyContent: 'flex-start',
                            borderRadius: 2.5,
                            ...(decision === d.value
                              ? {
                                  boxShadow: `0 8px 18px -10px ${d.accent}`,
                                }
                              : {}),
                          }}
                        >
                          {d.label}
                        </Button>
                      ))}
                    </Stack>
                    <ClinicTextField
                      label={t('clinic.visitDetail.certificate.fields.summary')}
                      value={summary}
                      onChange={(e) => setSummary(e.target.value)}
                      size="small"
                      fullWidth
                      multiline
                      minRows={3}
                      sx={{ mb: 2 }}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      color="error"
                      startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <LockIcon />}
                      onClick={closeConfirming ? handleClose : () => setCloseConfirming(true)}
                      disabled={saving || !decision}
                      sx={{ fontWeight: 700 }}
                    >
                      {closeConfirming ? t('clinic.visitDetail.certificate.confirmClose') : t('clinic.clinic.actions.closeVisit')}
                    </Button>
                    {closeConfirming && (
                      <Button fullWidth size="small" sx={{ mt: 1, fontWeight: 700 }} onClick={() => setCloseConfirming(false)}>
                        {t('common.cancel')}
                      </Button>
                    )}
                  </>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: 2.5 }}>
                    {t('clinic.visitDetail.page.closedNotice')}
                  </Alert>
                )}
              </Box>
            </GlassPanel>

            {/* Vaccines hint */}
            <GlassPanel>
              <Box sx={{ p: { xs: 2.5, md: 3 }, pt: { xs: 2.5, md: 3 } }}>
                <SectionHeader icon={<VaccinesIcon fontSize="small" />} title={t('clinic.visitDetail.page.extraActions')} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {t('clinic.visitDetail.page.passengerFileHint')}
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Button fullWidth variant="outlined" startIcon={<HealthAndSafetyIcon />} onClick={() => navigate(`/app/travelers?search=${visit.passport_number}`)} sx={{ fontWeight: 700 }}>
                  {t('clinic.visitDetail.page.viewPassengerFile')}
                </Button>
              </Box>
            </GlassPanel>
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={triageOpen} onClose={() => setTriageOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('clinic.visitDetail.triage.title')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Box>
              <SectionLabel color="#b7791f">{t('clinic.visitDetail.sections.severity')}</SectionLabel>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(severityMeta).map(([k, v]) => (
                  <Button
                    key={k}
                    size="small"
                    variant={triageForm.severity === k ? 'contained' : 'outlined'}
                    color={v.color}
                    onClick={() => setTriageForm((f) => ({ ...f, severity: k }))}
                    sx={{ fontWeight: 700 }}
                  >
                    {v.label}
                  </Button>
                ))}
              </Stack>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4}>
                <ClinicTextField label={t('clinic.visitDetail.emr.vitals.temperature')} type="number" size="small" fullWidth value={triageForm.temperature} onChange={(e) => setTriageForm((f) => ({ ...f, temperature: e.target.value }))} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <ClinicTextField label={t('clinic.visitDetail.emr.vitals.oxygenSaturation')} type="number" size="small" fullWidth value={triageForm.oxygen_saturation} onChange={(e) => setTriageForm((f) => ({ ...f, oxygen_saturation: e.target.value }))} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <ClinicTextField label={t('clinic.visitDetail.triage.fields.heartRate')} type="number" size="small" fullWidth value={triageForm.heart_rate} onChange={(e) => setTriageForm((f) => ({ ...f, heart_rate: e.target.value }))} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <ClinicTextField label={t('clinic.visitDetail.triage.fields.respiratoryRate')} type="number" size="small" fullWidth value={triageForm.respiratory_rate} onChange={(e) => setTriageForm((f) => ({ ...f, respiratory_rate: e.target.value }))} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <ClinicTextField label={t('clinic.visitDetail.triage.fields.systolicBp')} type="number" size="small" fullWidth value={triageForm.systolic_bp} onChange={(e) => setTriageForm((f) => ({ ...f, systolic_bp: e.target.value }))} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <ClinicTextField label={t('clinic.visitDetail.triage.fields.diastolicBp')} type="number" size="small" fullWidth value={triageForm.diastolic_bp} onChange={(e) => setTriageForm((f) => ({ ...f, diastolic_bp: e.target.value }))} />
              </Grid>
            </Grid>
            <ClinicTextField
              size="small"
              fullWidth
              label={t('clinic.visitDetail.triage.fields.chiefComplaint')}
              value={triageForm.chief_complaint}
              onChange={(e) => setTriageForm((f) => ({ ...f, chief_complaint: e.target.value }))}
            />
            <ClinicTextField
              size="small"
              fullWidth
              label={t('clinic.visitDetail.triage.fields.symptomsHint')}
              value={triageForm.symptoms}
              onChange={(e) => setTriageForm((f) => ({ ...f, symptoms: e.target.value }))}
            />
            <ClinicTextField
              select
              size="small"
              fullWidth
              label={t('clinic.visitDetail.triage.fields.routing')}
              value={triageForm.routing}
              onChange={(e) => setTriageForm((f) => ({ ...f, routing: e.target.value }))}
            >
              {routingOptions.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </ClinicTextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTriageOpen(false)} sx={{ fontWeight: 700 }}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            startIcon={triaging ? <CircularProgress size={16} color="inherit" /> : <MonitorHeartIcon />}
            onClick={handleSubmitTriage}
            disabled={triaging}
            sx={{ fontWeight: 700 }}
          >
            {t('clinic.visitDetail.triage.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={isolateOpen} onClose={() => setIsolateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('clinic.visitDetail.isolation.dialogTitle')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <ClinicTextField
              select
              size="small"
              fullWidth
              label={t('clinic.isolation.cols.isolationType')}
              value={isolateForm.isolation_type}
              onChange={(e) => setIsolateForm((f) => ({ ...f, isolation_type: e.target.value }))}
            >
              {Object.entries(isolationTypeMeta).map(([k, m]) => (
                <MenuItem key={k} value={k}>{m.label}</MenuItem>
              ))}
            </ClinicTextField>
            <Box>
              <SectionLabel color="#c63a3a">{t('clinic.visitDetail.sections.severity')}</SectionLabel>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {Object.entries(isoSeverityMeta).map(([k, v]) => (
                  <Button
                    key={k}
                    size="small"
                    variant={isolateForm.severity === k ? 'contained' : 'outlined'}
                    color={v.color}
                    onClick={() => setIsolateForm((f) => ({ ...f, severity: k }))}
                    sx={{ fontWeight: 700 }}
                  >
                    {v.label}
                  </Button>
                ))}
              </Stack>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <ClinicTextField
                  size="small"
                  fullWidth
                  type="number"
                  label={t('clinic.visitDetail.isolation.fields.requiredDays')}
                  value={isolateForm.required_days}
                  onChange={(e) => setIsolateForm((f) => ({ ...f, required_days: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <ClinicTextField
                  size="small"
                  fullWidth
                  type="date"
                  label={t('clinic.visitDetail.isolation.fields.expectedEnd')}
                  value={isolateForm.expected_end_date}
                  onChange={(e) => setIsolateForm((f) => ({ ...f, expected_end_date: e.target.value }))}
                />
              </Grid>
            </Grid>
            <ClinicTextField
              multiline
              minRows={2}
              fullWidth
              label={t('clinic.visitDetail.sections.notes')}
              value={isolateForm.notes}
              onChange={(e) => setIsolateForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsolateOpen(false)} sx={{ fontWeight: 700 }}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={isolating ? <CircularProgress size={16} color="inherit" /> : <VaccinesIcon />}
            onClick={handleIsolate}
            disabled={isolating}
            sx={{ fontWeight: 700 }}
          >
            {t('clinic.visitDetail.isolation.actions.register')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={releaseConfirm} onClose={() => setReleaseConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('clinic.visitDetail.isolation.releaseTitle')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {t('clinic.visitDetail.isolation.releaseConfirm', { name: visit?.traveler_name })}
            </Typography>
            <ClinicTextField
              multiline
              minRows={2}
              fullWidth
              label={t('clinic.isolation.dialogs.dischargeSummaryLabel')}
              value={dischargeSummary}
              onChange={(e) => setDischargeSummary(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReleaseConfirm(false)} sx={{ fontWeight: 700 }}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={releasing ? <CircularProgress size={16} color="inherit" /> : <LogoutIcon />}
            onClick={handleReleaseIsolation}
            disabled={releasing}
            sx={{ fontWeight: 700 }}
          >
            {t('clinic.isolation.actions.release')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={certOpen} onClose={() => setCertOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('clinic.visitDetail.certificate.dialogTitle')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <ClinicTextField
              select
              size="small"
              fullWidth
              label={t('clinic.visitDetail.certificate.fields.type')}
              value={certForm.certificate_type}
              onChange={(e) => setCertForm((f) => ({ ...f, certificate_type: e.target.value }))}
            >
              {Object.entries(certTypeLabels).map(([k, l]) => (
                <MenuItem key={k} value={k}>{l}</MenuItem>
              ))}
            </ClinicTextField>
            <ClinicTextField
              select
              size="small"
              fullWidth
              label={t('clinic.visitDetail.certificate.fields.verdict')}
              value={certForm.verdict}
              onChange={(e) => setCertForm((f) => ({ ...f, verdict: e.target.value }))}
            >
              {Object.entries(certVerdictLabels).map(([k, l]) => (
                <MenuItem key={k} value={k}>{l}</MenuItem>
              ))}
            </ClinicTextField>
            <ClinicTextField
              multiline
              minRows={2}
              fullWidth
              label={t('clinic.visitDetail.certificate.fields.decisionText')}
              value={certForm.decision}
              onChange={(e) => setCertForm((f) => ({ ...f, decision: e.target.value }))}
            />
            <Typography variant="caption" color="text.secondary">
              {t('clinic.visitDetail.certificate.issueHint')}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setCertOpen(false)} sx={{ fontWeight: 700 }}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            startIcon={issuing ? <CircularProgress size={16} color="inherit" /> : <VerifiedUserIcon />}
            onClick={handleIssueCertificate}
            disabled={issuing || !certForm.decision.trim()}
            sx={{ fontWeight: 700, bgcolor: '#0e7490' }}
          >
            {t('clinic.visitDetail.certificate.actions.issue')}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default VisitDetailPage;