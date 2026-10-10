import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  employmentStatusLabel,
  employmentStatusTone,
  employmentTypeLabel,
} from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: '', label: 'كل الأنواع' },
  { value: 'PERMANENT', label: 'دائم' },
  { value: 'CONTRACT', label: 'بعقد' },
  { value: 'TEMPORARY', label: 'مؤقت' },
  { value: 'CONSULTANT', label: 'استشاري' },
  { value: 'INTERN', label: 'تدريب' },
];

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'ACTIVE', label: 'على رأس العمل' },
  { value: 'ON_LEAVE', label: 'في إجازة' },
  { value: 'SUSPENDED', label: 'موقوف' },
  { value: 'TERMINATED', label: 'منتهي الخدمة' },
];

const EmployeesPage = () => {
  const navigate = useNavigate();

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
        label: 'الرقم الوظيفي',
        sortable: true,
        width: 130,
        render: (row) => row.employee_number || '—',
      },
      {
        key: 'full_name',
        label: 'الاسم',
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
        label: 'المسمى الوظيفي',
        hideOnMobile: true,
        render: (row) => row.job_title || '—',
      },
      {
        key: 'position_name',
        label: 'الموقع',
        hideOnMobile: true,
        render: (row) => row.position_name || '—',
      },
      {
        key: 'department_name',
        label: 'القسم',
        hideOnMobile: true,
        render: (row) => row.department_name || '—',
      },
      {
        key: 'employment_type',
        label: 'نوع التعيين',
        render: (row) => (
          <StatusChip label={employmentTypeLabel(row.employment_type)} tone="info" showIcon={false} />
        ),
      },
      {
        key: 'employment_status',
        label: 'الحالة',
        sortable: true,
        render: (row) => (
          <StatusChip
            label={employmentStatusLabel(row.employment_status)}
            tone={employmentStatusTone(row.employment_status)}
          />
        ),
      },
      {
        key: 'hire_date',
        label: 'تاريخ التعيين',
        sortable: true,
        hideOnMobile: true,
        render: (row) => (row.hire_date ? formatDate(row.hire_date) : '—'),
      },
    ],
    [],
  );

  const filters = useMemo(
    () => [
      {
        key: 'employment_type',
        label: 'نوع التعيين',
        options: EMPLOYMENT_TYPE_OPTIONS,
        value: '',
        onChange: (value: string) => setFilter('employment_type', value),
      },
      {
        key: 'employment_status',
        label: 'الحالة',
        options: EMPLOYMENT_STATUS_OPTIONS,
        value: '',
        onChange: (value: string) => setFilter('employment_status', value),
      },
    ],
    [setFilter],
  );

  return (
    <Box>
      <PageHeader
        title="الملفات الوظيفية"
        subtitle="سجل موظفي المنصة وبياناتهم الوظيفية"
        action={
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => navigate('/app/hr/employees/new')}
          >
            ملف جديد
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
        searchPlaceholder="بحث بالاسم أو الرقم الوظيفي أو البريد..."
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
              'الرقم الوظيفي', 'الاسم', 'البريد', 'المسمى الوظيفي',
              'الموقع', 'القسم', 'القطاع', 'نوع التعيين', 'الحالة', 'تاريخ التعيين',
            ],
            mapRow: (row) => [
              row.employee_number,
              row.full_name,
              row.email,
              row.job_title,
              row.position_name ?? '',
              row.department_name ?? '',
              row.sector_name ?? '',
              employmentTypeLabel(row.employment_type),
              employmentStatusLabel(row.employment_status),
              row.hire_date ?? '',
            ],
            message: 'تم تصدير الملفات الوظيفية',
          })
        }
        exporting={exporting}
        actions={(row) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="عرض الملف">
              <IconButton size="small" onClick={() => navigate(`/app/hr/employees/${row.id}`)}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="المسار الوظيفي">
              <IconButton
                size="small"
                onClick={() => navigate(`/app/hr/employees/${row.id}?tab=timeline`)}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
        actionsLabel="إجراءات"
        emptyTitle="لا توجد ملفات وظيفية"
        emptyDescription="لم يتم العثور على موظفين مطابقين لعوامل التصفية."
      />
    </Box>
  );
};

export default EmployeesPage;
