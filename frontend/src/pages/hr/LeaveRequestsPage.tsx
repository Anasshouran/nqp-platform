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
import { getLeaveRequests } from '../../api/endpoints/hr';
import type { LeaveRequest } from '../../types/hr';
import {
  LEAVE_STATUS_LABELS,
  LEAVE_STATUS_TONES,
  leaveStatusLabel,
} from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  ...Object.entries(LEAVE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const LeaveRequestsPage = () => {
  const navigate = useNavigate();

  const {
    rows, count, loading, error, page, rowsPerPage, pageSizeOptions, searchInput,
    setSearchInput, setPage, setRowsPerPage, sortBy, sortOrder,
    setSorting, setFilter, refresh, fetchAllRows,
  } = useServerTable<LeaveRequest>({
    fetchData: (params) => getLeaveRequests(params),
  });

  const { exporting, exportAll } = useTableExport<LeaveRequest>(fetchAllRows);

  const columns = useMemo<DataTableColumn<LeaveRequest>[]>(
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
        key: 'leave_type_name',
        label: 'النوع',
        render: (row) => row.leave_type_name,
      },
      {
        key: 'start_date',
        label: 'من',
        sortable: true,
        render: (row) => formatDate(row.start_date),
      },
      {
        key: 'end_date',
        label: 'إلى',
        render: (row) => formatDate(row.end_date),
      },
      {
        key: 'days',
        label: 'الأيام',
        sortable: true,
        align: 'center' as const,
        render: (row) => `${row.days}${row.is_half_day ? ' (نصف)' : ''}`,
      },
      {
        key: 'status',
        label: 'الحالة',
        render: (row) => (
          <StatusChip
            label={leaveStatusLabel(row.status)}
            tone={LEAVE_STATUS_TONES[row.status] ?? 'neutral'}
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
        title="طلبات الإجازات"
        subtitle="اعتماد الطلب يخصم من الرصيد؛ الطلب المُقدَّم يحجز أيامه حتى يُبتّ"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/app/hr/leave')}
          >
            طلب جديد
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
        searchPlaceholder="بحث باسم الموظف أو رقمه..."
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
            filename: 'hr_leave_requests.csv',
            headers: ['الموظف', 'الرقم الوظيفي', 'النوع', 'من', 'إلى', 'الأيام', 'الحالة', 'المعتمد'],
            mapRow: (r) => [
              r.employee_name,
              r.employee_number,
              r.leave_type_name,
              r.start_date,
              r.end_date,
              r.days,
              r.status_display,
              r.decided_by_name ?? '',
            ],
            message: 'تم تصدير طلبات الإجازات',
          })
        }
        exporting={exporting}
        actionsLabel="تفاصيل"
        actions={(row) => (
          <Tooltip title="تفاصيل الطلب">
            <IconButton onClick={() => navigate(`/app/hr/leave/${row.id}`)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        )}
        emptyTitle="لا توجد طلبات إجازة"
        emptyDescription="ستظهر هنا الطلبات المرفوعة من الموظفين أو من الموارد البشرية."
      />
    </Box>
  );
};

export default LeaveRequestsPage;
