import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  reviewStatusLabel,
} from '../../utils/hrLabels';

const PerformanceReviewsPage = () => {
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
        label: 'الموظف',
        render: (row) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.employee_name || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.reviewed_by_name ? `المُقيِّم: ${row.reviewed_by_name}` : ''}
            </Typography>
          </Box>
        ),
      },
      {
        key: 'cycle_name',
        label: 'الدورة',
        render: (row) => row.cycle_name,
      },
      {
        key: 'total_score',
        label: 'الدرجة',
        sortable: true,
        align: 'center' as const,
        render: (row) => (row.total_score === null ? '—' : row.total_score),
      },
      {
        key: 'rating',
        label: 'التقدير',
        render: (row) => (row.rating ? RATING_LABELS[row.rating] ?? row.rating : '—'),
      },
      {
        key: 'status',
        label: 'الحالة',
        render: (row) => (
          <StatusChip
            label={reviewStatusLabel(row.status)}
            tone={REVIEW_STATUS_TONES[row.status] ?? 'neutral'}
          />
        ),
      },
      {
        key: 'decided_by_name',
        label: 'المعتمد',
        hideOnMobile: true,
        render: (row) => row.decided_by_name || '—',
      },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="تقييمات الأداء"
        subtitle="الدرجة والتقدير يُشتقّان من درجات المؤشرات وأوزانها — لا يُرسلان من العميل"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => navigate('/app/hr/performance/cycles')}
            >
              الدورات
            </Button>
            <Button
              variant="contained"
              disabled={cycles.length === 0}
              onClick={() => navigate(`/app/hr/performance/reviews/new?cycle=${cycles[0]?.id}`)}
            >
              تقييم جديد
            </Button>
          </Stack>
        }
      />

      {cycles.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          لا توجد دورة مفتوحة — أنشئ دورة وافتحها قبل بدء التقييم.
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
        searchPlaceholder="بحث باسم الموظف أو الدورة..."
        filters={[
          {
            key: 'status',
            label: 'الحالة',
            options: [
              { value: '', label: 'كل الحالات' },
              ...Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ],
            value: '',
            onChange: (v) => setFilter('status', v),
          },
          {
            key: 'cycle',
            label: 'الدورة',
            options: [
              { value: '', label: 'كل الدورات' },
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
            headers: ['الموظف', 'الدورة', 'الدرجة', 'التقدير', 'الحالة', 'المعتمد'],
            mapRow: (r) => [
              r.employee_name,
              r.cycle_name,
              r.total_score ?? '',
              r.rating_display || '',
              r.status_display,
              r.decided_by_name ?? '',
            ],
            message: 'تم تصدير تقييمات الأداء',
          })
        }
        exporting={exporting}
        actionsLabel="تفاصيل"
        actions={(row) => (
          <Tooltip title="تفاصيل التقييم">
            <IconButton onClick={() => navigate(`/app/hr/performance/reviews/${row.id}`)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        )}
        emptyTitle="لا توجد تقييمات"
        emptyDescription="ستظهر هنا تقييمات الأداء داخل الدورات المفتوحة."
      />
    </Box>
  );
};

export default PerformanceReviewsPage;
