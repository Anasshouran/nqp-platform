import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
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
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaidIcon from '@mui/icons-material/Paid';
import ReceiptIcon from '@mui/icons-material/Receipt';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SecurityIcon from '@mui/icons-material/Security';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import {
  getFinanceSummary,
  getFinanceInvoices,
  getFinancePayments,
  getFinanceReceipts,
  getFinanceFees,
  createFinanceFee,
  updateFinanceFee,
  deactivateFinanceFee,
  getFinanceArrears,
  payFinanceInvoice,
  reviewFinanceInvoice,
  cancelFinanceInvoice,
  refundFinanceInvoice,
} from '../../api/endpoints/finance';
import {
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  SERVICE_TYPE_LABELS,
  type FinanceFee,
  type FinanceInvoice,
  type FinancePayment,
  type FinanceReceipt,
  type OverdueInvoice,
} from '../../types/finance';
import KpiCard from '../../components/dashboard/KpiCard';
import SectionTitle from '../../components/common/SectionTitle';
import EmptyState from '../../components/common/EmptyState';
import PrintReceiptDialog from '../../components/finance/PrintReceiptDialog';
import ReconciliationView from '../../components/finance/ReconciliationView';
import ReportsView from '../../components/finance/ReportsView';
import AuditLogsView from '../../components/finance/AuditLogsView';
import type { AxiosError } from 'axios';
import { notifySuccess } from '../../utils/toast';
import { useAuth } from '../../hooks/useAuth';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../store/store';
import { logout as logoutApi } from '../../api/endpoints/auth';
import { logout } from '../../store/slices/authSlice';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'default',
  ISSUED: 'info',
  PENDING_PAYMENT: 'warning',
  PARTIAL: 'warning',
  PAID: 'success',
  RECONCILED: 'success',
  CANCELLED: 'default',
  REFUNDED: 'secondary',
  OVERDUE: 'error',
} as const;

const fmtMoney = (v: string | number | null | undefined) =>
  new Intl.NumberFormat('ar-SD').format(Number(v ?? 0));

const shortId = (id?: string | null) => (id ? id.slice(0, 8).toUpperCase() : '—');

const statusLabel = (s?: string) => INVOICE_STATUS_LABELS[s ?? ''] ?? s ?? '—';
const serviceLabel = (s?: string) => SERVICE_TYPE_LABELS[s ?? ''] ?? s ?? '—';
const methodLabel = (m?: string) => PAYMENT_METHOD_LABELS[m ?? ''] ?? m ?? '—';

interface Filters {
  status: string;
  sector: string;
  service_type: string;
}

const emptyFilters: Filters = { status: '', sector: '', service_type: '' };

export default function NationalFinancePage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const dispatch = useDispatch<AppDispatch>();
  const isDesktop = useMediaQuery('(min-width:900px)');

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<HTMLElement | null>(null);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<string>('home');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [summary, setSummary] = useState<{
    today: { collected: number; count: number };
    revenue: { total: number; count: number };
    pending_count: number;
    overdue: { count: number; amount: number };
    funnel: Record<string, number>;
  } | null>(null);
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [payments, setPayments] = useState<FinancePayment[]>([]);
  const [receipts, setReceipts] = useState<FinanceReceipt[]>([]);
  const [fees, setFees] = useState<FinanceFee[]>([]);
  const [arrears, setArrears] = useState<OverdueInvoice[]>([]);
  const [arrearsTotal, setArrearsTotal] = useState(0);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const [invoiceDetail, setInvoiceDetail] = useState<FinanceInvoice | null>(null);
  const [payTarget, setPayTarget] = useState<FinanceInvoice | null>(null);
  const [payForm, setPayForm] = useState({ method: 'CASH', notes: '', gateway_ref: '', amount: '' });
  const [cancelTarget, setCancelTarget] = useState<FinanceInvoice | null>(null);
  const [refundTarget, setRefundTarget] = useState<FinanceInvoice | null>(null);
  const [reason, setReason] = useState('');
  const [feeDialog, setFeeDialog] = useState<{ mode: 'create' | 'edit'; fee: Partial<FinanceFee> } | null>(null);
  const [feeForm, setFeeForm] = useState<Partial<FinanceFee>>({});
  const [printTarget, setPrintTarget] = useState<{ receipt: FinanceReceipt; invoice?: FinanceInvoice; payment?: FinancePayment } | null>(null);

  const notifyError = useCallback((e: AxiosError<{ message?: string }>) => {
    const msg = (e.response?.data as { message?: string } | undefined)?.message;
    setErrorMsg(msg || e.message || t('finance.messages.errorOccurred'));
    window.setTimeout(() => setErrorMsg(''), 6000);
  }, [t]);

  const loadSummary = useCallback(async () => {
    const res = await getFinanceSummary();
    setSummary(res.data.data);
  }, []);

  const loadInvoices = useCallback(async (f: Filters) => {
    const params: Record<string, unknown> = { page_size: 100 };
    if (f.status) params.status = f.status;
    if (f.sector) params.sector = f.sector;
    if (f.service_type) params.service_type = f.service_type;
    const res = await getFinanceInvoices(params);
    setInvoices(res.data.data.results ?? []);
  }, []);

  const loadPayments = useCallback(async () => {
    const res = await getFinancePayments({ page_size: 100 });
    setPayments(res.data.data.results ?? []);
  }, []);

  const loadReceipts = useCallback(async () => {
    const res = await getFinanceReceipts({ page_size: 100 });
    setReceipts(res.data.data.results ?? []);
  }, []);

  const loadFees = useCallback(async () => {
    const res = await getFinanceFees({ page_size: 200 });
    setFees(res.data.data.results ?? []);
  }, []);

  const loadReports = useCallback(async () => {
    const a = await getFinanceArrears();
    setArrears(a.data.data.items ?? []);
    setArrearsTotal(a.data.data.total ?? 0);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await Promise.all([loadSummary(), loadInvoices(filters), loadPayments(), loadReceipts(), loadFees(), loadReports()]);
    } catch (e) {
      notifyError(e as AxiosError<{ message?: string }>);
    } finally {
      setLoading(false);
    }
  }, [filters, loadSummary, loadInvoices, loadPayments, loadReceipts, loadFees, loadReports, notifyError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    loadInvoices(filters);
  }, [filters, loadInvoices]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) await logoutApi(refreshToken);
    } catch {
      /* تجاهل */
    }
    dispatch(logout());
    navigate('/login', { replace: true });
  };

  const handlePay = async () => {
    if (!payTarget) return;
    const balance = Number(payTarget.balance_due);
    const amountNum = payForm.amount === '' ? balance : Number(payForm.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      notifyError({ response: { data: { message: t('finance.messages.amountMustBePositive') } } } as AxiosError<{ message?: string }>);
      return;
    }
    if (amountNum > balance) {
      notifyError({ response: { data: { message: t('finance.messages.amountExceedsRemaining') } } } as AxiosError<{ message?: string }>);
      return;
    }
    try {
      const payload = { ...payForm, amount: amountNum };
      const res = await payFinanceInvoice(payTarget.id, payload);
      setInvoiceDetail(null);
      setPayTarget(null);
      setPayForm({ method: 'CASH', notes: '', gateway_ref: '', amount: '' });
      await refresh();
      const r = res.data.data.receipts?.[0];
      if (r) {
        setPrintTarget({ receipt: r, invoice: res.data.data, payment: res.data.data.payments?.[0] });
      } else if (res.data.data.receipt_number) {
        notifySuccess(t('finance.messages.collectionSuccess', { receipt: res.data.data.receipt_number }));
      }
    } catch (e) {
      notifyError(e as AxiosError<{ message?: string }>);
    }
  };

  const handleReview = async (id: string) => {
    try {
      await reviewFinanceInvoice(id);
      await refresh();
    } catch (e) {
      notifyError(e as AxiosError<{ message?: string }>);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelFinanceInvoice(cancelTarget.id, { reason });
      setCancelTarget(null);
      setReason('');
      await refresh();
    } catch (e) {
      notifyError(e as AxiosError<{ message?: string }>);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    try {
      await refundFinanceInvoice(refundTarget.id, { reason });
      setRefundTarget(null);
      setReason('');
      await refresh();
    } catch (e) {
      notifyError(e as AxiosError<{ message?: string }>);
    }
  };

  const handleFeeDialogOpen = (mode: 'create' | 'edit', fee?: FinanceFee) => {
    setFeeDialog({ mode, fee: fee ?? {} });
    setFeeForm(
      fee ?? {
        service_type: 'FOOD_CONTROL',
        currency: 'SDG',
        is_active: true,
        year: new Date().getFullYear(),
        amount_sdg: '',
        amount_usd: '',
        effective_from: new Date().toISOString().slice(0, 10),
      },
    );
  };

  const handleFeeSave = async () => {
    if (!feeDialog) return;
    try {
      if (feeDialog.mode === 'create') await createFinanceFee(feeForm);
      else await updateFinanceFee(feeDialog.fee?.id ?? '', feeForm);
      setFeeDialog(null);
      await loadFees();
    } catch (e) {
      notifyError(e as AxiosError<{ message?: string }>);
    }
  };

  const handleFeeDeactivate = async (id: string) => {
    try {
      await deactivateFinanceFee(id);
      await loadFees();
    } catch (e) {
      notifyError(e as AxiosError<{ message?: string }>);
    }
  };

  const paidQueue = useMemo(() => invoices.filter((i) => i.status === 'PAID'), [invoices]);

  const navItems = (collapsed: boolean) => {
    const items = [
      { key: 'home', label: t('finance.nav.home'), icon: <HomeIcon /> },
      { key: 'invoices', label: t('finance.nav.invoices'), icon: <ReceiptLongIcon /> },
      { key: 'collections', label: t('finance.nav.collections'), icon: <PaidIcon /> },
      { key: 'review', label: t('finance.nav.review'), icon: <FactCheckIcon /> },
      { key: 'reconcile', label: t('finance.nav.reconcile'), icon: <SyncAltIcon /> },
      { key: 'fees', label: t('finance.nav.fees'), icon: <RequestQuoteIcon /> },
      { key: 'reports', label: t('finance.nav.reports'), icon: <AssessmentIcon /> },
      { key: 'arrears', label: t('finance.nav.arrears'), icon: <WarningAmberIcon /> },
      { key: 'audit', label: t('finance.nav.audit'), icon: <SecurityIcon /> },
    ];
    return (
      <Stack spacing={0.5} sx={{ p: 1 }}>
        {items.map((it) => {
          const active = activeView === it.key;
          return (
            <Button
              key={it.key}
              startIcon={!collapsed ? it.icon : undefined}
              onClick={() => {
                setActiveView(it.key);
                if (!isDesktop) setMobileNavOpen(false);
              }}
              sx={{
                justifyContent: collapsed ? 'center' : 'flex-start',
                minWidth: 0,
                px: collapsed ? 1 : 1.5,
                py: 1,
                borderRadius: 2,
                color: active ? 'primary.main' : 'text.primary',
                bgcolor: active ? 'primary.soft' : 'transparent',
                fontWeight: active ? 800 : 600,
                '& .MuiButton-startIcon': { mr: 1.25 },
              }}
            >
              {it.label}
            </Button>
          );
        })}
      </Stack>
    );
  };

  const statusChip = (status: string) => (
    <Chip
      size="small"
      label={statusLabel(status)}
      color={STATUS_COLORS[status] as 'default' | 'info' | 'warning' | 'success' | 'secondary' | 'error'}
      variant={status === 'PAID' || status === 'RECONCILED' ? 'filled' : 'outlined'}
    />
  );

  const headerTitle = useMemo(
    () =>
      ({
        home: t('finance.pageHeader.home'),
        invoices: t('finance.pageHeader.invoices'),
        collections: t('finance.pageHeader.collections'),
        review: t('finance.pageHeader.review'),
        fees: t('finance.pageHeader.fees'),
        reports: t('finance.pageHeader.reports'),
        arrears: t('finance.pageHeader.arrears'),
        audit: t('finance.pageHeader.audit'),
      })[activeView] ?? t('finance.pageHeader.default'),
    [activeView, t],
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
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
            borderRight: '1px solid',
            borderRightColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s ease',
            zIndex: 1200,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: navCollapsed ? 1 : 1.75, py: 1.5, minHeight: 64, borderBottom: '1px solid', borderBottomColor: 'divider', flexShrink: 0 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'primary.main', flexShrink: 0 }}>
              <SyncAltIcon fontSize="small" />
            </Box>
            {!navCollapsed && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{t('finance.sidebar.title')}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>{t('finance.sidebar.subtitle')}</Typography>
              </Box>
            )}
          </Stack>

          <Stack sx={{ flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
            {navItems(navCollapsed)}
          </Stack>

          <Stack direction="row" justifyContent="center" sx={{ p: 1, borderTop: '1px solid', borderTopColor: 'divider', flexShrink: 0 }}>
            <Tooltip title={navCollapsed ? t('finance.sidebar.expand') : t('finance.sidebar.collapse')}>
              <IconButton onClick={() => setNavCollapsed((v) => !v)} size="small" aria-label={navCollapsed ? t('finance.sidebar.expandSidebar') : t('finance.sidebar.collapseSidebar')} sx={{ borderRadius: 2 }}>
                <MenuOpenIcon sx={{ transform: navCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      )}

      <Drawer open={!isDesktop && mobileNavOpen} onClose={() => setMobileNavOpen(false)} anchor="left" PaperProps={{ sx: { width: 252 } }}>
        <Box sx={{ py: 1.5 }}>
          {navItems(false)}
        </Box>
      </Drawer>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Paper elevation={0} component="header" sx={{ position: 'sticky', top: 0, zIndex: 1100, borderRadius: 0, borderBottom: '1px solid', borderBottomColor: 'divider', bgcolor: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(6px)' }}>
          <Stack direction="row" alignItems="center" spacing={1.25} useFlexGap flexWrap="wrap" sx={{ px: { xs: 1.5, md: 2 }, py: 1, minHeight: 64 }}>
            {!isDesktop && (
              <IconButton size="small" onClick={() => setMobileNavOpen(true)} aria-label={t('finance.sidebar.openMenu')} sx={{ borderRadius: 2 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: 18, sm: 22 } }} noWrap>{headerTitle}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{t('finance.sidebar.platformTitle')}</Typography>
            </Box>
            <Chip size="small" color={loading ? 'default' : 'success'} icon={loading ? <WarningAmberIcon /> : <CheckCircleIcon />} label={loading ? t('finance.sidebar.loading') : t('finance.sidebar.dataUpdated')} variant="outlined" />
            <Tooltip title={t('finance.sidebar.refresh')}>
              <IconButton onClick={refresh} aria-label={t('finance.sidebar.refreshData')} sx={{ borderRadius: 2 }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('finance.sidebar.profile')}>
              <IconButton aria-label={t('finance.sidebar.userMenu')} onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ p: 0.5, borderRadius: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 15, fontWeight: 700 }}>
                  {(user?.full_name || t('finance.sidebar.defaultInitial')).charAt(0)}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={() => setUserMenuAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 1.5, borderRadius: 3, minWidth: 220 } } }}>
              <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700 }}>{(user?.full_name || user?.email || t('finance.sidebar.unknownInitial')).charAt(0)}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{user?.full_name || t('finance.sidebar.defaultName')}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{user?.email || 'Accounts Management'}</Typography>
                </Box>
              </Box>
              <Divider />
              <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/app/account'); }} sx={{ fontWeight: 700 }}>
                <AccountCircleIcon fontSize="small" sx={{ mr: 1.25, color: 'text.secondary' }} /> {t('finance.sidebar.profile')}
              </MenuItem>
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontWeight: 700 }}>
                <LogoutIcon fontSize="small" sx={{ mr: 1.25 }} /> {t('finance.sidebar.logout')}
              </MenuItem>
            </Menu>
          </Stack>
        </Paper>

        {errorMsg && (
          <Box sx={{ px: { xs: 1.75, md: 2.5 }, pt: 1.5 }}>
            <Paper
              elevation={0}
              role="alert"
              sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: 'error.soft', color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <ErrorOutlineIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{errorMsg}</Typography>
            </Paper>
          </Box>
        )}

        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 1.75, md: 2.5 }, maxWidth: 1440, width: '100%', mx: 'auto' }}>
          {activeView === 'home' && (
            <>
              <Grid container spacing={1.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <KpiCard label={t('finance.kpi.totalRevenue')} value={`${fmtMoney(summary?.revenue.total)}`} trend={{ label: t('finance.kpi.paidInvoices', { count: fmtMoney(summary?.revenue.count) }) }} icon={<TrendMoneyIcon />} accent="primary.main" onClick={() => setActiveView('reports')} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KpiCard label={t('finance.kpi.collectedToday')} value={fmtMoney(summary?.today.collected)} trend={{ label: t('finance.kpi.transactions', { count: fmtMoney(summary?.today.count) }) }} icon={<PaidIcon />} accent="success.main" onClick={() => setActiveView('collections')} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KpiCard label={t('finance.kpi.pendingPayment')} value={fmtMoney(summary?.pending_count)} trend={{ label: t('finance.kpi.unpaidInvoices') }} icon={<ReceiptLongIcon />} accent="warning.main" onClick={() => setActiveView('invoices')} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <KpiCard label={t('finance.kpi.overdue')} value={fmtMoney(summary?.overdue.count)} trend={{ label: t('finance.kpi.overdueAmount', { amount: fmtMoney(summary?.overdue.amount) }) }} icon={<WarningAmberIcon />} accent="error.main" onClick={() => setActiveView('arrears')} />
                </Grid>
              </Grid>

              <SectionTitle title={t('finance.dashboard.title')} subtitle={t('finance.dashboard.subtitle')} />
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={5}>
                  <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>{t('finance.dashboard.invoiceCycle')}</Typography>
                      {summary?.funnel && Object.keys(summary.funnel).length > 0 ? (
                        <Stack spacing={1} divider={<Divider />}>
                          {Object.entries(summary.funnel).map(([k, v]) => (
                            <Stack key={k} direction="row" alignItems="center" justifyContent="space-between">
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {statusChip(k)}
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v}</Typography>
                            </Stack>
                          ))}
                        </Stack>
                      ) : ProcessNull()
                      }
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={7}>
                  <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>{t('finance.dashboard.recentReceipts')}</Typography>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>{t('finance.columns.receiptNumber')}</TableCell>
                              <TableCell>{t('finance.columns.invoice')}</TableCell>
                              <TableCell>{t('finance.columns.amount')}</TableCell>
                              <TableCell>{t('finance.columns.method')}</TableCell>
                              <TableCell>{t('finance.columns.time')}</TableCell>
                              <TableCell align="center"></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {receipts.slice(0, 8).map((r) => {
                              const pmt = payments.find((p) => p.id === r.payment);
                              const inv = invoices.find((i) => i.id === r.invoice);
                              return (
                                <TableRow key={r.id}>
                                  <TableCell sx={{ fontWeight: 700 }}>{r.receipt_number}</TableCell>
                                  <TableCell>{inv?.invoice_number ?? shortId(r.invoice)}</TableCell>
                                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(r.amount)}</TableCell>
                                  <TableCell>{pmt ? methodLabel(pmt.method) : '—'}</TableCell>
                                  <TableCell>{new Date(r.issued_at).toLocaleString('ar-SD')}</TableCell>
                                  <TableCell align="center">
                                    <IconButton size="small" aria-label={t('finance.actions.printReceipt')} onClick={() => setPrintTarget({ receipt: r })}>
                                      <PrintIcon fontSize="small" />
                                    </IconButton>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {receipts.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={6}>{ProcessNull()}</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}

          {activeView === 'invoices' && (
            <>
              <SectionTitle title={t('finance.invoices.unifiedTitle')} subtitle={t('finance.invoices.unifiedSubtitle')} />
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
                <TextField
                  select label={t('finance.filters.status')} size="small" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} sx={{ minWidth: 170 }}>
                  <MenuItem value="">{t('finance.filters.all')}</MenuItem>
                  {Object.entries(INVOICE_STATUS_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  select label={t('finance.filters.service')} size="small" value={filters.service_type} onChange={(e) => setFilters((f) => ({ ...f, service_type: e.target.value }))} sx={{ minWidth: 170 }}>
                  <MenuItem value="">{t('finance.filters.all')}</MenuItem>
                  {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v}</MenuItem>
                  ))}
                </TextField>
              </Stack>
              <InvoicesTable invoices={invoices} onView={setInvoiceDetail} onPay={setPayTarget} onCancel={setCancelTarget} onRefund={setRefundTarget} />
            </>
          )}

          {activeView === 'collections' && (
            <>
              <SectionTitle title={t('finance.collections.title')} subtitle={t('finance.collections.subtitle')} />
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>{t('finance.collections.payments')}</Typography>
                      <PaymentsTable payments={payments} />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>{t('finance.collections.receipts')}</Typography>
                      <ReceiptsTable receipts={receipts} onPrint={(r) => setPrintTarget({ receipt: r })} />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}

          {activeView === 'review' && (
            <>
              <SectionTitle title={t('finance.review.title')} subtitle={t('finance.review.subtitle')} />
              {paidQueue.length === 0 ? (
                <EmptyState icon={<FactCheckIcon />} title={t('finance.review.emptyTitle')} description={t('finance.review.emptyDescription')} />
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('finance.columns.invoice')}</TableCell>
                        <TableCell>{t('finance.columns.request')}</TableCell>
                        <TableCell>{t('finance.columns.net')}</TableCell>
                        <TableCell>{t('finance.columns.collect')}</TableCell>
                        <TableCell align="center">{t('finance.columns.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paidQueue.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell sx={{ fontWeight: 700 }}>{inv.invoice_number}</TableCell>
                          <TableCell>{inv.request_ref || '—'}</TableCell>
                          <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(inv.net_amount)} {inv.currency}</TableCell>
                          <TableCell>{inv.receipts[0]?.receipt_number ? (
                            <Chip size="small" icon={<ReceiptIcon />} label={inv.receipts[0].receipt_number} variant="outlined" />
                          ) : '—'}</TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <Button size="small" variant="contained" color="success" onClick={() => handleReview(inv.id)}>
                                {t('finance.actions.approveSettlement')}
                              </Button>
                              <Button size="small" variant="outlined" onClick={() => setInvoiceDetail(inv)}>
                                {t('finance.actions.details')}
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}

          {activeView === 'reconcile' && <ReconciliationView />}

          {activeView === 'arrears' && (
            <>
              <SectionTitle title={t('finance.arrears.title')} subtitle={t('finance.arrears.subtitle', { amount: fmtMoney(arrearsTotal) })} />
              <ArrearsTable items={arrears} onView={(id) => {
                const inv = invoices.find((i) => i.id === id);
                if (inv) setInvoiceDetail(inv);
              }} />
            </>
          )}

          {activeView === 'fees' && (
            <>
              <SectionTitle title={t('finance.fees.title')} subtitle={t('finance.fees.subtitle')} />
              <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleFeeDialogOpen('create')}>
                  {t('finance.fees.addFee')}
                </Button>
              </Stack>
              <FeesTable
                fees={fees}
                onEdit={(fee) => handleFeeDialogOpen('edit', fee)}
                onDeactivate={handleFeeDeactivate}
              />
            </>
          )}

          {activeView === 'reports' && <ReportsView />}

          {activeView === 'audit' && <AuditLogsView />}
        </Box>
      </Box>

      {/* حوار الفاتورة */}
      <Dialog open={Boolean(invoiceDetail)} onClose={() => setInvoiceDetail(null)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        {invoiceDetail && <InvoiceDetailDialog invoice={invoiceDetail} onClose={() => setInvoiceDetail(null)} onPay={setPayTarget} onPrint={(r) => setPrintTarget({ receipt: r, invoice: invoiceDetail, payment: invoiceDetail.payments?.[0] })} />}
      </Dialog>

      {/* حوار الدفع */}
      <Dialog open={Boolean(payTarget)} onClose={() => setPayTarget(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{t('finance.dialogs.collectInvoice', { number: payTarget?.invoice_number })}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('finance.dialogs.net')}</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700 }}>{fmtMoney(payTarget?.net_amount)} {payTarget?.currency}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('finance.dialogs.collected')}</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'success.main' }}>{fmtMoney(payTarget?.paid_amount)} {payTarget?.currency}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('finance.dialogs.remaining')}</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: 'error.main' }}>{fmtMoney(payTarget?.balance_due)} {payTarget?.currency}</Typography>
              </Box>
            </Stack>
            <TextField
              label={t('finance.dialogs.paymentAmount', { remaining: fmtMoney(payTarget?.balance_due), currency: payTarget?.currency })}
              type="number"
              value={payForm.amount === '' ? (payTarget?.balance_due ?? '') : payForm.amount}
              onChange={(e) => setPayForm((p) => ({ ...p, amount: e.target.value }))}
              fullWidth
              inputProps={{ min: 0, max: Number(payTarget?.balance_due || 0), step: 0.01 }}
            />
            <TextField
              select label={t('finance.dialogs.paymentMethod')} value={payForm.method} onChange={(e) => setPayForm((p) => ({ ...p, method: e.target.value }))}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </TextField>
            <TextField label={t('finance.dialogs.gatewayRef')} value={payForm.gateway_ref} onChange={(e) => setPayForm((p) => ({ ...p, gateway_ref: e.target.value }))} fullWidth />
            <TextField label={t('finance.dialogs.collectionNotes')} value={payForm.notes} onChange={(e) => setPayForm((p) => ({ ...p, notes: e.target.value }))} fullWidth multiline minRows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPayTarget(null)}>{t('finance.actions.cancel')}</Button>
          <Button variant="contained" color="success" startIcon={<PaidIcon />} onClick={handlePay}>{t('finance.actions.confirmCollection')}</Button>
        </DialogActions>
      </Dialog>

      {/* حوار الإلغاء */}
      <ConfirmActionDialog
        open={Boolean(cancelTarget)}
        onClose={() => { setCancelTarget(null); setReason(''); }}
        onConfirm={handleCancel}
        title={t('finance.dialogs.cancelInvoice', { number: cancelTarget?.invoice_number ?? '' })}
        subtitle={t('finance.dialogs.cancelSubtitle')}
        confirmColor="error"
        confirmLabel={t('finance.dialogs.approveCancellation')}
        value={reason}
        onChange={setReason}
      />

      {/* حوار الاسترداد */}
      <ConfirmActionDialog
        open={Boolean(refundTarget)}
        onClose={() => { setRefundTarget(null); setReason(''); }}
        onConfirm={handleRefund}
        title={t('finance.dialogs.refundInvoice', { number: refundTarget?.invoice_number ?? '' })}
        subtitle={t('finance.dialogs.refundSubtitle')}
        confirmColor="secondary"
        confirmLabel={t('finance.dialogs.approveRefund')}
        value={reason}
        onChange={setReason}
      />

      {/* حوار بنود الرسوم */}
      <Dialog open={Boolean(feeDialog)} onClose={() => setFeeDialog(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{feeDialog?.mode === 'edit' ? t('finance.fees.editFee') : t('finance.fees.addFee')}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label={t('finance.fees.nameAr')} value={feeForm.name_ar ?? ''} onChange={(e) => setFeeForm((f) => ({ ...f, name_ar: e.target.value }))} fullWidth required />
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              <TextField select label={t('finance.fees.serviceType')} value={feeForm.service_type ?? 'FOOD_CONTROL'} onChange={(e) => setFeeForm((f) => ({ ...f, service_type: e.target.value }))} sx={{ minWidth: 180 }}>
                {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
              <TextField label={t('finance.fees.code')} value={feeForm.code ?? ''} onChange={(e) => setFeeForm((f) => ({ ...f, code: e.target.value }))} sx={{ minWidth: 140 }} />
            </Stack>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              <TextField label={t('finance.fees.amountSdg')} type="number" value={feeForm.amount_sdg ?? ''} onChange={(e) => setFeeForm((f) => ({ ...f, amount_sdg: e.target.value }))} sx={{ minWidth: 160 }} />
              <TextField label={t('finance.fees.amountUsd')} type="number" value={feeForm.amount_usd ?? ''} onChange={(e) => setFeeForm((f) => ({ ...f, amount_usd: e.target.value }))} sx={{ minWidth: 160 }} />
            </Stack>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
              <TextField label={t('finance.fees.effectiveFrom')} type="date" value={feeForm.effective_from ?? ''} onChange={(e) => setFeeForm((f) => ({ ...f, effective_from: e.target.value }))} sx={{ minWidth: 160 }} />
              <TextField label={t('finance.fees.effectiveTo')} type="date" value={feeForm.effective_to ?? ''} onChange={(e) => setFeeForm((f) => ({ ...f, effective_to: e.target.value || null }))} sx={{ minWidth: 170 }} />
              <TextField label={t('finance.fees.year')} type="number" value={feeForm.year ?? new Date().getFullYear()} onChange={(e) => setFeeForm((f) => ({ ...f, year: Number(e.target.value) }))} sx={{ minWidth: 100 }} />
            </Stack>
            <TextField label={t('finance.fees.approvedBy')} value={feeForm.approved_by ?? ''} onChange={(e) => setFeeForm((f) => ({ ...f, approved_by: e.target.value }))} fullWidth />
            <TextField label={t('finance.fees.legalReference')} value={feeForm.legal_reference ?? ''} onChange={(e) => setFeeForm((f) => ({ ...f, legal_reference: e.target.value }))} fullWidth />
            <TextField label={t('finance.fees.unit')} value={feeForm.unit ?? ''} onChange={(e) => setFeeForm((f) => ({ ...f, unit: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setFeeDialog(null)}>{t('finance.actions.cancel')}</Button>
          <Button variant="contained" startIcon={<CheckCircleIcon />} onClick={handleFeeSave}>{t('finance.actions.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* حوار طباعة الإيصال الإلكتروني */}
      <PrintReceiptDialog
        open={Boolean(printTarget)}
        onClose={() => setPrintTarget(null)}
        receipt={printTarget?.receipt ?? null}
        invoice={printTarget?.invoice}
        payment={printTarget?.payment}
      />
    </Box>
  );
}

const TrendMoneyIcon = PaidIcon;

function ProcessNull(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
      {t('finance.empty.noDataYet')}
    </Typography>
  );
}

/* ============================ جداول و مكوّنات ============================ */

function InvoicesTable({ invoices, onView, onPay, onCancel, onRefund }: {
  invoices: FinanceInvoice[];
  onView: (i: FinanceInvoice) => void;
  onPay: (i: FinanceInvoice) => void;
  onCancel: (i: FinanceInvoice) => void;
  onRefund: (i: FinanceInvoice) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('finance.columns.invoice')}</TableCell>
            <TableCell>{t('finance.columns.order')}</TableCell>
            <TableCell>{t('finance.columns.service')}</TableCell>
            <TableCell>{t('finance.columns.net')}</TableCell>
            <TableCell>{t('finance.columns.paidRemaining')}</TableCell>
            <TableCell>{t('finance.columns.status')}</TableCell>
            <TableCell>{t('finance.columns.dueDate')}</TableCell>
            <TableCell align="center">{t('finance.columns.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoices.map((inv) => (
            <TableRow key={inv.id} hover>
              <TableCell sx={{ fontWeight: 700 }}>{inv.invoice_number}</TableCell>
              <TableCell>{inv.request_ref || '—'}</TableCell>
              <TableCell>{serviceLabel(inv.service_type)}</TableCell>
              <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(inv.net_amount)} {inv.currency}</TableCell>
              <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmtMoney(inv.paid_amount)}</Typography>
                  {Number(inv.balance_due) > 0 && (
                    <Typography variant="caption" color="error.main">{t('finance.arrears.remaining', { amount: fmtMoney(inv.balance_due) })}</Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>{statusChipLocal(inv.status)}</TableCell>
              <TableCell>{inv.due_date ? new Date(inv.due_date).toLocaleDateString('ar-SD') : '—'}</TableCell>
              <TableCell align="center">
                <Stack direction="row" spacing={0.5} justifyContent="center" useFlexGap flexWrap="wrap">
                  <Button size="small" onClick={() => onView(inv)}>{t('finance.actions.details')}</Button>
                  {(inv.status === 'PENDING_PAYMENT' || inv.status === 'OVERDUE' || inv.status === 'ISSUED' || inv.status === 'PARTIAL') && (
                    <Button size="small" variant="contained" color="success" startIcon={<PaidIcon />} onClick={() => onPay(inv)}>
                      {inv.status === 'PARTIAL' ? t('finance.payments.extraPayment') : t('finance.payments.collect')}
                    </Button>
                  )}
                  {(inv.status === 'PAID' || inv.status === 'PARTIAL') && (
                    <Button size="small" variant="outlined" color="error" onClick={() => onRefund(inv)}>{t('finance.actions.refund')}</Button>
                  )}
                  {inv.status !== 'PAID' && inv.status !== 'RECONCILED' && inv.status !== 'CANCELLED' && inv.status !== 'REFUNDED' && inv.status !== 'PARTIAL' && (
                    <Button size="small" color="error" onClick={() => onCancel(inv)}>{t('finance.actions.cancel')}</Button>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
          {invoices.length === 0 && (
            <TableRow>
              <TableCell colSpan={8}>{ProcessNull()}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function statusChipLocal(status: string): React.JSX.Element {
  return (
    <Chip
      size="small"
      label={statusLabel(status)}
      color={STATUS_COLORS[status] as 'default' | 'info' | 'warning' | 'success' | 'secondary' | 'error'}
      variant={status === 'PAID' || status === 'RECONCILED' ? 'filled' : 'outlined'}
    />
  );
}

function PaymentsTable({ payments }: { payments: FinancePayment[] }): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('finance.columns.invoice')}</TableCell>
            <TableCell>{t('finance.columns.method')}</TableCell>
            <TableCell>{t('finance.columns.amount')}</TableCell>
            <TableCell>{t('finance.columns.status')}</TableCell>
            <TableCell>{t('finance.columns.reference')}</TableCell>
            <TableCell>{t('finance.columns.time')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell sx={{ fontWeight: 700 }}>{shortId(p.invoice)}</TableCell>
              <TableCell>{methodLabel(p.method)}</TableCell>
              <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(p.amount)} {p.currency}</TableCell>
              <TableCell>
                <Chip size="small" color={p.gateway_status === 'CONFIRMED' ? 'success' : 'warning'} label={p.gateway_status === 'CONFIRMED' ? t('finance.payments.confirmed') : p.gateway_status} variant="outlined" />
              </TableCell>
              <TableCell>
                {p.gateway_ref ? (
                  <Tooltip title={`${p.gateway_ref}${p.notes ? ` — ${p.notes}` : ''}`}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.gateway_ref}</Typography>
                  </Tooltip>
                ) : (
                  <Typography variant="caption" color="text.secondary">—</Typography>
                )}
              </TableCell>
              <TableCell>{new Date(p.collected_at).toLocaleString('ar-SD')}</TableCell>
            </TableRow>
          ))}
          {payments.length === 0 && (
            <TableRow><TableCell colSpan={6}>{ProcessNull()}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ReceiptsTable({ receipts, onPrint }: { receipts: FinanceReceipt[]; onPrint?: (r: FinanceReceipt) => void }): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('finance.columns.receiptNumber')}</TableCell>
            <TableCell>{t('finance.columns.amount')}</TableCell>
            <TableCell>{t('finance.columns.issuedAt')}</TableCell>
            <TableCell>{t('finance.columns.verificationCode')}</TableCell>
            {onPrint && <TableCell align="center"></TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {receipts.map((r) => (
            <TableRow key={r.id}>
              <TableCell sx={{ fontWeight: 700 }}>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <ReceiptIcon fontSize="small" color="action" />
                  {r.receipt_number}
                </Stack>
              </TableCell>
              <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(r.amount)} {r.currency}</TableCell>
              <TableCell>{new Date(r.issued_at).toLocaleString('ar-SD')}</TableCell>
              <TableCell>
                <Tooltip title={r.verification_code}>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{shortId(r.verification_code)}</Typography>
                </Tooltip>
              </TableCell>
              {onPrint && (
                <TableCell align="center">
                  <IconButton size="small" aria-label={t('finance.actions.printReceipt')} onClick={() => onPrint(r)}>
                    <PrintIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
          {receipts.length === 0 && (
            <TableRow><TableCell colSpan={onPrint ? 5 : 4}>{ProcessNull()}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ArrearsTable({ items, onView }: { items: OverdueInvoice[]; onView: (id: string) => void }): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('finance.columns.invoice')}</TableCell>
            <TableCell>{t('finance.columns.order')}</TableCell>
            <TableCell>{t('finance.columns.beneficiary')}</TableCell>
            <TableCell>{t('finance.columns.amount')}</TableCell>
            <TableCell>{t('finance.columns.dueDate')}</TableCell>
            <TableCell>{t('finance.columns.daysOverdue')}</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((a) => (
            <TableRow key={a.id} hover>
              <TableCell sx={{ fontWeight: 700 }}>{a.invoice_number}</TableCell>
              <TableCell>{a.request_ref || '—'}</TableCell>
              <TableCell>{a.customer || '—'}</TableCell>
              <TableCell sx={{ fontVariantNumeric: 'tabular-nums', color: 'error.main', fontWeight: 700 }}>{fmtMoney(a.amount)} {a.currency}</TableCell>
              <TableCell>{a.due_date ? new Date(a.due_date).toLocaleDateString('ar-SD') : '—'}</TableCell>
              <TableCell>
                <Chip size="small" color="error" variant="outlined" label={t('finance.columns.daysOverdueWithCount', { count: a.late_days })} />
              </TableCell>
              <TableCell align="center">
                <Button size="small" onClick={() => onView(a.id)}>{t('finance.actions.details')}</Button>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow><TableCell colSpan={7}>{ProcessNull()}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function FeesTable({ fees, onEdit, onDeactivate }: {
  fees: FinanceFee[];
  onEdit: (fee: FinanceFee) => void;
  onDeactivate: (id: string) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('finance.columns.code')}</TableCell>
            <TableCell>{t('finance.columns.name')}</TableCell>
            <TableCell>{t('finance.columns.service')}</TableCell>
            <TableCell>SDG</TableCell>
            <TableCell>USD</TableCell>
            <TableCell>{t('finance.columns.year')}</TableCell>
            <TableCell>{t('finance.columns.reference')}</TableCell>
            <TableCell>{t('finance.columns.status')}</TableCell>
            <TableCell align="center">{t('finance.columns.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fees.map((f) => (
            <TableRow key={f.id} hover>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{f.code || '—'}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{f.name_ar}</TableCell>
              <TableCell>{serviceLabel(f.service_type)}</TableCell>
              <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{f.amount_sdg != null ? fmtMoney(f.amount_sdg) : '—'}</TableCell>
              <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>{f.amount_usd != null ? fmtMoney(f.amount_usd) : '—'}</TableCell>
              <TableCell>{f.year}</TableCell>
              <TableCell>
                <Tooltip title={f.legal_reference || '—'}>
                  <Typography variant="caption" noWrap sx={{ display: 'block', maxWidth: 140 }}>{f.legal_reference || '—'}</Typography>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Chip size="small" color={f.is_active ? 'success' : 'default'} label={f.is_active ? t('finance.status.active') : t('finance.status.inactive')} variant={f.is_active ? 'filled' : 'outlined'} />
              </TableCell>
              <TableCell align="center">
                <Stack direction="row" spacing={0.5} justifyContent="center">
                  <Button size="small" onClick={() => onEdit(f)}>{t('finance.actions.edit')}</Button>
                  {f.is_active && (
                    <Button size="small" color="error" onClick={() => onDeactivate(f.id)}>{t('finance.actions.deactivate')}</Button>
                  )}
                </Stack>
              </TableCell>
            </TableRow>
          ))}
          {fees.length === 0 && (
            <TableRow><TableCell colSpan={9}>{ProcessNull()}</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function InvoiceDetailDialog({ invoice, onClose, onPay, onPrint }: {
  invoice: FinanceInvoice;
  onClose: () => void;
  onPay: (i: FinanceInvoice) => void;
  onPrint: (r: FinanceReceipt) => void;
}): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <>
      <DialogTitle sx={{ fontWeight: 700 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('finance.dialogs.invoiceTitle', { number: invoice.invoice_number })}</Typography>
          <IconButton onClick={onClose} size="small" aria-label={t('finance.actions.close')} sx={{ borderRadius: 2 }}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {statusChipLocal(invoice.status)}
            <Chip size="small" variant="outlined" label={serviceLabel(invoice.service_type)} />
            <Chip size="small" variant="outlined" label={t('finance.dialogs.orderRef', { ref: invoice.request_ref || '—' })} />
            {invoice.receipt_number && (
              <Chip size="small" color="success" variant="outlined" icon={<ReceiptIcon />} label={invoice.receipt_number} />
            )}
          </Stack>
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Typography variant="body2" color="text.secondary">{t('finance.dialogs.client')}: <b>{invoice.applicant_name || '—'}</b></Typography>
            <Typography variant="body2" color="text.secondary">{t('finance.columns.issuedAt')}: <b>{new Date(invoice.issued_at).toLocaleString('ar-SD')}</b></Typography>
            {invoice.due_date && (
              <Typography variant="body2" color="text.secondary">{t('finance.columns.dueDate')}: <b>{new Date(invoice.due_date).toLocaleDateString('ar-SD')}</b></Typography>
            )}
          </Stack>
          <Divider />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{t('finance.dialogs.lineItems')}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('finance.columns.item')}</TableCell>
                  <TableCell>{t('finance.columns.quantity')}</TableCell>
                  <TableCell align="center">{t('finance.columns.amount')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(invoice.items ?? []).map((it, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{(it as { name?: string }).name || '—'}</TableCell>
                    <TableCell>{(it as { quantity?: string | number }).quantity ?? 1}</TableCell>
                    <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>{fmtMoney((it as { amount?: string | number }).amount)}</TableCell>
                  </TableRow>
                ))}
                {!invoice.items?.length && (
                  <TableRow><TableCell colSpan={3}>{ProcessNull()}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Stack sx={{ textAlign: 'left', maxWidth: 260, alignSelf: 'flex-end' }}>
            <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
              <Typography variant="body2" color="text.secondary">{t('finance.dialogs.total')}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{fmtMoney(invoice.gross_amount)}</Typography>
            </Stack>
            {Number(invoice.discount_amount) > 0 && (
              <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                <Typography variant="body2" color="text.secondary">{t('finance.dialogs.discount')}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>−{fmtMoney(invoice.discount_amount)}</Typography>
              </Stack>
            )}
            <Divider />
            <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>الصافي</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>{fmtMoney(invoice.net_amount)} {invoice.currency}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
              <Typography variant="body2" color="success.main">المحصل</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>{fmtMoney(invoice.paid_amount)} {invoice.currency}</Typography>
            </Stack>
            {Number(invoice.balance_due) > 0 && (
              <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
                <Typography variant="body2" color="error.main">المتبقي</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>{fmtMoney(invoice.balance_due)} {invoice.currency}</Typography>
              </Stack>
            )}
          </Stack>
          {invoice.payments?.length > 0 && (
            <>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>عمليات الدفع</Typography>
              <PaymentsTable payments={invoice.payments} />
            </>
          )}
          {invoice.receipts?.length > 0 && (
            <>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>الإيصالات</Typography>
              <ReceiptsTable receipts={invoice.receipts} onPrint={onPrint} />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                {invoice.receipts[0] && (
                  <Button size="small" startIcon={<PrintIcon />} onClick={() => onPrint(invoice.receipts[0])}>طباعة الإيصال</Button>
                )}
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
      {(invoice.status === 'PENDING_PAYMENT' || invoice.status === 'OVERDUE' || invoice.status === 'ISSUED' || invoice.status === 'PARTIAL') && (
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>إغلاق</Button>
          <Button variant="contained" color="success" startIcon={<PaidIcon />} onClick={() => onPay(invoice)}>
            {invoice.status === 'PARTIAL' ? 'دفعة إضافية' : 'تحصيل'}
          </Button>
        </DialogActions>
      )}
    </>
  );
}

function ConfirmActionDialog({ open, onClose, onConfirm, title, subtitle, confirmColor = 'error', confirmLabel, value, onChange }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  subtitle: string;
  confirmColor?: 'error' | 'secondary';
  confirmLabel: string;
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{subtitle}</Typography>
        <TextField label="السبب (إلزامي)" value={value} onChange={(e) => onChange(e.target.value)} fullWidth multiline minRows={2} required />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" color={confirmColor} disabled={!value.trim()} onClick={onConfirm}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
