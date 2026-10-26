import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import baseTheme from '../../styles/theme';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Drawer from '@mui/material/Drawer';
import Chip from '@mui/material/Chip';
import MenuIcon from '@mui/icons-material/Menu';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import GroupsIcon from '@mui/icons-material/Groups';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AssessmentIcon from '@mui/icons-material/Assessment';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HealthAndSafetyOutlinedIcon from '@mui/icons-material/HealthAndSafetyOutlined';
import BiotechIcon from '@mui/icons-material/Biotech';
import Groups2Icon from '@mui/icons-material/Groups2';
import AirlineSeatReclineNormalIcon from '@mui/icons-material/AirlineSeatReclineNormal';
import AirplaneTicketIcon from '@mui/icons-material/AirplaneTicket';
import BarChartIcon from '@mui/icons-material/BarChart';
import DescriptionIcon from '@mui/icons-material/Description';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import HomeIcon from '@mui/icons-material/Home';
import EmergencyIcon from '@mui/icons-material/Campaign';
import type { NavGroup } from './shared';
import { C, OfflinePill } from './shared';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import * as Operations from './screens/operations';
import * as PassengerHealth from './screens/passenger-health';
import * as Clinical from './screens/clinical';
import * as InspectionScreens from './screens/inspection';
import * as AdminScreens from './screens/admin';

const getGroups = (t: (key: string) => string): NavGroup[] => [
  {
    label: t('borders.airportHealth.groups.operations'),
    items: [
      { id: 'dashboard', label: t('borders.airportHealth.nav.dashboard'), icon: <DashboardOutlinedIcon fontSize="small" /> },
      { id: 'flights', label: t('borders.airportHealth.nav.flights'), icon: <FlightTakeoffIcon fontSize="small" /> },
      { id: 'flight-details', label: t('borders.airportHealth.nav.flightDetails'), icon: <FlightLandIcon fontSize="small" /> },
      { id: 'crew', label: t('borders.airportHealth.nav.crew'), icon: <GroupsIcon fontSize="small" /> },
    ],
  },
  {
    label: t('borders.airportHealth.groups.passengerHealth'),
    items: [
      { id: 'screening', label: t('borders.airportHealth.nav.screening'), icon: <ManageSearchIcon fontSize="small" /> },
      { id: 'declaration', label: t('borders.airportHealth.nav.declaration'), icon: <EditNoteIcon fontSize="small" /> },
      { id: 'risk-assessment', label: t('borders.airportHealth.nav.riskAssessment'), icon: <AssessmentIcon fontSize="small" /> },
      { id: 'vaccination', label: t('borders.airportHealth.nav.vaccination'), icon: <VaccinesIcon fontSize="small" /> },
    ],
  },
  {
    label: t('borders.airportHealth.groups.casesLab'),
    items: [
      { id: 'suspected', label: t('borders.airportHealth.nav.suspected'), icon: <WarningAmberIcon fontSize="small" /> },
      { id: 'isolation', label: t('borders.airportHealth.nav.isolation'), icon: <HealthAndSafetyOutlinedIcon fontSize="small" /> },
      { id: 'lab', label: t('borders.airportHealth.nav.lab'), icon: <BiotechIcon fontSize="small" />, badge: '6' },
      { id: 'contact-tracing', label: t('borders.airportHealth.nav.contactTracing'), icon: <Groups2Icon fontSize="small" /> },
    ],
  },
  {
    label: t('borders.airportHealth.groups.inspectionOps'),
    items: [
      { id: 'inspection', label: t('borders.airportHealth.nav.inspection'), icon: <AirplaneTicketIcon fontSize="small" /> },
      { id: 'analytics', label: t('borders.airportHealth.nav.analytics'), icon: <BarChartIcon fontSize="small" /> },
      { id: 'certificates', label: t('borders.airportHealth.nav.certificates'), icon: <DescriptionIcon fontSize="small" /> },
    ],
  },
  {
    label: t('borders.airportHealth.groups.emergency'),
    items: [
      { id: 'emergency', label: t('borders.airportHealth.nav.emergency'), icon: <EmergencyIcon fontSize="small" />, badge: '1' },
    ],
  },
  {
    label: t('borders.airportHealth.groups.admin'),
    items: [
      { id: 'users', label: t('borders.airportHealth.nav.users'), icon: <AdminPanelSettingsIcon fontSize="small" /> },
      { id: 'roles', label: t('borders.airportHealth.nav.roles'), icon: <SecurityIcon fontSize="small" /> },
      { id: 'audit-logs', label: t('borders.airportHealth.nav.auditLogs'), icon: <HistoryIcon fontSize="small" /> },
      { id: 'settings', label: t('borders.airportHealth.nav.settings'), icon: <SettingsIcon fontSize="small" /> },
      { id: 'notifications', label: t('borders.airportHealth.nav.notifications'), icon: <NotificationsActiveIcon fontSize="small" /> },
    ],
  },
];

const SCREEN: Record<string, React.ComponentType<{ nav: (id: string) => void }>> = {
  dashboard: Operations.Dashboard,
  flights: Operations.Flights,
  'flight-details': Operations.FlightDetails,
  crew: Operations.Crew,
  screening: PassengerHealth.Screening,
  declaration: PassengerHealth.Declaration,
  'risk-assessment': PassengerHealth.RiskAssessment,
  vaccination: PassengerHealth.Vaccination,
  suspected: Clinical.Suspected,
  isolation: Clinical.Isolation,
  lab: Clinical.Lab,
  'contact-tracing': Clinical.ContactTracing,
  emergency: Clinical.Emergency,
  inspection: InspectionScreens.Inspection,
  analytics: InspectionScreens.Analytics,
  certificates: InspectionScreens.Certificates,
  users: AdminScreens.Users,
  roles: AdminScreens.Roles,
  'audit-logs': AdminScreens.AuditLogs,
  settings: AdminScreens.Settings,
  notifications: AdminScreens.NotificationsAdmin,
};

const healthTheme = createTheme(baseTheme, {
  palette: {
    primary: { main: C.primary, dark: C.primaryDark, contrastText: '#ffffff' },
    error: { main: C.danger },
    warning: { main: C.warning },
    success: { main: C.success },
  },
});

const Sidebar = ({ active, onSelect, onClose, t }: { active: string; onSelect: (id: string) => void; onClose?: () => void; t: (k: string, o?: any) => string }) => {
  const GROUPS = getGroups(t);
  const select = (id: string) => {
    onSelect(id);
    onClose?.();
  };
  return (
    <Stack spacing={0.5} sx={{ px: 1.5, pb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1, py: 2 }}>
        <Box sx={{ width: 40, height: 40, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: C.primary, color: '#fff', flexShrink: 0 }}>
          <HealthAndSafetyIcon fontSize="small" />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, color: C.text, fontSize: 15 }}>{t('borders.airportHealth.sidebar.brand')}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Airport Health System</Typography>
        </Box>
      </Stack>
      {GROUPS.map((g) => (
        <Box key={g.label} sx={{ mt: 0.75 }}>
          <Typography variant="caption" sx={{ px: 1, fontWeight: 700, color: C.textMuted, fontSize: 11 }}>{g.label}</Typography>
          {g.items.map((it) => {
            const isActive = active === it.id;
            return (
              <Tooltip key={it.id} title={it.label} placement="left">
                <Box
                  onClick={() => select(it.id)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.25, px: 1.25, py: 0.85, borderRadius: 2.5, cursor: 'pointer', mb: 0.25,
                    bgcolor: isActive ? 'rgba(11,92,173,0.10)' : 'transparent',
                    color: isActive ? C.primary : C.textMuted,
                    fontWeight: isActive ? 800 : 600,
                    '&:hover': { bgcolor: 'rgba(11,92,173,0.06)' },
                  }}
                >
                  <Box sx={{ color: 'inherit', display: 'grid', placeItems: 'center', minWidth: 20 }}>{it.icon}</Box>
                  <Typography sx={{ fontSize: 13, color: 'inherit', flex: 1 }}>{it.label}</Typography>
                  {it.badge && (
                    <Chip label={it.badge} size="small" sx={{ height: 18, minWidth: 18, fontSize: 11, fontWeight: 700, bgcolor: it.id === 'emergency' ? C.danger : C.primary, color: '#fff', '& .MuiChip-label': { px: 0.5 } }} />
                  )}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      ))}
    </Stack>
  );
};

const AirportHealthPage = () => {
  const { t } = useTranslation();
  const [screen, setScreen] = useState('dashboard');
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();
  const Active = SCREEN[screen] || SCREEN.dashboard;
  const nav = (id: string) => setScreen(id);
  const { status } = useOfflineSync();
  const offlineConn = status === 'OFFLINE';
  const pillState = offlineConn ? 'OFFLINE' : status === 'SYNC_PENDING' ? 'SYNCING' : 'ONLINE';

  return (
    <ThemeProvider theme={healthTheme}>
      <Box sx={{ minHeight: '100vh', bgcolor: C.bg, direction: 'rtl', color: C.text }}>
        <Stack direction="row" sx={{ position: 'sticky', top: 0, zIndex: 20, bgcolor: '#fff', borderBottom: `1px solid ${C.border}`, px: 2.5, py: 1.5, gap: 1.5, alignItems: 'center' }}>
          <Tooltip title={t("borders.airportHealth.header.back")}>
            <IconButton aria-label={t("borders.airportHealth.header.home")} size="small" onClick={() => navigate('/app')} sx={{ border: `1px solid ${C.border}`, color: C.primary }}>
              <HomeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton aria-label={t("borders.airportHealth.header.openMenu")} size="small" onClick={() => setDrawer(true)} sx={{ display: { lg: 'none' }, border: `1px solid ${C.border}` }}>
            <MenuIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('borders.airportHealth.header.brand')}</Typography>
            <Typography variant="caption" color="text.secondary">{t('borders.airportHealth.header.subtitle')}</Typography>
          </Box>
          <Chip label={t('borders.airportHealth.header.station')} size="small" sx={{ bgcolor: '#EAF2FC', color: C.primary, fontWeight: 700, display: { xs: 'none', sm: 'flex' } }} />
          <OfflinePill state={pillState} t={t} />
        </Stack>

        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
          <Box sx={{ display: { xs: 'none', lg: 'block' }, width: 268, flexShrink: 0, position: 'sticky', top: 73, maxHeight: 'calc(100vh - 73px)', overflowY: 'auto', borderLeft: `1px solid ${C.border}`, bgcolor: '#fff' }}>
            <Sidebar active={screen} onSelect={nav} t={t} />
          </Box>
          <Drawer anchor="right" open={drawer} onClose={() => setDrawer(false)} PaperProps={{ sx: { width: 280 } }}>
            <Sidebar active={screen} onSelect={nav} onClose={() => setDrawer(false)} t={t} />
          </Drawer>
          <Box sx={{ flex: 1, minWidth: 0, px: { xs: 2, md: 3.5 }, py: 3 }}>
            <Active nav={nav} />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AirportHealthPage;