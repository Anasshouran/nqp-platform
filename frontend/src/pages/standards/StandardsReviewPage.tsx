import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch } from 'react-redux';
import ScienceIcon from '@mui/icons-material/Science';
import DescriptionIcon from '@mui/icons-material/Description';
import RuleIcon from '@mui/icons-material/Rule';
import CompareIcon from '@mui/icons-material/Compare';
import BiotechIcon from '@mui/icons-material/Biotech';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { logout as logoutApi } from '../../api/endpoints/auth';
import { useAuth } from '../../hooks/useAuth';
import baseTheme from '../../styles/theme';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import GovernmentHeader from '../../components/common/GovernmentHeader';
import KpiCard from '../../components/dashboard/KpiCard';
import DashboardHero from '../../components/dashboard/DashboardHero';
import {
  DataTable,
  FormDialog,
  FormSelect,
  FormTextField,
  AppButton,
  ConfirmDialog,
  type DataTableColumn,
} from '../../components/uikit';
import { useServerTable } from '../../hooks/useServerTable';
import {
  getStandards,
  createStandard,
  updateStandard,
  deleteStandard,
  getStandardVersions,
  createStandardVersion,
  updateStandardVersion,
  getStandardRequirements,
  createStandardRequirement,
  updateStandardRequirement,
  getAnalyticalMethods,
  createAnalyticalMethod,
  updateAnalyticalMethod,
  getRegulatoryRules,
  createRegulatoryRule,
  updateRegulatoryRule,
  getStandardsDashboard,
  getStandardsComparison,
  getLabParameters,
  getMicroorganisms,
} from '../../api/endpoints/foodlab';
import type { Standard, StandardVersion, StandardRequirement, AnalyticalMethod, RegulatoryRule, StandardsDashboard, StandardsComparison } from '../../types/food';
import { notifyError, notifySuccess } from '../../utils/toast';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';

const todayArabic = () => new Date().toLocaleDateString('ar', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });


const StandardsReviewPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const sections = useMemo(() => [
    { id: 'dashboard', label: t('quality.standards.nav.dashboard'), icon: <AssessmentIcon fontSize="small" /> },
    { id: 'standards', label: t('quality.standards.nav.standards'), icon: <DescriptionIcon fontSize="small" /> },
    { id: 'versions', label: t('quality.standards.nav.versions'), icon: <ScienceIcon fontSize="small" /> },
    { id: 'requirements', label: t('quality.standards.nav.requirements'), icon: <RuleIcon fontSize="small" /> },
    { id: 'methods', label: t('quality.standards.nav.methods'), icon: <BiotechIcon fontSize="small" /> },
    { id: 'rules', label: t('quality.standards.nav.rules'), icon: <CompareIcon fontSize="small" /> },
    { id: 'comparison', label: t('quality.standards.nav.comparison'), icon: <CompareIcon fontSize="small" /> },
  ], [t]);
  const [comparisonParam, setComparisonParam] = useState<string>('');

  // Data fetching - follow ReagentsPage pattern exactly
  const standards = useServerTable<Standard>({ fetchData: getStandards });
  const versions = useServerTable<StandardVersion>({ fetchData: getStandardVersions });
  const requirements = useServerTable<StandardRequirement>({ fetchData: getStandardRequirements });
  const methods = useServerTable<AnalyticalMethod>({ fetchData: getAnalyticalMethods });
  const rules = useServerTable<RegulatoryRule>({ fetchData: getRegulatoryRules });

  const [dashboardData, setDashboardData] = useState<StandardsDashboard | null>(null);
  const [comparisonData, setComparisonData] = useState<StandardsComparison | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  // Dropdown option lists for form selects (loaded once)
  const [standardOptions, setStandardOptions] = useState<{ value: string; label: string }[]>([]);
  const [versionOptions, setVersionOptions] = useState<{ value: string; label: string }[]>([]);
  const [methodOptions, setMethodOptions] = useState<{ value: string; label: string }[]>([]);
  const [parameterOptions, setParameterOptions] = useState<{ value: string; label: string }[]>([]);
  const [microorganismOptions, setMicroorganismOptions] = useState<{ value: string; label: string }[]>([]);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getStandards({ page_size: 100 }).then((res) => {
      setStandardOptions(
        res.data.data.results.map((s) => ({ value: s.id, label: `${s.code} — ${s.title_ar}` }))
      );
    }).catch(() => {});
    getStandardVersions({ page_size: 100 }).then((res) => {
      setVersionOptions(
        res.data.data.results.map((v) => ({ value: v.id, label: v.label || `${v.standard_code} — ${v.version}` }))
      );
    }).catch(() => {});
    getAnalyticalMethods({ page_size: 100 }).then((res) => {
      setMethodOptions(
        res.data.data.results.map((m) => ({ value: m.id, label: `${m.code} — ${m.name_ar}` }))
      );
    }).catch(() => {});
    getLabParameters({ page_size: 100 }).then((res) => {
      setParameterOptions(
        res.data.data.results.map((p) => ({ value: p.id, label: `${p.code} — ${p.name_ar}` }))
      );
    }).catch(() => {});
    getMicroorganisms({ page_size: 100 }).then((res) => {
      setMicroorganismOptions(
        res.data.data.results.map((m) => ({ value: m.id, label: `${m.code} — ${m.name_ar}` }))
      );
    }).catch(() => {});
  }, []);

  // Forms
  const [standardForm, setStandardForm] = useState<Partial<Standard>>({});
  const [versionForm, setVersionForm] = useState<Partial<StandardVersion>>({});
  const [requirementForm, setRequirementForm] = useState<Partial<StandardRequirement>>({});
  const [methodForm, setMethodForm] = useState<Partial<AnalyticalMethod>>({});
  const [ruleForm, setRuleForm] = useState<Partial<RegulatoryRule>>({});

  // Dialog states
  const [openStandardDialog, setOpenStandardDialog] = useState<string | null>(null);
  const [openVersionDialog, setOpenVersionDialog] = useState<string | null>(null);
  const [openRequirementDialog, setOpenRequirementDialog] = useState<string | null>(null);
  const [openMethodDialog, setOpenMethodDialog] = useState<string | null>(null);
  const [openRuleDialog, setOpenRuleDialog] = useState<string | null>(null);

  // Load dashboard
  useEffect(() => {
    getStandardsDashboard().then((res) => {
      setDashboardData(res.data.data);
      setDashboardLoading(false);
    });
  }, []);

  const { active, register, scrollTo } = useCommandSections(sections as unknown as CommandSectionDef[], [dashboardLoading]);

  // Columns
  const standardColumns = useMemo<DataTableColumn<Standard>[]>(() => [
    { key: 'code', label: t('quality.standards.columns.code'), width: 140 },
    { key: 'title_ar', label: t('quality.standards.columns.title_ar'), width: 300 },
    { key: 'source_label', label: t('quality.standards.columns.source_label'), width: 180 },
    { key: 'status_label', label: t('quality.standards.columns.status_label'), width: 120 },
    { key: 'product_name', label: t('quality.standards.columns.product_name'), width: 180 },
    { key: 'mandatory', label: t('quality.standards.columns.mandatory'), width: 100, render: (v: unknown) => v ? t('quality.standards.yes') : t('quality.standards.no') },
    { key: 'created_at', label: t('quality.standards.columns.created_at'), width: 160, render: (v: unknown) => typeof v === 'string' ? v.substring(0, 10) : '' },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t from useTranslation has stable reference
  ], []);

  const versionColumns = useMemo<DataTableColumn<StandardVersion>[]>(() => [
    { key: 'standard_code', label: t('quality.standards.columns.standard_code'), width: 140 },
    { key: 'version', label: t('quality.standards.columns.version'), width: 100 },
    { key: 'effective_from', label: t('quality.standards.columns.effective_from'), width: 120, render: (v: unknown) => typeof v === 'string' ? v.substring(0, 10) : '' },
    { key: 'effective_to', label: t('quality.standards.columns.effective_to'), width: 120, render: (v: unknown) => typeof v === 'string' ? v.substring(0, 10) : '—' },
    { key: 'standard_source', label: t('quality.standards.columns.standard_source'), width: 160 },
    { key: 'created_at', label: t('quality.standards.columns.created_at'), width: 160, render: (v: unknown) => typeof v === 'string' ? v.substring(0, 10) : '' },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t from useTranslation has stable reference
  ], []);

  const requirementColumns = useMemo<DataTableColumn<StandardRequirement>[]>(() => [
    { key: 'version_code', label: t('quality.standards.columns.version_code'), width: 140 },
    { key: 'parameter_name', label: t('quality.standards.columns.parameter_name'), width: 180 },
    { key: 'microorganism_name', label: t('quality.standards.columns.microorganism_name'), width: 180 },
    { key: 'limit_type_label', label: t('quality.standards.columns.limit_type_label'), width: 140 },
    { key: 'label', label: t('quality.standards.columns.label'), width: 160 },
    { key: 'method_name', label: t('quality.standards.columns.method_name'), width: 180 },
    { key: 'active', label: t('quality.standards.columns.active'), width: 80, render: (v: unknown) => v ? t('quality.standards.yes') : t('quality.standards.no') },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t from useTranslation has stable reference
  ], []);

  const methodColumns = useMemo<DataTableColumn<AnalyticalMethod>[]>(() => [
    { key: 'code', label: t('quality.standards.columns.code'), width: 160 },
    { key: 'name_ar', label: t('quality.standards.columns.name_ar'), width: 300 },
    { key: 'source_label', label: t('quality.standards.columns.source_label'), width: 140 },
    { key: 'validation_status_label', label: t('quality.standards.columns.validation_status_label'), width: 160 },
    { key: 'matrix', label: t('quality.standards.columns.matrix'), width: 160 },
    { key: 'lod', label: 'LOD', width: 100 },
    { key: 'loq', label: 'LOQ', width: 100 },
    { key: 'active', label: t('quality.standards.columns.active'), width: 80, render: (v: unknown) => v ? t('quality.standards.yes') : t('quality.standards.no') },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t from useTranslation has stable reference
  ], []);

  const ruleColumns = useMemo<DataTableColumn<RegulatoryRule>[]>(() => [
    { key: 'priority', label: t('quality.standards.columns.priority'), width: 100 },
    { key: 'name_ar', label: t('quality.standards.columns.name_ar'), width: 300 },
    { key: 'source_type_label', label: t('quality.standards.columns.source_type_label'), width: 180 },
    { key: 'is_active', label: t('quality.standards.columns.is_active'), width: 80, render: (v: unknown) => v ? t('quality.standards.yes') : t('quality.standards.no') },
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t from useTranslation has stable reference
  ], []);

  // Handlers - wrapped for FormDialog onSubmit (no args)
  const handleStandardSubmit = useCallback(async () => {
    try {
      if (openStandardDialog) {
        await updateStandard(openStandardDialog, standardForm);
        notifySuccess(t('quality.standards.messages.standard_updated'));
      } else {
        await createStandard(standardForm);
        notifySuccess(t('quality.standards.messages.standard_created'));
      }
      setOpenStandardDialog(null);
      setStandardForm({});
      standards.refresh();
    } catch (e) {
      notifyError(t('quality.standards.errors.save_failed'));
    }
  }, [openStandardDialog, standardForm, standards]);

  const handleVersionSubmit = useCallback(async () => {
    try {
      if (openVersionDialog) {
        await updateStandardVersion(openVersionDialog, versionForm);
        notifySuccess(t('quality.standards.messages.version_updated'));
      } else {
        await createStandardVersion(versionForm);
        notifySuccess(t('quality.standards.messages.version_created'));
      }
      setOpenVersionDialog(null);
      setVersionForm({});
      versions.refresh();
    } catch (e) {
      notifyError(t('quality.standards.errors.save_failed'));
    }
  }, [openVersionDialog, versionForm, versions]);

  const handleRequirementSubmit = useCallback(async () => {
    try {
      if (openRequirementDialog) {
        await updateStandardRequirement(openRequirementDialog, requirementForm);
        notifySuccess(t('quality.standards.messages.requirement_updated'));
      } else {
        await createStandardRequirement(requirementForm);
        notifySuccess(t('quality.standards.messages.requirement_created'));
      }
      setOpenRequirementDialog(null);
      setRequirementForm({});
      requirements.refresh();
    } catch (e) {
      notifyError(t('quality.standards.errors.save_failed'));
    }
  }, [openRequirementDialog, requirementForm, requirements]);

  const handleMethodSubmit = useCallback(async () => {
    try {
      if (openMethodDialog) {
        await updateAnalyticalMethod(openMethodDialog, methodForm);
        notifySuccess(t('quality.standards.messages.method_updated'));
      } else {
        await createAnalyticalMethod(methodForm);
        notifySuccess(t('quality.standards.messages.method_created'));
      }
      setOpenMethodDialog(null);
      setMethodForm({});
      methods.refresh();
    } catch (e) {
      notifyError(t('quality.standards.errors.save_failed'));
    }
  }, [openMethodDialog, methodForm, methods]);

  const handleRuleSubmit = useCallback(async () => {
    try {
      if (openRuleDialog) {
        await updateRegulatoryRule(openRuleDialog, ruleForm);
        notifySuccess(t('quality.standards.messages.rule_updated'));
      } else {
        await createRegulatoryRule(ruleForm);
        notifySuccess(t('quality.standards.messages.rule_created'));
      }
      setOpenRuleDialog(null);
      setRuleForm({});
      rules.refresh();
    } catch (e) {
      notifyError(t('quality.standards.errors.save_failed'));
    }
  }, [openRuleDialog, ruleForm, rules]);

  const handleDeleteStandard = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStandard(deleteTarget.id);
      notifySuccess(t('quality.standards.messages.deleted'));
      setDeleteTarget(null);
      standards.refresh();
    } catch (e) {
      notifyError(t('quality.standards.errors.delete_failed'));
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, standards]);

  const handleComparisonSearch = useCallback(async (paramId: string) => {
    setComparisonLoading(true);
    try {
      const res = await getStandardsComparison(paramId);
      setComparisonData(res.data.data);
    } catch (e) {
      notifyError(t('quality.standards.errors.comparison_failed'));
    } finally {
      setComparisonLoading(false);
    }
  }, []);

  return (
    <Box>
      <DashboardHero
        eyebrow={t('quality.standards.dashboard.eyebrow')}
        title={t('quality.standards.dashboard.title')}
        subtitle={t('quality.standards.dashboard.subtitle')}
        gradient="emerald"
        avatarLabel={(user?.full_name || 'م').slice(0, 1)}
        chips={[
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>{todayArabic()}</Box>,
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#8ff5d4', flexShrink: 0 }} />
            {t('quality.standards.dashboard.liveStatus')}
          </Box>,
        ]}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={sections as unknown as CommandSectionDef[]}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label={t('quality.standards.dashboard.sectionsLabel')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          <Box component="section" ref={register('dashboard')} data-section="dashboard" sx={{ scrollMarginTop: '80px' }}>
            {dashboardLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>{t('quality.standards.dashboard.loading')}</Box>
            ) : dashboardData && (
            <>
              <Stack direction="row" spacing={3} sx={{ mb: 4, flexWrap: 'wrap' }}>
                <KpiCard label={t('quality.standards.dashboard.kpis.total_standards')} value={dashboardData.kpis.total_standards} icon={<DescriptionIcon />} accent="primary.main" />
                <KpiCard label={t('quality.standards.dashboard.kpis.active_versions')} value={dashboardData.kpis.active_versions} icon={<ScienceIcon />} accent="success.main" />
                <KpiCard label={t('quality.standards.dashboard.kpis.chemical_requirements')} value={dashboardData.kpis.chemical_requirements} icon={<BiotechIcon />} accent="info.main" />
                <KpiCard label={t('quality.standards.dashboard.kpis.micro_requirements')} value={dashboardData.kpis.micro_requirements} icon={<BiotechIcon />} accent="warning.main" />
                <KpiCard label={t('quality.standards.dashboard.kpis.validated_methods')} value={dashboardData.kpis.validated_methods} icon={<RuleIcon />} accent="secondary.main" />
                <KpiCard label={t('quality.standards.dashboard.kpis.active_rules')} value={dashboardData.kpis.active_rules} icon={<CompareIcon />} accent="primary.main" />
              </Stack>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>{t('quality.standards.dashboard.kpis.by_source')}</Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  {Object.entries(dashboardData.source_counts).map(([source, count]) => (
                    <Chip key={source} label={`${source}: ${count}`} variant="outlined" color="primary" />
                  ))}
                </Stack>
              </Box>
            </>
          )}
          </Box>

          <Box component="section" ref={register('standards')} data-section="standards" sx={{ scrollMarginTop: '80px' }}>
            <DataTable<Standard>
          columns={standardColumns}
          rows={standards.rows}
          rowKey={(row) => row.id}
          count={standards.count}
          page={standards.page}
          rowsPerPage={standards.rowsPerPage}
          pageSizeOptions={standards.pageSizeOptions}
          loading={standards.loading}
          error={standards.error}
          title={t('quality.standards.pages.versions.title')}
          search={standards.search}
          searchInput={standards.searchInput}
          onSearchChange={standards.setSearchInput}
          sortBy={standards.sortBy}
          sortOrder={standards.sortOrder}
          onSortChange={standards.setSorting}
          onPageChange={standards.setPage}
          onRowsPerPageChange={standards.setRowsPerPage}
          onRefresh={standards.refresh}
          searchPlaceholder={t('quality.standards.pages.standards.search')}
          actions={(row) => (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={t('quality.standards.pages.standards.edit')}>
                <IconButton aria-label={t('quality.standards.pages.standards.edit')} size="small" onClick={() => { setStandardForm(row); setOpenStandardDialog(row.id); }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('quality.standards.pages.standards.delete')}>
                <IconButton aria-label={t('quality.standards.pages.standards.delete')} size="small" color="error" onClick={() => setDeleteTarget({ id: row.id, label: row.title_ar })}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
            />
          </Box>

          <Box component="section" ref={register('versions')} data-section="versions" sx={{ scrollMarginTop: '80px' }}>
            <DataTable<StandardVersion>
          columns={versionColumns}
          rows={versions.rows}
          rowKey={(row) => row.id}
          count={versions.count}
          page={versions.page}
          rowsPerPage={versions.rowsPerPage}
          pageSizeOptions={versions.pageSizeOptions}
          loading={versions.loading}
          error={versions.error}
          title={t('quality.standards.pages.versions.title')}
          search={versions.search}
          searchInput={versions.searchInput}
          onSearchChange={versions.setSearchInput}
          sortBy={versions.sortBy}
          sortOrder={versions.sortOrder}
          onSortChange={versions.setSorting}
          onPageChange={versions.setPage}
          onRowsPerPageChange={versions.setRowsPerPage}
          onRefresh={versions.refresh}
          searchPlaceholder={t('quality.standards.pages.versions.search')}
            />
          </Box>

          <Box component="section" ref={register('requirements')} data-section="requirements" sx={{ scrollMarginTop: '80px' }}>
            <DataTable<StandardRequirement>
          columns={requirementColumns}
          rows={requirements.rows}
          rowKey={(row) => row.id}
          count={requirements.count}
          page={requirements.page}
          rowsPerPage={requirements.rowsPerPage}
          pageSizeOptions={requirements.pageSizeOptions}
          loading={requirements.loading}
          error={requirements.error}
          title={t('quality.standards.pages.requirements.title')}
          search={requirements.search}
          searchInput={requirements.searchInput}
          onSearchChange={requirements.setSearchInput}
          sortBy={requirements.sortBy}
          sortOrder={requirements.sortOrder}
          onSortChange={requirements.setSorting}
          onPageChange={requirements.setPage}
          onRowsPerPageChange={requirements.setRowsPerPage}
          onRefresh={requirements.refresh}
          searchPlaceholder={t('quality.standards.pages.requirements.search')}
            />
          </Box>

          <Box component="section" ref={register('methods')} data-section="methods" sx={{ scrollMarginTop: '80px' }}>
            <DataTable<AnalyticalMethod>
          columns={methodColumns}
          rows={methods.rows}
          rowKey={(row) => row.id}
          count={methods.count}
          page={methods.page}
          rowsPerPage={methods.rowsPerPage}
          pageSizeOptions={methods.pageSizeOptions}
          loading={methods.loading}
          error={methods.error}
          title={t('quality.standards.pages.methods.title')}
          search={methods.search}
          searchInput={methods.searchInput}
          onSearchChange={methods.setSearchInput}
          sortBy={methods.sortBy}
          sortOrder={methods.sortOrder}
          onSortChange={methods.setSorting}
          onPageChange={methods.setPage}
          onRowsPerPageChange={methods.setRowsPerPage}
          onRefresh={methods.refresh}
          searchPlaceholder={t('quality.standards.pages.methods.search')}
            />
          </Box>

          <Box component="section" ref={register('rules')} data-section="rules" sx={{ scrollMarginTop: '80px' }}>
            <DataTable<RegulatoryRule>
          columns={ruleColumns}
          rows={rules.rows}
          rowKey={(row) => row.id}
          count={rules.count}
          page={rules.page}
          rowsPerPage={rules.rowsPerPage}
          pageSizeOptions={rules.pageSizeOptions}
          loading={rules.loading}
          error={rules.error}
          title={t('quality.standards.pages.rules.title')}
          search={rules.search}
          searchInput={rules.searchInput}
          onSearchChange={rules.setSearchInput}
          sortBy={rules.sortBy}
          sortOrder={rules.sortOrder}
          onSortChange={rules.setSorting}
          onPageChange={rules.setPage}
          onRowsPerPageChange={rules.setRowsPerPage}
          onRefresh={rules.refresh}
          searchPlaceholder={t('quality.standards.pages.rules.search')}
            />
          </Box>

          <Box component="section" ref={register('comparison')} data-section="comparison" sx={{ scrollMarginTop: '80px' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>{t('quality.standards.pages.comparison.title')}</Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <FormSelect
                  label={t('quality.standards.pages.comparison.parameter')}
                  value={comparisonParam}
                  onChange={(value: string) => setComparisonParam(value)}
                  options={[
                    { value: '54428fec-5c5a-40a2-94ee-3b0bbe89eb7f', label: t('quality.standards.pages.commparison.parameters.PROTEIN') },
                    { value: '89ca70fb-4f9e-4c53-b544-8e66047bf98a', label: t('quality.standards.pages.commparison.parameters.MOISTURE') },
                    { value: 'a9549529-e33a-437e-b398-b2e25c4e780c', label: t('quality.standards.pages.commparison.parameters.AFLATOXIN_B1') },
                    { value: '4b7c708a-19f8-4f97-8d5e-fcc3fd592566', label: t('quality.standards.pages.commparison.parameters.AFLATOXIN_M1') },
                  ]}
                />
              </Box>
              <Box sx={{ mt: 1.5 }}>
                <AppButton variant="primary" onClick={() => handleComparisonSearch(comparisonParam)} disabled={!comparisonParam || comparisonLoading}>
                  {comparisonLoading ? t('quality.standards.dashboard.loading') : t('quality.standards.dashboard.view_comparison')}
                </AppButton>
              </Box>
            </Stack>
          </Box>

          {comparisonData && (
            <Box>
              {comparisonData.comparison.map((sourceGroup) => (
                <Box key={sourceGroup.source} sx={{ mb: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                    {sourceGroup.source_label} ({sourceGroup.source})
                  </Typography>
                  <DataTable
                    columns={[
                      { key: 'standard_code', label: t('quality.standards.comparison.columns.code'), width: 160 },
                      { key: 'standard_title', label: t('quality.standards.comparison.columns.title'), width: 300 },
                      { key: 'version', label: t('quality.standards.comparison.columns.version'), width: 100 },
                      { key: 'effective_from', label: t('quality.standards.comparison.columns.effective_from'), width: 120, render: (v: unknown) => typeof v === 'string' ? v.substring(0, 10) : '' },
                      { key: 'limit_label', label: t('quality.standards.comparison.columns.limit'), width: 180 },
                      { key: 'method_name', label: t('quality.standards.comparison.columns.method'), width: 200 },
                    ]}
                    rows={sourceGroup.standards as Array<{ standard_code: string; standard_title: string; version: string; effective_from: string; limit_label: string; method_name: string }>}
                    rowKey={(r: unknown) => (r as { standard_code: string }).standard_code}
                    count={sourceGroup.standards.length}
                    page={1}
                    rowsPerPage={50}
                  />
                </Box>
              ))}
            </Box>
          )}
          </Box>
        </Grid>
      </Grid>

      {/* Dialogs */}
      <FormDialog
        open={!!openStandardDialog}
        onClose={() => { setOpenStandardDialog(null); setStandardForm({}); }}
        title={openStandardDialog === 'new' ? t('quality.standards.dialogs.standard.new') : t('quality.standards.dialogs.standard.edit')}
        onSubmit={handleStandardSubmit}
      >
        <FormTextField label={t('quality.standards.dialogs.standard.code')} value={standardForm.code || ''} onChange={(e) => setStandardForm((p) => ({ ...p, code: e.target.value }))} required />
        <FormTextField label={t('quality.standards.dialogs.standard.title_ar')} value={standardForm.title_ar || ''} onChange={(e) => setStandardForm((p) => ({ ...p, title_ar: e.target.value }))} required />
        <FormTextField label={t('quality.standards.dialogs.standard.title_en')} value={standardForm.title_en || ''} onChange={(e) => setStandardForm((p) => ({ ...p, title_en: e.target.value }))} />
        <FormSelect label={t('quality.standards.dialogs.standard.source')} value={standardForm.source || ''} onChange={(value: string) => setStandardForm((p) => ({ ...p, source: value }))} options={[
          { value: 'SSMO', label: t('quality.standards.dialogs.standard.source_options.SSMO') },
          { value: 'GSO', label: t('quality.standards.dialogs.standard.source_options.GSO') },
          { value: 'CODEX', label: 'CODEX - Codex Alimentarius' },
          { value: 'ISO', label: 'ISO' },
          { value: 'AOAC', label: 'AOAC' },
          { value: 'OTHER', label: t('quality.standards.dialogs.standard.source_options.OTHER') },
        ]} required />
        <FormTextField label={t('quality.standards.dialogs.standard.country')} value={standardForm.country || ''} onChange={(e) => setStandardForm((p) => ({ ...p, country: e.target.value }))} />
        <FormTextField label={t('quality.standards.dialogs.standard.document_reference')} value={standardForm.document_reference || ''} onChange={(e) => setStandardForm((p) => ({ ...p, document_reference: e.target.value }))} />
        <FormControlLabel
          control={<Switch checked={!!standardForm.mandatory} onChange={(e) => setStandardForm((p) => ({ ...p, mandatory: e.target.checked }))} />}
          label={t('quality.standards.dialogs.standard.mandatory')}
        />
        <FormSelect label={t('quality.standards.dialogs.standard.status')} value={standardForm.status || ''} onChange={(value: string) => setStandardForm((p) => ({ ...p, status: value }))} options={[
          { value: 'DRAFT', label: t('quality.standards.dialogs.standard.status_options.DRAFT') },
          { value: 'ACTIVE', label: t('quality.standards.dialogs.standard.status_options.ACTIVE') },
          { value: 'ARCHIVED', label: t('quality.standards.dialogs.standard.status_options.ARCHIVED') },
        ]} required />
      </FormDialog>

      <FormDialog
        open={!!openVersionDialog}
        onClose={() => { setOpenVersionDialog(null); setVersionForm({}); }}
        title={openVersionDialog === 'new' ? t('quality.standards.dialogs.version.new') : t('quality.standards.dialogs.version.edit')}
        onSubmit={handleVersionSubmit}
      >
        <FormSelect label={t('quality.standards.dialogs.version.standard')} requiredMark placeholder={t('quality.standards.dialogs.version.select_standard')} value={versionForm.standard || ''} onChange={(value: string) => setVersionForm((p) => ({ ...p, standard: value }))} options={standardOptions} />
        <FormTextField label={t('quality.standards.dialogs.version.version')} value={versionForm.version || ''} onChange={(e) => setVersionForm((p) => ({ ...p, version: e.target.value }))} required />
        <FormTextField label={t('quality.standards.dialogs.version.effective_from')} type="date" value={versionForm.effective_from || ''} onChange={(e) => setVersionForm((p) => ({ ...p, effective_from: e.target.value }))} required />
        <FormTextField label={t('quality.standards.dialogs.version.effective_to')} type="date" value={versionForm.effective_to || ''} onChange={(e) => setVersionForm((p) => ({ ...p, effective_to: e.target.value }))} />
        <FormTextField label={t('quality.standards.dialogs.version.issue_date')} type="date" value={versionForm.issue_date || ''} onChange={(e) => setVersionForm((p) => ({ ...p, issue_date: e.target.value }))} />
        <FormTextField label={t('quality.standards.dialogs.standard.document_reference')} value={versionForm.document_reference || ''} onChange={(e) => setVersionForm((p) => ({ ...p, document_reference: e.target.value }))} />
        <FormTextField label={t('quality.standards.dialogs.version.notes')} multiline minRows={3} value={versionForm.notes || ''} onChange={(e) => setVersionForm((p) => ({ ...p, notes: e.target.value }))} />
      </FormDialog>

      <FormDialog
        open={!!openRequirementDialog}
        onClose={() => { setOpenRequirementDialog(null); setRequirementForm({}); }}
        title={openRequirementDialog === 'new' ? t('quality.standards.dialogs.requirement.new') : t('quality.standards.dialogs.requirement.edit')}
        onSubmit={handleRequirementSubmit}
      >
        <FormSelect label={t('quality.standards.dialogs.requirement.version')} requiredMark placeholder={t('quality.standards.dialogs.requirement.select_version')} value={requirementForm.version || ''} onChange={(value: string) => setRequirementForm((p) => ({ ...p, version: value }))} options={versionOptions} />
        <FormSelect label={t('quality.standards.dialogs.requirement.parameter')} placeholder={t('quality.standards.dialogs.requirement.select_parameter')} value={requirementForm.parameter || ''} onChange={(value: string) => setRequirementForm((p) => ({ ...p, parameter: value }))} options={parameterOptions} />
        <FormSelect label={t('quality.standards.dialogs.requirement.microorganism')} placeholder={t('quality.standards.dialogs.requirement.select_microorganism')} value={requirementForm.microorganism || ''} onChange={(value: string) => setRequirementForm((p) => ({ ...p, microorganism: value }))} options={microorganismOptions} />
        <FormSelect label={t('quality.standards.dialogs.requirement.method')} placeholder={t('quality.standards.dialogs.requirement.select_method')} value={requirementForm.method || ''} onChange={(value: string) => setRequirementForm((p) => ({ ...p, method: value }))} options={methodOptions} />
        <FormSelect label={t('quality.standards.dialogs.requirement.limit_type')} value={requirementForm.limit_type || ''} onChange={(value: string) => setRequirementForm((p) => ({ ...p, limit_type: value }))} options={[
          { value: 'MAXIMUM', label: t('quality.standards.dialogs.requirement.limit_type.MAXIMUM') },
          { value: 'MINIMUM', label: t('quality.standards.dialogs.requirement.limit_type.MINIMUM') },
          { value: 'RANGE', label: t('quality.standards.dialogs.requirement.limit_type.RANGE') },
          { value: 'SPECIFIED', label: t('quality.standards.dialogs.requirement.limit_type.SPECIFIED') },
          { value: 'PRESENCE_ABSENCE', label: t('quality.standards.dialogs.requirement.limit_type.PRESENCE_ABSENCE') },
        ]} required />
        <FormTextField label={t('quality.standards.dialogs.requirement.min_value')} type="number" value={requirementForm.min_value || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, min_value: e.target.value ? parseFloat(e.target.value) : undefined }))} />
        <FormTextField label={t('quality.standards.dialogs.requirement.max_value')} type="number" value={requirementForm.max_value || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, max_value: e.target.value ? parseFloat(e.target.value) : undefined }))} />
        <FormTextField label={t('quality.standards.dialogs.requirement.unit')} value={requirementForm.unit || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, unit: e.target.value }))} />
        <FormTextField label="n" type="number" value={requirementForm.n || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, n: e.target.value ? parseInt(e.target.value) : 0 }))} />
        <FormTextField label="c" type="number" value={requirementForm.c || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, c: e.target.value ? parseInt(e.target.value) : 0 }))} />
        <FormTextField label="m" type="number" value={requirementForm.m || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, m: e.target.value ? parseFloat(e.target.value) : undefined }))} />
        <FormTextField label="M" type="number" value={requirementForm.M || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, M: e.target.value ? parseFloat(e.target.value) : undefined }))} />
        <FormSelect label={t('quality.standards.dialogs.requirement.plan')} value={requirementForm.plan || ''} onChange={(value: string) => setRequirementForm((p) => ({ ...p, plan: value }))} options={[
          { value: 'TWO_CLASS', label: t('quality.standards.dialogs.requirement.plan.TWO_CLASS') },
          { value: 'THREE_CLASS', label: t('quality.standards.dialogs.requirement.plan.THREE_CLASS') },
          { value: 'PRESENCE_ABSENCE', label: t('quality.standards.dialogs.requirement.plan.PRESENCE_ABSENCE') },
        ]} />
        <FormControlLabel
          control={<Switch checked={!!requirementForm.active} onChange={(e) => setRequirementForm((p) => ({ ...p, active: e.target.checked }))} />}
          label={t('quality.standards.dialogs.requirement.active')}
        />
      </FormDialog>

      <FormDialog
        open={!!openMethodDialog}
        onClose={() => { setOpenMethodDialog(null); setMethodForm({}); }}
        title={openMethodDialog === 'new' ? t('quality.standards.dialogs.method.new') : t('quality.standards.dialogs.method.edit')}
        onSubmit={handleMethodSubmit}
      >
        <FormTextField label={t('quality.standards.dialogs.method.code')} value={methodForm.code || ''} onChange={(e) => setMethodForm((p) => ({ ...p, code: e.target.value }))} required />
        <FormTextField label={t('quality.standards.dialogs.method.name_ar')} value={methodForm.name_ar || ''} onChange={(e) => setMethodForm((p) => ({ ...p, name_ar: e.target.value }))} required />
        <FormTextField label={t('quality.standards.dialogs.method.name_en')} value={methodForm.name_en || ''} onChange={(e) => setMethodForm((p) => ({ ...p, name_en: e.target.value }))} />
        <FormSelect label={t('quality.standards.dialogs.method.source')} value={methodForm.source || ''} onChange={(value: string) => setMethodForm((p) => ({ ...p, source: value }))} options={[
          { value: 'ISO', label: 'ISO' },
          { value: 'AOAC', label: 'AOAC' },
          { value: 'CODEX', label: 'Codex' },
          { value: 'SSMO', label: 'SSMO' },
          { value: 'OTHER', label: t('quality.standards.dialogs.method.source_options.OTHER') },
        ]} required />
        <FormTextField label={t('quality.standards.dialogs.method.version')} value={methodForm.version || ''} onChange={(e) => setMethodForm((p) => ({ ...p, version: e.target.value }))} />
        <FormTextField label={t('quality.standards.dialogs.method.matrix')} value={methodForm.matrix || ''} onChange={(e) => setMethodForm((p) => ({ ...p, matrix: e.target.value }))} />
        <FormTextField label={t('quality.standards.dialogs.method.applicable_organism')} value={methodForm.applicable_organism || ''} onChange={(e) => setMethodForm((p) => ({ ...p, applicable_organism: e.target.value }))} />
        <FormTextField label="LOD" value={methodForm.lod || ''} onChange={(e) => setMethodForm((p) => ({ ...p, lod: e.target.value }))} />
        <FormTextField label="LOQ" value={methodForm.loq || ''} onChange={(e) => setMethodForm((p) => ({ ...p, loq: e.target.value }))} />
        <FormTextField label={t('quality.standards.dialogs.method.unit')} value={methodForm.unit || ''} onChange={(e) => setMethodForm((p) => ({ ...p, unit: e.target.value }))} />
        <FormSelect label={t('quality.standards.dialogs.method.validation_status')} value={methodForm.validation_status || ''} onChange={(value: string) => setMethodForm((p) => ({ ...p, validation_status: value }))} options={[
          { value: 'VALIDATED', label: t('quality.standards.dialogs.method.validation_status.VALIDATED') },
          { value: 'VERIFIED', label: t('quality.standards.dialogs.method.validation_status.VERIFIED') },
          { value: 'PERFORMANCE_TESTED', label: t('quality.standards.dialogs.method.validation_status.PERFORMANCE_TESTED') },
          { value: 'PENDING', label: t('quality.standards.dialogs.method.validation_status.PENDING') },
          { value: 'INVALID', label: t('quality.standards.dialogs.method.validation_status.INVALID') },
        ]} required />
        <FormTextField label={t('quality.standards.dialogs.method.reference_standard')} value={methodForm.reference_standard || ''} onChange={(e) => setMethodForm((p) => ({ ...p, reference_standard: e.target.value }))} />
        <FormControlLabel
          control={<Switch checked={!!methodForm.active} onChange={(e) => setMethodForm((p) => ({ ...p, active: e.target.checked }))} />}
          label={t('quality.standards.dialogs.method.active')}
        />
      </FormDialog>

      <FormDialog
        open={!!openRuleDialog}
        onClose={() => { setOpenRuleDialog(null); setRuleForm({}); }}
        title={openRuleDialog === 'new' ? t('quality.standards.dialogs.rule.new') : t('quality.standards.dialogs.rule.edit')}
        onSubmit={handleRuleSubmit}
      >
        <FormTextField label={t('quality.standards.dialogs.rule.code')} value={ruleForm.code || ''} onChange={(e) => setRuleForm((p) => ({ ...p, code: e.target.value }))} required />
        <FormTextField label={t('quality.standards.dialogs.rule.name_ar')} value={ruleForm.name_ar || ''} onChange={(e) => setRuleForm((p) => ({ ...p, name_ar: e.target.value }))} required />
        <FormTextField label={t('quality.standards.dialogs.rule.description')} multiline minRows={3} value={ruleForm.description || ''} onChange={(e) => setRuleForm((p) => ({ ...p, description: e.target.value }))} />
        <FormTextField label={t('quality.standards.dialogs.rule.priority')} type="number" value={ruleForm.priority || ''} onChange={(e) => setRuleForm((p) => ({ ...p, priority: e.target.value ? parseInt(e.target.value) : 0 }))} required />
        <FormSelect label={t('quality.standards.dialogs.rule.source_type')} value={ruleForm.source_type || ''} onChange={(value: string) => setRuleForm((p) => ({ ...p, source_type: value }))} options={[
          { value: 'NATIONAL_LAW', label: t('quality.standards.dialogs.rule.source_type.NATIONAL_LAW') },
          { value: 'SUDANESE_STANDARD', label: t('quality.standards.dialogs.rule.source_type.SUDANESE_STANDARD') },
          { value: 'REGULATORY_DECISION', label: t('quality.standards.dialogs.rule.source_type.REGULATORY_DECISION') },
          { value: 'CONTRACT_DESTINATION', label: t('quality.standards.dialogs.rule.source_type.CONTRACT_DESTINATION') },
          { value: 'GSO_REFERENCE', label: t('quality.standards.dialogs.rule.source_type.GSO_REFERENCE') },
          { value: 'CODEX_REFERENCE', label: t('quality.standards.dialogs.rule.source_type.CODEX_REFERENCE') },
        ]} required />
        <FormControlLabel
          control={<Switch checked={!!ruleForm.is_active} onChange={(e) => setRuleForm((p) => ({ ...p, is_active: e.target.checked }))} />}
          label={t('quality.standards.dialogs.rule.active')}
        />
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('quality.standards.dialogs.delete.title')}
        message={deleteTarget ? t('quality.standards.dialogs.delete.message', { name: deleteTarget.label }) : ''}
        confirmLabel={t('quality.standards.dialogs.delete.confirm')}
        cancelLabel={t('quality.standards.dialogs.delete.cancel')}
        loading={deleting}
        onConfirm={handleDeleteStandard}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export { StandardsReviewPage };
export default StandardsReviewPage;