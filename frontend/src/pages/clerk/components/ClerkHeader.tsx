// Authenticated dashboard header: title, search, notifications, language and account menu.
// Extracted from ClerkDashboardPage without behavioural change.
import type { useAuth } from '../../../hooks/useAuth';
import type { NavigateFunction } from 'react-router-dom';
import type { useClerkActions } from '../hooks/useClerkActions';
import type { useClerkData } from '../hooks/useClerkData';
import type { useClerkNav } from '../hooks/useClerkNav';
import type { useClerkSearch } from '../hooks/useClerkSearch';
import type { useClerkWizard } from '../hooks/useClerkWizard';
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
import Paper from '@mui/material/Paper';
import InputAdornment from '@mui/material/InputAdornment';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SendIcon from '@mui/icons-material/Send';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MenuIcon from '@mui/icons-material/Menu';
import Avatar from '@mui/material/Avatar';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

type Props = {
  actions: Pick<ReturnType<typeof useClerkActions>, 'handleLogout'>;
  data: Pick<ReturnType<typeof useClerkData>, 'clerkAlerts'>;
  nav: Pick<ReturnType<typeof useClerkNav>, 'activeView' | 'isDesktop' | 'newMenuAnchor' | 'setActiveView' | 'setMobileNavOpen' | 'setNewMenuAnchor' | 'setRailOpen' | 'setUserMenuAnchor' | 'userMenuAnchor'>;
  search: Pick<ReturnType<typeof useClerkSearch>, 'searchInput' | 'setSearchInputLocal'>;
  wizard: Pick<ReturnType<typeof useClerkWizard>, 'openWizard'>;
  headerSubtitle: string;
  headerTitle: string;
  navigate: NavigateFunction;
  user: ReturnType<typeof useAuth>['user'];
};

export const ClerkHeader = ({ actions, data, nav, search, wizard, headerSubtitle, headerTitle, navigate, user }: Props) =>{
  const { handleLogout } = actions;
  const { clerkAlerts } = data;
  const { activeView, isDesktop, newMenuAnchor, setActiveView, setMobileNavOpen, setNewMenuAnchor, setRailOpen, setUserMenuAnchor, userMenuAnchor } = nav;
  const { searchInput, setSearchInputLocal } = search;
  const { openWizard } = wizard;
  // headerSubtitle passed in from the page
  // headerTitle passed in from the page
  // navigate passed in from the page
  // user passed in from the page

  return (
    <>
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
    </>
  );
};