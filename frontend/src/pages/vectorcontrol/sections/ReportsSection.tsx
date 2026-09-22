import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import {
  acceptReport,
  assessReport,
  closeReport,
  createReport,
  getReports,
  openFocusFromReport,
  rejectReport,
} from '../../../api/endpoints/vectorControl';
import type { VectorReport } from '../../../types/vectorControl';
import { vectorReportSource, vectorReportStatus, vectorSeverity, vectorTypeMap } from '../../../utils/status';
import { useVectorLookups } from '../hooks/useVectorLookups';
import { FieldGrid, SectionCard, SectionHeading, ToggleForm } from './common';
import { formatDateTime } from '../../../utils/formatters';
import { OfflineQueuedError } from '../../../utils/vectorOffline';

const REP_TYPES = [
  { value: 'MOSQUITO', label: 'بعوض' },
  { value: 'RODENT', label: 'قوارض' },
  { value: 'FLY', label: 'ذباب' },
  { value: 'COCKROACH', label: 'صراصير' },
  { value: 'FLEA', label: 'براغيث' },
  { value: 'TICK', label: 'قراد' },
  { value: 'OTHER', label: 'أخرى' },
];

const NewReportForm = ({ onSaved }: { onSaved: () => void }) => {
  const lk = useVectorLookups();
  const [form, setForm] = useState({
    entry_point: '',
    site: '',
    vector: '',
    report_type: 'MOSQUITO',
    source: 'PUBLIC',
    severity: 'MEDIUM',
    gps_latitude: '',
    gps_longitude: '',
    problem_description: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.entry_point || !form.problem_description.trim()) return;
    setSaving(true);
    try {
      await createReport({
        ...form,
        site: form.site || null,
        vector: form.vector || null,
        gps_latitude: form.gps_latitude || null,
        gps_longitude: form.gps_longitude || null,
      });
      setForm((f) => ({ ...f, site: '', vector: '', gps_latitude: '', gps_longitude: '', problem_description: '' }));
      onSaved();
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) {
        window.alert('تعذر حفظ البلاغ — راجع الحقول المطلوبة');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ToggleForm open={true} onToggle={() => {}} title="بلاغ جديد">
      <FieldGrid>
        <TextField select required label="نقطة الدخول" value={form.entry_point} onChange={(e) => setForm((f) => ({ ...f, entry_point: e.target.value }))}>
          {lk.entryPoints.map((e) => (<MenuItem key={e.id} value={e.id}>{e.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="الموقع" value={form.site} onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.sites.filter((s) => !form.entry_point || s.entry_point === form.entry_point).map((s) => (<MenuItem key={s.id} value={s.id}>{s.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="النوع" value={form.report_type} onChange={(e) => setForm((f) => ({ ...f, report_type: e.target.value }))}>
          {REP_TYPES.map((t) => (<MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>))}
        </TextField>
        <TextField select label="المصدر" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
          {Object.entries(vectorReportSource).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
        </TextField>
        <TextField select label="الناقل" value={form.vector} onChange={(e) => setForm((f) => ({ ...f, vector: e.target.value }))}>
          <MenuItem value="">—</MenuItem>
          {lk.vectors.map((v) => (<MenuItem key={v.id} value={v.id}>{v.name_ar}</MenuItem>))}
        </TextField>
        <TextField select label="درجة الخطورة" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
          {Object.entries(vectorSeverity).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
        </TextField>
        <TextField label="خط العرض (GPS)" value={form.gps_latitude} onChange={(e) => setForm((f) => ({ ...f, gps_latitude: e.target.value }))} />
        <TextField label="خط الطول (GPS)" value={form.gps_longitude} onChange={(e) => setForm((f) => ({ ...f, gps_longitude: e.target.value }))} />
      </FieldGrid>
      <TextField
        fullWidth multiline minRows={2} sx={{ mt: 2 }}
        required label="وصف المشكلة" value={form.problem_description}
        onChange={(e) => setForm((f) => ({ ...f, problem_description: e.target.value }))}
      />
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" color="primary" onClick={submit} disabled={saving || !form.entry_point || !form.problem_description.trim()}>
          {saving ? 'جارٍ الحفظ...' : 'تسجيل البلاغ'}
        </Button>
      </Box>
    </ToggleForm>
  );
};

const ReportsSection = () => {
  const t = useServerTable<VectorReport>({ fetchData: getReports });
  const [formOpen, setFormOpen] = useState(false);

  const act = (p: Promise<unknown>) => p.then(() => t.refresh()).catch((err) => { if (!(err instanceof OfflineQueuedError)) window.alert('فشلت العملية'); });

  const askNote = (title: string): string | null => {
    const v = window.prompt(title);
    return v;
  };

  return (
    <SectionCard id="reports">
      <SectionHeading
        icon={<ReportProblemIcon color="error" />}
        title="البلاغات"
        subtitle="بلاغات النواقل ودورة التقييم والاعتماد والفتح"
        action={<Button size="small" variant="contained" onClick={() => setFormOpen((o) => !o)}>{formOpen ? 'إخفاء' : 'بلاغ جديد'}</Button>}
      />
      {formOpen && <NewReportForm onSaved={() => t.refresh()} />}
      <DataTable<VectorReport>
        columns={[
          { key: 'report_number', label: 'الرقم', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.report_number}</Typography> },
          { key: 'entry_point_name', label: 'نقطة الدخول' },
          { key: 'report_type', label: 'النوع', render: (r) => { const m = vectorTypeMap[r.report_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.report_type; } },
          { key: 'source', label: 'المصدر', render: (r) => { const m = vectorReportSource[r.source]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.source; }, hideOnMobile: true },
          { key: 'severity', label: 'الخطورة', render: (r) => { const m = vectorSeverity[r.severity]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.severity; } },
          { key: 'problem_description', label: 'الوصف', render: (r) => <Typography noWrap sx={{ maxWidth: 220 }}>{r.problem_description}</Typography>, hideOnMobile: true },
          { key: 'reported_at', label: 'التاريخ', render: (r) => formatDateTime(r.reported_at), hideOnMobile: true },
          { key: 'status', label: 'الحالة', render: (r) => { const m = vectorReportStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
          {
            key: 'actions', label: 'إجراءات', sortable: false,
            render: (r) => (
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {r.status === 'NEW' && (
                  <>
                    <Button size="small" variant="outlined" onClick={() => act(assessReport(r.id, askNote('ملاحظة التقييم:') ?? ''))}>تقييم</Button>
                    <Button size="small" color="error" onClick={() => { const n = askNote('سبب الرفض:'); if (n !== null) act(rejectReport(r.id, n)); }}>رفض</Button>
                  </>
                )}
                {r.status === 'ASSESSING' && (
                  <>
                    <Button size="small" color="success" onClick={() => act(acceptReport(r.id))}>اعتماد</Button>
                    <Button size="small" variant="outlined" onClick={() => act(openFocusFromReport(r.id))}>فتح بؤرة</Button>
                    <Button size="small" color="error" onClick={() => { const n = askNote('سبب الرفض:'); if (n !== null) act(rejectReport(r.id, n)); }}>رفض</Button>
                  </>
                )}
                {['NEW', 'ACCEPTED', 'IN_PROGRESS', 'FOLLOW_UP'].includes(r.status) && r.status !== 'ASSESSING' && (
                  <Button size="small" variant="outlined" onClick={() => act(openFocusFromReport(r.id))}>فتح بؤرة</Button>
                )}
                {!['CLOSED', 'REJECTED', 'NEW', 'ASSESSING'].includes(r.status) && (
                  <Button size="small" color="inherit" onClick={() => { const n = askNote('سبب الإغلاق (اختياري):'); if (n !== null) act(closeReport(r.id)); }}>إغلاق</Button>
                )}
              </Box>
            ),
          },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="البلاغات" subtitle={`${t.count} بلاغ`}
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالرقم أو المنفذ أو الوصف..."
        filters={[
          { key: 'status', label: 'الحالة', options: Object.entries(vectorReportStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) },
          { key: 'severity', label: 'الخطورة', options: Object.entries(vectorSeverity).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('severity', v) },
        ]}
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
        emptyTitle="لا توجد بلاغات" emptyDescription="بلاغات النواقل تظهر هنا"
      />
      {t.count === 0 && <Alert severity="info" sx={{ mt: 2 }}>يمكن تسجيل بلاغ ميداني يعمل أيضًا دون اتصال.</Alert>}
    </SectionCard>
  );
};

export default ReportsSection;