import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { LEAVE_STATUS_TONES } from '../../utils/hrLabels';
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
  const { t } = useTranslation();
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
      setError(extractErrorMessage(err, t('hr.leaveRequest.errors.loadRequest')));
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
      setRejecting(false);
      setReason('');
      await load();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('hr.leaveRequest.errors.actionFailed')));
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
    return <ErrorState message={error ?? t('hr.leaveRequest.errors.requestNotFound')} onRetry={load} />;
  }

  const isSubmitter = leave.requested_by === user?.id;
  const isApprover = user?.role === 'HR_APPROVER';
  const canDecide = leave.status === 'SUBMITTED' && isApprover && !isSubmitter;
  const needsDocument = Boolean(leave.leave_type_requires_document) && !leave.document;

  return (
    <Box>
      <PageHeader
        title={`${t('hr.leaveRequest.header.prefix')} ${leave.leave_type_name}`}
        subtitle={t('hr.leaveRequest.header.subtitle', {
          employeeName: leave.employee_name,
          days: leave.days,
          startDate: formatDate(leave.start_date),
          endDate: formatDate(leave.end_date),
        })}
        action={
          <Stack direction="row" spacing={1}>
            {leave.status === 'DRAFT' && (
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                disabled={busy}
                onClick={() => run(() => submitLeaveRequest(leave.id), t('hr.leaveRequest.messages.submitted'))}
              >
                {t('hr.leaveRequest.actions.submit')}
              </Button>
            )}
            {canDecide && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckIcon />}
                  disabled={busy || needsDocument}
                  onClick={() => run(() => approveLeaveRequest(leave.id), t('hr.leaveRequest.messages.approved'))}
                >
                  {t('hr.leaveRequest.actions.approve')}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CloseIcon />}
                  disabled={busy}
                  onClick={() => setRejecting((v) => !v)}
                >
                  {t('hr.leaveRequest.actions.reject')}
                </Button>
              </>
            )}
            {leave.status === 'SUBMITTED' && !isApprover && (
              <Button
                variant="outlined"
                color="error"
                disabled={busy}
                onClick={() => run(() => cancelLeaveRequest(leave.id), t('hr.leaveRequest.messages.cancelled'))}
              >
                {t('hr.leaveRequest.actions.cancel')}
              </Button>
            )}
          </Stack>
        }
      />

      {canDecide && needsDocument && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('hr.leaveRequest.alerts.documentRequired')}
        </Alert>
      )}
      {leave.status === 'SUBMITTED' && isSubmitter && isApprover && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('hr.leaveRequest.alerts.cannotApproveOwn')}
        </Alert>
      )}

      {rejecting && (
        <Card sx={{ mb: 2, borderColor: 'error.main' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              {t('hr.leaveRequest.dialogs.rejectReasonLabel')}
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('hr.leaveRequest.dialogs.rejectReasonPlaceholder')}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="error"
                disabled={busy || !reason.trim()}
                onClick={() =>
                  run(() => rejectLeaveRequest(leave.id, reason.trim()), t('hr.leaveRequest.messages.rejected'))
                }
              >
                {t('hr.leaveRequest.actions.confirmReject')}
              </Button>
              <Button onClick={() => setRejecting(false)} disabled={busy}>
                {t('hr.leaveRequest.actions.cancel')}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {leave.status === 'REJECTED' && leave.rejection_reason && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('hr.leaveRequest.dialogs.rejectionReason', { reason: leave.rejection_reason })}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap">
                <StatusChip
                  label={t(`hr.leaveRequest.statusLabels.${leave.status}`) ?? leave.status}
                  tone={LEAVE_STATUS_TONES[leave.status] ?? 'neutral'}
                />
                {leave.is_self_service && <Chip size="small" label={t('hr.leaveRequest.chips.selfService')} />}
                {leave.is_half_day && <Chip size="small" label={t('hr.leaveRequest.chips.halfDay')} />}
                {leave.leave_type_is_paid === false && (
                  <Chip size="small" color="warning" label={t('hr.leaveRequest.chips.unpaid')} />
                )}
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <Row label={t('hr.leaveRequest.fields.employee')} value={leave.employee_name} />
              <Row label={t('hr.leaveRequest.fields.employeeNumber')} value={leave.employee_number} />
              <Row label={t('hr.leaveRequest.fields.leaveType')} value={leave.leave_type_name} />
              <Row
                label={t('hr.leaveRequest.fields.duration')}
                value={t('hr.leaveRequest.fields.durationValue', { days: leave.days, startDate: formatDate(leave.start_date), endDate: formatDate(leave.end_date) })}
              />
              <Row label={t('hr.leaveRequest.fields.attachment')} value={leave.document} />
              <Row label={t('hr.leaveRequest.fields.justification')} value={leave.reason} />
              <Divider sx={{ my: 1 }} />
              <Row label={t('hr.leaveRequest.fields.submittedBy')} value={leave.requested_by_name} />
              <Row
                label={t('hr.leaveRequest.fields.approvedBy')}
                value={
                  leave.decided_by_name
                    ? `${leave.decided_by_name} — ${formatDateTime(leave.decided_at!)}`
                    : '—'
                }
              />
              {leave.decision_note && <Row label={t('hr.leaveRequest.fields.decisionNotes')} value={leave.decision_note} />}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                {t('hr.leaveRequest.sections.statusLog')}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {(leave.status_logs ?? []).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t('hr.leaveRequest.empty.noLogs')}
                </Typography>
              )}
              {(leave.status_logs ?? []).map((log) => (
                <Box key={log.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <StatusChip
                      label={t(`hr.leaveRequest.statusLabels.${log.to_status}`) ?? log.to_status}
                      tone={LEAVE_STATUS_TONES[log.to_status] ?? 'neutral'}
                      showIcon={false}
                    />
                    {log.from_status && (
                      <Typography variant="caption" color="text.secondary">
                        {t('hr.leaveRequest.fields.fromStatus', { status: t(`hr.leaveRequest.statusLabels.${log.from_status}`) })}
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
