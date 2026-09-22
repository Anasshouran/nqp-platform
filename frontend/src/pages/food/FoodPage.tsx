import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { getShipments } from '../../api/endpoints/food';
import type { FoodShipment } from '../../types/food';
import { portType, shipmentStatus, shipmentType } from '../../utils/status';
import { formatDate } from '../../utils/formatters';

const shipmentTypeOptions = Object.entries(shipmentType).map(([value, meta]) => ({ value, label: meta.label }));
const statusOptions = Object.entries(shipmentStatus).map(([value, meta]) => ({ value, label: meta.label }));
const portTypeOptions = Object.entries(portType).map(([value, meta]) => ({ value, label: meta.label }));

const FoodPage = () => {
  const navigate = useNavigate();
  const table = useServerTable<FoodShipment>({ fetchData: getShipments });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const handleExport = () => exportAll({
    filename: `shipments-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['رقم البيان', 'المورد', 'بلد المنشأ', 'المنفذ', 'النوع', 'تاريخ الوصول', 'الحالة'],
    mapRow: (s) => [
      s.manifest_number,
      s.supplier_name,
      s.origin_country,
      s.port,
      shipmentType[s.shipment_type]?.label || s.shipment_type,
      formatDate(s.arrival_date),
      shipmentStatus[s.status]?.label || s.status,
    ],
    message: 'تم تصدير الشحنات',
  });

  return (
    <Box>
      <PageHeader
        title="الرقابة الغذائية"
        subtitle="إدارة شحنات المواد الغذائية المستوردة والمصدرة"
        eyebrow="العمليات"
      />

      <DataTable<FoodShipment>
        columns={[
          { key: 'manifest_number', label: 'رقم البيان', render: (s) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{s.manifest_number}</Typography> },
          { key: 'supplier_name', label: 'المورد', render: (s) => <Typography sx={{ fontWeight: 700 }}>{s.supplier_name}</Typography> },
          { key: 'origin_country', label: 'بلد المنشأ', hideOnMobile: true },
          { key: 'port', label: 'المنفذ', hideOnMobile: true, render: (s) => { const p = portType[s.port_type]; return <Stack direction="row" spacing={0.5} alignItems="center">{p ? <StatusChip label={p.label} tone={p.tone} /> : null}<span>{s.port_name || s.port}</span></Stack>; } },
          { key: 'shipment_type', label: 'النوع', render: (s) => { const m = shipmentType[s.shipment_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : s.shipment_type; } },
          { key: 'arrival_date', label: 'تاريخ الوصول', sortable: true, render: (s) => formatDate(s.arrival_date), hideOnMobile: true },
          { key: 'status', label: 'الحالة', sortable: true, render: (s) => { const m = shipmentStatus[s.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={s.status} tone="neutral" />; } },
        ]}
        rows={rows}
        rowKey={(s) => s.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="الشحنات"
        subtitle={`${count} شحنة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث برقم البيان أو اسم المورد..."
        filters={[
          { key: 'port_type', label: 'نوع المنفذ', options: portTypeOptions, value: '', onChange: (v) => setFilter('port_type', v) },
          { key: 'shipment_type', label: 'النوع', options: shipmentTypeOptions, value: '', onChange: (v) => setFilter('shipment_type', v) },
          { key: 'status', label: 'الحالة', options: statusOptions, value: '', onChange: (v) => setFilter('status', v) },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={handleExport}
        exporting={exporting}
        onRefresh={refresh}
        actionsLabel="متابعة"
        actions={(s) => (
          <Tooltip title="فتح دورة حياة الشحنة">
            <Button size="small" variant="text" startIcon={<VisibilityIcon />} onClick={() => navigate(`/app/food/shipments/${s.id}`)}>
              التفاصيل
            </Button>
          </Tooltip>
        )}
        emptyTitle="لا توجد شحنات"
        emptyDescription="شحنات المواد الغذائية تظهر هنا عند تسجيلها"
      />
    </Box>
  );
};

export default FoodPage;
