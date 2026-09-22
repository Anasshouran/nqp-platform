import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import SendIcon from '@mui/icons-material/Send';
import VerifiedIcon from '@mui/icons-material/Verified';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import { formatDate } from '../../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../../utils/toast';
import {
  approveIhrEvent,
  closeIhrEvent,
  createIhrEvent,
  getIhrEvents,
  IHR_EVENT_STATUS_OPTIONS,
  IHR_EVENT_TYPE_OPTIONS,
  IHR_RISK_OPTIONS,
  notifyWhoOfIhrEvent,
  submitIhrEvent,
  type IhrEventInput,
} from '../../../api/endpoints/ihr';
import type { IhrEvent, IHRRiskLevel } from '../../../types/ihr';
import { IHR_EVENT_STATUS_LABELS, IHR_EVENT_TYPE_LABELS, IHR_RISK_LABELS } from '../../../types/ihr';

const toneForStatus = (status: IhrEvent['status']) => {
  switch (status) {
    case 'NOTIFIABLE':
      return 'success';
    case 'SUBMITTED':
      return 'info';
    case 'CLOSED':
      return 'neutral';
    case 'DRAFT':
    case 'UNDER_REVIEW':
    case 'NFP_REVIEW':
      return 'warning';
    case 'NATIONAL_ASSESSMENT':
    case 'FOLLOW_UP':
    default:
      return 'primary';
  }
};

const toneForRisk = (risk: IHRRiskLevel) => (risk === 'CRITICAL' ? 'error' : risk === 'HIGH' ? 'warning' : risk === 'MODERATE' ? 'info' : 'neutral');

const EventForm = ({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) => {
  const [form, setForm] = useState<IhrEventInput>({
    event_type: 'INFECTIOUS_DISEASE',
    title: '',
    description: '',
    date_detected: '',
    cases_suspected: 0,
    cases_probable: 0,
    cases_confirmed: 0,
    deaths: 0,
    risk_level: 'LOW',
    is_international_impact: false,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        event_type: 'INFECTIOUS_DISEASE',
        title: '',
        description: '',
        date_detected: '',
        cases_suspected: 0,
        cases_probable: 0,
        cases_confirmed: 0,
        deaths: 0,
        risk_level: 'LOW',
        is_international_impact: false,
      });
    }
  }, [open]);

  const handleSave = async () => {
    setBusy(true);
    try {
      const res = await createIhrEvent(form);
      notifySuccess(`أُنشئ الحدث ${(res.data.data as IhrEvent).event_number}`);
      onCreated();
      onClose();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'فشل إنشاء الحدث'));
    } finally {
      setBusy(false);
    }
  };

  const num = (v: string) => Number(v) || 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>حدث IHR جديد</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            select
            label="نوع الحدث"
            fullWidth
            value={form.event_type}
            onChange={(e) => setForm({ ...form, event_type: e.target.value as IhrEventInput['event_type'] })}
          >
            {IHR_EVENT_TYPE_OPTIONS.map((t) => (
              <MenuItem key={t} value={t}>{IHR_EVENT_TYPE_LABELS[t]}</MenuItem>
            ))}
          </TextField>
          <TextField label="العنوان" fullWidth required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <TextField label="الوصف" fullWidth multiline rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <TextField
            label="تاريخ الرصد"
            type="date"
            fullWidth
            value={form.date_detected}
            onChange={(e) => setForm({ ...form, date_detected: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
          <Stack direction="row" spacing={2}>
            <TextField label="مشتبه" type="number" fullWidth value={form.cases_suspected} onChange={(e) => setForm({ ...form, cases_suspected: num(e.target.value) })} />
            <TextField label="محتمل" type="number" fullWidth value={form.cases_probable} onChange={(e) => setForm({ ...form, cases_probable: num(e.target.value) })} />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField label="مؤكد" type="number" fullWidth value={form.cases_confirmed} onChange={(e) => setForm({ ...form, cases_confirmed: num(e.target.value) })} />
            <TextField label="وفيات" type="number" fullWidth value={form.deaths} onChange={(e) => setForm({ ...form, deaths: num(e.target.value) })} />
          </Stack>
          <TextField
            select
            label="مستوى الخطر"
            fullWidth
            value={form.risk_level}
            onChange={(e) => setForm({ ...form, risk_level: e.target.value as IHRRiskLevel })}
          >
            {IHR_RISK_OPTIONS.map((r) => (
              <MenuItem key={r} value={r}>{IHR_RISK_LABELS[r]}</MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={busy || !form.title}>
          {busy ? 'جارٍ الإنشاء…' : 'إنشاء'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const IhrEventsPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const table = useServerTable<IhrEvent>({ fetchData: getIhrEvents });
  const {
    rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting,
    setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter,
  } = table;

  useEffect(() => {
    if (!feedback) return;
    const t = window.setTimeout(() => setFeedback(null), 5000);
    return () => window.clearTimeout(t);
  }, [feedback]);

  const run = useCallback(
    async (fn: (id: string) => Promise<{ data: { message?: string } }>, id: string, success: string) => {
      try {
        await fn(id);
        setFeedback({ tone: 'success', message: success });
        notifySuccess(success);
        refresh();
      } catch (err) {
        const msg = extractErrorMessage(err, 'فشل تنفيذ الإجراء');
        setFeedback({ tone: 'error', message: msg });
        notifyError(msg);
      }
    },
    [refresh]
  );

  const handleApprove = (id: string) => run(approveIhrEvent, id, 'اعتمد الحدث كواجب الإبلاغ').catch(() => undefined);

  const handleNotify = (id: string) => run(notifyWhoOfIhrEvent, id, 'جُدول الإرسال لمنظمة الصحة').catch(() => undefined);

  const handleClose = (id: string) => run(closeIhrEvent, id, 'أُغلق الحدث').catch(() => undefined);

  const renderActions = (ev: IhrEvent) => {
    switch (ev.status) {
      case 'DRAFT':
      case 'UNDER_REVIEW':
        return (
          <Button size="small" variant="outlined" startIcon={<SendIcon fontSize="small" />} onClick={() => void submitIhrEvent(ev.id).then(() => { notifySuccess('أُرسل للمراجعة'); refresh(); }).catch((err) => notifyError(extractErrorMessage(err))) }>
            إرسال للمراجعة
          </Button>
        );
      case 'NATIONAL_ASSESSMENT':
      case 'NFP_REVIEW':
        return (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" startIcon={<VerifiedIcon fontSize="small" />} onClick={() => handleApprove(ev.id)}>
              اعتماد NFP
            </Button>
          </Stack>
        );
      case 'NOTIFIABLE':
        return (
          <Stack direction="row" spacing={0.5}>
            <Button size="small" startIcon={<PublicIcon fontSize="small" />} onClick={() => handleNotify(ev.id)}>
              إرسال WHO
            </Button>
            <Button size="small" color="inherit" startIcon={<LockIcon fontSize="small" />} onClick={() => handleClose(ev.id)}>
              إغلاق
            </Button>
          </Stack>
        );
      case 'SUBMITTED':
      case 'FOLLOW_UP':
        return (
          <Button size="small" color="inherit" startIcon={<LockIcon fontSize="small" />} onClick={() => handleClose(ev.id)}>
            إغلاق
          </Button>
        );
      default:
        return <Typography variant="caption" color="text.secondary">—</Typography>;
    }
  };

  return (
    <Box>
      <PageHeader
        title="أحداث IHR"
        subtitle="تتبع الأحداث الجلية بالصحة العمومية من الرصد إلى الإبلاغ الوطني والدولي"
        eyebrow="IHR / Events"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            حدث جديد
          </Button>
        }
      />

      {feedback && (
        <Alert severity={feedback.tone} sx={{ borderRadius: 2, mb: 2.5 }}>
          {feedback.message}
        </Alert>
      )}

      <DataTable<IhrEvent>
        columns={[
          {
            key: 'event_number',
            label: 'الرقم',
            sortable: true,
            render: (ev) => <Typography dir="ltr" sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700 }}>{ev.event_number}</Typography>,
          },
          { key: 'title', label: 'العنوان', sortable: true, render: (ev) => <Typography sx={{ fontWeight: 600 }}>{ev.title}</Typography> },
          {
            key: 'event_type',
            label: 'النوع',
            render: (ev) => IHR_EVENT_TYPE_LABELS[ev.event_type] ?? ev.event_type,
            hideOnMobile: true,
          },
          {
            key: 'risk_level',
            label: 'الخطر',
            render: (ev) => <StatusChip label={IHR_RISK_LABELS[ev.risk_level]} tone={toneForRisk(ev.risk_level)} variant="outlined" />,
          },
          {
            key: 'status',
            label: 'الحالة',
            sortable: true,
            render: (ev) => <StatusChip label={IHR_EVENT_STATUS_LABELS[ev.status] ?? ev.status} tone={toneForStatus(ev.status)} />,
          },
          {
            key: 'cases_confirmed',
            label: 'م / م / ش',
            align: 'center',
            render: (ev) => `${ev.cases_suspected} / ${ev.cases_probable} / ${ev.cases_confirmed}`,
          },
          { key: 'date_detected', label: 'تاريخ الرصد', hideOnMobile: true, render: (ev) => formatDate(ev.date_detected) },
        ]}
        rows={rows}
        rowKey={(ev) => ev.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="الأحداث"
        subtitle={`${count} حدث`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالعنوان أو رقم الحدث..."
        filters={[
          {
            key: 'status',
            label: 'الحالة',
            options: IHR_EVENT_STATUS_OPTIONS.map((s) => ({ value: s, label: IHR_EVENT_STATUS_LABELS[s] })),
            value: '',
            onChange: (v) => setFilter('status', v),
          },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        actions={(ev) => renderActions(ev)}
        actionsLabel="إجراءات"
        emptyTitle="لا توجد أحداث IHR"
        emptyDescription="أنشئ حدثاً جديداً أو انتظر ورود بلاغات الترصد"
      />

      <EventForm open={dialogOpen} onClose={() => setDialogOpen(false)} onCreated={refresh} />
    </Box>
  );
};

export default IhrEventsPage;