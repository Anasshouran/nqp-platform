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
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { useAuth } from '../../hooks/useAuth';
import type { AuthUser } from '../../api/endpoints/auth';
import { getCertificateQr, getCertificates, revokeCertificate } from '../../api/endpoints/clinic';
import type { HealthCertificate } from '../../types/clinic';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';
import { PassportChip, PersonAvatar } from './ui';

const certTypeMeta: Record<string, { label: string; tone: 'primary' | 'info' | 'neutral' }> = {
  CLEARANCE: { label: 'شهادة خلو من الأمراض', tone: 'primary' },
  NEGATIVE: { label: 'شهادة نتيجة سلبية', tone: 'info' },
  MEDICAL: { label: 'تقرير طبي', tone: 'neutral' },
};

const certStatusMeta: Record<string, { label: string; tone: 'success' | 'error' }> = {
  ACTIVE: { label: 'سارية', tone: 'success' },
  REVOKED: { label: 'ملغاة', tone: 'error' },
};

const verdictMeta: Record<string, string> = {
  RELEASE: 'خروج/إجازة',
  HOSPITAL: 'تحويل للمستشفى',
  ISOLATION: 'عزل/حجر صحي',
};

type CertDetail = HealthCertificate & { qr_png?: string };

const printCertificate = (cert: CertDetail, qrPng?: string, orgName?: string) => {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  const qr = qrPng || cert.qr_png || '';
  win.document.write(`<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>شهادة صحية - ${cert.certificate_number}</title>
<style>
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 32px; color: #102822; }
  .sheet { max-width: 720px; margin: 0 auto; border: 3px solid #0e7490; border-radius: 16px; padding: 40px; }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #0e7490; padding-bottom: 16px; margin-bottom: 24px; }
  h1 { font-size: 22px; color: #0e7490; margin: 0; }
  h2 { font-size: 17px; margin: 8px 0 0; }
  .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e3e8e6; font-size: 15px; }
  .row b { font-weight: 800; }
  .foot { display: flex; justify-content: space-between; align-items: center; margin-top: 32px; }
  .qr { text-align: center; }
  .qr img { width: 140px; height: 140px; }
  .verify { font-size: 12px; color: #5e6b67; text-align: center; margin-top: 6px; }
  .stamp { border: 2px solid #0e7490; border-radius: 12px; padding: 10px 18px; color: #0e7490; font-weight: 800; }
</style>
</head>
<body>
<div class="sheet">
  <div class="head">
    <div>
      <h1>${orgName || 'وزارة الصحة الاتحادية'} - الحجر الصحي</h1>
      <h2>شهادة صحية</h2>
    </div>
    <div class="stamp">${cert.status === 'ACTIVE' ? 'سارية' : 'ملغاة'}</div>
  </div>
  <div class="row"><span>رقم الشهادة</span><b>${cert.certificate_number}</b></div>
  <div class="row"><span>نوع الشهادة</span><b>${certTypeMeta[cert.certificate_type]?.label || cert.certificate_type}</b></div>
  <div class="row"><span>اسم حامل الشهادة</span><b>${cert.traveler_name || '—'}</b></div>
  <div class="row"><span>جواز السفر</span><b>${cert.passport_number || '—'}</b></div>
  <div class="row"><span>التوصية النهائية</span><b>${verdictMeta[cert.verdict] || cert.verdict}</b></div>
  <div class="row"><span>المضمون</span><b>${cert.decision || '—'}</b></div>
  <div class="row"><span>الجهة المصدرة</span><b>${cert.clinic_name || '—'}</b></div>
  <div class="row"><span>تاريخ الإصدار</span><b>${formatDateTime(cert.issued_at)}</b></div>
  <div class="row"><span>صالحة حتى</span><b>${cert.valid_until ? formatDate(cert.valid_until) : '—'}</b></div>
  <div class="foot">
    <div>
      <div class="qr">
        ${qr ? `<img src="data:image/png;base64,${qr}" alt="QR" />` : ''}
        <div class="verify">للتحقق: ${typeof window !== 'undefined' ? window.location.origin : ''}${cert.verification_path || ''}</div>
      </div>
    </div>
    <div style="text-align:left">
      <div style="font-weight:800">الطبيب</div>
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

const CertificatesPage = () => {
  const { user } = useAuth();
  const table = useServerTable<HealthCertificate>({ fetchData: getCertificates });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const [viewTarget, setViewTarget] = useState<CertDetail | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<HealthCertificate | null>(null);
  const [revoking, setRevoking] = useState(false);

  const openView = async (c: HealthCertificate) => {
    setViewTarget(c);
    setQrLoading(true);
    try {
      const res = await getCertificateQr(c.id);
      setViewTarget((v) => (v ? { ...v, qr_png: res.data.data.qr_png } : v));
    } catch {
      /* QR unavailable */
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
        title="الشهادات الصحية"
        subtitle="الشهادات الصحية الصادرة عن عيادات الحجر الصحي وإدارة التحقق منها"
        eyebrow="العمليات"
      />
      <DataTable<HealthCertificate>
        columns={[
          {
            key: 'traveler_name',
            label: 'المسافر',
            render: (v) => (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <PersonAvatar name={v.traveler_name} size={38} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>
                    {v.traveler_name || '—'}
                  </Typography>
                  <PassportChip number={v.passport_number} />
                </Box>
              </Stack>
            ),
          },
          {
            key: 'certificate_number',
            label: 'الرقم',
            render: (v) => <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{v.certificate_number}</Typography>,
          },
          {
            key: 'certificate_type',
            label: 'النوع',
            hideOnMobile: true,
            render: (v) => {
              const m = certTypeMeta[v.certificate_type];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : v.certificate_type;
            },
          },
          {
            key: 'status',
            label: 'الحالة',
            render: (v) => {
              const m = certStatusMeta[v.status];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : v.status;
            },
          },
          {
            key: 'issued_at',
            label: 'تاريخ الإصدار',
            sortable: true,
            render: (v) => formatDateTime(v.issued_at),
          },
          {
            key: 'valid_until',
            label: 'صالحة حتى',
            hideOnMobile: true,
            render: (v) => (v.valid_until ? formatDate(v.valid_until) : '—'),
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
        searchPlaceholder="بحث برقم الشهادة أو الاسم أو الجواز..."
        filters={[
          {
            key: 'status',
            label: 'الحالة',
            options: Object.entries(certStatusMeta).map(([v, m]) => ({ value: v, label: m.label })),
            value: '',
            onChange: (v) => setFilter('status', v),
          },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد شهادات"
        emptyDescription="الشهادات تصدر عند اتخاذ القرار الطبي للزيارات"
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
            <DialogTitle sx={{ fontWeight: 700 }}>الشهادة الصحية {viewTarget.certificate_number}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Chip
                    icon={viewTarget.status === 'ACTIVE' ? <VerifiedUserIcon /> : <BlockIcon />}
                    label={certStatusMeta[viewTarget.status]?.label || viewTarget.status}
                    color={viewTarget.status === 'ACTIVE' ? 'success' : 'error'}
                    sx={{ fontWeight: 700 }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    صادرة عن {viewTarget.clinic_name || '—'} · {formatDateTime(viewTarget.issued_at)}
                  </Typography>
                </Stack>
                <Divider />
                <Typography variant="body2">
                  حامل الشهادة: <b>{viewTarget.traveler_name}</b> ({viewTarget.passport_number || '—'})
                </Typography>
                <Typography variant="body2">
                  النوع: <b>{certTypeMeta[viewTarget.certificate_type]?.label || viewTarget.certificate_type}</b>
                </Typography>
                <Typography variant="body2">
                  التوصية النهائية: <b>{verdictMeta[viewTarget.verdict] || viewTarget.verdict}</b>
                </Typography>
                {viewTarget.decision && <Typography variant="body2">المضمون: {viewTarget.decision}</Typography>}
                {viewTarget.valid_until && (
                  <Typography variant="body2">صالحة حتى: <b>{formatDate(viewTarget.valid_until)}</b></Typography>
                )}
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
                  onClick={() => printCertificate(viewTarget, viewTarget.qr_png, (user as AuthUser | null)?.organization_name ?? undefined)}
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

export default CertificatesPage;