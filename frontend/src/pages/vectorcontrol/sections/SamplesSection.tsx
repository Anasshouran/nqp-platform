import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ScienceIcon from '@mui/icons-material/Science';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import {
  approveLabResult,
  createSample,
  getLabResults,
  getSamples,
  receiveSample,
  rejectLabResult,
  submitSampleResult,
} from '../../../api/endpoints/vectorControl';
import type { VectorLabResult, VectorSample } from '../../../types/vectorControl';
import { vectorLabResultMethod, vectorLabResultStatus, vectorLabResultValue, vectorSampleStage, vectorSampleStatus } from '../../../utils/status';
import { useVectorLookups } from '../hooks/useVectorLookups';
import { FieldGrid, SectionCard, SectionHeading, ToggleForm } from './common';
import { formatDate } from '../../../utils/formatters';
import { OfflineQueuedError } from '../../../utils/vectorOffline';

const NewSampleForm = ({ onSaved }: { onSaved: () => void }) => {
  const lk = useVectorLookups();
  const [form, setForm] = useState({
    entry_point: '',
    focus: '',
    vector: '',
    stage: 'LARVAE',
    specimen_count: '1',
    collection_method: '',
    condition_note: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.entry_point) return;
    setSaving(true);
    try {
      await createSample({
        ...form,
        focus: form.focus || null,
        vector: form.vector || null,
        specimen_count: Number(form.specimen_count) || 1,
      });
      setForm((f) => ({ ...f, focus: '', vector: '', specimen_count: '1', collection_method: '', condition_note: '' }));
      onSaved();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر حفظ العينة — تأكد من نقطة الدخول');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ToggleForm open={true} onToggle={() => {}} title="عينة جديدة">
      <FieldGrid>
        <TextField select required label="نقطة الدخول" value={form.entry_point} onChange={(e) => setForm((f) => ({ ...f, entry_point: e.target.value }))}>
          {lk.entryPoints.map((e) => (<MenuItem key={e.id} value={e.id}>{e.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="البؤرة" value={form.focus} onChange={(e) => setForm((f) => ({ ...f, focus: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.foci.map((fo) => (<MenuItem key={fo.id} value={fo.id}>{fo.focus_number} — {fo.entry_point_name}</MenuItem>))}
        </TextField>
        <TextField select label="الناقل" value={form.vector} onChange={(e) => setForm((f) => ({ ...f, vector: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.vectors.map((v) => (<MenuItem key={v.id} value={v.id}>{v.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="الطور" value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}>
          {Object.entries(vectorSampleStage).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
        </TextField>
        <TextField type="number" label="عدد العينات" value={form.specimen_count} onChange={(e) => setForm((f) => ({ ...f, specimen_count: e.target.value }))} />
        <TextField label="طريقة الجمع" value={form.collection_method} onChange={(e) => setForm((f) => ({ ...f, collection_method: e.target.value }))} />
      </FieldGrid>
      <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="ملاحظات الحالة" value={form.condition_note} onChange={(e) => setForm((f) => ({ ...f, condition_note: e.target.value }))} />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={submit} disabled={saving || !form.entry_point}>{saving ? 'جارٍ الحفظ...' : 'حفظ العينة'}</Button>
      </Box>
    </ToggleForm>
  );
};

interface ResultDialogProps {
  sample: VectorSample;
  onClose: () => void;
  onSaved: () => void;
}

const ResultDialog = ({ sample, onClose, onSaved }: ResultDialogProps) => {
  const [form, setForm] = useState({ identification_method: 'MORPHOLOGY', result: 'POSITIVE', species_identified: '', findings: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await submitSampleResult(sample.id, form);
      onSaved();
      onClose();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر حفظ نتيجة المختبر');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>إدخال نتيجة المختبر — {sample.sample_number}</DialogTitle>
      <DialogContent>
        <FieldGrid>
          <TextField select label="طريقة التحديد" value={form.identification_method} onChange={(e) => setForm((f) => ({ ...f, identification_method: e.target.value }))} sx={{ mt: 1 }}>
            {Object.entries(vectorLabResultMethod).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
          </TextField>
          <TextField select label="النتيجة" value={form.result} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))} sx={{ mt: 1 }}>
            {Object.entries(vectorLabResultValue).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
          </TextField>
          <TextField label="النوع المحدد" fullWidth value={form.species_identified} onChange={(e) => setForm((f) => ({ ...f, species_identified: e.target.value }))} sx={{ mt: 1 }} />
        </FieldGrid>
        <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="النتائج والملاحظات" value={form.findings} onChange={(e) => setForm((f) => ({ ...f, findings: e.target.value }))} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ النتيجة'}</Button>
      </DialogActions>
    </Dialog>
  );
};

const SamplesSection = () => {
  const t = useServerTable<VectorSample>({ fetchData: getSamples });
  const lt = useServerTable<VectorLabResult>({ fetchData: getLabResults });
  const [formOpen, setFormOpen] = useState(false);
  const [resultFor, setResultFor] = useState<VectorSample | null>(null);

  const act = (p: Promise<unknown>) => p.then(() => { t.refresh(); lt.refresh(); }).catch((err) => { if (!(err instanceof OfflineQueuedError)) window.alert('فشلت العملية'); });

  const approveReject = (id: string, approve: boolean) => {
    if (approve) act(approveLabResult(id));
    else {
      const r = window.prompt('سبب الرفض:');
      if (r !== null) act(rejectLabResult(id, r));
    }
  };

  return (
    <SectionCard id="samples">
      <SectionHeading
        icon={<ScienceIcon color="success" />}
        title="العينات والمختبر"
        subtitle="جمع العينات الحشرية والنتائج المخبرية والتصعيد"
        action={<Button size="small" variant="contained" onClick={() => setFormOpen((o) => !o)}>{formOpen ? 'إخفاء' : 'عينة جديدة'}</Button>}
      />
      {formOpen && <NewSampleForm onSaved={() => t.refresh()} />}

      <DataTable<VectorSample>
        columns={[
          { key: 'sample_number', label: 'الرقم', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.sample_number}</Typography> },
          { key: 'entry_point_name', label: 'نقطة الدخول' },
          { key: 'collection', label: 'المصدر', render: (r) => r.focus_number ?? r.inspection ?? r.survey ?? '—', hideOnMobile: true },
          { key: 'stage', label: 'الطور', render: (r) => { const m = vectorSampleStage[r.stage]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.stage; } },
          { key: 'specimen_count', label: 'العدد' },
          { key: 'status', label: 'الحالة', render: (r) => { const m = vectorSampleStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
          { key: 'collected_at', label: 'التاريخ', render: (r) => formatDate(r.collected_at), hideOnMobile: true },
          {
            key: 'actions', label: 'إجراءات', sortable: false,
            render: (r) => (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {r.status === 'COLLECTED' && <Button size="small" variant="outlined" onClick={() => act(receiveSample(r.id))}>استلام</Button>}
                {['RECEIVED', 'IN_TESTING'].includes(r.status) && !r.has_result && (
                  <Button size="small" color="success" variant="outlined" onClick={() => setResultFor(r)}>نتيجة المختبر</Button>
                )}
                {r.has_result && <StatusChip label="التصعيد جاهز" tone="primary" />}
              </Box>
            ),
          },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="العينات" subtitle={`${t.count} عينة`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالرقم أو المنفذ..."
        filters={[
          { key: 'status', label: 'الحالة', options: Object.entries(vectorSampleStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
          { key: 'stage', label: 'الطور', options: Object.entries(vectorSampleStage).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('stage', v) },
        ]}
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
        emptyTitle="لا توجد عينات" emptyDescription="العينات الحشرية تظهر هنا"
      />

      <DataTable<VectorLabResult>
        columns={[
          { key: 'sample_number', label: 'العينة', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.sample_number}</Typography> },
          { key: 'entry_point_name', label: 'نقطة الدخول', hideOnMobile: true },
          { key: 'method', label: 'الطريقة', render: (r) => r.method_display || r.identification_method, hideOnMobile: true },
          { key: 'result', label: 'النتيجة', render: (r) => { const m = vectorLabResultValue[r.result]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.result_display || r.result; } },
          { key: 'vector_name', label: 'الناقل', hideOnMobile: true },
          { key: 'status', label: 'الحالة', render: (r) => { const m = vectorLabResultStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
          { key: 'analyzed_at', label: 'التاريخ', render: (r) => formatDate(r.analyzed_at), hideOnMobile: true },
          {
            key: 'actions', label: 'إجراءات', sortable: false,
            render: (r) => (
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {r.status === 'PENDING' && (
                  <>
                    <Button size="small" color="success" variant="outlined" onClick={() => approveReject(r.id, true)}>اعتماد</Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => approveReject(r.id, false)}>رفض</Button>
                  </>
                )}
              </Box>
            ),
          },
        ]}
        rows={lt.rows} rowKey={(r) => r.id} count={lt.count} page={lt.page} rowsPerPage={lt.rowsPerPage}
        pageSizeOptions={lt.pageSizeOptions} loading={lt.loading} error={lt.error}
        title="نتائج المختبر" subtitle={`${lt.count} نتيجة`}
        searchInput={lt.searchInput} onSearchChange={lt.setSearchInput} searchPlaceholder="بحث بالنتيجة أو العينة..."
        filters={[
          { key: 'status', label: 'الحالة', options: Object.entries(vectorLabResultStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => lt.setFilter('status', v) },
          { key: 'result', label: 'النتيجة', options: Object.entries(vectorLabResultValue).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => lt.setFilter('result', v) },
        ]}
        onPageChange={lt.setPage} onRowsPerPageChange={lt.setRowsPerPage} onRefresh={lt.refresh}
        emptyTitle="لا توجد نتائج مخبرية" emptyDescription="نتائج المختبر تظهر هنا"
      />

      {resultFor && <ResultDialog sample={resultFor} onClose={() => setResultFor(null)} onSaved={() => { t.refresh(); lt.refresh(); }} />}
    </SectionCard>
  );
};

export default SamplesSection;