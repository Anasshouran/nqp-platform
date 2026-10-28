import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

const EstablishmentsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const KIND_OPTIONS = useMemo(
    () => [
      { value: '', label: t('hr.establishments.filters.allKinds') },
      { value: 'DEPARTMENT', label: t('hr.establishments.kindLabels.DEPARTMENT') },
      { value: 'UNIT', label: t('hr.establishments.kindLabels.UNIT') },
      { value: 'ENTRY_POINT', label: t('hr.establishments.kindLabels.ENTRY_POINT') },
      { value: 'ENTRY_GROUP', label: t('hr.establishments.kindLabels.ENTRY_GROUP') },
    ],
    [t],
  );

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
        label: t('hr.establishments.columns.code'),
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
        label: t('hr.establishments.columns.unit'),
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
        label: t('hr.establishments.columns.type'),
        render: (row) => <StatusChip label={row.kind_display} tone="info" showIcon={false} />,
      },
      {
        key: 'sector_name',
        label: t('hr.establishments.columns.sector'),
        hideOnMobile: true,
        render: (row) => row.sector_name || '—',
      },
      {
        key: 'parent_name',
        label: t('hr.establishments.columns.parent'),
        hideOnMobile: true,
        render: (row) => row.parent_name || '—',
      },
      {
        key: 'manager_name',
        label: t('hr.establishments.columns.manager'),
        hideOnMobile: true,
        render: (row) => row.manager_name || '—',
      },
      {
        key: 'headcount',
        label: t('hr.establishments.columns.headcount'),
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
    [navigate, t],
  );

  return (
    <Box>
      <PageHeader
        title={t('hr.establishments.header.title')}
        subtitle={t('hr.establishments.header.subtitle')}
        action={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={() => navigate('/app/hr')}>
              {t('hr.establishments.actions.dashboard')}
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
        searchPlaceholder={t('hr.establishments.searchPlaceholder')}
        filters={[
          {
            key: 'kind',
            label: t('hr.establishments.columns.type'),
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
              t('hr.establishments.columns.code'),
              t('hr.establishments.columns.unit'),
              t('hr.establishments.export.englishName'),
              t('hr.establishments.columns.type'),
              t('hr.establishments.columns.sector'),
              t('hr.establishments.columns.parent'),
              t('hr.establishments.columns.manager'),
              t('hr.establishments.columns.headcount'),
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
            message: t('hr.establishments.export.message'),
          })
        }
        exporting={tableExporting}
        emptyTitle={t('hr.establishments.empty.title')}
        emptyDescription={t('hr.establishments.empty.description')}
      />
    </Box>
  );
};

export default EstablishmentsPage;
