import { useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { useServerTable } from '../../hooks/useServerTable';
import { useAuth } from '../../hooks/useAuth';
import type { AuthUser } from '../../api/endpoints/auth';
import { getCertificateQr, getCertificates, revokeCertificate } from '../../api/endpoints/clinic';
import type { HealthCertificate } from '../../types/clinic';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { escapeHtml, escapeHtmlOr } from '../../utils/escapeHtml';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';
import { PassportChip, PersonAvatar } from './ui';

const certTypeKeys: Record<string, string> = {
  CLEARANCE: 'clinic.visitDetail.certificate.type.clearance',
  NEGATIVE: 'clinic.visitDetail.certificate.type.negative',
  MEDICAL: 'clinic.visitDetail.certificate.type.medical',
};

const verdictKeys: Record<string, string> = {
  RELEASE: 'clinic.visitDetail.certificate.verdict.release',
  HOSPITAL: 'clinic.visitDetail.certificate.verdict.hospital',
  ISOLATION: 'clinic.visitDetail.certificate.verdict.isolation',
};

type CertDetail = HealthCertificate & { qr_png?: string };

const printCertificate = (cert: CertDetail, qrPng: string | undefined, orgName: string | undefined, t: (key: string) => string) => {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  const qr = qrPng || cert.qr_png || '';
  const typeKey = certTypeKeys[cert.certificate_type];
  const typeLabel = typeKey ? t(typeKey) : cert.certificate_type;
  const verdictKey = verdictKeys[cert.verdict];
  const verdictLabel = verdictKey ? t(verdictKey) : cert.verdict;
  win.document.write(`<!doctype html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title>${t('clinic.certificates.print.titlePrefix')}${escapeHtml(cert.certificate_number)}</title>
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
      <h1>${escapeHtml(orgName || t('clinic.certificates.print.orgFallback'))} ${t('clinic.certificates.print.h1Suffix')}</h1>
      <h2>${t('clinic.certificates.print.h2')}</h2>
    </div>
    <div class="stamp">${cert.status === 'ACTIVE' ? t('clinic.visitDetail.certificate.status.active') : t('clinic.visitDetail.certificate.status.revoked')}</div>
  </div>
  <div class="row"><span>${t('clinic.certificates.print.rows.no')}</span><b>${escapeHtml(cert.certificate_number)}</b></div>
  <div class="row"><span>${t('clinic.certificates.print.rows.type')}</span><b>${escapeHtml(typeLabel)}</b></div>
  <div class="row"><span>${t('clinic.certificates.print.rows.holder')}</span><b>${escapeHtmlOr(cert.traveler_name)}</b></div>
  <div class="row"><span>${t('clinic.clinic.cols.passport')}</span><b>${escapeHtmlOr(cert.passport_number)}</b></div>
  <div class="row"><span>${t('clinic.certificates.print.rows.verdict')}</span><b>${escapeHtml(verdictLabel)}</b></div>
  <div class="row"><span>${t('clinic.certificates.print.rows.content')}</span><b>${escapeHtmlOr(cert.decision)}</b></div>
  <div class="row"><span>${t('clinic.certificates.print.rows.issuer')}</span><b>${escapeHtmlOr(cert.clinic_name)}</b></div>
  <div class="row"><span>${t('clinic.certificates.print.rows.issuedAt')}</span><b>${escapeHtml(formatDateTime(cert.issued_at))}</b></div>
  <div class="row"><span>${t('clinic.certificates.print.rows.validUntil')}</span><b>${cert.valid_until ? escapeHtml(formatDate(cert.valid_until)) : '—'}</b></div>
  <div class="foot">
    <div>
      <div class="qr">
        ${qr ? `<img src="data:image/png;base64,${escapeHtml(qr)}" alt="${t('clinic.certificates.print.qrAlt')}" />` : ''}
        <div class="verify">${t('clinic.certificates.print.verifyPrefix')}${typeof window !== 'undefined' ? window.location.origin : ''}${escapeHtml(cert.verification_path || '')}</div>
      </div>
    </div>
    <div style="text-align:left">
      <div style="font-weight:800">${t('clinic.clinic.cols.doctor')}</div>
      <div>${escapeHtmlOr(cert.issued_by_name)}</div>
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
  const { t } = useTranslation();
  const { user } = useAuth();
  const certTypeMeta = useMemo<Record<string, { label: string; tone: 'primary' | 'info' | 'neutral' }>>(
    () => ({
      CLEARANCE: { label: t('clinic.visitDetail.certificate.type.clearance'), tone: 'primary' },
      NEGATIVE: { label: t('clinic.visitDetail.certificate.type.negative'), tone: 'info' },
      MEDICAL: { label: t('clinic.visitDetail.certificate.type.medical'), tone: 'neutral' },
    }),
    [t]
  );
  const certStatusMeta = useMemo<Record<string, { label: string; tone: 'success' | 'error' }>>(
    () => ({
      ACTIVE: { label: t('clinic.visitDetail.certificate.status.active'), tone: 'success' },
      REVOKED: { label: t('clinic.visitDetail.certificate.status.revoked'), tone: 'error' },
    }),
    [t]
  );
  const verdictMeta = useMemo<Record<string, string>>(
    () => ({
      RELEASE: t('clinic.visitDetail.certificate.verdict.release'),
      HOSPITAL: t('clinic.visitDetail.certificate.verdict.hospital'),
      ISOLATION: t('clinic.visitDetail.certificate.verdict.isolation'),
    }),
    [t]
  );
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
      notifySuccess(t('clinic.certificates.revoke.success'));
      setRevokeTarget(null);
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, t('clinic.certificates.revoke.error')));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('clinic.certificates.header.title')}
        subtitle={t('clinic.certificates.header.subtitle')}
        eyebrow={t('clinic.clinic.header.eyebrow')}
      />
      <DataTable<HealthCertificate>
        columns={[
          {
            key: 'traveler_name',
            label: t('clinic.certificates.cols.traveler'),
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
            label: t('clinic.certificates.cols.number'),
            render: (v) => <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>{v.certificate_number}</Typography>,
          },
          {
            key: 'certificate_type',
            label: t('clinic.certificates.cols.type'),
            hideOnMobile: true,
            render: (v) => {
              const m = certTypeMeta[v.certificate_type];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : v.certificate_type;
            },
          },
          {
            key: 'status',
            label: t('clinic.certificates.cols.status'),
            render: (v) => {
              const m = certStatusMeta[v.status];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : v.status;
            },
          },
          {
            key: 'issued_at',
            label: t('clinic.certificates.cols.issuedAt'),
            sortable: true,
            render: (v) => formatDateTime(v.issued_at),
          },
          {
            key: 'valid_until',
            label: t('clinic.certificates.cols.validUntil'),
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
        title={t('clinic.certificates.table.title')}
        subtitle={t('clinic.certificates.table.subtitle', { count })}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder={t('clinic.certificates.table.searchPlaceholder')}
        filters={[
          {
            key: 'status',
            label: t('clinic.certificates.filters.status'),
            options: Object.entries(certStatusMeta).map(([v, m]) => ({ value: v, label: m.label })),
            value: '',
            onChange: (v) => setFilter('status', v),
          },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle={t('clinic.certificates.table.emptyTitle')}
        emptyDescription={t('clinic.certificates.table.emptyDescription')}
        actions={(v) => (
          <>
            <Tooltip title={t('clinic.certificates.action.view')}>
              <IconButton
                aria-label={t('clinic.certificates.action.ariaView')}
                size="small"
                color="primary"
                onClick={() => openView(v)}
                sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {v.status === 'ACTIVE' && (
              <Tooltip title={t('clinic.certificates.action.revoke')}>
                <IconButton
                  aria-label={t('clinic.certificates.action.ariaRevoke')}
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
            <DialogTitle sx={{ fontWeight: 700 }}>{t('clinic.certificates.view.title', { number: viewTarget.certificate_number })}</DialogTitle>
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
                    {t('clinic.certificates.view.issuedBy', { clinic: viewTarget.clinic_name || '—', at: formatDateTime(viewTarget.issued_at) })}
                  </Typography>
                </Stack>
                <Divider />
                <Typography variant="body2">
                  {t('clinic.certificates.view.holderPrefix')}<b>{viewTarget.traveler_name}</b> ({viewTarget.passport_number || '—'})
                </Typography>
                <Typography variant="body2">
                  {t('clinic.certificates.view.typePrefix')}<b>{certTypeMeta[viewTarget.certificate_type]?.label || viewTarget.certificate_type}</b>
                </Typography>
                <Typography variant="body2">
                  {t('clinic.certificates.view.verdictPrefix')}<b>{verdictMeta[viewTarget.verdict] || viewTarget.verdict}</b>
                </Typography>
                {viewTarget.decision && <Typography variant="body2">{t('clinic.certificates.view.contentPrefix')}{viewTarget.decision}</Typography>}
                {viewTarget.valid_until && (
                  <Typography variant="body2">{t('clinic.certificates.view.validUntilPrefix')}<b>{formatDate(viewTarget.valid_until)}</b></Typography>
                )}
                {qrLoading ? (
                  <Stack alignItems="center" sx={{ py: 2 }}>
                    <CircularProgress size={28} />
                  </Stack>
                ) : viewTarget.qr_png ? (
                  <Stack alignItems="center" spacing={0.5}>
                    <img
                      src={`data:image/png;base64,${viewTarget.qr_png}`}
                      alt={t('clinic.certificates.view.qrAlt')}
                      width={150}
                      height={150}
                      style={{ borderRadius: 12, border: '1px solid #dfe5e2' }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {t('clinic.certificates.view.verifyPrefix')}{window.location.origin}{viewTarget.verification_path || ''}
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setViewTarget(null)} sx={{ fontWeight: 700 }}>{t('clinic.common.close')}</Button>
              {viewTarget.status === 'ACTIVE' && (
                <Button
                  variant="contained"
                  startIcon={<PrintIcon />}
                  onClick={() => printCertificate(viewTarget, viewTarget.qr_png, (user as AuthUser | null)?.organization_name ?? undefined, t)}
                  sx={{ fontWeight: 700 }}
                >
                  {t('clinic.certificates.action.print')}
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={Boolean(revokeTarget)} onClose={() => setRevokeTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('clinic.certificates.revoke.dialogTitle')}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            {t('clinic.certificates.revoke.confirmMessage', { number: revokeTarget?.certificate_number })}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRevokeTarget(null)} sx={{ fontWeight: 700 }}>{t('clinic.certificates.revoke.cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={revoking ? <CircularProgress size={16} color="inherit" /> : <BlockIcon />}
            onClick={handleRevoke}
            disabled={revoking}
            sx={{ fontWeight: 700 }}
          >
            {t('clinic.certificates.revoke.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CertificatesPage;