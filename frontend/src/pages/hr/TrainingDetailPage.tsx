import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { PageHeader, ErrorState } from '../../components/common';
import { FormTextField } from '../../components/ui';
import StatusChip from '../../components/ui/StatusChip';
import { useAuth } from '../../hooks/useAuth';
import {
  approveTrainingEnrollment,
  completeTrainingEnrollment,
  getTrainingEnrollment,
  rejectTrainingEnrollment,
  submitTrainingEnrollment,
} from '../../api/endpoints/hr';
import type { TrainingEnrollment } from '../../types/hr';
import { ENROLLMENT_STATUS_TONES } from '../../utils/hrLabels';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { extractErrorMessage, notifySuccess } from '../../utils/toast';

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ py: 1 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2">{value ?? '—'}</Typography>
  </Box>
);

const TrainingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isHr = ['HR_MANAGER', 'HR_SPECIALIST', 'HR_APPROVER'].includes(user?.role ?? '');

  const [enrollment, setEnrollment] = useState<TrainingEnrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [completing, setCompleting] = useState(false);
  const [score, setScore] = useState('');
  const [certificateRef, setCertificateRef] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await getTrainingEnrollment(id);
      setEnrollment(data.data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, t('hr.trainingDetail.errors.loadEnrollment')));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      notifySuccess(ok);
      await load();
    } catch (err) {
      notifySuccess(extractErrorMessage(err, t('hr.trainingDetail.errors.actionFailed')));
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error || !enrollment) {
    return <ErrorState message={error ?? t('hr.trainingDetail.errors.enrollmentNotFound')} />;
  }

  const canSubmit = ['DRAFT', 'RETURNED'].includes(enrollment.status);
  const canDecide = ['REQUESTED', 'RETURNED'].includes(enrollment.status) && isHr;
  const canComplete = ['APPROVED', 'IN_PROGRESS'].includes(enrollment.status) && isHr;

  return (
    <Box>
      <PageHeader
        title={t('hr.trainingDetail.pageHeader.title', { plan: enrollment.plan_name })}
        subtitle={`${enrollment.employee_name} · ${enrollment.plan_code}`}
        action={
          <Button onClick={() => navigate('/app/hr/training/enrollments')}>
            {t('hr.trainingDetail.button.back')}
          </Button>
        }
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <StatusChip
                  label={t(`hr.trainingDetail.status.${enrollment.status}`) ?? enrollment.status}
                  tone={ENROLLMENT_STATUS_TONES[enrollment.status] ?? 'neutral'}
                />
                {enrollment.is_self_service && (
                  <Typography variant="caption" color="text.secondary">
                    {t('hr.trainingDetail.selfService')}
                  </Typography>
                )}
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}><Row label={t('hr.trainingDetail.rows.employee')} value={enrollment.employee_name} /></Grid>
                <Grid item xs={6}><Row label={t('hr.trainingDetail.rows.employeeNumber')} value={enrollment.employee_number} /></Grid>
                <Grid item xs={6}><Row label={t('hr.trainingDetail.rows.course')} value={enrollment.plan_name} /></Grid>
                <Grid item xs={6}><Row label={t('hr.trainingDetail.rows.courseCode')} value={enrollment.plan_code} /></Grid>
                <Grid item xs={6}>
                  <Row label={t('hr.trainingDetail.rows.requestDate')} value={formatDate(enrollment.requested_date)} />
                </Grid>
                <Grid item xs={6}>
                  <Row
                    label={t('hr.trainingDetail.rows.period')}
                    value={
                      enrollment.start_date || enrollment.end_date
                        ? `${formatDate(enrollment.start_date)} ← ${formatDate(enrollment.end_date)}`
                        : null
                    }
                  />
                </Grid>
                <Grid item xs={6}><Row label={t('hr.trainingDetail.rows.score')} value={enrollment.score ?? '—'} /></Grid>
                <Grid item xs={6}>
                  <Row label={t('hr.trainingDetail.rows.passScore')} value={enrollment.pass_score ?? '—'} />
                </Grid>
                <Grid item xs={6}>
                  <Row
                    label={t('hr.trainingDetail.rows.result')}
                    value={
                      enrollment.status === 'COMPLETED' || enrollment.status === 'FAILED'
                        ? enrollment.passed
                          ? t('hr.trainingDetail.result.passed')
                          : t('hr.trainingDetail.result.failed')
                        : null
                    }
                  />
                </Grid>
                <Grid item xs={6}>
                  <Row label={t('hr.trainingDetail.rows.certificateRef')} value={enrollment.certificate_ref || null} />
                </Grid>
              </Grid>
              {enrollment.rejection_reason && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {t('hr.trainingDetail.alert.rejectionReason', { reason: enrollment.rejection_reason })}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                {t('hr.trainingDetail.actions.section')}
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1}>
                {canSubmit && (
                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    disabled={busy}
                    onClick={() => run(() => submitTrainingEnrollment(enrollment.id), t('hr.trainingDetail.messages.submitted'))}
                  >
                    {t('hr.trainingDetail.actions.submit')}
                  </Button>
                )}
                {canDecide && (
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckIcon />}
                      disabled={busy}
                      onClick={() => run(() => approveTrainingEnrollment(enrollment.id), t('hr.trainingDetail.messages.approved'))}
                    >
                      {t('hr.trainingDetail.actions.approve')}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CloseIcon />}
                      disabled={busy}
                      onClick={() => setRejecting(true)}
                    >
                      {t('hr.trainingDetail.actions.reject')}
                    </Button>
                  </Stack>
                )}
                {canComplete && (
                  <Button
                    variant="outlined"
                    color="secondary"
                    startIcon={<TaskAltIcon />}
                    onClick={() => setCompleting(true)}
                  >
                    {t('hr.trainingDetail.actions.complete')}
                  </Button>
                )}
              </Stack>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {t('hr.trainingDetail.decision.section')}
              </Typography>
              <Row label={t('hr.trainingDetail.rows.requestedBy')} value={enrollment.requested_by_name} />
              <Row label={t('hr.trainingDetail.rows.decidedBy')} value={enrollment.decided_by_name} />
              <Row label={t('hr.trainingDetail.rows.decidedAt')} value={formatDateTime(enrollment.decided_at)} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={rejecting} onClose={() => setRejecting(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('hr.trainingDetail.dialogs.reject.title')}</DialogTitle>
        <DialogContent>
          <FormTextField
            label={t('hr.trainingDetail.dialogs.reject.label')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={3}
            required
            helperText={t('hr.trainingDetail.dialogs.reject.helperText')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(false)}>{t('hr.trainingDetail.dialogs.cancel')}</Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy || !reason.trim()}
            onClick={async () => {
              await run(
                () => rejectTrainingEnrollment(enrollment.id, reason),
                t('hr.trainingDetail.messages.rejected'),
              );
              setRejecting(false);
              setReason('');
            }}
          >
            {t('hr.trainingDetail.actions.reject')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={completing} onClose={() => setCompleting(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('hr.trainingDetail.dialogs.complete.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              {t('hr.trainingDetail.dialogs.complete.info')}
            </Alert>
            <FormTextField
              label={t('hr.trainingDetail.dialogs.complete.labelScore')}
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
              inputProps={{ min: 0, max: 100, step: 0.5 }}
            />
            <FormTextField
              label={t('hr.trainingDetail.dialogs.complete.labelCertificateRef')}
              value={certificateRef}
              onChange={(e) => setCertificateRef(e.target.value)}
              helperText={t('hr.trainingDetail.dialogs.complete.helperText')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleting(false)}>{t('hr.trainingDetail.dialogs.cancel')}</Button>
          <Button
            variant="contained"
            disabled={busy || score === ''}
            onClick={async () => {
              await run(
                () =>
                  completeTrainingEnrollment(enrollment.id, Number(score), certificateRef.trim()),
                t('hr.trainingDetail.messages.completed'),
              );
              setCompleting(false);
            }}
          >
            {t('hr.trainingDetail.actions.complete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrainingDetailPage;
