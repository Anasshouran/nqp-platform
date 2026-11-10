import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        eyebrow={t('redsea.portal.modules.itNetworks.eyebrow')}
        title={t('redsea.portal.modules.itNetworks.title')}
        subtitle={t('redsea.portal.modules.itNetworks.subtitle')}
        action={
          <AppButton size="small" startIcon={<SyncIcon />} onClick={handleSync} loading={syncing}>
            {t('redsea.portal.modules.itNetworks.syncStatus')}
          </AppButton>
        }
      />
        <Box sx={{ mb: 2 }}>
          <AppButton startIcon={<ArrowBackIcon />} onClick={() => navigate('/dashboard/sector/red-sea/it')} variant="ghost">
            {t('redsea.portal.modules.itNetworks.backToDashboard')}
          </AppButton>
        </Box>
      <DataTable<NetworkStatus>
        columns={[
          {
            key: 'entry_point_name',
            label: t('redsea.portal.modules.itNetworks.columns.entryPoint'),
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
            label: t('redsea.portal.modules.itNetworks.columns.status'),
            render: (n) => (n.connected
              ? <StatusChip label={t('redsea.portal.modules.itNetworks.columns.connected')} tone="success" />
              : <StatusChip label={t('redsea.portal.modules.itNetworks.columns.disconnected')} tone="error" />),
          },
          {
            key: 'ping_ms',
            label: t('redsea.portal.modules.itNetworks.columns.responseTime'),
            sortable: true,
            hideOnMobile: true,
            render: (n) => (n.connected ? `${n.ping_ms} ms` : '—'),
          },
          {
            key: 'last_sync',
            label: t('redsea.portal.modules.itNetworks.columns.lastSync'),
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
        title={t('redsea.portal.modules.itNetworks.tableTitle')}
        subtitle={t('redsea.portal.modules.itNetworks.tableSubtitle', { count, connected: rows.filter((r) => r.connected).length })}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('redsea.portal.modules.itNetworks.searchPlaceholder')}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle={t('redsea.portal.modules.itNetworks.emptyTitle')}
        emptyDescription={t('redsea.portal.modules.itNetworks.emptyDescription')}
      />
    </Box>
  );
};

export default RedSeaItNetworksPage;