/**
 * المستندات — typed carrier documents registry.
 *
 * Built on the typed `carriers.ts` layer (`getCarrierDocuments`).
 * `useServerTable` drives pagination, server-side search and the
 * `document_type` filter. Read-only.
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
} from '../../../components/uikit';
import type { DataTableColumn, DataTableFilterDef } from '../../../components/uikit';
import { useServerTable } from '../../../hooks/useServerTable';
import { getCarrierDocuments } from '../../../api/endpoints/carriers';
import type { CarrierDocument } from '../../../types/carrier';

const TYPE_META: Record<string, string> = {
  AIRCRAFT_DOCUMENT: 'مستند طائرة',
  FLIGHT_DOCUMENT: 'مستند رحلة',
  MANIFEST_DOCUMENT: 'مستند كشف',
  HEALTH_DOCUMENT: 'مستند صحي',
  LICENSE: 'رخصة',
  CERTIFICATE: 'شهادة',
  OTHER: 'أخرى',
};

const TYPE_OPTIONS = Object.keys(TYPE_META).map((value) => ({
  value,
  label: TYPE_META[value] ?? value,
}));

const typeLabel = (d: CarrierDocument) => d.document_type_label || TYPE_META[d.document_type] || d.document_type;

const formatBytes = (bytes?: number) => {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ar-EG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left' }}>{value || '—'}</Typography>
  </Stack>
);

export const DocumentList = () => {
  const table = useServerTable<CarrierDocument>({ fetchData: getCarrierDocuments });
  const {
    rows, count, loading, error, refresh,
    page, rowsPerPage, pageSizeOptions, setPage, setRowsPerPage,
    searchInput, setSearchInput, setFilter,
  } = table;

  const [documentType, setDocumentType] = useState('');
  const [detail, setDetail] = useState<CarrierDocument | null>(null);

  const columns: DataTableColumn<CarrierDocument>[] = useMemo(
    () => [
      {
        key: 'title',
        label: 'المستند',
        render: (d) => (
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{d.title || d.original_filename || '—'}</Typography>
            <Typography variant="caption" color="text.secondary">{d.original_filename || '—'}</Typography>
          </Box>
        ),
      },
      {
        key: 'document_type',
        label: 'النوع',
        render: (d) => typeLabel(d),
      },
      {
        key: 'carrier_name',
        label: 'شركة النقل',
        render: (d) => d.carrier_name || '—',
        hideOnMobile: true,
      },
      {
        key: 'flight_number',
        label: 'الرحلة',
        render: (d) => d.flight_number || '—',
        hideOnMobile: true,
      },
      {
        key: 'file_size',
        label: 'الحجم',
        render: (d) => formatBytes(d.file_size),
        hideOnMobile: true,
      },
      {
        key: 'created_at',
        label: 'تاريخ الرفع',
        render: (d) => formatDate(d.created_at),
        hideOnMobile: true,
      },
    ],
    [],
  );

  const filters: DataTableFilterDef[] = [
    {
      key: 'document_type',
      label: 'النوع',
      options: TYPE_OPTIONS,
      value: documentType,
      onChange: (value) => {
        setDocumentType(value);
        setFilter('document_type', value);
      },
    },
  ];

  const renderActions = (d: CarrierDocument) => (
    <Button size="small" variant="text" onClick={() => setDetail(d)}>
      عرض
    </Button>
  );

  return (
    <Box>
      <PageHeader
        eyebrow="الشحن البحري"
        title="المستندات"
        subtitle="مستندات شركات النقل والرحلات"
      />
      <DataTable<CarrierDocument>
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="المستندات"
        subtitle={`${count} مستند`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="ابحث بالعنوان أو الشركة أو رقم الرحلة..."
        filters={filters}
        actions={renderActions}
        actionsLabel="عرض"
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد مستندات"
        emptyDescription="المستندات المرفوعة تظهر هنا"
      />

      {/* Detail */}
      <Dialog open={detail !== null} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل المستند</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={1.25}>
              <Row label="العنوان" value={detail.title} />
              <Row label="اسم الملف" value={detail.original_filename} />
              <Row label="النوع" value={typeLabel(detail)} />
              <Row label="شركة النقل" value={detail.carrier_name} />
              <Row label="الرحلة" value={detail.flight_number} />
              <Row label="نوع الملف" value={detail.mime_type} />
              <Row label="الحجم" value={formatBytes(detail.file_size)} />
              <Row label="تاريخ الرفع" value={formatDate(detail.created_at)} />
              <Row label="آخر تحديث" value={formatDate(detail.updated_at)} />
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

export default DocumentList;