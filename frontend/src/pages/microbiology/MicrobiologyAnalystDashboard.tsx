import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ScienceIcon from '@mui/icons-material/Science';
import BiotechIcon from '@mui/icons-material/Biotech';
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BuildIcon from '@mui/icons-material/Build';
import TimerIcon from '@mui/icons-material/Timer';
import VisibilityIcon from '@mui/icons-material/Visibility';
import GrainIcon from '@mui/icons-material/Grain';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import {
  AppButton,
  DataTable,
  StatusChip,
  type DataTableColumn,
} from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import {
  getLabEquipment,
  getLabParameters,
  getLabSampleTests,
  getLabSamples,
  getMicroBiologyDashboard,
  getMicroSpecifications,
  startSampleTest,
} from '../../api/endpoints/foodlab';
import type {
  FoodSample,
  LabEquipment,
  LabParameter,
  MicroDashboard,
  MicrobiologicalSpecification,
  SampleTest,
} from '../../types/food';
import { labPriority, labSampleStatus, labTestStatus, labSla } from '../../utils/status';
import { formatDate } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const TEST_STATUS_BY_FILTER: Record<string, string> = {
  new: 'PENDING',
  in_analysis: 'IN_PROGRESS',
  incubation: 'IN_PROGRESS',
  ready_reading: 'DRAFT',
  submitted: 'SUBMITTED',
  returned: 'DRAFT',
};

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <BiotechIcon fontSize="small" /> },
  { id: 'tests', label: 'التحاليل', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'samples', label: 'العينات', icon: <ScienceIcon fontSize="small" /> },
  { id: 'equipment', label: 'الأجهزة', icon: <BuildIcon fontSize="small" /> },
  { id: 'specs', label: 'المواصفات', icon: <GrainIcon fontSize="small" /> },
  { id: 'sla', label: 'SLA', icon: <TimerIcon fontSize="small" /> },
  { id: 'alerts', label: 'التنبيهات', icon: <WarningAmberIcon fontSize="small" /> },
] as const;

const MicrobiologyAnalystDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter') ?? '';
  const testParam = searchParams.get('test') ?? '';
  const view = searchParams.get('view') ?? '';

  const [dash, setDash] = useState<MicroDashboard | null>(null);
  const [equipment, setEquipment] = useState<LabEquipment[]>([]);
  const [specs, setSpecs] = useState<MicrobiologicalSpecification[]>([]);
  const [parameters, setParameters] = useState<LabParameter[]>([]);

  const samples = useServerTable<FoodSample>({ fetchData: getLabSamples });
  const tests = useServerTable<SampleTest>({ fetchData: getLabSampleTests, initialPageSize: 25 });

  useEffect(() => {
    samples.setFilter('bench', 'MICROBIOLOGY');
    tests.setFilter('bench', 'MICROBIOLOGY');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const parameterIdFor = (keyword: string) => {
    if (!keyword) return '';
    const k = keyword.toLowerCase();
    return (
      parameters.find((p) => `${p.name_ar} ${p.name_en} ${p.code}`.toLowerCase().includes(k))?.id ??
      parameters.find((p) => `${p.name_ar} ${p.name_en} ${p.code}`.toLowerCase().includes(k.split('_').join(' ')))?.id ??
      ''
    );
  };

  useEffect(() => {
    tests.setFilter('status', TEST_STATUS_BY_FILTER[filter] ?? '');
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    tests.setFilter('parameter', parameterIdFor(testParam));
  }, [testParam, parameters]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshDash = useCallback(() => {
    getMicroBiologyDashboard().then((r) => setDash(r.data.data)).catch(() => undefined);
  }, []);

  const refreshEquipment = useCallback(() => {
    getLabEquipment({ bench: 'MICROBIOLOGY', page_size: 100 })
      .then((r) => setEquipment(r.data.data.results))
      .catch(() => undefined);
  }, []);

  const refreshSpecs = useCallback(() => {
    getMicroSpecifications({ page_size: 100 })
      .then((r) => setSpecs(r.data.data.results))
      .catch(() => undefined);
  }, []);

  const refreshAll = useCallback(() => {
    refreshDash();
    samples.refresh();
    tests.refresh();
    refreshEquipment();
    refreshSpecs();
  }, [refreshDash, refreshEquipment, refreshSpecs, samples, tests]);

  useEffect(() => {
    getLabParameters({ bench: 'MICROBIOLOGY', page_size: 100 })
      .then((r) => setParameters(r.data.data.results))
      .catch(() => undefined);
    refreshAll();
  }, [refreshAll]);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [tests.loading, samples.loading]);

  useEffect(() => {
    if (view) {
      const timer = setTimeout(() => scrollTo(view), 100);
      return () => clearTimeout(timer);
    }
  }, [view, scrollTo]);

  const handleStart = useCallback(
    async (test: SampleTest) => {
      try {
        await startSampleTest(test.id);
        notifySuccess('تم بدء التحليل');
        tests.refresh();
        refreshDash();
      } catch {
        notifyError('فشل في بدء التحليل');
      }
    },
    [tests, refreshDash]
  );

  const stat = (label: string, value: number | string, icon: React.ReactNode, accent?: string) => (
    <Grid item xs={6} sm={4} md={3}>
      <KpiCard label={label} value={value ?? '—'} icon={icon} accent={accent} />
    </Grid>
  );

  const sampleColumns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_barcode', label: 'الباركود', render: (s) => <b>{s.sample_barcode}</b> },
    { key: 'sample_type', label: 'المنتج', noWrap: false },
    { key: 'priority', label: 'الأولوية', render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    { key: 'status', label: 'الحالة', render: (s) => <StatusChip label={labSampleStatus[s.status]?.label ?? s.status} tone={labSampleStatus[s.status]?.tone} /> },
    { key: 'analyst_name', label: 'المحلل', render: (s) => s.analyst_name ?? '—' },
    { key: 'received_at', label: 'تاريخ الاستلام', render: (s) => (s.received_at ? formatDate(new Date(s.received_at)) : '—') },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={1}>
          {s.status === 'DRAFT' && (
            <AppButton size="small" onClick={() => handleStartTestFromSample(s)}>
              بدء
            </AppButton>
          )}
          <AppButton size="small" variant="secondary" onClick={() => navigate(`/app/microbiology-analyst/${s.id}`)}>
            <VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} />
            تفاصيل
          </AppButton>
        </Stack>
      ),
    },
  ], [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const testColumns: DataTableColumn<SampleTest>[] = useMemo(() => [
    { key: 'parameter', label: 'الفحص', noWrap: false, render: (t) => <b>{t.parameter?.name_ar ?? '—'}</b> },
    { key: 'status', label: 'الحالة', render: (t) => <StatusChip label={labTestStatus[t.status]?.label ?? t.status} tone={labTestStatus[t.status]?.tone} /> },
    { key: 'result_value', label: 'النتيجة', render: (t) => (t.result_value != null ? `${t.result_value} ${t.unit}` : t.result_text || '—') },
    { key: 'decision', label: 'القرار', render: (t) => (t.decision ? <StatusChip label={t.decision} tone={t.decision === 'COMPLIANT' ? 'success' : t.decision === 'NON_COMPLIANT' ? 'error' : 'warning'} /> : '—') },
    { key: 'qc_status', label: 'مراجعة QC', render: (t) => <StatusChip label={t.qc_status_label ?? t.qc_status} tone={t.qc_status === 'PASSED' ? 'success' : t.qc_status === 'FAILED' ? 'error' : 'warning'} /> },
    { key: 'sla', label: 'SLA', render: (t) => (t.sla?.status ? <StatusChip label={labSla[t.sla.status]?.label ?? t.sla.status} tone={labSla[t.sla.status]?.tone} /> : '—') },
    {
      key: 'actions', label: '', render: (t) => (
        <Stack direction="row" spacing={1}>
          {t.status === 'PENDING' && (
            <AppButton size="small" startIcon={<PlayArrowIcon fontSize="small" />} onClick={() => handleStart(t)}>
              بدء
            </AppButton>
          )}
          <AppButton size="small" variant="secondary" onClick={() => navigate(`/app/microbiology-analyst/${t.sample}`)}>
            تفاصيل
          </AppButton>
        </Stack>
      ),
    },
  ], [navigate, handleStart]);

  const handleStartTestFromSample = useCallback(
    async (s: FoodSample) => {
      const target = tests.rows.find((t) => t.sample === s.id);
      if (target) await handleStart(target);
      else notifyError('لا يوجد اختبار مكلف لهذه العينة');
    },
    [tests, handleStart]
  );

  const slaRows = useMemo(
    () => tests.rows.filter((t) => t.sla?.status && t.sla.status !== 'ON_TIME' && t.sla.status !== 'COMPLETED'),
    [tests.rows],
  );

  const alerts = useMemo(() => {
    if (!dash) return [];
    const list: Array<{ severity: 'error' | 'warning' | 'info' | 'success'; text: string }> = [];
    if (dash.overdue_tests > 0) list.push({ severity: 'error', text: `${dash.overdue_tests} فحص تجاوز مدة SLA المطلوبة` });
    if (dash.at_risk_tests > 0) list.push({ severity: 'warning', text: `${dash.at_risk_tests} فحص قرب استحقاق المدة (خلال 24 ساعة)` });
    if (dash.qc_failed > 0) list.push({ severity: 'error', text: `${dash.qc_failed} مخالفة جودة (QC) تتطلب إجراء` });
    if (dash.qc_pending > 0) list.push({ severity: 'info', text: `${dash.qc_pending} نتيجة بانتظار مراجعة الجودة` });
    if (list.length === 0) list.push({ severity: 'success', text: 'لا تنبيهات حالياً — أداء القسم ضمن المؤشرات' });
    return list;
  }, [dash]);

  const slaPct = Math.min(Math.max(dash?.sla_compliance?.percent ?? 0, 0), 100);

  const specLimitRows = (spec: MicrobiologicalSpecification) =>
    (spec.current_version?.limits ?? []).filter((l) => l.active);

  const renderTestsTable = (title: string, subtitle?: string) => (
    <DataTable<SampleTest>
      columns={testColumns}
      rows={tests.rows}
      rowKey={(r) => r.id}
      count={tests.count}
      page={tests.page}
      rowsPerPage={tests.rowsPerPage}
      pageSizeOptions={tests.pageSizeOptions}
      loading={tests.loading}
      error={tests.error}
      title={title}
      subtitle={subtitle}
      search={tests.search}
      searchInput={tests.searchInput}
      onSearchChange={tests.setSearchInput}
      sortBy={tests.sortBy}
      sortOrder={tests.sortOrder}
      onSortChange={tests.setSorting}
      onPageChange={tests.setPage}
      onRowsPerPageChange={tests.setRowsPerPage}
      onRefresh={tests.refresh}
    />
  );

  const renderEquipment = () => (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <BuildIcon color="primary" />
        <Typography variant="h6">أجهزة القسم والمعايرة</Typography>
      </Stack>
      <Grid container spacing={1.5}>
        {equipment.map((e) => (
          <Grid item xs={12} md={6} lg={4} key={e.id}>
            <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 700 }}>{e.name_ar}</Typography>
                  <Typography variant="caption" color="text.secondary">{e.name_en} {e.model_number ? `• ${e.model_number}` : ''}</Typography>
                </Box>
                <StatusChip label={e.status_label ?? e.status} tone={e.status === 'OPERATIONAL' ? 'success' : e.status === 'UNDER_MAINTENANCE' ? 'warning' : 'error'} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                آخر معايرة: {e.last_calibrated ? formatDate(e.last_calibrated) : '—'}
                {e.calibration_overdue && (
                  <Typography component="span" variant="body2" color="error">
                    {' '}• تأخرت المعايرة ({e.next_calibration_due ? formatDate(e.next_calibration_due) : ''})
                  </Typography>
                )}
              </Typography>
            </Paper>
          </Grid>
        ))}
        {equipment.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">لا توجد أجهزة مسجلة في قسم الأحياء الدقيقة.</Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  const renderSpecs = () => (
    <Grid container spacing={2}>
      {specs.map((s) => (
        <Grid item xs={12} md={6} lg={4} key={s.id}>
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{s.name_ar}</Typography>
                <Typography variant="caption" color="text.secondary">{s.code} {s.product_name ? `• ${s.product_name}` : ''}</Typography>
              </Box>
              <StatusChip label={s.status_label ?? s.status} tone={s.status === 'ACTIVE' ? 'success' : s.status === 'DRAFT' ? 'warning' : 'neutral'} />
            </Stack>
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell>الكائن</TableCell>
                  <TableCell align="center">n</TableCell>
                  <TableCell align="center">c</TableCell>
                  <TableCell align="center">m</TableCell>
                  <TableCell align="center">M</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {specLimitRows(s).map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.microorganism_name ?? '—'}</TableCell>
                    <TableCell align="center">{l.n}</TableCell>
                    <TableCell align="center">{l.c}</TableCell>
                    <TableCell align="center">{l.m ?? '—'}</TableCell>
                    <TableCell align="center">{l.M ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {specLimitRows(s).length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center">لا حدود مفعّلة في الإصدار الحالي</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Grid>
      ))}
      {specs.length === 0 && (
        <Grid item xs={12}><Typography variant="body2" color="text.secondary">لا توجد مواصفات مسجلة.</Typography></Grid>
      )}
    </Grid>
  );

  const renderSla = () => (
    <>
      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {stat('التزام SLA', dash?.sla_compliance?.percent != null ? `${dash.sla_compliance.percent}%` : '—', <VerifiedIcon />)}
        {stat('ضمن المدة', dash?.sla_compliance?.on_time ?? '—', <CheckCircleIcon />)}
        {stat('متأخرة', dash?.overdue_tests ?? '—', <WarningAmberIcon />, 'error.main')}
        {stat('قرب الاستحقاق', dash?.at_risk_tests ?? '—', <TimerIcon />, 'warning.main')}
      </Grid>
      <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper', mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>نسبة الالتزام بمدة الإنجاز (SLA)</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, color: slaPct >= 90 ? 'success.main' : slaPct >= 70 ? 'warning.main' : 'error.main' }}>
            {slaPct}%
          </Typography>
        </Stack>
        <Box sx={{ height: 10, borderRadius: 10, bgcolor: 'action.hover', overflow: 'hidden' }}>
          <Box sx={{ width: `${slaPct}%`, height: '100%', borderRadius: 10, bgcolor: slaPct >= 90 ? 'success.main' : slaPct >= 70 ? 'warning.main' : 'error.main' }} />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          {dash?.sla_compliance?.count != null
            ? `${dash.sla_compliance.on_time} فحصاً من أصل ${dash.sla_compliance.count} أُنجزت ضمن المدة المطلوبة`
            : 'لا توجد بيانات كافية بعد'}
        </Typography>
      </Box>
      <DataTable<SampleTest>
        columns={testColumns}
        rows={slaRows}
        rowKey={(r) => r.id}
        count={slaRows.length}
        page={1}
        rowsPerPage={10}
        loading={tests.loading}
        error={tests.error}
        title="متابعة SLA — فحوصات قرب الاستحقاق أو المتأخرة"
        subtitle="الفلترة من صفحة النتائج الحالية"
        hidePagination
        onRefresh={tests.refresh}
      />
    </>
  );

  const renderAlerts = () => (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
      <Stack spacing={1.5}>
        {alerts.map((a, i) => (
          <Alert key={i} severity={a.severity}>{a.text}</Alert>
        ))}
      </Stack>
    </Box>
  );

  const pageTitle =
    view === 'sla' ? 'متابعة SLA' :
    view === 'alerts' ? 'التنبيهات' :
    view === 'specs' ? 'المواصفات والحدود الميكروبيولوجية' :
    view === 'equipment' ? 'أجهزة القسم والمعايرة' :
    view === 'media' ? 'الوسائط والكواشف' :
    testParam ? `فحوصات ${testParam}` :
    filter ? 'تصفية التحاليل' :
    'لوحة محلل الأحياء الدقيقة';

  const pageSubtitle =
    view === 'sla' ? 'مؤشرات الالتزام بمدة الإنجاز والفحوصات المتأخرة أو القريبة من الاستحقاق' :
    view === 'alerts' ? 'تنبيهات القسم من لوحة المؤشرات الحية' :
    view === 'specs' ? 'الحدود الميكروبيولوجية المطبَّقة (n/c/m/M) — القراءة فقط' :
    view === 'equipment' ? 'حالة الأجهزة ومعايرة المعدات في قسم الأحياء الدقيقة' :
    view === 'media' ? 'إدارة الوسائط والكواشف تتم عبر مسؤول الجودة — هنا نظرة عامة على القسم' :
    testParam ? `عرض فحوصات ${testParam} المكلف بها وفق المواصفة` :
    filter ? 'التحاليل المكلف بها وفق الحالة المحددة' :
    'العينات والتحاليل المكلف بها، الحضانة والقراءة، المواصفات الميكروبيولوجية، QC و SLA';

  return (
    <Box>
      <DashboardHero
        eyebrow="قسم الأحياء الدقيقة"
        title={pageTitle}
        subtitle={pageSubtitle}
        gradient="emerald"
        avatarLabel="ل"
        action={<AppButton variant="secondary" startIcon={<RefreshIcon />} onClick={refreshAll}>تحديث</AppButton>}
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
          {/* نظرة عامة */}
          <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              {stat('عينات جديدة', dash?.total_samples ?? '—', <ScienceIcon />)}
              {stat('قيد التحليل', dash?.under_testing ?? '—', <BiotechIcon />)}
              {stat('قيد الحضانة', dash?.under_testing ?? '—', <TimerIcon />, 'info.main')}
              {stat('جاهزة للمراجعة', dash?.ready_for_approval ?? '—', <VerifiedIcon />)}
              {stat('مكتملة', dash?.approved ?? '—', <CheckCircleIcon />)}
              {stat('متأخرة SLA', dash?.overdue_tests ?? '—', <ErrorOutlineIcon />, 'error.main')}
              {stat('بانتظار QC', dash?.qc_pending ?? '—', <FactCheckIcon />)}
              {stat('مواصفات نشطة', dash?.specs_active ?? specs.length ?? '—', <GrainIcon />)}
            </Grid>
          </Box>

          {/* التحاليل */}
          <Box component="section" ref={register('tests')} data-section="tests" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            {renderTestsTable('التحاليل الموكلة إليّ')}
          </Box>

          {/* العينات */}
          <Box component="section" ref={register('samples')} data-section="samples" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            <DataTable<FoodSample>
              columns={sampleColumns}
              rows={samples.rows}
              rowKey={(r) => r.id}
              count={samples.count}
              page={samples.page}
              rowsPerPage={samples.rowsPerPage}
              pageSizeOptions={samples.pageSizeOptions}
              loading={samples.loading}
              error={samples.error}
              title="عينات قسم الأحياء الدقيقة"
              search={samples.search}
              searchInput={samples.searchInput}
              onSearchChange={samples.setSearchInput}
              sortBy={samples.sortBy}
              sortOrder={samples.sortOrder}
              onSortChange={samples.setSorting}
              onPageChange={samples.setPage}
              onRowsPerPageChange={samples.setRowsPerPage}
              onRefresh={samples.refresh}
            />
          </Box>

          {/* الأجهزة */}
          <Box component="section" ref={register('equipment')} data-section="equipment" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            {renderEquipment()}
          </Box>

          {/* المواصفات */}
          <Box component="section" ref={register('specs')} data-section="specs" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            {renderSpecs()}
          </Box>

          {/* SLA */}
          <Box component="section" ref={register('sla')} data-section="sla" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            {renderSla()}
          </Box>

          {/* التنبيهات */}
          <Box component="section" ref={register('alerts')} data-section="alerts" sx={{ scrollMarginTop: '80px', mb: 3 }}>
            {renderAlerts()}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MicrobiologyAnalystDashboard;