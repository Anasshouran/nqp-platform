import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import Divider from '@mui/material/Divider';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import GlobalSearchPalette, { openGlobalSearch } from '../search/GlobalSearchPalette';
import NotificationBell from './NotificationBell';
import { logout } from '../../store/slices/authSlice';
import type { AppDispatch } from '../../store/store';
import { logout as logoutApi } from '../../api/endpoints/auth';
import { useAuth } from '../../hooks/useAuth';

interface LayoutChromeProps {
  /** مكان الإقحام يتطابق مع عرض الدرج الجانبي للاحتفاظ بمحاذاة الصفحة */
  drawerWidth: number;
  /** اللون الأساسي (يُستعمل في الشريط السفلي وزر الطي) */
  accent: string;
  onOpenMobile: () => void;
  title: string;
  subtitle?: string;
  /** سطر ترويسة اختياري أعلى العنوان */
  overline?: string;
  /** أيقونة العلامة قبل العنوان (تيل متدرج إلخ) */
  brandTile?: ReactNode;
  /** محتوى إضافي فوق شريط الأدوات (مثال: الترويسة الحكومية) */
  logo?: ReactNode;
  /** طيّ الشريط الجانبي لأيقونات فقط (أدوار Generic) */
  collapse?: { collapsed: boolean; onToggle: () => void };
}

/** هيكل تطبيق موحّد: شريط علوي زجاجي + بحث شامل + جرس الإشعارات + قائمة المستخدم.
 *  يُشارَك بين جميع تخطيطات الأدوار لإزالة تكرار الكود في شريط التطبيق. */
const LayoutChrome = ({
  drawerWidth,
  accent,
  onOpenMobile,
  title,
  subtitle,
  overline,
  brandTile,
  logo,
  collapse,
}: LayoutChromeProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const openUserMenu = (e: React.MouseEvent<HTMLElement>) => setUserMenuAnchor(e.currentTarget);
  const closeUserMenu = () => setUserMenuAnchor(null);

  const handleLogout = async () => {
    closeUserMenu();
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

  return (
    <>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mr: { md: `${drawerWidth}px` },
          bgcolor: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(18px) saturate(1.35)',
          borderBottom: `1px solid ${accent}1a`,
        }}
      >
        {logo}
        <Toolbar sx={{ justifyContent: 'space-between', gap: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <IconButton
              aria-label="فتح القائمة"
              edge="start"
              onClick={onOpenMobile}
              sx={{ display: { md: 'none' }, color: 'primary.main' }}
            >
              <MenuIcon />
            </IconButton>
            {collapse && (
              <Tooltip title={collapse.collapsed ? 'توسيع القائمة' : 'طي القائمة'}>
                <IconButton
                  aria-label="فتح القائمة"
                  onClick={collapse.onToggle}
                  sx={{ display: { xs: 'none', md: 'inline-flex' }, color: 'primary.main', border: '1px solid', borderColor: `${accent}40` }}
                >
                  {collapse.collapsed ? <MenuIcon /> : <MenuOpenIcon />}
                </IconButton>
              </Tooltip>
            )}
            {brandTile}
            <Box>
              {overline && (
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  {overline}
                </Typography>
              )}
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip title="البحث الشامل (Ctrl+K)">
              <IconButton aria-label="البحث الشامل" onClick={openGlobalSearch} sx={{ color: 'text.secondary' }}>
                <SearchIcon />
              </IconButton>
            </Tooltip>
            <NotificationBell />
            <Tooltip title="حساب المستخدم">
              <IconButton aria-label="قائمة المستخدم" onClick={openUserMenu} sx={{ p: 0.5 }}>
                <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 700 }}>
                  {(user?.full_name || user?.email || '؟').charAt(0)}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={closeUserMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, minWidth: 210 } } }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{user?.full_name || title}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap>{user?.email}</Typography>
              </Box>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main', fontWeight: 700 }}>
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                تسجيل الخروج
              </MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>
      <GlobalSearchPalette />
    </>
  );
};

export default LayoutChrome;