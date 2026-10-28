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
import { getTrainingEnrollments } from '../../api/endpoints/hr';
import type { TrainingEnrollment } from '../../types/hr';
import {
  ENROLLMENT_STATUS_LABELS,
  ENROLLMENT_STATUS_TONES,
} from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';

const TrainingEnrollmentsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const STATUS_OPTIONS = useMemo(
    () => [
      { value: '', label: t('hr.trainingEnrollments.filters.allStatuses') },
      ...Object.entries(ENROLLMENT_STATUS_LABELS).map(([value]) => ({
        value,
        label: t(`hr.trainingEnrollments.statusLabels.${value}`),
      })),
    ],
    [t],
  );

  const {
    rows, count, loading, error, page, rowsPerPage, pageSizeOptions, searchInput,
    setSearchInput, setPage, setRowsPerPage, sortBy, sortOrder,
    setSorting, setFilter, refresh, fetchAllRows,
  } = useServerTable<TrainingEnrollment>({
    fetchData: (params) => getTrainingEnrollments(params),
  });

  const { exporting, exportAll } = useTableExport<TrainingEnrollment>(fetchAllRows);

  const columns = useMemo<DataTableColumn<TrainingEnrollment>[]>(
    () => [
      {
        key: 'employee_name',
        label: t('hr.trainingEnrollments.columns.employee'),
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
        key: 'plan_name',
        label: t('hr.trainingEnrollments.columns.course'),
        render: (row) => (
          <Box>
            <Typography variant="body2">{row.plan_name}</Typography>
            <Typography variant="caption" color="text.secondary" dir="ltr">
              {row.plan_code}
            </Typography>
          </Box>
        ),
      },
      {
        key: 'start_date',
        label: t('hr.trainingEnrollments.columns.startDate'),
        sortable: true,
        render: (row) => formatDate(row.start_date),
      },
      {
        key: 'end_date',
        label: t('hr.trainingEnrollments.columns.endDate'),
        render: (row) => formatDate(row.end_date),
      },
      {
        key: 'score',
        label: t('hr.trainingEnrollments.columns.score'),
        align: 'center' as const,
        render: (row) => row.score ?? '—',
      },
      {
        key: 'status',
        label: t('hr.trainingEnrollments.columns.status'),
        render: (row) => (
          <StatusChip
            label={t(`hr.trainingEnrollments.statusLabels.${row.status}`)}
            tone={ENROLLMENT_STATUS_TONES[row.status] ?? 'neutral'}
          />
        ),
      },
      {
        key: 'decided_by_name',
        label: t('hr.trainingEnrollments.columns.approvedBy'),
        hideOnMobile: true,
        render: (row) => row.decided_by_name || '—',
      },
    ],
    [t],
  );

  return (
    <Box>
      <PageHeader
        title={t('hr.trainingEnrollments.header.title')}
        subtitle={t('hr.trainingEnrollments.header.subtitle')}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/app/hr/training')}
          >
            {t('hr.trainingEnrollments.actions.new')}
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
        searchPlaceholder={t('hr.trainingEnrollments.searchPlaceholder')}
        filters={[
          {
            key: 'status',
            label: t('hr.trainingEnrollments.columns.status'),
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
            filename: 'hr_training_enrollments.csv',
            headers: [
              t('hr.trainingEnrollments.columns.employee'),
              t('hr.trainingEnrollments.export.employeeNumber'),
              t('hr.trainingEnrollments.columns.course'),
              t('hr.trainingEnrollments.columns.startDate'),
              t('hr.trainingEnrollments.columns.endDate'),
              t('hr.trainingEnrollments.columns.score'),
              t('hr.trainingEnrollments.columns.status'),
              t('hr.trainingEnrollments.columns.approvedBy'),
            ],
            mapRow: (r) => [
              r.employee_name,
              r.employee_number,
              r.plan_name,
              r.start_date,
              r.end_date,
              r.score,
              r.status_display,
              r.decided_by_name ?? '',
            ],
            message: t('hr.trainingEnrollments.export.message'),
          })
        }
        exporting={exporting}
        actionsLabel={t('hr.trainingEnrollments.actions.details')}
        actions={(row) => (
          <Tooltip title={t('hr.trainingEnrollments.actions.viewEnrollment')}>
            <IconButton onClick={() => navigate(`/app/hr/training/${row.id}`)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        )}
        emptyTitle={t('hr.trainingEnrollments.empty.title')}
        emptyDescription={t('hr.trainingEnrollments.empty.description')}
      />
    </Box>
  );
};

export default TrainingEnrollmentsPage;
