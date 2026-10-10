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
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { PageHeader, ErrorState } from '../../components/common';
import StatusChip from '../../components/ui/StatusChip';
import { useAuth } from '../../hooks/useAuth';
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  getLeaveRequest,
  rejectLeaveRequest,
  submitLeaveRequest,
} from '../../api/endpoints/hr';
import type { LeaveRequest } from '../../types/hr';
import { LEAVE_STATUS_TONES, leaveStatusLabel } from '../../utils/hrLabels';
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

const LeaveRequestDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [leave, setLeave] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data } = await getLeaveRequest(id);
      setLeave(data.data);
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
  if (error || !leave) {
    return <ErrorState message={error ?? 'الطلب غير موجود'} onRetry={load} />;
  }

  const isSubmitter = leave.requested_by === user?.id;
  const isApprover = user?.role === 'HR_APPROVER';
  const canDecide = leave.status === 'SUBMITTED' && isApprover && !isSubmitter;
  const needsDocument = Boolean(leave.leave_type_requires_document) && !leave.document;

  return (
    <Box>
      <PageHeader
        title={`طلب ${leave.leave_type_name}`}
        subtitle={`${leave.employee_name} — ${leave.days} يوم (${formatDate(leave.start_date)} → ${formatDate(leave.end_date)})`}
        action={
          <Stack direction="row" spacing={1}>
            {leave.status === 'DRAFT' && (
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                disabled={busy}
                onClick={() => run(() => submitLeaveRequest(leave.id), 'تم إرسال الطلب')}
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
                  disabled={busy || needsDocument}
                  onClick={() => run(() => approveLeaveRequest(leave.id), 'تم اعتماد الإجازة')}
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
            {leave.status === 'SUBMITTED' && !isApprover && (
              <Button
                variant="outlined"
                color="error"
                disabled={busy}
                onClick={() => run(() => cancelLeaveRequest(leave.id), 'تم إلغاء الطلب')}
              >
                إلغاء الطلب
              </Button>
            )}
          </Stack>
        }
      />

      {canDecide && needsDocument && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          هذا النوع من الإجازات يطلب مستنداً، ولا يُعتمد قبل إرفاقه.
        </Alert>
      )}
      {leave.status === 'SUBMITTED' && isSubmitter && isApprover && (
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
                  run(() => rejectLeaveRequest(leave.id, reason.trim()), 'تم رفض الطلب')
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

      {leave.status === 'REJECTED' && leave.rejection_reason && (
        <Alert severity="error" sx={{ mb: 2 }}>
          سبب الرفض: {leave.rejection_reason}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
                <StatusChip
                  label={leaveStatusLabel(leave.status)}
                  tone={LEAVE_STATUS_TONES[leave.status] ?? 'neutral'}
                />
                {leave.is_self_service && <Chip size="small" label="خدمة ذاتية" />}
                {leave.is_half_day && <Chip size="small" label="نصف يوم" />}
                {leave.leave_type_is_paid === false && (
                  <Chip size="small" color="warning" label="بلا راتب" />
                )}
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <Row label="الموظف" value={leave.employee_name} />
              <Row label="الرقم الوظيفي" value={leave.employee_number} />
              <Row label="نوع الإجازة" value={leave.leave_type_name} />
              <Row
                label="المدة"
                value={`${leave.days} يوم — ${formatDate(leave.start_date)} → ${formatDate(leave.end_date)}`}
              />
              <Row label="المرفق" value={leave.document} />
              <Row label="المبرِّر" value={leave.reason} />
              <Divider sx={{ my: 1 }} />
              <Row label="مقدّم الطلب" value={leave.requested_by_name} />
              <Row
                label="المعتمد"
                value={
                  leave.decided_by_name
                    ? `${leave.decided_by_name} — ${formatDateTime(leave.decided_at!)}`
                    : '—'
                }
              />
              {leave.decision_note && <Row label="ملاحظات القرار" value={leave.decision_note} />}
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
              {(leave.status_logs ?? []).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  لا توجد قيود بعد.
                </Typography>
              )}
              {(leave.status_logs ?? []).map((log) => (
                <Box key={log.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <StatusChip
                      label={leaveStatusLabel(log.to_status)}
                      tone={LEAVE_STATUS_TONES[log.to_status] ?? 'neutral'}
                      showIcon={false}
                    />
                    {log.from_status && (
                      <Typography variant="caption" color="text.secondary">
                        من {leaveStatusLabel(log.from_status)}
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

export default LeaveRequestDetailPage;
