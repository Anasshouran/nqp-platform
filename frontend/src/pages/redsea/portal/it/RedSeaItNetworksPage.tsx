import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SyncIcon from '@mui/icons-material/Sync';
import { PageHeader, DataTable, StatusChip, AppButton } from '../../../../components/uikit';
import { useServerTable } from '../../../../hooks/useServerTable';
import { getItNetworks, syncItNetworks } from '../../../../api/endpoints/it';
import type { NetworkStatus } from '../../../../types/it';

const formatDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const RedSeaItNetworksPage = () => {
  const navigate = useNavigate();
  const table = useServerTable<NetworkStatus>({ fetchData: getItNetworks });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    syncItNetworks()
      .finally(() => {
        setSyncing(false);
        refresh();
      });
  };

  return (
    <Box>
      <PageHeader
        eyebrow="قسم تقنية المعلومات"
        title="الشبكات والاتصال"
        subtitle="حالة اتصال كل نقطة دخول وزمن الاستجابة وآخر مزامنة."
        action={
          <AppButton size="small" startIcon={<SyncIcon />} onClick={handleSync} loading={syncing}>
            مزامنة الحالة
          </AppButton>
        }
      />
        <Box sx={{ mb: 2 }}>
          <AppButton startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/sector/red-sea/it')} variant="ghost">
            لوحة تقنية المعلومات
          </AppButton>
        </Box>
      <DataTable<NetworkStatus>
        columns={[
          {
            key: 'entry_point_name',
            label: 'نقطة الدخول',
            sortable: true,
            render: (n) => (
              <Stack spacing={0.25}>
                <Typography sx={{ fontWeight: 700 }}>{n.entry_point_name}</Typography>
                <Typography variant="caption" color="text.secondary">{n.entry_point_code}</Typography>
              </Stack>
            ),
          },
          {
            key: 'connected',
            label: 'الحالة',
            render: (n) => (n.connected
              ? <StatusChip label="متصل" tone="success" />
              : <StatusChip label="منقطع" tone="error" />),
          },
          {
            key: 'ping_ms',
            label: 'زمن الاستجابة',
            sortable: true,
            hideOnMobile: true,
            render: (n) => (n.connected ? `${n.ping_ms} ms` : '—'),
          },
          {
            key: 'last_sync',
            label: 'آخر مزامنة',
            sortable: true,
            hideOnMobile: true,
            render: (n) => formatDate(n.last_sync),
          },
        ]}
        rows={rows}
        rowKey={(n) => n.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="حالة الشبكات"
        subtitle={`${count} نقطة دخول · ${rows.filter((r) => r.connected).length} متصلة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث باسم نقطة الدخول..."
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد شبكات"
        emptyDescription="لا توجد نقاط دخول مسجلة ضمن هذا القطاع."
      />
    </Box>
  );
};

export default RedSeaItNetworksPage;