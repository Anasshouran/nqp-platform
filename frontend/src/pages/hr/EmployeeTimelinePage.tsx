import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import HistoryIcon from '@mui/icons-material/History';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { PageHeader } from '../../components/common';
import DataTable from '../../components/ui/DataTable';
import type { DataTableColumn } from '../../components/ui/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { getEmployeeTimelineList } from '../../api/endpoints/hr';
import type { EmployeeTimelineEntry } from '../../types/hr';
import {
  TIMELINE_EVENT_LABELS,
  TIMELINE_EVENT_TONES,
} from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';

const EmployeeTimelinePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const EVENT_OPTIONS = useMemo(
    () => [
      { value: '', label: t('hr.employeeTimeline.filters.allEvents') },
      ...Object.entries(TIMELINE_EVENT_LABELS).map(([value]) => ({
        value,
        label: t(`hr.employeeTimeline.eventLabels.${value}`),
      })),
    ],
    [t],
  );

  const {
    rows, count, loading, error, page, rowsPerPage, pageSizeOptions, searchInput,
    setSearchInput, setPage, setRowsPerPage, setFilter, refresh, sortBy, sortOrder,
    setSorting, fetchAllRows,
  } = useServerTable<EmployeeTimelineEntry>({
    fetchData: (params) => getEmployeeTimelineList(params),
  });

  const { exporting, exportAll } = useTableExport<EmployeeTimelineEntry>(fetchAllRows);

  const columns = useMemo<DataTableColumn<EmployeeTimelineEntry>[]>(
    () => [
      {
        key: 'start_date',
        label: t('hr.employeeTimeline.columns.startDate'),
        sortable: true,
        width: 130,
        render: (row) => formatDate(row.start_date),
      },
      {
        key: 'employee_name',
        label: t('hr.employeeTimeline.columns.employee'),
        sortable: true,
        render: (row) => row.employee_name || '—',
      },
      {
        key: 'event',
        label: t('hr.employeeTimeline.columns.event'),
        render: (row) => (
          <StatusChip
            label={t(`hr.employeeTimeline.eventLabels.${row.event}`)}
            tone={TIMELINE_EVENT_TONES[row.event] ?? 'neutral'}
          />
        ),
      },
      {
        key: 'change',
        label: t('hr.employeeTimeline.columns.change'),
        render: (row) => {
          const from = row.old_position || row.old_department || row.old_sector || '';
          const to = row.new_position || row.new_department || row.new_sector || '';
          if (!from && !to) return <Typography variant="body2" color="text.disabled">—</Typography>;
          if (!from) return <Typography variant="body2">{to}</Typography>;
          if (!to) return <Typography variant="body2">{from}</Typography>;
          return (
            <Typography variant="body2" noWrap>
              <Box component="span" sx={{ color: 'text.secondary' }}>{from}</Box>
              {' ← '}
              <Box component="span" sx={{ fontWeight: 600 }}>{to}</Box>
            </Typography>
          );
        },
      },
      {
        key: 'reason',
        label: t('hr.employeeTimeline.columns.reason'),
        hideOnMobile: true,
        render: (row) => row.reason || '—',
      },
      {
        key: 'created_by_name',
        label: t('hr.employeeTimeline.columns.createdBy'),
        hideOnMobile: true,
        render: (row) => row.created_by_name || '—',
      },
    ],
    [t],
  );

  return (
    <Box>
      <PageHeader
        title={t('hr.employeeTimeline.header.title')}
        subtitle={t('hr.employeeTimeline.header.subtitle')}
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
        searchPlaceholder={t('hr.employeeTimeline.searchPlaceholder')}
        filters={[
          {
            key: 'event',
            label: t('hr.employeeTimeline.filters.eventType'),
            options: EVENT_OPTIONS,
            value: '',
            onChange: (v) => setFilter('event', v),
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
            filename: 'hr_employee_timeline.csv',
            headers: [
              t('hr.employeeTimeline.columns.startDate'),
              t('hr.employeeTimeline.columns.employee'),
              t('hr.employeeTimeline.columns.event'),
              t('hr.employeeTimeline.export.from'),
              t('hr.employeeTimeline.export.to'),
              t('hr.employeeTimeline.columns.reason'),
              t('hr.employeeTimeline.columns.createdBy'),
            ],
            mapRow: (row) => [
              row.start_date,
              row.employee_name,
              t(`hr.employeeTimeline.eventLabels.${row.event}`),
              row.old_position || row.old_department || '',
              row.new_position || row.new_department || '',
              row.reason,
              row.created_by_name ?? '',
            ],
            message: t('hr.employeeTimeline.export.message'),
          })
        }
        exporting={exporting}
        actions={(row) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={t('hr.employeeTimeline.actions.viewProfile')}>
              <IconButton
                size="small"
                onClick={() => navigate(`/app/hr/employees/${row.employee}?tab=timeline`)}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('hr.employeeTimeline.header.title')}>
              <IconButton
                size="small"
                onClick={() => navigate(`/app/hr/employees/${row.employee}?tab=timeline`)}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
        actionsLabel={t('hr.employeeTimeline.actions.label')}
        emptyTitle={t('hr.employeeTimeline.empty.title')}
        emptyDescription={t('hr.employeeTimeline.empty.description')}
      />
    </Box>
  );
};

export default EmployeeTimelinePage;
