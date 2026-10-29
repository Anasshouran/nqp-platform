import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { PageHeader } from '../../components/common';
import DataTable from '../../components/ui/DataTable';
import type { DataTableColumn } from '../../components/ui/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { getPerformanceCycles, getPerformanceReviews } from '../../api/endpoints/hr';
import type { PerformanceCycle, PerformanceReview } from '../../types/hr';
import {
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_TONES,
  RATING_LABELS,
} from '../../utils/hrLabels';

const PerformanceReviewsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);

  const {
    rows, count, loading, error, page, rowsPerPage, pageSizeOptions, searchInput,
    setSearchInput, setPage, setRowsPerPage, sortBy, sortOrder,
    setSorting, setFilter, refresh, fetchAllRows,
  } = useServerTable<PerformanceReview>({
    fetchData: (params) => getPerformanceReviews(params),
  });

  const { exporting, exportAll } = useTableExport<PerformanceReview>(fetchAllRows);

  useEffect(() => {
    getPerformanceCycles({ page_size: 100, status: 'OPEN' })
      .then(({ data }) => setCycles(data.data?.results ?? []))
      .catch(() => setCycles([]));
  }, []);

  const columns = useMemo<DataTableColumn<PerformanceReview>[]>(
    () => [
      {
        key: 'employee_name',
        label: t('hr.performanceReviews.columns.employee'),
        render: (row) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.employee_name || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.reviewed_by_name ? `${t('hr.performanceReviews.columns.reviewer')}: ${row.reviewed_by_name}` : ''}
            </Typography>
          </Box>
        ),
      },
      {
        key: 'cycle_name',
        label: t('hr.performanceReviews.columns.cycle'),
        render: (row) => row.cycle_name,
      },
      {
        key: 'total_score',
        label: t('hr.performanceReviews.columns.score'),
        sortable: true,
        align: 'center' as const,
        render: (row) => (row.total_score === null ? '—' : row.total_score),
      },
      {
        key: 'rating',
        label: t('hr.performanceReviews.columns.rating'),
        render: (row) => (row.rating ? RATING_LABELS[row.rating] ?? row.rating : '—'),
      },
      {
        key: 'status',
        label: t('hr.performanceReviews.columns.status'),
        render: (row) => (
          <StatusChip
            label={t(`hr.performanceReviews.statusLabels.${row.status}`)}
            tone={REVIEW_STATUS_TONES[row.status] ?? 'neutral'}
          />
        ),
      },
      {
        key: 'decided_by_name',
        label: t('hr.performanceReviews.columns.approvedBy'),
        hideOnMobile: true,
        render: (row) => row.decided_by_name || '—',
      },
    ],
    [t],
  );

  return (
    <Box>
      <PageHeader
        title={t('hr.performanceReviews.header.title')}
        subtitle={t('hr.performanceReviews.header.subtitle')}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => navigate('/app/hr/performance/cycles')}
            >
              {t('hr.performanceReviews.actions.cycles')}
            </Button>
            <Button
              variant="contained"
              disabled={cycles.length === 0}
              onClick={() => navigate(`/app/hr/performance/reviews/new?cycle=${cycles[0]?.id}`)}
            >
              {t('hr.performanceReviews.actions.new')}
            </Button>
          </Stack>
        }
      />

      {cycles.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('hr.performanceReviews.alert.noOpenCycle')}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('hr.performanceReviews.searchPlaceholder')}
        filters={[
          {
            key: 'status',
            label: t('hr.performanceReviews.columns.status'),
            options: [
              { value: '', label: t('hr.performanceReviews.filters.allStatuses') },
              ...Object.entries(REVIEW_STATUS_LABELS).map(([value]) => ({ value, label: t(`hr.performanceReviews.statusLabels.${value}`) })),
            ],
            value: '',
            onChange: (v) => setFilter('status', v),
          },
          {
            key: 'cycle',
            label: t('hr.performanceReviews.columns.cycle'),
            options: [
              { value: '', label: t('hr.performanceReviews.filters.allCycles') },
              ...cycles.map((c) => ({ value: c.id, label: c.name })),
            ],
            value: '',
            onChange: (v) => setFilter('cycle', v),
          },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        onExport={() =>
          exportAll({
            filename: 'hr_performance_reviews.csv',
            headers: [
              t('hr.performanceReviews.columns.employee'),
              t('hr.performanceReviews.columns.cycle'),
              t('hr.performanceReviews.columns.score'),
              t('hr.performanceReviews.columns.rating'),
              t('hr.performanceReviews.columns.status'),
              t('hr.performanceReviews.columns.approvedBy'),
            ],
            mapRow: (r) => [
              r.employee_name,
              r.cycle_name,
              r.total_score ?? '',
              r.rating_display || '',
              r.status_display,
              r.decided_by_name ?? '',
            ],
            message: t('hr.performanceReviews.export.message'),
          })
        }
        exporting={exporting}
        actionsLabel={t('hr.performanceReviews.actions.details')}
        actions={(row) => (
          <Tooltip title={t('hr.performanceReviews.actions.viewReview')}>
            <IconButton onClick={() => navigate(`/app/hr/performance/reviews/${row.id}`)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        )}
        emptyTitle={t('hr.performanceReviews.empty.title')}
        emptyDescription={t('hr.performanceReviews.empty.description')}
      />
    </Box>
  );
};

export default PerformanceReviewsPage;
