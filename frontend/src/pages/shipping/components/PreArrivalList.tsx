/**
 * إشعارات ما قبل الوصول — typed maritime pre-arrival notifications.
 *
 * Rebuilt on the typed `api/endpoints/shipping.ts` layer (previously unused).
 * DataTable + status filter + detail dialog + workflow actions gated by
 * `PRE_ARRIVAL_TRANSITIONS`.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import CancelIcon from '@mui/icons-material/Cancel';
import RateReviewIcon from '@mui/icons-material/RateReview';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  PageHeader,
  DataTable,
  StatusChip,
  FormDialog,
  FormSelect,
  FormTextField,
  AppButton,
} from '../../../components/uikit';
import type { DataTableColumn, DataTableFilterDef, FormSelectOption, StatusTone } from '../../../components/uikit';
import { useServerTable } from '../../../hooks/useServerTable';
import {
  acceptPreArrival,
  cancelPreArrival,
  createPreArrival,
  getPreArrivals,
  rejectPreArrival,
  reviewPreArrival,
  submitPreArrival,
} from '../../../api/endpoints/shipping';
import { getVesselVisits } from '../../../api/endpoints/portHealth';
import type { PreArrivalNotification, PreArrivalStatus } from '../../../types/shipping';
import { notifyError, notifySuccess } from '../../../utils/toast';

const STATUS_META: Record<PreArrivalStatus, { label: string; tone: StatusTone }> = {
  DRAFT: { label: 'مسودة', tone: 'neutral' },
  SUBMITTED: { label: 'مُقدَّم', tone: 'info' },
  UNDER_REVIEW: { label: 'قيد المراجعة', tone: 'warning' },
  ACCEPTED: { label: 'مقبول', tone: 'success' },
  REJECTED: { label: 'مرفوض', tone: 'error' },
  CANCELLED: { label: 'ملغى', tone: 'neutral' },
};

const STATUS_OPTIONS = (Object.keys(STATUS_META) as PreArrivalStatus[]).map((value) => ({
  value,
  label: STATUS_META[value].label,
}));

type ActionKind = 'review' | 'accept' | 'reject' | 'cancel';

const ACTION_META: Record<ActionKind, { title: string; submit: string; fn: (id: string, notes?: string) => Promise<unknown> }> = {
  review: { title: 'بدء المراجعة', submit: 'بدء المراجعة', fn: reviewPreArrival },
  accept: { title: 'قبول الإشعار', submit: 'قبول', fn: acceptPreArrival },
  reject: { title: 'رفض الإشعار', submit: 'رفض', fn: rejectPreArrival },
  cancel: { title: 'إلغاء الإشعار', submit: 'إلغاء', fn: cancelPreArrival },
};

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'space-between' }}>
    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left' }}>{value || '—'}</Typography>
  </Stack>
);

export const PreArrivalList = () => {
  const table = useServerTable<PreArrivalNotification>({ fetchData: getPreArrivals });
  const {
    rows, count, loading, error, refresh,
    page, rowsPerPage, pageSizeOptions, setPage, setRowsPerPage,
    searchInput, setSearchInput, setFilter,
  } = table;

  const [status, setStatus] = useState('');

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [visitOptions, setVisitOptions] = useState<FormSelectOption[]>([]);
  const [visitId, setVisitId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Detail
  const [detail, setDetail] = useState<PreArrivalNotification | null>(null);

  // Transition (review / accept / reject / cancel)
  const [action, setAction] = useState<{ kind: ActionKind; row: PreArrivalNotification } | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [acting, setActing] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    getVesselVisits({ page_size: 100 })
      .then((res) => {
        const results = res.data.data.results ?? [];
        setVisitOptions(
          results.map((v) => ({
            value: v.id,
            label: `${v.vessel_name ?? v.vessel}${v.port_name ? ` — ${v.port_name}` : ''}`,
          })),
        );
      })
      .catch(() => setVisitOptions([]));
  }, []);

  const openCreate = () => {
    setVisitId('');
    setRemarks('');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!visitId) return;
    setCreating(true);
    try {
      await createPreArrival(visitId, { remarks: remarks || undefined });
      notifySuccess('تم إنشاء الإشعار');
      setCreateOpen(false);
      refresh();
    } catch {
      notifyError('تعذر إنشاء الإشعار');
    } finally {
      setCreating(false);
    }
  };

  const runSubmit = async (row: PreArrivalNotification) => {
    setSubmittingId(row.id);
    try {
      await submitPreArrival(row.id);
      notifySuccess('تم إرسال الإشعار');
      refresh();
    } catch {
      notifyError('تعذر إرسال الإشعار');
    } finally {
      setSubmittingId(null);
    }
  };

  const openAction = (kind: ActionKind, row: PreArrivalNotification) => {
    setAction({ kind, row });
    setActionNotes('');
  };

  const runAction = async () => {
    if (!action) return;
    setActing(true);
    try {
      await ACTION_META[action.kind].fn(action.row.id, actionNotes || undefined);
      notifySuccess('تم تحديث الإشعار');
      setAction(null);
      refresh();
    } catch {
      notifyError('تعذر تنفيذ العملية');
    } finally {
      setActing(false);
    }
  };

  const columns: DataTableColumn<PreArrivalNotification>[] = useMemo(
    () => [
      {
        key: 'vessel',
        label: 'السفينة',
        render: (n) => (
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{n.vessel_name || '—'}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {n.vessel_imo || ''}
            </Typography>
          </Box>
        ),
      },
      { key: 'port_name', label: 'الميناء', render: (n) => n.port_name || n.port_code || '—', hideOnMobile: true },
      { key: 'arrival_date', label: 'تاريخ الوصول', render: (n) => n.arrival_date || '—' },
      {
        key: 'status',
        label: 'الحالة',
        render: (n) => {
          const meta = STATUS_META[n.status];
          return <StatusChip label={meta?.label ?? n.status} tone={meta?.tone ?? 'neutral'} />;
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

  const renderActions = (n: PreArrivalNotification) => (
    <>
      <Tooltip title="عرض">
        <IconButton size="small" aria-label="عرض" onClick={() => setDetail(n)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {n.status === 'DRAFT' && (
        <Tooltip title="إرسال">
          <IconButton
            size="small"
            color="primary"
            aria-label="إرسال"
            disabled={submittingId === n.id}
            onClick={() => runSubmit(n)}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {n.status === 'SUBMITTED' && (
        <Tooltip title="مراجعة">
          <IconButton size="small" color="info" aria-label="مراجعة" onClick={() => openAction('review', n)}>
            <RateReviewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {n.status === 'UNDER_REVIEW' && (
        <>
          <Tooltip title="قبول">
            <IconButton size="small" color="success" aria-label="قبول" onClick={() => openAction('accept', n)}>
              <CheckCircleIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="رفض">
            <IconButton size="small" color="error" aria-label="رفض" onClick={() => openAction('reject', n)}>
              <HighlightOffIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      )}
      {(n.status === 'DRAFT' || n.status === 'SUBMITTED' || n.status === 'UNDER_REVIEW') && (
        <Tooltip title="إلغاء">
          <IconButton size="small" color="warning" aria-label="إلغاء" onClick={() => openAction('cancel', n)}>
            <CancelIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </>
  );

  return (
    <Box>
      <PageHeader
        eyebrow="الشحن البحري"
        title="إشعارات ما قبل الوصول"
        subtitle="إشعارات دخول السفن ومراجعة جهات الصحة في الموانئ البحرية"
        action={
          <AppButton variant="primary" startIcon={<AddIcon />} onClick={openCreate}>
            إشعار جديد
          </AppButton>
        }
      />

      <DataTable<PreArrivalNotification>
        columns={columns}
        rows={rows}
        rowKey={(n) => n.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="إشعارات ما قبل الوصول"
        subtitle={`${count} إشعار`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="ابحث بالسفينة أو رقم IMO..."
        filters={filters}
        actions={renderActions}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد إشعارات"
        emptyDescription="إشعارات ما قبل الوصول الجديدة تظهر هنا"
      />

      {/* Create */}
      <FormDialog
        open={createOpen}
        title="إشعار ما قبل وصول جديد"
        subtitle="يُنشأ كمسودة ثم يُرسل للمراجعة"
        icon={<AddIcon />}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        submitLabel="إنشاء"
        loading={creating}
        submitDisabled={!visitId}
      >
        <FormSelect
          label="الرحلة (VesselVisit)"
          value={visitId}
          onChange={setVisitId}
          options={visitOptions}
          placeholder="اختر الرحلة"
          requiredMark
        />
        <FormTextField
          label="ملاحظات"
          multiline
          minRows={2}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </FormDialog>

      {/* Transition */}
      <FormDialog
        open={action !== null}
        title={action ? ACTION_META[action.kind].title : ''}
        subtitle={action ? `${action.row.vessel_name} · ${action.row.port_name}` : ''}
        onClose={() => setAction(null)}
        onSubmit={runAction}
        submitLabel={action ? ACTION_META[action.kind].submit : 'تأكيد'}
        loading={acting}
      >
        <FormTextField
          label="ملاحظات المراجعة"
          multiline
          minRows={3}
          value={actionNotes}
          onChange={(e) => setActionNotes(e.target.value)}
        />
      </FormDialog>

      {/* Detail */}
      <Dialog open={detail !== null} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>تفاصيل الإشعار</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={1.25}>
              <Row label="السفينة" value={detail.vessel_name} />
              <Row label="IMO" value={detail.vessel_imo} />
              <Row label="الميناء" value={detail.port_name || detail.port_code} />
              <Row label="تاريخ الوصول" value={detail.arrival_date} />
              <Row
                label="الحالة"
                value={<StatusChip label={STATUS_META[detail.status]?.label ?? detail.status} tone={STATUS_META[detail.status]?.tone ?? 'neutral'} />}
              />
              <Row label="مُقدَّم من" value={detail.submitted_by_name} />
              <Row label="المراجع" value={detail.reviewed_by_name} />
              <Row label="ملاحظات المراجعة" value={detail.review_notes} />
              <Row label="ملاحظات" value={detail.remarks} />
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
