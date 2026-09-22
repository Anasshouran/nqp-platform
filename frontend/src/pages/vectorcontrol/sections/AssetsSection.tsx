import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import { DataTable, StatusChip } from '../../../components/ui';
import { useServerTable } from '../../../hooks/useServerTable';
import {
  createEquipment,
  createTeam,
  getEquipment,
  getSites,
  getTeams,
  getUnits,
} from '../../../api/endpoints/vectorControl';
import type { VectorEquipment, VectorSite, VectorTeam, VectorUnit } from '../../../types/vectorControl';
import { vectorEquipmentKind, vectorEquipmentStatus, vectorSiteType, vectorTeamType, vectorUnitKind } from '../../../utils/status';
import { useVectorLookups } from '../hooks/useVectorLookups';
import { FieldGrid, SectionCard, SectionHeading, ToggleForm } from './common';
import { OfflineQueuedError } from '../../../utils/vectorOffline';

const AssetsSection = () => {
  const lk = useVectorLookups();
  const [equipOpen, setEquipOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  return (
    <SectionCard id="assets">
      <SectionHeading
        icon={<BuildCircleIcon color="secondary" />}
        title="الأصول والفِرق"
        subtitle="الفِرق، المعدات، الوحدات، والمواقع"
      />
      <EquipTable lk={lk} open={equipOpen} setOpen={setEquipOpen} />
      <TeamTable lk={lk} open={teamOpen} setOpen={setTeamOpen} />
      <UnitTable />
      <SiteTable lk={lk} />
    </SectionCard>
  );
};

interface InnerProps {
  lk: ReturnType<typeof useVectorLookups>;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

const EquipTable = ({ lk, open, setOpen }: InnerProps) => {
  const t = useServerTable<VectorEquipment>({ fetchData: getEquipment });
  const [form, setForm] = useState({
    name_ar: '', code: '', kind: 'SPRAYER', model: '', quantity: '1', status: 'OPERATIONAL',
    assigned_team: '', entry_point: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name_ar.trim() || !form.code.trim()) return;
    setSaving(true);
    try {
      await createEquipment({ ...form, quantity: Number(form.quantity), assigned_team: form.assigned_team || null, entry_point: form.entry_point || null });
      setForm((f) => ({ ...f, name_ar: '', code: '', model: '', quantity: '1', assigned_team: '', entry_point: '', notes: '' }));
      t.refresh();
      setOpen?.(false);
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر حفظ المعدة — تأكد من الرمز');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionHeading
        title="المعدات"
        subtitle={`${t.count} معدة`}
        action={<Button size="small" variant="outlined" onClick={() => setOpen?.((o) => !o)}>{open ? 'إخفاء' : 'معدة جديدة'}</Button>}
      />
      {open && (
        <ToggleForm open={true} onToggle={() => {}} title="معدة جديدة">
          <FieldGrid>
            <TextField required label="الاسم" value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} />
            <TextField required label="الرمز" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
            <TextField select label="النوع" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
              {Object.entries(vectorEquipmentKind).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
            </TextField>
            <TextField label="الموديل" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} />
            <TextField type="number" label="العدد" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            <TextField select label="الحالة" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {Object.entries(vectorEquipmentStatus).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
            </TextField>
            <TextField select label="الفريق المسند" value={form.assigned_team} onChange={(e) => setForm((f) => ({ ...f, assigned_team: e.target.value }))}>
              <MenuItem value="">—</MenuItem>
              {lk.teams.map((tm) => (<MenuItem key={tm.id} value={tm.id}>{tm.name_ar}</MenuItem>))}
            </TextField>
            <TextField select label="نقطة الدخول" value={form.entry_point} onChange={(e) => setForm((f) => ({ ...f, entry_point: e.target.value }))}>
              <MenuItem value="">—</MenuItem>
              {lk.entryPoints.map((e) => (<MenuItem key={e.id} value={e.id}>{e.name_ar}</MenuItem>))}
            </TextField>
          </FieldGrid>
          <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="ملاحظات" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={submit} disabled={saving || !form.name_ar.trim() || !form.code.trim()}>{saving ? 'جارٍ الحفظ...' : 'حفظ المعدة'}</Button>
          </Box>
        </ToggleForm>
      )}
      <DataTable<VectorEquipment>
        columns={[
          { key: 'code', label: 'الرمز', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.code}</Typography> },
          { key: 'name_ar', label: 'الاسم' },
          { key: 'kind', label: 'النوع', render: (r) => { const m = vectorEquipmentKind[r.kind]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.kind_display || r.kind; } },
          { key: 'quantity', label: 'العدد' },
          { key: 'status', label: 'الحالة', render: (r) => { const m = vectorEquipmentStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
          { key: 'assigned_team_name', label: 'الفريق', render: (r) => r.assigned_team_name ?? '—', hideOnMobile: true },
          { key: 'entry_point_name', label: 'نقطة الدخول', hideOnMobile: true },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="المعدات" subtitle={`${t.count} معدة`} hidePagination
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالرمز أو الاسم..."
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
        emptyTitle="لا توجد معدات" emptyDescription="معدات المكافحة تظهر هنا"
      />
    </>
  );
};

const TeamTable = ({ lk, open, setOpen }: InnerProps) => {
  const t = useServerTable<VectorTeam>({ fetchData: getTeams });
  const [form, setForm] = useState({ name_ar: '', team_type: 'CONTROL', leader: '', specialization: '', entry_points: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name_ar.trim()) return;
    setSaving(true);
    try {
      await createTeam({
        name_ar: form.name_ar,
        team_type: form.team_type,
        leader: form.leader || null,
        entry_point: (form.entry_points ? form.entry_points.split(',')[0].trim() : '') || null,
      });
      setForm((f) => ({ ...f, name_ar: '', leader: '', specialization: '', entry_points: '', notes: '' }));
      t.refresh();
      lk.reload();
      setOpen?.(false);
    } catch (err) {
      if (!(err instanceof OfflineQueuedError)) window.alert('تعذر حفظ الفريق');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SectionHeading
        title="الفِرق"
        subtitle={`${t.count} فريق`}
        action={<Button size="small" variant="outlined" onClick={() => setOpen?.((o) => !o)}>{open ? 'إخفاء' : 'فريق جديد'}</Button>}
      />
      {open && (
        <ToggleForm open={true} onToggle={() => {}} title="فريق جديد">
          <FieldGrid>
            <TextField required label="اسم الفريق" value={form.name_ar} onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))} />
            <TextField select label="النوع" value={form.team_type} onChange={(e) => setForm((f) => ({ ...f, team_type: e.target.value }))}>
              {Object.entries(vectorTeamType).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
            </TextField>
            <TextField label="القائد" value={form.leader} onChange={(e) => setForm((f) => ({ ...f, leader: e.target.value }))} />
            <TextField label="التخصص" value={form.specialization} onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))} />
            <TextField label="نقاط الدخول (معرّفات مفصولة بفاصلة)" value={form.entry_points} onChange={(e) => setForm((f) => ({ ...f, entry_points: e.target.value }))} />
          </FieldGrid>
          <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="ملاحظات" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={submit} disabled={saving || !form.name_ar.trim()}>{saving ? 'جارٍ الحفظ...' : 'حفظ الفريق'}</Button>
          </Box>
        </ToggleForm>
      )}
      <DataTable<VectorTeam>
        columns={[
          { key: 'name_ar', label: 'الفريق' },
          { key: 'team_type', label: 'النوع', render: (r) => { const m = vectorTeamType[r.team_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.team_type; } },
          { key: 'leader', label: 'القائد', render: (r) => r.leader || '—' },
          { key: 'members_count', label: 'الأعضاء', render: (r) => r.members_count ?? '—', hideOnMobile: true },
          { key: 'entry_point_name', label: 'نقطة الدخول', render: (r) => r.entry_point_name || '—', hideOnMobile: true },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="الفِرق" subtitle={`${t.count} فريق`} hidePagination
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث باسم الفريق..."
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={() => { t.refresh(); lk.reload(); }}
        emptyTitle="لا توجد فِرق" emptyDescription="فِرق المكافحة تظهر هنا"
      />
    </>
  );
};

const UnitTable = () => {
  const t = useServerTable<VectorUnit>({ fetchData: getUnits });
  return (
    <>
      <SectionHeading title="الوحدات" subtitle={`${t.count} وحدة`} />
      <DataTable<VectorUnit>
        columns={[
          { key: 'name_ar', label: 'الوحدة' },
          { key: 'code', label: 'الرمز', render: (r) => <Typography sx={{ fontFamily: 'monospace' }}>{r.code}</Typography>, hideOnMobile: true },
          { key: 'kind', label: 'الاختصاص', render: (r) => { const m = vectorUnitKind[r.kind]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.kind; } },
          { key: 'sector_name', label: 'القطاع', hideOnMobile: true },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="الوحدات" subtitle={`${t.count} وحدة`} hidePagination
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث باسم الوحدة..."
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
        emptyTitle="لا توجد وحدات" emptyDescription="وحدات المكافحة تظهر هنا"
      />
    </>
  );
};

const SiteTable = ({ lk }: { lk: ReturnType<typeof useVectorLookups> }) => {
  const t = useServerTable<VectorSite>({ fetchData: getSites });
  return (
    <>
      <SectionHeading title="المواقع" subtitle={`${t.count} موقع`} />
      <DataTable<VectorSite>
        columns={[
          { key: 'name_ar', label: 'الموقع' },
          { key: 'site_type', label: 'النوع', render: (r) => { const m = vectorSiteType[r.site_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.site_type; } },
          { key: 'entry_point_name', label: 'نقطة الدخول' },
        ]}
        rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
        pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
        title="المواقع" subtitle={`${t.count} موقع`} hidePagination
        searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث باسم الموقع..."
        onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={() => { t.refresh(); lk.reload(); }}
        emptyTitle="لا توجد مواقع" emptyDescription="مواقع المكافحة تظهر هنا"
      />
    </>
  );
};

export default AssetsSection;