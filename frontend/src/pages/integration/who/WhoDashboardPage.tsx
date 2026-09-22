import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import Alert from '@mui/material/Alert';
import LinkIcon from '@mui/icons-material/Link';
import CableIcon from '@mui/icons-material/Cable';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader, StatCard } from '../../../components/common';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import { formatDateTime } from '../../../utils/formatters';
import { extractErrorMessage, notifyError, notifySuccess } from '../../../utils/toast';
import {
  createWhoIntegration,
  getWhoConnectionStatus,
  getWhoIntegrations,
  getWhoSyncLogs,
  syncWhoNow,
  testWhoConnection,
  updateWhoIntegration,
  WHO_ENVIRONMENT_OPTIONS,
} from '../../../api/endpoints/who';
import type { WhoConnectionStatus, WhoEnvironment, WhoIntegration, WhoIntegrationInput, WhoSyncLog, WhoTestResult } from '../../../types/who';
import { WHO_SYNC_OPERATION_LABELS, WHO_SYNC_STATUS_LABELS } from '../../../types/who';

const STATUS_TONE: Record<string, 'success' | 'error' | 'warning' | 'neutral' | 'info' | 'primary'> = {
  SUCCESS: 'success',
  FAILED: 'error',
  RETRY: 'warning',
  PENDING: 'info',
  PROCESSING: 'info',
  CANCELLED: 'neutral',
};

const IntegrationForm = ({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: WhoIntegration | null;
  onClose: () => void;
  onSaved: () => void;
}) => {
  const [form, setForm] = useState<WhoIntegrationInput>({
    name: '',
    environment: 'SANDBOX',
    base_url: '',
    client_id: '',
    client_secret: '',
    authentication_type: 'OAUTH2',
    is_active: true,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        name: initial?.name ?? '',
        environment: initial?.environment ?? 'SANDBOX',
        base_url: initial?.base_url ?? '',
        client_id: initial?.client_id ?? '',
        client_secret: '',
        authentication_type: initial?.authentication_type ?? 'OAUTH2',
        is_active: initial?.is_active ?? true,
      });
    }
  }, [open, initial]);

  const handleSave = async () => {
    setBusy(true);
    try {
      if (initial) {
        await updateWhoIntegration(initial.id, form);
        notifySuccess('تم تحديث التكامل');
      } else {
        await createWhoIntegration(form);
        notifySuccess('أُضيف التكامل');
      }
      onSaved();
      onClose();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'فشل حفظ التكامل'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initial ? 'تعديل التكامل' : 'إضافة تكامل WHO'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField label="الاسم" fullWidth required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField
            select
            label="البيئة"
            fullWidth
            value={form.environment}
            onChange={(e) => setForm({ ...form, environment: e.target.value as WhoEnvironment })}
          >
            {WHO_ENVIRONMENT_OPTIONS.map((env) => (
              <MenuItem key={env} value={env}>{env}</MenuItem>
            ))}
          </TextField>
          <TextField label="رابط الأساس (Base URL)" dir="ltr" fullWidth value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://extranet.who.int/spar" />
          <TextField label="Client ID" dir="ltr" fullWidth value={form.client_id ?? ''} onChange={(e) => setForm({ ...form, client_id: e.target.value })} />
          <TextField
            label="Client Secret (يُخزَّن مشفّراً)"
            dir="ltr"
            type="password"
            fullWidth
            value={form.client_secret ?? ''}
            onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
            helperText={initial ? 'اتركه فارغاً للإبقاء على السر الحالي' : undefined}
          />
          <TextField
            select
            label="نوع المصادقة"
            fullWidth
            value={form.authentication_type}
            onChange={(e) => setForm({ ...form, authentication_type: e.target.value as WhoIntegrationInput['authentication_type'] })}
          >
            <MenuItem value="OAUTH2">OAuth2</MenuItem>
            <MenuItem value="API_KEY">API Key</MenuItem>
            <MenuItem value="NONE">بدون</MenuItem>
          </TextField>
          <FormControlLabel
            control={<Switch checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
            label="فعّال"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={busy || !form.name || !form.base_url}>
          {busy ? 'جارٍ الحفظ…' : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const LogsTab = ({ refreshKey }: { refreshKey: number }) => {
  const table = useServerTable<WhoSyncLog>({ fetchData: getWhoSyncLogs });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;

  useEffect(() => {
    if (refreshKey > 0) refresh();
  }, [refreshKey, refresh]);

  return (
    <DataTable<WhoSyncLog>
      columns={[
        {
          key: 'operation',
          label: 'العملية',
          sortable: true,
          render: (l) => <StatusChip label={WHO_SYNC_OPERATION_LABELS[l.operation] ?? l.operation} tone="primary" variant="outlined" />,
        },
        {
          key: 'status',
          label: 'الحالة',
          sortable: true,
          render: (l) => <StatusChip label={WHO_SYNC_STATUS_LABELS[l.status] ?? l.status} tone={STATUS_TONE[l.status] ?? 'neutral'} />,
        },
        { key: 'http_status', label: 'HTTP', render: (l) => (l.http_status ? String(l.http_status) : '—'), hideOnMobile: true },
        {
          key: 'started_at',
          label: 'الوقت',
          sortable: true,
          render: (l) => formatDateTime(l.started_at),
        },
      ]}
      rows={rows}
      rowKey={(l) => l.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="سجلات المزامنة"
      subtitle={`${count} عملية`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث في السجلات..."
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={setSorting}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle="لا توجد سجلات مزامنة"
      emptyDescription="عمليات الاتصال بمنظمة الصحة العالمية تظهر هنا"
    />
  );
};

const WhoDashboardPage = () => {
  const [status, setStatus] = useState<WhoConnectionStatus | null>(null);
  const [testResult, setTestResult] = useState<WhoTestResult | null>(null);
  const [busy, setBusy] = useState<'status' | 'test' | 'sync' | null>(null);
  const [logsKey, setLogsKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WhoIntegration | null>(null);
  const integrationsTable = useServerTable<WhoIntegration>({ fetchData: getWhoIntegrations });
  const {
    rows: integrations, count: integrationsCount, loading: loadingIntegrations, error: errorIntegrations,
    searchInput: integrationSearch, setSearchInput: setIntegrationSearch,
    setPage, rowsPerPage, setRowsPerPage, page, pageSizeOptions, refresh: refreshIntegrations,
  } = integrationsTable;

  const loadStatus = useCallback(async () => {
    setBusy('status');
    try {
      const res = await getWhoConnectionStatus();
      setStatus(res.data.data);
    } catch {
      notifyError('تعذر جلب حالة الاتصال');
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleTest = async () => {
    setBusy('test');
    setTestResult(null);
    try {
      const res = await testWhoConnection();
      const r = res.data.data;
      setTestResult(r);
      if (r.connected) notifySuccess('الاتصال ناجح');
      else notifyError(r.error ?? 'فشل الاتصال');
      void loadStatus();
    } catch (err) {
      notifyError(extractErrorMessage(err, 'فشل اختبار الاتصال'));
    } finally {
      setBusy(null);
    }
  };

  const handleSync = async () => {
    setBusy('sync');
    try {
      const res = await syncWhoNow();
      notifySuccess(`جُدولت المزامنة (مهمة ${res.data.data.task_id.slice(0, 8)}…)`);
      setLogsKey((k) => k + 1);
    } catch (err) {
      notifyError(extractErrorMessage(err, 'فشل جدولة المزامنة'));
    } finally {
      setBusy(null);
    }
  };

  const afterSaved = () => {
    void loadStatus();
    refreshIntegrations();
  };

  return (
    <Box>
      <PageHeader
        title="التكامل مع منظمة الصحة العالمية"
        subtitle="إدارة الاتصال بمنظمة الصحة (WHO) — نقاط الدخول، تقارير IHR، مزامنة الأمراض ICD-11"
        eyebrow="WHO / IHR"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            إضافة تكامل
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <StatCard
          icon={<LinkIcon fontSize="small" />}
          label="عداد التكامل"
          value={status?.configured ? 'مُعد' : 'غير مُعد'}
          accent={status?.configured ? 'success.main' : 'warning.main'}
        />
        <StatCard
          icon={<CableIcon fontSize="small" />}
          label="حالة الاتصال"
          value={status?.configured ? (status?.connected ? 'متصل' : 'غير متصل') : '—'}
          accent={status?.connected ? 'success.main' : 'error.main'}
        />
        <StatCard
          icon={<CloudSyncIcon fontSize="small" />}
          label="آخر مزامنة"
          value={status?.last_sync_at ? formatDateTime(status.last_sync_at) : '—'}
          accent="info.main"
        />
        <StatCard
          icon={<SyncAltIcon fontSize="small" />}
          label="البيئة"
          value={status?.environment ?? '—'}
          accent="primary.main"
        />
      </Stack>

      {testResult && (
        <Alert severity={testResult.connected ? 'success' : 'error'} sx={{ borderRadius: 2, mb: 3 }}>
          {testResult.connected
            ? `الاتصال ناجح عبر ${testResult.client_id ?? ''} ${testResult.latency_ms ? `(${testResult.latency_ms}ms)` : ''}`
            : testResult.error ?? 'فشل الاتصال'}
        </Alert>
      )}

      <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
        <Button variant="outlined" startIcon={<CableIcon />} disabled={busy !== null || !status?.configured} onClick={() => void handleTest()}>
          {busy === 'test' ? 'جارٍ الاختبار…' : 'اختبار الاتصال'}
        </Button>
        <Button variant="contained" startIcon={<CloudSyncIcon />} disabled={busy !== null || !status?.configured} onClick={() => void handleSync()}>
          {busy === 'sync' ? 'جارٍ الجدولة…' : 'مزامنة فورية'}
        </Button>
        <Button variant="text" disabled={busy === 'status'} onClick={() => void loadStatus()}>
          تحديث الحالة
        </Button>
      </Stack>

      {status?.last_error && (
        <Alert severity="warning" sx={{ borderRadius: 2, mb: 3 }}>
          آخر خطأ: {status.last_error}
        </Alert>
      )}

      <Card variant="outlined" sx={{ borderRadius: 2, mb: 4 }}>
        <DataTable<WhoIntegration>
          columns={[
            {
              key: 'name',
              label: 'الاسم',
              sortable: true,
              render: (i) => <Typography sx={{ fontWeight: 700 }}>{i.name}</Typography>,
            },
            { key: 'environment', label: 'البيئة', render: (i) => <StatusChip label={i.environment} tone={i.environment === 'PRODUCTION' ? 'warning' : 'info'} variant="outlined" /> },
            {
              key: 'base_url',
              label: 'الرابط',
              render: (i) => <Typography dir="ltr" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{i.base_url}</Typography>,
            },
            {
              key: 'last_success_at',
              label: 'آخر نجاح',
              render: (i) => (i.last_success_at ? formatDateTime(i.last_success_at) : '—'),
            },
            {
              key: 'is_active',
              label: 'الحالة',
              render: (i) => (i.is_active ? <StatusChip label="نشط" tone="success" /> : <StatusChip label="معطل" tone="neutral" />),
            },
          ]}
          rows={integrations}
          rowKey={(i) => i.id}
          count={integrationsCount}
          page={page}
          rowsPerPage={rowsPerPage}
          pageSizeOptions={pageSizeOptions}
          loading={loadingIntegrations}
          error={errorIntegrations}
          title="التكاملات"
          subtitle={`${integrationsCount} تكامل`}
          searchInput={integrationSearch}
          onSearchChange={setIntegrationSearch}
          searchPlaceholder="بحث بالاسم..."
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onRefresh={refreshIntegrations}
          actions={(i) => (
            <Button size="small" onClick={() => { setEditing(i); setDialogOpen(true); }}>
              تعديل
            </Button>
          )}
          emptyTitle="لا توجد تكاملات"
          emptyDescription="أضف تكامل WHO الأول من زر «إضافة تكامل»"
        />
      </Card>

      <LogsTab refreshKey={logsKey} />

      <IntegrationForm
        open={dialogOpen}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={afterSaved}
      />
    </Box>
  );
};

export default WhoDashboardPage;