import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import apiClient from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import baseTheme from '../../styles/theme';
import { ROLE_LAYOUT_CONFIG, rewriteSectorNav, type RoleNavItem } from '../../config/roleLayouts';
import { Navigate } from 'react-router-dom';
import { roleHomePathFor } from '../../utils/roleHome';
import { getUserSectorCode } from '../../utils/scopes';
import { sectorDashboardRoute } from '../../config/cmsSectors';
import LayoutChrome from './LayoutChrome';
import RoleNavMenu from './RoleNavMenu';

const drawerExpandedWidth = 264;
const drawerMiniWidth = 78;

/** شارة التنبيهات الحية لأدوار الميكروبيولوجي (كانت محسوبة داخل التخطيطات المخصصة) */
const useMicroAlertsBadge = (enabled: boolean) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    apiClient
      .get('/food/samples/micro-dashboard/')
      .then((res: { data?: { data?: Record<string, unknown> } }) => {
        const d = (res.data?.data ?? {}) as Record<string, number>;
        const n = (d.qc_failed ?? 0) + (d.overdue_tests ?? 0) + (d.non_compliant ?? 0);
        if (alive) setCount(Number(n) || 0);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [enabled]);
  return count;
};

const hasMicroBadge = (items: RoleNavItem[]): boolean =>
  items.some((i) => i.badge === 'micro' || (i.children ? hasMicroBadge(i.children) : false));

const GenericRoleLayout = ({ role }: { role: string }) => {
  const config = ROLE_LAYOUT_CONFIG[role];
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const microCount = useMicroAlertsBadge(!!config && hasMicroBadge(config.nav));

  const sectorBase = useMemo(() => {
    const code = getUserSectorCode(user);
    return code ? sectorDashboardRoute(code.toLowerCase()) : undefined;
  }, [user]);
  const navItems = config && sectorBase ? rewriteSectorNav(config.nav, sectorBase) : config?.nav;

  if (!config) return <Navigate to={roleHomePathFor(user)} replace />;

  const theme = createTheme(baseTheme, {
    palette: {
      primary: {
        main: config.color,
        dark: config.color,
        darker: config.color,
        light: `${config.color}33`,
        lighter: `${config.color}14`,
        contrastText: '#ffffff',
      },
    },
  });

  const isCollapsed = collapsed && !isMobile;
  const drawerWidth = isCollapsed ? drawerMiniWidth : drawerExpandedWidth;

  const closeMobile = () => setMobileOpen(false);

  const go = (target: string) => {
    closeMobile();
    navigate(target);
  };

  const sidebarContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #f5f8fd, rgba(255,255,255,0.96))' }}>
      <Box sx={{ py: 2, px: 2.5, display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
        {isCollapsed ? (
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 3,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              background: `linear-gradient(135deg, ${config.color}, ${config.color}99)`,
            }}
          >
            <AccountCircleIcon fontSize="small" />
          </Box>
        ) : (
          <Stack spacing={0.4}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {config.brand}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
              منصة الحجر الصحي القومي
            </Typography>
          </Stack>
        )}
      </Box>
      <Divider />
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {!isCollapsed && (
          <Typography variant="overline" sx={{ px: 2.5, color: 'text.disabled', fontWeight: 700, fontSize: 11, display: 'block', mb: 0.5 }}>
            {config.title}
          </Typography>
        )}
        <RoleNavMenu
          sections={[{ items: navItems ?? [] }]}
          accent={config.color}
          collapsed={isCollapsed}
          microBadgeCount={microCount}
          currentPathname={location.pathname}
          currentSearch={location.search}
          onNavigate={go}
        />
      </Box>
      <Divider />
      <Box sx={{ p: isCollapsed ? 1 : 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: 1.5,
            p: 1.25,
            borderRadius: 3,
            border: `1px solid ${config.color}1f`,
            bgcolor: 'rgba(255,255,255,0.7)',
          }}
        >
          <Avatar sx={{ bgcolor: 'primary.main', width: 38, height: 38, fontSize: 15, fontWeight: 700 }}>
            {(user?.full_name || user?.email || '؟').charAt(0)}
          </Avatar>
          {!isCollapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                {user?.full_name || config.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {config.subtitle}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );

  const drawer = isMobile ? (
    <Drawer
      anchor="right"
      open={mobileOpen}
      onClose={closeMobile}
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: drawerExpandedWidth, boxSizing: 'border-box' } }}
    >
      {sidebarContent}
    </Drawer>
  ) : (
    <Drawer
      variant="permanent"
      anchor="right"
      open
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        boxSizing: 'border-box',
        transition: (t) =>
          t.transitions.create('width', {
            easing: t.transitions.easing.sharp,
            duration: t.transitions.duration.enteringScreen,
          }),
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          overflowX: 'hidden',
          boxSizing: 'border-box',
          borderRight: 'none',
          borderLeft: '1px solid',
          borderColor: 'divider',
          transition: (t) =>
            t.transitions.create('width', {
              easing: t.transitions.easing.sharp,
              duration: t.transitions.duration.enteringScreen,
            }),
        },
      }}
    >
      {sidebarContent}
    </Drawer>
  );

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F4F6F9' }}>
        <LayoutChrome
          drawerWidth={drawerWidth}
          accent={config.color}
          onOpenMobile={() => setMobileOpen(true)}
          title={config.title}
          subtitle={config.subtitle}
          brandTile={
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2.5,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                background: `linear-gradient(135deg, ${config.color}, ${config.color}99)`,
              }}
            >
              <AccountCircleIcon fontSize="small" />
            </Box>
          }
          overline={config.overline}
          logo={config.logo}
          collapse={{ collapsed: isCollapsed, onToggle: () => setCollapsed((c) => !c) }}
        />

        {drawer}

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, md: 3 },
            pt: { xs: 2, md: 3 },
            mt: { xs: 22, md: 14 },
            width: { md: `calc(100% - ${drawerWidth}px)` },
            maxWidth: 1760,
            mx: 'auto',
            transition: (t) =>
              t.transitions.create('width', {
                easing: t.transitions.easing.sharp,
                duration: t.transitions.duration.enteringScreen,
              }),
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default GenericRoleLayout;