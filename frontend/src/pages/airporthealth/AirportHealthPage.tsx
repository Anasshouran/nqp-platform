import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
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
import AirplaneTicketIcon from '@mui/icons-material/AirplaneTicket';
import BarChartIcon from '@mui/icons-material/BarChart';
import DescriptionIcon from '@mui/icons-material/Description';
import EmergencyIcon from '@mui/icons-material/Campaign';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { PageHeader } from '../../components/uikit';
import { CommandSectionRail, useCommandSections, type CommandSectionDef } from '../../components/command';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { useAuth } from '../../hooks/useAuth';
import { OfflinePill } from './shared';
import * as Operations from './screens/operations';
import * as PassengerHealth from './screens/passenger-health';
import * as Clinical from './screens/clinical';
import * as InspectionScreens from './screens/inspection';
import * as AdminScreens from './screens/admin';

const getSections = (t: (key: string) => string): CommandSectionDef[] => [
  { id: 'dashboard', label: t('borders.airportHealth.nav.dashboard'), icon: <DashboardOutlinedIcon fontSize="small" /> },
  { id: 'flights', label: t('borders.airportHealth.nav.flights'), icon: <FlightTakeoffIcon fontSize="small" /> },
  { id: 'flight-details', label: t('borders.airportHealth.nav.flightDetails'), icon: <FlightLandIcon fontSize="small" /> },
  { id: 'crew', label: t('borders.airportHealth.nav.crew'), icon: <GroupsIcon fontSize="small" /> },
  { id: 'screening', label: t('borders.airportHealth.nav.screening'), icon: <ManageSearchIcon fontSize="small" /> },
  { id: 'declaration', label: t('borders.airportHealth.nav.declaration'), icon: <EditNoteIcon fontSize="small" /> },
  { id: 'risk-assessment', label: t('borders.airportHealth.nav.riskAssessment'), icon: <AssessmentIcon fontSize="small" /> },
  { id: 'vaccination', label: t('borders.airportHealth.nav.vaccination'), icon: <VaccinesIcon fontSize="small" /> },
  { id: 'suspected', label: t('borders.airportHealth.nav.suspected'), icon: <WarningAmberIcon fontSize="small" /> },
  { id: 'isolation', label: t('borders.airportHealth.nav.isolation'), icon: <HealthAndSafetyOutlinedIcon fontSize="small" /> },
  { id: 'lab', label: t('borders.airportHealth.nav.lab'), icon: <BiotechIcon fontSize="small" /> },
  { id: 'contact-tracing', label: t('borders.airportHealth.nav.contactTracing'), icon: <Groups2Icon fontSize="small" /> },
  { id: 'inspection', label: t('borders.airportHealth.nav.inspection'), icon: <AirplaneTicketIcon fontSize="small" /> },
  { id: 'analytics', label: t('borders.airportHealth.nav.analytics'), icon: <BarChartIcon fontSize="small" /> },
  { id: 'certificates', label: t('borders.airportHealth.nav.certificates'), icon: <DescriptionIcon fontSize="small" /> },
  { id: 'emergency', label: t('borders.airportHealth.nav.emergency'), icon: <EmergencyIcon fontSize="small" /> },
  { id: 'users', label: t('borders.airportHealth.nav.users'), icon: <AdminPanelSettingsIcon fontSize="small" /> },
  { id: 'roles', label: t('borders.airportHealth.nav.roles'), icon: <SecurityIcon fontSize="small" /> },
  { id: 'audit-logs', label: t('borders.airportHealth.nav.auditLogs'), icon: <HistoryIcon fontSize="small" /> },
  { id: 'settings', label: t('borders.airportHealth.nav.settings'), icon: <SettingsIcon fontSize="small" /> },
  { id: 'notifications', label: t('borders.airportHealth.nav.notifications'), icon: <NotificationsActiveIcon fontSize="small" /> },
];

/** الصلاحية المطلوبة لعرض كل قسم في صفحة صحة المطارات (بصيغة `resource:action`). */
const SECTION_PERMISSIONS: Record<string, string> = {
  dashboard: 'airport_health:view',
  flights: 'airport_health:view',
  'flight-details': 'airport_health:view',
  crew: 'airport_health:view',
  screening: 'screening:view',
  declaration: 'airport_health:view',
  'risk-assessment': 'risk:view',
  vaccination: 'vaccination:view',
  suspected: 'screening:view',
  isolation: 'clinic:view',
  lab: 'laboratory:view',
  'contact-tracing': 'surveillance:view',
  emergency: 'emergency:view',
  inspection: 'airport_health:view',
  analytics: 'reports:view',
  certificates: 'airport_health:view',
  users: 'organization:view',
  roles: 'organization:view',
  'audit-logs': 'organization:view',
  settings: 'airport_health:edit',
  notifications: 'notifications:view',
};

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

const AirportHealthPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const permissions = useMemo(() => user?.permissions ?? [], [user?.permissions]);
  const SECTIONS = useMemo(() => {
    const all = getSections(t);
    return all.filter((section) => {
      const perm = SECTION_PERMISSIONS[section.id];
      if (!perm) return true;
      if (!permissions?.length) return true;
      return permissions.includes(perm);
    });
  }, [t, permissions]);
  const { active, register, scrollTo } = useCommandSections(SECTIONS);
  const { status } = useOfflineSync();
  const pillState = status === 'OFFLINE' ? 'OFFLINE' : status === 'SYNC_PENDING' ? 'SYNCING' : 'ONLINE';

  return (
    <Box>
      <PageHeader
        title={t('borders.airportHealth.title')}
        subtitle={t('borders.airportHealth.subtitle')}
        eyebrow={t('borders.airportHealth.eyebrow')}
        action={<OfflinePill state={pillState} t={t} />}
      />

      <Grid container spacing={0} sx={{ mt: 3 }} columnSpacing={3}>
        <Grid item xs={12} md={2.2} lg={1.8}>
          <CommandSectionRail
            sections={SECTIONS}
            active={active}
            onNavigate={scrollTo}
            accent="primary.main"
            label={t('borders.airportHealth.groups.operations')}
          />
        </Grid>
        <Grid item xs={12} md={9.8} lg={10.2}>
          {SECTIONS.map((section) => {
            const Screen = SCREEN[section.id];
            return (
              <Box
                key={section.id}
                component="section"
                ref={register(section.id)}
                data-section={section.id}
                sx={{ scrollMarginTop: '80px', mb: 4 }}
              >
                {Screen ? <Screen nav={scrollTo} /> : null}
              </Box>
            );
          })}
        </Grid>
      </Grid>
    </Box>
  );
};

export default AirportHealthPage;
