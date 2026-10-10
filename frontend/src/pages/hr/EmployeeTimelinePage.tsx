import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  timelineEventLabel,
} from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';

const EVENT_OPTIONS = [
  { value: '', label: 'كل الأحداث' },
  ...Object.entries(TIMELINE_EVENT_LABELS).map(([value, label]) => ({ value, label })),
];

const EmployeeTimelinePage = () => {
  const navigate = useNavigate();

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
        label: 'التاريخ',
        sortable: true,
        width: 130,
        render: (row) => formatDate(row.start_date),
      },
      {
        key: 'employee_name',
        label: 'الموظف',
        sortable: true,
        render: (row) => row.employee_name || '—',
      },
      {
        key: 'event',
        label: 'الحدث',
        render: (row) => (
          <StatusChip
            label={timelineEventLabel(row.event, row.event_display)}
            tone={TIMELINE_EVENT_TONES[row.event] ?? 'neutral'}
          />
        ),
      },
      {
        key: 'change',
        label: 'التغيير',
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
        label: 'السبب',
        hideOnMobile: true,
        render: (row) => row.reason || '—',
      },
      {
        key: 'created_by_name',
        label: 'سُجّل بواسطة',
        hideOnMobile: true,
        render: (row) => row.created_by_name || '—',
      },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="المسار الوظيفي"
        subtitle="سجل الترقية والنقل والإجازات لكل الموظفين في نطاقك"
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
        searchPlaceholder="بحث باسم الموظف أو السبب..."
        filters={[
          {
            key: 'event',
            label: 'نوع الحدث',
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
              'التاريخ', 'الموظف', 'الحدث', 'من', 'إلى', 'السبب', 'سُجّل بواسطة',
            ],
            mapRow: (row) => [
              row.start_date,
              row.employee_name,
              timelineEventLabel(row.event, row.event_display),
              row.old_position || row.old_department || '',
              row.new_position || row.new_department || '',
              row.reason,
              row.created_by_name ?? '',
            ],
            message: 'تم تصدير المسار الوظيفي',
          })
        }
        exporting={exporting}
        actions={(row) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="عرض الملف">
              <IconButton
                size="small"
                onClick={() => navigate(`/app/hr/employees/${row.employee}?tab=timeline`)}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="المسار الوظيفي">
              <IconButton
                size="small"
                onClick={() => navigate(`/app/hr/employees/${row.employee}?tab=timeline`)}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
        actionsLabel="إجراءات"
        emptyTitle="لا توجد أحداث"
        emptyDescription="لم يتم تسجيل أي ترقية أو نقل أو إجازة بعد."
      />
    </Box>
  );
};

export default EmployeeTimelinePage;
