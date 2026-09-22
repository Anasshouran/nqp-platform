import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import { closeFocus, createFocus, getFoci, retreatFocus } from '../../../api/endpoints/vectorControl';
import type { VectorFocus } from '../../../types/vectorControl';
import { vectorFocusOrigin, vectorFocusStatus, vectorFocusWaterSource, vectorSeverity, vectorTypeMap } from '../../../utils/status';
import { useVectorLookups } from '../hooks/useVectorLookups';
import { FieldGrid, SectionCard, SectionHeading, ToggleForm } from './common';
import { formatDate } from '../../../utils/formatters';
import { OfflineQueuedError } from '../../../utils/vectorOffline';

const NewFocusForm = ({ onSaved }: { onSaved: () => void }) => {
  const lk = useVectorLookups();
  const [form, setForm] = useState({
    entry_point: '',
    site: '',
    vector: '',
    severity: 'MEDIUM',
    water_source: 'CONTAINERS',
    focus_size: '',
    gps_latitude: '',
    gps_longitude: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.entry_point) return;
    setSaving(true);
    try {
      await createFocus({
        ...form,
        site: form.site || null,
        vector: form.vector || null,
        focus_size: Number(form.focus_size) || null,
        gps_latitude: form.gps_latitude || null,
        gps_longitude: form.gps_longitude || null,
      });
      setForm((f) => ({ ...f, site: '', vector: '', focus_size: '', gps_latitude: '', gps_longitude: '', description: '' }));
      onSaved();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر حفظ البؤرة — تأكد من نقطة الدخول');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ToggleForm open={true} onToggle={() => {}} title="بؤرة جديدة">
      <FieldGrid>
        <TextField select required label="نقطة الدخول" value={form.entry_point} onChange={(e) => setForm((f) => ({ ...f, entry_point: e.target.value }))}>
          {lk.entryPoints.map((e) => (<MenuItem key={e.id} value={e.id}>{e.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="الموقع" value={form.site} onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.sites.filter((s) => !form.entry_point || s.entry_point === form.entry_point).map((s) => (<MenuItem key={s.id} value={s.id}>{s.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="الناقل" value={form.vector} onChange={(e) => setForm((f) => ({ ...f, vector: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.vectors.map((v) => (<MenuItem key={v.id} value={v.id}>{v.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="الخطورة" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
          {Object.entries(vectorSeverity).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
        </TextField>
        <TextField select label="مصدر المياه" value={form.water_source} onChange={(e) => setForm((f) => ({ ...f, water_source: e.target.value }))}>
          {Object.entries(vectorFocusWaterSource).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
        </TextField>
        <TextField type="number" label="حجم البؤرة (م²)" value={form.focus_size} onChange={(e) => setForm((f) => ({ ...f, focus_size: e.target.value }))} />
        <TextField label="خط العرض GPS" value={form.gps_latitude} onChange={(e) => setForm((f) => ({ ...f, gps_latitude: e.target.value }))} />
        <TextField label="خط الطول GPS" value={form.gps_longitude} onChange={(e) => setForm((f) => ({ ...f, gps_longitude: e.target.value }))} />
      </FieldGrid>
      <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="وصف البؤرة" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={submit} disabled={saving || !form.entry_point}>{saving ? 'جارٍ الحفظ...' : 'حفظ البؤرة'}</Button>
      </Box>
    </ToggleForm>
  );
};

const FociSection = () => {
  const t = useServerTable<VectorFocus>({ fetchData: getFoci });
  const [formOpen, setFormOpen] = useState(false);

  const act = (p: Promise<unknown>) => p.then(() => t.refresh()).catch((err) => { if (!(err instanceof OfflineQueuedError)) window.alert('فشلت العملية'); });

  return (
    <SectionCard id="foci">
      <SectionHeading
        icon={<MyLocationIcon color="error" />}
        title="البؤر"
        subtitle="بؤر تكاثر النواقل ومتابعة المعالجة والإغلاق"
        action={<Button size="small" variant="contained" onClick={() => setFormOpen((o) => !o)}>{formOpen ? 'إخفاء' : 'بؤرة جديدة'}</Button>}
      />
      {formOpen && <NewFocusForm onSaved={() => t.refresh()} />}
      <DataTable<VectorFocus>
        columns={[
          { key: 'focus_number', label: 'الرقم', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.focus_number}</Typography> },
          { key: 'entry_point_name', label: 'نقطة الدخول' },
          { key: 'vector_name', label: 'الناقل', render: (r) => (r.vector_name ? <Box>{r.vector_name}{r.vector_type ? <StatusChip label={vectorTypeMap[r.vector_type]?.label ?? r.vector_type} tone={vectorTypeMap[r.vector_type]?.tone ?? 'neutral'} /> : null}</Box> : '—'), hideOnMobile: true },
          { key: 'severity', label: 'الخطورة', render: (r) => { const m = vectorSeverity[r.severity]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.severity; } },
          { key: 'status', label: 'الحالة', render: (r) => { const m = vectorFocusStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
          { key: 'water_source', label: 'مصدر المياه', render: (r) => { const m = vectorFocusWaterSource[r.water_source]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.water_source; }, hideOnMobile: true },
          { key: 'origin', label: 'المصدر', render: (r) => r.origin_display || r.origin, hideOnMobile: true },
          { key: 'opened_at', label: 'تاريخ الفتح', render: (r) => formatDate(r.opened_at), hideOnMobile: true },
          { key: 'sector_code', label: 'القطاع', render: (r) => r.sector_code || '—', hideOnMobile: true },
          {
            key: 'actions', label: 'إجراءات', sortable: false,
            render: (r) => (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {r.status !== 'CLOSED' && (
                  <Button size="small" variant="outlined" color="error" onClick={() => { const n = window.prompt('سبب الإغلاق (اختياري):') ?? ''; act(closeFocus(r.id, n)); }}>إغلاق</Button>
                )}
                {r.status === 'CLOSED' && (
                  <Button size="small" variant="outlined" onClick={() => act(retreatFocus(r.id))}>إعادة فتح</Button>
                )}
              </Box>
            ),
          },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="البؤر" subtitle={`${t.count} بؤرة`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالرقم أو المنفذ أو الوصف..."
        filters={[
          { key: 'status', label: 'الحالة', options: Object.entries(vectorFocusStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
          { key: 'severity', label: 'الخطورة', options: Object.entries(vectorSeverity).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('severity', v) },
        ]}
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
        emptyTitle="لا توجد بؤر" emptyDescription="بؤر تكاثر النواقل تظهر هنا"
      />
    </SectionCard>
  );
};

export default FociSection;