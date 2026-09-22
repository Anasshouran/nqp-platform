import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import CircularProgress from '@mui/material/CircularProgress';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ScienceIcon from '@mui/icons-material/Science';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import HistoryIcon from '@mui/icons-material/History';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import {
  getTravelers,
  getTravelerQr,
  getTraveler,
  getTravelerStatus,
  getTravelerTimeline,
  type TravelerStatusResult,
  type TravelerStatusLog,
} from '../../api/endpoints/travelers';
import type { Traveler } from '../../types/traveler';
import { travelerStatus } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';

const statusOptions = Object.entries(travelerStatus).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const TravelersPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [qrTraveler, setQrTraveler] = useState<Traveler | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [actionAnchor, setActionAnchor] = useState<HTMLElement | null>(null);
  const [actionTraveler, setActionTraveler] = useState<Traveler | null>(null);
  const [file, setFile] = useState<{
    traveler: Traveler;
    status?: TravelerStatusResult;
    timeline?: TravelerStatusLog[];
    loading: boolean;
  } | null>(null);

  const table = useServerTable<Traveler>({ fetchData: getTravelers });

  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const searchFilter = searchParams.get('search');
  useEffect(() => {
    if (searchFilter) {
      setSearchInput(searchFilter);
    }
  }, [searchFilter, setSearchInput]);

  const handleQr = async (traveler: Traveler) => {
    setQrTraveler(traveler);
    setQrImage(null);
    setQrLoading(true);
    try {
      const response = await getTravelerQr(traveler.id);
      setQrImage(response.data.data.qr_code);
    } catch {
      setQrImage(null);
    } finally {
      setQrLoading(false);
    }
  };

  const openFile = async (traveler: Traveler) => {
    setFile({ traveler, loading: true });
    const [detail, status, timeline] = await Promise.allSettled([
      getTraveler(traveler.id),
      getTravelerStatus(traveler.id),
      getTravelerTimeline(traveler.id),
    ]);
    setFile({
      traveler: detail.status === 'fulfilled' ? detail.value.data.data : traveler,
      status: status.status === 'fulfilled' ? status.value.data.data : undefined,
      timeline: timeline.status === 'fulfilled' ? timeline.value.data.data : undefined,
      loading: false,
    });
  };

  const closeActions = () => {
    setActionAnchor(null);
    setActionTraveler(null);
  };

  const runAction = (fn: (traveler: Traveler) => void) => {
    const traveler = actionTraveler;
    closeActions();
    if (traveler) fn(traveler);
  };

  const linkTo = (path: string) => () => navigate(path);

  const handleExport = () => exportAll({
    filename: `travelers-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['رقم الجواز', 'الاسم', 'الجنسية', 'الجوال', 'البريد', 'الحالة', 'تاريخ التسجيل'],
    mapRow: (t) => [
      t.passport_number,
      t.full_name,
      t.nationality,
      t.phone,
      t.email,
      travelerStatus[t.registration_status]?.label || t.registration_status,
      formatDateTime(t.created_at),
    ],
    message: 'تم تصدير المسافرين',
  });

  return (
    <Box>
      <PageHeader
        title="المسافرون"
        subtitle="إدارة تسجيلات المسافرين والمستندات وحالات التسجيل"
        eyebrow="العمليات"
      />

      <DataTable<Traveler>
        columns={[
          {
            key: 'full_name',
            label: 'الاسم',
            sortable: true,
            render: (t) => (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 700, fontSize: 14 }}>
                  {t.full_name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {t.full_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" dir="ltr">
                    {t.passport_number}
                  </Typography>
                </Box>
              </Box>
            ),
          },
          { key: 'nationality', label: 'الجنسية', render: (t) => t.nationality || '—', hideOnMobile: true },
          { key: 'phone', label: 'الجوال', render: (t) => t.phone || '—', hideOnMobile: true },
          { key: 'email', label: 'البريد', render: (t) => t.email || '—', hideOnMobile: true },
          {
            key: 'registration_status',
            label: 'الحالة',
            sortable: true,
            render: (t) => {
              const meta = travelerStatus[t.registration_status];
              return meta ? <StatusChip label={meta.label} tone={meta.tone} /> : <StatusChip label={t.registration_status} tone="neutral" />;
            },
          },
          {
            key: 'created_at',
            label: 'تاريخ التسجيل',
            sortable: true,
            render: (t) => formatDateTime(t.created_at),
            hideOnMobile: true,
          },
        ]}
        rows={rows}
        rowKey={(t) => t.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="قائمة المسافرين"
        subtitle={`${count} مسافر`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث برقم الجواز أو الاسم..."
        filters={[
          {
            key: 'registration_status',
            label: 'الحالة',
            options: statusOptions,
            value: '',
            onChange: (v) => setFilter('registration_status', v),
          },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={handleExport}
        exporting={exporting}
        onRefresh={refresh}
        emptyTitle="لا يوجد مسافرون"
        emptyDescription="التسجيلات تظهر هنا بعد قيام المسافر بالتسجيل المسبق"
        actions={(t) => (
          <Tooltip title="إجراءات المسافر">
            <IconButton
              aria-label="إجراءات المسافر"
              size="small"
              onClick={(e) => {
                setActionTraveler(t);
                setActionAnchor(e.currentTarget);
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      />

      <Menu
        anchorEl={actionAnchor}
        open={Boolean(actionAnchor)}
        onClose={closeActions}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, minWidth: 210 } } }}
      >
        <MenuItem onClick={() => runAction(handleQr)} sx={{ gap: 1.5 }}>
          <QrCode2Icon fontSize="small" color="primary" /> عرض رمز QR
        </MenuItem>
        <MenuItem onClick={() => runAction(openFile)} sx={{ gap: 1.5 }}>
          <HistoryIcon fontSize="small" color="primary" /> ملف المسافر وسجل الحالة
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => runAction((t) => linkTo(`/app/screening?search=${encodeURIComponent(t.passport_number)}`)())}
          sx={{ gap: 1.5 }}
        >
          <FactCheckIcon fontSize="small" /> الفحص الصحي
        </MenuItem>
        <MenuItem onClick={() => runAction((t) => linkTo(`/app/laboratory?search=${encodeURIComponent(t.passport_number)}`)())} sx={{ gap: 1.5 }}>
          <ScienceIcon fontSize="small" /> المختبر
        </MenuItem>
        <MenuItem onClick={() => runAction((t) => linkTo(`/app/clinic?tab=referrals&search=${encodeURIComponent(t.passport_number)}`)())} sx={{ gap: 1.5 }}>
          <LocalHospitalIcon fontSize="small" /> العيادة (سجل الإحالات)
        </MenuItem>
      </Menu>

      <Dialog open={Boolean(qrTraveler)} onClose={() => setQrTraveler(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>رمز QR للمسافر</DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pb: 4 }}>
          {qrTraveler && (
            <>
              <Typography variant="body1" sx={{ fontWeight: 700, mb: 0.5 }}>
                {qrTraveler.full_name}
              </Typography>
              <Typography variant="caption" color="text.secondary" dir="ltr">
                {qrTraveler.passport_number}
              </Typography>
            </>
          )}
          <Box
            sx={{
              mt: 2,
              mx: 'auto',
              width: 220,
              height: 220,
              display: 'grid',
              placeItems: 'center',
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 3,
              bgcolor: 'primary.lighter',
            }}
          >
            {qrLoading ? (
              <Typography color="text.secondary">جارٍ التوليد...</Typography>
            ) : qrImage ? (
              <img src={qrImage} alt="QR" width={200} height={200} style={{ borderRadius: 8 }} />
            ) : (
              <Typography color="error.main" sx={{ fontWeight: 700 }}>
                تعذر إنشاء الرمز
              </Typography>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(file)} onClose={() => setFile(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <HistoryIcon color="primary" />
          ملف المسافر وسجل الحالة
        </DialogTitle>
        <DialogContent>
          {file && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Avatar sx={{ width: 44, height: 44, bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 700 }}>
                  {file.traveler.full_name.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {file.traveler.full_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" dir="ltr">
                    {file.traveler.passport_number} • {file.traveler.nationality || '—'}
                  </Typography>
                </Box>
                {(() => {
                  const meta = travelerStatus[file.status?.registration_status ?? file.traveler.registration_status];
                  return meta ? <StatusChip label={meta.label} tone={meta.tone} /> : <StatusChip label={file.traveler.registration_status} tone="neutral" />;
                })()}
              </Box>

              {file.status?.action_required && (
                <Typography variant="body2" color="warning.main" sx={{ fontWeight: 700, mb: 2 }}>
                  يتطلب هذا الطلب إجراءً من فريق المراجعة
                </Typography>
              )}

              {file.loading ? (
                <Box sx={{ display: 'grid', placeItems: 'center', py: 5 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : file.timeline && file.timeline.length > 0 ? (
                <Box sx={{ position: 'relative', pt: 1 }}>
                  {file.timeline.map((log, i) => {
                    const meta = travelerStatus[log.to_status];
                    return (
                      <Box key={log.id} sx={{ display: 'flex', gap: 2, pb: 2, position: 'relative' }}>
                        {i < file.timeline!.length - 1 && (
                          <Box sx={{ position: 'absolute', insetInlineStart: 5, top: 18, bottom: 0, width: 1, bgcolor: 'divider' }} />
                        )}
                        <Box sx={{ width: 11, height: 11, mt: 1, borderRadius: '50%', bgcolor: 'primary.main', zIndex: 1 }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {meta?.label || log.to_status}
                          </Typography>
                          {log.note && (
                            <Typography variant="caption" color="text.secondary">
                              {log.note}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.disabled" display="block">
                            {formatDateTime(log.created_at)}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  لا يوجد سجل حالة بعد
                </Typography>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TravelersPage;
