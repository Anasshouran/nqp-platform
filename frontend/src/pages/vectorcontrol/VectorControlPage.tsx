import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AnchorIcon from '@mui/icons-material/Anchor';
import BugReportIcon from '@mui/icons-material/BugReport';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import DashboardHero from '../../components/dashboard/DashboardHero';
import KpiCard from '../../components/dashboard/KpiCard';
import { DataTable, StatusChip } from '../../components/ui';
import { useServerTable } from '../../hooks/useServerTable';
import {
  approveSurvey,
  createOperation,
  createSurvey,
  closeOperation,
  getOperations,
  getSurveys,
  getVectorDashboard,
  getVectors,
  nextOperationStatus,
  setOperationResult,
} from '../../api/endpoints/vectorControl';
import { getMasterEntryPoints } from '../../api/endpoints/masterdata';
import type {
  VectorControlOperation,
  VectorDashboardOverview,
  VectorRegistry,
  VectorSurvey,
} from '../../types/vectorControl';
import type { MasterEntryPoint } from '../../types/masterdata';
import { formatDate } from '../../utils/formatters';
import {
  vectorDensity,
  vectorOperationStatus,
  vectorOperationType,
  vectorTypeMap,
} from '../../utils/status';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'overview', label: 'لوحة المؤشرات', icon: <AnchorIcon fontSize="small" /> },
  { id: 'vectors', label: 'سجل النواقل', icon: <BugReportIcon fontSize="small" /> },
  { id: 'surveys', label: 'المسوحات', icon: <SearchIcon fontSize="small" /> },
  { id: 'new-survey', label: 'مسح جديد', icon: <AddCircleOutlineIcon fontSize="small" /> },
  { id: 'orders', label: 'أوامر العمل', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'new-order', label: 'إنشاء أمر عمل', icon: <AssignmentTurnedInIcon fontSize="small" /> },
] as const;

const DashboardTab = () => {
  const [overview, setOverview] = useState<VectorDashboardOverview | null>(null);
  useEffect(() => {
    getVectorDashboard().then((r) => setOverview(r.data.data));
  }, []);

  const d = overview?.by_severity;
  const cards = [
    { icon: <BugReportIcon />, value: overview?.reports_new ?? 0, label: 'بلاغات جديدة' },
    { icon: <SearchIcon />, value: overview?.surveys_this_month ?? 0, label: 'مسوحات هذا الشهر' },
    { icon: <AssignmentTurnedInIcon />, value: overview?.operations_active ?? 0, label: 'عمليات نشطة' },
    { icon: <FactCheckIcon />, value: `${overview?.avg_effectiveness ?? 0}%`, label: 'متوسط الفعالية' },
  ];
  const riskCards = [
    { value: d?.CRITICAL ?? 0, label: '🔴 حرجة', accent: 'error.main' },
    { value: d?.HIGH ?? 0, label: '🟠 عالية', accent: 'warning.main' },
    { value: d?.MEDIUM ?? 0, label: '🟡 متوسطة', accent: 'info.main' },
    { value: d?.LOW ?? 0, label: '🟢 منخفضة' },
  ];

  return (
    <Grid container spacing={1.5}>
      {cards.map((c, i) => (
        <Grid item xs={12} sm={6} md={3} key={i}>
          <KpiCard icon={c.icon} value={c.value} label={c.label} />
        </Grid>
      ))}
      {riskCards.map((c, i) => (
        <Grid item xs={12} sm={6} md={3} key={`r${i}`}>
          <KpiCard value={c.value} label={c.label} accent={c.accent} />
        </Grid>
      ))}
      <Grid item xs={12} sm={6} md={3}>
        <KpiCard value={overview?.foci_active ?? 0} label="بؤر نشطة" />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <KpiCard value={overview?.operations_completed ?? 0} label="عمليات منفذة" />
      </Grid>
    </Grid>
  );
};

const VectorsTab = () => {
  const t = useServerTable<VectorRegistry>({ fetchData: (p) => getVectors({ ...p, include_inactive: 'true' }) });
  return (
    <DataTable<VectorRegistry>
      columns={[
        { key: 'name_ar', label: 'الناقل', render: (r) => <Typography sx={{ fontWeight: 700 }}>{r.name_ar}</Typography> },
        { key: 'vector_type', label: 'النوع', render: (r) => { const m = vectorTypeMap[r.vector_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.vector_type; } },
        { key: 'species', label: 'النويع', render: (r) => r.species || '—', hideOnMobile: true },
        { key: 'disease_risk', label: 'الأمراض المرتبطة', render: (r) => r.disease_risk || '—', hideOnMobile: true },
        { key: 'is_active', label: 'نشط', render: (r) => (r.is_active ? 'نعم' : 'لا') },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="سجل النواقل" subtitle={`${t.count} ناقل`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالاسم أو النويع..."
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد نواقل" emptyDescription="سجل النواقل المركزي يظهر هنا"
    />
  );
};

const SurveysTab = () => {
  const t = useServerTable<VectorSurvey>({ fetchData: getSurveys });
  return (
    <DataTable<VectorSurvey>
      columns={[
        { key: 'survey_number', label: 'رقم المسح', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.survey_number}</Typography> },
        { key: 'entry_point_name', label: 'نقطة الدخول' },
        { key: 'vector_name', label: 'الناقل', render: (r) => { const m = vectorTypeMap[r.vector_type ?? '']; return (<Box><Typography variant="body2">{r.vector_name}</Typography>{m && <StatusChip label={m.label} tone={m.tone} />}</Box>); }, hideOnMobile: true },
        { key: 'area', label: 'المنطقة', hideOnMobile: true },
        { key: 'breeding_sites', label: 'مواقع التوالد' },
        { key: 'density', label: 'الكثافة', render: (r) => { const m = vectorDensity[r.density]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.density; } },
        { key: 'proposed_risk', label: 'الخطورة', render: (r) => { const m = vectorDensity[r.proposed_risk]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.proposed_risk; }, hideOnMobile: true },
        { key: 'status', label: 'الحالة', render: (r) => r.status_display || r.status, hideOnMobile: true },
        { key: 'actions', label: 'إجراء', sortable: false, render: (r) => (r.status === 'SUBMITTED' ? (<Button size="small" variant="outlined" onClick={() => approveSurvey(r.id).then(() => t.refresh())}>اعتماد</Button>) : '—') },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="مسوحات النواقل" subtitle={`${t.count} مسح`}
      searchInput={t.searchInput} onSearchChange={t.setSearchInput} searchPlaceholder="بحث بالرقم أو المنطقة..."
      filters={[{ key: 'density', label: 'الكثافة', options: Object.entries(vectorDensity).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('density', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد مسوحات" emptyDescription="مسوحات النواقل في نقاط الدخول تظهر هنا"
    />
  );
};

const DENSITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const NewSurveyForm = ({ onSaved }: { onSaved?: () => void }) => {
  const [entryPoints, setEntryPoints] = useState<MasterEntryPoint[]>([]);
  const [vectors, setVectors] = useState<VectorRegistry[]>([]);
  const [entryPointId, setEntryPointId] = useState('');
  const [vectorId, setVectorId] = useState('');
  const [area, setArea] = useState('');
  const [team, setTeam] = useState('');
  const [breedingSites, setBreedingSites] = useState<number | string>('');
  const [density, setDensity] = useState<string>('LOW');
  const [conditions, setConditions] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMasterEntryPoints({ page_size: 100 }).then((r) => setEntryPoints(r.data.data.results));
    getVectors({ page_size: 100 }).then((r) => setVectors(r.data.data.results));
  }, []);

  const suggestedRisk = useMemo(
    () => ({ LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', CRITICAL: 'CRITICAL' }[density] ?? 'LOW'),
    [density],
  );

  const submit = async () => {
    if (!entryPointId || !vectorId || !area) return;
    setSaving(true);
    try {
      await createSurvey({
        entry_point: entryPointId,
        vector: vectorId,
        area,
        team,
        breeding_sites: Number(breedingSites) || 0,
        density,
        proposed_risk: suggestedRisk,
        environmental_conditions: conditions,
      });
      setArea(''); setTeam(''); setBreedingSites(''); setDensity('LOW'); setConditions('');
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card><CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <SearchIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>مسح نواقل جديد</Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField select fullWidth required label="نقطة الدخول" value={entryPointId} onChange={(e) => setEntryPointId(e.target.value)}>
            {entryPoints.map((e) => (<MenuItem key={e.id} value={e.id}>{e.name_ar}</MenuItem>))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField select fullWidth required label="الناقل المستهدف" value={vectorId} onChange={(e) => setVectorId(e.target.value)}>
            {vectors.map((v) => (<MenuItem key={v.id} value={v.id}>{v.name_ar}</MenuItem>))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth required label="منطقة المسح" value={area} onChange={(e) => setArea(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="فريق المسح" value={team} onChange={(e) => setTeam(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField fullWidth type="number" label="مواقع التوالد المكتشفة" value={breedingSites} onChange={(e) => setBreedingSites(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={8}>
          <TextField select fullWidth label="الكثافة" value={density} onChange={(e) => setDensity(e.target.value)}>
            {DENSITIES.map((d) => (<MenuItem key={d} value={d}>{vectorDensity[d]?.label ?? d}</MenuItem>))}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth multiline minRows={2} label="الظروف البيئية" value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="درجة الحرارة، مياه راكدة..." />
        </Grid>
        <Grid item xs={12}>
          <Alert severity="info">التقييم المبدئي للخطورة المقترح تلقائيًا: <b>{vectorDensity[suggestedRisk]?.label}</b></Alert>
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" onClick={submit} disabled={saving || !entryPointId || !vectorId || !area}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ المسح'}
          </Button>
        </Grid>
      </Grid>
    </CardContent></Card>
  );
};

const OperationsTab = () => {
  const t = useServerTable<VectorControlOperation>({ fetchData: getOperations });
  const act = (p: Promise<unknown>) => p.then(() => t.refresh()).catch(() => t.refresh());

  return (
    <DataTable<VectorControlOperation>
      columns={[
        { key: 'op_number', label: 'رقم الأمر', render: (r) => <Typography sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.op_number}</Typography> },
        { key: 'entry_point_name', label: 'نقطة الدخول' },
        { key: 'vector_name', label: 'الناقل المستهدف', render: (r) => r.vector_name || '—', hideOnMobile: true },
        { key: 'operation_type', label: 'الطريقة', render: (r) => { const m = vectorOperationType[r.operation_type]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.operation_type; }, hideOnMobile: true },
        { key: 'focus_severity', label: 'الخطورة', render: (r) => { const m = r.focus_severity ? vectorDensity[r.focus_severity] : undefined; return m ? <StatusChip label={m.label} tone={m.tone} /> : (r.focus_severity ?? '—'); } },
        { key: 'team_name', label: 'الفريق', render: (r) => r.team_name || '—', hideOnMobile: true },
        { key: 'planned_at', label: 'الاستحقاق', render: (r) => (r.planned_at ? formatDate(r.planned_at) : '—'), hideOnMobile: true },
        { key: 'effectiveness', label: 'الفعالية', sortable: false, render: (r) => (r.effectiveness_percent != null ? `${r.effectiveness_percent}% ${r.result_effective ? '✅' : '❌'}` : '—') },
        { key: 'status', label: 'الحالة', render: (r) => { const m = vectorOperationStatus[r.status]; return m ? <StatusChip label={m.label} tone={m.tone} /> : r.status; } },
        {
          key: 'actions', label: 'إجراءات', sortable: false,
          render: (r) => (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {r.status === 'DRAFT' && (
                <Button size="small" variant="outlined" onClick={() => act(nextOperationStatus(r.id, { team: r.team ?? 'فريق نواقل #1' }))}>إسناد</Button>
              )}
              {['APPROVED', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status) && (
                <Button size="small" variant="contained" onClick={() => act(nextOperationStatus(r.id))}>تقدم</Button>
              )}
              {r.status === 'COMPLETED' && (
                <>
                  <Button size="small" color="success" onClick={() => act(setOperationResult(r.id, { effective: true, effectiveness_percent: 85 }))}>فعالة</Button>
                  <Button size="small" color="error" onClick={() => act(setOperationResult(r.id, { effective: false }))}>غير فعالة</Button>
                </>
              )}
              {r.status === 'FOLLOW_UP' && r.result_effective && (
                <Button size="small" variant="outlined" onClick={() => act(closeOperation(r.id))}>إغلاق</Button>
              )}
            </Box>
          ),
        },
      ]}
      rows={t.rows} rowKey={(r) => r.id} count={t.count} page={t.page} rowsPerPage={t.rowsPerPage}
      pageSizeOptions={t.pageSizeOptions} loading={t.loading} error={t.error}
      title="أوامر العمل" subtitle={`${t.count} أمر عمل`}
      filters={[{ key: 'status', label: 'الحالة', options: Object.entries(vectorOperationStatus).map(([v, m]) => ({ value: v, label: m.label })), value: '', onChange: (v) => t.setFilter('status', v) }]}
      onPageChange={t.setPage} onRowsPerPageChange={t.setRowsPerPage} onRefresh={t.refresh}
      emptyTitle="لا توجد أوامر عمل" emptyDescription="أوامر مكافحة النواقل تظهر هنا"
    />
  );
};

const CreateOperationForm = () => {
  const [surveys, setSurveys] = useState<VectorSurvey[]>([]);
  const [surveyId, setSurveyId] = useState('');
  const [method, setMethod] = useState('LARVICIDING');
  const [team, setTeam] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSurveys({ page_size: 100 }).then((r) =>
      setSurveys(r.data.data.results.filter((s) => s.status === 'APPROVED')),
    );
  }, []);

  const submit = async () => {
    if (!surveyId) return;
    setSaving(true);
    try {
      const survey = surveys.find((s) => s.id === surveyId);
      await createOperation({
        entry_point: survey?.entry_point ?? '',
        vector: survey?.vector ?? null,
        focus: survey?.suggested_focus ?? null,
        operation_type: method,
        team: team || null,
        planned_at: dueDate || null,
      });
      setSurveyId(''); setTeam(''); setDueDate('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card><CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AssignmentTurnedInIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>أمر عمل جديد من مسح معتمد</Typography>
      </Box>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField select fullWidth required label="المسح المصدر" value={surveyId} onChange={(e) => setSurveyId(e.target.value)}>
            {surveys.map((s) => (<MenuItem key={s.id} value={s.id}>{s.survey_number} — {s.entry_point_name}</MenuItem>))}
          </TextField>
          {surveys.length === 0 && <Alert severity="info" sx={{ mt: 1 }}>لا توجد مسوحات معتمدة بعد — اعتمد مسحًا أولًا.</Alert>}
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField select fullWidth label="طريقة المكافحة" value={method} onChange={(e) => setMethod(e.target.value)}>
            {Object.entries(vectorOperationType).map(([v, m]) => (<MenuItem key={v} value={v}>{m.label}</MenuItem>))}
          </TextField>
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth label="الفريق المسند" value={team} onChange={(e) => setTeam(e.target.value)} />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField fullWidth type="date" label="تاريخ الاستحقاق" InputLabelProps={{ shrink: true }} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Grid>
        <Grid item xs={12}>
          <Button variant="contained" onClick={submit} disabled={saving || !surveyId}>{saving ? 'جارٍ الحفظ...' : 'إنشاء أمر العمل'}</Button>
        </Grid>
      </Grid>
    </CardContent></Card>
  );
};

const VectorControlPage = () => {
  const [loading] = useState(false);
  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [loading]);

  return (
    <Box>
      <DashboardHero
        eyebrow="العمليات"
        title="مكافحة النواقل"
        subtitle="المسح وتقييم المخاطر وأوامر العمل ومتابعة الفعالية في نقاط الدخول"
        gradient="emerald"
        avatarLabel="م"
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            مباشر
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label="أقسام اللوحة"
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
            <DashboardTab />
          </Box>

          <Box component="section" ref={register('vectors')} data-section="vectors" sx={{ scrollMarginTop: '80px' }}>
            <VectorsTab />
          </Box>

          <Box component="section" ref={register('surveys')} data-section="surveys" sx={{ scrollMarginTop: '80px' }}>
            <SurveysTab />
          </Box>

          <Box component="section" ref={register('new-survey')} data-section="new-survey" sx={{ scrollMarginTop: '80px' }}>
            <NewSurveyForm />
          </Box>

          <Box component="section" ref={register('orders')} data-section="orders" sx={{ scrollMarginTop: '80px' }}>
            <OperationsTab />
          </Box>

          <Box component="section" ref={register('new-order')} data-section="new-order" sx={{ scrollMarginTop: '80px' }}>
            <CreateOperationForm />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VectorControlPage;