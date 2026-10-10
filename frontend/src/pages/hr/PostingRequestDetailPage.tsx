import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { PageHeader, ErrorState } from '../../components/common';
import StatusChip from '../../components/ui/StatusChip';
import { useAuth } from '../../hooks/useAuth';
import {
  approvePostingRequest,
  cancelPostingRequest,
  getPostingRequest,
  rejectPostingRequest,
  submitPostingRequest,
} from '../../api/endpoints/hr';
import type { PostingRequest } from '../../types/hr';
import {
  postingKindLabel,
  postingStatusLabel,
  POSTING_STATUS_TONES,
} from '../../utils/hrLabels';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { extractErrorMessage, notifySuccess, notifyError } from '../../utils/toast';

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ py: 1 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2">{value ?? '—'}</Typography>
  </Box>
);

const PostingRequestDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [posting, setPosting] = useState<PostingRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await getPostingRequest(id);
      setPosting(data.data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'تعذر تحميل الطلب'));
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
      setRejecting(false);
      setReason('');
      await load();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر تنفيذ الإجراء'));
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
  if (error || !posting) {
    return <ErrorState message={error ?? 'الطلب غير موجود'} onRetry={load} />;
  }

  const isSubmitter = posting.requested_by === user?.id;
  const isApprover = user?.role === 'HR_APPROVER';
  const canDecide = posting.status === 'SUBMITTED' && isApprover && !isSubmitter;

  return (
    <Box>
      <PageHeader
        title={`طلب ${postingKindLabel(posting.kind)}`}
        subtitle={`${posting.employee_name} — ${posting.target_summary}`}
        action={
          <Stack direction="row" spacing={1}>
            {posting.status === 'DRAFT' && (
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                disabled={busy}
                onClick={() => run(() => submitPostingRequest(posting.id), 'تم إرسال الطلب للاعتماد')}
              >
                إرسال للاعتماد
              </Button>
            )}
            {canDecide && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckIcon />}
                  disabled={busy}
                  onClick={() => run(() => approvePostingRequest(posting.id), 'تم اعتماد الطلب وتطبيق النقل')}
                >
                  اعتماد
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CloseIcon />}
                  disabled={busy}
                  onClick={() => setRejecting((v) => !v)}
                >
                  رفض
                </Button>
              </>
            )}
            {posting.status === 'SUBMITTED' && !isApprover && (
              <Button
                variant="outlined"
                color="error"
                disabled={busy}
                onClick={() => run(() => cancelPostingRequest(posting.id), 'تم إلغاء الطلب')}
              >
                إلغاء الطلب
              </Button>
            )}
          </Stack>
        }
      />

      {posting.status === 'SUBMITTED' && isSubmitter && isApprover && (
        <Alert severity="info" sx={{ mb: 2 }}>
          رفعتَ هذا الطلب بنفسك، ولا يمكنك اعتماده — هذا مبدأ فصل المهام.
        </Alert>
      )}

      {rejecting && (
        <Card sx={{ mb: 2, borderColor: 'error.main' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              سبب الرفض (مطلوب)
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اذكر السبب الذي سيُعرض لمقدّم الطلب"
            />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="error"
                disabled={busy || !reason.trim()}
                onClick={() =>
                  run(() => rejectPostingRequest(posting.id, reason.trim()), 'تم رفض الطلب')
                }
              >
                تأكيد الرفض
              </Button>
              <Button onClick={() => setRejecting(false)} disabled={busy}>
                إلغاء
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {posting.status === 'REJECTED' && posting.rejection_reason && (
        <Alert severity="error" sx={{ mb: 2 }}>
          سبب الرفض: {posting.rejection_reason}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <StatusChip
                  label={postingStatusLabel(posting.status)}
                  tone={POSTING_STATUS_TONES[posting.status] ?? 'neutral'}
                />
                {posting.is_self_service && <Chip size="small" label="خدمة ذاتية" />}
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <Row label="الموظف" value={posting.employee_name} />
              <Row label="الرقم الوظيفي" value={posting.employee_number} />
              {posting.employee_email && <Row label="البريد" value={posting.employee_email} />}
              <Row label="نوع الطلب" value={posting.kind_display} />
              <Row label="الوجهة" value={posting.target_summary} />
              <Row
                label="تاريخ النفاذ"
                value={posting.effective_date ? formatDate(posting.effective_date) : '—'}
              />
              <Row label="المبرِّر" value={posting.reason} />
              <Divider sx={{ my: 1 }} />
              <Row label="مقدّم الطلب" value={posting.requested_by_name} />
              <Row
                label="المعتمد"
                value={
                  posting.decided_by_name
                    ? `${posting.decided_by_name} — ${formatDateTime(posting.decided_at!)}`
                    : '—'
                }
              />
              {posting.decision_note && <Row label="ملاحظات القرار" value={posting.decision_note} />}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                سجل الحالة
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {(posting.status_logs ?? []).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  لا توجد قيود بعد.
                </Typography>
              )}
              {(posting.status_logs ?? []).map((log) => (
                <Box key={log.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <StatusChip
                      label={postingStatusLabel(log.to_status)}
                      tone={POSTING_STATUS_TONES[log.to_status] ?? 'neutral'}
                      showIcon={false}
                    />
                    {log.from_status && (
                      <Typography variant="caption" color="text.secondary">
                        من {postingStatusLabel(log.from_status)}
                      </Typography>
                    )}
                  </Stack>
                  {log.note && (
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {log.note}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.disabled">
                    {log.changed_by_name ?? '—'} • {formatDateTime(log.created_at)}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PostingRequestDetailPage;
