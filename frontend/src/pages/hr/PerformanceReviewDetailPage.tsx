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
import UndoIcon from '@mui/icons-material/Undo';
import { PageHeader, ErrorState } from '../../components/common';
import { FormTextField } from '../../components/ui';
import StatusChip from '../../components/ui/StatusChip';
import { useAuth } from '../../hooks/useAuth';
import {
  approvePerformanceReview,
  getPerformanceReview,
  rejectPerformanceReview,
  returnPerformanceReview,
  submitPerformanceReview,
  updatePerformanceReview,
} from '../../api/endpoints/hr';
import type { CycleKPIWithScore, PerformanceReview } from '../../types/hr';
import { ratingLabel, REVIEW_STATUS_TONES, reviewStatusLabel } from '../../utils/hrLabels';
import { formatDateTime } from '../../utils/formatters';
import { extractErrorMessage, notifySuccess } from '../../utils/toast';

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ py: 1 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2">{value ?? '—'}</Typography>
  </Box>
);

const PerformanceReviewDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isHr = ['HR_MANAGER', 'HR_SPECIALIST', 'HR_APPROVER'].includes(user?.role ?? '');

  const [review, setReview] = useState<PerformanceReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [returning, setReturning] = useState(false);
  const [reason, setReason] = useState('');
  const [scores, setScores] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await getPerformanceReview(id);
      setReview(data.data);
      const next: Record<string, string> = {};
      for (const row of data.data.cycle_kpis ?? []) {
        next[row.kpi] = row.score ?? '';
      }
      setScores(next);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'تعذر تحميل التقييم'));
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
  if (error || !review) return <ErrorState message={error ?? 'التقييم غير موجود'} />;

  const kpis: CycleKPIWithScore[] = review.cycle_kpis ?? [];
  const editable = review.status === 'DRAFT' || review.status === 'RETURNED';
  const canSubmit = editable && (isHr || review.status === 'RETURNED');
  const canDecide = ['SUBMITTED'].includes(review.status) && isHr;

  const saveScores = async () => {
    if (!id) return;
    const payload = Object.entries(scores)
      .filter(([, v]) => v !== '')
      .map(([kpi, score]) => ({ kpi, score: Number(score) }));
    await run(
      () => updatePerformanceReview(id, { kpi_scores: payload }),
      'حُفظت درجات المؤشرات',
    );
  };

  return (
    <Box>
      <PageHeader
        title={`تقييم — ${review.employee_name}`}
        subtitle={review.cycle_name}
        action={<Button onClick={() => navigate('/app/hr/performance/reviews')}>رجوع</Button>}
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <StatusChip
                  label={reviewStatusLabel(review.status)}
                  tone={REVIEW_STATUS_TONES[review.status] ?? 'neutral'}
                />
                <Typography variant="body2" fontWeight={700} dir="ltr">
                  {review.total_score ?? '—'} / 100
                </Typography>
                {review.rating && (
                  <Typography variant="body2" color="text.secondary">
                    {ratingLabel(review.rating)}
                  </Typography>
                )}
              </Stack>
              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                درجات المؤشرات
              </Typography>
              {kpis.length === 0 ? (
                <Alert severity="warning">
                  لا توجد مؤشرات في هذه الدورة — عرّف مؤشرات مجموع أوزانها 100 قبل التقييم.
                </Alert>
              ) : (
                <>
                  {kpis.map((kpi) => (
                    <Grid container spacing={2} key={kpi.kpi} alignItems="center" sx={{ mb: 1 }}>
                      <Grid item xs={12} sm={7}>
                        <Typography variant="body2" fontWeight={600}>
                          {kpi.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" dir="ltr">
                          {kpi.weight}%
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={5}>
                        <FormTextField
                          type="number"
                          value={scores[kpi.kpi] ?? ''}
                          onChange={(e) =>
                            setScores((prev) => ({ ...prev, [kpi.kpi]: e.target.value }))
                          }
                          disabled={!editable}
                          inputProps={{ min: 0, max: 100, step: 0.5 }}
                          label="الدرجة"
                        />
                      </Grid>
                    </Grid>
                  ))}
                  {editable && (
                    <Button variant="outlined" disabled={busy} onClick={saveScores}>
                      حفظ الدرجات
                    </Button>
                  )}
                </>
              )}

              {review.strengths && (
                <Box sx={{ mt: 2 }}>
                  <Row label="نقاط القوة" value={review.strengths} />
                  <Row label="نقاط التحسين" value={review.improvements} />
                  <Row label="ملاحظات" value={review.comments} />
                </Box>
              )}
              {review.rejection_reason && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  سبب الرفض: {review.rejection_reason}
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
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
                    onClick={() => run(() => submitPerformanceReview(review.id), 'تم الإرسال للاعتماد')}
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
                      onClick={() => run(() => approvePerformanceReview(review.id), 'تم الاعتماد')}
                    >
                      اعتماد
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<UndoIcon />}
                      disabled={busy}
                      onClick={() => setReturning(true)}
                    >
                      إعادة
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
              </Stack>

              <Divider sx={{ my: 2 }} />
              <Row label="المُقيِّم" value={review.reviewed_by_name} />
              <Row label="المعتمد" value={review.decided_by_name} />
              <Row label="وقت القرار" value={formatDateTime(review.decided_at)} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={rejecting} onClose={() => setRejecting(false)} fullWidth maxWidth="sm">
        <DialogTitle>رفض التقييم</DialogTitle>
        <DialogContent>
          <FormTextField
            label="سبب الرفض"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={3}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(false)}>إلغاء</Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy || !reason.trim()}
            onClick={async () => {
              await run(() => rejectPerformanceReview(review.id, reason), 'تم الرفض');
              setRejecting(false);
              setReason('');
            }}
          >
            رفض
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={returning} onClose={() => setReturning(false)} fullWidth maxWidth="sm">
        <DialogTitle>إعادة التقييم للتعديل</DialogTitle>
        <DialogContent>
          <FormTextField
            label="ملاحظة للمُقيِّم"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={3}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturning(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={busy || !reason.trim()}
            onClick={async () => {
              await run(() => returnPerformanceReview(review.id, reason), 'أُعيد للتعديل');
              setReturning(false);
              setReason('');
            }}
          >
            إعادة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PerformanceReviewDetailPage;
