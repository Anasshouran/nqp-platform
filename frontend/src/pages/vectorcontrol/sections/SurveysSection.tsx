import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import { approveSurvey, createSurvey, getSurveys, openFocusFromSurvey } from '../../../api/endpoints/vectorControl';
import type { VectorSurvey } from '../../../types/vectorControl';
import { vectorSurveyMethod, vectorSurveyStatus, vectorDensity } from '../../../utils/status';
import { useVectorLookups } from '../hooks/useVectorLookups';
import { FieldGrid, SectionCard, SectionHeading, ToggleForm } from './common';
import { formatDate } from '../../../utils/formatters';
import { OfflineQueuedError } from '../../../utils/vectorOffline';

const NewSurveyForm = ({ onSaved }: { onSaved: () => void }) => {
  const lk = useVectorLookups();
  const [form, setForm] = useState({
    entry_point: '',
    site: '',
    vector: '',
    method: 'LARVAL_DIPPING',
    area: '',
    team: '',
    survey_date: '',
    house_index: '',
    breteau_index: '',
    container_index: '',
    breeding_sites: '0',
    density: 'LOW',
    proposed_risk: '',
    environmental_conditions: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.entry_point || !form.vector) return;
    setSaving(true);
    try {
      await createSurvey({
        entry_point: form.entry_point,
        site: form.site || null,
        vector: form.vector,
        method: form.method,
        area: form.area,
        team: form.team || null,
        survey_date: form.survey_date || undefined,
        house_index: form.house_index || null,
        breteau_index: form.breteau_index || null,
        container_index: form.container_index || null,
        breeding_sites: Number(form.breeding_sites) || 0,
        density: form.density,
        proposed_risk: form.proposed_risk || undefined,
        environmental_conditions: form.environmental_conditions,
        notes: form.notes,
      });
      setForm((f) => ({
        ...f, site: '', area: '', team: '', survey_date: '', house_index: '', breteau_index: '',
        container_index: '', breeding_sites: '0', proposed_risk: '', environmental_conditions: '', notes: '',
      }));
      onSaved();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر حفظ المسح — تأكد من نقطة الدخول والناقل');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ToggleForm open={true} onToggle={() => {}} title="مسح جديد">
      <FieldGrid>
        <TextField select required label="نقطة الدخول" value={form.entry_point} onChange={(e) => setForm((f) => ({ ...f, entry_point: e.target.value }))}>
          {lk.entryPoints.map((e) => (<MenuItem key={e.id} value={e.id}>{e.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="الموقع" value={form.site} onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.sites.filter((s) => !form.entry_point || s.entry_point === form.entry_point).map((s) => (<MenuItem key={s.id} value={s.id}>{s.name_ar}</MenuItem>))}
        </TextField>
        <TextField select required label="الناقل" value={form.vector} onChange={(e) => setForm((f) => ({ ...f, vector: e.target.value }))}>
          {lk.vectors.map((v) => (<MenuItem key={v.id} value={v.id}>{v.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="الطريقة" value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}>
          {Object.entries(vectorSurveyMethod).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
        </TextField>
        <TextField label="منطقة المسح" value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
        <TextField select label="الفريق" value={form.team} onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.teams.filter((tm) => tm.team_type === 'SURVEY').map((tm) => (<MenuItem key={tm.id} value={tm.id}>{tm.name_ar}</MenuItem>))}
        </TextField>
        <TextField type="date" label="تاريخ المسح" value={form.survey_date} onChange={(e) => setForm((f) => ({ ...f, survey_date: e.target.value }))} InputLabelProps={{ shrink: true }} />
        <TextField select label="الكثافة" value={form.density} onChange={(e) => setForm((f) => ({ ...f, density: e.target.value }))}>
          {Object.entries(vectorDensity).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
        </TextField>
        <TextField type="number" label="مؤشر المنازل %" value={form.house_index} onChange={(e) => setForm((f) => ({ ...f, house_index: e.target.value }))} />
        <TextField type="number" label="مؤشر بريتو" value={form.breteau_index} onChange={(e) => setForm((f) => ({ ...f, breteau_index: e.target.value }))} />
        <TextField type="number" label="مؤشر الحاويات %" value={form.container_index} onChange={(e) => setForm((f) => ({ ...f, container_index: e.target.value }))} />
        <TextField type="number" label="مواقع التوالد" value={form.breeding_sites} onChange={(e) => setForm((f) => ({ ...f, breeding_sites: e.target.value }))} />
        <TextField type="number" label="الخطورة المقترحة (مثلًا 6)" value={form.proposed_risk} onChange={(e) => setForm((f) => ({ ...f, proposed_risk: e.target.value }))} />
      </FieldGrid>
      <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="الظروف البيئية" value={form.environmental_conditions} onChange={(e) => setForm((f) => ({ ...f, environmental_conditions: e.target.value }))} />
      <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="ملاحظات" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={submit} disabled={saving || !form.entry_point || !form.vector}>{saving ? 'جارٍ الحفظ...' : 'حفظ المسح'}</Button>
      </Box>
    </ToggleForm>
  );
};

const SurveysSection = () => {
  const t = useServerTable<VectorSurvey>({ fetchData: getSurveys });
  const [formOpen, setFormOpen] = useState(false);

  const act = (p: Promise<unknown>) => p.then(() => t.refresh()).catch((err) => { if (!(err instanceof OfflineQueuedError)) window.alert('فشلت العملية'); });

  return (
    <SectionCard id="surveys">
      <SectionHeading
        icon={<TravelExploreIcon color="primary" />}
        title="المسوحات"
        subtitle="مسوحات الحشرات الميدانية ورصد الكثافة"
        action={<Button size="small" variant="contained" onClick={() => setFormOpen((o) => !o)}>{formOpen ? 'إخفاء' : 'مسح جديد'}</Button>}
      />
      {formOpen && <NewSurveyForm onSaved={() => t.refresh()} />}
      <DataTable<VectorSurvey>
        columns={[
          { key: 'survey_number', label: 'الرقم', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.survey_number}</Typography> },
          { key: 'entry_point_name', label: 'نقطة الدخول' },
          { key: 'vector_name', label: 'الناقل' },
          { key: 'method', label: 'الطريقة', render: (r) => r.method_display || r.method, hideOnMobile: true },
          { key: 'status', label: 'الحالة', render: (r) => { const m = vectorSurveyStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
          { key: 'density', label: 'الكثافة', render: (r) => { const m = vectorDensity[r.density]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.density; } },
          { key: 'breeding_sites', label: 'مواقع توالد', render: (r) => r.breeding_sites ?? 0, hideOnMobile: true },
          { key: 'survey_date', label: 'التاريخ', render: (r) => formatDate(r.survey_date), hideOnMobile: true },
          { key: 'team_name', label: 'الفريق', hideOnMobile: true },
          {
            key: 'actions', label: 'إجراءات', sortable: false,
            render: (r) => (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {r.status === 'SUBMITTED' && (
                  <>
                    <Button size="small" color="success" variant="outlined" onClick={() => act(approveSurvey(r.id))}>اعتماد</Button>
                    <Button size="small" variant="outlined" onClick={() => act(openFocusFromSurvey(r.id))}>فتح بؤرة</Button>
                  </>
                )}
                {r.status === 'APPROVED' && (
                  <Button size="small" variant="outlined" onClick={() => act(openFocusFromSurvey(r.id))}>فتح بؤرة</Button>
                )}
              </Box>
            ),
          },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="المسوحات" subtitle={`${t.count} مسح`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالرقم أو المنفذ..."
        filters={[
          { key: 'status', label: 'الحالة', options: Object.entries(vectorSurveyStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
          { key: 'method', label: 'الطريقة', options: Object.entries(vectorSurveyMethod).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('method', v) },
        ]}
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
        emptyTitle="لا توجد مسوحات" emptyDescription="المسوحات الميدانية تظهر هنا"
      />
    </SectionCard>
  );
};

export default SurveysSection;