import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  postingKindLabel,
  postingStatusLabel,
  POSTING_STATUS_TONES,
} from '../../utils/hrLabels';
import { formatDate } from '../../utils/formatters';

const KIND_OPTIONS = [
  { value: '', label: 'كل الأنواع' },
  ...Object.entries(POSTING_KIND_LABELS).map(([value, label]) => ({ value, label })),
];

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  ...Object.entries(POSTING_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const PostingRequestsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // التطبيق يحرس بالدور لا بالصلاحية المفردة (ProtectedRoute)، فيُشتق
  // «من يستطيع الإنشاء» من الدور: المعتمد وحده لا يُدخل.
  const canAdd = user?.role !== 'HR_APPROVER';

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
        label: 'الموظف',
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
        label: 'النوع',
        render: (row) => <StatusChip label={postingKindLabel(row.kind)} tone="info" showIcon={false} />,
      },
      {
        key: 'status',
        label: 'الحالة',
        render: (row) => (
          <StatusChip
            label={postingStatusLabel(row.status)}
            tone={POSTING_STATUS_TONES[row.status] ?? 'neutral'}
          />
        ),
      },
      {
        key: 'target_summary',
        label: 'الوجهة',
        render: (row) => (
          <Typography variant="body2">{row.target_summary}</Typography>
        ),
      },
      {
        key: 'effective_date',
        label: 'تاريخ النفاذ',
        hideOnMobile: true,
        render: (row) => (row.effective_date ? formatDate(row.effective_date) : '—'),
      },
      {
        key: 'requested_by_name',
        label: 'مقدّم الطلب',
        hideOnMobile: true,
        render: (row) => (
          <Box>
            <Typography variant="body2">{row.requested_by_name || '—'}</Typography>
            {row.is_self_service && (
              <Typography variant="caption" color="text.secondary">
                خدمة ذاتية
              </Typography>
            )}
          </Box>
        ),
      },
      {
        key: 'decided_by_name',
        label: 'المعتمد',
        hideOnMobile: true,
        render: (row) => row.decided_by_name || '—',
      },
    ],
    [],
  );

  return (
    <Box>
      <PageHeader
        title="طلبات النقل والترقية"
        subtitle="الاعتماد ينقل الموظف فعلياً: يُغلق تعيينه القديم ويفتح الجديد ويُسجَّل في المسار الوظيفي"
        action={
          canAdd && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/app/hr/postings/new')}
            >
              طلب جديد
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
        searchPlaceholder="بحث باسم الموظف أو رقمه الوظيفي..."
        filters={[
          { key: 'kind', label: 'النوع', options: KIND_OPTIONS, value: '', onChange: (v) => setFilter('kind', v) },
          { key: 'status', label: 'الحالة', options: STATUS_OPTIONS, value: '', onChange: (v) => setFilter('status', v) },
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
            headers: ['الموظف', 'الرقم الوظيفي', 'النوع', 'الحالة', 'الوجهة', 'تاريخ النفاذ', 'مقدّم الطلب', 'المعتمد'],
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
            message: 'تم تصدير الطلبات',
          })
        }
        exporting={exporting}
        actionsLabel="إجراءات"
        actions={(row) => (
          <Tooltip title="تفاصيل الطلب">
            <IconButton onClick={() => navigate(`/app/hr/postings/${row.id}`)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
        )}
        emptyTitle="لا توجد طلبات نقل"
        emptyDescription="ستظهر هنا طلبات النقل والترقية المرفوعة من الموظفين أو من الموارد البشرية."
      />
    </Box>
  );
};

export default PostingRequestsPage;
