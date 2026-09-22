import DashboardIcon from '@mui/icons-material/Dashboard';
import HomeIcon from '@mui/icons-material/Home';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import AirplaneTicketIcon from '@mui/icons-material/AirplaneTicket';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ScienceIcon from '@mui/icons-material/Science';
import AnchorIcon from '@mui/icons-material/Anchor';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import DescriptionIcon from '@mui/icons-material/Description';
import Groups2Icon from '@mui/icons-material/Groups2';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ExploreIcon from '@mui/icons-material/Explore';
import RiskIcon from '@mui/icons-material/Insights';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PeopleIcon from '@mui/icons-material/People';
import IntegrationInstructionsIconSafe from '@mui/icons-material/IntegrationInstructions';
import PublicHealthIconSafe from '@mui/icons-material/Public';
import SettingsIcon from '@mui/icons-material/Settings';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import NotificationsIcon from '@mui/icons-material/Notifications';
import FlightIcon from '@mui/icons-material/Flight';
import BiotechIcon from '@mui/icons-material/Biotech';
import PaidIcon from '@mui/icons-material/Paid';
import HistoryIcon from '@mui/icons-material/History';
import ArticleIcon from '@mui/icons-material/Article';
import BugReportIcon from '@mui/icons-material/BugReport';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import GovernmentHeader from '../../components/common/GovernmentHeader';
import type { RoleLayoutConfig } from './core';

export const ROLE_LAYOUT_CONFIG: Partial<Record<string, RoleLayoutConfig>> = {
  ADMIN: {
    title: 'لوحة التحكم',
    subtitle: 'Federal Administration',
    brand: 'وزارة الصحة الاتحادية – السودان',
    color: '#0c7f6a',
    overline: 'الإدارة الاتحادية للحجر الصحي',
    logo: <GovernmentHeader />,
    nav: [
      { label: 'لوحة التحكم', target: '/app', exact: true, icon: <DashboardIcon /> },
      { label: 'لوحة موظف الحجر', target: '/app/port-officer', icon: <HealthAndSafetyIcon /> },
      { label: 'بوابة شركات الطيران', target: '/app/carrier', icon: <FlightTakeoffIcon /> },
      {
        label: 'القيادة الوطنية',
        icon: <MonitorHeartIcon />,
        children: [
          { label: 'مركز القيادة القومي', target: '/app/national-command' },
          { label: 'لوحة مدير الحجر', target: '/app/quarantine-director' },
          { label: 'لوحة مفتش الحجر', target: '/app/quarantine-inspector' },
          { label: 'لوحة مدير القطاع', target: '/app/sector-manager' },
          { label: 'لوحة مكافحة الأوبئة', target: '/app/epidemic-dashboard' },
          { label: 'الترصد الصحي', target: '/app/surveillance' },
          { label: 'لوحة مدير رقابة الأغذية', target: '/app/food-director' },
        ],
      },
      {
        label: 'المنافذ والمسافرون',
        icon: <AirplaneTicketIcon />,
        children: [
          { label: 'المسافرون', target: '/app/travelers' },
          { label: 'الفحص الصحي', target: '/app/screening' },
          { label: 'الرحلات', target: '/app/carriers' },
          { label: 'نظام صحة المطارات', target: '/app/airport-health' },
          { label: 'صحة الموانئ', target: '/app/port-health' },
          { label: 'مركز القيادة الصحي', target: '/app/health' },
          { label: 'العيادة', target: '/app/clinic/dashboard' },
          { label: 'التطعيم الدولي', target: '/app/vaccination' },
        ],
      },
      {
        label: 'سلامة الغذاء',
        icon: <RestaurantIcon />,
        children: [
          { label: 'نافذة الأغذية', target: '/app/food-window' },
          { label: 'الغذاء', target: '/app/food' },
          { label: 'عمليات رقابة الأغذية', target: '/app/food-ops' },
          { label: 'معمل الأغذية', target: '/app/food-lab' },
          { label: 'تسعير الفحوص المخبرية', target: '/app/food-lab/pricing' },
          { label: 'مكتب الاستلام', target: '/app/reception' },
          { label: 'قسم الكيمياء', target: '/app/chemistry' },
          { label: 'قسم الأحياء الدقيقة', target: '/app/microbiology' },
          { label: 'الترصد الغذائي', target: '/app/food-surveillance' },
        ],
      },
      {
        label: 'البلاغات والتقارير',
        icon: <AssessmentIcon />,
        children: [
          { label: 'البلاغات والطوارئ', target: '/app/emergency' },
          { label: 'المؤشرات الوطنية', target: '/app/risk' },
          { label: 'التكاملات الحكومية', target: '/app/integration' },
          {
            label: 'التكامل مع منظمة الصحة',
            children: [
              { label: 'لوحة WHO', target: '/app/integration/who' },
              { label: 'أحداث IHR', target: '/app/integration/who/events' },
              { label: 'مؤشرات SPAR', target: '/app/integration/who/spar' },
              { label: 'أمراض ICD-11', target: '/app/integration/who/diseases' },
            ],
          },
        ],
      },
      {
        label: 'النظام والتحكم',
        icon: <AdminPanelSettingsIcon />,
        children: [
          { label: 'المستخدمون', target: '/app/users' },
          { label: 'الأدوار والصلاحيات', target: '/app/roles' },
          { label: 'تعيينات الأدوار', target: '/app/roles/assignments' },
          { label: 'الهيكل التنظيمي', target: '/app/organization' },
          { label: 'البيانات الأساسية', target: '/app/master-data' },
          { label: 'إدارة قواعد البيانات', target: '/app/dbadmin' },
          { label: 'رسوم اللائحة المالية 2025', target: '/app/quarantine-fees' },
          { label: 'مكونات الواجهة', target: '/app/ui-kit' },
        ],
      },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  PORT_OFFICER: {
    title: 'موظف الحجر الصحي',
    subtitle: 'Quarantine Officer',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0B5ED7',
    nav: [
      { label: 'الرئيسية', target: '/app/port-officer', icon: <HomeIcon /> },
      { label: 'الفحوصات', target: '/app/screening', icon: <FactCheckIcon /> },
      { label: 'المختبر', target: '/app/laboratory', icon: <ScienceIcon /> },
      { label: 'الغذاء', target: '/app/food', icon: <RestaurantIcon /> },
      { label: 'صحة الموانئ', target: '/app/port-health', icon: <AnchorIcon /> },
      { label: 'التطعيم الدولي', target: '/app/vaccination', icon: <VaccinesIcon /> },
      { label: 'رسوم اللائحة 2025', target: '/app/quarantine-fees', icon: <DescriptionIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  AIRPORT_INSPECTOR: {
    title: 'مفتش صحة المطارات',
    subtitle: 'Airport Health Inspector',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0e7490',
    nav: [
      { label: 'لوحة المفتش', target: '/app/airport', icon: <HomeIcon /> },
      { label: 'فحص المسافرين', target: '/app/screening', icon: <FactCheckIcon /> },
      { label: 'المسافرون', target: '/app/travelers', icon: <Groups2Icon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  DG_MANAGER: {
    title: 'القيادة الوطنية',
    subtitle: 'National Leadership',
    brand: 'وزارة الصحة الاتحادية – السودان',
    color: '#0c7f6a',
    nav: [
      { label: 'الرئيسية', target: '/app', exact: true, icon: <DashboardIcon /> },
      { label: 'لوحة القيادة', target: '/app/national-command', icon: <MonitorHeartIcon /> },
      { label: 'القطاعات', target: '/app/sector-manager', icon: <AccountTreeIcon /> },
      { label: 'قطاع البحر الأحمر', target: '/app/red-sea', icon: <ExploreIcon /> },
      { label: 'المنافذ والمحطات', target: '/app/port-health', icon: <AnchorIcon /> },
      { label: 'المسافرون', target: '/app/travelers', icon: <AirplaneTicketIcon /> },
      { label: 'الفحص الصحي', target: '/app/screening', icon: <FactCheckIcon /> },
      { label: 'الترصد الوبائي', target: '/app/epidemic-dashboard', icon: <RiskIcon /> },
      { label: 'الحجر والعزل', target: '/app/quarantine-director', icon: <HealthAndSafetyIcon /> },
      { label: 'الرحلات', target: '/app/carriers', icon: <FlightTakeoffIcon /> },
      { label: 'التفتيش الصحي', target: '/app/quarantine-inspector', icon: <SearchIcon /> },
      { label: 'الشهادات الصحية', target: '/app/health', icon: <VerifiedIcon /> },
      { label: 'التطعيم الدولي', target: '/app/vaccination', icon: <VaccinesIcon /> },
      { label: 'المختبرات والعينات', target: '/app/laboratory', icon: <ScienceIcon /> },
      { label: 'المخالفات', target: '/app/food-ops', icon: <Inventory2Icon /> },
      { label: 'البلاغات والطوارئ', target: '/app/emergency', icon: <LocalHospitalIcon /> },
      { label: 'الموارد البشرية', target: '/app/organization', icon: <PeopleIcon /> },
      { label: 'التقارير', target: '/app/food-surveillance', icon: <AssessmentIcon /> },
      { label: 'المؤشرات الوطنية', target: '/app/risk', icon: <RiskIcon /> },
      { label: 'التكاملات الحكومية', target: '/app/integration', icon: <IntegrationInstructionsIconSafe /> },
      {
        label: 'التكامل مع منظمة الصحة',
        icon: <PublicHealthIconSafe />,
        children: [
          { label: 'لوحة WHO', target: '/app/integration/who' },
          { label: 'أحداث IHR', target: '/app/integration/who/events' },
          { label: 'مؤشرات SPAR', target: '/app/integration/who/spar' },
          { label: 'أمراض ICD-11', target: '/app/integration/who/diseases' },
        ],
      },
      { label: 'إدارة المستخدمين', target: '/app/users', icon: <SettingsIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  VIEWER: {
    title: 'متصفح النظام',
    subtitle: 'System Viewer',
    brand: 'وزارة الصحة الاتحادية – السودان',
    color: '#455a64',
    nav: [
      { label: 'الرئيسية', target: '/app', exact: true, icon: <HomeIcon /> },
      { label: 'مركز القيادة الصحي', target: '/app/health', icon: <LocalHospitalIcon /> },
      { label: 'الترصد', target: '/app/surveillance', icon: <RiskIcon /> },
      { label: 'التقارير', target: '/app/food-surveillance', icon: <AssessmentIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  FEDERAL_DIRECTOR: {
    title: 'مدير اتحادي',
    subtitle: 'Federal Director',
    brand: 'وزارة الصحة الاتحادية – السودان',
    color: '#0c7f6a',
    nav: [
      { label: 'الرئيسية', target: '/app', exact: true, icon: <HomeIcon /> },
      { label: 'مركز القيادة الصحي', target: '/app/health', icon: <LocalHospitalIcon /> },
      { label: 'الترصد', target: '/app/surveillance', icon: <RiskIcon /> },
      { label: 'المعامل', target: '/app/laboratory', icon: <ScienceIcon /> },
      { label: 'نافذة الأغذية', target: '/app/food-window', icon: <Inventory2Icon /> },
      { label: 'العيادة', target: '/app/clinic/dashboard', icon: <MedicalServicesIcon /> },
      { label: 'التقارير', target: '/app/food-surveillance', icon: <AssessmentIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  POE_MANAGER: {
    title: 'مدير نقطة الدخول',
    subtitle: 'Point of Entry Manager',
    brand: 'وزارة الصحة الاتحادية – السودان',
    color: '#2f6dd0',
    nav: [
      { label: 'لوحة الترصد', target: '/app/surveillance', icon: <RiskIcon /> },
      { label: 'الفحص الصحي', target: '/app/screening', icon: <FactCheckIcon /> },
      { label: 'صحة الموانئ', target: '/app/port-health', icon: <AnchorIcon /> },
      { label: 'المسافرون', target: '/app/travelers', icon: <Groups2Icon /> },
      { label: 'العيادة', target: '/app/clinic/dashboard', icon: <MedicalServicesIcon /> },
      { label: 'التقارير', target: '/app/food-surveillance', icon: <AssessmentIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  SECTOR_MANAGER: {
    title: 'قيادة قطاع البحر الأحمر',
    subtitle: 'Red Sea Sector Command',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0c7f6a',
    nav: [
      { label: 'لوحة القطاع', target: '/dashboard/sector/red-sea', icon: <DashboardIcon /> },
      {
        label: 'إدارة القطاع',
        icon: <AccountTreeIcon />,
        children: [
          { label: 'لوحة القطاع', target: '/dashboard/sector/red-sea' },
          { label: 'الهيكل الإداري', target: '/dashboard/sector/red-sea/staff' },
          { label: 'الموظفون', target: '/dashboard/sector/red-sea/staff' },
        ],
      },
      {
        label: 'نقاط الدخول',
        icon: <AnchorIcon />,
        children: [
          { label: 'المطارات', target: '/dashboard/sector/red-sea/points' },
          { label: 'الموانئ', target: '/dashboard/sector/red-sea/points' },
          { label: 'المعابر البرية', target: '/dashboard/sector/red-sea/points' },
        ],
      },
      {
        label: 'الأنظمة التشغيلية',
        icon: <ScienceIcon />,
        children: [
          { label: 'صحة المطارات', target: '/dashboard/sector/red-sea/airport-health', icon: <FlightTakeoffIcon /> },
          { label: 'صحة الموانئ', target: '/dashboard/sector/red-sea/port-health', icon: <DirectionsBoatIcon /> },
          { label: 'الفسح الغذائي', target: '/dashboard/sector/red-sea/food-safety', icon: <Inventory2Icon /> },
          { label: 'معمل رقابة الأغذية', target: '/dashboard/sector/red-sea/food-lab', icon: <BiotechIcon /> },
          { label: 'مكافحة النواقل', target: '/dashboard/sector/red-sea/vector-control', icon: <BugReportIcon /> },
          { label: 'الترصد', target: '/dashboard/sector/red-sea/surveillance', icon: <RiskIcon /> },
        ],
      },
      { label: 'التقارير', target: '/dashboard/sector/red-sea/reports', icon: <AssessmentIcon /> },
      { label: 'إدارة المحتوى', target: '/dashboard/sector/red-sea/content', icon: <ArticleIcon /> },
      { label: 'التنبيهات', target: '/dashboard/sector/red-sea', icon: <NotificationsIcon /> },
      { label: 'الإيرادات والجباية', target: '/dashboard/sector/red-sea/reports', icon: <PaidIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  AIRPORT_DIRECTOR: {
    title: 'مديرة الحجر الصحي بالمطار',
    subtitle: 'Airport Health Director',
    brand: 'وزارة الصحة الاتحادية',
    color: '#2f6dd0',
    nav: [
      { label: 'الرئيسية', target: '/app/airport-director#overview', icon: <HomeIcon /> },
      { label: 'التنبيهات', target: '/app/airport-director#alerts', icon: <NotificationsIcon /> },
      { label: 'التحليلات', target: '/app/airport-director#operations', icon: <FlightIcon /> },
      { label: 'الرحلات', target: '/app/airport-director#flights', icon: <FlightTakeoffIcon /> },
      { label: 'فحص المسافرين', target: '/app/airport-director#screening', icon: <Groups2Icon /> },
      { label: 'أداء المختبر', target: '/app/airport-director#laboratory', icon: <BiotechIcon /> },
      { label: 'الشحن الجوي', target: '/app/airport-director#cargo', icon: <Inventory2Icon /> },
      { label: 'مواقع المطار', target: '/app/airport-director#terminals', icon: <ScienceIcon /> },
      { label: 'الإيرادات', target: '/app/airport-director#revenue', icon: <PaidIcon /> },
      { label: 'التقارير', target: '/app/airport-director#reports', icon: <DescriptionIcon /> },
      { label: 'الموظفون', target: '/app/airport-director#staff', icon: <PeopleIcon /> },
      { label: 'سجل الأنشطة', target: '/app/airport-director#activity', icon: <HistoryIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
};