import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { enrollmentStatusLabel, ENROLLMENT_STATUS_TONES } from '../../utils/hrLabels';
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
      setError(extractErrorMessage(err, 'تعذر تحميل التسجيل'));
    } finally {
      setLoading(false);
    }
  }, [id]);

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
      notifySuccess(extractErrorMessage(err, 'تعذر تنفيذ الإجراء'));
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
    return <ErrorState message={error ?? 'التسجيل غير موجود'} />;
  }

  const canSubmit = ['DRAFT', 'RETURNED'].includes(enrollment.status);
  const canDecide = ['REQUESTED', 'RETURNED'].includes(enrollment.status) && isHr;
  const canComplete = ['APPROVED', 'IN_PROGRESS'].includes(enrollment.status) && isHr;

  return (
    <Box>
      <PageHeader
        title={`تسجيل تدريب — ${enrollment.plan_name}`}
        subtitle={`${enrollment.employee_name} · ${enrollment.plan_code}`}
        action={
          <Button onClick={() => navigate('/app/hr/training/enrollments')}>رجوع</Button>
        }
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <StatusChip
                  label={enrollmentStatusLabel(enrollment.status)}
                  tone={ENROLLMENT_STATUS_TONES[enrollment.status] ?? 'neutral'}
                />
                {enrollment.is_self_service && (
                  <Typography variant="caption" color="text.secondary">
                    تسجيل ذاتي
                  </Typography>
                )}
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}><Row label="الموظف" value={enrollment.employee_name} /></Grid>
                <Grid item xs={6}><Row label="الرقم الوظيفي" value={enrollment.employee_number} /></Grid>
                <Grid item xs={6}><Row label="الدورة" value={enrollment.plan_name} /></Grid>
                <Grid item xs={6}><Row label="رمز الدورة" value={enrollment.plan_code} /></Grid>
                <Grid item xs={6}>
                  <Row label="تاريخ الطلب" value={formatDate(enrollment.requested_date)} />
                </Grid>
                <Grid item xs={6}>
                  <Row
                    label="الفترة"
                    value={
                      enrollment.start_date || enrollment.end_date
                        ? `${formatDate(enrollment.start_date)} ← ${formatDate(enrollment.end_date)}`
                        : null
                    }
                  />
                </Grid>
                <Grid item xs={6}><Row label="الدرجة" value={enrollment.score ?? '—'} /></Grid>
                <Grid item xs={6}>
                  <Row label="درجة النجاح" value={enrollment.pass_score ?? '—'} />
                </Grid>
                <Grid item xs={6}>
                  <Row
                    label="النتيجة"
                    value={
                      enrollment.status === 'COMPLETED' || enrollment.status === 'FAILED'
                        ? enrollment.passed
                          ? 'ناجح'
                          : 'راسب'
                        : null
                    }
                  />
                </Grid>
                <Grid item xs={6}>
                  <Row label="مرجع الشهادة" value={enrollment.certificate_ref || null} />
                </Grid>
              </Grid>
              {enrollment.rejection_reason && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  سبب الرفض: {enrollment.rejection_reason}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                الإجراءات
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={1}>
                {canSubmit && (
                  <Button
                    variant="contained"
                    startIcon={<SendIcon />}
                    disabled={busy}
                    onClick={() => run(() => submitTrainingEnrollment(enrollment.id), 'تم الإرسال للاعتماد')}
                  >
                    إرسال للاعتماد
                  </Button>
                )}
                {canDecide && (
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<CheckIcon />}
                      disabled={busy}
                      onClick={() => run(() => approveTrainingEnrollment(enrollment.id), 'تم الاعتماد')}
                    >
                      اعتماد
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CloseIcon />}
                      disabled={busy}
                      onClick={() => setRejecting(true)}
                    >
                      رفض
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
                    تسجيل الإتمام والدرجة
                  </Button>
                )}
              </Stack>

              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                سجلّ القرار
              </Typography>
              <Row label="مُرسل بواسطة" value={enrollment.requested_by_name} />
              <Row label="اعتمده" value={enrollment.decided_by_name} />
              <Row label="وقت القرار" value={formatDateTime(enrollment.decided_at)} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={rejecting} onClose={() => setRejecting(false)} fullWidth maxWidth="sm">
        <DialogTitle>رفض تسجيل التدريب</DialogTitle>
        <DialogContent>
          <FormTextField
            label="سبب الرفض"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={3}
            required
            helperText="سبب الرفض يظهر للموظف في صفحة التسجيل"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(false)}>إلغاء</Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy || !reason.trim()}
            onClick={async () => {
              await run(
                () => rejectTrainingEnrollment(enrollment.id, reason),
                'تم الرفض',
              );
              setRejecting(false);
              setReason('');
            }}
          >
            رفض
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={completing} onClose={() => setCompleting(false)} fullWidth maxWidth="sm">
        <DialogTitle>تسجيل إتمام التدريب</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              الإتمام مشتق: النجاح = الدرجة ≥ درجة النجاح في الدورة.
            </Alert>
            <FormTextField
              label="الدرجة"
              type="number"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              required
              inputProps={{ min: 0, max: 100, step: 0.5 }}
            />
            <FormTextField
              label="مرجع الشهادة"
              value={certificateRef}
              onChange={(e) => setCertificateRef(e.target.value)}
              helperText="اختياري — رابط أو رقم خارجي للشهادة"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleting(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={busy || score === ''}
            onClick={async () => {
              await run(
                () =>
                  completeTrainingEnrollment(enrollment.id, Number(score), certificateRef.trim()),
                'تم تسجيل الإتمام',
              );
              setCompleting(false);
            }}
          >
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TrainingDetailPage;
