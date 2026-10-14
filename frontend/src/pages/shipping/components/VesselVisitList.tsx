/**
 * زيارات السفن — typed Port Health vessel visits.
 *
 * Rebuilt on the typed `portHealth.ts` / `shipping.ts` layer.
 * DataTable + status filter + detail dialog + depart action gated by status.
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
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import {
  PageHeader,
  DataTable,
  StatusChip,
  FormTextField,
  ConfirmDialog,
} from '../../../components/uikit';
import type { DataTableColumn, DataTableFilterDef, StatusTone } from '../../../components/uikit';
import { useServerTable } from '../../../hooks/useServerTable';
import { getVesselVisits } from '../../../api/endpoints/portHealth';
import { departVessel } from '../../../api/endpoints/shipping';
import type { VesselVisit } from '../../../types/portHealth';
import { notifyError, notifySuccess } from '../../../utils/toast';

const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  SCHEDULED: { label: 'مجدولة', tone: 'info' },
  ARRIVED: { label: 'وصلت', tone: 'info' },
  IN_PORT: { label: 'في الميناء', tone: 'info' },
  DEPARTED: { label: 'مغادرة', tone: 'success' },
  CANCELLED: { label: 'ملغاة', tone: 'neutral' },
  DEFAULT: { label: 'غير معروف', tone: 'neutral' },
};

const STATUS_OPTIONS = ['SCHEDULED', 'ARRIVED', 'IN_PORT', 'DEPARTED', 'CANCELLED'].map((value) => ({
  value,
  label: STATUS_META[value]?.label ?? value,
}));

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left' }}>{value || '—'}</Typography>
  </Stack>
);

export const VesselVisitList = () => {
  const table = useServerTable<VesselVisit>({ fetchData: getVesselVisits });
  const {
    rows, count, loading, error, refresh,
    page, rowsPerPage, pageSizeOptions, setPage, setRowsPerPage,
    searchInput, setSearchInput, setFilter,
  } = table;

  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState<VesselVisit | null>(null);
  const [departOpen, setDepartOpen] = useState(false);
  const [departing, setDeparting] = useState(false);
  const [departNotes, setDepartNotes] = useState('');

  const columns: DataTableColumn<VesselVisit>[] = useMemo(
    () => [
      {
        key: 'vessel',
        label: 'السفينة',
        render: (v) => (
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{v.vessel_name || '—'}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {v.vessel_imo || '—'}
            </Typography>
          </Box>
        ),
      },
      { key: 'port', label: 'الميناء', render: (v) => v.port_name || v.port || '—', hideOnMobile: true },
      { key: 'berth_code', label: 'المرسى', render: (v) => v.berth_code || v.berth || '—', hideOnMobile: true },
      { key: 'arrival_date', label: 'تاريخ الوصول', render: (v) => v.arrival_date || '—' },
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

  const openDepart = (v: VesselVisit) => {
    if (v.status === 'DEPARTED' || v.status === 'CANCELLED') return;
    setDetail(v);
    setDepartNotes('');
    setDepartOpen(true);
  };

  const handleDepart = async () => {
    if (!detail) return;
    setDeparting(true);
    try {
      await departVessel(detail.id, departNotes || undefined);
      notifySuccess('تم تسجيل مغادرة السفينة');
      setDepartOpen(false);
      refresh();
    } catch {
      notifyError('تعذر تسجيل المغادرة');
    } finally {
      setDeparting(false);
    }
  };

  const renderActions = (v: VesselVisit) => (
    <>
      <Tooltip title="عرض">
        <IconButton size="small" aria-label="عرض" onClick={() => setDetail(v)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {v.status !== 'DEPARTED' && v.status !== 'CANCELLED' && (
        <Tooltip title="مغادرة">
          <IconButton
            size="small"
            color="primary"
            aria-label="مغادرة"
            onClick={() => openDepart(v)}
          >
            <FlightTakeoffIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </>
  );

  return (
    <Box>
      <PageHeader
        eyebrow="الشحن البحري"
        title="زيارات السفن"
        subtitle="إدارة زيارات السفن وحالاتها في الموانئ البحرية"
      />
      <DataTable<VesselVisit>
        columns={columns}
        rows={rows}
        rowKey={(v) => v.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="زيارات السفن"
        subtitle={`${count} زيارة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="ابحث بالسفينة أو رقم IMO أو الميناء..."
        filters={filters}
        actions={renderActions}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد زيارات"
        emptyDescription="زيارات السفن الجديدة تظهر هنا"
      />

      {/* Departure confirmation */}
      <ConfirmDialog
        open={departOpen}
        onClose={() => setDepartOpen(false)}
        onConfirm={handleDepart}
        loading={departing}
        title="تسجيل مغادرة السفينة"
        message={detail ? `هل تريد تسجيل مغادرة "${detail.vessel_name}" من ${detail.port_name}؟` : ''}
        confirmLabel="تأكيد المغادرة"
        cancelLabel="إلغاء"
      >
        <FormTextField
          label="ملاحظات المغادرة"
          multiline
          minRows={2}
          value={departNotes}
          onChange={(e) => setDepartNotes(e.target.value)}
          placeholder="ملاحظات إضافية (اختياري)"
        />
      </ConfirmDialog>

      {/* Detail */}
      <Dialog open={detail !== null && !departOpen} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل الزيارة</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={1.25}>
              <Row label="السفينة" value={detail.vessel_name} />
              <Row label="IMO" value={detail.vessel_imo} />
              <Row label="الميناء" value={detail.port_name || detail.port} />
              <Row label="المرسى" value={detail.berth_code || detail.berth} />
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

export default VesselVisitList;