import HomeIcon from '@mui/icons-material/Home';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import BiotechIcon from '@mui/icons-material/Biotech';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonIcon from '@mui/icons-material/Person';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import SendIcon from '@mui/icons-material/Send';
import DescriptionIcon from '@mui/icons-material/Description';
import EditNoteIconSafe from '@mui/icons-material/EditNote';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import PaidIcon from '@mui/icons-material/Paid';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AnchorIcon from '@mui/icons-material/Anchor';
import ScienceIcon from '@mui/icons-material/Science';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import BugReportIcon from '@mui/icons-material/BugReport';
import RiskIcon from '@mui/icons-material/Insights';
import NotificationsIcon from '@mui/icons-material/Notifications';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import CancelIcon from '@mui/icons-material/Cancel';
import PeopleIcon from '@mui/icons-material/People';
import HistoryIcon from '@mui/icons-material/History';
import VerifiedIcon from '@mui/icons-material/Verified';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import TimerIcon from '@mui/icons-material/Timer';
import GrainIcon from '@mui/icons-material/Grain';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import GroupsIcon from '@mui/icons-material/Groups';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import type { RoleLayoutConfig } from './core';

export const ROLE_LAYOUT_CONFIG: Partial<Record<string, RoleLayoutConfig>> = {
  FOOD_INSPECTOR: {
    title: 'مفتش الغذاء',
    subtitle: 'Food Inspector',
    brand: 'وزارة الصحة الاتحادية',
    color: '#fd7e14',
    nav: [
      { label: 'لوحة التفتيش', target: '/app/inspector-dashboard', icon: <HomeIcon /> },
      { label: 'الغذاء', target: '/app/food', icon: <RestaurantIcon /> },
      { label: 'عمليات رقابة الأغذية', target: '/app/food-ops', icon: <Inventory2Icon /> },
      { label: 'معمل رقابة الأغذية (FCLIS)', target: '/app/food-lab', icon: <BiotechIcon /> },
      { label: 'الترصد الغذائي', target: '/app/food-surveillance', icon: <AssessmentIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  CLERK: {
    title: 'كاتب رقابة الأغذية',
    subtitle: 'Food Control Clerk',
    brand: 'وزارة الصحة الاتحادية',
    color: '#1d6fd1',
    nav: [
      { label: 'الرئيسية', target: '/food-safety/clerk/dashboard?view=home', icon: <HomeIcon /> },
      { label: 'الوارد', target: '/food-safety/clerk/dashboard?view=import', icon: <MoveToInboxIcon /> },
      { label: 'الصادر', target: '/food-safety/clerk/dashboard?view=export', icon: <SendIcon /> },
      { label: 'كل الطلبات', target: '/food-safety/clerk/dashboard?view=requests', icon: <DescriptionIcon /> },
      { label: 'المسودات', target: '/food-safety/clerk/dashboard?view=drafts', icon: <EditNoteIconSafe /> },
      { label: 'البحث', target: '/food-safety/clerk/dashboard?view=search', icon: <SearchIcon /> },
      { label: 'الإعدادات', target: '/food-safety/clerk/dashboard?view=settings', icon: <SettingsIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  ACCOUNTANT: {
    title: 'المحاسب المالي',
    subtitle: 'Food Control Accountant',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0e7a4d',
    nav: [
      { label: 'الرئيسية', target: '/app/accountant-dashboard?view=home', icon: <HomeIcon /> },
      { label: 'التحصيل', target: '/app/accountant-dashboard?view=collections', icon: <PaidIcon /> },
      { label: 'الفواتير', target: '/app/accountant-dashboard?view=invoices', icon: <ReceiptLongIcon /> },
      { label: 'المدفوعات', target: '/app/accountant-dashboard?view=receipts', icon: <ReceiptIcon /> },
      { label: 'التقارير', target: '/app/accountant-dashboard?view=reports', icon: <AssessmentIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  STATION_HEAD: {
    title: 'رئيس القسم — رقابة الأغذية',
    subtitle: 'Food Control Section Head',
    brand: 'وزارة الصحة الاتحادية',
    color: '#b45309',
    nav: [
      { label: 'لوحة رئيس القسم', target: '/app/station-dashboard', icon: <DashboardIcon /> },
      { label: 'عمليات رقابة الأغذية', target: '/app/food-ops', icon: <Inventory2Icon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  SECTOR_HEAD: {
    title: 'مدير رقابة الأغذية بالقطاع',
    subtitle: 'Food Safety Sector Head',
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
      { label: 'التنبيهات', target: '/dashboard/sector/red-sea', icon: <NotificationsIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  FOOD_DIRECTOR: {
    title: 'مدير رقابة الأغذية',
    subtitle: 'Food Control Director',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0e8a72',
    nav: [
      { label: 'الرئيسية', target: '/app/food-director#overview', icon: <HomeIcon /> },
      { label: 'التقارير', target: '/app/food-director#reports', icon: <DescriptionIcon /> },
      { label: 'التحليلات', target: '/app/food-director#operations', icon: <RiskIcon /> },
      { label: 'أداء المحطات', target: '/app/food-director#stations', icon: <AccountTreeIcon /> },
      { label: 'أداء المختبر', target: '/app/food-director#laboratory', icon: <BiotechIcon /> },
      { label: 'الوارد', target: '/app/food-director#trade', icon: <MoveToInboxIcon /> },
      { label: 'الصادر', target: '/app/food-director#trade', icon: <LocalShippingIcon /> },
      { label: 'تحليل الرفض', target: '/app/food-director#rejection', icon: <CancelIcon /> },
      { label: 'الإيرادات', target: '/app/food-director#revenue', icon: <PaidIcon /> },
      { label: 'التنبيهات', target: '/app/food-director#alerts', icon: <NotificationsIcon /> },
      { label: 'مستخدمو المحطات', target: '/app/food-director#station-users', icon: <PeopleIcon /> },
      { label: 'سجل الأنشطة', target: '/app/food-director#activity', icon: <HistoryIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  FOOD_WINDOW_CLERK: {
    title: 'موظّف نافذة الأغذية',
    subtitle: 'Food Window Clerk',
    brand: 'نافذة الأغذية الموحدة',
    color: '#0c7f6a',
    nav: [
      { label: 'الرئيسية', target: '/app/food-window', icon: <DashboardIcon /> },
      { label: 'المعاملات', target: '/app/food-window#transactions', icon: <LocalShippingIcon /> },
      { label: 'القرارات', target: '/app/food-window#decisions', icon: <VerifiedIcon /> },
      { label: 'نطاق الصلاحيات', target: '/app/food-window#scope', icon: <ScienceIcon /> },
      { label: 'السجل', target: '/app/food-window#audit', icon: <HistoryIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  FOOD_WINDOW_SUPERVISOR: {
    title: 'مشرف نافذة الأغذية',
    subtitle: 'Food Window Supervisor',
    brand: 'نافذة الأغذية الموحدة',
    color: '#0c7f6a',
    nav: [
      { label: 'الرئيسية', target: '/app/food-window', icon: <DashboardIcon /> },
      { label: 'المعاملات', target: '/app/food-window#transactions', icon: <LocalShippingIcon /> },
      { label: 'القرارات', target: '/app/food-window#decisions', icon: <VerifiedIcon /> },
      { label: 'التعيينات', target: '/app/food-window#assignments', icon: <PeopleIcon /> },
      { label: 'السجل', target: '/app/food-window#audit', icon: <HistoryIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  CHEM_SECTION_HEAD: {
    title: 'رئيس قسم الكيمياء',
    subtitle: 'Chemistry Section Head',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0B5ED7',
    nav: [
      { label: 'قسم الكيمياء', target: '/app/chemistry', icon: <HomeIcon /> },
      { label: 'لوحة المحلل', target: '/app/chemistry-analyst', icon: <DashboardIcon /> },
      { label: 'ضبط الجودة', target: '/app/chemistry-qc', icon: <FactCheckIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  CHEM_ANALYST: {
    title: 'محلل الكيمياء — FCLIS',
    subtitle: 'Chemistry Analyst',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0B5ED7',
    nav: [
      { label: 'الرئيسية', target: '/app/chemistry-analyst', icon: <HomeIcon /> },
      {
        label: 'العينات',
        icon: <Inventory2Icon />,
        children: [
          { label: 'جديدة', target: '/app/chemistry-analyst?filter=new' },
          { label: 'قيد التحليل', target: '/app/chemistry-analyst?filter=in_analysis' },
          { label: 'مسودات', target: '/app/chemistry-analyst?filter=drafts' },
          { label: 'مرسلة للمراجعة', target: '/app/chemistry-analyst?filter=submitted' },
        ],
      },
      { label: 'التحاليل', target: '/app/chemistry-analyst?view=analysis', icon: <BiotechIcon /> },
      { label: 'النتائج', target: '/app/chemistry-analyst?view=results', icon: <FactCheckIcon /> },
      { label: 'ضبط الجودة', target: '/app/chemistry-qc', icon: <DescriptionIcon /> },
      { label: 'SLA', target: '/app/chemistry-analyst?view=sla', icon: <TimerIcon /> },
      { label: 'التنبيهات', target: '/app/chemistry-analyst?view=alerts', icon: <NotificationsIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
      { label: 'الإعدادات', target: '/app/account', icon: <SettingsIcon /> },
    ],
  },
  MICRO_ANALYST: {
    title: 'محلل الأحياء الدقيقة — FCLIS',
    subtitle: 'Microbiology Analyst',
    brand: 'وزارة الصحة الاتحادية',
    color: '#6f42c1',
    nav: [
      { label: 'الرئيسية', target: '/app/microbiology-analyst', icon: <HomeIcon /> },
      {
        label: 'عيناتي',
        icon: <Inventory2Icon />,
        children: [
          { label: 'جديدة', target: '/app/microbiology-analyst?filter=new' },
          { label: 'قيد التحليل', target: '/app/microbiology-analyst?filter=in_analysis' },
          { label: 'قيد الحضانة', target: '/app/microbiology-analyst?filter=incubation' },
          { label: 'جاهزة للقراءة', target: '/app/microbiology-analyst?filter=ready_reading' },
          { label: 'للمراجعة', target: '/app/microbiology-analyst?filter=submitted' },
          { label: 'المعادة', target: '/app/microbiology-analyst?filter=returned' },
        ],
      },
      {
        label: 'التحاليل',
        icon: <BiotechIcon />,
        children: [
          { label: 'Salmonella', target: '/app/microbiology-analyst?test=salmonella' },
          { label: 'E.coli', target: '/app/microbiology-analyst?test=ecoli' },
          { label: 'Coliform', target: '/app/microbiology-analyst?test=coliform' },
          { label: 'Listeria', target: '/app/microbiology-analyst?test=listeria' },
          { label: 'Yeast & Mold', target: '/app/microbiology-analyst?test=yeast_mold' },
          { label: 'Total Plate Count', target: '/app/microbiology-analyst?test=tpc' },
        ],
      },
      {
        label: 'الزراعة والحضانة',
        icon: <ScienceIcon />,
        children: [
          { label: 'Incubation', target: '/app/microbiology-analyst?view=incubation' },
          { label: 'Reading', target: '/app/microbiology-analyst?view=reading' },
        ],
      },
      { label: 'QC', target: '/app/microbiology-analyst?filter=submitted', icon: <FactCheckIcon /> },
      {
        label: 'المواصفات',
        icon: <GrainIcon />,
        children: [{ label: 'Microbiological Limits', target: '/app/microbiology-analyst?view=specs' }],
      },
      { label: 'الأجهزة', target: '/app/microbiology-analyst?view=equipment', icon: <ScienceOutlinedIcon /> },
      { label: 'Media & Reagents', target: '/app/microbiology-analyst?view=media', icon: <BugReportIcon /> },
      { label: 'SLA', target: '/app/microbiology-analyst?view=sla', icon: <TimerIcon /> },
      { label: 'النتائج', target: '/app/microbiology-analyst?view=results', icon: <FactCheckIcon /> },
      { label: 'التنبيهات', target: '/app/microbiology-analyst?view=alerts', badge: 'micro', icon: <NotificationsIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
      { label: 'الإعدادات', target: '/app/account', icon: <SettingsIcon /> },
    ],
  },
  MICRO_SECTION_HEAD: {
    title: 'رئيس قسم الأحياء الدقيقة — FCLIS',
    subtitle: 'Microbiology Section Head',
    brand: 'وزارة الصحة الاتحادية',
    color: '#6f42c1',
    nav: [
      { label: 'لوحة رئيس القسم', target: '/app/microbiology#home', icon: <DashboardIcon /> },
      {
        label: 'العينات',
        icon: <BiotechIcon />,
        children: [
          { label: 'الواردة', target: '/app/microbiology#samples.arrived' },
          { label: 'قيد التحليل', target: '/app/microbiology#samples.inprogress' },
          { label: 'للمراجعة', target: '/app/microbiology#samples.review' },
          { label: 'المكتملة', target: '/app/microbiology#samples.completed' },
          { label: 'المتأخرة', target: '/app/microbiology#samples.overdue' },
        ],
      },
      {
        label: 'المحللون',
        icon: <GroupsIcon />,
        children: [
          { label: 'قائمة المحللين', target: '/app/microbiology#analysts.list' },
          { label: 'عبء العمل', target: '/app/microbiology#analysts.workload' },
        ],
      },
      {
        label: 'التحاليل',
        icon: <ScienceIcon />,
        children: [
          { label: 'السالمونيلا Salmonella', target: '/app/microbiology#analysis.salmonella' },
          { label: 'القولونية البرازية E. coli', target: '/app/microbiology#analysis.ecoli' },
          { label: 'الكوليفورم Coliform', target: '/app/microbiology#analysis.coliform' },
          { label: 'الليستيريا Listeria', target: '/app/microbiology#analysis.listeria' },
          { label: 'فحوصات ميكروبية أخرى', target: '/app/microbiology#analysis.other' },
        ],
      },
      { label: 'المواصفات', target: '/app/microbiology#specs', icon: <VerifiedIcon /> },
      { label: 'الجودة QC', target: '/app/microbiology#qc', icon: <FactCheckIcon /> },
      { label: 'متابعة SLA', target: '/app/microbiology#sla', icon: <TimerIcon /> },
      { label: 'النتائج', target: '/app/microbiology#results', icon: <VerifiedIcon /> },
      { label: 'التقارير', target: '/app/microbiology#reports', icon: <AssessmentIcon /> },
      { label: 'التنبيهات', target: '/app/microbiology#alerts', badge: 'micro', icon: <NotificationsActiveIcon /> },
      { label: 'الإعدادات', target: '/app/account', icon: <SettingsIcon /> },
    ],
  },
  DEPT_MANAGER: {
    title: 'مدير إدارة',
    subtitle: 'Department Manager',
    brand: 'وزارة الصحة الاتحادية',
    color: '#1d7a54',
    nav: [
      { label: 'عمليات رقابة الأغذية', target: '/app/food-ops', icon: <HomeIcon /> },
      { label: 'لوحة مدير رقابة الأغذية', target: '/app/food-director', icon: <RestaurantIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  EPIDEMIC_CONTROL_MANAGER: {
    title: 'مدير مكافحة الأوبئة',
    subtitle: 'Epidemic Control Manager',
    brand: 'وزارة الصحة الاتحادية',
    color: '#c63a3a',
    nav: [
      { label: 'لوحة مكافحة الأوبئة', target: '/app/epidemic-dashboard', icon: <HomeIcon /> },
      { label: 'الترصد الغذائي', target: '/app/food-surveillance', icon: <AssessmentIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  FOOD_SURVEILLANCE_MANAGER: {
    title: 'مدير الترصد الغذائي',
    subtitle: 'Food Surveillance Manager',
    brand: 'وزارة الصحة الاتحادية',
    color: '#1d7a54',
    nav: [
      { label: 'الترصد الغذائي', target: '/app/food-surveillance', icon: <HomeIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  RISK_ANALYST: {
    title: 'محلل المخاطر',
    subtitle: 'Risk Analyst',
    brand: 'وزارة الصحة الاتحادية',
    color: '#6f42c1',
    nav: [
      { label: 'تقييم المخاطر', target: '/app/risk', icon: <RiskIcon /> },
      { label: 'الترصد الغذائي', target: '/app/food-surveillance', icon: <AssessmentIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
};