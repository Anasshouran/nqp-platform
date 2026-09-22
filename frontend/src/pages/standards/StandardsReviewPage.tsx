import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Grid from '@mui/material/Grid';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useDispatch } from 'react-redux';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ScienceIcon from '@mui/icons-material/Science';
import DescriptionIcon from '@mui/icons-material/Description';
import RuleIcon from '@mui/icons-material/Rule';
import CompareIcon from '@mui/icons-material/Compare';
import BiotechIcon from '@mui/icons-material/Biotech';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { logout as logoutApi } from '../../api/endpoints/auth';
import { useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store/store';
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

const SECTIONS = [
  { id: 'dashboard', label: 'لوحة القيادة', icon: <AssessmentIcon fontSize="small" /> },
  { id: 'standards', label: 'المواصفات', icon: <DescriptionIcon fontSize="small" /> },
  { id: 'versions', label: 'الإصدارات', icon: <ScienceIcon fontSize="small" /> },
  { id: 'requirements', label: 'المتطلبات', icon: <RuleIcon fontSize="small" /> },
  { id: 'methods', label: 'الطرق التحليلية', icon: <BiotechIcon fontSize="small" /> },
  { id: 'rules', label: 'قواعد التطبيق', icon: <CompareIcon fontSize="small" /> },
  { id: 'comparison', label: 'مقارنة المواصفات', icon: <CompareIcon fontSize="small" /> },
] as const;


const StandardsReviewPage = () => {
  const { user } = useAuth();
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

  const { active, register, scrollTo } = useCommandSections(SECTIONS as unknown as CommandSectionDef[], [dashboardLoading]);

  // Columns
  const standardColumns = useMemo<DataTableColumn<Standard>[]>(() => [
    { key: 'code', label: 'الكود', width: 140 },
    { key: 'title_ar', label: 'العنوان', width: 300 },
    { key: 'source_label', label: 'المصدر', width: 180 },
    { key: 'status_label', label: 'الحالة', width: 120 },
    { key: 'product_name', label: 'المنتج', width: 180 },
    { key: 'mandatory', label: 'إلزامية', width: 100, render: (v: unknown) => v ? 'نعم' : 'لا' },
    { key: 'created_at', label: 'تاريخ الإنشاء', width: 160, render: (v: unknown) => typeof v === 'string' ? v.substring(0, 10) : '' },
  ], []);

  const versionColumns = useMemo<DataTableColumn<StandardVersion>[]>(() => [
    { key: 'standard_code', label: 'المواصفة', width: 140 },
    { key: 'version', label: 'الإصدار', width: 100 },
    { key: 'effective_from', label: 'سارٍ من', width: 120, render: (v: unknown) => typeof v === 'string' ? v.substring(0, 10) : '' },
    { key: 'effective_to', label: 'ينتهي', width: 120, render: (v: unknown) => typeof v === 'string' ? v.substring(0, 10) : '—' },
    { key: 'standard_source', label: 'المصدر', width: 160 },
    { key: 'created_at', label: 'تاريخ الإنشاء', width: 160, render: (v: unknown) => typeof v === 'string' ? v.substring(0, 10) : '' },
  ], []);

  const requirementColumns = useMemo<DataTableColumn<StandardRequirement>[]>(() => [
    { key: 'version_code', label: 'المواصفة', width: 140 },
    { key: 'parameter_name', label: 'المعامل', width: 180 },
    { key: 'microorganism_name', label: 'الكائن الدقيق', width: 180 },
    { key: 'limit_type_label', label: 'نوع الحد', width: 140 },
    { key: 'label', label: 'الحد', width: 160 },
    { key: 'method_name', label: 'الطريقة', width: 180 },
    { key: 'active', label: 'نشط', width: 80, render: (v: unknown) => v ? 'نعم' : 'لا' },
  ], []);

  const methodColumns = useMemo<DataTableColumn<AnalyticalMethod>[]>(() => [
    { key: 'code', label: 'الكود', width: 160 },
    { key: 'name_ar', label: 'الاسم', width: 300 },
    { key: 'source_label', label: 'المصدر', width: 140 },
    { key: 'validation_status_label', label: 'حالة الاعتماد', width: 160 },
    { key: 'matrix', label: 'المصفوفة', width: 160 },
    { key: 'lod', label: 'LOD', width: 100 },
    { key: 'loq', label: 'LOQ', width: 100 },
    { key: 'active', label: 'نشط', width: 80, render: (v: unknown) => v ? 'نعم' : 'لا' },
  ], []);

  const ruleColumns = useMemo<DataTableColumn<RegulatoryRule>[]>(() => [
    { key: 'priority', label: 'الأولوية', width: 100 },
    { key: 'name_ar', label: 'الاسم', width: 300 },
    { key: 'source_type_label', label: 'نوع المرجع', width: 180 },
    { key: 'is_active', label: 'نشط', width: 80, render: (v: unknown) => v ? 'نعم' : 'لا' },
  ], []);

  // Handlers - wrapped for FormDialog onSubmit (no args)
  const handleStandardSubmit = useCallback(async () => {
    try {
      if (openStandardDialog) {
        await updateStandard(openStandardDialog, standardForm);
        notifySuccess('تم تحديث المواصفة');
      } else {
        await createStandard(standardForm);
        notifySuccess('تم إنشاء المواصفة');
      }
      setOpenStandardDialog(null);
      setStandardForm({});
      standards.refresh();
    } catch (e) {
      notifyError('حدث خطأ أثناء الحفظ');
    }
  }, [openStandardDialog, standardForm, standards]);

  const handleVersionSubmit = useCallback(async () => {
    try {
      if (openVersionDialog) {
        await updateStandardVersion(openVersionDialog, versionForm);
        notifySuccess('تم تحديث الإصدار');
      } else {
        await createStandardVersion(versionForm);
        notifySuccess('تم إنشاء الإصدار');
      }
      setOpenVersionDialog(null);
      setVersionForm({});
      versions.refresh();
    } catch (e) {
      notifyError('حدث خطأ أثناء الحفظ');
    }
  }, [openVersionDialog, versionForm, versions]);

  const handleRequirementSubmit = useCallback(async () => {
    try {
      if (openRequirementDialog) {
        await updateStandardRequirement(openRequirementDialog, requirementForm);
        notifySuccess('تم تحديث المتطلب');
      } else {
        await createStandardRequirement(requirementForm);
        notifySuccess('تم إنشاء المتطلب');
      }
      setOpenRequirementDialog(null);
      setRequirementForm({});
      requirements.refresh();
    } catch (e) {
      notifyError('حدث خطأ أثناء الحفظ');
    }
  }, [openRequirementDialog, requirementForm, requirements]);

  const handleMethodSubmit = useCallback(async () => {
    try {
      if (openMethodDialog) {
        await updateAnalyticalMethod(openMethodDialog, methodForm);
        notifySuccess('تم تحديث الطريقة');
      } else {
        await createAnalyticalMethod(methodForm);
        notifySuccess('تم إنشاء الطريقة');
      }
      setOpenMethodDialog(null);
      setMethodForm({});
      methods.refresh();
    } catch (e) {
      notifyError('حدث خطأ أثناء الحفظ');
    }
  }, [openMethodDialog, methodForm, methods]);

  const handleRuleSubmit = useCallback(async () => {
    try {
      if (openRuleDialog) {
        await updateRegulatoryRule(openRuleDialog, ruleForm);
        notifySuccess('تم تحديث القاعدة');
      } else {
        await createRegulatoryRule(ruleForm);
        notifySuccess('تم إنشاء القاعدة');
      }
      setOpenRuleDialog(null);
      setRuleForm({});
      rules.refresh();
    } catch (e) {
      notifyError('حدث خطأ أثناء الحفظ');
    }
  }, [openRuleDialog, ruleForm, rules]);

  const handleDeleteStandard = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStandard(deleteTarget.id);
      notifySuccess('تم الحذف');
      setDeleteTarget(null);
      standards.refresh();
    } catch (e) {
      notifyError('حدث خطأ أثناء الحذف');
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
      notifyError('فشل في جلب المقارنة');
    } finally {
      setComparisonLoading(false);
    }
  }, []);

  return (
    <Box>
      <DashboardHero
        eyebrow="المواصفات والمعايير"
        title="مراجعة المواصفات والمطابقة"
        subtitle="إدارة المواصفات والمعايير المرجعية، الإصدارات، المتطلبات، الطرق التحليلية، وقواعد التطبيق التنظيمية"
        gradient="emerald"
        avatarLabel={(user?.full_name || 'م').slice(0, 1)}
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
          <Box component="section" ref={register('dashboard')} data-section="dashboard" sx={{ scrollMarginTop: '80px' }}>
            {dashboardLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>جاري التحميل...</Box>
            ) : dashboardData && (
            <>
              <Stack direction="row" spacing={3} sx={{ mb: 4, flexWrap: 'wrap' }}>
                <KpiCard label="إجمالي المواصفات" value={dashboardData.kpis.total_standards} icon={<DescriptionIcon />} accent="primary.main" />
                <KpiCard label="الإصدارات السارية" value={dashboardData.kpis.active_versions} icon={<ScienceIcon />} accent="success.main" />
                <KpiCard label="المتطلبات الكيميائية" value={dashboardData.kpis.chemical_requirements} icon={<BiotechIcon />} accent="info.main" />
                <KpiCard label="المتطلبات الميكروبيولوجية" value={dashboardData.kpis.micro_requirements} icon={<BiotechIcon />} accent="warning.main" />
                <KpiCard label="الطرق المعتمدة" value={dashboardData.kpis.validated_methods} icon={<RuleIcon />} accent="secondary.main" />
                <KpiCard label="قواعد التطبيق النشطة" value={dashboardData.kpis.active_rules} icon={<CompareIcon />} accent="primary.main" />
              </Stack>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>المواصفات حسب المصدر</Typography>
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
          title="المواصفات"
          search={standards.search}
          searchInput={standards.searchInput}
          onSearchChange={standards.setSearchInput}
          sortBy={standards.sortBy}
          sortOrder={standards.sortOrder}
          onSortChange={standards.setSorting}
          onPageChange={standards.setPage}
          onRowsPerPageChange={standards.setRowsPerPage}
          onRefresh={standards.refresh}
          searchPlaceholder="ابحث بالكود أو العنوان..."
          actions={(row) => (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="تعديل">
                <IconButton aria-label="تعديل" size="small" onClick={() => { setStandardForm(row); setOpenStandardDialog(row.id); }}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="حذف">
                <IconButton aria-label="حذف" size="small" color="error" onClick={() => setDeleteTarget({ id: row.id, label: row.title_ar })}>
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
          title="إصدارات المواصفات"
          search={versions.search}
          searchInput={versions.searchInput}
          onSearchChange={versions.setSearchInput}
          sortBy={versions.sortBy}
          sortOrder={versions.sortOrder}
          onSortChange={versions.setSorting}
          onPageChange={versions.setPage}
          onRowsPerPageChange={versions.setRowsPerPage}
          onRefresh={versions.refresh}
          searchPlaceholder="ابحث بالمواصفة أو الإصدار..."
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
          title="متطلبات المواصفات"
          search={requirements.search}
          searchInput={requirements.searchInput}
          onSearchChange={requirements.setSearchInput}
          sortBy={requirements.sortBy}
          sortOrder={requirements.sortOrder}
          onSortChange={requirements.setSorting}
          onPageChange={requirements.setPage}
          onRowsPerPageChange={requirements.setRowsPerPage}
          onRefresh={requirements.refresh}
          searchPlaceholder="ابحث بالمعامل أو الكائن..."
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
          title="الطرق التحليلية"
          search={methods.search}
          searchInput={methods.searchInput}
          onSearchChange={methods.setSearchInput}
          sortBy={methods.sortBy}
          sortOrder={methods.sortOrder}
          onSortChange={methods.setSorting}
          onPageChange={methods.setPage}
          onRowsPerPageChange={methods.setRowsPerPage}
          onRefresh={methods.refresh}
          searchPlaceholder="ابحث بالكود أو الاسم..."
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
          title="قواعد التطبيق التنظيمية"
          search={rules.search}
          searchInput={rules.searchInput}
          onSearchChange={rules.setSearchInput}
          sortBy={rules.sortBy}
          sortOrder={rules.sortOrder}
          onSortChange={rules.setSorting}
          onPageChange={rules.setPage}
          onRowsPerPageChange={rules.setRowsPerPage}
          onRefresh={rules.refresh}
          searchPlaceholder="ابحث بالاسم..."
            />
          </Box>

          <Box component="section" ref={register('comparison')} data-section="comparison" sx={{ scrollMarginTop: '80px' }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>مقارنة المواصفات لمعامِّل</Typography>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 300 }}>
                <FormSelect
                  label="اختر المعامل"
                  value={comparisonParam}
                  onChange={(value: string) => setComparisonParam(value)}
                  options={[
                    { value: '54428fec-5c5a-40a2-94ee-3b0bbe89eb7f', label: 'PROTEIN — البروتين' },
                    { value: '89ca70fb-4f9e-4c53-b544-8e66047bf98a', label: 'MOISTURE — الرطوبة' },
                    { value: 'a9549529-e33a-437e-b398-b2e25c4e780c', label: 'AFLATOXIN_B1 — أفلاتوكسين B1' },
                    { value: '4b7c708a-19f8-4f97-8d5e-fcc3fd592566', label: 'AFLATOXIN_M1 — أفلاتوكسين M1' },
                  ]}
                />
              </Box>
              <Box sx={{ mt: 1.5 }}>
                <AppButton variant="primary" onClick={() => handleComparisonSearch(comparisonParam)} disabled={!comparisonParam || comparisonLoading}>
                  {comparisonLoading ? 'جاري البحث...' : 'عرض المقارنة'}
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
                      { key: 'standard_code', label: 'كود المواصفة', width: 160 },
                      { key: 'standard_title', label: 'العنوان', width: 300 },
                      { key: 'version', label: 'الإصدار', width: 100 },
                      { key: 'effective_from', label: 'سارٍ من', width: 120, render: (v: unknown) => typeof v === 'string' ? v.substring(0, 10) : '' },
                      { key: 'limit_label', label: 'الحد', width: 180 },
                      { key: 'method_name', label: 'الطريقة', width: 200 },
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
        title={openStandardDialog === 'new' ? 'إضافة مواصفة' : 'تعديل مواصفة'}
        onSubmit={handleStandardSubmit}
      >
        <FormTextField label="الكود *" value={standardForm.code || ''} onChange={(e) => setStandardForm((p) => ({ ...p, code: e.target.value }))} required />
        <FormTextField label="العنوان (عربي) *" value={standardForm.title_ar || ''} onChange={(e) => setStandardForm((p) => ({ ...p, title_ar: e.target.value }))} required />
        <FormTextField label="العنوان (إنجليزي)" value={standardForm.title_en || ''} onChange={(e) => setStandardForm((p) => ({ ...p, title_en: e.target.value }))} />
        <FormSelect label="المصدر *" value={standardForm.source || ''} onChange={(value: string) => setStandardForm((p) => ({ ...p, source: value }))} options={[
          { value: 'SSMO', label: 'SSMO - المواصفة السودانية' },
          { value: 'GSO', label: 'GSO - المواصفة الخليجية' },
          { value: 'CODEX', label: 'CODEX - Codex Alimentarius' },
          { value: 'ISO', label: 'ISO' },
          { value: 'AOAC', label: 'AOAC' },
          { value: 'OTHER', label: 'مرجع آخر' },
        ]} required />
        <FormTextField label="الدولة/الجهة" value={standardForm.country || ''} onChange={(e) => setStandardForm((p) => ({ ...p, country: e.target.value }))} />
        <FormTextField label="المرجع الوثائقي" value={standardForm.document_reference || ''} onChange={(e) => setStandardForm((p) => ({ ...p, document_reference: e.target.value }))} />
        <FormControlLabel
          control={<Switch checked={!!standardForm.mandatory} onChange={(e) => setStandardForm((p) => ({ ...p, mandatory: e.target.checked }))} />}
          label="إلزامية"
        />
        <FormSelect label="الحالة *" value={standardForm.status || ''} onChange={(value: string) => setStandardForm((p) => ({ ...p, status: value }))} options={[
          { value: 'DRAFT', label: 'مسودة' },
          { value: 'ACTIVE', label: 'فعالة' },
          { value: 'ARCHIVED', label: 'مؤرشفة' },
        ]} required />
      </FormDialog>

      <FormDialog
        open={!!openVersionDialog}
        onClose={() => { setOpenVersionDialog(null); setVersionForm({}); }}
        title={openVersionDialog === 'new' ? 'إضافة إصدار' : 'تعديل إصدار'}
        onSubmit={handleVersionSubmit}
      >
        <FormSelect label="المواصفة *" requiredMark placeholder="اختر المواصفة..." value={versionForm.standard || ''} onChange={(value: string) => setVersionForm((p) => ({ ...p, standard: value }))} options={standardOptions} />
        <FormTextField label="رقم/سنة الإصدار *" value={versionForm.version || ''} onChange={(e) => setVersionForm((p) => ({ ...p, version: e.target.value }))} required />
        <FormTextField label="تاريخ السريان *" type="date" value={versionForm.effective_from || ''} onChange={(e) => setVersionForm((p) => ({ ...p, effective_from: e.target.value }))} required />
        <FormTextField label="تاريخ الانتهاء" type="date" value={versionForm.effective_to || ''} onChange={(e) => setVersionForm((p) => ({ ...p, effective_to: e.target.value }))} />
        <FormTextField label="تاريخ الإصدار" type="date" value={versionForm.issue_date || ''} onChange={(e) => setVersionForm((p) => ({ ...p, issue_date: e.target.value }))} />
        <FormTextField label="المرجع الوثائقي" value={versionForm.document_reference || ''} onChange={(e) => setVersionForm((p) => ({ ...p, document_reference: e.target.value }))} />
        <FormTextField label="ملاحظات" multiline minRows={3} value={versionForm.notes || ''} onChange={(e) => setVersionForm((p) => ({ ...p, notes: e.target.value }))} />
      </FormDialog>

      <FormDialog
        open={!!openRequirementDialog}
        onClose={() => { setOpenRequirementDialog(null); setRequirementForm({}); }}
        title={openRequirementDialog === 'new' ? 'إضافة متطلب' : 'تعديل متطلب'}
        onSubmit={handleRequirementSubmit}
      >
        <FormSelect label="الإصدار *" requiredMark placeholder="اختر الإصدار..." value={requirementForm.version || ''} onChange={(value: string) => setRequirementForm((p) => ({ ...p, version: value }))} options={versionOptions} />
        <FormSelect label="المعامل" placeholder="اختر المعامل..." value={requirementForm.parameter || ''} onChange={(value: string) => setRequirementForm((p) => ({ ...p, parameter: value }))} options={parameterOptions} />
        <FormSelect label="الكائن الدقيق" placeholder="اختر الكائن الدقيق..." value={requirementForm.microorganism || ''} onChange={(value: string) => setRequirementForm((p) => ({ ...p, microorganism: value }))} options={microorganismOptions} />
        <FormSelect label="الطريقة" placeholder="اختر الطريقة..." value={requirementForm.method || ''} onChange={(value: string) => setRequirementForm((p) => ({ ...p, method: value }))} options={methodOptions} />
        <FormSelect label="نوع الحد *" value={requirementForm.limit_type || ''} onChange={(value: string) => setRequirementForm((p) => ({ ...p, limit_type: value }))} options={[
          { value: 'MAXIMUM', label: 'حد أقصى (≤)' },
          { value: 'MINIMUM', label: 'حد أدنى (≥)' },
          { value: 'RANGE', label: 'مدى (بين)' },
          { value: 'SPECIFIED', label: 'قيمة محددة' },
          { value: 'PRESENCE_ABSENCE', label: 'حضور/غياب' },
        ]} required />
        <FormTextField label="الحد الأدنى" type="number" value={requirementForm.min_value || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, min_value: e.target.value ? parseFloat(e.target.value) : undefined }))} />
        <FormTextField label="الحد الأقصى" type="number" value={requirementForm.max_value || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, max_value: e.target.value ? parseFloat(e.target.value) : undefined }))} />
        <FormTextField label="الوحدة" value={requirementForm.unit || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, unit: e.target.value }))} />
        <FormTextField label="n" type="number" value={requirementForm.n || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, n: e.target.value ? parseInt(e.target.value) : 0 }))} />
        <FormTextField label="c" type="number" value={requirementForm.c || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, c: e.target.value ? parseInt(e.target.value) : 0 }))} />
        <FormTextField label="m" type="number" value={requirementForm.m || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, m: e.target.value ? parseFloat(e.target.value) : undefined }))} />
        <FormTextField label="M" type="number" value={requirementForm.M || ''} onChange={(e) => setRequirementForm((p) => ({ ...p, M: e.target.value ? parseFloat(e.target.value) : undefined }))} />
        <FormSelect label="نوع الخطة" value={requirementForm.plan || ''} onChange={(value: string) => setRequirementForm((p) => ({ ...p, plan: value }))} options={[
          { value: 'TWO_CLASS', label: 'فئتين (2-Class)' },
          { value: 'THREE_CLASS', label: 'ثلاث فئات (3-Class)' },
          { value: 'PRESENCE_ABSENCE', label: 'حضور/غياب' },
        ]} />
        <FormControlLabel
          control={<Switch checked={!!requirementForm.active} onChange={(e) => setRequirementForm((p) => ({ ...p, active: e.target.checked }))} />}
          label="نشط"
        />
      </FormDialog>

      <FormDialog
        open={!!openMethodDialog}
        onClose={() => { setOpenMethodDialog(null); setMethodForm({}); }}
        title={openMethodDialog === 'new' ? 'إضافة طريقة تحليلية' : 'تعديل طريقة تحليلية'}
        onSubmit={handleMethodSubmit}
      >
        <FormTextField label="الكود *" value={methodForm.code || ''} onChange={(e) => setMethodForm((p) => ({ ...p, code: e.target.value }))} required />
        <FormTextField label="الاسم (عربي) *" value={methodForm.name_ar || ''} onChange={(e) => setMethodForm((p) => ({ ...p, name_ar: e.target.value }))} required />
        <FormTextField label="الاسم (إنجليزي)" value={methodForm.name_en || ''} onChange={(e) => setMethodForm((p) => ({ ...p, name_en: e.target.value }))} />
        <FormSelect label="المصدر *" value={methodForm.source || ''} onChange={(value: string) => setMethodForm((p) => ({ ...p, source: value }))} options={[
          { value: 'ISO', label: 'ISO' },
          { value: 'AOAC', label: 'AOAC' },
          { value: 'CODEX', label: 'Codex' },
          { value: 'SSMO', label: 'SSMO' },
          { value: 'OTHER', label: 'مرجع آخر' },
        ]} required />
        <FormTextField label="النسخة" value={methodForm.version || ''} onChange={(e) => setMethodForm((p) => ({ ...p, version: e.target.value }))} />
        <FormTextField label="المصفوفة/المجال" value={methodForm.matrix || ''} onChange={(e) => setMethodForm((p) => ({ ...p, matrix: e.target.value }))} />
        <FormTextField label="الكائنات المطبقة" value={methodForm.applicable_organism || ''} onChange={(e) => setMethodForm((p) => ({ ...p, applicable_organism: e.target.value }))} />
        <FormTextField label="LOD" value={methodForm.lod || ''} onChange={(e) => setMethodForm((p) => ({ ...p, lod: e.target.value }))} />
        <FormTextField label="LOQ" value={methodForm.loq || ''} onChange={(e) => setMethodForm((p) => ({ ...p, loq: e.target.value }))} />
        <FormTextField label="الوحدة" value={methodForm.unit || ''} onChange={(e) => setMethodForm((p) => ({ ...p, unit: e.target.value }))} />
        <FormSelect label="حالة الاعتماد *" value={methodForm.validation_status || ''} onChange={(value: string) => setMethodForm((p) => ({ ...p, validation_status: value }))} options={[
          { value: 'VALIDATED', label: 'مصدّق عليها (Validated)' },
          { value: 'VERIFIED', label: 'تم التحقق منها (Verified)' },
          { value: 'PERFORMANCE_TESTED', label: 'مختبرة الأداء (PTM)' },
          { value: 'PENDING', label: 'قيد الاعتماد' },
          { value: 'INVALID', label: 'غير صالحة' },
        ]} required />
        <FormTextField label="المرجع" value={methodForm.reference_standard || ''} onChange={(e) => setMethodForm((p) => ({ ...p, reference_standard: e.target.value }))} />
        <FormControlLabel
          control={<Switch checked={!!methodForm.active} onChange={(e) => setMethodForm((p) => ({ ...p, active: e.target.checked }))} />}
          label="نشط"
        />
      </FormDialog>

      <FormDialog
        open={!!openRuleDialog}
        onClose={() => { setOpenRuleDialog(null); setRuleForm({}); }}
        title={openRuleDialog === 'new' ? 'إضافة قاعدة تطبيق' : 'تعديل قاعدة تطبيق'}
        onSubmit={handleRuleSubmit}
      >
        <FormTextField label="الكود *" value={ruleForm.code || ''} onChange={(e) => setRuleForm((p) => ({ ...p, code: e.target.value }))} required />
        <FormTextField label="الاسم (عربي) *" value={ruleForm.name_ar || ''} onChange={(e) => setRuleForm((p) => ({ ...p, name_ar: e.target.value }))} required />
        <FormTextField label="الوصف" multiline minRows={3} value={ruleForm.description || ''} onChange={(e) => setRuleForm((p) => ({ ...p, description: e.target.value }))} />
        <FormTextField label="ترتيب الأولوية *" type="number" value={ruleForm.priority || ''} onChange={(e) => setRuleForm((p) => ({ ...p, priority: e.target.value ? parseInt(e.target.value) : 0 }))} required />
        <FormSelect label="نوع المرجع *" value={ruleForm.source_type || ''} onChange={(value: string) => setRuleForm((p) => ({ ...p, source_type: value }))} options={[
          { value: 'NATIONAL_LAW', label: 'قانون/تشريع وطني' },
          { value: 'SUDANESE_STANDARD', label: 'مواصفة سودانية' },
          { value: 'REGULATORY_DECISION', label: 'قرار تنظيمي/سياسة' },
          { value: 'CONTRACT_DESTINATION', label: 'اشتراط تعاقدي/بلد المقصد' },
          { value: 'GSO_REFERENCE', label: 'مرجع GSO معتمد' },
          { value: 'CODEX_REFERENCE', label: 'مرجع Codex' },
        ]} required />
        <FormControlLabel
          control={<Switch checked={!!ruleForm.is_active} onChange={(e) => setRuleForm((p) => ({ ...p, is_active: e.target.checked }))} />}
          label="فعالة"
        />
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف المواصفة"
        message={deleteTarget ? `هل أنت متأكد من حذف "${deleteTarget.label}"؟ لا يمكن التراجع عن هذا الإجراء.` : ''}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        loading={deleting}
        onConfirm={handleDeleteStandard}
        onClose={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export { StandardsReviewPage };
export default StandardsReviewPage;