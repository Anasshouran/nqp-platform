import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import LogoutIcon from '@mui/icons-material/Logout';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { getIsolations, releaseIsolation, updateIsolationStatus } from '../../api/endpoints/clinic';
import type { IsolationRow } from '../../types/clinic';
import { formatDate } from '../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';
import { healthStatusMeta, isolationStatusMeta, isolationTypeMeta, isoSeverityMeta } from '../../utils/clinicStatus';
import { PassportChip, PersonAvatar } from './ui';

const statusOptions = Object.entries(isolationStatusMeta).map(([v, m]) => ({ value: v, label: m.label }));
const isolationOptions = Object.entries(isolationTypeMeta).map(([v, m]) => ({ value: v, label: m.label }));
const healthOptions = Object.entries(healthStatusMeta).map(([v, m]) => ({ value: v, label: m.label }));

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

const IsolationPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const table = useServerTable<IsolationRow>({ fetchData: getIsolations });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const [statusTarget, setStatusTarget] = useState<IsolationRow | null>(null);
  const [healthStatus, setHealthStatus] = useState('STABLE');
  const [releaseTarget, setReleaseTarget] = useState<IsolationRow | null>(null);
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleUpdateStatus = async () => {
    if (!statusTarget || submitting) return;
    setSubmitting(true);
    try {
      await updateIsolationStatus(statusTarget.id, healthStatus);
      notifySuccess(t('clinic.isolation.messages.statusUpdated'));
      setStatusTarget(null);
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.isolation.messages.statusUpdateFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async () => {
    if (!releaseTarget || submitting) return;
    setSubmitting(true);
    try {
      await releaseIsolation(releaseTarget.id, {
        end_date: endDate || undefined,
        discharge_summary: dischargeSummary,
      });
      notifySuccess(t('clinic.isolation.messages.released'));
      setReleaseTarget(null);
      setDischargeSummary('');
      setEndDate('');
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.isolation.messages.releaseFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('clinic.isolation.header.title')}
        subtitle={t('clinic.isolation.header.subtitle')}
        eyebrow={t('clinic.isolation.header.eyebrow')}
        action={
          <Stack direction="row" spacing={1}>
            <Chip icon={<MonitorHeartIcon />} label={t('clinic.isolation.chip.active')} sx={{ fontWeight: 700 }} variant="outlined" />
          </Stack>
        }
      />
      <DataTable<IsolationRow>
        columns={[
          {
            key: 'traveler_name',
            label: t('clinic.isolation.cols.traveler'),
            render: (v) => <AvatarCell name={v.traveler_name} passport={v.passport_number} />,
          },
          {
            key: 'isolation_type',
            label: t('clinic.isolation.cols.isolationType'),
            hideOnMobile: true,
            render: (v) => {
              const m = isolationTypeMeta[v.isolation_type];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : v.isolation_type;
            },
          },
          {
            key: 'severity',
            label: t('clinic.isolation.cols.severity'),
            hideOnMobile: true,
            render: (v) => {
              const m = isoSeverityMeta[v.severity];
              return m ? <Chip size="small" color={m.color} label={m.label} sx={{ fontWeight: 700 }} /> : (v.severity ?? '—');
            },
          },
          {
            key: 'health_status',
            label: t('clinic.isolation.cols.healthStatus'),
            hideOnMobile: true,
            render: (v) => {
              const m = healthStatusMeta[v.health_status];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : (v.health_status ?? '—');
            },
          },
          {
            key: 'start_date',
            label: t('clinic.isolation.cols.startDate'),
            sortable: true,
            render: (v) => formatDate(v.start_date),
          },
          {
            key: 'required_days',
            label: t('clinic.isolation.cols.duration'),
            hideOnMobile: true,
            render: (v) => v.required_days,
          },
          {
            key: 'status',
            label: t('clinic.isolation.cols.status'),
            render: (v) => {
              const m = isolationStatusMeta[v.status];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : v.status;
            },
          },
        ]}
        rows={rows}
        rowKey={(v) => v.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title={t('clinic.isolation.table.title')}
        subtitle={t('clinic.isolation.table.subtitle', { count })}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('clinic.isolation.search.placeholder')}
        filters={[
          {
            key: 'status',
            label: t('clinic.isolation.filters.status'),
            options: statusOptions,
            value: '',
            onChange: (v) => setFilter('status', v),
          },
          {
            key: 'isolation_type',
            label: t('clinic.isolation.filters.type'),
            options: isolationOptions,
            value: '',
            onChange: (v) => setFilter('isolation_type', v),
          },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle={t('clinic.isolation.empty.title')}
        emptyDescription={t('clinic.isolation.empty.desc')}
        actions={(v) => (
          <>
            <Tooltip title={t('clinic.isolation.actions.openVisit')}>
              <IconButton
                aria-label={t('clinic.isolation.actions.viewAria')}
                size="small"
                color="primary"
                onClick={() => navigate(`/app/clinic/visits/${v.visit}`)}
                sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {v.status === 'ACTIVE' && (
              <>
                <Tooltip title={t('clinic.isolation.actions.updateStatus')}>
                  <IconButton
                    aria-label={t('clinic.isolation.actions.updateAria')}
                    size="small"
                    color="info"
                    onClick={() => {
                      setHealthStatus(v.health_status || 'STABLE');
                      setStatusTarget(v);
                    }}
                    sx={{ bgcolor: 'info.light', '&:hover': { bgcolor: 'info.main', color: '#fff' } }}
                  >
                    <MonitorHeartIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('clinic.isolation.actions.release')}>
                  <IconButton
                    aria-label={t('clinic.isolation.actions.releaseAria')}
                    size="small"
                    color="error"
                    onClick={() => {
                      setDischargeSummary('');
                      setEndDate('');
                      setReleaseTarget(v);
                    }}
                    sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}
                  >
                    <LogoutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </>
        )}
      />

      <Dialog open={Boolean(statusTarget)} onClose={() => setStatusTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('clinic.isolation.dialogs.updateStatusTitle')}</DialogTitle>
        <DialogContent dividers>
          <TextField
            select
            fullWidth
            label={t('clinic.isolation.dialogs.updateStatusLabel')}
            value={healthStatus}
            onChange={(e) => setHealthStatus(e.target.value)}
          >
            {healthOptions.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setStatusTarget(null)} sx={{ fontWeight: 700 }}>{t('clinic.common.cancel')}</Button>
          <Button
            variant="contained"
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <MonitorHeartIcon />}
            onClick={handleUpdateStatus}
            disabled={submitting}
            sx={{ fontWeight: 700 }}
          >
            {t('clinic.common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(releaseTarget)} onClose={() => setReleaseTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('clinic.isolation.dialogs.checkoutTitle')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {t('clinic.isolation.dialogs.checkoutMessage', { name: releaseTarget?.traveler_name })}
            </Typography>
            <TextField
              type="date"
              fullWidth
              label={t('clinic.isolation.dialogs.endDateLabel')}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <TextField
              multiline
              minRows={3}
              fullWidth
              label={t('clinic.isolation.dialogs.dischargeSummaryLabel')}
              value={dischargeSummary}
              onChange={(e) => setDischargeSummary(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setReleaseTarget(null)} sx={{ fontWeight: 700 }}>{t('clinic.common.cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <LogoutIcon />}
            onClick={handleRelease}
            disabled={submitting}
            sx={{ fontWeight: 700 }}
          >
            {t('clinic.isolation.dialogs.releaseConfirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default IsolationPage;