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
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import PersonIcon from '@mui/icons-material/Person';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { getRecords, issueCertificate } from '../../api/endpoints/vaccination';
import type { VaccinationCertificate, VaccinationRecord } from '../../types/vaccination';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';

const doseTone: Record<string, 'info' | 'primary' | 'neutral' | 'warning'> = {
  FIRST: 'info',
  SECOND: 'primary',
  THIRD: 'neutral',
  BOOSTER: 'warning',
};

const statusMeta: Record<string, { label: string; tone: 'success' | 'error' }> = {
  GIVEN: { label: 'مُعطاة', tone: 'success' },
  CANCELLED: { label: 'ملغاة', tone: 'error' },
};

const VaccinationRecordsPage = () => {
  const table = useServerTable<VaccinationRecord>({ fetchData: getRecords });
  const {
    rows, count, loading, error,
    searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter,
  } = table;

  const [viewTarget, setViewTarget] = useState<(VaccinationRecord & { certificates?: VaccinationCertificate[] }) | null>(null);
  const [issueTarget, setIssueTarget] = useState<VaccinationRecord | null>(null);
  const [issuing, setIssuing] = useState(false);

  const handleIssue = async () => {
    if (!issueTarget || issuing) return;
    setIssuing(true);
    try {
      const res = await issueCertificate(issueTarget.id);
      notifySuccess(`صدرت الشهادة ${res.data.data.certificate_number}`);
      setIssueTarget(null);
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر إصدار الشهادة'));
    } finally {
      setIssuing(false);
    }
  };

  return (
    <>
      <PageHeader
        title="سجل الجرعات"
        subtitle="جميع جرعات التطعيم المسجلة للمسافرين حسب اللقاح والتشغيلة"
        eyebrow="بوابة التطعيم الدولي"
      />
      <DataTable<VaccinationRecord>
        columns={[
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
                    color: 'primary.main',
                    bgcolor: 'primary.light',
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
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{v.vaccine_name_ar}</Typography>
                <Chip size="small" label={v.vaccine_code} color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
              </Stack>
            ),
          },
          {
            key: 'dose_type',
            label: 'الجرعة',
            render: (v) => (
              <StatusChip
                label={v.dose_type_label || v.dose_type}
                tone={doseTone[v.dose_type] || 'info'}
              />
            ),
          },
          {
            key: 'dose_number',
            label: 'رقم الجرعة',
            hideOnMobile: true,
            render: (v) => v.dose_number,
          },
          {
            key: 'lot_number',
            label: 'التشغيلة',
            hideOnMobile: true,
            render: (v) =>
              v.lot_number ? (
                <Typography sx={{ fontFamily: 'monospace', fontSize: 13 }}>{v.lot_number}</Typography>
              ) : (
                '—'
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
            key: 'administered_at',
            label: 'تاريخ التطعيم',
            sortable: true,
            render: (v) => formatDate(v.administered_at),
          },
          {
            key: 'created_at',
            label: 'سُجلت',
            hideOnMobile: true,
            render: (v) => formatDateTime(v.created_at),
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
        title="سجل الجرعات"
        subtitle={`${count} جرعة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالجواز أو الاسم أو اللقاح..."
        filters={[
          {
            key: 'dose_type',
            label: 'نوع الجرعة',
            options: ['FIRST', 'SECOND', 'THIRD', 'BOOSTER'].map((v) => ({
              value: v,
              label: DOSE_LABELS[v] || v,
            })),
            value: '',
            onChange: (v) => setFilter('dose_type', v),
          },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد جرعات"
        emptyDescription="سجّل الجرعات من خلال صفحة تسجيل الجرعة."
        actions={(v) => (
          <>
            <Tooltip title="عرض التفاصيل">
              <IconButton
                aria-label="عرض التفاصيل"
                size="small"
                color="primary"
                onClick={() => setViewTarget(v)}
                sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {v.status === 'GIVEN' && (
              <Tooltip title="إصدار شهادة دولية">
                <IconButton
                  aria-label="إصدار شهادة"
                  size="small"
                  color="secondary"
                  onClick={() => setIssueTarget(v)}
                  sx={{ bgcolor: 'secondary.light', '&:hover': { bgcolor: 'secondary.main', color: '#fff' } }}
                >
                  <WorkspacePremiumIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      />

      <Dialog open={Boolean(viewTarget)} onClose={() => setViewTarget(null)} maxWidth="sm" fullWidth>
        {viewTarget && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل الجرعة</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={1.5}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Chip
                    icon={<PersonIcon />}
                    label={viewTarget.traveler?.full_name || '—'}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 700 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    {viewTarget.traveler?.passport_number}
                  </Typography>
                </Stack>
                <Divider />
                <Typography variant="body2">
                  اللقاح: <b>{viewTarget.vaccine_name_ar}</b> ({viewTarget.vaccine_code})
                </Typography>
                <Typography variant="body2">
                  نوع الجرعة: <b>{viewTarget.dose_type_label || viewTarget.dose_type}</b> · رقم {viewTarget.dose_number}
                </Typography>
                <Typography variant="body2">
                  التشغيلة: <b>{viewTarget.lot_number || '—'}</b>
                </Typography>
                <Typography variant="body2">
                  المكان: <b>{viewTarget.site_name || '—'}</b>
                </Typography>
                <Typography variant="body2">
                  المُطعّم: <b>{viewTarget.vaccinator_name || '—'}</b>
                </Typography>
                <Typography variant="body2">
                  تاريخ التطعيم: <b>{formatDate(viewTarget.administered_at)}</b> · سُجلت {formatDateTime(viewTarget.created_at)}
                </Typography>
                {viewTarget.notes && <Typography variant="body2">ملاحظات: {viewTarget.notes}</Typography>}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setViewTarget(null)} sx={{ fontWeight: 700 }}>إغلاق</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={Boolean(issueTarget)} onClose={() => setIssueTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إصدار شهادة تطعيم دولية</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            سيتم إصدار شهادة دولية لجولة «{issueTarget?.dose_type_label || issueTarget?.dose_type}» من لقاح{' '}
            <b>{issueTarget?.vaccine_name_ar}</b> للمسافر {issueTarget?.traveler?.full_name || ''} وفق مدة الصلاحية
            المحددة للقاح.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIssueTarget(null)} sx={{ fontWeight: 700 }}>تراجع</Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={issuing ? <CircularProgress size={16} color="inherit" /> : <WorkspacePremiumIcon />}
            onClick={handleIssue}
            disabled={issuing}
            sx={{ fontWeight: 700 }}
          >
            تأكيد الإصدار
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const DOSE_LABELS: Record<string, string> = {
  FIRST: 'الجرعة الأولى',
  SECOND: 'الجرعة الثانية',
  THIRD: 'الجرعة الثالثة',
  BOOSTER: 'جرعة تنشيطية',
};

export default VaccinationRecordsPage;