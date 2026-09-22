import { useCallback, useMemo, useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import HomeIcon from '@mui/icons-material/Home';
import PaidIcon from '@mui/icons-material/Paid';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PrintIcon from '@mui/icons-material/Print';
import PrintReceiptDialog from '../../components/finance/PrintReceiptDialog';
import { foodInvoiceToPrintData } from '../../utils/financeAdapters';
import type { FinanceReceiptPrint } from '../../types/finance';
import {
  createInvoice,
  getAccountingReport,
  getInvoices,
  getShipments,
  payInvoice,
} from '../../api/endpoints/food';
import type {
  AccountingSummaryReport,
  FoodInvoice,
  FoodShipment,
} from '../../types/food';
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
  { key: 'collections', label: 'التحصيل', icon: <PaidIcon /> },
  { key: 'invoices', label: 'الفواتير', icon: <ReceiptLongIcon /> },
  { key: 'receipts', label: 'المدفوعات', icon: <ReceiptIcon /> },
  { key: 'reports', label: 'التقارير', icon: <AssessmentIcon /> },
];

const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
  { value: 'CASH', label: 'نقدي' },
  { value: 'BANK_CARD', label: 'شبكة بنكية' },
  { value: 'BANK_TRANSFER', label: 'تحويل بنكي' },
  { value: 'ELECTRONIC', label: 'إلكتروني' },
];

const methodLabel = (m?: string) => PAYMENT_METHODS.find((p) => p.value === m)?.label || m || '—';

type FeeLine = { name?: string; name_ar?: string; fee?: string; amount?: string | number };

const fmtMoney = (n: string | number | null | undefined) =>
  Number(n ?? 0).toLocaleString('en-US');

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

const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('ar-EG', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const AccountantDashboardPage = () => {
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlView = searchParams.get('view') || 'home';
  const [activeView, setActiveViewState] = useState(urlView);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [report, setReport] = useState<AccountingSummaryReport | null>(null);
  const [pendingShipments, setPendingShipments] = useState<FoodShipment[]>([]);
  const [invoices, setInvoices] = useState<FoodInvoice[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [invoiceTarget, setInvoiceTarget] = useState<FoodShipment | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [payTarget, setPayTarget] = useState<{ shipment: FoodShipment; invoice: FoodInvoice | null } | null>(null);
  const [payForm, setPayForm] = useState({ payment_method: 'CASH', notes: '' });
  const [paying, setPaying] = useState(false);
  const [receiptView, setReceiptView] = useState<FoodInvoice | null>(null);
  const [printData, setPrintData] = useState<FinanceReceiptPrint | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const isDesktop = useMediaQuery('(min-width: 1000px)');

  const setActiveView = useCallback(
    (view: string) => {
      setActiveViewState(view);
      setSearchParams(view === 'home' ? {} : { view }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (urlView && urlView !== activeView) setActiveViewState(urlView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlView]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [repRes, shipRes, invRes] = await Promise.all([
        getAccountingReport(period),
        getShipments({ status: 'FEES_DUE', page_size: 100 }),
        getInvoices({ page_size: 100 }),
      ]);
      setReport(repRes.data.data);
      setPendingShipments(shipRes.data.data.results);
      setInvoices(invRes.data.data.results);
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر تحميل البيانات المالية'));
    } finally {
      setLoadingData(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const invoiceByShipment = useMemo(() => {
    const map: Record<string, FoodInvoice> = {};
    invoices.forEach((inv) => {
      map[inv.shipment_manifest] = inv;
    });
    return map;
  }, [invoices]);

  const counts = useMemo(
    () => ({
      awaiting: report?.pending_count ?? 0,
      paidToday: report?.paid_count ?? 0,
      collected: Number(report?.total_collected ?? 0),
    }),
    [report],
  );

  const openInvoiceFor = (shipment: FoodShipment): FoodInvoice | null =>
    invoices.find((inv) => inv.shipment === shipment.id) ||
    invoiceByShipment[shipment.manifest_number] ||
    null;

  const handleIssueInvoice = async () => {
    if (!invoiceTarget) return;
    setIssuing(true);
    try {
      await createInvoice(invoiceTarget.id, []);
      notifySuccess(`تم إصدار فاتورة للمعاملة ${invoiceTarget.manifest_number}`);
      setInvoiceTarget(null);
      await loadData();
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر إصدار الفاتورة'));
    } finally {
      setIssuing(false);
    }
  };

  const openPayDialog = (shipment: FoodShipment) => {
    setPayForm({ payment_method: 'CASH', notes: '' });
    setPayTarget({ shipment, invoice: openInvoiceFor(shipment) });
  };

  const handleConfirmPay = async () => {
    if (!payTarget) return;
    setPaying(true);
    try {
      const res = await payInvoice(payTarget.shipment.id, {
        payment_method: payForm.payment_method,
        notes: payForm.notes,
      });
      notifySuccess(`تم التحصيل — إيصال ${res.data.data.receipt_number}`);
      setPayTarget(null);
      setActiveView('home');
      await loadData();
    } catch (e) {
      notifyError(getErrMessage(e, 'تعذر تأكيد الدفع'));
    } finally {
      setPaying(false);
    }
  };

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

  const firstName = (user?.full_name || 'المحاسب').split(' ')[0];
  const headerTitle = TAB_ITEMS.find((t) => t.key === activeView)?.label ?? 'لوحة المحاسب';

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
              <PaidIcon fontSize="small" />
            </Box>
            {!navCollapsed && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>التحصيل المالي</Typography>
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
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>لوحة التحصيل المالي — رقابة الأغذية</Typography>
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
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{user?.full_name || 'المحاسب المالي'}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{user?.email || 'Food Control Accountant'}</Typography>
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
          {/* بطاقات الإحصائيات */}
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <KpiCard label="بانتظار التحصيل" value={String(counts.awaiting)} icon={<PaidIcon />} accent="#b98a2e"
                hint="معاملات مستحقة الرسوم" onClick={() => setActiveView('collections')} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <KpiCard label="مدفوعة اليوم" value={String(counts.paidToday)} icon={<CheckCircleIcon />} accent="#1d7a54"
                hint={`خلال ${period === 'day' ? 'اليوم' : period === 'week' ? 'آخر أسبوع' : 'آخر شهر'}`}
                onClick={() => setActiveView('reports')} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <KpiCard label="إجمالي المحصل" value={`${fmtMoney(counts.collected)} SDG`} icon={<TrendingUpIcon />} accent="#1d6fd1"
                hint="مجموع المدفوعات" onClick={() => setActiveView('reports')} />
            </Grid>
          </Grid>

          {/* أحدث المعاملات المالية */}
          <SectionTitle title="أحدث المعاملات المالية" />
          <InvoicesTable invoices={invoices.slice(0, 6)} onView={setReceiptView} />
        </>
      )}

      {activeView === 'collections' && (
        <>
          <SectionTitle title="معاملات بانتظار التحصيل" />
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f6f8fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>رقم المعاملة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المستورد/المصدر</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المنفذ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الفاتورة</TableCell>
                  <TableCell align="left" sx={{ fontWeight: 700 }}>إجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingShipments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                        لا توجد معاملات بانتظار التحصيل حالياً 🎉
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {pendingShipments.map((s) => {
                  const inv = openInvoiceFor(s);
                  return (
                    <TableRow key={s.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{s.manifest_number}</Typography>
                        <Typography variant="caption" color="text.disabled">{fmtDate(s.arrival_date)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={s.shipment_type === 'IMPORT' ? 'وارد' : 'صادر'}
                          color={s.shipment_type === 'IMPORT' ? 'primary' : 'success'} variant="outlined" />
                      </TableCell>
                      <TableCell>{counterpartyOf(s)}</TableCell>
                      <TableCell>
                        <Typography variant="caption">{s.port_name}</Typography>
                      </TableCell>
                      <TableCell>
                        {inv ? (
                          <Stack spacing={0.3}>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>{inv.invoice_number}</Typography>
                            <Typography variant="caption" color="text.secondary">{fmtMoney(inv.total_amount)} SDG</Typography>
                          </Stack>
                        ) : (
                          <Chip size="small" label="بدون فاتورة" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="left">
                        {inv ? (
                          <Button size="small" variant="contained" color="warning" startIcon={<PaidIcon />}
                            onClick={() => openPayDialog(s)} sx={{ borderRadius: 2 }}>
                            تحصيل
                          </Button>
                        ) : (
                          <Button size="small" variant="outlined" startIcon={<ReceiptLongIcon />}
                            onClick={() => setInvoiceTarget(s)} sx={{ borderRadius: 2 }}>
                            إصدار فاتورة
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {activeView === 'invoices' && (
        <>
          <SectionTitle title="فواتير الرسوم" />
          <InvoicesTable invoices={invoices} onView={setReceiptView} showAll />
        </>
      )}

      {activeView === 'receipts' && (
        <>
          <SectionTitle title="سجل المدفوعات" />
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f6f8fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>رقم الإيصال</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الفاتورة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المعاملة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المبلغ (SDG)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>طريقة الدفع</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المحصل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(report?.receipts ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                        لا توجد مدفوعات مسجلة في الفترة المحددة
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {(report?.receipts ?? []).map((r) => (
                  <TableRow key={r.receipt_number} hover>
                    <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{r.receipt_number}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{r.invoice_number}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{r.manifest}</Typography></TableCell>
                    <TableCell>{fmtMoney(r.amount)}</TableCell>
                    <TableCell>{methodLabel(r.payment_method)}</TableCell>
                    <TableCell><Typography variant="caption">{fmtDateTime(r.paid_at)}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{r.paid_by || '—'}</Typography></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {activeView === 'reports' && (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <SectionTitle title="التقرير المالي" inline />
            <TextField
              select size="small" label="الفترة" value={period}
              onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
              sx={{ minWidth: 150, '& fieldset': { borderRadius: 3 } }}
            >
              <MenuItem value="day">اليوم</MenuItem>
              <MenuItem value="week">آخر أسبوع</MenuItem>
              <MenuItem value="month">آخر شهر</MenuItem>
            </TextField>
          </Stack>

          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <KpiCard label="عدد المدفوعات" value={String(report?.paid_count ?? 0)} icon={<ReceiptIcon />} accent="#1d7a54" hint="فاتورة مدفوعة" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <KpiCard label="معلقة" value={String(report?.pending_count ?? 0)} icon={<WarningAmberIcon />} accent="#b98a2e" hint="فاتورة بانتظار الدفع" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <KpiCard label="إجمالي المحصل" value={`${fmtMoney(report?.total_collected)} SDG`} icon={<TrendingUpIcon />} accent="#1d6fd1" hint="خلال الفترة" />
            </Grid>
          </Grid>

          <SectionTitle title="الحركة اليومية للمدفوعات" />
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f6f8fb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>عدد العمليات</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الإجمالي (SDG)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(report?.payments_by_date ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>لا توجد حركة مالية</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {(report?.payments_by_date ?? []).map((row) => (
                  <TableRow key={String(row.date)} hover>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.count}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{fmtMoney(row.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

        </Box>
      </Box>

      {/* نافذة إصدار الفاتورة */}
      <Dialog open={Boolean(invoiceTarget)} onClose={() => setInvoiceTarget(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          إصدار فاتورة رسوم
          <IconButton aria-label="إغلاق" onClick={() => setInvoiceTarget(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {invoiceTarget && (
            <Stack spacing={1.5}>
              <LockedRow label="رقم المعاملة" value={invoiceTarget.manifest_number} />
              <LockedRow label="المستورد/المصدر" value={counterpartyOf(invoiceTarget)} />
              <LockedRow label="عدد العينات المطلوبة" value={String(invoiceTarget.samples_required ?? 0)} />
              <Divider />
              {((invoiceTarget.fee_preview?.lines ?? []) as FeeLine[]).map((line, i) => (
                <FeeRow key={i} label={line.name || line.name_ar || 'بند'} value={`${fmtMoney(line.fee ?? line.amount)} SDG`} />
              ))}
              <Divider />
              <FeeRow label="الإجمالي" value={`${fmtMoney(invoiceTarget.fee_preview?.total)} SDG`} bold />
              <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary', mt: 1 }}>
                <LockIcon fontSize="small" color="disabled" />
                <Typography variant="caption">الرسوم محسوبة تلقائياً من التعرفة — لا يمكن للمحاسب تعديلها.</Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInvoiceTarget(null)}>إلغاء</Button>
          <Button variant="contained" color="success" startIcon={<ReceiptLongIcon />} disabled={issuing} onClick={handleIssueInvoice} sx={{ borderRadius: 2 }}>
            {issuing ? 'جارٍ الإصدار…' : 'إصدار الفاتورة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة تأكيد التحصيل */}
      <Dialog open={Boolean(payTarget)} onClose={() => setPayTarget(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          تأكيد عملية التحصيل
          <IconButton aria-label="إغلاق" onClick={() => setPayTarget(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {payTarget && (
            <Stack spacing={1.5}>
              <LockedRow label="رقم المعاملة" value={payTarget.shipment.manifest_number} />
              <LockedRow label="المستورد/المصدر" value={counterpartyOf(payTarget.shipment)} />
              <LockedRow label="المبلغ المستحق" value={`${fmtMoney(payTarget.invoice?.total_amount)} SDG`} />
              <TextField
                select fullWidth size="small" required label="طريقة الدفع"
                value={payForm.payment_method}
                onChange={(e) => setPayForm((f) => ({ ...f, payment_method: e.target.value }))}
                sx={{ '& fieldset': { borderRadius: 3 } }}
              >
                {PAYMENT_METHODS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth size="small" multiline rows={2} label="ملاحظات (اختياري)"
                value={payForm.notes}
                onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))}
                sx={{ '& fieldset': { borderRadius: 3 } }}
              />
              <Box sx={{ p: 1.25, borderRadius: 2.5, bgcolor: 'rgba(185,138,46,0.08)', border: '1px dashed rgba(185,138,46,0.4)' }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#8a6516' }}>
                  ⚠️ بمجرد التأكيد تتحول الفاتورة إلى «مدفوعة»، يُولد رقم إيصال تلقائياً (RCPT-…)، وتُحال المعاملة إلى مرحلة التفتيش.
                </Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPayTarget(null)}>إلغاء</Button>
          <Button variant="contained" color="success" startIcon={<PaidIcon />} disabled={paying} onClick={handleConfirmPay} sx={{ borderRadius: 2 }}>
            {paying ? 'جارٍ التأكيد…' : 'تأكيد الدفع'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* عرض الفاتورة / الإيصال */}
      <Dialog open={Boolean(receiptView)} onClose={() => setReceiptView(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          فاتورة رسوم
          <IconButton aria-label="إغلاق" onClick={() => setReceiptView(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {receiptView && (
            <Stack spacing={1}>
              <LockedRow label="رقم الفاتورة" value={receiptView.invoice_number} />
              <LockedRow label="رقم المعاملة" value={receiptView.shipment_manifest} />
              <LockedRow label="المُصدر" value={receiptView.issued_by_name || '—'} />
              <Divider />
              {(receiptView.items ?? []).map((it, i) => (
                <FeeRow key={i} label={it.name} value={`${fmtMoney(it.amount)} SDG`} />
              ))}
              <Divider />
              <FeeRow label="الإجمالي" value={`${fmtMoney(receiptView.total_amount)} SDG`} bold />
              <FeeRow label="الحالة" value={receiptView.status === 'PAID' ? '🟢 مدفوعة' : '🟡 بانتظار الدفع'} />
              {receiptView.status === 'PAID' && (
                <>
                  <FeeRow label="رقم الإيصال" value={receiptView.receipt_number} />
                  <FeeRow label="طريقة الدفع" value={methodLabel(receiptView.payment_method)} />
                  <FeeRow label="وقت الدفع" value={fmtDateTime(receiptView.paid_at)} />
                  <FeeRow label="المحصل" value={receiptView.paid_by_name || '—'} />
                </>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {receiptView?.status === 'PAID' && (
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={() => setPrintData(foodInvoiceToPrintData(receiptView))}
            >
              طباعة الإيصال
            </Button>
          )}
          <Button onClick={() => setReceiptView(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
      <PrintReceiptDialog
        open={!!printData}
        onClose={() => setPrintData(null)}
        data={printData}
      />
    </Box>
  );
};

/* ============================ قطع فرعية ============================ */

const SectionTitle = ({ title, inline }: { title: string; inline?: boolean }) => (
  <Typography
    variant="subtitle1"
    sx={{
      fontWeight: 700,
      mb: inline ? 0 : 1.5,
      mt: inline ? 0 : 1,
      display: inline ? 'inline-block' : 'block',
    }}
  >
    {title}
  </Typography>
);

const InvoicesTable = ({
  invoices,
  onView,
  showAll,
}: {
  invoices: FoodInvoice[];
  onView: (inv: FoodInvoice) => void;
  showAll?: boolean;
}) => (
  <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: '#f6f8fb' }}>
          <TableCell sx={{ fontWeight: 700 }}>رقم الفاتورة</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>المعاملة</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>الإجمالي (SDG)</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>تاريخ الإصدار</TableCell>
          <TableCell align="left" sx={{ fontWeight: 700 }}>إجراء</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {invoices.length === 0 && (
          <TableRow>
            <TableCell colSpan={6}>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                لا توجد فواتير {showAll ? '' : 'حديثة '}حالياً
              </Typography>
            </TableCell>
          </TableRow>
        )}
        {invoices.map((inv) => (
          <TableRow key={inv.id} hover>
            <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{inv.invoice_number}</Typography></TableCell>
            <TableCell><Typography variant="caption">{inv.shipment_manifest}</Typography></TableCell>
            <TableCell>{fmtMoney(inv.total_amount)}</TableCell>
            <TableCell>
              <Chip size="small" variant="outlined"
                label={inv.status === 'PAID' ? 'مدفوعة' : 'بانتظار الدفع'}
                color={inv.status === 'PAID' ? 'success' : 'warning'} />
            </TableCell>
            <TableCell><Typography variant="caption">{fmtDate(inv.issued_at)}</Typography></TableCell>
            <TableCell align="left">
              <Button size="small" variant="outlined" startIcon={<ReceiptIcon />} onClick={() => onView(inv)} sx={{ borderRadius: 2 }}>
                عرض
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const LockedRow = ({ label, value }: { label: string; value: string }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 700 }}>{value}</Typography>
  </Stack>
);

const FeeRow = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 500 }}>{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: bold ? 900 : 700 }}>{value}</Typography>
  </Stack>
);

export default AccountantDashboardPage;
