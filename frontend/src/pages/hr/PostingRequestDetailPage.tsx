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
  const { t } = useTranslation();
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
      setError(extractErrorMessage(err, t('hr.postingRequest.errors.loadRequest')));
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
      notifyError(extractErrorMessage(err, t('hr.postingRequest.errors.actionFailed')));
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
    return <ErrorState message={error ?? t('hr.postingRequest.errors.requestNotFound')} onRetry={load} />;
  }

  const isSubmitter = posting.requested_by === user?.id;
  const isApprover = user?.role === 'HR_APPROVER';
  const canDecide = posting.status === 'SUBMITTED' && isApprover && !isSubmitter;

  return (
    <Box>
      <PageHeader
        title={`${t('hr.postingRequest.header.prefix')} ${t(`hr.postingRequest.kindLabels.${posting.kind}`) ?? posting.kind}`}
        subtitle={`${posting.employee_name} — ${posting.target_summary}`}
        action={
          <Stack direction="row" spacing={1}>
            {posting.status === 'DRAFT' && (
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                disabled={busy}
                onClick={() => run(() => submitPostingRequest(posting.id), t('hr.postingRequest.messages.submitted'))}
              >
                {t('hr.postingRequest.actions.submit')}
              </Button>
            )}
            {canDecide && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckIcon />}
                  disabled={busy}
                  onClick={() => run(() => approvePostingRequest(posting.id), t('hr.postingRequest.messages.approved'))}
                >
                  {t('hr.postingRequest.actions.approve')}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CloseIcon />}
                  disabled={busy}
                  onClick={() => setRejecting((v) => !v)}
                >
                  {t('hr.postingRequest.actions.reject')}
                </Button>
              </>
            )}
            {posting.status === 'SUBMITTED' && !isApprover && (
              <Button
                variant="outlined"
                color="error"
                disabled={busy}
                onClick={() => run(() => cancelPostingRequest(posting.id), t('hr.postingRequest.messages.cancelled'))}
              >
                {t('hr.postingRequest.actions.cancel')}
              </Button>
            )}
          </Stack>
        }
      />

      {posting.status === 'SUBMITTED' && isSubmitter && isApprover && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('hr.postingRequest.alerts.separationOfDuties')}
        </Alert>
      )}

      {rejecting && (
        <Card sx={{ mb: 2, borderColor: 'error.main' }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              {t('hr.postingRequest.dialogs.rejectReasonLabel')}
            </Typography>
            <TextField
              fullWidth
              multiline
              minRows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('hr.postingRequest.dialogs.rejectReasonPlaceholder')}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="error"
                disabled={busy || !reason.trim()}
                onClick={() =>
                  run(() => rejectPostingRequest(posting.id, reason.trim()), t('hr.postingRequest.messages.rejected'))
                }
              >
                {t('hr.postingRequest.actions.confirmReject')}
              </Button>
              <Button onClick={() => setRejecting(false)} disabled={busy}>
                {t('hr.postingRequest.actions.cancel')}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {posting.status === 'REJECTED' && posting.rejection_reason && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t('hr.postingRequest.dialogs.rejectionReason', { reason: posting.rejection_reason })}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <StatusChip
                  label={t(`hr.postingRequest.statusLabels.${posting.status}`) ?? posting.status}
                  tone={POSTING_STATUS_TONES[posting.status] ?? 'neutral'}
                />
                {posting.is_self_service && <Chip size="small" label={t('hr.postingRequest.chips.selfService')} />}
              </Stack>
              <Divider sx={{ mb: 1 }} />
              <Row label={t('hr.postingRequest.fields.employee')} value={posting.employee_name} />
              <Row label={t('hr.postingRequest.fields.employeeNumber')} value={posting.employee_number} />
              {posting.employee_email && <Row label={t('hr.postingRequest.fields.email')} value={posting.employee_email} />}
              <Row label={t('hr.postingRequest.fields.requestType')} value={posting.kind_display} />
              <Row label={t('hr.postingRequest.fields.destination')} value={posting.target_summary} />
              <Row
                label={t('hr.postingRequest.fields.effectiveDate')}
                value={posting.effective_date ? formatDate(posting.effective_date) : '—'}
              />
              <Row label={t('hr.postingRequest.fields.justification')} value={posting.reason} />
              <Divider sx={{ my: 1 }} />
              <Row label={t('hr.postingRequest.fields.submittedBy')} value={posting.requested_by_name} />
              <Row
                label={t('hr.postingRequest.fields.approvedBy')}
                value={
                  posting.decided_by_name
                    ? `${posting.decided_by_name} — ${formatDateTime(posting.decided_at!)}`
                    : '—'
                }
              />
              {posting.decision_note && <Row label={t('hr.postingRequest.fields.decisionNotes')} value={posting.decision_note} />}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                {t('hr.postingRequest.sections.statusLog')}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {(posting.status_logs ?? []).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t('hr.postingRequest.empty.noLogs')}
                </Typography>
              )}
              {(posting.status_logs ?? []).map((log) => (
                <Box key={log.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <StatusChip
                      label={t(`hr.postingRequest.statusLabels.${log.to_status}`) ?? log.to_status}
                      tone={POSTING_STATUS_TONES[log.to_status] ?? 'neutral'}
                      showIcon={false}
                    />
                    {log.from_status && (
                      <Typography variant="caption" color="text.secondary">
                        {t('hr.postingRequest.fields.fromStatus', { status: t(`hr.postingRequest.statusLabels.${log.from_status}`) })}
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
