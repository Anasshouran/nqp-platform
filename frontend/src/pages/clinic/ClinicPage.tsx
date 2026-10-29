import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { PageHeader } from '../../components/common';
import { ConfirmDialog, DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { acceptReferral, closeVisit, getClinicVisits, getReferrals, rejectReferral } from '../../api/endpoints/clinic';
import type { ClinicReferral, ClinicVisit } from '../../types/clinic';
import { referralStatus, visitStatus } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';
import { PassportChip, PersonAvatar } from './ui';

const referralStatusOptions = Object.entries(referralStatus).map(([v, m]) => ({ value: v, label: m.label }));
const visitStatusOptions = Object.entries(visitStatus).map(([v, m]) => ({ value: v, label: m.label }));

const getPhaseLabels = (t: (key: string) => string): Record<string, { label: string; color: string }> => ({
  REGISTERED: { label: t('clinic.clinic.status.registered'), color: '#8a8f98' },
  TRIAGED: { label: t('clinic.clinic.status.triaged'), color: '#b7791f' },
  EXAMINED: { label: t('clinic.clinic.status.examined'), color: 'primary.main' },
  LABORATORY: { label: t('clinic.clinic.status.laboratory'), color: 'info.main' },
  DECISION: { label: t('clinic.clinic.status.decision'), color: '#7b4fb3' },
  CERTIFICATE: { label: t('clinic.clinic.status.certificate'), color: '#0e7490' },
  CLOSED: { label: t('clinic.clinic.status.closed'), color: 'error.main' },
});

const AvatarCell = ({ name, passport }: { name?: string; passport?: string }) => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <PersonAvatar name={name} size={38} />
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>
        {name || '—'}
      </Typography>
      <PassportChip number={passport} />
    </Box>
  </Stack>
);

const ReferralsTab = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const table = useServerTable<ClinicReferral>({ fetchData: getReferrals });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const [acceptTarget, setAcceptTarget] = useState<ClinicReferral | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ClinicReferral | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!acceptTarget || submitting) return;
    setSubmitting(true);
    try {
      const res = await acceptReferral(acceptTarget.id);
      notifySuccess(t('clinic.clinic.messages.referralAccepted'));
      setAcceptTarget(null);
      navigate(`/app/clinic/visits/${res.data.data.id}`);
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.clinic.messages.acceptReferralFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || submitting) return;
    setSubmitting(true);
    try {
      await rejectReferral(rejectTarget.id, rejectReason.trim() ? { notes: rejectReason.trim() } : {});
      notifySuccess(t('clinic.clinic.messages.referralRejected'));
      setRejectTarget(null);
      setRejectReason('');
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.clinic.messages.rejectReferralFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () =>
    exportAll({
      filename: `clinic-referrals-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: [t('clinic.clinic.cols.traveler'), t('clinic.clinic.cols.passport'), t('clinic.clinic.cols.port'), t('clinic.clinic.cols.status'), t('clinic.clinic.cols.createdAt')],
      mapRow: (r: ClinicReferral) => [
        r.traveler_name || '',
        r.passport_number || '',
        r.port_name || '',
        referralStatus[r.status]?.label || r.status,
        formatDateTime(r.created_at),
      ],
      message: t('clinic.clinic.messages.referralsExported'),
    });

  return (
    <>
      <DataTable<ClinicReferral>
        columns={[
          {
            key: 'traveler_name',
            label: t('clinic.clinic.cols.traveler'),
            render: (r) => <AvatarCell name={r.traveler_name} passport={r.passport_number} />,
          },
          { key: 'port_name', label: t('clinic.clinic.cols.port'), render: (r) => r.port_name || '—', hideOnMobile: true, noWrap: false },
          {
            key: 'status',
            label: t('clinic.clinic.cols.status'),
            sortable: true,
            render: (r) => {
              const m = referralStatus[r.status];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={r.status} tone="neutral" />;
            },
          },
          {
            key: 'created_at',
            label: t('clinic.clinic.cols.createdAt'),
            sortable: true,
            render: (r) => formatDateTime(r.created_at),
            hideOnMobile: true,
          },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title={t('clinic.clinic.tabs.referrals')}
        subtitle={t('clinic.clinic.subtitles.referrals', { count })}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('clinic.clinic.search.referrals')}
        filters={[
          { key: 'status', label: t('clinic.clinic.cols.status'), options: referralStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={handleExport}
        exporting={exporting}
        onRefresh={refresh}
        emptyTitle={t('clinic.clinic.empty.referralsTitle')}
        emptyDescription={t('clinic.clinic.empty.referralsDesc')}
        actions={(r) => {
          if (r.status !== 'PENDING') return null;
          return (
            <>
              <Tooltip title={t('clinic.clinic.actions.acceptReferral')}>
                <IconButton
                  aria-label={t('clinic.clinic.actions.acceptReferral')}
                  size="small"
                  color="success"
                  onClick={() => setAcceptTarget(r)}
                  sx={{ bgcolor: 'success.light', '&:hover': { bgcolor: 'success.main', color: '#fff' } }}
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('clinic.clinic.actions.rejectReferral')}>
                <IconButton
                  aria-label={t('clinic.clinic.actions.rejectReferral')}
                  size="small"
                  color="error"
                  onClick={() => { setRejectReason(''); setRejectTarget(r); }}
                  sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(acceptTarget)}
        tone="success"
        title={t('clinic.clinic.dialogs.acceptReferralTitle')}
        message={acceptTarget ? t('clinic.clinic.dialogs.acceptReferralMessage', { traveler: acceptTarget.traveler_name }) : ''}
        confirmLabel={t('clinic.clinic.dialogs.acceptReferralConfirm')}
        loading={submitting}
        onConfirm={handleAccept}
        onClose={() => setAcceptTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        tone="error"
        title={t('clinic.clinic.dialogs.rejectReferralTitle')}
        message={rejectTarget ? t('clinic.clinic.dialogs.rejectReferralMessage', { traveler: rejectTarget.traveler_name }) : ''}
        confirmLabel={t('clinic.clinic.dialogs.rejectReferralConfirm')}
        loading={submitting}
        onConfirm={handleReject}
        onClose={() => { setRejectTarget(null); setRejectReason(''); }}
      >
        <TextField
          label={t('clinic.clinic.dialogs.rejectReasonLabel')}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          size="small"
          sx={{ mt: 2 }}
          disabled={submitting}
        />
      </ConfirmDialog>
    </>
  );
};

const VisitsTab = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const phaseLabels = useMemo(() => getPhaseLabels(t), [t]);
  const table = useServerTable<ClinicVisit>({ fetchData: getClinicVisits });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const [closeTarget, setCloseTarget] = useState<ClinicVisit | null>(null);
  const [closing, setClosing] = useState(false);

  const handleClose = async () => {
    if (!closeTarget || closing) return;
    setClosing(true);
    try {
      await closeVisit(closeTarget.id);
      notifySuccess(t('clinic.clinic.messages.visitClosed'));
      setCloseTarget(null);
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.clinic.messages.closeVisitFailed')));
    } finally {
      setClosing(false);
    }
  };

  return (
    <>
      <DataTable<ClinicVisit>
        columns={[
          {
            key: 'traveler_name',
            label: t('clinic.clinic.cols.traveler'),
            render: (v) => <AvatarCell name={v.traveler_name} passport={v.passport_number} />,
          },
          { key: 'doctor_name', label: t('clinic.clinic.cols.doctor'), render: (v) => v.doctor_name || '—', hideOnMobile: true },
          {
            key: 'visit_status',
            label: t('clinic.clinic.cols.status'),
            render: (v) => {
              const m = visitStatus[v.visit_status];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : v.visit_status;
            },
          },
          {
            key: 'phase',
            label: t('clinic.clinic.cols.phase'),
            hideOnMobile: true,
            render: (v) => {
              const meta = phaseLabels[v.phase ?? ''];
              return meta ? (
                <Chip size="small" label={meta.label} sx={{ fontWeight: 700, bgcolor: `${meta.color}1a`, color: meta.color }} />
              ) : (
                (v.phase ?? '—')
              );
            },
          },
          { key: 'opened_at', label: t('clinic.clinic.cols.openedAt'), sortable: true, render: (v) => formatDateTime(v.opened_at), hideOnMobile: true },
        ]}
        rows={rows}
        rowKey={(v) => v.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title={t('clinic.clinic.tabs.visits')}
        subtitle={t('clinic.clinic.subtitles.visits', { count })}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('clinic.clinic.search.visits')}
        filters={[
          { key: 'visit_status', label: t('clinic.clinic.cols.status'), options: visitStatusOptions, value: '', onChange: (v) => setFilter('visit_status', v) },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle={t('clinic.clinic.empty.visitsTitle')}
        emptyDescription={t('clinic.clinic.empty.visitsDesc')}
        actions={(v) => (
          <>
            <Tooltip title={t('clinic.clinic.actions.openVisit')}>
              <IconButton
                aria-label={t('clinic.common.view')}
                size="small"
                color="primary"
                onClick={() => navigate(`/app/clinic/visits/${v.id}`)}
                sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {v.visit_status === 'OPEN' && (
              <Tooltip title={t('clinic.clinic.actions.closeVisit')}>
                <IconButton
                  aria-label={t('clinic.clinic.actions.closeVisit')}
                  size="small"
                  color="error"
                  onClick={() => setCloseTarget(v)}
                  sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}
                >
                  <LockIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      />

      <ConfirmDialog
        open={Boolean(closeTarget)}
        tone="error"
        title={t('clinic.clinic.dialogs.closeVisitTitle')}
        message={closeTarget ? t('clinic.clinic.dialogs.closeVisitMessage', { traveler: closeTarget.traveler_name }) : ''}
        confirmLabel={t('clinic.clinic.dialogs.closeVisitConfirm')}
        loading={closing}
        onConfirm={handleClose}
        onClose={() => setCloseTarget(null)}
      />
    </>
  );
};

const ClinicPage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'visits' ? 1 : 0;

  const handleTabChange = (_: React.SyntheticEvent, value: number) => {
    const params = new URLSearchParams(searchParams);
    if (value === 1) params.set('tab', 'visits');
    else params.set('tab', 'referrals');
    setSearchParams(params, { replace: true });
  };

  return (
    <Box>
      <PageHeader
        title={t('clinic.clinic.header.title')}
        subtitle={t('clinic.clinic.header.subtitle')}
        eyebrow={t('clinic.clinic.header.eyebrow')}
      />
      <Tabs
        value={tab}
        onChange={handleTabChange}
        sx={{
          mb: 3,
          '& .MuiTab-root': { borderRadius: 3, minHeight: 48, fontWeight: 700 },
          '& .MuiTabs-indicator': { height: 3, borderRadius: '999px' },
        }}
      >
        <Tab icon={<ReceiptLongIcon />} iconPosition="start" label={t('clinic.clinic.tabs.referrals')} />
        <Tab icon={<MedicalServicesIcon />} iconPosition="start" label={t('clinic.clinic.tabs.visits')} />
      </Tabs>
      {tab === 0 ? <ReferralsTab /> : <VisitsTab />}
    </Box>
  );
};

export default ClinicPage;