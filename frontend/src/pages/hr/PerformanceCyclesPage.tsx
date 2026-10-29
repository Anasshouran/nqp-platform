import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { PageHeader } from '../../components/common';
import { FormTextField } from '../../components/ui';
import StatusChip from '../../components/ui/StatusChip';
import DataTable from '../../components/ui/DataTable';
import type { DataTableColumn } from '../../components/ui/DataTable';
import { useServerTable } from '../../hooks/useServerTable';
import { getDepartments } from '../../api/endpoints/organization';
import {
  closePerformanceCycle,
  getPerformanceCycles,
  openPerformanceCycle,
} from '../../api/endpoints/hr';
import type { PerformanceCycle } from '../../types/hr';
import type { Department } from '../../types/organization';
import { CYCLE_STATUS_LABELS } from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';
import { extractErrorMessage, notifySuccess } from '../../utils/toast';

const PerformanceCyclesPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    rows, count, loading, error, page, rowsPerPage, pageSizeOptions, searchInput,
    setSearchInput, setPage, setRowsPerPage, sortBy, sortOrder,
    setSorting, setFilter, refresh,
  } = useServerTable<PerformanceCycle>({
    fetchData: (params) => getPerformanceCycles(params),
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [closing, setClosing] = useState<PerformanceCycle | null>(null);
  const [opening, setOpening] = useState<PerformanceCycle | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    getDepartments({ page_size: 100 })
      .then(({ data }) => setDepartments(data.data?.results ?? []))
      .catch(() => setDepartments([]));
  }, []);

  const reload = useCallback(async () => {
    refresh();
  }, [refresh]);

  const columns = useMemo<DataTableColumn<PerformanceCycle>[]>(
    () => [
      {
        key: 'name',
        label: t('hr.performanceCycles.columns.name'),
        render: (row) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(row.period_start)} ← {formatDate(row.period_end)}
            </Typography>
          </Box>
        ),
      },
      {
        key: 'status',
        label: t('hr.performanceCycles.columns.status'),
        render: (row) => (
          <StatusChip
            label={t(`hr.performanceCycles.status.${row.status}`) ?? row.status}
            tone={
              row.status === 'OPEN'
                ? 'info'
                : row.status === 'CLOSED'
                  ? 'success'
                  : 'neutral'
            }
          />
        ),
      },
      {
        key: 'kpi_weight_total',
        label: t('hr.performanceCycles.columns.kpiWeightTotal'),
        align: 'center' as const,
        render: (row) => `${row.kpi_weight_total}%`,
      },
      {
        key: 'review_count',
        label: t('hr.performanceCycles.columns.reviewCount'),
        sortable: true,
        align: 'center' as const,
        render: (row) =>
          row.review_count === null || row.approved_count === null
            ? '—'
            : `${row.approved_count}/${row.review_count}`,
      },
      {
        key: 'review_due_date',
        label: t('hr.performanceCycles.columns.reviewDueDate'),
        sortable: true,
        hideOnMobile: true,
        render: (row) => formatDate(row.review_due_date),
      },
      {
        key: 'actions',
        label: t('hr.performanceCycles.columns.actions'),
        align: 'right' as const,
        sortable: false,
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Button size="small" onClick={() => navigate(`/app/hr/performance/cycles/${row.id}`)}>
              {t('hr.performanceCycles.actions.kpis')}
            </Button>
            {row.status === 'DRAFT' && (
              <Button
                size="small"
                color="success"
                startIcon={<LockOpenIcon />}
                onClick={() => setOpening(row)}
              >
                {t('hr.performanceCycles.actions.open')}
              </Button>
            )}
            {row.status === 'OPEN' && (
              <Button
                size="small"
                color="secondary"
                startIcon={<CloseIcon />}
                onClick={() => setClosing(row)}
              >
                {t('hr.performanceCycles.actions.close')}
              </Button>
            )}
          </Stack>
        ),
      },
    ],
    [navigate, t],
  );

  const onOpen = async () => {
    if (!opening) return;
    setBusy(true);
    setFormError(null);
    try {
      await openPerformanceCycle(opening.id);
      notifySuccess(t('hr.performanceCycles.messages.opened'));
      setOpening(null);
      await reload();
    } catch (err) {
      setFormError(extractErrorMessage(err, t('hr.performanceCycles.errors.openCycle')));
    } finally {
      setBusy(false);
    }
  };

  const onClose = async () => {
    if (!closing) return;
    setBusy(true);
    setFormError(null);
    try {
      await closePerformanceCycle(closing.id, note.trim());
      notifySuccess(t('hr.performanceCycles.messages.closed'));
      setClosing(null);
      setNote('');
      await reload();
    } catch (err) {
      setFormError(extractErrorMessage(err, t('hr.performanceCycles.errors.closeCycle')));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t('hr.performanceCycles.pageHeader.title')}
        subtitle={t('hr.performanceCycles.pageHeader.subtitle')}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<ListAltIcon />}
              onClick={() => navigate('/app/hr/performance/reviews')}
            >
              {t('hr.performanceCycles.actions.reviews')}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/app/hr/performance/cycles/new')}
            >
              {t('hr.performanceCycles.actions.newCycle')}
            </Button>
          </Stack>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          count={count}
          page={page}
          rowsPerPage={rowsPerPage}
          pageSizeOptions={pageSizeOptions}
          loading={loading}
          error={null}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder={t('hr.performanceCycles.searchPlaceholder')}
          filters={[
            {
              key: 'status',
              label: t('hr.performanceCycles.filters.status.label'),
              options: [
                { value: '', label: t('hr.performanceCycles.filters.status.all') },
                ...Object.keys(CYCLE_STATUS_LABELS).map((value) => ({
                  value,
                  label: t(`hr.performanceCycles.status.${value}`) ?? value,
                })),
              ],
              value: '',
              onChange: (v) => setFilter('status', v),
            },
            {
              key: 'department',
              label: t('hr.performanceCycles.filters.department.label'),
              options: [
                { value: '', label: t('hr.performanceCycles.filters.department.all') },
                ...departments.map((d) => ({ value: d.id, label: d.name_ar })),
              ],
              value: '',
              onChange: (v) => setFilter('department', v),
            },
          ]}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={setSorting}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onRefresh={refresh}
          actionsLabel={t('hr.performanceCycles.actionsLabel')}
          actions={() => null}
          emptyTitle={t('hr.performanceCycles.emptyTitle')}
          emptyDescription={t('hr.performanceCycles.emptyDescription')}
        />
      )}

      {opening && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {t('hr.performanceCycles.dialogs.openTitle', { name: opening.name })}
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('hr.performanceCycles.dialogs.openAlert')}
            </Alert>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>
            )}
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                color="success"
                startIcon={<LockOpenIcon />}
                disabled={busy}
                onClick={onOpen}
              >
                {t('hr.performanceCycles.dialogs.confirmOpen')}
              </Button>
              <Button onClick={() => { setOpening(null); setFormError(null); }}>
                {t('hr.performanceCycles.dialogs.cancel')}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      {closing && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              {t('hr.performanceCycles.dialogs.closeTitle', { name: closing.name })}
            </Typography>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('hr.performanceCycles.dialogs.closeAlert')}
            </Alert>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>
            )}
            <FormTextField
              label={t('hr.performanceCycles.dialogs.closeNoteLabel')}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              multiline
              minRows={2}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="contained" color="secondary" disabled={busy} onClick={onClose}>
                {t('hr.performanceCycles.dialogs.confirmClose')}
              </Button>
              <Button onClick={() => { setClosing(null); setFormError(null); }}>
                {t('hr.performanceCycles.dialogs.cancel')}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PerformanceCyclesPage;
