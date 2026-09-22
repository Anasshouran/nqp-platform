import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams, Link, Outlet, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import InfoIcon from '@mui/icons-material/Info';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AppsIcon from '@mui/icons-material/Apps';
import BarChartIcon from '@mui/icons-material/BarChart';
import CampaignIcon from '@mui/icons-material/Campaign';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import LoginIcon from '@mui/icons-material/Login';
import { getSectors } from '../../api/endpoints/public';
import type { Sector } from '../../api/endpoints/public';

interface SectorContextValue {
  sector: Sector | null;
  loading: boolean;
}

const SectorContext = createContext<SectorContextValue>({ sector: null, loading: true });

export const useSectorPortal = () => useContext(SectorContext);

const regionLabels: Record<string, string> = {
  KHARTOUM: 'الخرطوم',
  RED_SEA: 'البحر الأحمر',
  KASSALA: 'كسلا',
  GEDAREF: 'القضارف',
  NORTHERN: 'شمالي',
  KORDOFAN: 'كردفان',
};

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const getNavItems = (slug: string): NavItem[] => [
  { label: 'الرئيسية', path: `/sector/${slug}`, icon: <HomeIcon /> },
  { label: 'عن القطاع', path: `/sector/${slug}/about`, icon: <InfoIcon /> },
  { label: 'نقاط الدخول', path: `/sector/${slug}/ports`, icon: <LocationOnIcon /> },
  { label: 'الخدمات', path: `/sector/${slug}/services`, icon: <AppsIcon /> },
  { label: 'الإحصائيات', path: `/sector/${slug}/statistics`, icon: <BarChartIcon /> },
  { label: 'الأخبار', path: `/sector/${slug}/news`, icon: <CampaignIcon /> },
  { label: 'تواصل معنا', path: `/sector/${slug}/contact`, icon: <ContactMailIcon /> },
];

export const SectorPortalProvider = ({ children }: { children: ReactNode }) => {
  const { sectorCode } = useParams<{ sectorCode: string }>();
  const [sector, setSector] = useState<Sector | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sectorCode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getSectors()
      .then((res) => {
        const found = (res.data.data ?? []).find(
          (s) => s.code.toLowerCase().replace('_', '-') === sectorCode,
        );
        setSector(found ?? null);
      })
      .catch(() => setSector(null))
      .finally(() => setLoading(false));
  }, [sectorCode]);

  return (
    <SectorContext.Provider value={{ sector, loading }}>
      {children}
    </SectorContext.Provider>
  );
};

export const SectorPortalLayout = () => {
  const { sectorCode } = useParams<{ sectorCode: string }>();
  const location = useLocation();
  const { sector, loading } = useSectorPortal();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = getNavItems(sectorCode || '');
  const currentSlug = sectorCode || '';

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const SidebarContent = () => (
    <Box sx={{ py: 2 }}>
      <Box sx={{ px: 2, mb: 2 }}>
        {loading ? (
          <Skeleton variant="rounded" height={60} />
        ) : sector ? (
          <>
            <Typography variant="h6" sx={{ fontWeight: 700, color: sector.color }}>
              {sector.name_ar}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {regionLabels[sector.region] || sector.region}
            </Typography>
          </>
        ) : (
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            قطاع
          </Typography>
        )}
      </Box>
      <Divider sx={{ mb: 1 }} />
      <List>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ px: 1 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  fontWeight: isActive ? 800 : 600,
                  '&.active, &.Mui-selected': {
                    bgcolor: 'primary.light',
                    color: 'primary.dark',
                    '&:hover': { bgcolor: 'primary.lighter' },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'primary.main' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider sx={{ my: 1 }} />
      <Box sx={{ px: 2 }}>
        <Button
          component={Link}
          to="/login"
          variant="outlined"
          fullWidth
          startIcon={<LoginIcon />}
          size="small"
          sx={{ fontWeight: 700 }}
        >
          دخول موظفي القطاع
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '60vh' }}>
      {/* Desktop sidebar */}
      <Drawer
        variant="permanent"
        anchor="right"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: 260,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: 260, position: 'relative', borderLeft: '1px solid', borderColor: 'divider' },
        }}
      >
        <SidebarContent />
      </Drawer>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        <SidebarContent />
      </Drawer>

      {/* Main content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Mobile header */}
        <Paper
          elevation={0}
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            p: 1,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <IconButton onClick={() => setMobileOpen(true)} aria-label="فتح القائمة">
            <MenuIcon />
          </IconButton>
          <Button component={Link} to="/sectors" startIcon={<ArrowBackIcon />} size="small" sx={{ mr: 1 }}>
            بوابات
          </Button>
        </Paper>

        {/* Desktop back link */}
        <Box sx={{ display: { xs: 'none', md: 'block' }, p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Button component={Link} to="/sectors" startIcon={<ArrowBackIcon />} size="small">
            بوابات
          </Button>
        </Box>

        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export { regionLabels, getNavItems };
