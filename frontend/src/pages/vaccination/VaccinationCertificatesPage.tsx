import { useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PrintIcon from '@mui/icons-material/Print';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BlockIcon from '@mui/icons-material/Block';
import PersonIcon from '@mui/icons-material/Person';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { getCertificateQr, getCertificates, revokeCertificate } from '../../api/endpoints/vaccination';
import type { VaccinationCertificate } from '../../types/vaccination';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';

const statusMeta: Record<string, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  ACTIVE: { label: 'سارية', tone: 'success' },
  EXPIRED: { label: 'منتهية', tone: 'warning' },
  REVOKED: { label: 'ملغاة', tone: 'error' },
};

const printCertificate = (cert: VaccinationCertificate, qrPng?: string) => {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.write(`<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>شهادة تطعيم دولية - ${cert.certificate_number}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 32px; color: #102822; }
  .sheet { max-width: 720px; margin: 0 auto; border: 3px solid #0c7f6a; border-radius: 16px; padding: 40px; }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #0c7f6a; padding-bottom: 16px; margin-bottom: 24px; }
  h1 { font-size: 22px; color: #0c7f6a; margin: 0; }
  h2 { font-size: 17px; margin: 8px 0 0; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e3e8e6; font-size: 15px; }
  .row b { font-weight: 800; }
  .foot { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; }
  .qr { text-align: center; }
  .qr img { width: 140px; height: 140px; }
  .verify { font-size: 12px; color: #5e6b67; text-align: center; margin-top: 6px; }
  .stamp { border: 2px solid #0c7f6a; border-radius: 12px; padding: 10px 18px; color: #0c7f6a; font-weight: 800; }
</style>
</head>
<body>
<div class="sheet">
  <div class="head">
    <div>
      <h1>وزارة الصحة الاتحادية - بوابة التطعيم الدولي</h1>
      <h2>شهادة التطعيم الدولية (International Vaccination Certificate)</h2>
    </div>
    <div class="stamp">${statusMeta[cert.status]?.label || cert.status}</div>
  </div>
  <div class="row"><span>رقم الشهادة</span><b>${cert.certificate_number}</b></div>
  <div class="row"><span>اسم حامل الشهادة</span><b>${cert.traveler?.full_name || '—'}</b></div>
  <div class="row"><span>جواز السفر</span><b>${cert.traveler?.passport_number || '—'}</b></div>
  <div class="row"><span>اللقاح</span><b>${cert.vaccine_name_ar || '—'}</b></div>
  <div class="row"><span>رمز اللقاح</span><b>${cert.vaccine_code || '—'}</b></div>
  <div class="row"><span>الجهة المصدرة</span><b>بوابة التطعيم الدولي</b></div>
  <div class="row"><span>تاريخ الإصدار</span><b>${formatDateTime(cert.issued_at)}</b></div>
  <div class="row"><span>صالحة حتى</span><b>${formatDate(cert.valid_until)}</b></div>
  <div class="foot">
    <div>
      <div class="qr">
        ${qrPng ? `<img src="data:image/png;base64,${qrPng}" alt="QR" />` : ''}
        <div class="verify">للتحقق: ${typeof window !== 'undefined' ? window.location.origin : ''}${cert.verification_path || ''}</div>
      </div>
    </div>
    <div style="text-align:left">
      <div style="font-weight:800">المصدر</div>
      <div>${cert.issued_by_name || '—'}</div>
    </div>
  </div>
</div>
</body>
</html>`);
  win.document.close();
  win.focus();
  win.onload = () => {
    win.print();
  };
};

type CertDetail = VaccinationCertificate & { qr_png?: string };

const VaccinationCertificatesPage = () => {
  const table = useServerTable<VaccinationCertificate>({ fetchData: getCertificates });
  const {
    rows, count, loading, error,
    searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter,
  } = table;

  const [viewTarget, setViewTarget] = useState<CertDetail | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<VaccinationCertificate | null>(null);
  const [revoking, setRevoking] = useState(false);

  const openView = async (c: VaccinationCertificate) => {
    setViewTarget(c);
    setQrLoading(true);
    try {
      const res = await getCertificateQr(c.id);
      setViewTarget((v) => (v ? { ...v, qr_png: res.data.data.qr_png } : v));
    } catch {
      /* QR غير متاح */
    } finally {
      setQrLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget || revoking) return;
    setRevoking(true);
    try {
      await revokeCertificate(revokeTarget.id);
      notifySuccess('تم إلغاء الشهادة');
      setRevokeTarget(null);
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر إلغاء الشهادة'));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <>
      <PageHeader
        title="شهادات التطعيم الدولية"
        subtitle="إصدار الشهادات وإدارة التحقق منها وطباعة رمز QR"
        eyebrow="بوابة التطعيم الدولي"
      />
      <DataTable<VaccinationCertificate>
        columns={[
          {
            key: 'certificate_number',
            label: 'رقم الشهادة',
            render: (v) => <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{v.certificate_number}</Typography>,
          },
          {
            key: 'traveler',
            label: 'المسافر',
            render: (v) => (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2.5,
                    display: 'grid',
                    placeItems: 'center',
                    color: 'secondary.main',
                    bgcolor: 'secondary.light',
                    flexShrink: 0,
                  }}
                >
                  <PersonIcon fontSize="small" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>
                    {v.traveler?.full_name || '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {v.traveler?.passport_number || ''}
                  </Typography>
                </Box>
              </Stack>
            ),
          },
          {
            key: 'vaccine_name_ar',
            label: 'اللقاح',
            render: (v) => (
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                {v.vaccine_name_ar || '—'}
                {v.vaccine_code ? ` (${v.vaccine_code})` : ''}
              </Typography>
            ),
          },
          {
            key: 'status',
            label: 'الحالة',
            render: (v) => {
              const m = statusMeta[v.status];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : v.status;
            },
          },
          {
            key: 'issued_at',
            label: 'الإصدار',
            sortable: true,
            render: (v) => formatDateTime(v.issued_at),
          },
          {
            key: 'valid_until',
            label: 'صالحة حتى',
            hideOnMobile: true,
            render: (v) => formatDate(v.valid_until),
          },
        ]}
        rows={rows}
        rowKey={(v) => v.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="الشهادات"
        subtitle={`${count} شهادة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث برقم الشهادة أو الجواز أو الاسم..."
        filters={[
          {
            key: 'status',
            label: 'الحالة',
            options: Object.entries(statusMeta).map(([v, m]) => ({ value: v, label: m.label })),
            value: '',
            onChange: (v) => setFilter('status', v),
          },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد شهادات"
        emptyDescription="تُصدر الشهادات من سجل الجرعات بعد اكتمال الجرعات."
        actions={(v) => (
          <>
            <Tooltip title="عرض الشهادة">
              <IconButton
                aria-label="عرض الشهادة"
                size="small"
                color="primary"
                onClick={() => openView(v)}
                sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {v.status === 'ACTIVE' && (
              <Tooltip title="إلغاء الشهادة">
                <IconButton
                  aria-label="إلغاء الشهادة"
                  size="small"
                  color="error"
                  onClick={() => setRevokeTarget(v)}
                  sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}
                >
                  <BlockIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      />

      <Dialog open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} maxWidth="sm" fullWidth>
        {viewTarget && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>الشهادة {viewTarget.certificate_number}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Chip
                    icon={viewTarget.status === 'ACTIVE' ? <VerifiedUserIcon /> : <BlockIcon />}
                    label={statusMeta[viewTarget.status]?.label || viewTarget.status}
                    color={viewTarget.status === 'ACTIVE' ? 'success' : viewTarget.status === 'EXPIRED' ? 'warning' : 'error'}
                    sx={{ fontWeight: 700 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    أصدرها {viewTarget.issued_by_name || '—'} · {formatDateTime(viewTarget.issued_at)}
                  </Typography>
                </Stack>
                <Divider />
                <Typography variant="body2">
                  حامل الشهادة: <b>{viewTarget.traveler?.full_name}</b> ({viewTarget.traveler?.passport_number || '—'})
                </Typography>
                <Typography variant="body2">
                  اللقاح: <b>{viewTarget.vaccine_name_ar}</b> ({viewTarget.vaccine_code || '—'})
                </Typography>
                <Typography variant="body2">
                  صالحة حتى: <b>{formatDate(viewTarget.valid_until)}</b>
                </Typography>
                {qrLoading ? (
                  <Stack alignItems="center" sx={{ py: 2 }}>
                    <CircularProgress size={28} />
                  </Stack>
                ) : viewTarget.qr_png ? (
                  <Stack alignItems="center" spacing={0.5}>
                    <img
                      src={`data:image/png;base64,${viewTarget.qr_png}`}
                      alt="رمز التحقق"
                      width={150}
                      height={150}
                      style={{ borderRadius: 12, border: '1px solid #dfe5e2' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      تحقق: {window.location.origin}{viewTarget.verification_path || ''}
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setViewTarget(null)} sx={{ fontWeight: 700 }}>إغلاق</Button>
              {viewTarget.status === 'ACTIVE' && (
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  onClick={() => printCertificate(viewTarget, viewTarget.qr_png)}
                  sx={{ fontWeight: 700 }}
                >
                  طباعة
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={Boolean(revokeTarget)} onClose={() => setRevokeTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إلغاء الشهادة</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            هل أنت متأكد من إلغاء الشهادة «{revokeTarget?.certificate_number}»؟ لن تكون صالحة بعد الآن لفقد صلاحية التحقق.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRevokeTarget(null)} sx={{ fontWeight: 700 }}>تراجع</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={revoking ? <CircularProgress size={16} color="inherit" /> : <BlockIcon />}
            onClick={handleRevoke}
            disabled={revoking}
            sx={{ fontWeight: 700 }}
          >
            تأكيد الإلغاء
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VaccinationCertificatesPage;