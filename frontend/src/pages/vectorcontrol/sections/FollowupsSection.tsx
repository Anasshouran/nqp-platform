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
import ChecklistIcon from '@mui/icons-material/Checklist';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import { closeFollowup, createFollowup, getFollowups } from '../../../api/endpoints/vectorControl';
import type { VectorFollowUp } from '../../../types/vectorControl';
import { vectorFollowupStatus } from '../../../utils/status';
import { useVectorLookups } from '../hooks/useVectorLookups';
import { FieldGrid, SectionCard, SectionHeading, ToggleForm } from './common';
import { formatDate } from '../../../utils/formatters';
import { OfflineQueuedError } from '../../../utils/vectorOffline';

const NewFollowupForm = ({ onSaved }: { onSaved: () => void }) => {
  const lk = useVectorLookups();
  const [form, setForm] = useState({ focus: '', team: '', visit_datetime: '', findings: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.focus) return;
    setSaving(true);
    try {
      await createFollowup({ ...form, team: form.team || null });
      setForm((f) => ({ ...f, focus: '', team: '', visit_datetime: '', findings: '' }));
      onSaved();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر حفظ زيارة المتابعة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ToggleForm open={true} onToggle={() => {}} title="زيارة متابعة جديدة">
      <FieldGrid>
        <TextField select required label="البؤرة" value={form.focus} onChange={(e) => setForm((f) => ({ ...f, focus: e.target.value }))}>
          {lk.foci.map((fo) => (<MenuItem key={fo.id} value={fo.id}>{fo.focus_number} — {fo.entry_point_name}</MenuItem>))}
        </TextField>
        <TextField select label="الفريق" value={form.team} onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.teams.map((tm) => (<MenuItem key={tm.id} value={tm.id}>{tm.name_ar}</MenuItem>))}
        </TextField>
        <TextField type="datetime-local" required label="موعد الزيارة" value={form.visit_datetime} onChange={(e) => setForm((f) => ({ ...f, visit_datetime: e.target.value }))} />
      </FieldGrid>
      <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="النتائج الأولية" value={form.findings} onChange={(e) => setForm((f) => ({ ...f, findings: e.target.value }))} />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" onClick={submit} disabled={saving || !form.focus || !form.visit_datetime}>{saving ? 'جارٍ الحفظ...' : 'حفظ الزيارة'}</Button>
      </Box>
    </ToggleForm>
  );
};

const CloseDialog = ({ fu, onClose, onSaved }: { fu: VectorFollowUp; onClose: () => void; onSaved: () => void }) => {
  const [form, setForm] = useState({ controlled: 'true', recommend_retreatment: 'false', findings: fu.findings ?? '', notes: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await closeFollowup(fu.id, {
        controlled: form.controlled === 'true',
        recommend_retreatment: form.recommend_retreatment === 'true',
        findings: form.findings,
        notes: form.notes,
      });
      onSaved();
      onClose();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر إغلاق الزيارة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>إغلاق المتابعة — {fu.followup_number}</DialogTitle>
      <DialogContent>
        <TextField select fullWidth label="هل تمت السيطرة؟" value={form.controlled} onChange={(e) => setForm((f) => ({ ...f, controlled: e.target.value }))} sx={{ mt: 1 }}>
          <MenuItem value="true">نعم</MenuItem>
          <MenuItem value="false">لا</MenuItem>
        </TextField>
        <TextField select fullWidth label="توصية بإعادة المعالجة" value={form.recommend_retreatment} onChange={(e) => setForm((f) => ({ ...f, recommend_retreatment: e.target.value }))} sx={{ mt: 2 }}>
          <MenuItem value="true">نعم</MenuItem>
          <MenuItem value="false">لا</MenuItem>
        </TextField>
        <TextField fullWidth multiline minRows={2} label="النتائج" value={form.findings} onChange={(e) => setForm((f) => ({ ...f, findings: e.target.value }))} sx={{ mt: 2 }} />
        <TextField fullWidth multiline minRows={2} label="ملاحظات" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} sx={{ mt: 2 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ الإغلاق'}</Button>
      </DialogActions>
    </Dialog>
  );
};

const FollowupsSection = () => {
  const t = useServerTable<VectorFollowUp>({ fetchData: getFollowups });
  const [formOpen, setFormOpen] = useState(false);
  const [closeFor, setCloseFor] = useState<VectorFollowUp | null>(null);

  return (
    <SectionCard id="followups">
      <SectionHeading
        icon={<ChecklistIcon color="info" />}
        title="المتابعات"
        subtitle="زيارات فحص ما بعد المكافحة وتقييم النتائج"
        action={<Button size="small" variant="contained" onClick={() => setFormOpen((o) => !o)}>{formOpen ? 'إخفاء' : 'زيارة متابعة جديدة'}</Button>}
      />
      {formOpen && <NewFollowupForm onSaved={() => t.refresh()} />}
      <DataTable<VectorFollowUp>
        columns={[
          { key: 'followup_number', label: 'الرقم', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.followup_number}</Typography> },
          { key: 'focus_number', label: 'البؤرة' },
          { key: 'operation_number', label: 'العملية', render: (r) => r.operation_number ?? '—', hideOnMobile: true },
          { key: 'team_name', label: 'الفريق', hideOnMobile: true },
          { key: 'visit_datetime', label: 'موعد الزيارة', render: (r) => formatDate(r.visit_datetime) },
          { key: 'status', label: 'الحالة', render: (r) => { const m = vectorFollowupStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
          {
            key: 'actions', label: 'إجراءات', sortable: false,
            render: (r) => r.status === 'OPEN' && (
              <Button size="small" variant="outlined" onClick={() => setCloseFor(r)}>إغلاق الزيارة</Button>
            ),
          },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="المتابعات" subtitle={`${t.count} متابعة`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالرقم أو البؤرة..."
        filters={[{ key: 'status', label: 'الحالة', options: Object.entries(vectorFollowupStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) }]}
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
        emptyTitle="لا توجد متابعات" emptyDescription="زيارات متابعة ما بعد المكافحة تظهر هنا"
      />
      {closeFor && <CloseDialog fu={closeFor} onClose={() => setCloseFor(null)} onSaved={() => t.refresh()} />}
    </SectionCard>
  );
};

export default FollowupsSection;