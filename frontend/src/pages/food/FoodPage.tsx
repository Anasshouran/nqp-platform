import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { getShipments } from '../../api/endpoints/food';
import type { FoodShipment } from '../../types/food';
import { portType, shipmentStatus, shipmentType } from '../../utils/status';
import { formatDate } from '../../utils/formatters';

const shipmentTypeOptions = (t: (key: string, opts?: Record<string, string | number>) => string) =>
  Object.entries(shipmentType).map(([value, meta]) => ({ value, label: t(`food.foodPage.shipmentType.${value}`) ?? meta.label }));

const statusOptions = (t: (key: string, opts?: Record<string, string | number>) => string) =>
  Object.entries(shipmentStatus).map(([value, meta]) => ({ value, label: t(`food.foodPage.shipmentStatus.${value}`) ?? meta.label }));

const portTypeOptions = (t: (key: string, opts?: Record<string, string | number>) => string) =>
  Object.entries(portType).map(([value, meta]) => ({ value, label: t(`food.foodPage.portType.${value}`) ?? meta.label }));

const FoodPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const table = useServerTable<FoodShipment>({ fetchData: getShipments });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const handleExport = () => exportAll({
    filename: `shipments-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: [
      t('food.foodPage.headers.manifestNumber'),
      t('food.foodPage.headers.supplier'),
      t('food.foodPage.headers.originCountry'),
      t('food.foodPage.headers.port'),
      t('food.foodPage.headers.shipmentType'),
      t('food.foodPage.headers.arrivalDate'),
      t('food.foodPage.headers.status'),
    ],
    mapRow: (s) => [
      s.manifest_number,
      s.supplier_name,
      s.origin_country,
      s.port,
      shipmentType[s.shipment_type]?.label || s.shipment_type,
      formatDate(s.arrival_date),
      shipmentStatus[s.status]?.label || s.status,
    ],
    message: t('food.foodPage.messages.exported'),
  });

  return (
    <Box>
      <PageHeader
        title={t('food.foodPage.pageHeader.title')}
        subtitle={t('food.foodPage.pageHeader.subtitle')}
        eyebrow={t('food.foodPage.pageHeader.eyebrow')}
      />

      <DataTable<FoodShipment>
        columns={[
          { key: 'manifest_number', label: t('food.foodPage.columns.manifestNumber'), render: (s) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.manifest_number}</Typography> },
          { key: 'supplier_name', label: t('food.foodPage.columns.supplier'), render: (s) => <Typography sx={{ fontWeight: 700 }}>{s.supplier_name}</Typography> },
          { key: 'origin_country', label: t('food.foodPage.columns.originCountry'), hideOnMobile: true },
          { key: 'port', label: t('food.foodPage.columns.port'), hideOnMobile: true, render: (s) => { const p = portType[s.port_type]; return <Stack direction="row" spacing={0.5} alignItems="center">{p ? <StatusChip label={p.label} tone={p.tone} /> : null}<span>{s.port_name || s.port}</span></Stack>; } },
          { key: 'shipment_type', label: t('food.foodPage.columns.shipmentType'), render: (s) => { const m = shipmentType[s.shipment_type]; return m ? <StatusChip label={t(`food.foodPage.shipmentType.${s.shipment_type}`) ?? m.label} tone={m.tone} /> : s.shipment_type; } },
          { key: 'arrival_date', label: t('food.foodPage.columns.arrivalDate'), sortable: true, render: (s) => formatDate(s.arrival_date), hideOnMobile: true },
          { key: 'status', label: t('food.foodPage.columns.status'), sortable: true, render: (s) => { const m = shipmentStatus[s.status]; return m ? <StatusChip label={t(`food.foodPage.shipmentStatus.${s.status}`) ?? m.label} tone={m.tone} /> : <StatusChip label={s.status} tone="neutral" />; } },
        ]}
        rows={rows}
        rowKey={(s) => s.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title={t('food.foodPage.table.title')}
        subtitle={t('food.foodPage.table.subtitle', { count })}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('food.foodPage.searchPlaceholder')}
        filters={[
          { key: 'port_type', label: t('food.foodPage.filters.portType'), options: portTypeOptions(t), value: '', onChange: (v) => setFilter('port_type', v) },
          { key: 'shipment_type', label: t('food.foodPage.filters.shipmentType'), options: shipmentTypeOptions(t), value: '', onChange: (v) => setFilter('shipment_type', v) },
          { key: 'status', label: t('food.foodPage.filters.status'), options: statusOptions(t), value: '', onChange: (v) => setFilter('status', v) },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={handleExport}
        exporting={exporting}
        onRefresh={refresh}
        actionsLabel={t('food.foodPage.actionsLabel')}
        actions={(s) => (
          <Tooltip title={t('food.foodPage.actions.viewDetails')}>
            <Button size="small" variant="text" startIcon={<VisibilityIcon />} onClick={() => navigate(`/app/food/shipments/${s.id}`)}>
              {t('food.foodPage.actions.details')}
            </Button>
          </Tooltip>
        )}
        emptyTitle={t('food.foodPage.emptyTitle')}
        emptyDescription={t('food.foodPage.emptyDescription')}
      />
    </Box>
  );
};

export default FoodPage;
