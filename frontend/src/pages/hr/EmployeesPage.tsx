import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import HistoryIcon from '@mui/icons-material/History';
import { PageHeader } from '../../components/common';
import DataTable from '../../components/ui/DataTable';
import type { DataTableColumn } from '../../components/ui/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { getEmployees } from '../../api/endpoints/hr';
import type { Employee } from '../../types/hr';
import { employmentStatusTone } from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';

const EmployeesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const EMPLOYMENT_TYPE_OPTIONS_LOCAL = useMemo(
    () => [
      { value: '', label: t('hr.employees.filters.allTypes') },
      { value: 'PERMANENT', label: t('hr.employees.employmentTypeLabels.PERMANENT') },
      { value: 'CONTRACT', label: t('hr.employees.employmentTypeLabels.CONTRACT') },
      { value: 'TEMPORARY', label: t('hr.employees.employmentTypeLabels.TEMPORARY') },
      { value: 'CONSULTANT', label: t('hr.employees.employmentTypeLabels.CONSULTANT') },
      { value: 'INTERN', label: t('hr.employees.employmentTypeLabels.INTERN') },
    ],
    [t],
  );

  const EMPLOYMENT_STATUS_OPTIONS_LOCAL = useMemo(
    () => [
      { value: '', label: t('hr.employees.filters.allStatuses') },
      { value: 'ACTIVE', label: t('hr.employees.employmentStatusLabels.ACTIVE') },
      { value: 'ON_LEAVE', label: t('hr.employees.employmentStatusLabels.ON_LEAVE') },
      { value: 'SUSPENDED', label: t('hr.employees.employmentStatusLabels.SUSPENDED') },
      { value: 'TERMINATED', label: t('hr.employees.employmentStatusLabels.TERMINATED') },
    ],
    [t],
  );

  const { rows, count, loading, error, page, rowsPerPage, pageSizeOptions, searchInput,
    setSearchInput, setPage, setRowsPerPage, sortBy, sortOrder,
    setSorting, setFilter, refresh, fetchAllRows } = useServerTable<Employee>({
    fetchData: (params) => getEmployees(params),
  });

  const { exporting, exportAll } = useTableExport<Employee>(fetchAllRows);

  const columns = useMemo<DataTableColumn<Employee>[]>(
    () => [
      {
        key: 'employee_number',
        label: t('hr.employees.columns.employeeNumber'),
        sortable: true,
        width: 130,
        render: (row) => row.employee_number || '—',
      },
      {
        key: 'full_name',
        label: t('hr.employees.columns.fullName'),
        sortable: true,
        render: (row) => (
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar src={undefined} sx={{ width: 32, height: 32, fontSize: 14 }}>
              {(row.full_name || '؟').charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {row.full_name || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" dir="ltr" sx={{ textAlign: 'right' }}>
                {row.email}
              </Typography>
            </Box>
          </Stack>
        ),
      },
      {
        key: 'job_title',
        label: t('hr.employees.columns.jobTitle'),
        hideOnMobile: true,
        render: (row) => row.job_title || '—',
      },
      {
        key: 'position_name',
        label: t('hr.employees.columns.position'),
        hideOnMobile: true,
        render: (row) => row.position_name || '—',
      },
      {
        key: 'department_name',
        label: t('hr.employees.columns.department'),
        hideOnMobile: true,
        render: (row) => row.department_name || '—',
      },
      {
        key: 'employment_type',
        label: t('hr.employees.columns.employmentType'),
        render: (row) => (
          <StatusChip
            label={t(`hr.employees.employmentTypeLabels.${row.employment_type}`)}
            tone="info"
            showIcon={false}
          />
        ),
      },
      {
        key: 'employment_status',
        label: t('hr.employees.columns.status'),
        sortable: true,
        render: (row) => (
          <StatusChip
            label={t(`hr.employees.employmentStatusLabels.${row.employment_status}`)}
            tone={employmentStatusTone(row.employment_status)}
          />
        ),
      },
      {
        key: 'hire_date',
        label: t('hr.employees.columns.hireDate'),
        sortable: true,
        hideOnMobile: true,
        render: (row) => (row.hire_date ? formatDate(row.hire_date) : '—'),
      },
    ],
    [t],
  );

  const filters = useMemo(
    () => [
      {
        key: 'employment_type',
        label: t('hr.employees.columns.employmentType'),
        options: EMPLOYMENT_TYPE_OPTIONS_LOCAL,
        value: '',
        onChange: (value: string) => setFilter('employment_type', value),
      },
      {
        key: 'employment_status',
        label: t('hr.employees.columns.status'),
        options: EMPLOYMENT_STATUS_OPTIONS_LOCAL,
        value: '',
        onChange: (value: string) => setFilter('employment_status', value),
      },
    ],
    [setFilter, t, EMPLOYMENT_TYPE_OPTIONS_LOCAL, EMPLOYMENT_STATUS_OPTIONS_LOCAL],
  );

  return (
    <Box>
      <PageHeader
        title={t('hr.employees.header.title')}
        subtitle={t('hr.employees.header.subtitle')}
        action={
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => navigate('/app/hr/employees/new')}
          >
            {t('hr.employees.actions.newFile')}
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
        loading={loading}
        error={error}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('hr.employees.searchPlaceholder')}
        filters={filters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        pageSizeOptions={pageSizeOptions}
        onRefresh={refresh}
        onExport={() =>
          exportAll({
            filename: 'hr_employees.csv',
            headers: [
              t('hr.employees.columns.employeeNumber'),
              t('hr.employees.columns.fullName'),
              t('hr.employees.export.email'),
              t('hr.employees.columns.jobTitle'),
              t('hr.employees.columns.position'),
              t('hr.employees.columns.department'),
              t('hr.employees.export.sector'),
              t('hr.employees.columns.employmentType'),
              t('hr.employees.columns.status'),
              t('hr.employees.columns.hireDate'),
            ],
            mapRow: (row) => [
              row.employee_number,
              row.full_name,
              row.email,
              row.job_title,
              row.position_name ?? '',
              row.department_name ?? '',
              row.sector_name ?? '',
              t(`hr.employees.employmentTypeLabels.${row.employment_type}`),
              t(`hr.employees.employmentStatusLabels.${row.employment_status}`),
              row.hire_date ?? '',
            ],
            message: t('hr.employees.messages.exported'),
          })
        }
        exporting={exporting}
        actions={(row) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={t('hr.employees.tooltips.viewProfile')}>
              <IconButton size="small" onClick={() => navigate(`/app/hr/employees/${row.id}`)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('hr.employees.tooltips.timeline')}>
              <IconButton
                size="small"
                onClick={() => navigate(`/app/hr/employees/${row.id}?tab=timeline`)}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
        actionsLabel={t('hr.employees.actions.label')}
        emptyTitle={t('hr.employees.empty.title')}
        emptyDescription={t('hr.employees.empty.description')}
      />
    </Box>
  );
};

export default EmployeesPage;
