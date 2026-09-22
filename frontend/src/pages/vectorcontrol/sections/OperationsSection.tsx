import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import {
  addOperationChemical,
  closeOperation,
  createOperation,
  getOperations,
  nextOperationStatus,
  setOperationResult,
} from '../../../api/endpoints/vectorControl';
import type { VectorControlOperation } from '../../../types/vectorControl';
import { vectorOperationStatus, vectorOperationType } from '../../../utils/status';
import { useVectorLookups } from '../hooks/useVectorLookups';
import { FieldGrid, SectionCard, SectionHeading, ToggleForm } from './common';
import { formatDateTime } from '../../../utils/formatters';
import { OfflineQueuedError } from '../../../utils/vectorOffline';

const NewOperationForm = ({ onSaved }: { onSaved: () => void }) => {
  const lk = useVectorLookups();
  const [form, setForm] = useState({
    entry_point: '',
    focus: '',
    site: '',
    vector: '',
    operation_type: 'LARVICIDING',
    area_m2: '',
    team: '',
    application_method: '',
    planned_at: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.entry_point) return;
    setSaving(true);
    try {
      await createOperation({
        ...form,
        focus: form.focus || null,
        site: form.site || null,
        vector: form.vector || null,
        team: form.team || null,
        area_m2: Number(form.area_m2) || null,
        planned_at: form.planned_at || null,
      });
      setForm((f) => ({ ...f, focus: '', site: '', vector: '', area_m2: '', team: '', application_method: '', planned_at: '', notes: '' }));
      onSaved();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر حفظ العملية — تأكد من نقطة الدخول');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ToggleForm open={true} onToggle={() => {}} title="عملية جديدة">
      <FieldGrid>
        <TextField select required label="نقطة الدخول" value={form.entry_point} onChange={(e) => setForm((f) => ({ ...f, entry_point: e.target.value }))}>
          {lk.entryPoints.map((e) => (<MenuItem key={e.id} value={e.id}>{e.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="البؤرة" value={form.focus} onChange={(e) => setForm((f) => ({ ...f, focus: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.foci.map((fo) => (<MenuItem key={fo.id} value={fo.id}>{fo.focus_number} — {fo.entry_point_name}</MenuItem>))}
        </TextField>
        <TextField select label="الموقع" value={form.site} onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.sites.filter((s) => !form.entry_point || s.entry_point === form.entry_point).map((s) => (<MenuItem key={s.id} value={s.id}>{s.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="الناقل" value={form.vector} onChange={(e) => setForm((f) => ({ ...f, vector: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.vectors.map((v) => (<MenuItem key={v.id} value={v.id}>{v.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="نوع العملية" value={form.operation_type} onChange={(e) => setForm((f) => ({ ...f, operation_type: e.target.value }))}>
          {Object.entries(vectorOperationType).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
        </TextField>
        <TextField type="number" label="المساحة (م²)" value={form.area_m2} onChange={(e) => setForm((f) => ({ ...f, area_m2: e.target.value }))} />
        <TextField select label="الفريق التنفيذي" value={form.team} onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.teams.filter((tm) => tm.team_type === 'CONTROL' || tm.team_type === 'RODENT').map((tm) => (<MenuItem key={tm.id} value={tm.id}>{tm.name_ar}</MenuItem>))}
        </TextField>
        <TextField label="طريقة التطبيق" value={form.application_method} onChange={(e) => setForm((f) => ({ ...f, application_method: e.target.value }))} />
        <TextField type="date" label="الموعد المخطط" value={form.planned_at} onChange={(e) => setForm((f) => ({ ...f, planned_at: e.target.value }))} InputLabelProps={{ shrink: true }} />
      </FieldGrid>
      <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="ملاحظات" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={submit} disabled={saving || !form.entry_point}>{saving ? 'جارٍ الحفظ...' : 'إنشاء العملية'}</Button>
      </Box>
    </ToggleForm>
  );
};

interface NextDialogProps {
  op: VectorControlOperation;
  onClose: () => void;
  onSaved: () => void;
}

const NextDialog = ({ op, onClose, onSaved }: NextDialogProps) => {
  const lk = useVectorLookups();
  const [team, setTeam] = useState(op.team ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await nextOperationStatus(op.id, op.status === 'DRAFT' && team ? { team } : {});
      onSaved();
      onClose();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر تغيير حالة العملية');
    } finally {
      setSaving(false);
    }
  };

  const nextLabel = (st: string) =>
    ({ DRAFT: 'اعتماد وتسبيق', APPROVED: 'بدء التنفيذ', ASSIGNED: 'بدء التنفيذ', IN_PROGRESS: 'إنهاء التنفيذ', COMPLETED: 'تحويل للمتابعة', FOLLOW_UP: 'إغلاق العملية' } as Record<string, string>)[st] ?? 'المتابعة';

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{op.op_number} — {nextLabel(op.status)}؟</DialogTitle>
      <DialogContent>
        {op.status === 'DRAFT' && (
          <TextField select fullWidth label="الفريق التنفيذي" value={team} onChange={(e) => setTeam(e.target.value)} sx={{ mt: 1 }}>
            {lk.teams.map((tm) => (<MenuItem key={tm.id} value={tm.id}>{tm.name_ar}</MenuItem>))}
          </TextField>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={submit} disabled={saving || (op.status === 'DRAFT' && !team)}>{saving ? 'جارٍ التنفيذ...' : 'تأكيد'}</Button>
      </DialogActions>
    </Dialog>
  );
};

interface ChemicalsDialogProps {
  op: VectorControlOperation;
  onClose: () => void;
  onSaved: () => void;
}

const ChemicalsDialog = ({ op, onClose, onSaved }: ChemicalsDialogProps) => {
  const lk = useVectorLookups();
  const [form, setForm] = useState({ chemical: '', dosage: '', concentration: '', quantity_used: '', unit: '', area_covered: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.chemical || !form.quantity_used) return;
    setSaving(true);
    try {
      const data = {
        chemical: form.chemical,
        dosage: form.dosage || undefined,
        concentration: form.concentration || undefined,
        quantity_used: Number(form.quantity_used),
        unit: form.unit || undefined,
        area_covered: Number(form.area_covered) || null,
      };
      await addOperationChemical(op.id, data);
      setForm((f) => ({ ...f, chemical: '', dosage: '', concentration: '', quantity_used: '', unit: '', area_covered: '' }));
      onSaved();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر إضافة المبيد ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>إضافة مبيد — {op.op_number}</DialogTitle>
      <DialogContent>
        {op.chemical_lines?.map((c) => (
          <Chip key={c.id} size="small" sx={{ m: 0.5 }} label={`${c.chemical_name} × ${c.quantity_used} ${c.unit}`} />
        ))}
        <FieldGrid>
          <TextField select label="المبيد" value={form.chemical} onChange={(e) => setForm((f) => ({ ...f, chemical: e.target.value }))} sx={{ mt: 1 }}>
            {lk.chemicals.map((c) => (<MenuItem key={c.id} value={c.id}>{c.name_ar}</MenuItem>))}
          </TextField>
          <TextField type="number" label="الكمية المستخدمة" value={form.quantity_used} onChange={(e) => setForm((f) => ({ ...f, quantity_used: e.target.value }))} sx={{ mt: 1 }} />
          <TextField label="الجرعة" value={form.dosage} onChange={(e) => setForm((f) => ({ ...f, dosage: e.target.value }))} sx={{ mt: 1 }} />
          <TextField label="التركيز" value={form.concentration} onChange={(e) => setForm((f) => ({ ...f, concentration: e.target.value }))} sx={{ mt: 1 }} />
          <TextField label="الوحدة" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} sx={{ mt: 1 }} />
          <TextField type="number" label="المساحة المعالجة (م²)" value={form.area_covered} onChange={(e) => setForm((f) => ({ ...f, area_covered: e.target.value }))} sx={{ mt: 1 }} />
        </FieldGrid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
        <Button variant="contained" onClick={submit} disabled={saving || !form.chemical || !form.quantity_used}>{saving ? 'جارٍ الحفظ...' : 'إضافة المبيد'}</Button>
      </DialogActions>
    </Dialog>
  );
};

interface ResultDialogProps {
  op: VectorControlOperation;
  onClose: () => void;
  onSaved: () => void;
}

const ResultDialog = ({ op, onClose, onSaved }: ResultDialogProps) => {
  const [form, setForm] = useState({ effective: 'true', effectiveness_percent: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await setOperationResult(op.id, {
        effective: form.effective === 'true',
        effectiveness_percent: Number(form.effectiveness_percent) || undefined,
        reason: form.reason,
      });
      onSaved();
      onClose();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر حفظ النتيجة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>نتيجة العملية — {op.op_number}</DialogTitle>
      <DialogContent>
        <TextField select fullWidth label="هل كانت فعالة؟" value={form.effective} onChange={(e) => setForm((f) => ({ ...f, effective: e.target.value }))} sx={{ mt: 1 }}>
          <MenuItem value="true">نعم</MenuItem>
          <MenuItem value="false">لا</MenuItem>
        </TextField>
        <TextField fullWidth type="number" label="نسبة الفعالية" value={form.effectiveness_percent} onChange={(e) => setForm((f) => ({ ...f, effectiveness_percent: e.target.value }))} sx={{ mt: 2 }} />
        <TextField fullWidth multiline minRows={2} label="الأسباب / التفسير" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} sx={{ mt: 2 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ النتيجة'}</Button>
      </DialogActions>
    </Dialog>
  );
};

const OperationsSection = () => {
  const t = useServerTable<VectorControlOperation>({ fetchData: getOperations });
  const [formOpen, setFormOpen] = useState(false);
  const [nextFor, setNextFor] = useState<VectorControlOperation | null>(null);
  const [chemicalsFor, setChemicalsFor] = useState<VectorControlOperation | null>(null);
  const [resultFor, setResultFor] = useState<VectorControlOperation | null>(null);

  const act = (p: Promise<unknown>) => p.then(() => t.refresh()).catch((err) => { if (!(err instanceof OfflineQueuedError)) window.alert('فشلت العملية'); });

  return (
    <SectionCard id="operations">
      <SectionHeading
        icon={<LocalFireDepartmentIcon color="warning" />}
        title="عمليات المكافحة"
        subtitle="دورة العملية: إنشاء ← اعتماد ← إسناد ← تنفيذ ← نتيجة ← إغلاق"
        action={<Button size="small" variant="contained" onClick={() => setFormOpen((o) => !o)}>{formOpen ? 'إخفاء' : 'عملية جديدة'}</Button>}
      />
      {formOpen && <NewOperationForm onSaved={() => t.refresh()} />}
      <DataTable<VectorControlOperation>
        columns={[
          { key: 'op_number', label: 'الرقم', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.op_number}</Typography> },
          { key: 'entry_point_name', label: 'نقطة الدخول' },
          { key: 'focus_number', label: 'البؤرة', render: (r) => r.focus_number ?? '—', hideOnMobile: true },
          { key: 'operation_type', label: 'النوع', render: (r) => { const m = vectorOperationType[r.operation_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.operation_type_display || r.operation_type; } },
          { key: 'team_name', label: 'الفريق', hideOnMobile: true },
          { key: 'status', label: 'الحالة', render: (r) => { const m = vectorOperationStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
          { key: 'planned_at', label: 'الموعد', render: (r) => formatDateTime(r.planned_at), hideOnMobile: true },
          {
            key: 'actions', label: 'إجراءات', sortable: false,
            render: (r) => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {!['COMPLETED', 'FOLLOW_UP', 'CLOSED'].includes(r.status) && (
                  <Button size="small" variant="contained" onClick={() => setNextFor(r)}>التالي</Button>
                )}
                {['IN_PROGRESS', 'COMPLETED'].includes(r.status) && (
                  <Button size="small" variant="outlined" onClick={() => setResultFor(r)}>نتيجة</Button>
                )}
                {['APPROVED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FOLLOW_UP'].includes(r.status) && (
                  <Button size="small" variant="outlined" onClick={() => setChemicalsFor(r)}>مبيدات</Button>
                )}
                {r.status === 'FOLLOW_UP' && (
                  <Button size="small" color="success" variant="outlined" onClick={() => act(closeOperation(r.id))}>إغلاق</Button>
                )}
              </Box>
            ),
          },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="العمليات" subtitle={`${t.count} عملية`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالرقم أو المنفذ أو البؤرة..."
        filters={[
          { key: 'status', label: 'الحالة', options: Object.entries(vectorOperationStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
          { key: 'operation_type', label: 'النوع', options: Object.entries(vectorOperationType).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('operation_type', v) },
        ]}
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
        emptyTitle="لا توجد عمليات" emptyDescription="عمليات المكافحة تظهر هنا"
      />

      {nextFor && <NextDialog op={nextFor} onClose={() => setNextFor(null)} onSaved={() => t.refresh()} />}
      {chemicalsFor && <ChemicalsDialog op={chemicalsFor} onClose={() => setChemicalsFor(null)} onSaved={() => t.refresh()} />}
      {resultFor && <ResultDialog op={resultFor} onClose={() => setResultFor(null)} onSaved={() => t.refresh()} />}
    </SectionCard>
  );
};

export default OperationsSection;