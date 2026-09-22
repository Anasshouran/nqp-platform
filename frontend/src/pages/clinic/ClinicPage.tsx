import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { PageHeader } from '../../components/common';
import { ConfirmDialog, DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { acceptReferral, closeVisit, getClinicVisits, getReferrals, rejectReferral } from '../../api/endpoints/clinic';
import type { ClinicReferral, ClinicVisit } from '../../types/clinic';
import { referralStatus, visitStatus } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../utils/toast';
import { PassportChip, PersonAvatar } from './ui';

const referralStatusOptions = Object.entries(referralStatus).map(([v, m]) => ({ value: v, label: m.label }));
const visitStatusOptions = Object.entries(visitStatus).map(([v, m]) => ({ value: v, label: m.label }));

const phaseLabels: Record<string, { label: string; color: string }> = {
  REGISTERED: { label: 'مسجلة', color: '#8a8f98' },
  TRIAGED: { label: 'تم الفرز', color: '#b7791f' },
  EXAMINED: { label: 'فحص طبي', color: '#0c7f6a' },
  LABORATORY: { label: 'مختبر', color: '#2f6dd0' },
  DECISION: { label: 'القرار', color: '#7b4fb3' },
  CERTIFICATE: { label: 'الشهادة', color: '#0e7490' },
  CLOSED: { label: 'مغلقة', color: '#c63a3a' },
};

const AvatarCell = ({ name, passport }: { name?: string; passport?: string }) => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <PersonAvatar name={name} size={38} />
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 14 }} noWrap>
        {name || '—'}
      </Typography>
      <PassportChip number={passport} />
    </Box>
  </Stack>
);

const ReferralsTab = () => {
  const navigate = useNavigate();
  const table = useServerTable<ClinicReferral>({ fetchData: getReferrals });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const [acceptTarget, setAcceptTarget] = useState<ClinicReferral | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ClinicReferral | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!acceptTarget || submitting) return;
    setSubmitting(true);
    try {
      const res = await acceptReferral(acceptTarget.id);
      notifySuccess('تم قبول الإحالة وفتح زيارة جديدة');
      setAcceptTarget(null);
      navigate(`/app/clinic/visits/${res.data.data.id}`);
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر قبول الإحالة'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || submitting) return;
    setSubmitting(true);
    try {
      await rejectReferral(rejectTarget.id, rejectReason.trim() ? { notes: rejectReason.trim() } : {});
      notifySuccess('تم رفض الإحالة');
      setRejectTarget(null);
      setRejectReason('');
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر رفض الإحالة'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () =>
    exportAll({
      filename: `clinic-referrals-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ['المسافر', 'جواز السفر', 'المنفذ', 'الحالة', 'تاريخ الإنشاء'],
      mapRow: (r: ClinicReferral) => [
        r.traveler_name || '',
        r.passport_number || '',
        r.port_name || '',
        referralStatus[r.status]?.label || r.status,
        formatDateTime(r.created_at),
      ],
      message: 'تم تصدير الإحالات',
    });

  return (
    <>
      <DataTable<ClinicReferral>
        columns={[
          {
            key: 'traveler_name',
            label: 'المسافر',
            render: (r) => <AvatarCell name={r.traveler_name} passport={r.passport_number} />,
          },
          { key: 'port_name', label: 'المنفذ', render: (r) => r.port_name || '—', hideOnMobile: true, noWrap: false },
          {
            key: 'status',
            label: 'الحالة',
            sortable: true,
            render: (r) => {
              const m = referralStatus[r.status];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={r.status} tone="neutral" />;
            },
          },
          {
            key: 'created_at',
            label: 'تاريخ الإنشاء',
            sortable: true,
            render: (r) => formatDateTime(r.created_at),
            hideOnMobile: true,
          },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="إحالات العيادة"
        subtitle={`${count} إحالة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالاسم أو جواز السفر..."
        filters={[
          { key: 'status', label: 'الحالة', options: referralStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={handleExport}
        exporting={exporting}
        onRefresh={refresh}
        emptyTitle="لا توجد إحالات"
        emptyDescription="إحالات العيادة من الفحوصات تظهر هنا"
        actions={(r) => {
          if (r.status !== 'PENDING') return null;
          return (
            <>
              <Tooltip title="قبول الإحالة">
                <IconButton
                  aria-label="قبول الإحالة"
                  size="small"
                  color="success"
                  onClick={() => setAcceptTarget(r)}
                  sx={{ bgcolor: 'success.light', '&:hover': { bgcolor: 'success.main', color: '#fff' } }}
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="رفض الإحالة">
                <IconButton
                  aria-label="رفض الإحالة"
                  size="small"
                  color="error"
                  onClick={() => { setRejectReason(''); setRejectTarget(r); }}
                  sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          );
        }}
      />

      <ConfirmDialog
        open={Boolean(acceptTarget)}
        tone="success"
        title="قبول الإحالة"
        message={acceptTarget ? `سيتم قبول إحالة «${acceptTarget.traveler_name}» وفتح زيارة عيادة جديدة للمسافر.` : ''}
        confirmLabel="قبول الإحالة"
        loading={submitting}
        onConfirm={handleAccept}
        onClose={() => setAcceptTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        tone="error"
        title="رفض الإحالة"
        message={rejectTarget ? `سيتم رفض إحالة «${rejectTarget.traveler_name}». يمكنك إضافة سبب الرفض.` : ''}
        confirmLabel="تأكيد الرفض"
        loading={submitting}
        onConfirm={handleReject}
        onClose={() => { setRejectTarget(null); setRejectReason(''); }}
      >
        <TextField
          label="سبب الرفض (اختياري)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          size="small"
          sx={{ mt: 2 }}
          disabled={submitting}
        />
      </ConfirmDialog>
    </>
  );
};

const VisitsTab = () => {
  const navigate = useNavigate();
  const table = useServerTable<ClinicVisit>({ fetchData: getClinicVisits });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  const [closeTarget, setCloseTarget] = useState<ClinicVisit | null>(null);
  const [closing, setClosing] = useState(false);

  const handleClose = async () => {
    if (!closeTarget || closing) return;
    setClosing(true);
    try {
      await closeVisit(closeTarget.id);
      notifySuccess('تم إغلاق الزيارة');
      setCloseTarget(null);
      refresh();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'تعذر إغلاق الزيارة'));
    } finally {
      setClosing(false);
    }
  };

  return (
    <>
      <DataTable<ClinicVisit>
        columns={[
          {
            key: 'traveler_name',
            label: 'المسافر',
            render: (v) => <AvatarCell name={v.traveler_name} passport={v.passport_number} />,
          },
          { key: 'doctor_name', label: 'الطبيب', render: (v) => v.doctor_name || '—', hideOnMobile: true },
          {
            key: 'visit_status',
            label: 'الحالة',
            render: (v) => {
              const m = visitStatus[v.visit_status];
              return m ? <StatusChip label={m.label} tone={m.tone} /> : v.visit_status;
            },
          },
          {
            key: 'phase',
            label: 'المرحلة',
            hideOnMobile: true,
            render: (v) => {
              const meta = phaseLabels[v.phase ?? ''];
              return meta ? (
                <Chip size="small" label={meta.label} sx={{ fontWeight: 700, bgcolor: `${meta.color}1a`, color: meta.color }} />
              ) : (
                (v.phase ?? '—')
              );
            },
          },
          { key: 'opened_at', label: 'وقت الفتح', sortable: true, render: (v) => formatDateTime(v.opened_at), hideOnMobile: true },
        ]}
        rows={rows}
        rowKey={(v) => v.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="زيارات العيادة"
        subtitle={`${count} زيارة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالاسم أو جواز السفر..."
        filters={[
          { key: 'visit_status', label: 'الحالة', options: visitStatusOptions, value: '', onChange: (v) => setFilter('visit_status', v) },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد زيارات"
        emptyDescription="الزيارات تظهر عند قبول الإحالات"
        actions={(v) => (
          <>
            <Tooltip title="فتح الزيارة">
              <IconButton
                aria-label="عرض"
                size="small"
                color="primary"
                onClick={() => navigate(`/app/clinic/visits/${v.id}`)}
                sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: '#fff' } }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {v.visit_status === 'OPEN' && (
              <Tooltip title="إغلاق الزيارة">
                <IconButton
                  aria-label="قفل"
                  size="small"
                  color="error"
                  onClick={() => setCloseTarget(v)}
                  sx={{ bgcolor: 'error.light', '&:hover': { bgcolor: 'error.main', color: '#fff' } }}
                >
                  <LockIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}
      />

      <ConfirmDialog
        open={Boolean(closeTarget)}
        tone="error"
        title="إغلاق الزيارة"
        message={closeTarget ? `هل أنت متأكد من إغلاق زيارة «${closeTarget.traveler_name}»؟ سيتم توثيق الإغلاق في السجل الطبي ولا يمكن التراجع.` : ''}
        confirmLabel="إغلاق الزيارة"
        loading={closing}
        onConfirm={handleClose}
        onClose={() => setCloseTarget(null)}
      />
    </>
  );
};

const ClinicPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'visits' ? 1 : 0;

  const handleTabChange = (_: React.SyntheticEvent, value: number) => {
    const params = new URLSearchParams(searchParams);
    if (value === 1) params.set('tab', 'visits');
    else params.set('tab', 'referrals');
    setSearchParams(params, { replace: true });
  };

  return (
    <Box>
      <PageHeader
        title="العيادة"
        subtitle="إدارة إحالات وزيارات العيادات الطبية بسلاسة"
        eyebrow="العمليات"
      />
      <Tabs
        value={tab}
        onChange={handleTabChange}
        sx={{
          mb: 3,
          '& .MuiTab-root': { borderRadius: 3, minHeight: 48, fontWeight: 700 },
          '& .MuiTabs-indicator': { height: 3, borderRadius: '999px' },
        }}
      >
        <Tab icon={<ReceiptLongIcon />} iconPosition="start" label="إحالات العيادة" />
        <Tab icon={<MedicalServicesIcon />} iconPosition="start" label="زيارات العيادة" />
      </Tabs>
      {tab === 0 ? <ReferralsTab /> : <VisitsTab />}
    </Box>
  );
};

export default ClinicPage;