import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
} from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';

const LeaveRequestsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const STATUS_OPTIONS = useMemo(
    () => [
      { value: '', label: t('hr.leaveRequests.filters.allStatuses') },
      ...Object.entries(LEAVE_STATUS_LABELS).map(([value]) => ({
        value,
        label: t(`hr.leaveRequests.statusLabels.${value}`),
      })),
    ],
    [t],
  );

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
        label: t('hr.leaveRequests.columns.employee'),
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
        label: t('hr.leaveRequests.columns.type'),
        render: (row) => row.leave_type_name,
      },
      {
        key: 'start_date',
        label: t('hr.leaveRequests.columns.from'),
        sortable: true,
        render: (row) => formatDate(row.start_date),
      },
      {
        key: 'end_date',
        label: t('hr.leaveRequests.columns.to'),
        render: (row) => formatDate(row.end_date),
      },
      {
        key: 'days',
        label: t('hr.leaveRequests.columns.days'),
        sortable: true,
        align: 'center' as const,
        render: (row) => `${row.days}${row.is_half_day ? ` (${t('hr.leaveRequests.halfDay')})` : ''}`,
      },
      {
        key: 'status',
        label: t('hr.leaveRequests.columns.status'),
        render: (row) => (
          <StatusChip
            label={t(`hr.leaveRequests.statusLabels.${row.status}`)}
            tone={LEAVE_STATUS_TONES[row.status] ?? 'neutral'}
          />
        ),
      },
      {
        key: 'decided_by_name',
        label: t('hr.leaveRequests.columns.approvedBy'),
        hideOnMobile: true,
        render: (row) => row.decided_by_name || '—',
      },
    ],
    [t],
  );

  return (
    <Box>
      <PageHeader
        title={t('hr.leaveRequests.header.title')}
        subtitle={t('hr.leaveRequests.header.subtitle')}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/app/hr/leave')}
          >
            {t('hr.leaveRequests.actions.new')}
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
        searchPlaceholder={t('hr.leaveRequests.searchPlaceholder')}
        filters={[
          {
            key: 'status',
            label: t('hr.leaveRequests.columns.status'),
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
            headers: [
              t('hr.leaveRequests.columns.employee'),
              t('hr.leaveRequests.export.employeeNumber'),
              t('hr.leaveRequests.columns.type'),
              t('hr.leaveRequests.columns.from'),
              t('hr.leaveRequests.columns.to'),
              t('hr.leaveRequests.columns.days'),
              t('hr.leaveRequests.columns.status'),
              t('hr.leaveRequests.columns.approvedBy'),
            ],
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
            message: t('hr.leaveRequests.export.message'),
          })
        }
        exporting={exporting}
        actionsLabel={t('hr.leaveRequests.actions.details')}
        actions={(row) => (
          <Tooltip title={t('hr.leaveRequests.actions.viewRequest')}>
            <IconButton onClick={() => navigate(`/app/hr/leave/${row.id}`)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        )}
        emptyTitle={t('hr.leaveRequests.empty.title')}
        emptyDescription={t('hr.leaveRequests.empty.description')}
      />
    </Box>
  );
};

export default LeaveRequestsPage;
