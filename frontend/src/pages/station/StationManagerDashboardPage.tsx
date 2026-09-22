import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import TextField from '@mui/material/TextField';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
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
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useDispatch } from 'react-redux';
import HomeIcon from '@mui/icons-material/Home';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SendIcon from '@mui/icons-material/Send';
import DescriptionIcon from '@mui/icons-material/Description';
import EngineeringIcon from '@mui/icons-material/Engineering';
import ScienceIcon from '@mui/icons-material/Science';
import VerifiedIcon from '@mui/icons-material/Verified';
import PaymentsIcon from '@mui/icons-material/Payments';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import LanguageIcon from '@mui/icons-material/Language';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoIcon from '@mui/icons-material/Info';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import QrCodeIcon from '@mui/icons-material/QrCode';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { logout } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store/store';
import { logout as logoutApi } from '../../api/endpoints/auth';
import { useAuth } from '../../hooks/useAuth';
import { notifySuccess, notifyError } from '../../utils/toast';
import {
  stationRequests,
  inspectors,
  initialAssignments,
  initialLabOrders,
  stationCritical,
  stationActivities,
  stationAlerts,
  stationFinances,
  stationReports,
  stationStatusMeta,
  labOrderStatusOrder,
  analysisTypes,
  analysisReasons,
} from './stationManagerData';
import type {
  StationRequest,
  Inspector,
  InspectionAssignment,
  LabOrder,
  LabOrderStatus,
  StationStatus,
  DecisionKind,
  Certificate,
} from './stationManagerData';

const drawerWidth = 258;

const SIDEBAR_ITEMS = [
  { key: 'home', label: 'الرئيسية', icon: <HomeIcon /> },
  { key: 'imports', label: 'الوارد', icon: <MoveToInboxIcon /> },
  { key: 'exports', label: 'الصادر', icon: <SendIcon /> },
  { key: 'requests', label: 'الطلبات', icon: <DescriptionIcon /> },
  { key: 'inspectors', label: 'المفتشون', icon: <EngineeringIcon /> },
  { key: 'lab', label: 'المعمل', icon: <ScienceIcon /> },
  { key: 'certificates', label: 'الشهادات', icon: <VerifiedIcon /> },
  { key: 'finance', label: 'المالية', icon: <PaymentsIcon /> },
  { key: 'reports', label: 'التقارير', icon: <AssessmentIcon /> },
  { key: 'alerts', label: 'التنبيهات', icon: <NotificationsIcon /> },
  { key: 'settings', label: 'الإعدادات', icon: <SettingsIcon /> },
];

const StationManagerDashboardPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'));
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('home');
  const [lang, setLang] = useState<'AR' | 'EN'>('AR');
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notifAnchor, setNotifAnchor] = useState<null | HTMLElement>(null);

  const [reqStatus, setReqStatus] = useState<Record<string, StationStatus>>(() =>
    Object.fromEntries(stationRequests.map((r) => [r.number, r.status])),
  );
  const [assignments, setAssignments] = useState<InspectionAssignment[]>(initialAssignments);
  const [labOrders, setLabOrders] = useState<LabOrder[]>(initialLabOrders);
  const [decisions, setDecisions] = useState<Record<string, { kind: DecisionKind; notes: string }>>({});
  const [certificates, setCertificates] = useState<Certificate[]>([
    {
      id: 'cert1',
      number: 'HC-2026-00121',
      requestNumber: 'IMP-2026-00121',
      issueDate: '11/08/2026',
      issuedBy: 'م. عبد الرحمن صالح',
      qrRef: 'QR-7F3A-9C2E',
      hash: 'sha256:9f8c2a…41e7',
      verificationUrl: 'https://verify.nqp.gov.sd/hc-2026-00121',
      type: 'IMPORT',
    },
  ]);

  const [reviewTarget, setReviewTarget] = useState<StationRequest | null>(null);
  const [assignTarget, setAssignTarget] = useState<StationRequest | null>(null);
  const [labTarget, setLabTarget] = useState<StationRequest | null>(null);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [decisionReq, setDecisionReq] = useState<StationRequest | null>(null);
  const [certRequest, setCertRequest] = useState<StationRequest | null>(null);

  const [assignForm, setAssignForm] = useState({ inspectorId: '', priority: 'normal', dueAt: '14/08/2026', notes: '' });
  const [labForm, setLabForm] = useState({ types: ['كيميائي'] as string[], reason: analysisReasons[0], samples: 0 });
  const [decisionForm, setDecisionForm] = useState<{ kind: DecisionKind; notes: string }>({ kind: 'APPROVE', notes: '' });

  const stationName = 'بورتسودان البحري';
  const managerName = user?.full_name || 'م. عبد الرحمن صالح';
  const firstName = managerName.split(' ')[0];

  const handleLogout = async () => {
    setUserMenuAnchor(null);
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await logoutApi(refreshToken);
      } catch {
        // ignore
      }
    }
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const getStatus = (r: StationRequest) => reqStatus[r.number] ?? r.status;
  const statusOf = getStatus;

  const counts = useMemo(() => {
    const list = Object.values(reqStatus);
    return {
      review: list.filter((s) => s === 'PENDING_REVIEW').length,
      inspection: list.filter((s) => s === 'UNDER_INSPECTION').length,
      lab: list.filter((s) => s === 'IN_LAB').length,
      decision: list.filter((s) => s === 'READY_DECISION').length,
      approved: list.filter((s) => s === 'APPROVED').length,
    };
  }, [reqStatus]);

  const byStatus = (s: StationStatus) => stationRequests.filter((r) => statusOf(r) === s);
  const byType = (t: 'IMPORT' | 'EXPORT') => stationRequests.filter((r) => r.type === t);

  const canIssueLabOrder = (r: StationRequest) => r.financialStatus === 'PAID' || r.financialStatus === 'WAIVED';
  const canDecide = (r: StationRequest) => statusOf(r) === 'READY_DECISION';
  const canCertify = (r: StationRequest) => statusOf(r) === 'APPROVED';

  const openReview = (r: StationRequest) => {
    setReviewTarget(r);
  };

  const openAssign = (r: StationRequest) => {
    setAssignTarget(r);
    setAssignForm({ inspectorId: '', priority: 'normal', dueAt: '14/08/2026', notes: '' });
  };

  const openLab = (r: StationRequest) => {
    setLabTarget(r);
    setLabForm({ types: ['كيميائي'], reason: analysisReasons[0], samples: r.itemsCount * 3 });
  };

  const openDecide = (r?: StationRequest) => {
    const target = r ?? stationRequests.find((x) => statusOf(x) === 'READY_DECISION') ?? null;
    if (!target) {
      notifyError('لا توجد طلبات جاهزة للقرار حالياً');
      return;
    }
    setDecisionReq(target);
    setDecisionForm({ kind: 'APPROVE', notes: '' });
    setDecisionOpen(true);
  };

  const handleAccept = (r: StationRequest) => {
    setReqStatus((p) => ({ ...p, [r.number]: 'UNDER_INSPECTION' }));
    setReviewTarget(null);
    notifySuccess(`قبول أولي للطلب ${r.number} — جاهز لتوزيع مفتش`);
  };

  const handleReturn = (r: StationRequest) => {
    setReqStatus((p) => ({ ...p, [r.number]: 'RETURNED' }));
    setReviewTarget(null);
    notifyError(`إعادة الطلب ${r.number} إلى الكاتب`);
  };

  const handleSuspend = (r: StationRequest) => {
    setReqStatus((p) => ({ ...p, [r.number]: 'SUSPENDED' }));
    setReviewTarget(null);
    notifySuccess(`تم تعليق الطلب ${r.number}`);
  };

  const saveAssignment = () => {
    if (!assignTarget) return;
    const inspector = inspectors.find((i) => i.id === assignForm.inspectorId);
    if (!inspector) return notifyError('اختر مفتشاً');
    const assignment: InspectionAssignment = {
      id: `a-${Date.now()}`,
      requestNumber: assignTarget.number,
      inspectorId: inspector.id,
      inspectorName: inspector.name,
      assignedBy: managerName,
      assignedAt: '13/08/2026 09:50',
      priority: assignForm.priority as InspectionAssignment['priority'],
      dueAt: assignForm.dueAt,
      status: 'PENDING',
      notes: assignForm.notes || undefined,
    };
    setAssignments((p) => [assignment, ...p]);
    setReqStatus((p) => ({ ...p, [assignTarget.number]: 'UNDER_INSPECTION' }));
    setAssignTarget(null);
    notifySuccess(`تم توزيع المفتش ${inspector.name} على ${assignTarget.number} — مسجّل في سجل التدقيق`);
  };

  const saveLabOrder = () => {
    if (!labTarget) return;
    if (labForm.types.length === 0) return notifyError('اختر نوعاً واحداً على الأقل للتحليل');
    if (!canIssueLabOrder(labTarget)) {
      notifyError('لا يمكن إصدار أمر تحليل — الحالة المالية ليست PAID/WAIVED');
      return;
    }
    const order: LabOrder = {
      id: `l-${Date.now()}`,
      requestNumber: labTarget.number,
      station: labTarget.station,
      source: labTarget.supplier,
      item: 'أرز',
      samplesCount: labForm.samples || labTarget.itemsCount * 3,
      type: labForm.types.join(' + '),
      reason: labForm.reason,
      status: 'ISSUED',
      issuedBy: managerName,
      issuedAt: '13/08/2026',
    };
    setLabOrders((p) => [order, ...p]);
    setReqStatus((p) => ({ ...p, [labTarget.number]: 'IN_LAB' }));
    setLabTarget(null);
    notifySuccess(`تم إصدار أمر التحليل للطلب ${order.requestNumber} — ${order.type}`);
  };

  const saveDecision = () => {
    if (!decisionReq) return;
    setDecisions((p) => ({ ...p, [decisionReq.number]: { kind: decisionForm.kind, notes: decisionForm.notes } }));
    const newStatus: StationStatus = decisionForm.kind === 'APPROVE' ? 'APPROVED' : decisionForm.kind === 'REJECT' ? 'REJECTED' : decisionForm.kind === 'RE_INSPECT' ? 'UNDER_INSPECTION' : decisionForm.kind === 'REQUEST_DOCS' ? 'RETURNED' : 'SUSPENDED';
    setReqStatus((p) => ({ ...p, [decisionReq.number]: newStatus }));
    setDecisionOpen(false);
    if (decisionForm.kind === 'APPROVE') {
      const req = stationRequests.find((r) => r.number === decisionReq.number)!;
      setCertRequest(req);
      notifySuccess(`اعتماد القرار (إجازة) — الشهادة الصحية جاهزة للإصدار`);
    } else {
      notifySuccess(`تم حفظ القرار (${decisionForm.kind}) للطلب ${decisionReq.number}`);
    }
  };

  const issueCertificate = (r: StationRequest) => {
    if (!canCertify(r)) {
      notifyError('التفتيش / المعمل / المستندات / القرار غير مكتملة — لا يمكن إصدار شهادة');
      return;
    }
    const cert: Certificate = {
      id: `cert-${Date.now()}`,
      number: `HC-2026-${String(certificates.length + 121).padStart(5, '0')}`,
      requestNumber: r.number,
      issueDate: '13/08/2026',
      issuedBy: managerName,
      qrRef: 'QR-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
      hash: `sha256:${r.number.toLowerCase().replace(/[^a-z0-9]/g, '')}…a9f3`,
      verificationUrl: `https://verify.nqp.gov.sd/hc-2026-${String(certificates.length + 121).padStart(5, '0')}`,
      type: r.type,
    };
    setCertificates((p) => [cert, ...p]);
    setCertRequest(r);
    notifySuccess(`تم إصدار الشهادة ${cert.number}`);
  };

  const disallowedForManager = ['تعديل نتيجة المعمل', 'اعتماد نتيجة المعمل', 'تعديل إيصال', 'حذف إيصال'];

  const sidebar = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fbfdfd', borderLeft: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg,#8a5a17,#1d6fd1)' }}>
          <DescriptionIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>التحكم التشغيلي</Typography>
          <Typography variant="caption" color="text.secondary">محطة {stationName}</Typography>
        </Box>
      </Box>
      <Divider />
      <List sx={{ flex: 1, px: 1, pt: 1 }}>
        {SIDEBAR_ITEMS.map((item) => {
          const active = activeView === item.key;
          return (
            <ListItem key={item.key} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  setActiveView(item.key);
                  setSidebarOpen(false);
                }}
                sx={{
                  borderRadius: 2.5,
                  color: active ? '#fff' : 'text.primary',
                  bgcolor: active ? 'linear-gradient(90deg,#1d6fd1,#8a5a17)' : 'transparent',
                  background: active ? 'linear-gradient(90deg,#1d6fd1,#8a5a17)' : 'transparent',
                  '&:hover': { bgcolor: active ? 'primary.dark' : 'grey.100' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 38, '& .MuiSvgIcon-root': { fontSize: 21 } }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: active ? 800 : 600, fontSize: 14 }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <Box sx={{ p: 1.5 }}>
        <Paper elevation={0} sx={{ p: 1.25, borderRadius: 3, border: '1px solid rgba(16,40,34,0.07)', bgcolor: '#fff' }}>
          <Stack direction="row" alignItems="center" spacing={1.25}>
            <Avatar sx={{ bgcolor: 'warning.main', width: 40, height: 40, fontWeight: 700 }}>{managerName.charAt(0)}</Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{managerName}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>رئيس المحطة</Typography>
              <Typography variant="caption" color="text.disabled" noWrap sx={{ display: 'block' }}>{stationName} · البحر الأحمر</Typography>
            </Box>
          </Stack>
          <Button fullWidth size="small" color="error" variant="text" startIcon={<LogoutIcon />} onClick={handleLogout} sx={{ mt: 1, fontWeight: 700 }}>
            تسجيل الخروج
          </Button>
        </Paper>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f2f6f9' }}>
      {isMobile ? (
        <Drawer anchor="right" open={sidebarOpen} onClose={() => setSidebarOpen(false)} sx={{ '& .MuiDrawer-paper': { width: drawerWidth } }}>
          {sidebar}
        </Drawer>
      ) : (
        <Box sx={{ width: drawerWidth, flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>{sidebar}</Box>
      )}

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Toolbar sx={{ gap: 1.5, flexWrap: 'wrap' }}>
            {isMobile && (
              <IconButton aria-label="فتح القائمة" onClick={() => setSidebarOpen(true)} sx={{ color: 'warning.main' }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'warning.main', flexShrink: 0 }}>
              <DescriptionIcon fontSize="small" />
            </Box>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1 }}>منصة رقابة الأغذية</Typography>
              <Typography variant="caption" color="text.secondary">لوحة التحكم التشغيلية — محطة {stationName}</Typography>
            </Box>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Tooltip title="التنبيهات">
                <IconButton aria-label="التنبيهات" onClick={(e) => setNotifAnchor(e.currentTarget)} sx={{ color: 'text.secondary' }}>
                  <Badge badgeContent={stationAlerts.filter((a) => a.tone === 'error' || a.tone === 'warning').length} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="اللغة">
                <IconButton aria-label="تغيير اللغة" onClick={() => setLang(lang === 'AR' ? 'EN' : 'AR')} sx={{ color: 'text.secondary' }}>
                  <LanguageIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="الحساب">
                <IconButton aria-label="الحساب" onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ p: 0 }}>
                  <Avatar sx={{ bgcolor: 'warning.main', width: 36, height: 36, fontWeight: 700 }}>{managerName.charAt(0)}</Avatar>
                </IconButton>
              </Tooltip>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{managerName}</Typography>
                <Typography variant="caption" color="text.secondary">رئيس المحطة</Typography>
              </Box>
            </Stack>
          </Toolbar>
        </AppBar>

        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, minWidth: 220 } } }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{managerName}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>رئيس المحطة · {stationName}</Typography>
          </Box>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontWeight: 700 }}>
            <ListItemIcon sx={{ color: 'inherit' }}><LogoutIcon fontSize="small" /></ListItemIcon>
            تسجيل الخروج
          </MenuItem>
        </Menu>

        <Menu
          anchorEl={notifAnchor}
          open={Boolean(notifAnchor)}
          onClose={() => setNotifAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, width: 340 } } }}
        >
          <Box sx={{ px: 2, py: 1 }}><Typography variant="subtitle2" sx={{ fontWeight: 700 }}>التنبيهات</Typography></Box>
          <Divider />
          {stationAlerts.map((a) => (
            <MenuItem key={a.id} onClick={() => setNotifAnchor(null)}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <NotificationDot tone={a.tone} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{a.body}</Typography>
                </Box>
              </Stack>
            </MenuItem>
          ))}
        </Menu>

        <Box component="main" sx={{ p: { xs: 2, md: 3 }, maxWidth: 1440, mx: 'auto' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>لوحة التحكم التشغيلية</Typography>
              <Typography variant="body2" color="text.secondary">رئيس محطة {stationName} — إشراف، توزيع، متابعة، واعتماد لا يتجاوز الـWorkflow</Typography>
            </Box>
            <Button variant="outlined" size="small" startIcon={<FactCheckIcon />} onClick={() => openDecide()} sx={{ borderRadius: 3 }}>
              مركز القرارات
            </Button>
          </Stack>

          {activeView === 'home' && (
            <>
              <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
                <StationCard title="قيد المراجعة" value={counts.review} icon={<DescriptionIcon />} accent="#1d6fd1" note="طلبات واصلة من الكاتب" actionLabel="مراجعة الطلبات" onClick={() => setActiveView('requests')} />
                <StationCard title="قيد التفتيش" value={counts.inspection} icon={<EngineeringIcon />} accent="#b98a2e" note="مهام موزعة على المفتشين" actionLabel="توزيع المفتشين" onClick={() => setActiveView('inspectors')} />
                <StationCard title="قيد المعمل" value={counts.lab} icon={<ScienceIcon />} accent="#8a5a17" note="أوامر تحليل جارية" actionLabel="متابعة المعمل" onClick={() => setActiveView('lab')} />
                <StationCard title="جاهزة للقرار" value={counts.decision} icon={<FactCheckIcon />} accent="#1b7a6e" highlight={counts.decision > 0} note="أكملت الإجراءات" actionLabel="مركز القرارات" onClick={() => openDecide()} />
              </Grid>
              <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
                <Grid item xs={12} sm={6}>
                  <MinorCard title="الشهادات الصحية الصادرة" value={certificates.length} icon={<VerifiedIcon />} accent="#1b7a6e" note="نسختين عربي/إنجليزي + QR تحقق" onClick={() => setActiveView('certificates')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <MinorCard title="متأخرة عن الـSLA" value={stationCritical.length} icon={<PriorityHighIcon />} accent="#c63a3a" note="تجاوزت الموعد المحدد" onClick={() => setActiveView('requests')} />
                </Grid>
              </Grid>

              <Grid container spacing={2.5}>
                <Grid item xs={12} md={7}>
                  <CriticalTable rows={stationCritical} onOpen={(n) => { const r = stationRequests.find((x) => x.number === n); if (r) openReview(r); }} />
                </Grid>
                <Grid item xs={12} md={5}>
                  <RecentOps rows={stationActivities} />
                </Grid>
              </Grid>

              <QuickActionsPanel
                onReview={() => setActiveView('requests')}
                onAssign={() => {
                  const pending = stationRequests.find((r) => statusOf(r) === 'PENDING_REVIEW');
                  openAssign(pending ?? stationRequests[0]);
                }}
                onLab={() => {
                  const eligible = stationRequests.find((r) => canIssueLabOrder(r) && statusOf(r) !== 'IN_LAB');
                  openLab(eligible ?? stationRequests[0]);
                }}
                onDecide={() => openDecide()}
              />
            </>
          )}

          {activeView === 'requests' && <RequestsGridView requests={stationRequests} statusOf={statusOf} openReview={openReview} byStatus={byStatus} />}

          {activeView === 'imports' && <RequestsGridView requests={byType('IMPORT')} statusOf={statusOf} openReview={openReview} byStatus={byStatus} />}
          {activeView === 'exports' && <RequestsGridView requests={byType('EXPORT')} statusOf={statusOf} openReview={openReview} byStatus={byStatus} />}

          {activeView === 'inspectors' && <InspectorsView inspectors={inspectors} assignments={assignments} requestNumbers={stationRequests.map((r) => r.number)} onAssign={(r) => openAssign(r)} />}

          {activeView === 'lab' && <LabView orders={labOrders} requests={stationRequests} onIssue={(r) => openLab(r)} />}

          {activeView === 'certificates' && (
            <CertificatesView
              requests={stationRequests}
              statusOf={statusOf}
              certificates={certificates}
              canCertify={canCertify}
              onIssue={issueCertificate}
              onPreview={setCertRequest}
            />
          )}

          {activeView === 'finance' && <FinanceView />}

          {activeView === 'reports' && <ReportsView statusOf={statusOf} requests={stationRequests} assignments={assignments} labOrders={labOrders} certificates={certificates} />}

          {activeView === 'alerts' && <AlertsView />}

          {activeView === 'settings' && (
            <Card variant="outlined" sx={{ borderRadius: 3, maxWidth: 720 }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>الإعدادات</Typography>
                <Stack spacing={1}>
                  <SettingRow label="اللغة" value={lang === 'AR' ? 'العربية' : 'English'} onToggle={() => setLang(lang === 'AR' ? 'EN' : 'AR')} />
                  <SettingRow label="تنبيهات تجاوز SLA" value="مفعّلة" onToggle={() => notifySuccess('تم تبديل تنبيهات SLA')} />
                  <SettingRow label="طلب اعتماد مزدوج للشهادات" value="إيقاف" onToggle={() => notifySuccess('تم تبديل سياسة الاعتماد')} />
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, color: 'text.secondary' }}>
                    <LockIcon fontSize="small" color="disabled" />
                    <Typography variant="caption">لا يملك رئيس المحطة صلاحية تعديل/اعتماد نتائج المعمل أو تعديل/حذف الإيصالات.</Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>

      {/* مراجعة الطلب */}
      <ReviewDialog
        target={reviewTarget}
        statusOf={statusOf}
        canIssueLabOrder={canIssueLabOrder}
        canDecide={canDecide}
        onClose={() => setReviewTarget(null)}
        onAccept={handleAccept}
        onReturn={handleReturn}
        onSuspend={handleSuspend}
        onAssign={(r) => { setReviewTarget(null); openAssign(r); }}
        onLab={(r) => { setReviewTarget(null); openLab(r); }}
        onDecide={(r) => { setReviewTarget(null); openDecide(r); }}
      />

      {/* توزيع المفتشين */}
      <Dialog open={Boolean(assignTarget)} onClose={() => setAssignTarget(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'warning.main' }}>
              <EngineeringIcon fontSize="small" />
            </Box>
            توزيع مفتش
          </Stack>
          <IconButton aria-label="إغلاق" onClick={() => setAssignTarget(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {assignTarget && (
            <Stack spacing={2}>
              <Stack spacing={1}>
                <LockedRow label="رقم الطلب" value={assignTarget.number} />
                <LockedRow label="النوع" value={assignTarget.type === 'IMPORT' ? 'وارد' : 'صادر'} />
                <LockedRow label="المستورد / المصدر" value={assignTarget.client} />
              </Stack>
              <TextField select label="المفتش" fullWidth size="small" value={assignForm.inspectorId} onChange={(e) => setAssignForm((f) => ({ ...f, inspectorId: e.target.value }))}>
                {inspectors.map((i) => (
                  <MenuItem key={i.id} value={i.id}>{i.name} — {i.specialty} ({i.workload} مهام جارية)</MenuItem>
                ))}
              </TextField>
              <TextField select label="الأولوية" fullWidth size="small" value={assignForm.priority} onChange={(e) => setAssignForm((f) => ({ ...f, priority: e.target.value }))}>
                <MenuItem value="normal">عادية</MenuItem>
                <MenuItem value="high">عالية</MenuItem>
                <MenuItem value="urgent">عاجلة</MenuItem>
              </TextField>
              <TextField label="الموعد المحدد (due_at)" fullWidth size="small" type="date" value={assignForm.dueAt} onChange={(e) => setAssignForm((f) => ({ ...f, dueAt: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="ملاحظات المهمة" fullWidth size="small" multiline minRows={2} value={assignForm.notes} onChange={(e) => setAssignForm((f) => ({ ...f, notes: e.target.value }))} />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
                <InfoIcon fontSize="small" color="info" />
                <Typography variant="caption">Assignment يسجّل: المفتش، الموزِّع (assigned_by)، التوقيت، الموعد، الأولوية، والحالة — سجل تدقيق كامل.</Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAssignTarget(null)}>إلغاء</Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" color="warning" startIcon={<EngineeringIcon />} onClick={saveAssignment}>
            توزيع المفتشين
          </Button>
        </DialogActions>
      </Dialog>

      {/* إصدار أمر تحليل */}
      <Dialog open={Boolean(labTarget)} onClose={() => setLabTarget(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'info.main' }}>
              <ScienceIcon fontSize="small" />
            </Box>
            إصدار أمر تحليل
          </Stack>
          <IconButton aria-label="إغلاق" onClick={() => setLabTarget(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {labTarget && (
            <Stack spacing={2}>
              <Grid container spacing={1.5}>
                <Grid item xs={6}><LockedRow label="رقم الطلب" value={labTarget.number} /></Grid>
                <Grid item xs={6}><LockedRow label="المحطة" value={labTarget.station} /></Grid>
                <Grid item xs={6}><LockedRow label="المصدر" value={labTarget.supplier} /></Grid>
                <Grid item xs={6}><LockedRow label="الصنف" value="أرز" /></Grid>
              </Grid>
              <AlertRow tone={canIssueLabOrder(labTarget) ? 'success' : 'error'} text={canIssueLabOrder(labTarget) ? `الحالة المالية ${labTarget.financialStatus} — مسموح بإصدار أمر تحليل ✓` : `الحالة المالية ${labTarget.financialStatus} — غير مسموح (يلزم PAID أو WAIVED)`} />
              <TextField size="small" fullWidth label="عدد العينات (تلقائي)" value={`${labForm.samples} عينة — حسب سياسة النظام`} disabled />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>نوع التحليل</Typography>
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.5}>
                  {analysisTypes.map((t) => (
                    <FormControlLabel
                      key={t}
                      control={
                        <Checkbox
                          size="small"
                          checked={labForm.types.includes(t)}
                          onChange={(e) =>
                            setLabForm((f) => ({
                              ...f,
                              types: e.target.checked ? [...f.types, t] : f.types.filter((x) => x !== t),
                            }))
                          }
                        />
                      }
                      label={t}
                    />
                  ))}
                </Stack>
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>سبب التحليل</Typography>
                <RadioGroup value={labForm.reason} onChange={(e) => setLabForm((f) => ({ ...f, reason: e.target.value }))}>
                  <Grid container spacing={0.5}>
                    {analysisReasons.map((r) => (
                      <Grid item xs={12} sm={6} key={r}>
                        <FormControlLabel value={r} control={<Radio size="small" />} label={r} />
                      </Grid>
                    ))}
                  </Grid>
                </RadioGroup>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
                <InfoIcon fontSize="small" color="info" />
                <Typography variant="caption">Business Logic: allow_lab_order عند financial_status ∈ [PAID, WAIVED] + sampling_required — لا علاقة لـ status=="PAID".</Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLabTarget(null)}>إلغاء</Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" color="info" startIcon={<ScienceIcon />} disabled={!labTarget || labForm.types.length === 0 || !canIssueLabOrder(labTarget)} onClick={saveLabOrder}>
            🧪 إصدار أمر التحليل
          </Button>
        </DialogActions>
      </Dialog>

      {/* القرار النهائي */}
      <Dialog open={decisionOpen} onClose={() => setDecisionOpen(false)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'success.main' }}>
              <FactCheckIcon fontSize="small" />
            </Box>
            القرار النهائي
          </Stack>
          <IconButton aria-label="إغلاق" onClick={() => setDecisionOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {decisionReq && (
            <Stack spacing={2}>
              <TextField select size="small" fullWidth label="الطلب" value={decisionReq.number} onChange={(e) => { const r = stationRequests.find((x) => x.number === e.target.value); if (r) { setDecisionReq(r); } }}>
                {stationRequests.filter((r) => statusOf(r) === 'READY_DECISION').map((r) => (
                  <MenuItem key={r.number} value={r.number}>{r.number} — {r.client}</MenuItem>
                ))}
              </TextField>
              <Box sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid rgba(27,122,110,0.2)', bgcolor: 'rgba(27,122,110,0.05)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>جاهزية القرار</Typography>
                <CheckRow ok label="نتيجة التفتيش" status="مطابق" />
                <CheckRow ok label="نتيجة المعمل" status="مطابق" />
                <CheckRow ok label="المستندات" status="مكتملة" />
                <CheckRow ok label="الرسوم" status="مكتملة" />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>القرار</Typography>
                <RadioGroup value={decisionForm.kind} onChange={(e) => setDecisionForm((f) => ({ ...f, kind: e.target.value as DecisionKind }))}>
                  <Grid container spacing={0.5}>
                    {([['APPROVE', '✅ إجازة'], ['REJECT', '❌ رفض'], ['HOLD', '⏸ حجز'], ['RE_INSPECT', '🔄 إعادة فحص'], ['REQUEST_DOCS', '📎 طلب مستندات إضافية']] as [DecisionKind, string][]).map(([v, label]) => (
                      <Grid item xs={12} sm={6} key={v}>
                        <FormControlLabel value={v} control={<Radio size="small" />} label={label} />
                      </Grid>
                    ))}
                  </Grid>
                </RadioGroup>
              </Box>
              <TextField label="الملاحظات" fullWidth size="small" multiline minRows={2} value={decisionForm.notes} onChange={(e) => setDecisionForm((f) => ({ ...f, notes: e.target.value }))} />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
                <InfoIcon fontSize="small" color="info" />
                <Typography variant="caption">القرار الرقابي النهائي يعتمده رئيس المحطة بناءً على نتائج المعمل المعتمدة — دون تعديلها.</Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDecisionOpen(false)}>إلغاء</Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" color="success" startIcon={<FactCheckIcon />} onClick={saveDecision}>
            اعتماد القرار
          </Button>
        </DialogActions>
      </Dialog>

      {/* الشهادة الصحية */}
      <CertificateDialog cert={certificates.find((c) => c.requestNumber === certRequest?.number)} request={certRequest} onClose={() => setCertRequest(null)} />
    </Box>
  );
};

/* ============================ قطع فرعية ============================ */

const NotificationDot = ({ tone }: { tone: 'error' | 'warning' | 'success' | 'info' }) => {
  const color = { error: 'error.main', warning: 'warning.main', success: 'success.main', info: 'info.main' }[tone];
  return <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: color, mt: 0.7, flexShrink: 0 }} />;
};

const StationCard = ({ title, value, icon, accent, note, highlight, actionLabel, onClick }: {
  title: string; value: number; icon: React.ReactNode; accent: string; note: string; highlight?: boolean; actionLabel: string; onClick: () => void;
}) => (
  <Grid item xs={12} sm={6} lg={3}>
    <Card elevation={0} sx={{ borderRadius: 3, border: highlight ? '2px solid' : '1px solid', borderColor: highlight ? 'success.main' : 'divider', bgcolor: highlight ? 'rgba(27,122,110,0.05)' : '#fff', height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{title}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: accent, lineHeight: 1.2 }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{note}</Typography>
          </Box>
          <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: accent }}>{icon}</Box>
        </Stack>
        <Button size="small" fullWidth variant={highlight ? 'contained' : 'outlined'} color={highlight ? 'success' : 'inherit'} onClick={onClick} sx={{ mt: 1.5, borderRadius: 2, fontWeight: 700 }}>
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  </Grid>
);

const MinorCard = ({ title, value, icon, accent, note, onClick }: { title: string; value: number; icon: React.ReactNode; accent: string; note: string; onClick: () => void }) => (
  <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: accent }}>{icon}</Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
          <Typography variant="caption" color="text.secondary">{title}</Typography>
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>{note}</Typography>
        </Box>
      </Stack>
      <Button size="small" variant="text" onClick={onClick}>عرض</Button>
    </CardContent>
  </Card>
);

const CriticalTable = ({ rows, onOpen }: { rows: { id: string; number: string; stage: string; delay: string }[]; onOpen: (n: string) => void }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: { xs: 2.5, md: 0 } }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.5, py: 2 }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>🚨 الطلبات الحرجة</Typography>
        <Typography variant="caption" color="text.secondary">تجاوزت الـSLA أو تحتاج متابعة فورية</Typography>
      </Box>
    </Stack>
    <Box sx={{ overflowX: 'auto' }}>
      <TableContainer>
        <Table sx={{ minWidth: 560 }}>
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: 'rgba(198,58,58,0.06)', fontWeight: 700, fontSize: 12.5 } }}>
              <TableCell>رقم الطلب</TableCell>
              <TableCell>المرحلة</TableCell>
              <TableCell>التأخير</TableCell>
              <TableCell>الإجراء</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.number}</TableCell>
                <TableCell><Chip label={r.stage} size="small" color={r.stage === 'تفتيش' ? 'warning' : 'default'} variant="outlined" /></TableCell>
                <TableCell sx={{ color: 'error.main', fontWeight: 700 }}>⏱ {r.delay}</TableCell>
                <TableCell>
                  <Button size="small" variant="text" startIcon={<VisibilityIcon fontSize="small" />} onClick={() => onOpen(r.number)}>متابعة</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  </Paper>
);

const RecentOps = ({ rows }: { rows: { id: string; time: string; action: string; who: string }[] }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>آخر العمليات</Typography>
    <Stack spacing={1.25}>
      {rows.map((a) => (
        <Stack key={a.id} direction="row" spacing={1} alignItems="center" sx={{ p: 1, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.6)' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'info.main', flexShrink: 0 }} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{a.action}</Typography>
            <Typography variant="caption" color="text.secondary">{a.time} — {a.who}</Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  </Paper>
);

const QuickActionsPanel = ({ onReview, onAssign, onLab, onDecide }: { onReview: () => void; onAssign: () => void; onLab: () => void; onDecide: () => void }) => (
  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, mt: 2.5, bgcolor: 'rgba(255,255,255,0.7)' }}>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>⚡ إجراءات سريعة</Typography>
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <Button fullWidth variant="outlined" color="info" startIcon={<DescriptionIcon />} onClick={onReview} sx={{ py: 1.75, borderRadius: 3, fontWeight: 700 }}>مراجعة الطلبات</Button>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Button fullWidth variant="outlined" color="warning" startIcon={<EngineeringIcon />} onClick={onAssign} sx={{ py: 1.75, borderRadius: 3, fontWeight: 700 }}>توزيع المفتشين</Button>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Button fullWidth variant="outlined" color="inherit" startIcon={<ScienceIcon />} onClick={onLab} sx={{ py: 1.75, borderRadius: 3, fontWeight: 700 }}>إصدار أمر تحليل</Button>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Button fullWidth variant="contained" color="success" startIcon={<FactCheckIcon />} onClick={onDecide} sx={{ py: 1.75, borderRadius: 3, fontWeight: 700 }}>
          مركز القرارات
        </Button>
      </Grid>
    </Grid>
  </Paper>
);

const RequestsGridView = ({ requests, statusOf, openReview, byStatus }: {
  requests: StationRequest[];
  statusOf: (r: StationRequest) => StationStatus;
  openReview: (r: StationRequest) => void;
  byStatus: (s: StationStatus) => StationRequest[];
}) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ px: 2.5, py: 2 }}>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>الطلبات</Typography>
        <Typography variant="caption" color="text.secondary">{requests.length} طلب في المحطة</Typography>
      </Box>
      {(['PENDING_REVIEW', 'UNDER_INSPECTION', 'IN_LAB', 'READY_DECISION', 'APPROVED'] as StationStatus[]).map((s) => (
        <Chip key={s} label={`${stationStatusMeta[s].label}: ${byStatus(s).length}`} size="small" color={stationStatusMeta[s].tone} variant="outlined" onClick={() => notifySuccess(`تصفية: ${stationStatusMeta[s].label}`)} />
      ))}
    </Stack>
    <Box sx={{ overflowX: 'auto' }}>
      <TableContainer>
        <Table sx={{ minWidth: 980 }}>
          <TableHead>
            <TableRow sx={{ '& th': { bgcolor: 'rgba(29,111,209,0.05)', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap' } }}>
              <TableCell>رقم الطلب</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>المستورد / المصدر</TableCell>
              <TableCell>المورد</TableCell>
              <TableCell align="center">الوزن</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الحالة المالية</TableCell>
              <TableCell>إجراء</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((r) => (
              <TableRow key={r.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.number}</TableCell>
                <TableCell><Chip label={r.type === 'IMPORT' ? '📥 وارد' : '📤 صادر'} size="small" color={r.type === 'IMPORT' ? 'info' : 'success'} variant="outlined" /></TableCell>
                <TableCell>{r.client}</TableCell>
                <TableCell>{r.supplier}</TableCell>
                <TableCell align="center">{r.weight}</TableCell>
                <TableCell><StatusBadge status={statusOf(r)} /></TableCell>
                <TableCell><FinBadge fs={r.financialStatus} /></TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" startIcon={<VisibilityIcon fontSize="small" />} onClick={() => openReview(r)} sx={{ borderRadius: 2 }}>
                    مراجعة
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  </Paper>
);

const StatusBadge = ({ status }: { status: StationStatus }) => {
  const meta = stationStatusMeta[status];
  return <Chip label={meta.label} size="small" color={meta.tone === 'primary' ? 'primary' : meta.tone} variant="filled" />;
};

const FinBadge = ({ fs }: { fs: string }) => {
  const map: Record<string, { label: string; tone: 'error' | 'warning' | 'success' | 'info' }> = {
    PAID: { label: 'مدفوع', tone: 'success' },
    WAIVED: { label: 'معفى', tone: 'info' },
    PARTIAL: { label: 'جزئي', tone: 'warning' },
    UNPAID: { label: 'غير مدفوع', tone: 'error' },
  };
  const m = map[fs] ?? { label: fs, tone: 'default' as const };
  return <Chip label={m.label} size="small" color={m.tone} variant="outlined" />;
};

const InspectorsView = ({ inspectors, assignments, requestNumbers, onAssign }: {
  inspectors: Inspector[];
  assignments: InspectionAssignment[];
  requestNumbers: string[];
  onAssign: (r: StationRequest) => void;
}) => (
  <Grid container spacing={2.5}>
    <Grid item xs={12} md={5}>
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>فريق التفتيش</Typography>
        <Grid container spacing={1.5}>
          {inspectors.map((i) => (
            <Grid item xs={12} sm={6} key={i.id}>
              <Card elevation={0} variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Avatar sx={{ bgcolor: 'warning.main', mb: 1 }}>{i.name.charAt(0)}</Avatar>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{i.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{i.specialty}</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip label={`${i.workload} مهام جارية`} size="small" color={i.workload >= 4 ? 'error' : i.workload > 1 ? 'warning' : 'success'} variant="outlined" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Button variant="contained" color="warning" fullWidth startIcon={<EngineeringIcon />} onClick={() => onAssign(requestNumbers[0] ? stationRequests.find((r) => r.number === requestNumbers[0])! : stationRequests[0])} sx={{ mt: 2, borderRadius: 2, fontWeight: 700 }}>
          توزيع مفتش جديد
        </Button>
      </Paper>
    </Grid>
    <Grid item xs={12} md={7}>
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Stack sx={{ px: 2.5, py: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>سجل المهام (Task Assignments)</Typography>
          <Typography variant="caption" color="text.secondary">سجل تدقيق: من عيّن؟ متى؟ لأي طلب؟ الموعد؟ هل أُنجزت؟</Typography>
        </Stack>
        <Box sx={{ overflowX: 'auto' }}>
          <TableContainer>
            <Table sx={{ minWidth: 760 }}>
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: 'rgba(29,111,209,0.05)', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap' } }}>
                  <TableCell>الطلب</TableCell>
                  <TableCell>المفتش</TableCell>
                  <TableCell>الموزّع</TableCell>
                  <TableCell>التوقيت</TableCell>
                  <TableCell>الموعد</TableCell>
                  <TableCell>الأولوية</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{a.requestNumber}</TableCell>
                    <TableCell>{a.inspectorName}</TableCell>
                    <TableCell>{a.assignedBy}</TableCell>
                    <TableCell>{a.assignedAt}</TableCell>
                    <TableCell>{a.dueAt}</TableCell>
                    <TableCell><PriorityChip p={a.priority} /></TableCell>
                    <TableCell><AssignmentChip s={a.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
    </Grid>
  </Grid>
);

const PriorityChip = ({ p }: { p: InspectionAssignment['priority'] }) => {
  const map = { normal: { label: 'عادية', tone: 'default' as const }, high: { label: 'عالية', tone: 'warning' as const }, urgent: { label: 'عاجلة', tone: 'error' as const }, };
  return <Chip label={map[p].label} size="small" color={map[p].tone} variant="outlined" />;
};

const AssignmentChip = ({ s }: { s: InspectionAssignment['status'] }) => {
  const map = { PENDING: { label: 'في الانتظار', tone: 'info' as const }, IN_PROGRESS: { label: 'جارية', tone: 'warning' as const }, DONE: { label: 'مكتملة', tone: 'success' as const }, };
  return <Chip label={map[s].label} size="small" color={map[s].tone} variant="filled" />;
};

const LabView = ({ orders, requests, onIssue }: {
  orders: LabOrder[];
  requests: StationRequest[];
  onIssue: (r: StationRequest) => void;
}) => (
  <Grid container spacing={2.5}>
    <Grid item xs={12}>
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5, mb: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>المعمل المرجعي</Typography>
            <Typography variant="caption" color="text.secondary">متابعة أوامر التحليل — لا تعديل ولا اعتماد لنتائج المعمل من المحطة</Typography>
          </Box>
          <Button variant="outlined" color="info" startIcon={<ScienceIcon />} onClick={() => onIssue(requests[0])} sx={{ borderRadius: 2 }}>
            إصدار أمر تحليل جديد
          </Button>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <TableContainer>
            <Table sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow sx={{ '& th': { bgcolor: 'rgba(29,111,209,0.05)', fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap' } }}>
                  <TableCell>رقم الأمر</TableCell>
                  <TableCell>الطلب</TableCell>
                  <TableCell>الصنف</TableCell>
                  <TableCell align="center">العينات</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>السبب</TableCell>
                  <TableCell>من أصدر</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>LO-{o.requestNumber}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{o.requestNumber}</TableCell>
                    <TableCell>{o.item}</TableCell>
                    <TableCell align="center">{o.samplesCount}</TableCell>
                    <TableCell><Chip label={o.type} size="small" color="info" variant="outlined" /></TableCell>
                    <TableCell>{o.reason}</TableCell>
                    <TableCell>{o.issuedBy}</TableCell>
                    <TableCell><LabStatusChip status={o.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5, mt: 2.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>دورة أمر التحليل</Typography>
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} alignItems="center">
          {labOrderStatusOrder.map((s, i) => (
            <Stack key={s} direction="row" alignItems="center" spacing={1}>
              <Chip label={s} size="small" color="info" variant="outlined" />
              {i < labOrderStatusOrder.length - 1 && <Typography color="text.disabled">←</Typography>}
            </Stack>
          ))}
        </Stack>
      </Paper>
    </Grid>
  </Grid>
);

const LabStatusChip = ({ status }: { status: LabOrderStatus }) => (
  <Chip label={status} size="small" color={status === 'RESULT_READY' || status === 'VERIFIED' || status === 'COMPLETED' ? 'success' : status === 'IN_PROGRESS' ? 'warning' : 'info'} variant="filled" sx={{ fontFamily: 'monospace', direction: 'ltr' }} />
);

const CertificatesView = ({ requests, statusOf, certificates, canCertify, onIssue, onPreview }: {
  requests: StationRequest[];
  statusOf: (r: StationRequest) => StationStatus;
  certificates: Certificate[];
  canCertify: (r: StationRequest) => boolean;
  onIssue: (r: StationRequest) => void;
  onPreview: (r: StationRequest) => void;
}) => {
  const eligible = requests.filter((r) => canCertify(r) && !certificates.some((c) => c.requestNumber === r.number));
  const others = requests.filter((r) => !canCertify(r));
  return (
    <Grid container spacing={2.5}>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Stack sx={{ px: 2.5, py: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>الشهادات الصحية</Typography>
            <Typography variant="caption" color="text.secondary">{certificates.length} شهادة صادرة — عربي + إنجليزي + QR تحقق</Typography>
          </Stack>
          <Box sx={{ overflowX: 'auto' }}>
            <TableContainer>
              <Table sx={{ minWidth: 560 }}>
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: 'rgba(27,122,110,0.06)', fontWeight: 700, fontSize: 12.5 } }}>
                    <TableCell>رقم الشهادة</TableCell>
                    <TableCell>الطلب</TableCell>
                    <TableCell>تاريخ الإصدار</TableCell>
                    <TableCell>إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {certificates.map((c) => (
                    <TableRow key={c.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                      <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{c.number}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace' }}>{c.requestNumber}</TableCell>
                      <TableCell>{c.issueDate}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" color="success" startIcon={<VerifiedIcon />} onClick={() => onPreview(requests.find((r) => r.number === c.requestNumber) ?? requests[0])} sx={{ borderRadius: 2 }}>
                          عرض
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5, mb: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>جاهزة للإصدار ({eligible.length})</Typography>
          <Stack spacing={1}>
            {eligible.map((r) => (
              <Stack key={r.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.25, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.number}</Typography>
                  <Typography variant="caption" color="text.secondary">{r.client} · {r.type === 'IMPORT' ? 'وارد' : 'صادر'}</Typography>
                </Box>
                <Button size="small" variant="contained" color="success" startIcon={<VerifiedIcon />} onClick={() => onIssue(r)} sx={{ borderRadius: 2 }}>
                  إصدار الشهادة
                </Button>
              </Stack>
            ))}
            {eligible.length === 0 && <Typography variant="caption" color="text.secondary">لا توجد طلبات معتمدة غير مصدرة.</Typography>}
          </Stack>
        </Paper>
        <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>🔒 لا يمكن إصدار شهادة بعد</Typography>
          <Stack spacing={1}>
            {others.slice(0, 5).map((r) => (
              <Stack key={r.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.25, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{r.number}</Typography>
                  <Typography variant="caption" color="text.secondary">{stationStatusMeta[statusOf(r)].label}</Typography>
                </Box>
                <Chip label={blockReason(statusOf(r))} size="small" color="default" variant="outlined" />
              </Stack>
            ))}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, color: 'text.secondary' }}>
            <LockIcon fontSize="small" color="disabled" />
            <Typography variant="caption">if can_issue_certificate(request): generate_certificate() else: show_blocking_reasons()</Typography>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  );
};

const blockReason = (s: StationStatus) => {
  if (s === 'PENDING_REVIEW') return 'لم يُراجع بعد';
  if (s === 'UNDER_INSPECTION') return 'التفتيش غير مكتمل';
  if (s === 'IN_LAB') return 'نتيجة المعمل غير مكتملة';
  if (s === 'READY_DECISION') return 'القرار غير معتمد';
  if (s === 'RETURNED') return 'مستند إلزامي ناقص';
  if (s === 'SUSPENDED') return 'الطلب معلّق';
  if (s === 'REJECTED') return 'الطلب مرفوض';
  return 'غير معتمد';
};

const FinanceView = () => (
  <Grid container spacing={2.5}>
    {([['إيراد اليوم', stationFinances.collectedToday, 'success'], ['مستحقات قيد التحصيل', stationFinances.pending, 'error'], ['إعفاءات معتمدة', `${stationFinances.waivers}`, 'info'], ['الشهادات الصادرة', `${stationFinances.certificates}`, 'primary']] as [string, string, string][]).map(([label, value, color]) => (
      <Grid item xs={12} sm={6} key={label}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{label}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: `${color}.main` }}>{value}</Typography>
          </CardContent>
        </Card>
      </Grid>
    ))}
    <Grid item xs={12}>
      <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: 'rgba(15,122,87,0.04)' }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <LockIcon color="disabled" />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>نطاق مالية رئيس المحطة</Typography>
              <Typography variant="body2" color="text.secondary">قراءة فقط — عرض الإيرادات والمستحقات دون تعديل/حذف إيصالات. التحصيل والإيصالات حصرًا للمحاسب، واعتماد النتائج المعملية للمختص المعتمد.</Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

const ReportsView = ({ statusOf, requests, assignments, labOrders, certificates }: { statusOf: (r: StationRequest) => StationStatus; requests: StationRequest[]; assignments: InspectionAssignment[]; labOrders: LabOrder[]; certificates: Certificate[] }) => (
  <Grid container spacing={2.5}>
    <Grid item xs={12} md={6}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>تقرير المحطة اليومي</Typography>
          <Stack spacing={1}>
            <ReportRow label="طلبات معالجة" value={`${requests.length}`} />
            <ReportRow label="قيد المراجعة" value={`${requests.filter((r) => statusOf(r) === 'PENDING_REVIEW').length}`} />
            <ReportRow label="قيد التفتيش" value={`${requests.filter((r) => statusOf(r) === 'UNDER_INSPECTION').length}`} />
            <ReportRow label="أوامر تحليل" value={`${labOrders.length}`} />
            <ReportRow label="مهام المفتشين" value={`${assignments.length}`} />
            <ReportRow label="قرارات" value={`${requests.filter((r) => statusOf(r) === 'APPROVED' || statusOf(r) === 'REJECTED').length}`} />
            <ReportRow label="شهادات صادرة" value={`${certificates.length}`} bold />
            <ReportRow label="تجاوز SLA" value={`${stationCritical.length}`} accent />
          </Stack>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={6}>
      <Card variant="outlined" sx={{ borderRadius: 3, mb: 2.5 }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>مصفوفة العملية التشغيلية</Typography>
          {(['PENDING_REVIEW', 'UNDER_INSPECTION', 'IN_LAB', 'READY_DECISION', 'APPROVED'] as StationStatus[]).map((s) => (
            <ReportRow key={s} label={stationStatusMeta[s].label} value={`${requests.filter((r) => statusOf(r) === s).length}`} />
          ))}
        </CardContent>
      </Card>
      <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>مبدأ العمل</Typography>
        <Typography variant="body2" color="text.secondary">
          رئيس المحطة مُتحكّم تشغيلي يتولى مراجعة الطلبات وتوزيع المفتشين وإصدار أوامر التحليل واتخاذ القرار الرقابي وإصدار الشهادات، دون أن يتجاوز الـWorkflow أو يعدّل نتائج المعمل أو الإيصالات.
        </Typography>
      </Paper>
    </Grid>
  </Grid>
);

const ReportRow = ({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1.25, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
    <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 700 }}>{label}</Typography>
    <Typography variant={bold ? 'h6' : 'body2'} sx={{ fontWeight: bold ? 800 : 600, color: accent ? 'error.main' : 'text.primary' }}>{value}</Typography>
  </Stack>
);

const AlertsView = () => (
  <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>التنبيهات</Typography>
    <Stack spacing={1.25}>
      {stationAlerts.map((a) => (
        <Stack key={a.id} direction="row" spacing={1.5} alignItems="flex-start" sx={{ p: 1.25, borderRadius: 2.5, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.6)' }}>
          <NotificationDot tone={a.tone} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.title}</Typography>
            <Typography variant="body2" color="text.secondary">{a.body}</Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  </Paper>
);

const SettingRow = ({ label, value, onToggle }: { label: string; value: string; onToggle: () => void }) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid rgba(16,40,34,0.07)' }}>
    <Typography variant="body2" sx={{ fontWeight: 700 }}>{label}</Typography>
    <Button size="small" variant="outlined" onClick={onToggle} sx={{ borderRadius: 2 }}>{value}</Button>
  </Stack>
);

const LockedRow = ({ label, value }: { label: string; value: string }) => (
  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.25, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(243,246,248,0.6)' }}>
    <Stack direction="row" spacing={1} alignItems="center">
      <LockIcon fontSize="small" color="disabled" />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
    </Stack>
    <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'left', fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
  </Stack>
);

const AlertRow = ({ tone, text }: { tone: 'success' | 'error'; text: string }) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ p: 1.25, borderRadius: 2, bgcolor: tone === 'success' ? 'rgba(27,122,110,0.08)' : 'rgba(198,58,58,0.08)', color: tone === 'success' ? 'success.main' : 'error.main' }}>
    {tone === 'success' ? <CheckCircleIcon fontSize="small" /> : <WarningAmberIcon fontSize="small" />}
    <Typography variant="body2" sx={{ fontWeight: 700 }}>{text}</Typography>
  </Stack>
);

const CheckRow = ({ ok, label, status }: { ok: boolean; label: string; status: string }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Stack direction="row" spacing={1} alignItems="center">
      {ok ? <CheckCircleIcon fontSize="small" color="success" /> : <WarningAmberIcon fontSize="small" color="error" />}
      <Typography variant="body2">{label}</Typography>
    </Stack>
    <Typography variant="body2" sx={{ fontWeight: 700 }}>{status}</Typography>
  </Stack>
);

const ReviewDialog = ({ target, statusOf, canIssueLabOrder, canDecide, onClose, onAccept, onReturn, onSuspend, onAssign, onLab, onDecide }: {
  target: StationRequest | null;
  statusOf: (r: StationRequest) => StationStatus;
  canIssueLabOrder: (r: StationRequest) => boolean;
  canDecide: (r: StationRequest) => boolean;
  onClose: () => void;
  onAccept: (r: StationRequest) => void;
  onReturn: (r: StationRequest) => void;
  onSuspend: (r: StationRequest) => void;
  onAssign: (r: StationRequest) => void;
  onLab: (r: StationRequest) => void;
  onDecide: (r: StationRequest) => void;
}) => (
  <Dialog open={Boolean(target)} onClose={onClose} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4 } }}>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'info.main' }}>
          <DescriptionIcon fontSize="small" />
        </Box>
        مراجعة الطلب
      </Stack>
      <IconButton aria-label="إغلاق" onClick={onClose}><CloseIcon /></IconButton>
    </DialogTitle>
    <DialogContent dividers>
      {target && (
        <Stack spacing={2.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" useFlexGap>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{target.number}</Typography>
              <Typography variant="caption" color="text.secondary">{target.type === 'IMPORT' ? '📥 وارد' : '📤 صادر'} · {target.client}</Typography>
            </Box>
            <StatusBadge status={statusOf(target)} />
          </Stack>
          <Grid container spacing={1.5}>
            <Grid item xs={6}><LockedRow label="المستورد / المصدر" value={target.client} /></Grid>
            <Grid item xs={6}><LockedRow label="المورد" value={target.supplier} /></Grid>
            <Grid item xs={6}><LockedRow label="الباخرة" value={target.vessel} /></Grid>
            <Grid item xs={6}><LockedRow label="الوزن / الأصناف" value={`${target.weight} · ${target.itemsCount} أصناف`} /></Grid>
            <Grid item xs={6}><LockedRow label="المحطة" value={target.station} /></Grid>
            <Grid item xs={6}><LockedRow label="الحالة المالية" value={target.financialStatus} /></Grid>
          </Grid>
          <Box sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid rgba(16,40,34,0.09)', bgcolor: 'rgba(255,255,255,0.6)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>📦 الملخص</Typography>
            <CheckRow ok label="الأصناف الواردة" status="مكتملة" />
            <CheckRow ok label="المستندات الإلزامية" status={statusOf(target) === 'RETURNED' ? 'ناقصة' : 'مكتملة'} />
            <CheckRow ok label="الرسوم" status={target.financialStatus === 'PAID' || target.financialStatus === 'WAIVED' ? 'مكتملة' : 'قيد التحصيل'} />
            <CheckRow ok={statusOf(target) === 'APPROVED' || statusOf(target) === 'READY_DECISION'} label="العينات" status={statusOf(target) === 'IN_LAB' ? 'في المعمل' : 'مكتملة'} />
          </Box>
        </Stack>
      )}
    </DialogContent>
    <DialogActions sx={{ px: 2, pb: 2, flexWrap: 'wrap', gap: 1 }}>
      {target && (
        <>
          <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => onAccept(target)} sx={{ borderRadius: 2 }}>
            ✅ قبول الطلب
          </Button>
          <Button variant="outlined" color="error" startIcon={<WarningAmberIcon />} onClick={() => onReturn(target)} sx={{ borderRadius: 2 }}>
            🔄 إعادة للكاتب
          </Button>
          <Button variant="outlined" color="warning" startIcon={<EngineeringIcon />} onClick={() => onAssign(target)} sx={{ borderRadius: 2 }}>
            👨‍🔬 تعيين مفتش
          </Button>
          <Button variant="outlined" color="info" startIcon={<ScienceIcon />} disabled={!canIssueLabOrder(target)} onClick={() => onLab(target)} sx={{ borderRadius: 2 }}>
            🧪 إصدار أمر تحليل
          </Button>
          <Button variant="outlined" onClick={() => onSuspend(target)} sx={{ borderRadius: 2 }}>
            ⏸ تعليق
          </Button>
          {canDecide(target) && (
            <Button variant="contained" color="success" startIcon={<FactCheckIcon />} onClick={() => onDecide(target)} sx={{ borderRadius: 2 }}>
              ⚖️ القرار النهائي
            </Button>
          )}
        </>
      )}
    </DialogActions>
  </Dialog>
);

const CertificateDialog = ({ cert, request, onClose }: { cert?: Certificate; request: StationRequest | null; onClose: () => void }) => {
  const [tab, setTab] = useState<'AR' | 'EN'>('AR');
  if (!request) return null;
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'success.main' }}>
            <VerifiedIcon fontSize="small" />
          </Box>
          الشهادة الصحية
        </Stack>
        <IconButton aria-label="إغلاق" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {(['AR', 'EN'] as const).map((t) => (
            <Button key={t} size="small" variant={tab === t ? 'contained' : 'outlined'} color="success" onClick={() => setTab(t)} sx={{ borderRadius: 2 }}>
              {t === 'AR' ? '🇸🇩 العربية' : '🇬🇧 English'}
            </Button>
          ))}
        </Stack>
        <Box sx={{ p: 2, borderRadius: 2.5, border: '1.5px solid rgba(27,122,110,0.3)', bgcolor: 'rgba(255,255,255,0.7)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, textAlign: 'center' }}>
            {tab === 'AR' ? (request.type === 'IMPORT' ? 'شهادة صحية للواردات الغذائية' : 'شهادة صحية للصادرات الغذائية') : request.type === 'IMPORT' ? 'Health Certificate for Food Imports' : 'Health Certificate for Food Exports'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>وزارة الصحة الاتحادية — الحجر الصحي القومي — إدارة رقابة الأغذية</Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1}>
            <CertRow label={tab === 'AR' ? 'رقم الشهادة' : 'Certificate No'} value={cert?.number ?? '—'} />
            <CertRow label={tab === 'AR' ? 'رقم الطلب' : 'Request No'} value={request.number} />
            <CertRow label={tab === 'AR' ? 'المستورد / المصدر' : 'Client'} value={request.client} />
            <CertRow label={tab === 'AR' ? 'تاريخ الإصدار' : 'Issue Date'} value={cert?.issueDate ?? '13/08/2026'} />
            <CertRow label={tab === 'AR' ? 'صادر من' : 'Issued By'} value={cert?.issuedBy ?? '—'} />
          </Stack>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2, p: 1.25, borderRadius: 2, bgcolor: 'rgba(29,111,209,0.06)' }}>
            <Box sx={{ width: 56, height: 56, display: 'grid', placeItems: 'center', border: '1px dashed', borderColor: 'info.main', borderRadius: 1.5 }}>
              <QrCodeIcon sx={{ fontSize: 40, color: 'info.main' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>Digital Verification</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ direction: 'ltr', display: 'block', fontFamily: 'monospace', fontSize: 11, overflowWrap: 'anywhere' }}>
                {cert?.verificationUrl ?? '—'}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ direction: 'ltr', display: 'block', fontFamily: 'monospace', fontSize: 10 }} title={cert?.hash}>{cert?.hash ?? '—'}</Typography>
            </Box>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5, color: 'text.secondary' }}>
          <InfoIcon fontSize="small" color="success" />
          <Typography variant="caption">QR يقود لصفحة تحقق رسمية فقط — دون بيانات حساسة. الشهادة موقعة رقميًا بـ Document Hash.</Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
        <Box sx={{ flexGrow: 1 }} />
        {!cert && (
          <Button variant="contained" color="success" startIcon={<VerifiedIcon />} onClick={() => onClose()}>
            إصدار الشهادة
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

const CertRow = ({ label, value }: { label: string; value: string }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
  </Stack>
);

export default StationManagerDashboardPage;