/**
 * الوكلاء الملاحيون — typed shipping agents registry.
 *
 * Rebuilt on the typed `shipping.ts` layer.
 * DataTable + status/type/active filters + search + detail dialog. Read-only.
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
import { getAgents } from '../../../api/endpoints/shipping';
import type { ShippingAgent } from '../../../api/endpoints/shipping';

const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'قيد المراجعة', tone: 'warning' },
  ACTIVE: { label: 'نشط', tone: 'success' },
  SUSPENDED: { label: 'موقوف', tone: 'warning' },
  REVOKED: { label: 'ملغى', tone: 'error' },
  EXPIRED: { label: 'منتهي', tone: 'neutral' },
  DEFAULT: { label: 'غير معروف', tone: 'neutral' },
};

const TYPE_META: Record<string, string> = {
  PORT_AGENT: 'وكيل ميناء',
  SHIP_AGENT: 'وكيل سفينة',
  CARGO_AGENT: 'وكيل شحن',
  MANNING_AGENT: 'وكيل طاقم',
  PROTECTING_AGENT: 'وكيل حماية',
};

const STATUS_OPTIONS = ['PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED'].map((value) => ({
  value,
  label: STATUS_META[value]?.label ?? value,
}));

const TYPE_OPTIONS = ['PORT_AGENT', 'SHIP_AGENT', 'CARGO_AGENT', 'MANNING_AGENT', 'PROTECTING_AGENT'].map((value) => ({
  value,
  label: TYPE_META[value] ?? value,
}));

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'نشط' },
  { value: 'false', label: 'غير نشط' },
];

const activeLabel = (value: boolean) => (value ? 'نشط' : 'غير نشط');

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left' }}>{value || '—'}</Typography>
  </Stack>
);

export const AgentManagement = () => {
  const table = useServerTable<ShippingAgent>({ fetchData: getAgents });
  const {
    rows, count, loading, error, refresh,
    page, rowsPerPage, pageSizeOptions, setPage, setRowsPerPage,
    searchInput, setSearchInput, setFilter,
  } = table;

  const [status, setStatus] = useState('');
  const [agentType, setAgentType] = useState('');
  const [active, setActive] = useState('');
  const [detail, setDetail] = useState<ShippingAgent | null>(null);

  const columns: DataTableColumn<ShippingAgent>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'الاسم',
        render: (a) => (
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{a.name || '—'}</Typography>
            <Typography variant="caption" color="text.secondary">{a.name_en || '—'}</Typography>
          </Box>
        ),
      },
      {
        key: 'company_name',
        label: 'الشركة',
        render: (a) => a.company_name || '—',
        hideOnMobile: true,
      },
      {
        key: 'agent_type',
        label: 'النوع',
        render: (a) => (TYPE_META[a.agent_type] ?? a.agent_type) || '—',
        hideOnMobile: true,
      },
      {
        key: 'license_number',
        label: 'رقم الترخيص',
        render: (a) => a.license_number || '—',
        hideOnMobile: true,
      },
      {
        key: 'email',
        label: 'البريد الإلكتروني',
        render: (a) => a.email || '—',
        hideOnMobile: true,
      },
      {
        key: 'phone',
        label: 'الهاتف',
        render: (a) => a.phone || '—',
        hideOnMobile: true,
      },
      {
        key: 'status',
        label: 'الحالة',
        render: (a) => {
          const meta = STATUS_META[a.status] ?? STATUS_META.DEFAULT;
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
    {
      key: 'agent_type',
      label: 'النوع',
      options: TYPE_OPTIONS,
      value: agentType,
      onChange: (value) => {
        setAgentType(value);
        setFilter('agent_type', value);
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

  const renderActions = (a: ShippingAgent) => (
    <Button size="small" variant="text" onClick={() => setDetail(a)}>
      عرض
    </Button>
  );

  return (
    <Box>
      <PageHeader
        eyebrow="الشحن البحري"
        title="الوكلاء الملاحيون"
        subtitle="سجل الوكلاء الملاحيين المعتمدين"
      />
      <DataTable<ShippingAgent>
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="الوكلاء الملاحيون"
        subtitle={`${count} وكيل`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="ابحث بالاسم أو رقم الترخيص..."
        filters={filters}
        actions={renderActions}
        actionsLabel="عرض"
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا يوجد وكلاء"
        emptyDescription="الوكلاء الملاحيون المسجلون يظهرون هنا"
      />

      {/* Detail */}
      <Dialog open={detail !== null} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل الوكيل</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={1.25}>
              <Row label="الاسم" value={detail.name} />
              <Row label="الاسم بالإنجليزية" value={detail.name_en} />
              <Row label="الشركة" value={detail.company_name} />
              <Row label="نوع الوكيل" value={TYPE_META[detail.agent_type] ?? detail.agent_type} />
              <Row label="رقم الترخيص" value={detail.license_number} />
              <Row label="جهة الاتصال" value={detail.contact_name} />
              <Row label="البريد الإلكتروني" value={detail.email} />
              <Row label="الهاتف" value={detail.phone} />
              <Row label="العنوان" value={detail.address} />
              <Row
                label="الحالة"
                value={(
                  <StatusChip
                    label={STATUS_META[detail.status]?.label ?? detail.status}
                    tone={STATUS_META[detail.status]?.tone ?? 'neutral'}
                  />
                )}
              />
              <Row label="ساري من" value={detail.valid_from} />
              <Row label="ساري حتى" value={detail.valid_until} />
              <Row label="المنافذ المصرح بها" value={detail.ports_count} />
              <Row label="المستخدم المرتبط" value={detail.user_email} />
              <Row label="مفعّل" value={activeLabel(detail.is_active)} />
              <Row label="صالح" value={detail.is_valid ? 'نعم' : 'لا'} />
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

export default AgentManagement;