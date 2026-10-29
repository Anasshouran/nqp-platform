import { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import ScienceIcon from '@mui/icons-material/Science';
import BiotechIcon from '@mui/icons-material/Biotech';
import VerifiedIcon from '@mui/icons-material/Verified';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BuildIcon from '@mui/icons-material/Build';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FactCheckIcon from '@mui/icons-material/FactCheck';

import {
  AppButton,
  DataTable,
  FormDialog,
  FormSelect,
  FormTextField,
  PageTabs,
  StatusChip,
  type DataTableColumn,
} from '../../components/uikit';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { useServerTable } from '../../hooks/useServerTable';
import {
  createLabEquipment,
  getChemistryDashboard,
  getLabEquipment,
  getLabParameters,
  getLabSampleTests,
  getLabSamples,
  markLabEquipmentCalibrated,
  markSampleTestQC,
} from '../../api/endpoints/foodlab';
import { getUsers } from '../../api/endpoints/users';
import type { ChemistryDashboard, FoodSample, LabEquipment, LabParameter, SampleTest } from '../../types/food';
import { labBench, labDecision, labEquipmentStatus, labPriority, labQc, labSampleStatus, labSla, labTestStatus } from '../../utils/status';
import { formatDate } from '../../utils/formatters';
import { notifyError, notifySuccess } from '../../utils/toast';
import { SampleDetailDialog } from './FoodLabPage';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const SECTIONS = (t: (key: string, opts?: Record<string, string | number>) => string) => [
  { id: 'overview', label: t('food.chemistryLab.sections.overview'), icon: <ScienceIcon fontSize="small" /> },
  { id: 'samples', label: t('food.chemistryLab.sections.samples'), icon: <BiotechIcon fontSize="small" /> },
  { id: 'qc', label: t('food.chemistryLab.sections.qc'), icon: <FactCheckIcon fontSize="small" /> },
  { id: 'equipment', label: t('food.chemistryLab.sections.equipment'), icon: <BuildIcon fontSize="small" /> },
] as const;

const ChemistryLabPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const role = user?.role;
  const isSectionHead = role === 'CHEM_SECTION_HEAD';
  const isManager = role === 'LAB_MANAGER' || role === 'ADMIN';

  const [tab, setTab] = useState(0);
  const [dash, setDash] = useState<ChemistryDashboard | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<LabEquipment[]>([]);
  const [parameters, setParameters] = useState<LabParameter[]>([]);
  const [equipOpen, setEquipOpen] = useState(false);
  const [equipForm, setEquipForm] = useState({ name_ar: '', name_en: '', model_number: '', status: 'OPERATIONAL', next_calibration_due: '' });
  const [qcTest, setQcTest] = useState<SampleTest | null>(null);
  const [qcStatus, setQcStatus] = useState('PASSED');
  const [qcNotes, setQcNotes] = useState('');

  const { active, register, scrollTo } = useCommandSections(SECTIONS(t) as unknown as CommandSectionDef[], [tab]);

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
    getLabParameters({ page_size: 100 }).then((r) => setParameters(r.data.data.results)).catch(() => undefined);
    refreshAll();
  }, [refreshAll]);

  const saveEquipment = async () => {
    if (!equipForm.name_ar.trim()) return notifyError(t('food.chemistryLab.errors.enterDeviceName'));
    try {
      await createLabEquipment({ ...equipForm, bench: 'CHEMISTRY' });
      notifySuccess(t('food.chemistryLab.messages.deviceRegistered'));
      setEquipOpen(false);
      setEquipForm({ name_ar: '', name_en: '', model_number: '', status: 'OPERATIONAL', next_calibration_due: '' });
      refreshEquipment();
    } catch {
      notifyError(t('food.chemistryLab.errors.registerDeviceFailed'));
    }
  };

  const calibrate = async (e: LabEquipment) => {
    try {
      await markLabEquipmentCalibrated(e.id, e.next_calibration_due ?? '');
      notifySuccess(t('food.chemistryLab.messages.calibrationRecorded', { name: e.name_ar }));
      refreshEquipment();
    } catch {
      notifyError(t('food.chemistryLab.errors.calibrationFailed'));
    }
  };

  const submitQc = async () => {
    if (!qcTest) return;
    try {
      await markSampleTestQC(qcTest.id, { qc_status: qcStatus, qc_notes: qcNotes });
      notifySuccess(qcStatus === 'PASSED' ? t('food.chemistryLab.messages.qcApproved') : t('food.chemistryLab.messages.qcViolation'));
      setQcTest(null);
      setQcNotes('');
      tests.refresh();
      refreshDash();
    } catch {
      notifyError(t('food.chemistryLab.errors.qcReviewFailed'));
    }
  };

  const exportCsv = () => {
    const rows = samples.rows;
    if (!rows.length) return notifyError(t('food.chemistryLab.errors.noExportData'));
    const header = [
      t('food.chemistryLab.csv.sampleNumber'),
      t('food.chemistryLab.csv.sampleType'),
      t('food.chemistryLab.csv.source'),
      t('food.chemistryLab.csv.priority'),
      t('food.chemistryLab.csv.status'),
      t('food.chemistryLab.csv.bench'),
      t('food.chemistryLab.csv.analyst'),
    ];
    const lines = rows.map((s) => [
      s.sample_number,
      s.sample_type,
      s.source_name ?? '',
      labPriority[s.priority]?.label ?? s.priority,
      labSampleStatus[s.status]?.label ?? s.status,
      labBench[s.bench]?.label ?? s.bench,
      s.analyst_name ?? '',
    ]);
    const csv = [header, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chem-section-samples-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sampleColumns: DataTableColumn<FoodSample>[] = useMemo(() => [
    { key: 'sample_number', label: t('food.chemistryLab.columns.sampleNumber'), render: (s) => <b>{s.sample_number}</b> },
    { key: 'sample_type', label: t('food.chemistryLab.columns.sampleType') },
    { key: 'source_name', label: t('food.chemistryLab.columns.source'), render: (s) => s.source_name ?? '—' },
    { key: 'priority', label: t('food.chemistryLab.columns.priority'), render: (s) => <StatusChip label={t(`food.chemistryLab.priority.${s.priority}`) ?? s.priority} tone={labPriority[s.priority]?.tone} /> },
    { key: 'status', label: t('food.chemistryLab.columns.status'), render: (s) => <StatusChip label={t(`food.chemistryLab.sampleStatus.${s.status}`) ?? s.status} tone={labSampleStatus[s.status]?.tone} /> },
    { key: 'analyst_name', label: t('food.chemistryLab.columns.analyst'), render: (s) => s.analyst_name ?? '—' },
    {
      key: 'actions', label: '', render: (s) => (
        <AppButton size="small" variant="secondary" onClick={() => setDetailId(s.id)}>{t('food.chemistryLab.actions.open')}</AppButton>
      ),
    },
  ], []);

  const testColumns: DataTableColumn<SampleTest>[] = useMemo(() => [
    { key: 'parameter', label: t('food.chemistryLab.columns.parameter'), render: (item) => <b>{item.parameter.name_ar}</b> },
    { key: 'status', label: t('food.chemistryLab.columns.status'), render: (item) => <StatusChip label={t(`food.chemistryLab.testStatus.${item.status}`) ?? item.status} tone={labTestStatus[item.status]?.tone} /> },
    { key: 'result_value', label: t('food.chemistryLab.columns.result'), render: (item) => (item.result_value != null ? `${item.result_value} ${item.unit}` : item.result_text || '—') },
    { key: 'decision', label: t('food.chemistryLab.columns.decision'), render: (item) => <StatusChip label={t(`food.chemistryLab.decision.${item.decision}`) ?? item.decision} tone={labDecision[item.decision]?.tone} /> },
    { key: 'qc_status', label: t('food.chemistryLab.columns.qcStatus'), render: (item) => <StatusChip label={t(`food.chemistryLab.qcStatus.${item.qc_status}`) ?? item.qc_status} tone={labQc[item.qc_status]?.tone} /> },
    { key: 'sla', label: 'SLA', render: (item) => (item.sla?.status ? <StatusChip label={t(`food.chemistryLab.slaStatus.${item.sla.status}`) ?? item.sla.status} tone={labSla[item.sla.status]?.tone} /> : '—') },
    { key: 'qc_reviewed_by_name', label: t('food.chemistryLab.columns.qcReviewer'), render: (item) => item.qc_reviewed_by_name ?? '—' },
    {
      key: 'actions', label: '', render: (item) => (
        <AppButton size="small" variant="secondary" disabled={!isSectionHead && !isManager} onClick={() => { setQcTest(item); setQcStatus('PASSED'); setQcNotes(''); }}>{t('food.chemistryLab.actions.qcReview')}</AppButton>
      ),
    },
  ], [isSectionHead, isManager]);

  const stat = (label: string, value: number | string, icon: React.ReactNode) => (
    <Grid item xs={6} sm={4} md={3}>
      <KpiCard label={label} value={value} icon={icon} />
    </Grid>
  );

  const tabIcons = [<ScienceIcon />, <FactCheckIcon />, <BuildIcon />];

  return (
    <Box>
      <DashboardHero
        eyebrow="Chemistry Lab"
        title={t('food.chemistryLab.pageHeader.title')}
        subtitle={t('food.chemistryLab.pageHeader.subtitle')}
        gradient="emerald"
        avatarLabel={(user?.full_name || 'م').slice(0, 1)}
        action={<AppButton startIcon={<DownloadIcon />} variant="secondary" onClick={exportCsv}>{t('food.chemistryLab.actions.exportCsv')}</AppButton>}
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {t('food.chemistryLab.status.live')}
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS(t) as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label={t('food.chemistryLab.sections.title')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>

      <Box component="section" ref={register('overview')} data-section="overview" sx={{ scrollMarginTop: '80px' }}>
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        {stat(t('food.chemistryLab.stats.samples'), dash?.total_samples ?? '—', <ScienceIcon />)}
        {stat(t('food.chemistryLab.stats.underTesting'), dash?.under_testing ?? '—', <BiotechIcon />)}
        {stat(t('food.chemistryLab.stats.readyForApproval'), dash?.ready_for_approval ?? '—', <VerifiedIcon />)}
        {stat(t('food.chemistryLab.stats.approved'), dash?.approved ?? '—', <CheckCircleIcon />)}
        {stat(t('food.chemistryLab.stats.overdueTests'), dash?.overdue_tests ?? '—', <ErrorOutlineIcon />)}
        {stat(t('food.chemistryLab.stats.qcPending'), dash?.qc_pending ?? '—', <FactCheckIcon />)}
        {stat(t('food.chemistryLab.stats.qcFailed'), dash?.qc_failed ?? '—', <ErrorOutlineIcon />)}
        {stat(t('food.chemistryLab.stats.equipment'), dash?.equipment_total ?? '—', <BuildIcon />)}
        {stat(t('food.chemistryLab.stats.calibrationOverdue'), dash?.calibration_overdue ?? '—', <CalendarTodayIcon />)}
      </Grid>
      </Box>

      <PageTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { label: t('food.chemistryLab.tabs.samples'), icon: tabIcons[0] },
          { label: t('food.chemistryLab.tabs.qc'), icon: tabIcons[1] },
          { label: t('food.chemistryLab.tabs.equipment'), icon: tabIcons[2] },
        ]}
      />

      <Box sx={{ mt: 2 }}>
        {tab === 0 && (
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
            title={t('food.chemistryLab.tables.samplesTitle')}
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
        )}

        {tab === 1 && (
          <Box component="section" ref={register('qc')} data-section="qc" sx={{ scrollMarginTop: '80px' }}>
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
            title={t('food.chemistryLab.tables.qcTitle')}
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
        )}

        {tab === 2 && (
          <Box component="section" ref={register('equipment')} data-section="equipment" sx={{ scrollMarginTop: '80px' }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2, justifyContent: 'flex-end' }}>
              <AppButton startIcon={<AddIcon />} onClick={() => setEquipOpen(true)}>{t('food.chemistryLab.actions.registerDevice')}</AppButton>
            </Stack>
            <Grid container spacing={1.5}>
              {equipment.map((e) => (
                <Grid item xs={12} md={6} lg={4} key={e.id}>
                  <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>{e.name_ar}</Typography>
                        <Typography variant="caption" color="text.secondary">{e.name_en} {e.model_number ? `• ${e.model_number}` : ''}</Typography>
                      </Box>
                      <StatusChip label={t(`food.chemistryLab.equipmentStatus.${e.status}`) ?? e.status} tone={labEquipmentStatus[e.status]?.tone} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {t('food.chemistryLab.equipment.lastCalibrated', { date: e.last_calibrated ? formatDate(e.last_calibrated) : '—' })}
                      {e.calibration_overdue && (
                        <Chip size="small" color="error" sx={{ ml: 1 }} label={t('food.chemistryLab.equipment.calibrationOverdue', { date: e.next_calibration_due ? formatDate(e.next_calibration_due) : '' })} />
                      )}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <AppButton size="small" variant="secondary" onClick={() => calibrate(e)}>{t('food.chemistryLab.actions.calibrate')}</AppButton>
                      {e.status === 'UNDER_MAINTENANCE' && <Chip size="small" color="warning" label={t('food.chemistryLab.equipmentStatusLabels.underMaintenance')} />}
                      {e.status === 'OUT_OF_SERVICE' && <Chip size="small" color="error" label={t('food.chemistryLab.equipmentStatusLabels.outOfService')} />}
                    </Stack>
                  </Box>
                </Grid>
              ))}
              {equipment.length === 0 && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">{t('food.chemistryLab.equipment.noEquipment')}</Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </Box>

        </Grid>
      </Grid>

      {/* تفاصيل عينة — إعادة استخدام حوار معمل الأغذية */}
      {detailId && (
        <SampleDetailDialog
          sampleId={detailId}
          parameters={parameters}
          usersFetch={getUsers}
          onClose={() => setDetailId(null)}
          onChanged={refreshAll}
        />
      )}

      {/* تسجيل جهاز */}
      <FormDialog open={equipOpen} onClose={() => setEquipOpen(false)} onSubmit={saveEquipment} title={t('food.chemistryLab.dialogs.registerDevice.title')} subtitle={t('food.chemistryLab.dialogs.registerDevice.subtitle')} maxWidth="xs">
        <FormTextField label={t('food.chemistryLab.dialogs.registerDevice.deviceNameAr')} requiredMark value={equipForm.name_ar} onChange={(e) => setEquipForm((f) => ({ ...f, name_ar: e.target.value }))} />
        <FormTextField label={t('food.chemistryLab.dialogs.registerDevice.deviceNameEn')} value={equipForm.name_en} onChange={(e) => setEquipForm((f) => ({ ...f, name_en: e.target.value }))} />
        <FormTextField label={t('food.chemistryLab.dialogs.registerDevice.modelNumber')} value={equipForm.model_number} onChange={(e) => setEquipForm((f) => ({ ...f, model_number: e.target.value }))} />
        <FormSelect label={t('food.chemistryLab.dialogs.registerDevice.status')} value={equipForm.status} onChange={(v) => setEquipForm((f) => ({ ...f, status: v }))} options={Object.entries(labEquipmentStatus).map(([v, m]) => ({ value: v, label: t(`food.chemistryLab.equipmentStatus.${v}`) ?? m.label }))} />
        <FormTextField label={t('food.chemistryLab.dialogs.registerDevice.nextCalibration')} type="date" value={equipForm.next_calibration_due} onChange={(e) => setEquipForm((f) => ({ ...f, next_calibration_due: e.target.value }))} />
      </FormDialog>

      {/* مراجعة QC */}
      <FormDialog open={Boolean(qcTest)} onClose={() => setQcTest(null)} onSubmit={submitQc} title={t('food.chemistryLab.dialogs.qc.title')} subtitle={t('food.chemistryLab.dialogs.qc.subtitle')} maxWidth="xs" submitLabel={t('food.chemistryLab.dialogs.qc.submitLabel')}>
        {qcTest && (
          <>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{qcTest.parameter.name_ar}</Typography>
            <FormSelect label={t('food.chemistryLab.dialogs.qc.result')} value={qcStatus} onChange={setQcStatus} options={Object.entries(labQc).filter(([k]) => k !== 'PENDING').map(([v, m]) => ({ value: v, label: t(`food.chemistryLab.qcStatus.${v}`) ?? m.label }))} />
            <FormTextField label={t('food.chemistryLab.dialogs.qc.notes')} multiline minRows={2} value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} />
          </>
        )}
      </FormDialog>
    </Box>
  );
};

export default ChemistryLabPage;
