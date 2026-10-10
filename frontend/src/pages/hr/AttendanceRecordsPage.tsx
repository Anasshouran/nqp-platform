import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import UndoIcon from '@mui/icons-material/Undo';
import { PageHeader } from '../../components/common';
import DataTable from '../../components/ui/DataTable';
import type { DataTableColumn } from '../../components/ui/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { useAuth } from '../../hooks/useAuth';
import {
  approveAttendanceRecord,
  getAttendanceRecords,
  unapproveAttendanceRecord,
} from '../../api/endpoints/hr';
import type { AttendanceRecord } from '../../types/hr';
import {
  ATTENDANCE_STATUS_LABELS,
  ATTENDANCE_STATUS_TONES,
  attendanceStatusLabel,
} from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';
import { extractErrorMessage, notifySuccess, notifyError } from '../../utils/toast';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  ...Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const APPROVAL_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'true', label: 'معتمد' },
  { value: 'false', label: 'بانتظار الاعتماد' },
];

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '—');

const AttendanceRecordsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isApprover = user?.role === 'HR_APPROVER';

  const {
    rows, count, loading, error, page, rowsPerPage, pageSizeOptions, searchInput,
    setSearchInput, setPage, setRowsPerPage, sortBy, sortOrder,
    setSorting, setFilter, refresh, fetchAllRows,
  } = useServerTable<AttendanceRecord>({
    fetchData: (params) => getAttendanceRecords(params),
  });

  const { exporting, exportAll } = useTableExport<AttendanceRecord>(fetchAllRows);

  const act = async (row: AttendanceRecord, approve: boolean) => {
    try {
      if (approve) {
        await approveAttendanceRecord(row.id);
        notifySuccess('تم اعتماد سجل الحضور');
      } else {
        await unapproveAttendanceRecord(row.id);
        notifySuccess('تم سحب اعتماد السجل');
      }
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر تنفيذ الإجراء'));
    }
  };

  const columns = useMemo<DataTableColumn<AttendanceRecord>[]>(
    () => [
      {
        key: 'date',
        label: 'التاريخ',
        sortable: true,
        render: (row) => formatDate(row.date),
      },
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
        key: 'status',
        label: 'الحالة',
        render: (row) => (
          <StatusChip
            label={attendanceStatusLabel(row.status)}
            tone={ATTENDANCE_STATUS_TONES[row.status] ?? 'neutral'}
          />
        ),
      },
      {
        key: 'check_in',
        label: 'الدخول',
        render: (row) => hhmm(row.check_in),
      },
      {
        key: 'check_out',
        label: 'الانصراف',
        render: (row) => hhmm(row.check_out),
      },
      {
        key: 'worked_minutes',
        label: 'ساعات العمل',
        hideOnMobile: true,
        render: (row) => (row.worked_minutes ? `${Math.floor(row.worked_minutes / 60)}س ${row.worked_minutes % 60}د` : '—'),
      },
      {
        key: 'is_approved',
        label: 'الاعتماد',
        render: (row) => (
          <StatusChip
            label={row.is_approved ? 'معتمد' : 'بانتظار الاعتماد'}
            tone={row.is_approved ? 'success' : 'warning'}
            showIcon={false}
          />
        ),
      },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="سجلات الحضور"
        subtitle="كل السجلات ضمن نطاقك الإداري — السجل المعتمد يُقفل أمام التعديل والحذف"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/app/hr/attendance')}
          >
            تسجيل حضور
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
          { key: 'status', label: 'الحالة', options: STATUS_OPTIONS, value: '', onChange: (v) => setFilter('status', v) },
          { key: 'is_approved', label: 'الاعتماد', options: APPROVAL_OPTIONS, value: '', onChange: (v) => setFilter('is_approved', v) },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        onExport={() =>
          exportAll({
            filename: 'hr_attendance.csv',
            headers: ['التاريخ', 'الموظف', 'الرقم الوظيفي', 'الحالة', 'الدخول', 'الانصراف', 'دقائق إضافية', 'معتمد'],
            mapRow: (r) => [
              r.date,
              r.employee_name,
              r.employee_number,
              r.status_display,
              hhmm(r.check_in),
              hhmm(r.check_out),
              r.overtime_minutes,
              r.is_approved ? 'نعم' : 'لا',
            ],
            message: 'تم تصدير سجلات الحضور',
          })
        }
        exporting={exporting}
        actionsLabel="اعتماد"
        actions={(row) => {
          if (!isApprover) return null;
          // من يُسجّل حضور يوم لا يوثّقه: الاعتماد هنا لمن لم يُسجّل السجل.
          const isRecorder = row.recorded_by === user?.id;
          if (row.is_approved) {
            return (
              <Tooltip title="سحب الاعتماد">
                <IconButton onClick={() => act(row, false)}>
                  <UndoIcon />
                </IconButton>
              </Tooltip>
            );
          }
          if (isRecorder) {
            return (
              <Tooltip title="لا يمكنك اعتماد سجل سجّلته بنفسك">
                <span>
                  <IconButton disabled>
                    <CheckIcon />
                  </IconButton>
                </span>
              </Tooltip>
            );
          }
          return (
            <Tooltip title="اعتماد السجل">
              <IconButton onClick={() => act(row, true)}>
                <CheckIcon />
              </IconButton>
            </Tooltip>
          );
        }}
        emptyTitle="لا توجد سجلات حضور"
        emptyDescription="سجّل الحضور من زر «تسجيل حضور»، أو عدّل عوامل التصفية."
      />
    </Box>
  );
};

export default AttendanceRecordsPage;
