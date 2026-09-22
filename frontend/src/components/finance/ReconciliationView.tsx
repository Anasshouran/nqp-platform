import { useCallback, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import type { AxiosError } from 'axios';
import {
  getFinanceReconciliations,
  createFinanceReconciliation,
  getFinanceReconciliationPreview,
  sealFinanceReconciliation,
  resolveFinanceReconciliation,
} from '../../api/endpoints/finance';
import type {
  FinanceReconciliation,
  FinanceReconciliationDiscrepancy,
  ReconciliationPreview,
} from '../../types/finance';
import SectionTitle from '../../components/common/SectionTitle';
import StatCard from '../../components/common/StatCard';
import { DataTable } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';

const CHANNEL_LABELS: Record<string, string> = {
  PAYMENT_GATEWAY: 'بوابة الدفع (إلكتروني/بطاقة)',
  BANK: 'البنك (تحويل/بطاقة)',
};

const STATUS_META: Record<string, { label: string; tone: 'default' | 'info' | 'success' | 'warning' | 'error' }> = {
  DRAFT: { label: 'مسودة', tone: 'default' },
  MATCHED: { label: 'مطابق', tone: 'success' },
  DISCREPANCY: { label: 'يوجد فرق', tone: 'warning' },
  RESOLVED: { label: 'تم التسوية', tone: 'success' },
};

const CHANNEL_OPTIONS = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }));

const fmtMoney = (v: string | number | null | undefined) =>
  new Intl.NumberFormat('ar-SD').format(Number(v ?? 0));

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('ar-SD') : '—');

const ERROR_NO_REPORTS = 'لا تملك صلاحية المطابقات المالية';

export default function ReconciliationView(): React.JSX.Element {
  const [reconciliations, setReconciliations] = useState<FinanceReconciliation[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<FinanceReconciliation | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [channelValue, setChannelValue] = useState('');
  const [statusValue, setStatusValue] = useState('');

  const table = useServerTable<FinanceReconciliation>({
    fetchData: getFinanceReconciliations,
    initialPageSize: 10,
  });
  const {
    rows, count, loading: tableLoading, error: tableError, page, pageSizeOptions,
    setPage, setRowsPerPage, refresh, setFilter,
  } = table;

  const load = useCallback(async () => {
    try {
      const res = await getFinanceReconciliations({ page_size: 100 });
      setReconciliations(res.data.data.results ?? []);
    } catch (e) {
      const msg = (e as AxiosError<{ message?: string }>).response?.data?.message;
      setErrorMsg(msg || ERROR_NO_REPORTS);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const afterMutate = async () => {
    setCreateOpen(false);
    setDetail(null);
    await Promise.all([load(), refresh()]);
  };

  const totals = reconciliations.reduce(
    (acc, r) => {
      acc[STATUS_META[r.status]?.label ?? r.status] = (acc[STATUS_META[r.status]?.label ?? r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <>
      <SectionTitle
        title="المطابقة المالية (التسويات)"
        subtitle="مطابقة دورية: نظام المنصة الوطني ↔ بوابة الدفع/البنك — فصل الاختصاص عند الحسم النهائي"
      />
      {errorMsg && (
        <Typography color="error" sx={{ mb: 2 }}>{errorMsg}</Typography>
      )}

      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2.5 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          تسوية جديدة
        </Button>
      </Stack>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="إجمالي التسويات" value={reconciliations.length} trend={{ label: 'سجل دوري غير قابل للحذف' }} icon={<SyncAltIcon />} accent="primary.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="مطابقة" value={totals['مطابق'] ?? 0} trend={{ label: 'متوازنة مع القناة' }} icon={<FactCheckIcon />} accent="success.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="فروقات معلقة" value={(totals['يوجد فرق'] ?? 0) + (totals['مسودة'] ?? 0)} trend={{ label: 'تحتاج إغلاق/حسم' }} icon={<LockIcon />} accent="warning.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label="محسومة نهائياً" value={totals['تم التسوية'] ?? 0} trend={{ label: 'مطلوب اعتماد المدير' }} icon={<VerifiedUserIcon />} accent="secondary.main" />
        </Grid>
      </Grid>

      <DataTable<FinanceReconciliation>
        columns={[
          { key: 'period', label: 'الفترة', render: (r) => <Typography sx={{ whiteSpace: 'nowrap' }}>{fmtDate(r.period_start)} ← {fmtDate(r.period_end)}</Typography> },
          { key: 'channel', label: 'القناة', render: (r) => CHANNEL_LABELS[r.channel] ?? r.channel, hideOnMobile: true },
          { key: 'system_total', label: 'إجمالي النظام', sortable: true, render: (r) => <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(r.system_total)}</Typography> },
          { key: 'channel_total', label: 'إجمالي القناة', render: (r) => <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(r.channel_total)}</Typography>, hideOnMobile: true },
          { key: 'difference', label: 'الفرق', sortable: true, render: (r) => {
            const diff = Number(r.difference);
            return <Typography sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: diff === 0 ? 'success.main' : 'error.main' }}>{fmtMoney(diff)}</Typography>;
          } },
          { key: 'matched_count', label: 'مطابقات', render: (r) => <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.matched_count}</Typography>, hideOnMobile: true },
          { key: 'discrepancy_count', label: 'فروقات', render: (r) => <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.discrepancy_count}</Typography>, hideOnMobile: true },
          { key: 'status', label: 'الحالة', sortable: true, render: (r) => {
            const meta = STATUS_META[r.status] ?? { label: r.status, tone: 'default' as const };
            return <Chip size="small" label={meta.label} color={meta.tone} variant="outlined" />;
          } },
          { key: 'created_by_name', label: 'أنشئت بواسطة', render: (r) => r.created_by_name || '—', hideOnMobile: true },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        count={count}
        page={page}
        rowsPerPage={table.rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={tableLoading}
        error={tableError}
        title="التسويات"
        subtitle={`${count} تسوية`}
        filters={[
          {
            key: 'channel',
            label: 'القناة',
            options: CHANNEL_OPTIONS,
            value: channelValue,
            onChange: (v) => { setChannelValue(v); setFilter('channel', v); },
          },
          {
            key: 'status',
            label: 'الحالة',
            options: STATUS_OPTIONS,
            value: statusValue,
            onChange: (v) => { setStatusValue(v); setFilter('status', v); },
          },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        actionsLabel="عرض"
        actions={(r) => (
          <IconButton size="small" aria-label="عرض" onClick={() => setDetail(r)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        )}
        emptyTitle="لا توجد تسويات بعد"
        emptyDescription="ابدأ بإنشاء تسوية للفترة والقناة ثم اعتمد الحقائق من بوابة الدفع/البنك."
      />

      <CreateReconciliationDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={afterMutate} onNotify={setErrorMsg} />
      {detail && (
        <ReconciliationDetailDialog
          reconciliation={detail}
          onClose={() => setDetail(null)}
          onUpdated={afterMutate}
          onNotify={setErrorMsg}
        />
      )}
    </>
  );
}

function CreateReconciliationDialog({ open, onClose, onCreated, onNotify }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onNotify: (m: string) => void;
}): React.JSX.Element {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ period_start: today, period_end: today, channel: 'PAYMENT_GATEWAY', channel_total: '' });
  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const runPreview = useCallback(async () => {
    if (!form.period_start || !form.period_end || !form.channel) return;
    setLoading(true);
    try {
      const res = await getFinanceReconciliationPreview({
        period_start: form.period_start,
        period_end: form.period_end,
        channel: form.channel,
      });
      setPreview(res.data.data);
    } catch (e) {
      onNotify((e as AxiosError<{ message?: string }>).response?.data?.message ?? 'تعذّرت المعاينة');
    } finally {
      setLoading(false);
    }
  }, [form, onNotify]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await createFinanceReconciliation({
        period_start: form.period_start,
        period_end: form.period_end,
        channel: form.channel,
        channel_total: form.channel_total || null,
      });
      onCreated();
    } catch (e) {
      onNotify((e as AxiosError<{ message?: string }>).response?.data?.message ?? 'تعذّر إنشاء التسوية');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>تسوية جديدة</Typography>
          <IconButton onClick={onClose} size="small" aria-label="إغلاق" sx={{ borderRadius: 2 }}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <TextField label="بداية الفترة" type="date" value={form.period_start} onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))} />
            <TextField label="نهاية الفترة" type="date" value={form.period_end} onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))} />
            <TextField select label="القناة" value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))} sx={{ minWidth: 220 }}>
              {Object.entries(CHANNEL_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField>
            <TextField label="إجمالي القناة (الحقيقي)" type="number" value={form.channel_total} onChange={(e) => setForm((f) => ({ ...f, channel_total: e.target.value }))} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<FactCheckIcon />} disabled={loading} onClick={runPreview}>
              {loading ? <CircularProgress size={18} /> : 'معاينة من نظام المنصة'}
            </Button>
          </Stack>

          {preview && (
            <>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                إجمالي النظام للفترة: {fmtMoney(preview.system_total)} — {preview.matched_count} مطابقة / {preview.discrepancy_count} فرق
              </Typography>
              {preview.discrepancy_count > 0 && (
                <ReconciliationDiscrepancies discrepancies={preview.discrepancies} />
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" disabled={saving} startIcon={<AddIcon />} onClick={handleSave}>
          {saving ? <CircularProgress size={18} /> : 'حفظ التسوية'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReconciliationDiscrepancies({ discrepancies }: { discrepancies: FinanceReconciliationDiscrepancy[] }): React.JSX.Element {
  return (
    <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>النوع</TableCell>
            <TableCell>المرجع</TableCell>
            <TableCell>الفاتورة</TableCell>
            <TableCell>المبلغ</TableCell>
            <TableCell>الوصف</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {discrepancies.map((d, idx) => (
            <TableRow key={idx}>
              <TableCell><Chip size="small" color="warning" variant="outlined" label={d.type === 'duplicate_reference' ? 'مرجع مكرر' : 'بلا مرجع'} /></TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{d.reference || '—'}</TableCell>
              <TableCell>{d.invoice_number || '—'}</TableCell>
              <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{d.amount != null ? `${fmtMoney(d.amount)} ${d.currency ?? ''}` : '—'}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{d.issue}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ReconciliationDetailDialog({ reconciliation: rec, onClose, onUpdated, onNotify }: {
  reconciliation: FinanceReconciliation;
  onClose: () => void;
  onUpdated: () => void;
  onNotify: (m: string) => void;
}): React.JSX.Element {
  const [systemTotal, setSystemTotal] = useState(String(rec.system_total ?? ''));
  const [channelTotal, setChannelTotal] = useState(String(rec.channel_total ?? ''));
  const [notes, setNotes] = useState(rec.investigation_notes ?? '');
  const [working, setWorking] = useState(false);
  const meta = STATUS_META[rec.status] ?? { label: rec.status, tone: 'default' as const };
  const diff = Number(rec.difference);
  const canMutate = rec.status !== 'RESOLVED';

  const handleSeal = async () => {
    setWorking(true);
    try {
      await sealFinanceReconciliation(rec.id, { system_total: systemTotal || null, channel_total: channelTotal || null, investigation_notes: notes });
      onUpdated();
    } catch (e) {
      onNotify((e as AxiosError<{ message?: string }>).response?.data?.message ?? 'تعذّر إغلاق التسوية');
    } finally {
      setWorking(false);
    }
  };

  const handleResolve = async () => {
    setWorking(true);
    try {
      await resolveFinanceReconciliation(rec.id, { system_total: systemTotal || null, channel_total: channelTotal || null, investigation_notes: notes });
      onUpdated();
    } catch (e) {
      onNotify((e as AxiosError<{ message?: string }>).response?.data?.message ?? 'تعذّر الحسم النهائي');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <SyncAltIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>التسوية {fmtDate(rec.period_start)} ← {fmtDate(rec.period_end)}</Typography>
            <Chip size="small" color={meta.tone} variant="outlined" label={meta.label} />
          </Stack>
          <IconButton onClick={onClose} size="small" aria-label="إغلاق" sx={{ borderRadius: 2 }}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Typography variant="body2" color="text.secondary">القناة: <b>{CHANNEL_LABELS[rec.channel] ?? rec.channel}</b></Typography>
            <Typography variant="body2" color="text.secondary">أنشئت بواسطة: <b>{rec.created_by_name || '—'}</b></Typography>
            <Typography variant="body2" color="text.secondary">الحسم: <b>{rec.reconciled_by_name || '—'}</b> {rec.reconciled_at ? ` (${fmtDate(rec.reconciled_at)})` : ''}</Typography>
          </Stack>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>الإجماليات والفرق</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="flex-end" useFlexGap>
                <TextField label="إجمالي النظام (SDG)" type="number" value={systemTotal} onChange={(e) => setSystemTotal(e.target.value)} disabled={!canMutate} />
                <TextField label="إجمالي القناة (SDG)" type="number" value={channelTotal} onChange={(e) => setChannelTotal(e.target.value)} disabled={!canMutate} />
                <Box>
                  <Typography variant="caption" color="text.secondary">الفرق النهائي</Typography>
                  <Typography sx={{ fontWeight: 700, color: diff === 0 ? 'success.main' : 'error.main' }}>{fmtMoney(diff)}</Typography>
                </Box>
              </Stack>
              <TextField label="ملاحظات التحقيق / قرار الصيانة" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={2} sx={{ mt: 2 }} disabled={!canMutate} />
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>المطابقات ({rec.matched_count})</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>المرجع</TableCell>
                      <TableCell>الفاتورة</TableCell>
                      <TableCell>الإيصال</TableCell>
                      <TableCell>المبلغ</TableCell>
                      <TableCell>التوقيت</TableCell>
                      <TableCell>المحصل</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rec.matches.map((m) => (
                      <TableRow key={m.payment_id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{m.reference || '—'}</TableCell>
                        <TableCell>{m.invoice_number || '—'}</TableCell>
                        <TableCell>{m.receipt_number || '—'}</TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(m.amount)} {m.currency}</TableCell>
                        <TableCell>{new Date(m.collected_at).toLocaleString('ar-SD')}</TableCell>
                        <TableCell>{m.collected_by || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {rec.matches.length === 0 && (
                      <TableRow><TableCell colSpan={6}><Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>لا توجد مطابقات</Typography></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>الفروقات ({rec.discrepancy_count})</Typography>
              {rec.discrepancies.length ? <ReconciliationDiscrepancies discrepancies={rec.discrepancies} /> : <Typography color="text.secondary">لا توجد فروقات.</Typography>}
            </CardContent>
          </Card>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose}>إغلاق</Button>
        {canMutate && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<LockIcon />} disabled={working} onClick={handleSeal}>
              إغلاق بالمقارنة
            </Button>
            <Button variant="contained" startIcon={<FactCheckIcon />} disabled={working} onClick={handleResolve}>
              الحسم النهائي
            </Button>
          </Stack>
        )}
      </DialogActions>
    </Dialog>
  );
}