import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import { createInspection, getInspections, submitInspection } from '../../../api/endpoints/vectorControl';
import type { VectorInspection } from '../../../types/vectorControl';
import { vectorInspectionPurpose, vectorInspectionStatus, vectorSeverity } from '../../../utils/status';
import { useVectorLookups } from '../hooks/useVectorLookups';
import { FieldGrid, SectionCard, SectionHeading, ToggleForm } from './common';
import { formatDateTime } from '../../../utils/formatters';
import { OfflineQueuedError } from '../../../utils/vectorOffline';

const FOUND_LABELS: { key: string; label: string }[] = [
  { key: 'adult_mosquito', label: 'بعوض بالغ' },
  { key: 'larvae', label: 'يرقات' },
  { key: 'flies', label: 'ذباب' },
  { key: 'rodents', label: 'قوارض' },
  { key: 'cockroaches', label: 'صراصير' },
  { key: 'other_vectors', label: 'نواقل أخرى' },
];

const NewInspectionForm = ({ onSaved }: { onSaved: () => void }) => {
  const lk = useVectorLookups();
  const [form, setForm] = useState({
    entry_point: '',
    site: '',
    team: '',
    purpose: 'ROUTINE',
    visit_datetime: '',
    adult_mosquito: false,
    larvae: false,
    flies: false,
    rodents: false,
    cockroaches: false,
    other_vectors: false,
    foci_count: '0',
    gps_latitude: '',
    gps_longitude: '',
    hazards_found: '',
    notes: '',
    findings_severity: 'MEDIUM',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.entry_point) return;
    setSaving(true);
    try {
      await createInspection({
        entry_point: form.entry_point,
        site: form.site || null,
        team: form.team || null,
        purpose: form.purpose,
        visit_datetime: form.visit_datetime || undefined,
        adult_mosquito: form.adult_mosquito,
        larvae: form.larvae,
        flies: form.flies,
        rodents: form.rodents,
        cockroaches: form.cockroaches,
        other_vectors: form.other_vectors,
        foci_count: Number(form.foci_count) || 0,
        gps_latitude: form.gps_latitude || null,
        gps_longitude: form.gps_longitude || null,
        hazards_found: form.hazards_found,
        notes: form.notes,
        findings_severity: form.findings_severity,
      });
      setForm((f) => ({
        ...f, site: '', team: '', visit_datetime: '', adult_mosquito: false, larvae: false, flies: false,
        rodents: false, cockroaches: false, other_vectors: false, foci_count: '0',
        gps_latitude: '', gps_longitude: '', hazards_found: '', notes: '',
      }));
      onSaved();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر حفظ التفتيش — تأكد من نقطة الدخول');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ToggleForm open={true} onToggle={() => {}} title="تفتيش جديد">
      <FieldGrid>
        <TextField select required label="نقطة الدخول" value={form.entry_point} onChange={(e) => setForm((f) => ({ ...f, entry_point: e.target.value }))}>
          {lk.entryPoints.map((e) => (<MenuItem key={e.id} value={e.id}>{e.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="الموقع" value={form.site} onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.sites.filter((s) => !form.entry_point || s.entry_point === form.entry_point).map((s) => (<MenuItem key={s.id} value={s.id}>{s.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="الفريق" value={form.team} onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.teams.map((tm) => (<MenuItem key={tm.id} value={tm.id}>{tm.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="الغرض" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}>
          {Object.entries(vectorInspectionPurpose).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
        </TextField>
        <TextField select label="مستوى الخطورة" value={form.findings_severity} onChange={(e) => setForm((f) => ({ ...f, findings_severity: e.target.value }))}>
          {Object.entries(vectorSeverity).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
        </TextField>
        <TextField type="datetime-local" label="تاريخ الزيارة" value={form.visit_datetime} onChange={(e) => setForm((f) => ({ ...f, visit_datetime: e.target.value }))} />
        <TextField type="number" label="عدد البؤر المكتشفة" value={form.foci_count} onChange={(e) => setForm((f) => ({ ...f, foci_count: e.target.value }))} />
        <TextField label="خط العرض GPS" value={form.gps_latitude} onChange={(e) => setForm((f) => ({ ...f, gps_latitude: e.target.value }))} />
        <TextField label="خط الطول GPS" value={form.gps_longitude} onChange={(e) => setForm((f) => ({ ...f, gps_longitude: e.target.value }))} />
      </FieldGrid>
      <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 0.5 }}>
        {FOUND_LABELS.map(({ key, label }) => (
          <FormControlLabel
            key={key}
            control={<Checkbox checked={(form as unknown as Record<string, boolean>)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} />}
            label={label}
          />
        ))}
      </Box>
      <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="المخاطر المكتشفة" value={form.hazards_found} onChange={(e) => setForm((f) => ({ ...f, hazards_found: e.target.value }))} />
      <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="ملاحظات المفتش" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={submit} disabled={saving || !form.entry_point}>{saving ? 'جارٍ الحفظ...' : 'حفظ التفتيش'}</Button>
      </Box>
    </ToggleForm>
  );
};

const InspectionsSection = () => {
  const t = useServerTable<VectorInspection>({ fetchData: getInspections });
  const [formOpen, setFormOpen] = useState(false);

  const act = (p: Promise<unknown>) => p.then(() => t.refresh()).catch((err) => { if (!(err instanceof OfflineQueuedError)) window.alert('فشلت العملية'); });

  const foundCount = (r: VectorInspection) => FOUND_LABELS.filter(({ key }) => (r as unknown as Record<string, boolean>)[key]).length;

  return (
    <SectionCard id="inspections">
      <SectionHeading
        icon={<FactCheckIcon color="info" />}
        title="التفتيش"
        subtitle="تفتيش بيئة نقاط الدخول ورصد المواقع"
        action={<Button size="small" variant="contained" onClick={() => setFormOpen((o) => !o)}>{formOpen ? 'إخفاء' : 'تفتيش جديد'}</Button>}
      />
      {formOpen && <NewInspectionForm onSaved={() => t.refresh()} />}
      <DataTable<VectorInspection>
        columns={[
          { key: 'inspection_number', label: 'الرقم', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.inspection_number}</Typography> },
          { key: 'entry_point_name', label: 'نقطة الدخول' },
          { key: 'purpose', label: 'الغرض', render: (r) => r.purpose_display || r.purpose, hideOnMobile: true },
          { key: 'status', label: 'الحالة', render: (r) => { const m = vectorInspectionStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
          { key: 'findings_severity', label: 'الخطورة', render: (r) => { const m = vectorSeverity[r.findings_severity]; return m ? <StatusChip label={m.label} tone={m.tone} /> : '—'; } },
          { key: 'found', label: 'النواقل المكتشفة', render: (r) => `${foundCount(r)} نوع` },
          { key: 'foci_count', label: 'بؤر', render: (r) => r.foci_count ?? 0, hideOnMobile: true },
          { key: 'visit_datetime', label: 'التاريخ', render: (r) => formatDateTime(r.visit_datetime), hideOnMobile: true },
          { key: 'inspector_name', label: 'المفتش', hideOnMobile: true },
          {
            key: 'actions', label: 'إجراءات', sortable: false,
            render: (r) => (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {r.status === 'DRAFT' && (
                  <Button size="small" variant="outlined" onClick={() => act(submitInspection(r.id))}>تأكيد التقديم</Button>
                )}
              </Box>
            ),
          },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="التفتيش" subtitle={`${t.count} تفتيش`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالرقم أو المنفذ..."
        filters={[
          { key: 'status', label: 'الحالة', options: Object.entries(vectorInspectionStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
          { key: 'purpose', label: 'الغرض', options: Object.entries(vectorInspectionPurpose).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('purpose', v) },
        ]}
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
        emptyTitle="لا يوجد تفتيش" emptyDescription="تقارير التفتيش تظهر هنا"
      />
    </SectionCard>
  );
};

export default InspectionsSection;