import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import DataTable from '../../components/ui/DataTable';
import type { DataTableColumn } from '../../components/ui/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import { PageHeader } from '../../components/common';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { getHrEstablishments } from '../../api/endpoints/hr';
import type { HrEstablishment } from '../../types/hr';

const KIND_OPTIONS = [
  { value: '', label: 'كل الأنواع' },
  { value: 'DEPARTMENT', label: 'قسم رئيسي' },
  { value: 'UNIT', label: 'وحدة فرعية' },
  { value: 'ENTRY_POINT', label: 'نقطة دخول' },
  { value: 'ENTRY_GROUP', label: 'مجموعة نقاط دخول' },
];

const EstablishmentsPage = () => {
  const navigate = useNavigate();

  const {
    rows, count, loading, error, page, rowsPerPage, pageSizeOptions, searchInput,
    setSearchInput, setPage, setRowsPerPage, setFilter, refresh, sortBy, sortOrder,
    setSorting, fetchAllRows,
  } = useServerTable<HrEstablishment>({
    fetchData: (params) => getHrEstablishments(params),
  });

  const { exporting: tableExporting, exportAll } = useTableExport<HrEstablishment>(fetchAllRows);

  const columns = useMemo<DataTableColumn<HrEstablishment>[]>(
    () => [
      {
        key: 'code',
        label: 'الكود',
        sortable: true,
        width: 120,
        render: (row) => (
          <Typography variant="body2" fontFamily="monospace" dir="ltr">
            {row.code}
          </Typography>
        ),
      },
      {
        key: 'name_ar',
        label: 'الوحدة',
        sortable: true,
        render: (row) => (
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.name_ar}
            </Typography>
            {row.name_en && (
              <Typography variant="caption" color="text.secondary" dir="ltr" sx={{ textAlign: 'right' }}>
                {row.name_en}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        key: 'kind',
        label: 'النوع',
        render: (row) => <StatusChip label={row.kind_display} tone="info" showIcon={false} />,
      },
      {
        key: 'sector_name',
        label: 'القطاع',
        hideOnMobile: true,
        render: (row) => row.sector_name || '—',
      },
      {
        key: 'parent_name',
        label: 'يتبع',
        hideOnMobile: true,
        render: (row) => row.parent_name || '—',
      },
      {
        key: 'manager_name',
        label: 'المنصب المسؤول',
        hideOnMobile: true,
        render: (row) => row.manager_name || '—',
      },
      {
        key: 'headcount',
        label: 'القوة العاملة',
        sortable: true,
        align: 'center' as const,
        render: (row) => (
          <Button
            size="small"
            onClick={() => navigate(`/app/hr/employees?search=${encodeURIComponent(row.name_ar)}`)}
            sx={{ minWidth: 48 }}
          >
            {row.headcount}
          </Button>
        ),
      },
    ],
    [navigate],
  );

  return (
    <Box>
      <PageHeader
        title="الوحدات التأسيسية"
        subtitle="الهيكل التنظيمي داخل نطاق صلاحياتك — مصدر-truth واحد للصلاحيات"
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => navigate('/app/hr')}>
              اللوحة
            </Button>
          </Stack>
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
        searchPlaceholder="بحث بالكود أو الاسم..."
        filters={[
          {
            key: 'kind',
            label: 'النوع',
            options: KIND_OPTIONS,
            value: '',
            onChange: (v) => setFilter('kind', v),
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
            filename: 'hr_establishments.csv',
            headers: [
              'الكود', 'الوحدة', 'بالإنجليزية', 'النوع',
              'القطاع', 'يتبع', 'المنصب المسؤول', 'القوة العاملة',
            ],
            mapRow: (r) => [
              r.code,
              r.name_ar,
              r.name_en,
              r.kind_display,
              r.sector_name ?? '',
              r.parent_name ?? '',
              r.manager_name ?? '',
              r.headcount,
            ],
            message: 'تم تصدير الوحدات',
          })
        }
        exporting={tableExporting}
        emptyTitle="لا توجد وحدات"
        emptyDescription="لم يُسجَّل أي وحدة هيكلية داخل نطاقك، أو لا يوجد نطاق مخصّص لك."
      />
    </Box>
  );
};

export default EstablishmentsPage;
