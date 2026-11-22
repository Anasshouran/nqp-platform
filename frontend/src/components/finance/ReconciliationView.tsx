import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  getFinanceReconciliationTotals,
  createFinanceReconciliation,
  getFinanceReconciliationPreview,
  sealFinanceReconciliation,
  resolveFinanceReconciliation,
} from '../../api/endpoints/finance';
import {
  CHANNEL_LABELS,
  RECONCILIATION_STATUS_LABELS,
  labelOf,
  optionsOf,
  type FinanceReconciliation,
  type FinanceReconciliationDiscrepancy,
  type ReconciliationPreview,
  type Locale,
} from '../../types/finance';
import SectionTitle from '../../components/common/SectionTitle';
import StatCard from '../../components/common/StatCard';
import { DataTable } from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';

type MoneyFormatter = (v: string | number | null | undefined) => string;
type DateFormatter = (iso?: string | null) => string;

export default function ReconciliationView(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const locale: Locale = i18n.language === 'en' ? 'en' : 'ar';
  const intlLocale = locale === 'en' ? 'en-US' : 'ar-SD';

  const STATUS_TONES: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
    DRAFT: 'default',
    MATCHED: 'success',
    DISCREPANCY: 'warning',
    RESOLVED: 'success',
  };
  const channelLabel = useCallback((c: string) => labelOf(CHANNEL_LABELS, c, locale), [locale]);
  const statusLabel = useCallback((s: string) => labelOf(RECONCILIATION_STATUS_LABELS, s, locale), [locale]);
  const channelOptions = useMemo(() => optionsOf(CHANNEL_LABELS, locale), [locale]);
  const statusOptions = useMemo(() => optionsOf(RECONCILIATION_STATUS_LABELS, locale), [locale]);
  const fmtMoney = useMemo<MoneyFormatter>(
    () => (v) => new Intl.NumberFormat(intlLocale).format(Number(v ?? 0)),
    [intlLocale],
  );
  const fmtDate = useMemo<DateFormatter>(
    () => (iso) => (iso ? new Date(iso).toLocaleDateString(intlLocale) : '—'),
    [intlLocale],
  );

  const [totals, setTotals] = useState<Record<string, number>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<FinanceReconciliation | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [channelValue, setChannelValue] = useState('');
  const [statusValue, setStatusValue] = useState('');

  const table = useServerTable<FinanceReconciliation>({
    fetchData: getFinanceReconciliations,
    initialPageSize: 25,
  });
  const {
    rows, count, loading: tableLoading, error: tableError, page, pageSizeOptions,
    setPage, setRowsPerPage, refresh, setFilter,
  } = table;

  // F4b — one source for the table (table.count) and a single server-side
  // aggregate for the status cards (no client-side all-rows loop).
  const reloadTotals = useCallback(async () => {
    try {
      const res = await getFinanceReconciliationTotals();
      setTotals(res.data.data ?? {});
    } catch {
      setTotals({}); // silent — cards fall back to 0
    }
  }, []);

  useEffect(() => {
    void reloadTotals();
  }, [reloadTotals]);

  const afterMutate = async () => {
    setCreateOpen(false);
    setDetail(null);
    await refresh();
    await reloadTotals();
  };

  return (
    <>
      <SectionTitle
        title={t('finance.reconciliation.title')}
        subtitle={t('finance.reconciliation.subtitle')}
      />
      {errorMsg && (
        <Typography color="error" sx={{ mb: 2 }}>{errorMsg}</Typography>
      )}

      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2.5 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          {t('finance.reconciliation.actions.new')}
        </Button>
      </Stack>

      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label={t('finance.reconciliation.statCards.total')} value={count} trend={{ label: t('finance.reconciliation.statCards.totalTrend') }} icon={<SyncAltIcon />} accent="primary.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label={t('finance.reconciliation.statCards.matched')} value={totals.MATCHED ?? 0} trend={{ label: t('finance.reconciliation.statCards.matchedTrend') }} icon={<FactCheckIcon />} accent="success.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label={t('finance.reconciliation.statCards.pending')} value={(totals.DISCREPANCY ?? 0) + (totals.DRAFT ?? 0)} trend={{ label: t('finance.reconciliation.statCards.pendingTrend') }} icon={<LockIcon />} accent="warning.main" />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatCard label={t('finance.reconciliation.statCards.resolved')} value={totals.RESOLVED ?? 0} trend={{ label: t('finance.reconciliation.statCards.resolvedTrend') }} icon={<VerifiedUserIcon />} accent="secondary.main" />
        </Grid>
      </Grid>

      <DataTable<FinanceReconciliation>
        columns={[
          { key: 'period', label: t('finance.reconciliation.columns.period'), render: (r) => <Typography sx={{ whiteSpace: 'nowrap' }}>{fmtDate(r.period_start)} ← {fmtDate(r.period_end)}</Typography> },
          { key: 'channel', label: t('finance.reconciliation.columns.channel'), render: (r) => channelLabel(r.channel), hideOnMobile: true },
          { key: 'system_total', label: t('finance.reconciliation.columns.systemTotal'), sortable: true, render: (r) => <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(r.system_total)}</Typography> },
          { key: 'channel_total', label: t('finance.reconciliation.columns.channelTotal'), render: (r) => <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(r.channel_total)}</Typography>, hideOnMobile: true },
          { key: 'difference', label: t('finance.reconciliation.columns.difference'), sortable: true, render: (r) => {
            const diff = Number(r.difference);
            return <Typography sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: diff === 0 ? 'success.main' : 'error.main' }}>{fmtMoney(diff)}</Typography>;
          } },
          { key: 'matched_count', label: t('finance.reconciliation.columns.matchedCount'), render: (r) => <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.matched_count}</Typography>, hideOnMobile: true },
          { key: 'discrepancy_count', label: t('finance.reconciliation.columns.discrepancyCount'), render: (r) => <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>{r.discrepancy_count}</Typography>, hideOnMobile: true },
          { key: 'status', label: t('finance.reconciliation.columns.status'), sortable: true, render: (r) => (
            <Chip size="small" label={statusLabel(r.status)} color={STATUS_TONES[r.status] ?? 'default'} variant="outlined" />
          ) },
          { key: 'created_by_name', label: t('finance.reconciliation.columns.createdBy'), render: (r) => r.created_by_name || '—', hideOnMobile: true },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        count={count}
        page={page}
        rowsPerPage={table.rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={tableLoading}
        error={tableError}
        title={t('finance.reconciliation.section.title')}
        subtitle={t('finance.reconciliation.section.subtitle', { count })}
        filters={[
          {
            key: 'channel',
            label: t('finance.reconciliation.filters.channel'),
            options: channelOptions,
            value: channelValue,
            onChange: (v) => { setChannelValue(v); setFilter('channel', v); },
          },
          {
            key: 'status',
            label: t('finance.reconciliation.filters.status'),
            options: statusOptions,
            value: statusValue,
            onChange: (v) => { setStatusValue(v); setFilter('status', v); },
          },
        ]}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        actionsLabel={t('finance.reconciliation.columns.actions')}
        actions={(r) => (
          <IconButton size="small" aria-label={t('finance.reconciliation.actions.view')} onClick={() => setDetail(r)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        )}
        emptyTitle={t('finance.reconciliation.empty.list')}
        emptyDescription={t('finance.reconciliation.empty.listHint')}
      />

      <CreateReconciliationDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={afterMutate}
        onNotify={setErrorMsg}
        locale={locale}
        fmtMoney={fmtMoney}
      />
      {detail && (
        <ReconciliationDetailDialog
          reconciliation={detail}
          onClose={() => setDetail(null)}
          onUpdated={afterMutate}
          onNotify={setErrorMsg}
          locale={locale}
          fmtMoney={fmtMoney}
          fmtDate={fmtDate}
          tone={STATUS_TONES[detail.status] ?? 'default'}
        />
      )}
    </>
  );
}

function CreateReconciliationDialog({ open, onClose, onCreated, onNotify, locale, fmtMoney }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onNotify: (m: string) => void;
  locale: Locale;
  fmtMoney: MoneyFormatter;
}): React.JSX.Element {
  const { t } = useTranslation();
  const channelOptions = useMemo(() => optionsOf(CHANNEL_LABELS, locale), [locale]);
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
      onNotify((e as AxiosError<{ message?: string }>).response?.data?.message ?? t('finance.reconciliation.errors.preview'));
    } finally {
      setLoading(false);
    }
  }, [form, onNotify, t]);

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
      onNotify((e as AxiosError<{ message?: string }>).response?.data?.message ?? t('finance.reconciliation.errors.create'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('finance.reconciliation.form.newDialog')}</Typography>
          <IconButton onClick={onClose} size="small" aria-label={t('finance.reconciliation.actions.close')} sx={{ borderRadius: 2 }}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            <TextField label={t('finance.reconciliation.form.periodStart')} type="date" value={form.period_start} onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))} />
            <TextField label={t('finance.reconciliation.form.periodEnd')} type="date" value={form.period_end} onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))} />
            <TextField select label={t('finance.reconciliation.form.channel')} value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))} sx={{ minWidth: 220 }}>
              {channelOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </TextField>
            <TextField label={t('finance.reconciliation.form.channelTotal')} type="number" value={form.channel_total} onChange={(e) => setForm((f) => ({ ...f, channel_total: e.target.value }))} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<FactCheckIcon />} disabled={loading} onClick={runPreview}>
              {loading ? <CircularProgress size={18} /> : t('finance.reconciliation.actions.preview')}
            </Button>
          </Stack>

          {preview && (
            <>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t('finance.reconciliation.form.previewHint', {
                  total: fmtMoney(preview.system_total),
                  matched: preview.matched_count,
                  discrepancy: preview.discrepancy_count,
                })}
              </Typography>
              {preview.discrepancy_count > 0 && (
                <ReconciliationDiscrepancies discrepancies={preview.discrepancies} fmtMoney={fmtMoney} />
              )}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>{t('finance.reconciliation.actions.cancel')}</Button>
        <Button variant="contained" disabled={saving} startIcon={<AddIcon />} onClick={handleSave}>
          {saving ? <CircularProgress size={18} /> : t('finance.reconciliation.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReconciliationDiscrepancies({ discrepancies, fmtMoney }: {
  discrepancies: FinanceReconciliationDiscrepancy[];
  fmtMoney: MoneyFormatter;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('finance.reconciliation.discrepancies.type')}</TableCell>
            <TableCell>{t('finance.reconciliation.discrepancies.ref')}</TableCell>
            <TableCell>{t('finance.reconciliation.discrepancies.invoice')}</TableCell>
            <TableCell>{t('finance.reconciliation.discrepancies.amount')}</TableCell>
            <TableCell>{t('finance.reconciliation.discrepancies.description')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {discrepancies.map((d, idx) => (
            <TableRow key={idx}>
              <TableCell><Chip size="small" color="warning" variant="outlined" label={d.type === 'duplicate_reference' ? t('finance.reconciliation.discrepancies.duplicateRef') : t('finance.reconciliation.discrepancies.noRef')} /></TableCell>
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

function ReconciliationDetailDialog({ reconciliation: rec, onClose, onUpdated, onNotify, locale, fmtMoney, fmtDate, tone }: {
  reconciliation: FinanceReconciliation;
  onClose: () => void;
  onUpdated: () => void;
  onNotify: (m: string) => void;
  locale: Locale;
  fmtMoney: MoneyFormatter;
  fmtDate: DateFormatter;
  tone: 'default' | 'success' | 'warning' | 'error';
}): React.JSX.Element {
  const { t } = useTranslation();
  const [systemTotal, setSystemTotal] = useState(String(rec.system_total ?? ''));
  const [channelTotal, setChannelTotal] = useState(String(rec.channel_total ?? ''));
  const [notes, setNotes] = useState(rec.investigation_notes ?? '');
  const [working, setWorking] = useState(false);
  const diff = Number(rec.difference);
  const canMutate = rec.status !== 'RESOLVED';

  const handleSeal = async () => {
    setWorking(true);
    try {
      await sealFinanceReconciliation(rec.id, { system_total: systemTotal || null, channel_total: channelTotal || null, investigation_notes: notes });
      onUpdated();
    } catch (e) {
      onNotify((e as AxiosError<{ message?: string }>).response?.data?.message ?? t('finance.reconciliation.errors.seal'));
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
      onNotify((e as AxiosError<{ message?: string }>).response?.data?.message ?? t('finance.reconciliation.errors.resolve'));
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
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {t('finance.reconciliation.detail.title', { start: fmtDate(rec.period_start), end: fmtDate(rec.period_end) })}
            </Typography>
            <Chip size="small" color={tone} variant="outlined" label={labelOf(RECONCILIATION_STATUS_LABELS, rec.status, locale)} />
          </Stack>
          <IconButton onClick={onClose} size="small" aria-label={t('finance.reconciliation.actions.close')} sx={{ borderRadius: 2 }}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Typography variant="body2" color="text.secondary">{t('finance.reconciliation.detail.channel')}: <b>{labelOf(CHANNEL_LABELS, rec.channel, locale)}</b></Typography>
            <Typography variant="body2" color="text.secondary">{t('finance.reconciliation.detail.createdBy')}: <b>{rec.created_by_name || '—'}</b></Typography>
            <Typography variant="body2" color="text.secondary">{t('finance.reconciliation.detail.reconciledBy')}: <b>{rec.reconciled_by_name || '—'}</b> {rec.reconciled_at ? ` (${fmtDate(rec.reconciled_at)})` : ''}</Typography>
          </Stack>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{t('finance.reconciliation.detail.totalsSection')}</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="flex-end" useFlexGap>
                <TextField label={t('finance.reconciliation.form.systemTotal')} type="number" value={systemTotal} onChange={(e) => setSystemTotal(e.target.value)} disabled={!canMutate} />
                <TextField label={t('finance.reconciliation.form.channelTotalSDG')} type="number" value={channelTotal} onChange={(e) => setChannelTotal(e.target.value)} disabled={!canMutate} />
                <Box>
                  <Typography variant="caption" color="text.secondary">{t('finance.reconciliation.detail.finalDiff')}</Typography>
                  <Typography sx={{ fontWeight: 700, color: diff === 0 ? 'success.main' : 'error.main' }}>{fmtMoney(diff)}</Typography>
                </Box>
              </Stack>
              <TextField label={t('finance.reconciliation.form.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={2} sx={{ mt: 2 }} disabled={!canMutate} />
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{t('finance.reconciliation.detail.matchesSection', { count: rec.matched_count })}</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('finance.reconciliation.matches.ref')}</TableCell>
                      <TableCell>{t('finance.reconciliation.matches.invoice')}</TableCell>
                      <TableCell>{t('finance.reconciliation.matches.receipt')}</TableCell>
                      <TableCell>{t('finance.reconciliation.matches.amount')}</TableCell>
                      <TableCell>{t('finance.reconciliation.matches.time')}</TableCell>
                      <TableCell>{t('finance.reconciliation.matches.collector')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rec.matches.map((m) => (
                      <TableRow key={m.payment_id}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{m.reference || '—'}</TableCell>
                        <TableCell>{m.invoice_number || '—'}</TableCell>
                        <TableCell>{m.receipt_number || '—'}</TableCell>
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(m.amount)} {m.currency}</TableCell>
                        <TableCell>{new Date(m.collected_at).toLocaleString(locale === 'en' ? 'en-US' : 'ar-SD')}</TableCell>
                        <TableCell>{m.collected_by || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {rec.matches.length === 0 && (
                      <TableRow><TableCell colSpan={6}><Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>{t('finance.reconciliation.empty.matches')}</Typography></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>{t('finance.reconciliation.detail.discrepanciesSection', { count: rec.discrepancy_count })}</Typography>
              {rec.discrepancies.length
                ? <ReconciliationDiscrepancies discrepancies={rec.discrepancies} fmtMoney={fmtMoney} />
                : <Typography color="text.secondary">{t('finance.reconciliation.empty.discrepancies')}</Typography>}
            </CardContent>
          </Card>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={onClose}>{t('finance.reconciliation.actions.close')}</Button>
        {canMutate && (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<LockIcon />} disabled={working} onClick={handleSeal}>
              {t('finance.reconciliation.actions.closeByCompare')}
            </Button>
            <Button variant="contained" startIcon={<FactCheckIcon />} disabled={working} onClick={handleResolve}>
              {t('finance.reconciliation.actions.finalResolution')}
            </Button>
          </Stack>
        )}
      </DialogActions>
    </Dialog>
  );
}