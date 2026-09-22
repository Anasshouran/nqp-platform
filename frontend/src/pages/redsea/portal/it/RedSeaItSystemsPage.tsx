import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageHeader, DataTable, StatusChip, AppButton } from '../../../../components/uikit';
import { useServerTable } from '../../../../hooks/useServerTable';
import { getItSystems, recheckItSystems } from '../../../../api/endpoints/it';
import type { ItSystem } from '../../../../types/it';

const STATUS_TONE: Record<string, 'success' | 'warning' | 'error'> = {
  ONLINE: 'success',
  WARNING: 'warning',
  OFFLINE: 'error',
};

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const RedSeaItSystemsPage = () => {
  const navigate = useNavigate();
  const table = useServerTable<ItSystem>({ fetchData: getItSystems });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;
  const [rechecking, setRechecking] = useState(false);

  const handleRecheck = () => {
    setRechecking(true);
    recheckItSystems()
      .finally(() => {
        setRechecking(false);
        refresh();
      });
  };

  return (
    <Box>
      <PageHeader
        eyebrow="قسم تقنية المعلومات"
        title="حالة الأنظمة"
        subtitle="جاهزية الأنظمة والخدمات التقنية داخل قطاع البحر الأحمر."
        action={
          <AppButton size="small" startIcon={<RefreshIcon />} onClick={handleRecheck} loading={rechecking}>
            إعادة فحص الأنظمة
          </AppButton>
        }
      />
      <Box sx={{ mb: 2 }}>
        <AppButton startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/sector/red-sea/it')} variant="ghost">
          لوحة تقنية المعلومات
        </AppButton>
      </Box>
      <DataTable<ItSystem>
        columns={[
          {
            key: 'name_ar',
            label: 'النظام',
            sortable: true,
            render: (s) => (
              <Stack spacing={0.25}>
                <Typography sx={{ fontWeight: 700 }}>{s.name_ar || s.name}</Typography>
                <Typography variant="caption" color="text.secondary">{s.code}</Typography>
              </Stack>
            ),
          },
          {
            key: 'status',
            label: 'الحالة',
            render: (s) => <StatusChip label={s.status} tone={STATUS_TONE[s.status] ?? 'neutral'} />,
          },
          {
            key: 'request_count',
            label: 'الطلبات',
            sortable: true,
            hideOnMobile: true,
            render: (s) => Number(s.request_count).toLocaleString('ar-EG'),
          },
          {
            key: 'last_checked_at',
            label: 'آخر فحص',
            sortable: true,
            hideOnMobile: true,
            render: (s) => formatDate(s.last_checked_at),
          },
          {
            key: 'last_error',
            label: 'آخر خطأ',
            hideOnMobile: true,
            render: (s) => s.last_error || '—',
          },
        ]}
        rows={rows}
        rowKey={(s) => s.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="قائمة الأنظمة التقنية"
        subtitle={`${count} نظام ضمن نطاق القطاع`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث باسم النظام أو الكود..."
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد أنظمة"
        emptyDescription="لا توجد أنظمة تقنية مسجلة ضمن هذا القطاع."
      />
    </Box>
  );
};

export default RedSeaItSystemsPage;