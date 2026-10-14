/**
 * علاقات الشركات بالسفن — typed vessel↔company relationships registry.
 *
 * Built on the typed `shipping.ts` layer. `useServerTable` drives pagination and
 * the exact filters (`role`, `is_active`); this endpoint has no `search_fields`,
 * so text search is applied client-side over the loaded page. Read-only.
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
import { getVesselRelationships } from '../../../api/endpoints/shipping';
import type { VesselRelationship } from '../../../api/endpoints/shipping';

const ROLE_META: Record<string, string> = {
  OWNER: 'مالك',
  OPERATOR: 'مشغل',
  MANAGER: 'مدير',
  CHARTERER: 'مستأجر',
};

const activeTone = (value: boolean): StatusTone => (value ? 'success' : 'neutral');
const activeLabel = (value: boolean) => (value ? 'نشط' : 'غير نشط');

const ROLE_OPTIONS = ['OWNER', 'OPERATOR', 'MANAGER', 'CHARTERER'].map((value) => ({
  value,
  label: ROLE_META[value] ?? value,
}));

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'نشط' },
  { value: 'false', label: 'غير نشط' },
];

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left' }}>{value || '—'}</Typography>
  </Stack>
);

export const VesselRelationships = () => {
  const table = useServerTable<VesselRelationship>({ fetchData: getVesselRelationships });
  const {
    rows, count, loading, error, refresh,
    page, rowsPerPage, pageSizeOptions, setPage, setRowsPerPage, setFilter,
  } = table;

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [detail, setDetail] = useState<VesselRelationship | null>(null);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) =>
      [r.vessel_name, r.vessel_imo, r.company_name]
        .some((field) => (field ?? '').toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const columns: DataTableColumn<VesselRelationship>[] = useMemo(
    () => [
      {
        key: 'vessel',
        label: 'السفينة',
        render: (r) => (
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{r.vessel_name || '—'}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {r.vessel_imo || '—'}
            </Typography>
          </Box>
        ),
      },
      {
        key: 'company_name',
        label: 'الشركة',
        render: (r) => r.company_name || '—',
      },
      {
        key: 'role',
        label: 'نوع العلاقة',
        render: (r) => (
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2">{ROLE_META[r.role] ?? r.role ?? '—'}</Typography>
            {r.is_primary && <StatusChip label="أساسي" tone="info" />}
          </Stack>
        ),
        hideOnMobile: true,
      },
      {
        key: 'valid_from',
        label: 'تاريخ السريان',
        render: (r) => r.valid_from || '—',
        hideOnMobile: true,
      },
      {
        key: 'is_active',
        label: 'الحالة',
        render: (r) => <StatusChip label={activeLabel(r.is_active)} tone={activeTone(r.is_active)} />,
      },
    ],
    [],
  );

  const filters: DataTableFilterDef[] = [
    {
      key: 'role',
      label: 'نوع العلاقة',
      options: ROLE_OPTIONS,
      value: role,
      onChange: (value) => {
        setRole(value);
        setFilter('role', value);
      },
    },
    {
      key: 'is_active',
      label: 'مفعّل',
      options: ACTIVE_OPTIONS,
      value: active,
      onChange: (value) => {
        setActive(value);
        setFilter('is_active', value);
      },
    },
  ];

  const renderActions = (r: VesselRelationship) => (
    <Button size="small" variant="text" onClick={() => setDetail(r)}>
      عرض
    </Button>
  );

  const subtitle = search.trim()
    ? `${visibleRows.length} من ${count} علاقة`
    : `${count} علاقة`;

  return (
    <Box>
      <PageHeader
        eyebrow="الشحن البحري"
        title="علاقات الشركات بالسفن"
        subtitle="سجل روابط الشركات الملاحية بالسفن"
      />
      <DataTable<VesselRelationship>
        columns={columns}
        rows={visibleRows}
        rowKey={(r) => r.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="علاقات الشركات بالسفن"
        subtitle={subtitle}
        searchInput={search}
        onSearchChange={setSearch}
        searchPlaceholder="ابحث باسم السفينة أو الشركة..."
        filters={filters}
        actions={renderActions}
        actionsLabel="عرض"
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد علاقات"
        emptyDescription="علاقات الشركات بالسفن المسجلة تظهر هنا"
      />

      {/* Detail */}
      <Dialog open={detail !== null} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل العلاقة</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={1.25}>
              <Row label="السفينة" value={detail.vessel_name} />
              <Row label="IMO" value={detail.vessel_imo} />
              <Row label="الشركة" value={detail.company_name} />
              <Row label="نوع العلاقة" value={ROLE_META[detail.role] ?? detail.role} />
              <Row label="دور أساسي" value={detail.is_primary ? 'نعم' : 'لا'} />
              <Row label="تاريخ السريان" value={detail.valid_from} />
              <Row label="تاريخ الانتهاء" value={detail.valid_until} />
              <Row
                label="الحالة"
                value={(
                  <StatusChip
                    label={activeLabel(detail.is_active)}
                    tone={activeTone(detail.is_active)}
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

export default VesselRelationships;