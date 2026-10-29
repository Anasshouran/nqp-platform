import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '../../components/common';
import DataTable from '../../components/ui/DataTable';
import type { DataTableColumn } from '../../components/ui/DataTable';
import StatusChip from '../../components/ui/StatusChip';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { useAuth } from '../../hooks/useAuth';
import { getPostingRequests } from '../../api/endpoints/hr';
import type { PostingRequest } from '../../types/hr';
import {
  POSTING_KIND_LABELS,
  POSTING_STATUS_LABELS,
  POSTING_STATUS_TONES,
} from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';

const PostingRequestsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  // التطبيق يحرس بالدور لا بالصلاحية المفردة (ProtectedRoute)، فيُشتق
  // «من يستطيع الإنشاء» من الدور: المعتمد وحده لا يُدخل.
  const canAdd = user?.role !== 'HR_APPROVER';

  const KIND_OPTIONS = useMemo(
    () => [
      { value: '', label: t('hr.postingRequests.filters.allKinds') },
      ...Object.entries(POSTING_KIND_LABELS).map(([value]) => ({ value, label: t(`hr.postingRequests.kindLabels.${value}`) })),
    ],
    [t],
  );

  const STATUS_OPTIONS = useMemo(
    () => [
      { value: '', label: t('hr.postingRequests.filters.allStatuses') },
      ...Object.entries(POSTING_STATUS_LABELS).map(([value]) => ({ value, label: t(`hr.postingRequests.statusLabels.${value}`) })),
    ],
    [t],
  );

  const {
    rows, count, loading, error, page, rowsPerPage, pageSizeOptions, searchInput,
    setSearchInput, setPage, setRowsPerPage, sortBy, sortOrder,
    setSorting, setFilter, refresh, fetchAllRows,
  } = useServerTable<PostingRequest>({
    fetchData: (params) => getPostingRequests(params),
  });

  const { exporting, exportAll } = useTableExport<PostingRequest>(fetchAllRows);

  const columns = useMemo<DataTableColumn<PostingRequest>[]>(
    () => [
      {
        key: 'employee_name',
        label: t('hr.postingRequests.columns.employee'),
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
        key: 'kind',
        label: t('hr.postingRequests.columns.kind'),
        render: (row) => <StatusChip label={t(`hr.postingRequests.kindLabels.${row.kind}`)} tone="info" showIcon={false} />,
      },
      {
        key: 'status',
        label: t('hr.postingRequests.columns.status'),
        render: (row) => (
          <StatusChip
            label={t(`hr.postingRequests.statusLabels.${row.status}`)}
            tone={POSTING_STATUS_TONES[row.status] ?? 'neutral'}
          />
        ),
      },
      {
        key: 'target_summary',
        label: t('hr.postingRequests.columns.destination'),
        render: (row) => (
          <Typography variant="body2">{row.target_summary}</Typography>
        ),
      },
      {
        key: 'effective_date',
        label: t('hr.postingRequests.columns.effectiveDate'),
        hideOnMobile: true,
        render: (row) => (row.effective_date ? formatDate(row.effective_date) : '—'),
      },
      {
        key: 'requested_by_name',
        label: t('hr.postingRequests.columns.requestedBy'),
        hideOnMobile: true,
        render: (row) => (
          <Box>
            <Typography variant="body2">{row.requested_by_name || '—'}</Typography>
            {row.is_self_service && (
              <Typography variant="caption" color="text.secondary">
                {t('hr.postingRequests.selfService')}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        key: 'decided_by_name',
        label: t('hr.postingRequests.columns.approvedBy'),
        hideOnMobile: true,
        render: (row) => row.decided_by_name || '—',
      },
    ],
    [t],
  );

  return (
    <Box>
      <PageHeader
        title={t('hr.postingRequests.header.title')}
        subtitle={t('hr.postingRequests.header.subtitle')}
        action={
          canAdd && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/app/hr/postings/new')}
            >
              {t('hr.postingRequests.actions.new')}
            </Button>
          )
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
        searchPlaceholder={t('hr.postingRequests.searchPlaceholder')}
        filters={[
          { key: 'kind', label: t('hr.postingRequests.columns.kind'), options: KIND_OPTIONS, value: '', onChange: (v) => setFilter('kind', v) },
          { key: 'status', label: t('hr.postingRequests.columns.status'), options: STATUS_OPTIONS, value: '', onChange: (v) => setFilter('status', v) },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        onExport={() =>
          exportAll({
            filename: 'hr_posting_requests.csv',
            headers: [
              t('hr.postingRequests.columns.employee'),
              t('hr.postingRequests.export.employeeNumber'),
              t('hr.postingRequests.columns.kind'),
              t('hr.postingRequests.columns.status'),
              t('hr.postingRequests.columns.destination'),
              t('hr.postingRequests.columns.effectiveDate'),
              t('hr.postingRequests.columns.requestedBy'),
              t('hr.postingRequests.columns.approvedBy'),
            ],
            mapRow: (r) => [
              r.employee_name,
              r.employee_number,
              r.kind_display,
              r.status_display,
              r.target_summary,
              r.effective_date ?? '',
              r.requested_by_name,
              r.decided_by_name ?? '',
            ],
            message: t('hr.postingRequests.export.message'),
          })
        }
        exporting={exporting}
        actionsLabel={t('hr.postingRequests.actions.label')}
        actions={(row) => (
          <Tooltip title={t('hr.postingRequests.actions.viewRequest')}>
            <IconButton onClick={() => navigate(`/app/hr/postings/${row.id}`)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        )}
        emptyTitle={t('hr.postingRequests.empty.title')}
        emptyDescription={t('hr.postingRequests.empty.description')}
      />
    </Box>
  );
};

export default PostingRequestsPage;
