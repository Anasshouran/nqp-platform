import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
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
import Divider from '@mui/material/Divider';
import Menu from '@mui/material/Menu';
import Drawer from '@mui/material/Drawer';
import Tooltip from '@mui/material/Tooltip';
import useMediaQuery from '@mui/material/useMediaQuery';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import RateReviewIcon from '@mui/icons-material/RateReview';
import GavelIcon from '@mui/icons-material/Gavel';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SearchIcon from '@mui/icons-material/Search';
import ScienceIcon from '@mui/icons-material/Science';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import BlockIcon from '@mui/icons-material/Block';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import PaymentsIcon from '@mui/icons-material/Payments';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import GroupsIcon from '@mui/icons-material/Groups';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  assignInspector,
  decideShipment,
  getDeptHeadDashboard,
  getInspectorsWorkload,
  getInspections,
  getShipments,
  reviewInspection,
} from '../../api/endpoints/food';
import type {
  DeptHeadDashboard,
  FoodInspection,
  FoodShipment,
  InspectorWorkload,
} from '../../types/food';
import type { AxiosError } from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { useDispatch } from 'react-redux';
import { logout as logoutApi } from '../../api/endpoints/auth';
import { logout } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store/store';
import { notifyError, notifySuccess } from '../../utils/toast';

const PERIODS = [
  { value: 'DAY', label: 'اليوم' },
  { value: 'WEEK', label: 'الأسبوع' },
  { value: 'MONTH', label: 'الشهر' },
  { value: 'QUARTER', label: 'ربع السنة' },
  { value: 'YEAR', label: 'السنة' },
];

const SHIPMENT_STATUS_META: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'مسودة', color: '#9e9e9e' },
  RECEIVED: { label: 'مستلمة', color: '#0d6efd' },
  FEES_DUE: { label: 'مستحقة الرسوم', color: '#6c757d' },
  AWAITING_INSPECTION: { label: 'بانتظار التفتيش', color: '#0dcaf0' },
  UNDER_INSPECTION: { label: 'قيد التفتيش', color: '#0d6efd' },
  AWAITING_LAB_RESULTS: { label: 'في المختبر', color: '#6f42c1' },
  AWAITING_DECISION: { label: 'قيد المراجعة', color: '#f0ad4e' },
  RELEASED: { label: 'مفرج عنها', color: '#1d7a54' },
  CONDITIONAL_RELEASE: { label: 'إفراج مشروط', color: '#20c997' },
  REJECTED: { label: 'مرفوضة', color: '#c63a3a' },
  HOLD: { label: 'محتجزة', color: '#fd7e14' },
  DESTROYED: { label: 'إتلاف', color: '#842029' },
  RE_EXPORT: { label: 'إعادة تصدير', color: '#664d03' },
};

const SUPERVISOR_META: Record<string, { label: string; color: 'default' | 'success' | 'warning' }> = {
  PENDING: { label: 'بانتظار المراجعة', color: 'warning' },
  APPROVED: { label: 'معتمد', color: 'success' },
  RETURNED: { label: 'مُرجع لإعادة التفتيش', color: 'default' },
};

const DECISION_LABELS: Record<string, string> = {
  COMPLIANT: '🟢 إفراج نهائي',
  CONDITIONAL_RELEASE: '🟢 إفراج مشروط',
  HOLD: '🟠 احتجاز مؤقت',
  RE_EXPORT: '🔄 إعادة تصدير',
  REJECTED: '🔴 رفض الشحنة',
  DESTROY: '🔴 رفض وإتلاف',
};

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

const fmtTime = (d: Date) =>
  d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

const counterpartyOf = (r: FoodShipment) =>
  (r.shipment_type === 'IMPORT' ? r.supplier_name : r.exporter_name) || r.supplier_name || '—';

const fmtSdg = (n: number) => new Intl.NumberFormat('ar-EG').format(n);

const SectionHeadDashboardPage = () => {
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState('MONTH');
  const [dash, setDash] = useState<DeptHeadDashboard | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const periodRef = useRef(period);

  // نوافذ حوارية: إسناد / مراجعة / قرار
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTasks, setAssignTasks] = useState<FoodShipment[]>([]);
  const [inspectors, setInspectors] = useState<InspectorWorkload[]>([]);
  const [assignShipment, setAssignShipment] = useState('');
  const [selectedInspector, setSelectedInspector] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [reviewListOpen, setReviewListOpen] = useState(false);
  const [pendingReviews, setPendingReviews] = useState<FoodInspection[]>([]);
  const [reviewTarget, setReviewTarget] = useState<FoodInspection | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'RETURN' | ''>('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const [decideFor, setDecideFor] = useState<FoodShipment | null>(null);
  const [finalDecision, setFinalDecision] = useState('');
  const [decideReason, setDecideReason] = useState('');
  const [deciding, setDeciding] = useState(false);

  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const isDesktop = useMediaQuery('(min-width: 1000px)');

  const loadDashboard = useCallback(async (p: string) => {
    try {
      const res = await getDeptHeadDashboard(p);
      setDash(res.data.data);
      setLastUpdated(new Date());
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر تحميل لوحة رئيس القسم'));
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    periodRef.current = period;
    setLoadingData(true);
    loadDashboard(period);
  }, [period, loadDashboard]);

  // تحديث تلقائي كل 60 ثانية
  useEffect(() => {
    const t = setInterval(() => loadDashboard(periodRef.current), 60_000);
    return () => clearInterval(t);
  }, [loadDashboard]);

  const loadInspectors = useCallback(async () => {
    try {
      const res = await getInspectorsWorkload();
      setInspectors(res.data.data);
    } catch {
      /* تجاهل */
    }
  }, []);

  const openAssignDialog = async () => {
    setAssignOpen(true);
    setAssignShipment('');
    setSelectedInspector('');
    try {
      const res = await getShipments({ status: 'AWAITING_INSPECTION', page_size: 100 });
      setAssignTasks(res.data.data.results);
      await loadInspectors();
    } catch {
      notifyError('تعذر تحميل قائمة المهام');
    }
  };

  const handleAssign = async () => {
    if (!assignShipment || !selectedInspector) {
      notifyError('اختر المعاملة والمفتش');
      return;
    }
    setAssigning(true);
    try {
      await assignInspector(assignShipment, selectedInspector);
      notifySuccess('أُسندت المهمة للمفتش بنجاح');
      setAssignOpen(false);
      await loadDashboard(periodRef.current);
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر إسناد المهمة'));
    } finally {
      setAssigning(false);
    }
  };

  const openReviewList = async () => {
    setReviewListOpen(true);
    try {
      const res = await getInspections({ supervisor_status: 'PENDING', page_size: 100 });
      setPendingReviews(res.data.data.results);
    } catch {
      notifyError('تعذر تحميل التقارير المعلقة');
    }
  };

  const handleSaveReview = async () => {
    if (!reviewTarget || !reviewAction) {
      notifyError('اختر الإجراء: اعتماد أو إرجاع');
      return;
    }
    if (reviewAction === 'RETURN' && !reviewNotes.trim()) {
      notifyError('الإرجاع لإعادة التفتيش يتطلب ملاحظات');
      return;
    }
    setReviewing(true);
    try {
      await reviewInspection(reviewTarget.id, reviewAction, reviewNotes.trim() || undefined);
      notifySuccess(reviewAction === 'APPROVE' ? 'تم اعتماد تقرير التفتيش' : 'أُعيد التقرير للمفتش مع الملاحظات');
      setReviewTarget(null);
      setReviewAction('');
      setReviewNotes('');
      setReviewListOpen(false);
      await loadDashboard(periodRef.current);
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر حفظ المراجعة'));
    } finally {
      setReviewing(false);
    }
  };

  const handleSaveDecision = async () => {
    if (!decideFor || !finalDecision) {
      notifyError('اختر القرار الفني');
      return;
    }
    if (!decideReason.trim()) {
      notifyError('تبرير القرار إلزامي');
      return;
    }
    setDeciding(true);
    try {
      const res = await decideShipment(decideFor.id, finalDecision, decideReason.trim());
      notifySuccess(`صدر القرار — شهادة رقم ${res.data.data.certificate_number}`);
      setDecideFor(null);
      setFinalDecision('');
      setDecideReason('');
      await loadDashboard(periodRef.current);
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر حفظ القرار'));
    } finally {
      setDeciding(false);
    }
  };

  const openDecisionDialog = (shipmentId: string) => {
    setFinalDecision('');
    setDecideReason('');
    setDecideFor({
      id: shipmentId,
      manifest_number: dash?.pending_decisions.find((p) => p.id === shipmentId)?.manifest_number || '',
    } as FoodShipment);
  };

  const statusChartData = dash
    ? Object.entries(dash.analytics_by_status)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: SHIPMENT_STATUS_META[k]?.label || k, value: v }))
        .sort((a, b) => b.value - a.value)
    : [];

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
      <Tooltip title={collapsed ? 'لوحة رئيس القسم' : ''} placement="left-start">
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<DashboardIcon />}
          sx={{
            justifyContent: collapsed ? 'center' : 'space-between',
            px: collapsed ? 0 : 1.25,
            minHeight: 42,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            fontSize: 13.5,
            '& .MuiButton-startIcon': { ml: collapsed ? 0 : -0.5 },
          }}
        >
          {!collapsed && <span>لوحة رئيس القسم</span>}
        </Button>
      </Tooltip>
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
              <DashboardIcon fontSize="small" />
            </Box>
            {!navCollapsed && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>رئيس القسم</Typography>
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
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 18, sm: 22 } }} noWrap>لوحة رئيس القسم</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                لوحة التحكم التشغيلية — رقابة الأغذية · آخر تحديث {fmtTime(lastUpdated)} · تحديث تلقائي كل دقيقة
              </Typography>
            </Box>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={period}
              onChange={(_, v) => v && setPeriod(v)}
              sx={{ '& .MuiToggleButton-root': { fontWeight: 700, borderRadius: '10px !important', px: 1.5 } }}
            >
              {PERIODS.map((p) => (
                <ToggleButton key={p.value} value={p.value}>
                  {p.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Chip
              size="small"
              color={loadingData ? 'default' : 'success'}
              icon={loadingData ? <WarningAmberIcon /> : <CheckCircleIcon />}
              label={loadingData ? 'جارٍ التحديث…' : 'محدَث'}
              variant="outlined"
            />
            <Tooltip title="الملف الشخصي">
              <IconButton aria-label="قائمة المستخدم" onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ p: 0.5, borderRadius: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 15, fontWeight: 700 }}>
                  {(user?.full_name || 'ر').charAt(0)}
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
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{user?.full_name || 'رئيس القسم'}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{user?.email || 'Food Control Section Head'}</Typography>
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
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 1.75, md: 2.5 }, maxWidth: 1500, width: '100%', mx: 'auto', pb: 4 }}>
      {dash && (
        <>
          {/* ===== الصف الأول: مؤشرات رئيسية ===== */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <KpiCard title="الشحنات المسجلة" value={dash.kpis.shipments_today} sub={period === 'DAY' ? 'اليوم' : 'خلال الفترة'} icon={<Inventory2Icon />} accent="#0d6efd" />
            <KpiCard title="التفتيشات المنجزة" value={dash.kpis.inspections_today} sub={period === 'DAY' ? 'اليوم' : 'خلال الفترة'} icon={<SearchIcon />} accent="#b45309" />
            <KpiCard title="عينات للمختبر" value={dash.kpis.samples_lab} sub="خلال الفترة" icon={<ScienceIcon />} accent="#6f42c1" />
            <KpiCard title="قيد القرار" value={dash.kpis.pending_decision} sub="تحتاج مراجعتك" icon={<HourglassTopIcon />} accent="#c63a3a" onClick={() => undefined} />
          </Grid>

          {/* ===== الصف الثاني: الحالة التشغيلية ===== */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <KpiCard title="مفرج عنها" value={dash.status_cards.released} sub="خلال الفترة" icon={<TaskAltIcon />} accent="#1d7a54" />
            <KpiCard title="مرفوضة" value={dash.status_cards.rejected} sub="خلال الفترة" icon={<BlockIcon />} accent="#c63a3a" />
            <KpiCard title="محتجزة" value={dash.status_cards.holds} sub="قيد المعالجة" icon={<PauseCircleIcon />} accent="#fd7e14" />
            <KpiCard title="مخالفات مفتوحة" value={dash.status_cards.violations_open} sub="غير منتهية" icon={<ReportProblemIcon />} accent="#f0ad4e" />
          </Grid>

          {/* ===== التنبيهات المشتقة ===== */}
          {dash.alerts.length > 0 && (
            <Paper elevation={0} sx={{ p: 1.25, borderRadius: 3, border: '1px solid rgba(198,58,58,.35)', bgcolor: 'rgba(198,58,58,.04)', mb: 3 }}>
              <Stack spacing={0.75}>
                {dash.alerts.map((a, idx) => (
                  <Stack key={idx} direction="row" spacing={1} alignItems="center">
                    <Typography sx={{ fontSize: 14 }}>{a.level === 'critical' ? '🔴' : '⚠️'}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: a.level === 'critical' ? 800 : 600 }}>
                      {a.text}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )}

          {/* ===== قسم 1: مؤشرات تفصيلية ===== */}
          <SectionTitle title="📈 مؤشرات الأداء الرئيسية" action={
            <Button size="small" startIcon={<RateReviewIcon />} onClick={openReviewList} sx={{ fontWeight: 700 }}>
              مراجعة تقارير التفتيش ({dash.details.violations + dash.inspection_board.late})
            </Button>
          } />
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Grid container spacing={1.5}>
              <DetailCell label="إجمالي الشحنات" value={fmtSdg(dash.details.total_shipments)} />
              <DetailCell label="الشحنات المفحوصة" value={fmtSdg(dash.details.inspected)} />
              <DetailCell label="نسبة الإفراج" value={`${dash.details.released_pct}%`} good />
              <DetailCell label="نسبة الرفض" value={`${dash.details.rejected_pct}%`} bad={dash.details.rejected_pct > 10} />
              <DetailCell label="متوسط زمن الإفراج" value={dash.details.avg_release_hours !== null ? `${dash.details.avg_release_hours} ساعة` : '—'} />
              <DetailCell label="عدد العينات" value={fmtSdg(dash.details.samples_count)} />
              <DetailCell label="نتائج غير مطابقة" value={fmtSdg(dash.details.non_compliant_results)} bad={dash.details.non_compliant_results > 0} />
              <DetailCell label="شهادات قرار صادرة" value={fmtSdg(dash.details.certificates_issued)} />
            </Grid>
          </Paper>

          {/* ===== قسم 2: متابعة الشحنات + قسم 3: لوحة التفتيش ===== */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} lg={7}>
              <SectionTitle title="📦 متابعة الشحنات" />
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f6f8fb' }}>
                      <TableCell sx={{ fontWeight: 700 }}>المعاملة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>المستورد/المصدر</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>المنتجات</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>المنفذ</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dash.recent_shipments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                            لا توجد معاملات
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {dash.recent_shipments.map((s) => (
                      <TableRow key={s.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.manifest_number}</Typography>
                          {s.customs_number !== '—' && (
                            <Typography variant="caption" color="text.disabled">جمركي: {s.customs_number}</Typography>
                          )}
                        </TableCell>
                        <TableCell>{s.supplier_name}</TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ display: 'block', maxWidth: 180 }}>
                            {s.products}
                          </Typography>
                        </TableCell>
                        <TableCell><Typography variant="caption">{s.port_name}</Typography></TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={SHIPMENT_STATUS_META[s.status]?.label || s.status}
                            sx={{
                              bgcolor: `${SHIPMENT_STATUS_META[s.status]?.color || '#9e9e9e'}1a`,
                              color: SHIPMENT_STATUS_META[s.status]?.color || '#616161',
                              fontWeight: 700,
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid item xs={12} lg={5}>
              <SectionTitle title="🔍 لوحة التفتيش" action={
                <Button size="small" startIcon={<PersonAddAlt1Icon />} onClick={openAssignDialog} sx={{ fontWeight: 700 }}>
                  توزيع المهام
                </Button>
              } />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                <Grid container spacing={1.5}>
                  <DetailCell label="مهام الفترة" value={fmtSdg(dash.inspection_board.tasks_today)} />
                  <DetailCell label="مكتملة" value={fmtSdg(dash.inspection_board.completed)} good />
                  <DetailCell label="قيد التنفيذ" value={fmtSdg(dash.inspection_board.in_progress)} />
                  <DetailCell label="متأخرة" value={fmtSdg(dash.inspection_board.late)} bad={dash.inspection_board.late > 0} />
                </Grid>
              </Paper>
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f6f8fb' }}>
                      <TableCell sx={{ fontWeight: 700 }}>المفتش</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>مهام مفتوحة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>أنجز اليوم</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>إجمالي</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dash.inspection_board.per_inspector.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                            لا يوجد مفتشون
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {dash.inspection_board.per_inspector.map((i) => (
                      <TableRow key={i.id} hover>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{i.full_name}</Typography></TableCell>
                        <TableCell>{i.open_tasks}</TableCell>
                        <TableCell>{i.completed_today}</TableCell>
                        <TableCell>{i.total_inspections}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>

          {/* ===== قسم 4: العينات + قسم 6: القرارات المعلقة ===== */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <SectionTitle title="🧪 العينات والمختبر" />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                <Stack spacing={1.25}>
                  <SampleRow icon="🧪" label="عينات خلال الفترة" value={dash.samples_board.collected} />
                  <SampleRow icon="🔬" label="قيد التحليل" value={dash.samples_board.under_analysis} />
                  <SampleRow icon="✅" label="نتائج جاهزة" value={dash.samples_board.results_ready} good />
                  {dash.samples_board.late_sla > 0 ? (
                    <SampleRow icon="⏰" label={`تنبيه: ${dash.samples_board.late_sla} عينة تجاوزت مهلة الـ SLA (48 ساعة)`} value={dash.samples_board.late_sla} danger />
                  ) : (
                    <SampleRow icon="⏰" label="لا عينات متأخرة عن SLA" value={0} good />
                  )}
                </Stack>
              </Paper>

              {/* ===== قسم 12: حالة الفريق ===== */}
              <SectionTitle title="👥 حالة فريق القسم" />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={1.5}>
                  <DetailCell label="المفتشون" value={fmtSdg(dash.staff.inspectors)} />
                  <DetailCell label="مشغولون (≥3 مهام)" value={fmtSdg(dash.staff.busy)} />
                  <DetailCell label="متاحون" value={fmtSdg(dash.staff.available)} good />
                  <DetailCell label="بلا مهام" value={fmtSdg(dash.staff.idle)} />
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12} md={7}>
              <SectionTitle title="⏳ القرارات التي تحتاج مراجعة" />
              <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                {dash.pending_decisions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                    لا توجد شحنات بانتظار القرار 🎉
                  </Typography>
                ) : (
                  <List disablePadding>
                    {dash.pending_decisions.map((p, idx) => (
                      <ListItem
                        key={p.id}
                        divider={idx < dash.pending_decisions.length - 1}
                        secondaryAction={
                          <Button size="small" variant="contained" startIcon={<GavelIcon />}
                            onClick={() => openDecisionDialog(p.id)}
                            sx={{ borderRadius: 2 }}>
                            اتخاذ قرار
                          </Button>
                        }
                      >
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{p.manifest_number}</Typography>
                              <Chip
                                size="small"
                                label={`توصية: ${p.recommendation}`}
                                color={p.recommendation === 'رفض' ? 'error' : 'warning'}
                                variant="outlined"
                              />
                            </Stack>
                          }
                          secondary={p.supplier_name}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>

              {/* ===== قسم 8: التحليلات ===== */}
              <SectionTitle title="📊 الشحنات حسب الحالة" />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ height: 240, direction: 'ltr' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} fontSize={11} />
                      <YAxis type="category" dataKey="name" width={110} fontSize={11} orientation="right" />
                      <ChartTooltip />
                      <Bar dataKey="value" fill="#b45309" radius={[0, 6, 6, 0]} barSize={18} name="عدد الشحنات" />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* ===== أقسام 9+10: الرسوم والشهادات ===== */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <SectionTitle title="💰 الرسوم والإيرادات (الشهر الحالي)" />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Stack spacing={1}>
                  <FinanceRow label="رسوم التفتيش" value={dash.finance.inspection_fees} />
                  <FinanceRow label="رسوم المختبر والعينات" value={dash.finance.lab_fees} />
                  <FinanceRow label="رسوم الشهادات" value={dash.finance.certificate_fees} />
                  <Divider />
                  <FinanceRow label="الإجمالي" value={dash.finance.total} bold />
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                  <PaymentsIcon fontSize="small" sx={{ color: '#1d7a54' }} />
                  <Typography variant="caption" color="text.secondary">جميع المبالغ بالجنيه السوداني (SDG) — فواتير محصّلة فقط</Typography>
                </Stack>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <SectionTitle title="📜 شهادات القرار" />
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={1.5}>
                  <DetailCell label="صادرة اليوم" value={fmtSdg(dash.certificates.issued_today)} />
                  <DetailCell label="خلال الفترة" value={fmtSdg(dash.certificates.total_period)} />
                </Grid>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5 }}>
                  <WorkspacePremiumIcon fontSize="small" sx={{ color: '#b45309' }} />
                  <Typography variant="caption" color="text.secondary">
                    كل قرار نهائي يُصدر تلقائيًا شهادة FCER-… قابلة للتحقق
                  </Typography>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

        </Box>
      </Box>

      {/* ===== نافذة توزيع المهام ===== */}
      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          توزيع مهام التفتيش
          <IconButton aria-label="إغلاق" onClick={() => setAssignOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <TextField
              select fullWidth size="small" required
              label="المعاملة (بانتظار التفتيش)"
              value={assignShipment}
              onChange={(e) => setAssignShipment(e.target.value)}
              sx={{ '& fieldset': { borderRadius: 3 } }}
            >
              {assignTasks.length === 0 && <MenuItem value="" disabled>لا توجد مهام معلقة</MenuItem>}
              {assignTasks.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.manifest_number} — {counterpartyOf(s)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select fullWidth size="small" required
              label="اختر المفتش (مرتب حسب عبء العمل)"
              value={selectedInspector}
              onChange={(e) => setSelectedInspector(e.target.value)}
              sx={{ '& fieldset': { borderRadius: 3 } }}
            >
              {[...inspectors]
                .sort((a, b) => a.open_tasks - b.open_tasks)
                .filter((i) => i.status !== 'UNAVAILABLE')
                .map((i) => (
                  <MenuItem key={i.id} value={i.id}>
                    {i.full_name} — مهام مفتوحة: {i.open_tasks}
                  </MenuItem>
                ))}
            </TextField>
            <Box sx={{ p: 1.25, borderRadius: 2.5, bgcolor: 'rgba(180,83,9,0.06)', border: '1px dashed rgba(180,83,9,0.35)' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#8a4b06' }}>
                سيصل المفتش إشعارًا فوريًا بالإسناد وتُسجَّل العملية في سجل التدقيق.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAssignOpen(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<PersonAddAlt1Icon />} disabled={assigning || !assignShipment || !selectedInspector} onClick={handleAssign} sx={{ borderRadius: 2 }}>
            {assigning ? 'جارٍ الإسناد…' : 'تأكيد التعيين'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== نافذة قائمة المراجعة ===== */}
      <Dialog open={reviewListOpen} onClose={() => setReviewListOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          تقارير التفتيش بانتظار المراجعة ({pendingReviews.length})
          <IconButton aria-label="إغلاق" onClick={() => setReviewListOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {pendingReviews.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
              لا توجد تقارير معلقة 🎉
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>المعاملة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المفتش</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>النتيجة</TableCell>
                    <TableCell align="left" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingReviews.map((i) => (
                    <TableRow key={i.id} hover>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{i.shipment_manifest}</Typography></TableCell>
                      <TableCell>{i.inspector_name || '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined"
                          label={i.decision === 'COMPLIANT' ? '✅ مطابق' : i.decision === 'NON_COMPLIANT' ? '❌ غير مطابق' : '🔬 يحتاج تحليل'}
                          color={i.decision === 'COMPLIANT' ? 'success' : i.decision === 'NON_COMPLIANT' ? 'error' : 'warning'}
                        />
                      </TableCell>
                      <TableCell align="left">
                        <Button size="small" variant="contained" startIcon={<RateReviewIcon />}
                          onClick={() => { setReviewTarget(i); setReviewAction(''); setReviewNotes(''); }}
                          sx={{ borderRadius: 2 }}>
                          مراجعة
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== نافذة مراجعة تقرير ===== */}
      <Dialog open={Boolean(reviewTarget)} onClose={() => setReviewTarget(null)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          مراجعة تفتيش — {reviewTarget?.shipment_manifest}
          <IconButton aria-label="إغلاق" onClick={() => setReviewTarget(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {reviewTarget && (
            <Stack spacing={2}>
              <Grid container spacing={1.5}>
                <SummaryCell label="المفتش" value={reviewTarget.inspector_name || '—'} />
                <SummaryCell label="تاريخ التفتيش" value={fmtDate(reviewTarget.inspected_at)} />
                <SummaryCell label="درجة الحرارة" value={reviewTarget.temperature !== null ? `${reviewTarget.temperature}°م` : '—'} />
                <SummaryCell label="عبوات سليمة / تالفة" value={`${reviewTarget.sound_count} / ${reviewTarget.damaged_count}`} />
                <SummaryCell label="حالة الحاوية" value={reviewTarget.container_condition || '—'} />
                <SummaryCell label="رقم التشغيلة" value={reviewTarget.batch_number || '—'} />
              </Grid>
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: '#f6f8fb', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2">
                  <strong>نتيجة المفتش:</strong>{' '}
                  {SUPERVISOR_META[reviewTarget.decision]?.label || reviewTarget.decision}
                </Typography>
                {reviewTarget.notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    ملاحظات المفتش: {reviewTarget.notes}
                  </Typography>
                )}
              </Paper>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>إجراء رئيس القسم *</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  label={`✅ اعتماد — ${DECISION_LABELS[
                    reviewTarget.decision === 'COMPLIANT'
                      ? 'RELEASE'
                      : reviewTarget.decision === 'NON_COMPLIANT'
                        ? 'REJECT'
                        : 'HOLD'
                  ]}`}
                  color={reviewAction === 'APPROVE' ? 'success' : 'default'}
                  variant={reviewAction === 'APPROVE' ? 'filled' : 'outlined'}
                  onClick={() => setReviewAction('APPROVE')}
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  label="🔄 إرجاع لإعادة التفتيش"
                  color={reviewAction === 'RETURN' ? 'warning' : 'default'}
                  variant={reviewAction === 'RETURN' ? 'filled' : 'outlined'}
                  onClick={() => setReviewAction('RETURN')}
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
              <TextField
                fullWidth size="small" multiline rows={3}
                label={reviewAction === 'RETURN' ? 'سبب الإرجاع (إلزامي)' : 'ملاحظات إشرافية (اختياري)'}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                sx={{ '& fieldset': { borderRadius: 3 } }}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReviewTarget(null)}>إلغاء</Button>
          <Button variant="contained" startIcon={<CheckCircleIcon />} disabled={reviewing || !reviewAction} onClick={handleSaveReview} sx={{ borderRadius: 2 }}>
            {reviewing ? 'جارٍ الحفظ…' : 'حفظ المراجعة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== نافذة القرار الفني ===== */}
      <Dialog open={Boolean(decideFor)} onClose={() => setDecideFor(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          اتخاذ القرار الفني
          <IconButton aria-label="إغلاق" onClick={() => setDecideFor(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Box sx={{ p: 1.25, borderRadius: 2.5, bgcolor: '#f6f8fb', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2"><strong>المعاملة:</strong> {decideFor?.manifest_number}</Typography>
              {decideFor && dash && (
                <Typography variant="caption" color="text.secondary">
                  توصية المفتش: {dash.pending_decisions.find((p) => p.id === decideFor.id)?.recommendation}
                </Typography>
              )}
            </Box>
            <TextField select fullWidth size="small" required label="القرار النهائي"
              value={finalDecision} onChange={(e) => setFinalDecision(e.target.value)}
              sx={{ '& fieldset': { borderRadius: 3 } }}
            >
              {Object.entries(DECISION_LABELS).map(([v, l]) => (
                <MenuItem key={v} value={v}>{l}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth size="small" multiline rows={3} required
              label="تبرير القرار (إلزامي ويُسجل في سجل التدقيق)"
              value={decideReason}
              onChange={(e) => setDecideReason(e.target.value)}
              sx={{ '& fieldset': { borderRadius: 3 } }}
            />
            <Box sx={{ p: 1.25, borderRadius: 2.5, bgcolor: 'rgba(25,135,84,0.05)', border: '1px dashed rgba(25,135,84,0.35)' }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#14663c' }}>
                عند الإفراج تُصدر شهادة قرار تلقائيًا؛ عند الرفض/الإتلاف يُشعَر الموظف المسؤول بإشعار فوري.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDecideFor(null)}>إلغاء</Button>
          <Button variant="contained" startIcon={<GavelIcon />} disabled={deciding || !finalDecision || !decideReason.trim()} onClick={handleSaveDecision} sx={{ borderRadius: 2 }}>
            {deciding ? 'جارٍ الحفظ…' : 'حفظ القرار'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

/* ===================== عناصر مساعدة ===================== */

const SectionTitle = ({ title, action }: { title: string; action?: ReactNode }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
    {action}
  </Stack>
);

const KpiCard = ({
  title, value, sub, icon, accent, onClick,
}: {
  title: string; value: number; sub: string; icon?: ReactNode; accent?: string; onClick?: () => void;
}) => (
  <Grid item xs={6} sm={4} md={3}>
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        cursor: onClick ? 'pointer' : 'default',
        height: '100%',
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
        <Avatar variant="rounded" sx={{ bgcolor: `${accent}14`, color: accent, borderRadius: 2.5 }}>
          {icon}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{title}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{value}</Typography>
          <Typography variant="caption" color="text.disabled">{sub}</Typography>
        </Box>
      </CardContent>
    </Card>
  </Grid>
);

const DetailCell = ({ label, value, good, bad }: { label: string; value: string | number; good?: boolean; bad?: boolean }) => (
  <Grid item xs={6} sm={4} md={3}>
    <Box sx={{ p: 1.25, borderRadius: 2.5, bgcolor: '#f8fafc', border: '1px solid', borderColor: 'divider' }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography
        variant="body1"
        sx={{ fontWeight: 700, color: bad ? '#c63a3a' : good ? '#1d7a54' : 'text.primary' }}
      >
        {value}
      </Typography>
    </Box>
  </Grid>
);

const SummaryCell = ({ label, value }: { label: string; value: string }) => (
  <Grid item xs={6} sm={4}>
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
    </Box>
  </Grid>
);

const SampleRow = ({ icon, label, value, good, danger }: { icon: string; label: string; value: number; good?: boolean; danger?: boolean }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography sx={{ fontSize: 16 }}>{icon}</Typography>
      <Typography variant="body2" sx={{ fontWeight: danger ? 800 : 600, color: danger ? '#b02a37' : undefined }}>
        {label}
      </Typography>
    </Stack>
    <Chip
      size="small"
      label={value}
      color={danger ? 'error' : good ? 'success' : 'default'}
      variant="outlined"
      sx={{ fontWeight: 700 }}
    />
  </Stack>
);

const FinanceRow = ({ label, value, bold }: { label: string; value: number; bold?: boolean }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="body2" sx={{ fontWeight: bold ? 900 : 500 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: bold ? 900 : 700, color: bold ? '#1d7a54' : undefined }} dir="ltr">
      {fmtSdg(value)} SDG
    </Typography>
  </Stack>
);

export default SectionHeadDashboardPage;
