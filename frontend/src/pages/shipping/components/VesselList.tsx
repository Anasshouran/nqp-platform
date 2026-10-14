/**
 * السفن — typed vessels registry (Port Health).
 *
 * Rebuilt on the typed `portHealth.ts` layer.
 * DataTable + status filter + search + detail dialog. Read-only.
 */
import { useMemo, useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import {
  PageHeader,
  DataTable,
  StatusChip,
} from '../../../components/uikit';
import type { DataTableColumn, DataTableFilterDef, StatusTone } from '../../../components/uikit';
import { useServerTable } from '../../../hooks/useServerTable';
import { getVessels } from '../../../api/endpoints/portHealth';
import type { Vessel } from '../../../types/portHealth';

const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  EXPECTED: { label: 'متوقعة', tone: 'info' },
  ARRIVED: { label: 'وصلت', tone: 'info' },
  INSPECTED: { label: 'فُحصت', tone: 'info' },
  CLEARED: { label: 'أُفرج عنها', tone: 'success' },
  QUARANTINED: { label: 'محجورة', tone: 'warning' },
  DEPARTED: { label: 'غادرت', tone: 'success' },
  DEFAULT: { label: 'غير معروف', tone: 'neutral' },
};

const TYPE_META: Record<string, string> = {
  COMMERCIAL: 'تجارية',
  PASSENGER: 'ركاب',
  TANKER: 'ناقلة نفط',
  CONTAINER: 'حاويات',
  FISHING: 'صيد',
  OTHER: 'أخرى',
};

const STATUS_OPTIONS = ['EXPECTED', 'ARRIVED', 'INSPECTED', 'CLEARED', 'QUARANTINED', 'DEPARTED'].map((value) => ({
  value,
  label: STATUS_META[value]?.label ?? value,
}));

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left' }}>{value || '—'}</Typography>
  </Stack>
);

export const VesselList = () => {
  const table = useServerTable<Vessel>({ fetchData: getVessels });
  const {
    rows, count, loading, error, refresh,
    page, rowsPerPage, pageSizeOptions, setPage, setRowsPerPage,
    searchInput, setSearchInput, setFilter,
  } = table;

  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState<Vessel | null>(null);

  const columns: DataTableColumn<Vessel>[] = useMemo(
    () => [
      {
        key: 'vessel',
        label: 'السفينة',
        render: (v) => (
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{v.vessel_name || '—'}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {v.imo_number || '—'}
            </Typography>
          </Box>
        ),
      },
      {
        key: 'company',
        label: 'الشركة',
        render: (v) => v.company_name || v.shipping_company || v.company || '—',
        hideOnMobile: true,
      },
      {
        key: 'vessel_type',
        label: 'النوع',
        render: (v) => (TYPE_META[v.vessel_type] ?? v.vessel_type) || '—',
        hideOnMobile: true,
      },
      {
        key: 'flag_state',
        label: 'جنسية العلم',
        render: (v) => v.flag_state || '—',
        hideOnMobile: true,
      },
      {
        key: 'gross_tonnage',
        label: 'حمولة إجمالية',
        render: (v) => (v.gross_tonnage ?? '—'),
        hideOnMobile: true,
      },
      {
        key: 'last_port_of_call',
        label: 'آخر ميناء',
        render: (v) => v.last_port_of_call || '—',
        hideOnMobile: true,
      },
      {
        key: 'status',
        label: 'الحالة',
        render: (v) => {
          const meta = STATUS_META[v.status] ?? STATUS_META.DEFAULT;
          return <StatusChip label={meta.label} tone={meta.tone} />;
        },
      },
    ],
    [],
  );

  const filters: DataTableFilterDef[] = [
    {
      key: 'status',
      label: 'الحالة',
      options: STATUS_OPTIONS,
      value: status,
      onChange: (value) => {
        setStatus(value);
        setFilter('status', value);
      },
    },
  ];

  const renderActions = (v: Vessel) => (
    <Button size="small" variant="text" onClick={() => setDetail(v)}>
      عرض
    </Button>
  );

  return (
    <Box>
      <PageHeader
        eyebrow="الشحن البحري"
        title="السفن"
        subtitle="سجل السفن المسجلة في النظام"
      />
      <DataTable<Vessel>
        columns={columns}
        rows={rows}
        rowKey={(v) => v.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="السفن"
        subtitle={`${count} سفينة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="ابحث باسم السفينة أو رقم IMO..."
        filters={filters}
        actions={renderActions}
        actionsLabel="عرض"
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد سفن"
        emptyDescription="السفن المسجلة تظهر هنا"
      />

      {/* Detail */}
      <Dialog open={detail !== null} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل السفينة</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={1.25}>
              <Row label="اسم السفينة" value={detail.vessel_name} />
              <Row label="IMO" value={detail.imo_number} />
              <Row label="جنسية العلم" value={detail.flag_state} />
              <Row
                label="الشركة المالكة"
                value={detail.company_name || detail.shipping_company || detail.company}
              />
              <Row label="نوع السفينة" value={TYPE_META[detail.vessel_type] ?? detail.vessel_type} />
              <Row label="الحمولة الإجمالية" value={detail.gross_tonnage ?? '—'} />
              <Row label="آخر ميناء" value={detail.last_port_of_call} />
              <Row label="تاريخ الوصول" value={detail.arrival_date} />
              <Row label="تاريخ المغادرة" value={detail.departure_date} />
              <Row
                label="الحالة"
                value={(
                  <StatusChip
                    label={STATUS_META[detail.status]?.label ?? detail.status}
                    tone={STATUS_META[detail.status]?.tone ?? 'neutral'}
                  />
                )}
              />
              <Row label="ملاحظات" value={detail.notes} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VesselList;