import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { PageHeader } from '../../components/common';
import DataTable from '../../components/ui/DataTable';
import type { DataTableColumn } from '../../components/ui/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { getTrainingEnrollments } from '../../api/endpoints/hr';
import type { TrainingEnrollment } from '../../types/hr';
import {
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_TONES,
  enrollmentStatusLabel,
} from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  ...Object.entries(ENROLLMENT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const TrainingEnrollmentsPage = () => {
  const navigate = useNavigate();

  const {
    rows, count, loading, error, page, rowsPerPage, pageSizeOptions, searchInput,
    setSearchInput, setPage, setRowsPerPage, sortBy, sortOrder,
    setSorting, setFilter, refresh, fetchAllRows,
  } = useServerTable<TrainingEnrollment>({
    fetchData: (params) => getTrainingEnrollments(params),
  });

  const { exporting, exportAll } = useTableExport<TrainingEnrollment>(fetchAllRows);

  const columns = useMemo<DataTableColumn<TrainingEnrollment>[]>(
    () => [
      {
        key: 'employee_name',
        label: 'الموظف',
        render: (row) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.employee_name || '—'}
            </Typography>
            <Typography variant="caption" color="text.secondary" dir="ltr">
              {row.employee_number}
            </Typography>
          </Box>
        ),
      },
      {
        key: 'plan_name',
        label: 'الدورة',
        render: (row) => (
          <Box>
            <Typography variant="body2">{row.plan_name}</Typography>
            <Typography variant="caption" color="text.secondary" dir="ltr">
              {row.plan_code}
            </Typography>
          </Box>
        ),
      },
      {
        key: 'start_date',
        label: 'البداية',
        sortable: true,
        render: (row) => formatDate(row.start_date),
      },
      {
        key: 'end_date',
        label: 'النهاية',
        render: (row) => formatDate(row.end_date),
      },
      {
        key: 'score',
        label: 'الدرجة',
        align: 'center' as const,
        render: (row) => row.score ?? '—',
      },
      {
        key: 'status',
        label: 'الحالة',
        render: (row) => (
          <StatusChip
            label={enrollmentStatusLabel(row.status)}
            tone={ENROLLMENT_STATUS_TONES[row.status] ?? 'neutral'}
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
        title="تسجيلات التدريب"
        subtitle="من التسجيل إلى الاعتماد ثم الإتمام — الإتمام مشتق من الدرجة"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/app/hr/training')}
          >
            تسجيل جديد
          </Button>
        }
      />

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
            options: STATUS_OPTIONS,
            value: '',
            onChange: (v) => setFilter('status', v),
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
            filename: 'hr_training_enrollments.csv',
            headers: ['الموظف', 'الرقم الوظيفي', 'الدورة', 'البداية', 'النهاية', 'الدرجة', 'الحالة', 'المعتمد'],
            mapRow: (r) => [
              r.employee_name,
              r.employee_number,
              r.plan_name,
              r.start_date,
              r.end_date,
              r.score,
              r.status_display,
              r.decided_by_name ?? '',
            ],
            message: 'تم تصدير تسجيلات التدريب',
          })
        }
        exporting={exporting}
        actionsLabel="تفاصيل"
        actions={(row) => (
          <Tooltip title="تفاصيل التسجيل">
            <IconButton onClick={() => navigate(`/app/hr/training/${row.id}`)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        )}
        emptyTitle="لا توجد تسجيلات تدريب"
        emptyDescription="ستظهر هنا الاشتراكات في الدورات التدريبية."
      />
    </Box>
  );
};

export default TrainingEnrollmentsPage;
