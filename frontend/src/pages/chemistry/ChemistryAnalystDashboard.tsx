import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ScienceIcon from '@mui/icons-material/Science';
import BiotechIcon from '@mui/icons-material/Biotech';
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BuildIcon from '@mui/icons-material/Build';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import {
  AppButton,
  DataTable,
  StatusChip,
  type DataTableColumn,
} from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import {
  getChemistryDashboard,
  getLabEquipment,
  getLabSampleTests,
  getLabSamples,
  startSampleTest,
} from '../../api/endpoints/foodlab';
import type {
  ChemistryDashboard,
  FoodSample,
  LabEquipment,
  SampleTest,
} from '../../types/food';
import { labPriority, labSampleStatus, labTestStatus, labSla } from '../../utils/status';
import { formatDate } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = [
  { id: 'overview', label: 'نظرة عامة', icon: <MonitorHeartIcon fontSize="small" /> },
  { id: 'tests', label: 'التحاليل', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'samples', label: 'العينات', icon: <BiotechIcon fontSize="small" /> },
  { id: 'equipment', label: 'الأجهزة', icon: <BuildIcon fontSize="small" /> },
] as const;

const ChemistryAnalystDashboard = () => {
  const navigate = useNavigate();
  const [dash, setDash] = useState<ChemistryDashboard | null>(null);
  const [equipment, setEquipment] = useState<LabEquipment[]>([]);

  const samples = useServerTable<FoodSample>({ fetchData: getLabSamples });
  const tests = useServerTable<SampleTest>({ fetchData: getLabSampleTests });

  useEffect(() => {
    samples.setFilter('bench', 'CHEMISTRY');
    tests.setFilter('bench', 'CHEMISTRY');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshDash = useCallback(() => {
    getChemistryDashboard().then((r) => setDash(r.data.data)).catch(() => undefined);
  }, []);

  const refreshEquipment = useCallback(() => {
    getLabEquipment({ bench: 'CHEMISTRY', page_size: 100 })
      .then((r) => setEquipment(r.data.data.results))
      .catch(() => undefined);
  }, []);

  const refreshAll = useCallback(() => {
    refreshDash();
    samples.refresh();
    tests.refresh();
    refreshEquipment();
  }, [refreshDash, refreshEquipment, samples, tests]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [dash, samples.loading, tests.loading]);

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
    { key: 'sample_type', label: 'المنتج' },
    { key: 'priority', label: 'الأولوية', render: (s) => <StatusChip label={labPriority[s.priority]?.label ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    { key: 'status', label: 'الحالة', render: (s) => <StatusChip label={labSampleStatus[s.status]?.label ?? s.status} tone={labSampleStatus[s.status]?.tone} /> },
    { key: 'analyst_name', label: 'المحلل', render: (s) => s.analyst_name ?? '—' },
    { key: 'received_at', label: 'تاريخ الاستلام', render: (s) => (s.received_at ? formatDate(new Date(s.received_at)) : '—') },
    {
      key: 'actions', label: '', render: (s) => (
        <Stack direction="row" spacing={1}>
          {s.status === 'DRAFT' && (
            <AppButton size="small" onClick={() => handleStartTestFromSample(s)}>▶️ بدء</AppButton>
          )}
          <AppButton size="small" variant="secondary" onClick={() => navigate(`/app/chemistry-analyst/${s.id}`)}>
            <VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} />
            تفاصيل
          </AppButton>
        </Stack>
      ),
    },
  ], [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const testColumns: DataTableColumn<SampleTest>[] = useMemo(() => [
    { key: 'parameter', label: 'الفحص', render: (t) => <b>{t.parameter?.name_ar ?? '—'}</b> },
    { key: 'status', label: 'الحالة', render: (t) => <StatusChip label={labTestStatus[t.status]?.label ?? t.status} tone={labTestStatus[t.status]?.tone} /> },
    { key: 'result_value', label: 'النتيجة', render: (t) => (t.result_value != null ? `${t.result_value} ${t.unit}` : t.result_text || '—') },
    { key: 'decision', label: 'القرار', render: (t) => (t.decision ? <StatusChip label={t.decision} tone={t.decision === 'COMPLIANT' ? 'success' : t.decision === 'NON_COMPLIANT' ? 'error' : 'warning'} /> : '—') },
    { key: 'qc_status', label: 'مراجعة QC', render: (t) => <StatusChip label={t.qc_status_label ?? t.qc_status} tone={t.qc_status === 'PASSED' ? 'success' : t.qc_status === 'FAILED' ? 'error' : 'warning'} /> },
    { key: 'sla', label: 'SLA', render: (t) => (t.sla?.status ? <StatusChip label={labSla[t.sla.status]?.label ?? t.sla.status} tone={labSla[t.sla.status]?.tone} /> : '—') },
    {
      key: 'actions', label: '', render: (t) => (
        <AppButton size="small" variant="secondary" onClick={() => navigate(`/app/chemistry-analyst/${t.sample}`)}>
          تفاصيل
        </AppButton>
      ),
    },
  ], [navigate]);

  const handleStartTestFromSample = useCallback(
    async (s: FoodSample) => {
      const target = tests.rows.find((t) => t.sample === s.id);
      if (target) await handleStart(target);
      else notifyError('لا يوجد اختبار مكلف لهذه العينة');
    },
    [tests, handleStart]
  );

  return (
    <Box>
      <DashboardHero
        eyebrow="قسم الكيمياء"
        title="لوحة محلل الكيمياء"
        subtitle="العينات والتحاليل المكلف بها، الأجهزة، مراجعة QC و SLA"
        gradient="emerald"
        avatarLabel="ل"
        action={<AppButton variant="secondary" onClick={refreshAll}>🔄 تحديث</AppButton>}
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
          {/* KPI */}
          <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              {stat('عينات جديدة', dash?.total_samples ?? '—', <ScienceIcon />)}
              {stat('قيد التحليل', dash?.under_testing ?? '—', <BiotechIcon />)}
              {stat('جاهزة للمراجعة', dash?.ready_for_approval ?? '—', <VerifiedIcon />)}
              {stat('مكتملة', dash?.approved ?? '—', <CheckCircleIcon />)}
              {stat('متأخرة SLA', dash?.overdue_tests ?? '—', <ErrorOutlineIcon />, 'error.main')}
              {stat('بانتظار QC', dash?.qc_pending ?? '—', <FactCheckIcon />)}
              {stat('مخالفات QC', dash?.qc_failed ?? '—', <ErrorOutlineIcon />, 'warning.main')}
              {stat('أجهزة القسم', dash?.equipment_total ?? '—', <BuildIcon />)}
            </Grid>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box component="section" ref={register('tests')} data-section="tests" sx={{ scrollMarginTop: '80px' }}>
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
                  title="التحاليل الموكلة إليّ"
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
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box component="section" ref={register('samples')} data-section="samples" sx={{ scrollMarginTop: '80px' }}>
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
                  title="عينات قسم الكيمياء"
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
            </Grid>

            <Grid item xs={12}>
              <Box component="section" ref={register('equipment')} data-section="equipment" sx={{ scrollMarginTop: '80px' }}>
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
                      <Typography variant="body2" color="text.secondary">لا توجد أجهزة مسجلة في قسم الكيمياء.</Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChemistryAnalystDashboard;
