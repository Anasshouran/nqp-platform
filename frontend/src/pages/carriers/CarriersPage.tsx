import { useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';
import KeyIcon from '@mui/icons-material/Key';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageHeader } from '../../components/common';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import { useTableExport } from '../../hooks/useTableExport';
import { createCarrier, getCarriers, getCarrierApiKey, getFlights, getHealthNotices, regenerateCarrierApiKey, uploadManifest } from '../../api/endpoints/carriers';
import { getCountries } from '../../api/endpoints/public';
import { getMasterEntryPoints } from '../../api/endpoints/masterdata';
import type { PublicCountry } from '../../api/endpoints/public';
import type { MasterEntryPoint } from '../../types/masterdata';
import type { Carrier, Flight, HealthNotice } from '../../types/carrier';
import { flightStatus, flightType, noticeCategory, noticePriority } from '../../utils/status';
import { formatDateTime } from '../../utils/formatters';

const flightStatusOptions = Object.entries(flightStatus).map(([v, m]) => ({ value: v, label: m.label }));
const flightTypeOptions = Object.entries(flightType).map(([v, m]) => ({ value: v, label: m.label }));
const noticeCategoryOptions = Object.entries(noticeCategory).map(([v, m]) => ({ value: v, label: m.label }));
const companyTypeOptions = [
  { value: 'NATIONAL', label: 'شركة طيران وطنية' },
  { value: 'REGIONAL', label: 'شركة طيران إقليمية' },
  { value: 'INTERNATIONAL', label: 'شركة طيران دولية' },
  { value: 'CARGO', label: 'شركة شحن جوي/بحري' },
  { value: 'MARITIME', label: 'شركة ملاحة بحرية' },
  { value: 'LAND', label: 'شركة نقل بري' },
  { value: 'PRIVATE', label: 'خاصة' },
  { value: 'OTHER', label: 'أخرى' },
];

const FlightsTab = () => {
  const table = useServerTable<Flight>({ fetchData: getFlights });
  const { rows, count, loading, error, searchInput, setSearchInput, sortBy, sortOrder, setSorting, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;
  const { exporting, exportAll } = useTableExport(table.fetchAllRows);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [uploadTarget, setUploadTarget] = useState<Flight | null>(null);

  const handleUpload = (flight: Flight) => {
    setUploadTarget(flight);
    fileRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !uploadTarget) return;
    setUploadingFor(uploadTarget.id);
    setToast(null);
    try {
      const res = await uploadManifest(uploadTarget.id, file);
      const m = res.data?.data ?? res.data;
      const errCount =
        m && typeof m.error_report === 'object' && m.error_report !== null
          ? (m.error_report as { errors?: unknown[] }).errors?.length ?? 0
          : 0;
      setToast({
        type: 'success',
        text: errCount > 0
          ? `تمت معالجة الكشف (${m?.total_passengers ?? 0} مسافراً) مع ${errCount} سطراً بحاجة لمراجعة`
          : `تمت معالجة الكشف بنجاح (${m?.total_passengers ?? 0} مسافراً)`,
      });
      void refresh();
    } catch {
      setToast({ type: 'error', text: 'فشل رفع الكشف — تأكد من صحة ملف CSV' });
    } finally {
      setUploadingFor(null);
      setUploadTarget(null);
    }
  };

  const handleExport = () => exportAll({
    filename: `flights-${new Date().toISOString().slice(0, 10)}.csv`,
    headers: ['رقم الرحلة', 'الشركة', 'النوع', 'المغادرة', 'الوجهة', 'موعد الوصول', 'الحالة'],
    mapRow: (f) => [
      f.flight_number,
      f.carrier_name || '',
      flightType[f.flight_type]?.label || f.flight_type,
      `${f.origin_code || ''} ${f.origin_country_name || ''}`,
      f.destination_port_name || '',
      formatDateTime(f.scheduled_arrival),
      flightStatus[f.status]?.label || f.status,
    ],
    message: 'تم تصدير الرحلات',
  });

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt,text/csv"
        style={{ display: 'none' }}
        onChange={(e) => void handleFileChange(e)}
      />
      <DataTable<Flight>
        columns={[
          { key: 'flight_number', label: 'رقم الرحلة', sortable: true, render: (f) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{f.flight_number}</Typography> },
          { key: 'carrier_name', label: 'الشركة', render: (f) => f.carrier_name || '—', hideOnMobile: true },
          { key: 'flight_type', label: 'النوع', render: (f) => { const m = flightType[f.flight_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : f.flight_type; } },
          { key: 'origin', label: 'المغادرة', render: (f) => `${f.origin_code || ''} · ${f.origin_country_name || ''}`, hideOnMobile: true },
          { key: 'destination_port_name', label: 'الوجهة', render: (f) => f.destination_port_name || '—' },
          { key: 'scheduled_arrival', label: 'موعد الوصول', sortable: true, render: (f) => formatDateTime(f.scheduled_arrival), hideOnMobile: true },
          { key: 'status', label: 'الحالة', sortable: true, render: (f) => { const m = flightStatus[f.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : <StatusChip label={f.status} tone="neutral" />; } },
          {
            key: 'manifest', label: 'الكشف',
            render: (f) => (
              <Tooltip title="رفع كشف المسافرين (CSV)">
                <span>
                  <IconButton
                    size="small"
                    color={uploadingFor === f.id ? 'primary' : 'default'}
                    disabled={!!uploadingFor}
                    onClick={() => handleUpload(f)}
                    aria-label="رفع كشف"
                  >
                    <UploadFileIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            ),
          },
        ]}
        rows={rows}
        rowKey={(f) => f.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="الرحلات"
        subtitle={`${count} رحلة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث برقم الرحلة أو الشركة..."
        filters={[
          { key: 'status', label: 'الحالة', options: flightStatusOptions, value: '', onChange: (v) => setFilter('status', v) },
          { key: 'flight_type', label: 'النوع', options: flightTypeOptions, value: '', onChange: (v) => setFilter('flight_type', v) },
        ]}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSorting}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onExport={handleExport}
        exporting={exporting}
        onRefresh={refresh}
        emptyTitle="لا توجد رحلات"
        emptyDescription="الرحلات الواردة تظهر هنا عند تسجيلها"
      />
      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast?.type ?? 'info'} onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </>
  );
};

const CarrierFormDialog = ({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (msg: string) => void }) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<PublicCountry[]>([]);
  const [ports, setPorts] = useState<MasterEntryPoint[]>([]);
  const [form, setForm] = useState({
    name: '',
    name_en: '',
    iata_code: '',
    icao_code: '',
    company_type: 'NATIONAL',
    country: null as string | null,
    is_active: true,
    ports: [] as string[],
  });

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({ name: '', name_en: '', iata_code: '', icao_code: '', company_type: 'NATIONAL', country: null, is_active: true, ports: [] });
    void getCountries().then((r) => setCountries(r.data?.data ?? r.data ?? [])).catch(() => {});
    void getMasterEntryPoints({ page_size: 500 })
      .then((r) => setPorts(r.data?.data?.results ?? r.data?.data ?? []))
      .catch(() => {});
  }, [open]);

  const airportOptions = ports.filter((p) => p.kind === 'AIRPORT' || p.is_active);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError('الاسم بالعربية مطلوب');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await createCarrier({
        name: form.name.trim(),
        name_en: form.name_en.trim(),
        iata_code: form.iata_code.trim().toUpperCase() || null,
        icao_code: form.icao_code.trim().toUpperCase() || null,
        company_type: form.company_type,
        country: form.country,
        is_active: form.is_active,
        ports: form.ports,
      });
      onSaved(`تم اعتماد «${(res.data?.data ?? res.data)?.name}» (ID: ${(res.data?.data ?? res.data)?.iata_code || '—'})`);
      onClose();
    } catch {
      setError('تعذّر الحفظ — تحقق من عدم تكرار كود IATA/ICAO');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AddBusinessIcon color="primary" /> إضافة شركة طيران
        {busy && <LinearProgress sx={{ position: 'absolute', inset: '0 0 auto', width: '100%', borderRadius: '4px 4px 0 0' }} />}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="الاسم بالعربية" required fullWidth value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} size="small"
            />
            <TextField
              label="الاسم بالإنجليزية" fullWidth value={form.name_en}
              onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} size="small"
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="رمز IATA" value={form.iata_code} placeholder="J4" inputProps={{ maxLength: 3, style: { textTransform: 'uppercase' } }}
              onChange={(e) => setForm((f) => ({ ...f, iata_code: e.target.value.toUpperCase() }))} size="small"
            />
            <TextField
              label="رمز ICAO" value={form.icao_code} placeholder="BDR" inputProps={{ maxLength: 4, style: { textTransform: 'uppercase' } }}
              onChange={(e) => setForm((f) => ({ ...f, icao_code: e.target.value.toUpperCase() }))} size="small"
            />
            <TextField
              select label="نوع الشركة" value={form.company_type} fullWidth
              onChange={(e) => setForm((f) => ({ ...f, company_type: e.target.value }))} size="small"
            >
              {companyTypeOptions.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <Autocomplete
              fullWidth
              size="small"
              options={countries}
              getOptionLabel={(c) => (c.name_ar || c.name) + ` (${c.code})`}
              value={countries.find((c) => c.code === form.country) ?? null}
              onChange={(_, v) => setForm((f) => ({ ...f, country: v?.code ?? null }))}
              isOptionEqualToValue={(o, v) => o.code === v.code}
              renderInput={(p) => <TextField {...p} label="الدولة" />}
            />
            {form.country && (
              <FormControlLabel
                control={<Switch checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />}
                label={form.is_active ? 'نشطة' : 'معطلة'}
              />
            )}
          </Stack>
          <Autocomplete
            multiple
            size="small"
            options={airportOptions}
            getOptionLabel={(p) => (p.name_ar || p.name_en) + (p.code ? ` (${p.code})` : '')}
            value={airportOptions.filter((p) => form.ports.includes(p.code))}
            onChange={(_, v) => setForm((f) => ({ ...f, ports: v.map((p) => p.code) }))}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip size="small" label={option.name_ar || option.code} {...getTagProps({ index })} />
              ))
            }
            renderInput={(p) => <TextField {...p} label="المنافذ" placeholder="اختر منافذ الشركة…" />}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">إلغاء</Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={busy}>
          {busy ? 'جارٍ الحفظ…' : 'حفظ واعتماد'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CarrierApiKeyDialog = ({ carrier, open, onClose, onMessage }: { carrier: Carrier | null; open: boolean; onClose: () => void; onMessage: (msg: string) => void }) => {
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ api_key: string | null; created_at?: string | null; last_use_at?: string | null } | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    if (!carrier) return;
    setNewKey(null);
    getCarrierApiKey(carrier.id)
      .then((r) => setInfo(r.data?.data ?? r.data ?? null))
      .catch(() => setInfo(null));
  };

  useEffect(() => {
    if (open && carrier) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, carrier?.id]);

  if (!carrier) return null;

  const handleCopy = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      onMessage('تعذّر النسخ');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <KeyIcon color="primary" /> التكامل API — {carrier.name}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {info?.api_key && !newKey && (
            <Alert severity="success">مفتاح API مفعّل · أنشئ {info.created_at ? formatDateTime(info.created_at) : ''}</Alert>
          )}
          {newKey ? (
            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(21,101,192,0.06)', border: '1px dashed', borderColor: 'primary.light' }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                مفتاح جديد — لن يظهر مرة أخرى، احفظه الآن:
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ flex: 1, fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all' }} dir="ltr">
                  {newKey}
                </Typography>
                <Tooltip title="نسخ">
                  <IconButton onClick={() => void handleCopy()}>
                    <ContentCopyIcon fontSize="small" color={copied ? 'primary' : 'inherit'} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          ) : (
            <Alert severity="warning" icon={<RefreshIcon fontSize="inherit" />}>
              {info?.api_key ? 'إعادة توليد المفتاح تُبطل المفتاح الحالي وتوقف التكامل القائم.' : 'لا يوجد مفتاح API بعد — ولّد مفتاحاً لتفعيل التكامل مع أنظمة الشركة.'}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">إغلاق</Button>
        <Button
          variant="contained"
          color={info?.api_key ? 'error' : 'primary'}
          startIcon={<RefreshIcon />}
          disabled={busy || !!newKey}
          onClick={() => {
            if (!window.confirm('إعادة توليد المفتاح تُبطل الحالي؟')) return;
            setBusy(true);
            regenerateCarrierApiKey(carrier.id)
              .then((r) => {
                const d = r.data?.data ?? r.data;
                setNewKey(d?.api_key ?? null);
                onMessage('تم توليد مفتاح API جديد');
              })
              .catch(() => onMessage('فشل توليد المفتاح'))
              .finally(() => setBusy(false));
          }}
        >
          {busy ? 'جارٍ التوليد…' : info?.api_key ? 'إعادة توليد المفتاح' : 'توليد مفتاح API'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CarriersTab = () => {
  const table = useServerTable<Carrier>({ fetchData: getCarriers });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions } = table;
  const [formOpen, setFormOpen] = useState(false);
  const [keyCarrier, setKeyCarrier] = useState<Carrier | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; row: Carrier } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => setToast({ type, text });

  return (
    <>
      <DataTable<Carrier>
        columns={[
          { key: 'name', label: 'الاسم', sortable: true, render: (c) => (
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{c.name}</Typography>
              {c.name_en && <Typography variant="caption" color="text.secondary">{c.name_en}</Typography>}
            </Box>
          ) },
          { key: 'iata_code', label: 'كود IATA', render: (c) => c.iata_code || '—' },
          { key: 'icao_code', label: 'كود ICAO', render: (c) => c.icao_code || '—', hideOnMobile: true },
          { key: 'country_name', label: 'الدولة', render: (c) => c.country_name || '—', hideOnMobile: true },
          { key: 'ports_names', label: 'المنافذ', render: (c) => (c.ports_names?.length ? <Chip size="small" label={c.ports_names[0]} variant="outlined" /> : '—'), hideOnMobile: true },
          { key: 'company_type_label', label: 'النوع', render: (c) => c.company_type_label || '—', hideOnMobile: true },
          {
            key: 'is_active', label: 'الحالة',
            render: (c) => (
              <StatusChip
                label={c.is_active ? 'نشطة' : 'معطلة'}
                tone={c.is_active ? 'success' : 'neutral'}
              />
            ),
          },
        ]}
        rows={rows}
        rowKey={(c) => c.id}
        count={count}
        page={page}
        rowsPerPage={rowsPerPage}
        pageSizeOptions={pageSizeOptions}
        loading={loading}
        error={error}
        title="شركات النقل"
        subtitle={`${count} شركة`}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="بحث بالاسم أو الكود..."
        toolbar={
          <Button variant="contained" startIcon={<AddBusinessIcon />} onClick={() => setFormOpen(true)}>
            إضافة شركة طيران
          </Button>
        }
        actions={(c) => (
          <>
            <IconButton
              size="small"
              aria-label="إجراءات"
              onClick={(e) => setMenuAnchor({ el: e.currentTarget, row: c })}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu
              anchorEl={menuAnchor?.el}
              open={!!menuAnchor && menuAnchor.row.id === c.id}
              onClose={() => setMenuAnchor(null)}
            >
              <MenuItem onClick={() => { setKeyCarrier(c); setMenuAnchor(null); }}>
                <KeyIcon fontSize="small" sx={{ mr: 1 }} /> إعداد التكامل API
              </MenuItem>
            </Menu>
          </>
        )}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRefresh={refresh}
        emptyTitle="لا توجد شركات نقل"
        emptyDescription="شركات النقل الجوي والبحري والبري تظهر هنا"
      />

      <CarrierFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={(msg) => { showToast(msg); void refresh(); }}
      />
      <CarrierApiKeyDialog
        carrier={keyCarrier}
        open={!!keyCarrier}
        onClose={() => setKeyCarrier(null)}
        onMessage={(msg) => showToast(msg, msg.startsWith('فشل') ? 'error' : 'success')}
      />
      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.type ?? 'info'} onClose={() => setToast(null)} sx={{ width: '100%' }}>
          {toast?.text}
        </Alert>
      </Snackbar>
    </>
  );
};

const NoticesTab = () => {
  const table = useServerTable<HealthNotice>({ fetchData: getHealthNotices });
  const { rows, count, loading, error, searchInput, setSearchInput, setPage, rowsPerPage, setRowsPerPage, refresh, page, pageSizeOptions, setFilter } = table;

  return (
    <DataTable<HealthNotice>
      columns={[
        { key: 'title', label: 'العنوان', sortable: true, render: (n) => <Typography sx={{ fontWeight: 700 }}>{n.title}</Typography> },
        { key: 'category', label: 'الفئة', render: (n) => { const m = noticeCategory[n.category]; return m ? <StatusChip label={m.label} tone={m.tone} /> : n.category; } },
        { key: 'priority', label: 'الأولوية', render: (n) => { const m = noticePriority[n.priority]; return m ? <StatusChip label={m.label} tone={m.tone} /> : n.priority; }, hideOnMobile: true },
        { key: 'published_at', label: 'تاريخ النشر', sortable: true, render: (n) => formatDateTime(n.published_at), hideOnMobile: true },
        { key: 'is_active', label: 'الحالة', render: (n) => (n.is_active ? <StatusChip label="نشط" tone="success" /> : <StatusChip label="معطل" tone="neutral" />) },
      ]}
      rows={rows}
      rowKey={(n) => n.id}
      count={count}
      page={page}
      rowsPerPage={rowsPerPage}
      pageSizeOptions={pageSizeOptions}
      loading={loading}
      error={error}
      title="الإشعارات الصحية"
      subtitle={`${count} إشعار`}
      searchInput={searchInput}
      onSearchChange={setSearchInput}
      searchPlaceholder="بحث بالعنوان..."
      filters={[
        { key: 'category', label: 'الفئة', options: noticeCategoryOptions, value: '', onChange: (v) => setFilter('category', v) },
      ]}
      onPageChange={setPage}
      onRowsPerPageChange={setRowsPerPage}
      onRefresh={refresh}
      emptyTitle="لا توجد إشعارات"
      emptyDescription="الإشعارات الصحية للمسافرين تظهر هنا"
    />
  );
};

const CarriersPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <PageHeader
        title="شركات النقل والرحلات"
        subtitle="متابعة الرحلات وشركات النقل والإشعارات الصحية"
        eyebrow="العمليات"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { borderRadius: 2 } }}>
        <Tab label="الرحلات" />
        <Tab label="شركات النقل" />
        <Tab label="الإشعارات الصحية" />
      </Tabs>
      {tab === 0 ? <FlightsTab /> : tab === 1 ? <CarriersTab /> : <NoticesTab />}
    </Box>
  );
};

export default CarriersPage;
