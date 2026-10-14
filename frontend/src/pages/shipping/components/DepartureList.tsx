/**
 * المغادرات — vessel departures (Port Health visits filtered to DEPARTED).
 *
 * Mirrors `VesselVisitList` but is read-only and pinned to `status=DEPARTED`
 * (server-side filter). DataTable + detail dialog.
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
import {
  PageHeader,
  DataTable,
  StatusChip,
} from '../../../components/uikit';
import type { DataTableColumn, StatusTone } from '../../../components/uikit';
import { useServerTable } from '../../../hooks/useServerTable';
import { getVesselVisits } from '../../../api/endpoints/portHealth';
import type { VesselVisit } from '../../../types/portHealth';

const STATUS_META: Record<string, { label: string; tone: StatusTone }> = {
  SCHEDULED: { label: 'مجدولة', tone: 'info' },
  ARRIVED: { label: 'وصلت', tone: 'info' },
  IN_PORT: { label: 'في الميناء', tone: 'info' },
  DEPARTED: { label: 'غادرت', tone: 'success' },
  CANCELLED: { label: 'ملغاة', tone: 'neutral' },
  DEFAULT: { label: 'غير معروف', tone: 'neutral' },
};

const statusMeta = (status: string) => STATUS_META[status] ?? STATUS_META.DEFAULT;

/** Pins `status=DEPARTED` on every request (server-side filter). */
const fetchDepartures = (params: Record<string, unknown>) =>
  getVesselVisits({ ...params, status: 'DEPARTED' });

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left' }}>{value || '—'}</Typography>
  </Stack>
);

export const DepartureList = () => {
  const table = useServerTable<VesselVisit>({ fetchData: fetchDepartures });
  const {
    rows, count, loading, error, refresh,
    page, rowsPerPage, pageSizeOptions, setPage, setRowsPerPage,
    searchInput, setSearchInput,
  } = table;

  const [detail, setDetail] = useState<VesselVisit | null>(null);

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
      { key: 'departure_date', label: 'تاريخ المغادرة', render: (v) => v.departure_date || '—' },
      {
        key: 'status',
        label: 'الحالة',
        render: (v) => {
          const meta = statusMeta(v.status);
          return <StatusChip label={meta.label} tone={meta.tone} />;
        },
      },
    ],
    [],
  );

  const renderActions = (v: VesselVisit) => (
    <Tooltip title="عرض">
      <IconButton size="small" aria-label="عرض" onClick={() => setDetail(v)}>
        <VisibilityIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  );

  return (
    <Box>
      <PageHeader
        eyebrow="الشحن البحري"
        title="المغادرات"
        subtitle="سجل مغادرات السفن من الموانئ البحرية"
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
        title="المغادرات"
        subtitle={`${count} مغادرة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="ابحث بالسفينة أو رقم IMO أو الميناء..."
        actions={renderActions}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد مغادرات"
        emptyDescription="مغادرات السفن تظهر هنا"
      />

      {/* Detail */}
      <Dialog open={detail !== null} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل المغادرة</DialogTitle>
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
                    label={statusMeta(detail.status).label}
                    tone={statusMeta(detail.status).tone}
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

export default DepartureList;