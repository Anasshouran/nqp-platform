import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import PowerSettingsNewIcon from '@mui/icons-material/PowerSettingsNew';
import AddAlertIcon from '@mui/icons-material/AddAlert';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { FormDialog, FormTextField, FormSelect, ConfirmDialog } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { useAuth } from '../../hooks/useAuth';
import { createAlert, closeAlert, getAlerts, getKillSwitchStatus, type CreateEmergencyAlertPayload } from '../../api/endpoints/emergency';
import { getMasterEntryPoints } from '../../api/endpoints/masterdata';
import { notifySuccess, extractErrorMessage } from '../../utils/toast';
import type { EmergencyAlert } from '../../types/emergency';
import { alertStatus, alertType } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';

const alertStatusOptions = Object.entries(alertStatus).map(([value, meta]) => ({ value, label: meta.label }));
const alertTypeOptions = Object.entries(alertType).map(([value, meta]) => ({ value, label: meta.label }));

const EMPTY_FORM = { alert_type: '', description: '', port: '' };

/** يقرأ نصّ الخطأ الصادر عن الخادم (envelope message/detail أو حقل DRF) دون كذب. */
const mutationError = (err: unknown, fallback: string): string => {
  const extracted = extractErrorMessage(err, '');
  if (extracted) return extracted;
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const first = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(first)) return String(first[0] ?? fallback);
    if (typeof first === 'string') return first;
  }
  return fallback;
};

const EmergencyPage = () => {
  const [killSwitch, setKillSwitch] = useState<{ active: boolean; reason?: string; port?: string; activatedAt?: string } | null>(null);

  const table = useServerTable<EmergencyAlert>({ fetchData: getAlerts });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);

  const { user } = useAuth();
  const can = (code: string): boolean => {
    const perms = user?.permissions;
    if (!perms || perms.length === 0) return true;
    return perms.includes(code);
  };
  const canAdd = can('surveillance:add');
  const canEdit = can('surveillance:edit');

  const [portOptions, setPortOptions] = useState<{ value: string; label: string }[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [closingId, setClosingId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  useEffect(() => {
    getKillSwitchStatus()
      .then((res) => {
        const sw = res.data.data.switch;
        setKillSwitch({
          active: res.data.data.active,
          reason: sw?.reason,
          port: sw?.port,
          activatedAt: sw?.activated_at,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    getMasterEntryPoints({ page_size: 500 })
      .then((res) =>
        setPortOptions(res.data.data.results.map((p) => ({ value: p.id, label: `${p.name_ar} (${p.code})` }))),
      )
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!form.alert_type) return;
    setCreating(true);
    setFormError(null);
    const payload: CreateEmergencyAlertPayload = { alert_type: form.alert_type };
    const description = form.description.trim();
    if (description) payload.description = description;
    if (form.port) payload.port = form.port;
    try {
      await createAlert(payload);
      notifySuccess('تم إنشاء الإنذار بنجاح');
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      refresh();
    } catch (err) {
      setFormError(mutationError(err, 'تعذّر إنشاء الإنذار، حاول مرة أخرى'));
    } finally {
      setCreating(false);
    }
  };

  const openCloseConfirm = (alert: EmergencyAlert) => {
    setCloseError(null);
    setClosingId(alert.id);
  };

  const handleCloseConfirm = async () => {
    if (!closingId) return;
    setClosing(true);
    setCloseError(null);
    try {
      await closeAlert(closingId);
      notifySuccess('تم إنهاء الإنذار واعتماد الحالة عند الخادم');
      setClosingId(null);
      refresh();
    } catch (err) {
      setCloseError(mutationError(err, 'تعذّر إنهاء الإنذار، حاول مرة أخرى'));
    } finally {
      setClosing(false);
    }
  };

  const handleExport = () => exportAll({
    filename: `alerts-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['النوع', 'الوصف', 'الحالة', 'وقت الإطلاق'],
    mapRow: (a) => [
      alertType[a.alert_type]?.label || a.alert_type,
      a.description,
      alertStatus[a.status]?.label || a.status,
      formatDateTime(a.triggered_at),
    ],
    message: 'تم تصدير الإنذارات',
  });

  const closingAlert = rows.find((a) => a.id === closingId) ?? null;

  return (
    <Box>
      <PageHeader
        title="غرفة العمليات الطارئة"
        subtitle="الإنذارات الصحية وحالات الطوارئ"
        eyebrow="الطوارئ والتقارير"
      />

      {killSwitch && (
        <Alert
          severity={killSwitch.active ? 'error' : 'success'}
          icon={<PowerSettingsNewIcon />}
          sx={{ mb: 3, borderRadius: 3 }}
        >
          {killSwitch.active ? (
            <>
              <strong>المفتاح الرئيسي مفعل</strong>{" "}تم تفعيل إيقاف التشغيل {killSwitch.port ? `للمنفذ ${killSwitch.port}` : 'للمنشأة'}
              {killSwitch.activatedAt ? ` في ${formatDateTime(killSwitch.activatedAt)}` : ''}
              {killSwitch.reason ? ` (السبب: ${killSwitch.reason})` : ''}
            </>
          ) : (
            <strong>المفتاح الرئيسي غير مفعل</strong>
          )}
        </Alert>
      )}

      <DataTable<EmergencyAlert>
        columns={[
          { key: 'alert_type', label: 'النوع', render: (a) => { const m = alertType[a.alert_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : a.alert_type; } },
          { key: 'description', label: 'الوصف', render: (a) => <Typography sx={{ maxWidth: 420 }}>{a.description}</Typography> },
          { key: 'port', label: 'المنفذ', render: (a) => a.port || '—', hideOnMobile: true },
          { key: 'status', label: 'الحالة', sortable: true, render: (a) => { const m = alertStatus[a.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={a.status} tone="neutral" />; } },
          { key: 'triggered_at', label: 'وقت الإطلاق', sortable: true, render: (a) => formatDateTime(a.triggered_at), hideOnMobile: true },
        ]}
        rows={rows}
        rowKey={(a) => a.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="الإنذارات"
        subtitle={`${count} إنذار`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالوصف..."
        filters={[
          { key: 'alert_type', label: 'النوع', options: alertTypeOptions, value: '', onChange: (v) => setFilter('alert_type', v) },
          { key: 'status', label: 'الحالة', options: alertStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={handleExport}
        exporting={exporting}
        onRefresh={refresh}
        emptyTitle="لا توجد إنذارات"
        emptyDescription="الإنذارات الصحية تظهر هنا عند رصدها"
        toolbar={
          canAdd ? (
            <Button
              variant="contained"
              disableElevation
              startIcon={<AddAlertIcon />}
              onClick={openCreate}
              size="small"
            >
              إنذار جديد
            </Button>
          ) : undefined
        }
        actions={
          canEdit
            ? (a) =>
                a.status !== 'RESOLVED' ? (
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<TaskAltIcon />}
                    onClick={() => openCloseConfirm(a)}
                    aria-label={`إنهاء الإنذار ${a.alert_type}`}
                  >
                    إنهاء
                  </Button>
                ) : undefined
            : undefined
        }
      />

      <FormDialog
        open={createOpen}
        title="إنذار جديد"
        subtitle="الأصناف تُحال إلى الخادم وتُسجَّل الحالة أولياً من النظام"
        icon={<AddAlertIcon />}
        loading={creating}
        submitDisabled={!form.alert_type}
        submitLabel="إنشاء الإنذار"
        onClose={() => {
          if (!creating) setCreateOpen(false);
        }}
        onSubmit={handleCreate}
      >
        {formError && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {formError}
          </Alert>
        )}
        <FormSelect
          label="نوع الإنذار"
          value={form.alert_type}
          onChange={(v) => setForm((f) => ({ ...f, alert_type: v }))}
          options={alertTypeOptions}
          placeholder="اختر نوع الإنذار"
          required
          requiredMark
        />
        <FormTextField
          label="الوصف"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          multiline
          minRows={3}
          hint="وصف اختياري للإنذار"
        />
        <FormSelect
          label="المنفذ"
          value={form.port}
          onChange={(v) => setForm((f) => ({ ...f, port: v }))}
          options={portOptions}
          placeholder="اختر منفذاً (اختياري)"
        />
      </FormDialog>

      <ConfirmDialog
        open={closingId !== null}
        title="إنهاء الإنذار"
        message={
          closingAlert
            ? `سيُنهى الإنذار «${alertType[closingAlert.alert_type]?.label || closingAlert.alert_type}» وتُسجَّل حالته «تم الحل» عند الخادم.`
            : 'سيُنهى الإنذار وتُسجَّل حالته «تم الحل» عند الخادم.'
        }
        confirmLabel="إنهاء"
        tone="info"
        loading={closing}
        onClose={() => {
          if (!closing) setClosingId(null);
        }}
        onConfirm={handleCloseConfirm}
      >
        {closeError && (
          <Alert severity="error" sx={{ borderRadius: 2, mt: 1.5 }}>
            {closeError}
          </Alert>
        )}
      </ConfirmDialog>
    </Box>
  );
};

export default EmergencyPage;