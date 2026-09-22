import { useCallback, useMemo, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import Drawer from '@mui/material/Drawer';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import ScienceIcon from '@mui/icons-material/Science';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  createSample,
  getInspections,
  getSamples,
  getShipments,
  inspectShipment,
} from '../../api/endpoints/food';
import type { FoodInspection, FoodShipment, FoodSample } from '../../types/food';
import type { AxiosError } from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { useDispatch } from 'react-redux';
import { logout as logoutApi } from '../../api/endpoints/auth';
import { logout } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store/store';
import { notifyError, notifySuccess } from '../../utils/toast';
import KpiCard from '../../components/dashboard/KpiCard';

const TAB_ITEMS = [
  { key: 'home', label: 'الرئيسية', icon: <HomeIcon /> },
  { key: 'tasks', label: 'مهام التفتيش', icon: <SearchIcon /> },
  { key: 'samples', label: 'العينات', icon: <ScienceIcon /> },
];

const SAMPLE_STATUS_META: Record<string, { label: string; color: 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info' }> = {
  RECEIVED: { label: 'تم الاستلام', color: 'info' },
  COORDINATED: { label: 'تم التنسيق', color: 'info' },
  ASSIGNED: { label: 'أُسندت للقسم', color: 'primary' },
  UNDER_TESTING: { label: 'قيد التحليل', color: 'warning' },
  READY_FOR_APPROVAL: { label: 'جاهزة للاعتماد', color: 'warning' },
  APPROVED: { label: 'معتمدة', color: 'success' },
  DISPATCHED: { label: 'أُرسلت النتائج', color: 'success' },
  COMPLETED: { label: 'مكتملة', color: 'success' },
  REJECTED: { label: 'مرفوضة', color: 'error' },
};

const counterpartyOf = (r: FoodShipment) =>
  (r.shipment_type === 'IMPORT' ? r.supplier_name : r.exporter_name) || r.supplier_name || '—';

const getErrMessage = (e: unknown, fallback: string) => {
  const err = e as AxiosError<{ message?: string }>;
  return err.response?.data?.message || fallback;
};

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
};

type InspFormState = {
  decision: '' | FoodInspection['decision'];
  temperature: string;
  container_condition: string;
  package_condition: string;
  batch_number: string;
  production_date: string;
  expiry_date: string;
  damaged_count: string;
  sound_count: string;
  damaged_weight: string;
  sound_weight: string;
  notes: string;
};

const EMPTY_FORM: InspFormState = {
  decision: '',
  temperature: '',
  container_condition: '',
  package_condition: '',
  batch_number: '',
  production_date: '',
  expiry_date: '',
  damaged_count: '',
  sound_count: '',
  damaged_weight: '',
  sound_weight: '',
  notes: '',
};

const InspectorDashboardPage = () => {
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('home');
  const [tasks, setTasks] = useState<FoodShipment[]>([]);
  const [samples, setSamples] = useState<FoodSample[]>([]);
  const [myInspections, setMyInspections] = useState<FoodInspection[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [inspectTarget, setInspectTarget] = useState<FoodShipment | null>(null);
  const [form, setForm] = useState<InspFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [sampleFor, setSampleFor] = useState<string | null>(null);
  const [sampleForm, setSampleForm] = useState({ sample_type: 'غذائية', quantity: '', quantity_unit: 'كجم' });
  const [sampling, setSampling] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const isDesktop = useMediaQuery('(min-width: 1000px)');

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoadingData(true);
    try {
      const [taskRes, sampleRes, inspRes] = await Promise.all([
        getShipments({ assigned_inspector: user.id, status: 'AWAITING_INSPECTION', page_size: 100 }),
        getSamples({ received_by: user.id, page_size: 100 }),
        getInspections({ inspector: user.id, page_size: 100 }),
      ]);
      setTasks(taskRes.data.data.results);
      setSamples(sampleRes.data.data.results);
      setMyInspections(inspRes.data.data.results);
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر تحميل مهام التفتيش'));
    } finally {
      setLoadingData(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const counts = useMemo(
    () => ({
      pendingTasks: tasks.length,
      activeSamples: samples.filter((s) =>
        ['RECEIVED', 'COORDINATED', 'ASSIGNED', 'UNDER_TESTING', 'READY_FOR_APPROVAL'].includes(s.status),
      ).length,
      completedSamples: samples.filter((s) => ['APPROVED', 'DISPATCHED', 'COMPLETED'].includes(s.status)).length,
      inspectionsDone: myInspections.length,
    }),
    [tasks, samples, myInspections],
  );

  const openInspectDialog = (shipment: FoodShipment) => {
    setForm(EMPTY_FORM);
    setInspectTarget(shipment);
  };

  const handleSaveInspection = async () => {
    if (!inspectTarget || !form.decision) {
      notifyError('اختر نتيجة التفتيش أولاً');
      return;
    }
    if (form.decision === 'NON_COMPLIANT' && !form.notes.trim()) {
      notifyError('نتيجة «غير مطابق» تتطلب وصف المخالفة في الملاحظات');
      return;
    }
    setSaving(true);
    try {
      await inspectShipment(inspectTarget.id, {
        decision: form.decision,
        temperature: form.temperature || undefined,
        container_condition: form.container_condition,
        package_condition: form.package_condition,
        batch_number: form.batch_number,
        production_date: form.production_date || undefined,
        expiry_date: form.expiry_date || undefined,
        damaged_count: form.damaged_count || undefined,
        sound_count: form.sound_count || undefined,
        damaged_weight: form.damaged_weight || undefined,
        sound_weight: form.sound_weight || undefined,
        notes: form.notes,
      });
      notifySuccess(
        form.decision === 'COMPLIANT'
          ? `تم اعتماد المطابقة وإفراج عن ${inspectTarget.manifest_number}`
          : 'تم حفظ نتيجة التفتيش',
      );
      if (form.decision === 'NEEDS_ANALYSIS') {
        setSampleFor(inspectTarget.id);
        setSampleForm({ sample_type: 'غذائية', quantity: '', quantity_unit: 'كجم' });
        setSampleOpen(true);
      }
      setInspectTarget(null);
      setActiveView('home');
      await loadData();
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر حفظ التفتيش'));
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterSample = async () => {
    if (!sampleFor) return;
    setSampling(true);
    try {
      const res = await createSample(sampleFor, {
        sample_type: sampleForm.sample_type,
        quantity: sampleForm.quantity || undefined,
        quantity_unit: sampleForm.quantity_unit,
      });
      notifySuccess(`تم تسجيل العينة ${res.data.data.sample_barcode}`);
      setSampleOpen(false);
      setSampleFor(null);
      setActiveView('samples');
      await loadData();
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر تسجيل العينة'));
    } finally {
      setSampling(false);
    }
  };

  const firstName = (user?.full_name || 'المفتش').split(' ')[0];
  const headerTitle = TAB_ITEMS.find((t) => t.key === activeView)?.label ?? 'لوحة التفتيش';

  const handleLogout = async () => {
    setUserMenuAnchor(null);
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // ignore logout API errors
      }
    }
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const navItems = (collapsed: boolean) => (
    <Stack sx={{ p: 1, gap: 0.5 }}>
      {TAB_ITEMS.map((t) => (
        <Tooltip key={t.key} title={collapsed ? t.label : ''} placement="left-start">
          <Button
            fullWidth
            onClick={() => { setActiveView(t.key); setMobileNavOpen(false); }}
            aria-current={activeView === t.key ? 'page' : undefined}
            variant={activeView === t.key ? 'contained' : 'text'}
            color={activeView === t.key ? 'primary' : 'inherit'}
            startIcon={t.icon}
            sx={{
              justifyContent: collapsed ? 'center' : 'space-between',
              px: collapsed ? 0 : 1.25,
              minHeight: 42,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: activeView === t.key ? 800 : 700,
              fontSize: 13.5,
              '& .MuiButton-startIcon': { ml: collapsed ? 0 : -0.5 },
            }}
          >
            {!collapsed && <span>{t.label}</span>}
          </Button>
        </Tooltip>
      ))}
    </Stack>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'rgba(16,40,34,0.02)' }}>
      {/* الشريط الجانبي — سطح المكتب */}
      {isDesktop && (
        <Box
          component="aside"
          sx={{
            width: navCollapsed ? 72 : 248,
            flexShrink: 0,
            position: 'sticky',
            top: 0,
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid',
            borderLeftColor: 'divider',
            bgcolor: 'background.paper',
            transition: 'width .18s ease',
            overflow: 'hidden',
            zIndex: 1200,
          }}
        >
          {/* الشعار */}
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: navCollapsed ? 1 : 1.75, py: 1.5, minHeight: 64, borderBottom: '1px solid', borderBottomColor: 'divider', flexShrink: 0 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'primary.main', flexShrink: 0 }}>
              <SearchIcon fontSize="small" />
            </Box>
            {!navCollapsed && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>التفتيش الميداني</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>رقابة الأغذية</Typography>
              </Box>
            )}
          </Stack>

          {/* التنقل */}
          <Stack sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
            {navItems(navCollapsed)}
          </Stack>

          {/* طي / تمديد */}
          <Stack direction="row" justifyContent="center" sx={{ p: 1, borderTop: '1px solid', borderTopColor: 'divider', flexShrink: 0 }}>
            <Tooltip title={navCollapsed ? 'توسيع الشريط' : 'طي الشريط'}>
              <IconButton onClick={() => setNavCollapsed((v) => !v)} size="small" aria-label={navCollapsed ? 'توسيع الشريط الجانبي' : 'طي الشريط الجانبي'} sx={{ borderRadius: 2 }}>
                <MenuOpenIcon sx={{ transform: navCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      )}

      {/* الشريط الجانبي — الجوال */}
      <Drawer open={!isDesktop && mobileNavOpen} onClose={() => setMobileNavOpen(false)} anchor="left" PaperProps={{ sx: { width: 252 } }}>
        <Box sx={{ py: 1.5 }}>
          {navItems(false)}
        </Box>
      </Drawer>

      {/* عمود المحتوى */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* الرأس */}
        <Paper
          elevation={0}
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 1100,
            borderRadius: 0,
            borderBottom: '1px solid',
            borderBottomColor: 'divider',
            bgcolor: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25} useFlexGap flexWrap="wrap" sx={{ px: { xs: 1.5, md: 2 }, py: 1, minHeight: 64 }}>
            {!isDesktop && (
              <IconButton size="small" onClick={() => setMobileNavOpen(true)} aria-label="فتح القائمة" sx={{ borderRadius: 2 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 18, sm: 22 } }} noWrap>{headerTitle}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>لوحة التفتيش الميداني — رقابة الأغذية</Typography>
            </Box>
            <Chip
              size="small"
              color={loadingData ? 'default' : 'success'}
              icon={loadingData ? <WarningAmberIcon /> : <CheckCircleIcon />}
              label={loadingData ? 'جارٍ التحديث…' : 'البيانات محدثة'}
              variant="outlined"
            />
            <Tooltip title="الملف الشخصي">
              <IconButton aria-label="قائمة المستخدم" onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ p: 0.5, borderRadius: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 15, fontWeight: 700 }}>
                  {(user?.full_name || 'م').charAt(0)}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { mt: 1.5, borderRadius: 3, minWidth: 220 } } }}
            >
              <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700 }}>{(user?.full_name || user?.email || '؟').charAt(0)}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{user?.full_name || 'مفتش الغذاء'}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{user?.email || 'Food Inspector'}</Typography>
                </Box>
              </Box>
              <Divider />
              <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/app/account'); }} sx={{ fontWeight: 700 }}>
                <AccountCircleIcon fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} /> الملف الشخصي
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontWeight: 700 }}>
                <LogoutIcon fontSize="small" sx={{ mr: 1.25 }} /> تسجيل الخروج
              </MenuItem>
            </Menu>
          </Stack>
        </Paper>

        {/* المحتوى */}
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 1.75, md: 2.5 }, maxWidth: 1440, width: '100%', mx: 'auto' }}>
      {activeView === 'home' && (
        <>
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="مهام بانتظار التفتيش" value={counts.pendingTasks} icon={<SearchIcon />} accent="#fd7e14"
                hint="معينات لك" onClick={() => setActiveView('tasks')} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="عينات قيد المختبر" value={counts.activeSamples} icon={<ScienceIcon />} accent="#6f42c1"
                hint="قيد التحليل أو التنسيق" onClick={() => setActiveView('samples')} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="نتائج عينات جاهزة" value={counts.completedSamples} icon={<CheckCircleIcon />} accent="#1d7a54"
                hint="معتمدة/مكتملة" onClick={() => setActiveView('samples')} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="تفتيشي المنجز" value={counts.inspectionsDone} icon={<HomeIcon />} accent="#1d6fd1"
                hint="إجمالي الاستمارات المحفوظة" />
            </Grid>
          </Grid>

          <SectionTitle title="مهام التفتيش الحالية" />
          <TasksTable tasks={tasks.slice(0, 5)} onStart={openInspectDialog} showAllActions={false} onViewAll={() => setActiveView('tasks')} />
        </>
      )}

      {activeView === 'tasks' && (
        <>
          <SectionTitle title="جميع المهام المعينة لك" />
          <TasksTable tasks={tasks} onStart={openInspectDialog} showAllActions />
        </>
      )}

      {activeView === 'samples' && (
        <>
          <SectionTitle title="متابعة العينات" />
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f6f8fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>باركود العينة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المعاملة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>نوع العينة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>تاريخ الأخذ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {samples.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                        لا توجد عينات مسجلة باسمك بعد
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {samples.map((s) => {
                  const meta = SAMPLE_STATUS_META[s.status] || { label: s.status, color: 'default' as const };
                  return (
                    <TableRow key={s.id} hover>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{s.sample_barcode}</Typography></TableCell>
                      <TableCell><Typography variant="caption">{s.shipment_manifest || '—'}</Typography></TableCell>
                      <TableCell>{s.sample_type}</TableCell>
                      <TableCell><Chip size="small" label={meta.label} color={meta.color} variant="outlined" /></TableCell>
                      <TableCell><Typography variant="caption">{fmtDate(s.received_at)}</Typography></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

        </Box>
      </Box>

      {/* نافذة استمارة التفتيش */}
      <Dialog open={Boolean(inspectTarget)} onClose={() => setInspectTarget(null)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          استمارة تفتيش — {inspectTarget?.manifest_number}
          <IconButton aria-label="إغلاق" onClick={() => setInspectTarget(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {inspectTarget && (
            <Stack spacing={2}>
              {/* قراءة فقط: بيانات الشحنة */}
              <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: '#f6f8fb', border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={1}>
                  <SummaryCell label="المستورد/المصدر" value={counterpartyOf(inspectTarget)} />
                  <SummaryCell label="المنفذ" value={inspectTarget.port_name || '—'} />
                  <SummaryCell label="الوزن (كجم)" value={String(inspectTarget.total_weight_kg ?? '—')} />
                  <SummaryCell label="عدد العينات المقترح" value={String(inspectTarget.fee_preview?.samples ?? inspectTarget.samples_required ?? 0)} />
                </Grid>
                {(inspectTarget.items ?? []).length > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    المنتجات: {inspectTarget.items.map((it) => it.product_name).join('، ')}
                  </Typography>
                )}
              </Box>

              {/* استمارة الفحص */}
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={4}>
                  <Field label="درجة الحرارة (°م)" value={form.temperature} onChange={(v) => setForm((f) => ({ ...f, temperature: v }))} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Field label="رقم التشغيلة" value={form.batch_number} onChange={(v) => setForm((f) => ({ ...f, batch_number: v }))} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Field label="تاريخ الإنتاج" type="date" value={form.production_date} onChange={(v) => setForm((f) => ({ ...f, production_date: v }))} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Field label="وسيلة النقل/الماعون" value={form.container_condition} onChange={(v) => setForm((f) => ({ ...f, container_condition: v }))} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Field label="حالة العبوات" value={form.package_condition} onChange={(v) => setForm((f) => ({ ...f, package_condition: v }))} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Field label="عبوات سليمة" value={form.sound_count} onChange={(v) => setForm((f) => ({ ...f, sound_count: v }))} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Field label="عبوات تالفة" value={form.damaged_count} onChange={(v) => setForm((f) => ({ ...f, damaged_count: v }))} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Field label="الوزن السليم (كجم)" value={form.sound_weight} onChange={(v) => setForm((f) => ({ ...f, sound_weight: v }))} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Field label="الوزن التالف (كجم)" value={form.damaged_weight} onChange={(v) => setForm((f) => ({ ...f, damaged_weight: v }))} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Field label="تاريخ الانتهاء" type="date" value={form.expiry_date} onChange={(v) => setForm((f) => ({ ...f, expiry_date: v }))} />
                </Grid>
              </Grid>

              <Divider />

              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>نتيجة التفتيش *</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {(['COMPLIANT', 'NON_COMPLIANT', 'NEEDS_ANALYSIS'] as const).map((d) => (
                  <Chip
                    key={d}
                    label={d === 'COMPLIANT' ? '✅ مطابق' : d === 'NON_COMPLIANT' ? '❌ غير مطابق' : '🔬 يحتاج عينة'}
                    color={form.decision === d ? (d === 'COMPLIANT' ? 'success' : d === 'NON_COMPLIANT' ? 'error' : 'warning') : 'default'}
                    variant={form.decision === d ? 'filled' : 'outlined'}
                    onClick={() => setForm((f) => ({ ...f, decision: f.decision === d ? '' : d }))}
                    sx={{ fontWeight: 700 }}
                  />
                ))}
              </Stack>

              <TextField
                fullWidth size="small" multiline rows={2}
                label={form.decision === 'NON_COMPLIANT' ? 'وصف المخالفة *' : 'ملاحظات إضافية'}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                sx={{ '& fieldset': { borderRadius: 3 } }}
              />

              {form.decision === 'COMPLIANT' && (
                <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 700 }}>
                  ⓘ المطابقة تعتمد الإفراج المباشر للشحنة.
                </Typography>
              )}
              {form.decision === 'NEEDS_ANALYSIS' && (
                <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700 }}>
                  ⓘ بعد الحفظ ستُفتح نافذة تسجيل العينة لإرسالها للمختبر.
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInspectTarget(null)}>إلغاء</Button>
          <Button variant="contained" startIcon={<CheckCircleIcon />} disabled={saving || !form.decision} onClick={handleSaveInspection} sx={{ borderRadius: 2 }}>
            {saving ? 'جارٍ الحفظ…' : 'حفظ التفتيش'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة تسجيل العينة */}
      <Dialog open={sampleOpen} onClose={() => setSampleOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          تسجيل عينة
          <IconButton aria-label="إغلاق" onClick={() => setSampleOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <LockedRow label="رقم المعاملة" value={tasks.find((t) => t.id === sampleFor)?.manifest_number || '—'} />
            <TextField
              select fullWidth size="small" required label="نوع العينة"
              value={sampleForm.sample_type}
              onChange={(e) => setSampleForm((f) => ({ ...f, sample_type: e.target.value }))}
              sx={{ '& fieldset': { borderRadius: 3 } }}
            >
              <MenuItem value="غذائية">غذائية</MenuItem>
              <MenuItem value="مياه">مياه</MenuItem>
              <MenuItem value="سطح">سطح</MenuItem>
              <MenuItem value="أخرى">أخرى</MenuItem>
            </TextField>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth size="small" label="الكمية"
                value={sampleForm.quantity}
                onChange={(e) => setSampleForm((f) => ({ ...f, quantity: e.target.value }))}
                sx={{ '& fieldset': { borderRadius: 3 } }}
              />
              <TextField
                select size="small" label="الوحدة" value={sampleForm.quantity_unit}
                onChange={(e) => setSampleForm((f) => ({ ...f, quantity_unit: e.target.value }))}
                sx={{ minWidth: 120, '& fieldset': { borderRadius: 3 } }}
              >
                <MenuItem value="كجم">كجم</MenuItem>
                <MenuItem value="عبوة">عبوة</MenuItem>
                <MenuItem value="لتر">لتر</MenuItem>
              </TextField>
            </Stack>
            <Box sx={{ p: 1.25, borderRadius: 2.5, bgcolor: 'rgba(111,66,193,0.06)', border: '1px dashed rgba(111,66,193,0.35)' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#59359a' }}>
                سيتم توليد باركود فريد (FS-…) تلقائياً عند الحفظ، وتتحول الشحنة إلى «بانتظار نتائج المختبر».
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSampleOpen(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<ScienceIcon />} disabled={sampling} onClick={handleRegisterSample} sx={{ borderRadius: 2 }}>
            {sampling ? 'جارٍ التسجيل…' : 'حفظ وإرسال للمختبر'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

/* ============================ قطع فرعية ============================ */

const SectionTitle = ({ title }: { title: string }) => (
  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>{title}</Typography>
);

const TasksTable = ({
  tasks,
  onStart,
  showAllActions,
  onViewAll,
}: {
  tasks: FoodShipment[];
  onStart: (s: FoodShipment) => void;
  showAllActions?: boolean;
  onViewAll?: () => void;
}) => (
  <>
    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: '#f6f8fb' }}>
            <TableCell sx={{ fontWeight: 700 }}>رقم المعاملة</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>المستورد/المصدر</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>المنفذ</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>عينات مقترحة</TableCell>
            <TableCell align="left" sx={{ fontWeight: 700 }}>إجراء</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tasks.length === 0 && (
            <TableRow>
              <TableCell colSpan={5}>
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                  لا توجد مهام تفتيش معينة لك حالياً 🎉
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {tasks.map((s) => (
            <TableRow key={s.id} hover>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.manifest_number}</Typography>
                <Typography variant="caption" color="text.disabled">{fmtDate(s.arrival_date)}</Typography>
              </TableCell>
              <TableCell>{counterpartyOf(s)}</TableCell>
              <TableCell><Typography variant="caption">{s.port_name}</Typography></TableCell>
              <TableCell>{s.fee_preview?.samples ?? s.samples_required ?? 0}</TableCell>
              <TableCell align="left">
                <Button size="small" variant="contained" startIcon={<SearchIcon />} onClick={() => onStart(s)} sx={{ borderRadius: 2 }}>
                  بدء التفتيش
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    {!showAllActions && onViewAll && tasks.length > 0 && (
      <Button size="small" onClick={onViewAll} sx={{ mb: 3, fontWeight: 700 }}>عرض كل المهام ←</Button>
    )}
    {showAllActions && <Box sx={{ mb: 3 }} />}
  </>
);

const SummaryCell = ({ label, value }: { label: string; value: string }) => (
  <Grid item xs={12} sm={3}>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
  </Grid>
);

const Field = ({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) => (
  <TextField
    fullWidth
    size="small"
    type={type}
    label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    sx={{ '& fieldset': { borderRadius: 3 } }}
    InputLabelProps={type === 'date' ? { shrink: true } : undefined}
  />
);

const LockedRow = ({ label, value }: { label: string; value: string }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
  </Stack>
);

export default InspectorDashboardPage;
