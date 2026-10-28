import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
} from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';
import { extractErrorMessage, notifySuccess, notifyError } from '../../utils/toast';

const hhmm = (t: string | null) => (t ? t.slice(0, 5) : '—');

const AttendanceRecordsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isApprover = user?.role === 'HR_APPROVER';

  const STATUS_OPTIONS_LOCAL = [
    { value: '', label: t('hr.attendanceRecords.filters.allStatuses') },
    ...Object.entries(ATTENDANCE_STATUS_LABELS).map(([value]) => ({
      value,
      label: t(`hr.attendanceRecords.statusLabels.${value}`),
    })),
  ];

  const APPROVAL_OPTIONS_LOCAL = [
    { value: '', label: t('hr.attendanceRecords.filters.all') },
    { value: 'true', label: t('hr.attendanceRecords.filters.approved') },
    { value: 'false', label: t('hr.attendanceRecords.filters.pendingApproval') },
  ];

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
        notifySuccess(t('hr.attendanceRecords.messages.approved'));
      } else {
        await unapproveAttendanceRecord(row.id);
        notifySuccess(t('hr.attendanceRecords.messages.unapproved'));
      }
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('hr.attendanceRecords.errors.actionFailed')));
    }
  };

  const columns = useMemo<DataTableColumn<AttendanceRecord>[]>(
    () => [
      {
        key: 'date',
        label: t('hr.attendanceRecords.columns.date'),
        sortable: true,
        render: (row) => formatDate(row.date),
      },
      {
        key: 'employee_name',
        label: t('hr.attendanceRecords.columns.employee'),
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
        label: t('hr.attendanceRecords.columns.status'),
        render: (row) => (
          <StatusChip
            label={t(`hr.attendanceRecords.statusLabels.${row.status}`)}
            tone={ATTENDANCE_STATUS_TONES[row.status] ?? 'neutral'}
          />
        ),
      },
      {
        key: 'check_in',
        label: t('hr.attendanceRecords.columns.checkIn'),
        render: (row) => hhmm(row.check_in),
      },
      {
        key: 'check_out',
        label: t('hr.attendanceRecords.columns.checkOut'),
        render: (row) => hhmm(row.check_out),
      },
      {
        key: 'worked_minutes',
        label: t('hr.attendanceRecords.columns.workedHours'),
        hideOnMobile: true,
        render: (row) => (row.worked_minutes ? `${Math.floor(row.worked_minutes / 60)}س ${row.worked_minutes % 60}د` : '—'),
      },
      {
        key: 'is_approved',
        label: t('hr.attendanceRecords.columns.approval'),
        render: (row) => (
          <StatusChip
            label={row.is_approved ? t('hr.attendanceRecords.approval.approved') : t('hr.attendanceRecords.approval.pending')}
            tone={row.is_approved ? 'success' : 'warning'}
            showIcon={false}
          />
        ),
      },
    ],
    [t],
  );

  return (
    <Box>
      <PageHeader
        title={t('hr.attendanceRecords.header.title')}
        subtitle={t('hr.attendanceRecords.header.subtitle')}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/app/hr/attendance')}
          >
            {t('hr.attendanceRecords.actions.recordAttendance')}
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
        searchPlaceholder={t('hr.attendanceRecords.searchPlaceholder')}
        filters={[
          { key: 'status', label: t('hr.attendanceRecords.columns.status'), options: STATUS_OPTIONS_LOCAL, value: '', onChange: (v) => setFilter('status', v) },
          { key: 'is_approved', label: t('hr.attendanceRecords.columns.approval'), options: APPROVAL_OPTIONS_LOCAL, value: '', onChange: (v) => setFilter('is_approved', v) },
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
            headers: [
              t('hr.attendanceRecords.columns.date'),
              t('hr.attendanceRecords.columns.employee'),
              t('hr.attendanceRecords.columns.employeeNumber'),
              t('hr.attendanceRecords.columns.status'),
              t('hr.attendanceRecords.columns.checkIn'),
              t('hr.attendanceRecords.columns.checkOut'),
              t('hr.attendanceRecords.export.overtimeMinutes'),
              t('hr.attendanceRecords.columns.approval'),
            ],
            mapRow: (r) => [
              r.date,
              r.employee_name,
              r.employee_number,
              r.status_display,
              hhmm(r.check_in),
              hhmm(r.check_out),
              r.overtime_minutes,
              r.is_approved ? t('hr.attendanceRecords.approval.yes') : t('hr.attendanceRecords.approval.no'),
            ],
            message: t('hr.attendanceRecords.messages.exported'),
          })
        }
        exporting={exporting}
        actionsLabel={t('hr.attendanceRecords.actions.approve')}
        actions={(row) => {
          if (!isApprover) return null;
          const isRecorder = row.recorded_by === user?.id;
          if (row.is_approved) {
            return (
              <Tooltip title={t('hr.attendanceRecords.tooltips.revokeApproval')}>
                <IconButton onClick={() => act(row, false)}>
                  <UndoIcon />
                </IconButton>
              </Tooltip>
            );
          }
          if (isRecorder) {
            return (
              <Tooltip title={t('hr.attendanceRecords.tooltips.cannotApproveOwn')}>
                <span>
                  <IconButton disabled>
                    <CheckIcon />
                  </IconButton>
                </span>
              </Tooltip>
            );
          }
          return (
            <Tooltip title={t('hr.attendanceRecords.tooltips.approveRecord')}>
              <IconButton onClick={() => act(row, true)}>
                <CheckIcon />
              </IconButton>
            </Tooltip>
          );
        }}
        emptyTitle={t('hr.attendanceRecords.empty.title')}
        emptyDescription={t('hr.attendanceRecords.empty.description')}
      />
    </Box>
  );
};

export default AttendanceRecordsPage;
