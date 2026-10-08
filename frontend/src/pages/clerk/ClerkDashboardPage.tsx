// Clerk workbench for the food quarantine clerk role.
//
// This file is a composition shell: it wires the view state to the derived
// values the markup needs and then renders. Behaviour lives in ./hooks
// (navigation, data, search, table filters, request wizard, row actions),
// presentational pieces in ./components, and the shared status/column
// vocabulary in ./constants.
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
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
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import LinearProgress from '@mui/material/LinearProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Drawer from '@mui/material/Drawer';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SendIcon from '@mui/icons-material/Send';
import DescriptionIcon from '@mui/icons-material/Description';
import PaidIcon from '@mui/icons-material/Paid';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import ScienceIcon from '@mui/icons-material/Science';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import FlightIcon from '@mui/icons-material/Flight';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { notifySuccess } from '../../utils/toast';
import { riskGroupMeta } from './samplingPolicy';
import KpiCard from '../../components/dashboard/KpiCard';
import { StatusChip } from '../../components/uikit';
import Avatar from '@mui/material/Avatar';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SidebarItem, NotificationDot } from './components/ClerkSidebar';
import { PipelineCard, WeeklyActivityCard } from './components/ClerkPipeline';
import { WorklistTable } from './components/ClerkWorklist';
import { ShipmentDetailView } from './components/ShipmentDetailView';
import { ClerkShipmentEditor } from './components/ClerkShipmentEditor';
import { SettingRow } from './components/SettingsPanel';
import { ClerkHomeView } from './components/views/ClerkHomeView';
import { ClerkListView } from './components/views/ClerkListView';
import { ClerkSearchView } from './components/views/ClerkSearchView';
import { ClerkSettingsView } from './components/views/ClerkSettingsView';
import { ClerkReportsView } from './components/views/ClerkReportsView';
import { WizardField, WizardItems } from './components/ClerkRequestWizard';
import { useClerkActions } from './hooks/useClerkActions';
import { useClerkData } from './hooks/useClerkData';
import { useClerkNav } from './hooks/useClerkNav';
import { useClerkRequests } from './hooks/useClerkRequests';
import { useClerkSearch } from './hooks/useClerkSearch';
import { useClerkWizard } from './hooks/useClerkWizard';
import {
  ALERT_PRESET,
  HEADER_META,
  LIST_VIEW_META,
  SIDEBAR_ITEMS,
  WIZARD_STEPS,
  counterpartyOf,
  shipmentTypeChip,
  statusLabel,
  statusTone,
} from './constants';

const ClerkDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const nav = useClerkNav();
  const { activeView, isDesktop, lang, mobileNavOpen, navCollapsed, newMenuAnchor, railOpen, setActiveView, setLang, setMobileNavOpen, setNavCollapsed, setNewMenuAnchor, setRailOpen, setUserMenuAnchor, userMenuAnchor } = nav;

  const data = useClerkData();
  const { clerkAlerts, clerkName, counts, firstName, greeting, loadData, ports, shipments } = data;

  const search = useClerkSearch();
  const { recentSearches, searchError, searchInput, searchLoading, searchResults, setRecentSearches, setSearchInputLocal } = search;

  const reqs = useClerkRequests({ activeView: nav.activeView, setActiveView: nav.setActiveView });
  const { goToRequests, requestFilters, table } = reqs;

  const wizard = useClerkWizard({ loadData: data.loadData, table: reqs.table });
  const { clearWizardError, confirmOpen, handleSubmit, handleWizardNext, openWizard, requesting, setConfirmOpen, setStep, setWizardForm, setWizardItems, setWizardOpen, setWizardType, step, wizardContentRef, wizardErrors, wizardForm, wizardItems, wizardOpen, wizardType } = wizard;

  const actions = useClerkActions({
    loadData: data.loadData,
    table: reqs.table,
    setUserMenuAnchor: nav.setUserMenuAnchor,
  });
  const { deleteTarget, deleting, detailView, docFileRef, editTarget, handleDelete, handleDocFileChange, handleLogout, openRow, saveDraft, savingDraft, setDeleteTarget, setDetailView, setEditTarget, submitAction, triggerDocFilePicker, uploadedDocs, uploadingDoc } = actions;

  const isHome = activeView === 'home';
  const headerTitle = isHome ? 'الرئيسية' : (LIST_VIEW_META[activeView]?.title ?? HEADER_META[activeView]?.title ?? 'الرئيسية');
  const headerSubtitle = isHome ? `${greeting}، ${firstName} — رقابة المواد الغذائية` : (LIST_VIEW_META[activeView]?.subtitle ?? HEADER_META[activeView]?.subtitle ?? '');

  const actionCount = counts.drafts + counts.submitted + counts.underReview + counts.inspection + counts.rejected;

  const navItems = (collapsed: boolean) => (
    <>
      {SIDEBAR_ITEMS.filter((i) => i.key !== 'settings').map((item) => (
        <SidebarItem
          key={item.key}
          item={item}
          active={activeView === item.key}
          collapsed={collapsed}
          badge={item.key === 'requests' ? actionCount : undefined}
          onClick={() => { setActiveView(item.key); setMobileNavOpen(false); }}
        />
      ))}
      <Divider sx={{ my: 1 }} />
      {SIDEBAR_ITEMS.filter((i) => i.key === 'settings').map((item) => (
        <SidebarItem
          key={item.key}
          item={item}
          active={activeView === item.key}
          collapsed={collapsed}
          onClick={() => { setActiveView(item.key); setMobileNavOpen(false); }}
        />
      ))}
    </>
  );

  const notificationRail = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.25, minHeight: 56, borderBottom: '1px solid', borderBottomColor: 'divider', flexShrink: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>التنبيهات</Typography>
        <IconButton size="small" onClick={() => setRailOpen(false)} aria-label="إغلاق لوحة التنبيهات" sx={{ borderRadius: 2 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Box sx={{ p: 1.5, overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
        <Stack spacing={1.25}>
          {clerkAlerts.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>لا توجد تنبيهات حاليًا.</Typography>
          ) : (
            clerkAlerts.map((a) => (
              <Stack
                key={a.id}
                direction="row"
                spacing={1.5}
                alignItems="flex-start"
                sx={{
                  p: 1.25,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'rgba(255,255,255,0.6)',
                  cursor: ALERT_PRESET[a.id] ? 'pointer' : 'default',
                  transition: 'border-color .15s ease',
                  '&:hover': ALERT_PRESET[a.id] ? { borderColor: 'primary.main' } : {},
                }}
                onClick={() => {
                  const preset = ALERT_PRESET[a.id];
                  if (preset) { setRailOpen(false); goToRequests(preset); }
                  if (a.id === 'none') { setRailOpen(false); loadData(); }
                }}
              >
                <NotificationDot tone={a.tone} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{a.body}</Typography>
                </Box>
              </Stack>
            ))
          )}
        </Stack>
      </Box>
    </Box>
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
          }}
        >
          {/* الشعار */}
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: navCollapsed ? 1 : 1.75, py: 1.5, minHeight: 64, borderBottom: '1px solid', borderBottomColor: 'divider', flexShrink: 0 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: 'primary.main', flexShrink: 0 }}>
              <ScienceIcon fontSize="small" />
            </Box>
            {!navCollapsed && (
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>رقابة الأغذية</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>لوحة الكاتب</Typography>
              </Box>
            )}
          </Stack>

          {/* التنقل */}
          <Stack sx={{ p: 1, gap: 0.5, flexGrow: 1, overflowY: 'auto', minHeight: 0 }}>
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
        <Stack sx={{ p: 1, pt: 1.5 }}>{navItems(false)}</Stack>
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
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{headerSubtitle}</Typography>
            </Box>
            <TextField
              size="small"
              placeholder="بحث سريع…"
              value={searchInput}
              onChange={(e) => { setSearchInputLocal(e.target.value); if (activeView !== 'search') setActiveView('search'); }}
              sx={{ width: { xs: '100%', sm: 240, md: 280 }, '& fieldset': { borderRadius: 2.5 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                ),
                endAdornment: searchInput ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchInputLocal('')} aria-label="مسح البحث" sx={{ borderRadius: 1.5 }}><CloseIcon fontSize="small" /></IconButton>
                  </InputAdornment>
                ) : undefined,
              }}
            />
            <Tooltip title={clerkAlerts.length ? `${clerkAlerts.length} تنبيه` : 'لا توجد تنبيهات'}>
              <IconButton size="medium" aria-label={`التنبيهات — ${clerkAlerts.length}`} onClick={() => setRailOpen((v) => !v)} sx={{ borderRadius: 2 }}>
                <Badge badgeContent={clerkAlerts.length} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 700 } }}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              size="medium"
              startIcon={<AddIcon />}
              onClick={(e) => setNewMenuAnchor(e.currentTarget)}
              sx={{ borderRadius: 2.5, whiteSpace: 'nowrap' }}
            >
              طلب جديد
            </Button>
            <Menu
              anchorEl={newMenuAnchor}
              open={Boolean(newMenuAnchor)}
              onClose={() => setNewMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              slotProps={{ paper: { sx: { borderRadius: 2.5, minWidth: 180 } } }}
            >
              <MenuItem onClick={() => { setNewMenuAnchor(null); openWizard('IMPORT'); }}>
                <MoveToInboxIcon fontSize="small" sx={{ mr: 1.25, color: 'primary.main' }} /> طلب وارد
              </MenuItem>
              <MenuItem onClick={() => { setNewMenuAnchor(null); openWizard('EXPORT'); }}>
                <SendIcon fontSize="small" sx={{ mr: 1.25, color: '#8c6d1f' }} /> طلب صادر
              </MenuItem>
            </Menu>
            <Tooltip title="الملف الشخصي">
              <IconButton aria-label="قائمة المستخدم" onClick={(e) => setUserMenuAnchor(e.currentTarget)} sx={{ p: 0.5, borderRadius: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 15, fontWeight: 700 }}>
                  {(user?.full_name || user?.email || '؟').charAt(0)}
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
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{user?.full_name || 'كاتب رقابة الأغذية'}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>{user?.email || 'Food Control Clerk'}</Typography>
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
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 1.75, md: 2.5 }, maxWidth: 1600, width: '100%', mx: 'auto' }}>
          {activeView === 'home' && (
            <ClerkHomeView actions={actions} data={data} reqs={reqs} />
          )}

          {LIST_VIEW_META[activeView] && (
            <ClerkListView actions={actions} nav={nav} reqs={reqs} />
          )}

          {activeView === 'search' && (
            <ClerkSearchView actions={actions} search={search} />
          )}

          {activeView === 'settings' && (
            <ClerkSettingsView nav={nav} />
          )}

          {activeView === 'reports' && (
            <ClerkReportsView data={data} />
          )}

        </Box>
      </Box>

      {/* لوحة التنبيهات — سطح المكتب */}
      {isDesktop && (
        <Box
          component="aside"
          sx={{
            width: railOpen ? 320 : 0,
            flexShrink: 0,
            overflow: 'hidden',
            transition: 'width .2s ease',
            position: 'sticky',
            top: 0,
            height: '100vh',
            borderRight: railOpen ? '1px solid' : 'none',
            borderRightColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          {notificationRail}
        </Box>
      )}

      {/* لوحة التنبيهات — الجوال */}
      <Drawer open={!isDesktop && railOpen} onClose={() => setRailOpen(false)} anchor="left" PaperProps={{ sx: { width: 320 } }}>
        {notificationRail}
      </Drawer>

      {/* Wizard إنشاء الطلب */}
      <Dialog open={wizardOpen} onClose={() => setWizardOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 700 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ width: 34, height: 34, borderRadius: 2, display: 'grid', placeItems: 'center', color: '#fff', bgcolor: wizardType === 'IMPORT' ? 'primary.main' : 'secondary.main' }}>
              {wizardType === 'IMPORT' ? <MoveToInboxIcon fontSize="small" /> : <SendIcon fontSize="small" />}
            </Box>
            إنشاء طلب {wizardType === 'IMPORT' ? 'وارد' : 'صادر'} — {clerkName}
          </Stack>
          <IconButton aria-label="إغلاق" onClick={() => setWizardOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers ref={wizardContentRef}>
          <Stepper
            activeStep={step}
            alternativeLabel
            sx={{
              mb: 3,
              '& .MuiStepLabel-label': { fontWeight: 700 },
              '& .MuiStepLabel-iconContainer .MuiSvgIcon-root': { fontSize: 26 },
              '& .MuiStepConnector-line': { borderTopWidth: 2 },
            }}
          >
            {WIZARD_STEPS.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>
          <LinearProgress
            variant="determinate"
            value={((step + 1) / WIZARD_STEPS.length) * 100}
            sx={{
              mb: 3,
              borderRadius: 2,
              height: 8,
              bgcolor: 'rgba(16,40,34,0.06)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                background: wizardType === 'IMPORT' ? 'linear-gradient(90deg,#0c7f6a,#12a585)' : 'linear-gradient(90deg,#8c6d1f,#b18b2f)',
              },
            }}
          />

          {step === 0 && (
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">اختر نوع الطلب لتظهر الحقول الخاصة به:</Typography>
              <Grid container spacing={2}>
                {([
                  { key: 'IMPORT', icon: <MoveToInboxIcon />, title: 'طلب وارد', desc: 'استيراد مواد غذائية إلى البلاد — شهادات منشأ وصحية وجمركية', selected: wizardType === 'IMPORT', accent: 'primary' },
                  { key: 'EXPORT', icon: <SendIcon />, title: 'طلب صادر', desc: 'تصدير مواد غذائية للخارج — توثيق الشحنات الصادرة', selected: wizardType === 'EXPORT', accent: 'secondary' },
                ] as const).map((c) => (
                  <Grid key={c.key} item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant={c.selected ? 'contained' : 'outlined'}
                      color={c.accent}
                      onClick={() => setWizardType(c.key)}
                      sx={{
                        py: 3,
                        px: 2.5,
                        borderRadius: 3.5,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1.25,
                        textTransform: 'none',
                        background: c.selected
                          ? c.key === 'IMPORT'
                            ? 'linear-gradient(135deg,#0c7f6a,#12a585)'
                            : 'linear-gradient(135deg,#8c6d1f,#b18b2f)'
                          : undefined,
                        boxShadow: c.selected ? (c.key === 'IMPORT' ? '0 10px 24px rgba(12,127,106,0.3)' : '0 10px 24px rgba(140,109,31,0.3)') : 'none',
                        transition: 'all .15s ease',
                        '&:hover': { transform: 'translateY(-2px)' },
                      }}
                    >
                      <Box sx={{ fontSize: 34, lineHeight: 1 }}>{c.icon}</Box>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{c.title}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mt: 0.25 }}>{c.desc}</Typography>
                      </Box>
                      {c.selected && <Chip size="small" label="مُختار" sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.22)' }} />}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Stack>
          )}

          {step === 1 && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'info.main' }}>بيانات الشحنة والنقل</Typography>
              <Grid container spacing={2}>
                {wizardType === 'IMPORT' ? (
                  <>
                    <WizardField label="رقم البيان" placeholder="IMP-2026-00001 (اختياري — يُولَّد تلقائيًا)" fieldKey="manifest_number" form={wizardForm} onChange={setWizardForm} />
                    <WizardField label="اسم الباخرة / وسيلة النقل" placeholder="مثال: SSV Nile Crown" required fieldKey="vessel_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.vessel_name} clearError={clearWizardError} />
                    <WizardField label="رقم البوليصة" placeholder="BL-XXXXX" required fieldKey="bill_of_lading" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.bill_of_lading} clearError={clearWizardError} />
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        type="date"
                        label="تاريخ الوصول"
                        fullWidth
                        required
                        error={Boolean(wizardErrors.arrival_date)}
                        helperText={wizardErrors.arrival_date}
                        InputLabelProps={{ shrink: true }}
                        value={wizardForm.arrival_date ?? ''}
                        onChange={(e) => { setWizardForm((p) => ({ ...p, arrival_date: e.target.value })); clearWizardError('arrival_date'); }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        label="ميناء الدخول"
                        select
                        required
                        fullWidth
                        error={Boolean(wizardErrors.port)}
                        value={wizardForm.port ?? ''}
                        onChange={(e) => { setWizardForm((p) => ({ ...p, port: e.target.value })); clearWizardError('port'); }}
                        helperText={wizardErrors.port || 'حقل إلزامي — يُملأ من نطاق حسابك'}
                      >
                        {ports.map((p) => (
                          <MenuItem key={p.id} value={p.code}>{p.code} — {p.name_ar}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <WizardField label="بلد المنشأ" placeholder="مثال: الهند" required fieldKey="origin_country" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.origin_country} clearError={clearWizardError} />
                  </>
                ) : (
                  <>
                    <WizardField label="وسيلة النقل" placeholder="باخرة / شاحنة / قطار / طائرة" fieldKey="vessel_name" form={wizardForm} onChange={setWizardForm} />
                    <WizardField label="بلد الوجهة" placeholder="المرسل إليه" required fieldKey="origin_country" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.origin_country} clearError={clearWizardError} />
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        type="date"
                        label="تاريخ الشحن"
                        fullWidth
                        required
                        error={Boolean(wizardErrors.arrival_date)}
                        helperText={wizardErrors.arrival_date}
                        InputLabelProps={{ shrink: true }}
                        value={wizardForm.arrival_date ?? ''}
                        onChange={(e) => { setWizardForm((p) => ({ ...p, arrival_date: e.target.value })); clearWizardError('arrival_date'); }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        size="small"
                        label="ميناء التخليص"
                        select
                        required
                        fullWidth
                        error={Boolean(wizardErrors.port)}
                        value={wizardForm.port ?? ''}
                        onChange={(e) => { setWizardForm((p) => ({ ...p, port: e.target.value })); clearWizardError('port'); }}
                        helperText={wizardErrors.port || 'حقل إلزامي'}
                      >
                        {ports.map((p) => (
                          <MenuItem key={p.id} value={p.code}>{p.code} — {p.name_ar}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  </>
                )}
              </Grid>
            </Stack>
          )}

          {step === 2 && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'warning.main' }}>البيانات الحكومية والجمركية</Typography>
              <Typography variant="body2" color="text.secondary">البيانات الحكومية مطلوبة لاعتماد المعاملة — يُفضل مراجعة المستندات الأصلية.</Typography>
              <Grid container spacing={2}>
                <WizardField label="رقم البيان الجمركي" placeholder="C-XXXXX" fieldKey="customs_number" form={wizardForm} onChange={setWizardForm} />
                <WizardField label="رقم الشهادة الصحية / الاعتماد" placeholder="CC-XXXXX" fieldKey="certificate_no" form={wizardForm} onChange={setWizardForm} />
                <WizardField label="اسم المخلص الجمركي" placeholder="اسم الوكيل الجمركي" fieldKey="clearing_agent" form={wizardForm} onChange={setWizardForm} />
              </Grid>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(140,109,31,0.05)', borderColor: 'rgba(140,109,31,0.3)' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <InfoIcon fontSize="small" color="warning" />
                  <Typography variant="caption" color="text.secondary">
                    رقم البيان الجمركي يُدخل يدويًا حالياً — سيتم ربطه تلقائيًا مع customs API في الإصدار القادم.
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          )}

          {step === 3 && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main' }}>بيانات المستورد / المصدر</Typography>
              <Grid container spacing={2}>
                {wizardType === 'IMPORT' ? (
                  <>
                    <WizardField label="اسم المورد / الشركة الموردة" placeholder="ابحث في دليل المؤسسات أو اكتب الاسم مباشرة" required fieldKey="supplier_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.supplier_name} clearError={clearWizardError} />
                    <WizardField label="اسم المستورد (الشركة المستوردة)" placeholder="اسم الجهة المستوردة" required fieldKey="exporter_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.exporter_name} clearError={clearWizardError} />
                    <WizardField label="اسم المخلص الجمركي" placeholder="اسم الوكيل الجمركي" fieldKey="clearing_agent" form={wizardForm} onChange={setWizardForm} />
                  </>
                ) : (
                  <>
                    <WizardField label="اسم المصدر / الشركة المصدرة" placeholder="ابحث في دليل المؤسسات" required fieldKey="supplier_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.supplier_name} clearError={clearWizardError} />
                    <WizardField label="اسم المستورد (الجهة المستوردة)" placeholder="المرسل إليه" required fieldKey="exporter_name" form={wizardForm} onChange={setWizardForm} errorText={wizardErrors.exporter_name} clearError={clearWizardError} />
                  </>
                )}
              </Grid>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(12,127,106,0.05)', borderColor: 'rgba(12,127,106,0.3)' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <InfoIcon fontSize="small" color="success" />
                  <Typography variant="caption" color="text.secondary">
                    يُنصح بإدخال الاسم التجاري + الرقم الضريبي للربط المستقبلي بمحرك المخاطر.
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          )}

          {step === 4 && (
            <WizardItems items={wizardItems} setItems={setWizardItems} />
          )}

          {step === 5 && (
            <Stack spacing={1.25}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>المستندات المطلوبة</Typography>
              <Typography variant="body2" color="text.secondary">المستندات الإلزامية الناقصة تمنع الإرسال — يُمكنك رفع الملفات لاحقًا.</Typography>
              {[
                { name: 'البيان الجمركي', docType: 'CUSTOMS_DECLARATION', required: true },
                { name: 'الشهادة الصحية', docType: 'HEALTH_CERT', required: true },
                { name: 'شهادة المنشأ', docType: 'ORIGIN_CERT', required: true },
                { name: 'الفاتورة التجارية', docType: 'INVOICE', required: true },
                { name: 'Packing List', docType: 'PACKING_LIST', required: true },
                { name: 'بوليصة الشحن (AWB/B/L)', docType: 'BILL_OF_LADING', required: true },
                { name: 'شهادة التحليل المعملي', docType: 'LAB_REPORT', required: false },
                { name: 'مستند إضافي', docType: 'OTHER', required: false },
              ].map((d) => {
                const isUploaded = uploadedDocs[d.docType];
                const isUploading = uploadingDoc === d.docType;
                return (
                <Stack key={d.name} direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 1.25, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)' }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AttachFileIcon fontSize="small" color={isUploaded ? 'success' : d.required ? 'warning' : 'disabled'} />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{d.name}</Typography>
                    {d.required && !isUploaded && <Chip label="إلزامي" size="small" color="warning" variant="outlined" sx={{ ml: 0.5 }} />}
                  </Stack>
                  {isUploaded ? (
                    <Chip label="مرفوع" size="small" color="success" variant="outlined" />
                   ) : (
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      startIcon={<AttachFileIcon />}
                      disabled={isUploading}
                      onClick={() => triggerDocFilePicker(d.docType)}
                    >
                      {isUploading ? 'جارٍ الرفع...' : 'رفع ملف'}
                    </Button>
                  )}
                </Stack>
              );
              })}
              <input
                ref={docFileRef}
                type="file"
                hidden
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                onChange={handleDocFileChange}
              />
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(12,127,106,0.05)', borderColor: 'rgba(12,127,106,0.3)' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <InfoIcon fontSize="small" color="info" />
                  <Typography variant="caption" color="text.secondary">
                    يُمكنك الإرسال بدون المستندات الاختيارية — سيتم طلبها من المفتش لاحقًا إذا لزم الأمر.
                  </Typography>
                </Stack>
              </Paper>
            </Stack>
          )}

          {step === 6 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'info.main' }}>الرسوم (حساب تلقائي — النظام)</Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderStyle: 'dashed', borderColor: 'rgba(12,127,106,0.4)', bgcolor: 'rgba(12,127,106,0.04)' }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                    <PaidIcon fontSize="small" color="info" />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>تُحتسب تلقائيًا بعد الإرسال</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    تُحسب الرسوم حسب نوع الشحنة والكميات عند استلام الطلب في قسم الحسابات — لا يمكن تعديلها يدويًا، وتظهر هنا وفي صفحة الطلب فور احتسابها.
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'warning.main' }}>سياسة العينات (حساب تلقائي — النظام)</Typography>
                {wizardItems.length === 0 ? (
                  <Box sx={{ p: 1.5, borderRadius: 2, border: '1px dashed rgba(16,40,34,0.2)' }}>
                    <Typography variant="body2" color="text.secondary">لم تُضف أصناف بعد — تُحسب سياسة العينات تلقائيًا لكل صنف.</Typography>
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {wizardItems.map((it, i) => {
                      const s = it.sampling;
                      return (
                        <Box key={i} sx={{ p: 1.5, borderRadius: 2, border: '1px solid rgba(16,40,34,0.07)', bgcolor: 'rgba(255,255,255,0.6)' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{i + 1}. {it.name}</Typography>
                            {s && <Chip size="small" color={riskGroupMeta(s.risk_group).color} label={`${s.sampling_rate} — ${riskGroupMeta(s.risk_group).label}`} sx={{ bgcolor: 'transparent', fontWeight: 700 }} />}
                          </Stack>
                          {s ? (
                            <>
                              <Typography variant="body2">عدد العينات: <b>{s.quantity}</b></Typography>
                              {s.package_size && <Typography variant="body2">حجم العبوة المعتمدة: {s.package_size}</Typography>}
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{s.sampling_conditions}</Typography>
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">لا تتطلب عينة — فحص ظاهري فقط</Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Grid>
            </Grid>
          )}

          {step === 7 && (
            <Stack spacing={1}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>مراجعة الطلب والإرسال</Typography>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 1, bgcolor: 'rgba(12,127,106,0.04)' }}>
                <Stack spacing={0.75}>
                  {['بيانات الشحنة والنقل', 'البيانات الحكومية', 'المستورد / المصدر', 'الأصناف والمنتجات', 'المستندات المرفوعة', 'الرسوم المستحقة', 'سياسة العينات'].map((item) => (
                    <Stack key={item} direction="row" alignItems="center" spacing={1}>
                      <CheckCircleIcon fontSize="small" color="success" />
                      <Typography variant="body2">{item}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.5, borderRadius: 2, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                <WarningAmberIcon fontSize="small" />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>بعض المستندات الإلزامية غير مرفوعة — سيتم طلبها من المفتش بعد الإرسال.</Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>السابق</Button>
          <Box sx={{ flexGrow: 1 }} />
          {step < WIZARD_STEPS.length - 1 && (
            <Button variant="contained" onClick={handleWizardNext}>التالي</Button>
          )}
          {step === WIZARD_STEPS.length - 1 && (
            <Button variant="contained" color="success" startIcon={<SendIcon />} onClick={handleWizardNext}>
              إرسال للمراجعة
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* تأكيد الإرسال */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>تأكيد إرسال الطلب</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            سيتم إنشاء البيان وإرساله لتحصيل الرسوم مع إشعار قسم الحسابات. بعد الإرسال لن تتمكن من تعديل الطلب. هل أنت متأكد؟
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} disabled={requesting}>إلغاء</Button>
          <Button variant="contained" color="success" startIcon={<SendIcon />} disabled={requesting} onClick={handleSubmit}>
            {requesting ? 'جارٍ الإرسال…' : 'تأكيد الإرسال'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* تأكيد حذف المسودة */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف المسودة"
        message={`هل أنت متأكد من حذف المسودة «${deleteTarget?.manifest_number ?? ''}»؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* عرض تفصيلي للطلب */}
      <ShipmentDetailView shipment={detailView} onClose={() => setDetailView(null)} onEdit={setEditTarget} />
      <ClerkShipmentEditor shipment={editTarget} saving={savingDraft} onClose={() => setEditTarget(null)} onSave={saveDraft} />
    </Box>
  );
};

export default ClerkDashboardPage;
