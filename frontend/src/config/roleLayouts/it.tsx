import DashboardIcon from '@mui/icons-material/Dashboard';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import ArticleIcon from '@mui/icons-material/Article';
import BuildIcon from '@mui/icons-material/Build';
import DescriptionIcon from '@mui/icons-material/Description';
import SettingsIcon from '@mui/icons-material/Settings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import ComputerIconSafe from '@mui/icons-material/Computer';
import MemoryIconSafe from '@mui/icons-material/Memory';
import DnsIconSafe from '@mui/icons-material/Dns';
import SupportAgentIconSafe from '@mui/icons-material/SupportAgent';
import NetworkCheckIconSafe from '@mui/icons-material/NetworkCheck';
import AnchorIcon from '@mui/icons-material/Anchor';
import BugReportIcon from '@mui/icons-material/BugReport';
import StorageIcon from '@mui/icons-material/Storage';
import SecurityIcon from '@mui/icons-material/Security';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import VerifiedIcon from '@mui/icons-material/Verified';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import IntegrationInstructionsIconSafe from '@mui/icons-material/IntegrationInstructions';
import PublicHealthIconSafe from '@mui/icons-material/Public';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import BiotechIcon from '@mui/icons-material/Biotech';
import NotificationsIcon from '@mui/icons-material/Notifications';
import type { RoleLayoutConfig } from './core';

export const ROLE_LAYOUT_CONFIG: Partial<Record<string, RoleLayoutConfig>> = {
  IT_ADMIN: {
    title: 'مسؤول تقنية المعلومات',
    subtitle: 'IT Administrator — Red Sea',
    brand: 'وزارة الصحة الاتحادية',
    color: '#1565c0',
    nav: [
      { label: 'لوحة تقنية المعلومات', target: '/dashboard/sector/red-sea/it', icon: <DashboardIcon /> },
      { label: 'لوحة القطاع', target: '/dashboard/sector/red-sea', icon: <MonitorHeartIcon /> },
      { label: 'إدارة المحتوى', target: '/dashboard/sector/red-sea/content', icon: <ArticleIcon /> },
      {
        label: 'صيانة الموقع',
        icon: <BuildIcon />,
        children: [
          { label: 'إدارة المحتوى', target: '/dashboard/sector/red-sea/content', icon: <ArticleIcon /> },
          { label: 'الوثائق والنماذج', target: '/dashboard/sector/red-sea/content?tab=documents', icon: <DescriptionIcon /> },
          { label: 'إعدادات الموقع', target: '/dashboard/sector/red-sea/content?tab=settings', icon: <SettingsIcon /> },
        ],
      },
      { label: 'التقارير', target: '/dashboard/sector/red-sea/reports', icon: <AssessmentIcon /> },
      { label: 'الموظفون', target: '/dashboard/sector/red-sea/staff', icon: <PeopleIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  SECTOR_IT_MANAGER: {
    title: 'مدير تقنية المعلومات للقطاع',
    subtitle: 'Sector IT Manager — Red Sea',
    brand: 'وزارة الصحة الاتحادية',
    color: '#1565c0',
    nav: [
      { label: 'لوحة تقنية المعلومات', target: '/dashboard/sector/red-sea/it', icon: <DashboardIcon /> },
      {
        label: 'إدارة تقنية المعلومات',
        icon: <ComputerIconSafe />,
        children: [
          { label: 'لوحة التحكم', target: '/dashboard/sector/red-sea/it', icon: <DashboardIcon /> },
          { label: 'حالة الأنظمة', target: '/dashboard/sector/red-sea/it/systems', icon: <MemoryIconSafe /> },
          { label: 'الأصول والأجهزة', target: '/dashboard/sector/red-sea/it/assets', icon: <DnsIconSafe /> },
          { label: 'تذاكر الدعم', target: '/dashboard/sector/red-sea/it/tickets', icon: <SupportAgentIconSafe /> },
          { label: 'الشبكات', target: '/dashboard/sector/red-sea/it/networks', icon: <NetworkCheckIconSafe /> },
          { label: 'التقارير الفنية', target: '/dashboard/sector/red-sea/it/reports', icon: <AssessmentIcon /> },
        ],
      },
      { label: 'لوحة القطاع', target: '/dashboard/sector/red-sea', icon: <MonitorHeartIcon /> },
      {
        label: 'نقاط الدخول',
        icon: <AnchorIcon />,
        children: [
          { label: 'المطارات', target: '/dashboard/sector/red-sea/points' },
          { label: 'الموانئ', target: '/dashboard/sector/red-sea/points' },
          { label: 'المعابر البرية', target: '/dashboard/sector/red-sea/points' },
        ],
      },
      { label: 'التقارير', target: '/dashboard/sector/red-sea/reports', icon: <AssessmentIcon /> },
      { label: 'الموظفون', target: '/dashboard/sector/red-sea/staff', icon: <PeopleIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  NATIONAL_IT_DIRECTOR: {
    title: 'مدير تقنية المعلومات القومي',
    subtitle: 'National IT Director',
    brand: 'وزارة الصحة الاتحادية – الحجر الصحي القومي',
    color: '#1565c0',
    nav: [
      { label: 'لوحة التحكم الوطنية', target: '/dashboard/national/it', icon: <DashboardIcon /> },
      {
        label: 'الأنظمة القومية',
        icon: <ComputerIconSafe />,
        children: [
          { label: 'حالة الأنظمة', target: '/dashboard/national/it/systems', icon: <MemoryIconSafe /> },
          { label: 'سجل الأخطاء', target: '/dashboard/national/it/systems?tab=errors', icon: <BugReportIcon /> },
        ],
      },
      {
        label: 'البنية التحتية',
        icon: <DnsIconSafe />,
        children: [
          { label: 'الخوادم', target: '/dashboard/national/it', icon: <StorageIcon /> },
          { label: 'قواعد البيانات', target: '/dashboard/national/it', icon: <MemoryIconSafe /> },
          { label: 'الشبكات', target: '/dashboard/national/it', icon: <NetworkCheckIconSafe /> },
          { label: 'النسخ الاحتياطي', target: '/dashboard/national/it', icon: <StorageIcon /> },
        ],
      },
      {
        label: 'الأمن السيبراني',
        icon: <SecurityIcon />,
        children: [
          { label: 'سجل التدقيق', target: '/dashboard/national/it', icon: <FindInPageIcon /> },
          { label: 'الصلاحيات', target: '/dashboard/national/it', icon: <VerifiedIcon /> },
        ],
      },
      {
        label: 'أداء القطاعات',
        icon: <AccountTreeIcon />,
        children: [
          { label: 'تقرير القطاعات', target: '/dashboard/national/it/sectors-performance', icon: <AssessmentIcon /> },
          { label: 'مؤشرات الأداء', target: '/dashboard/national/it/sectors-performance', icon: <DashboardIcon /> },
        ],
      },
      { label: 'التكامل الحكومي', target: '/dashboard/national/it', icon: <IntegrationInstructionsIconSafe /> },
      {
        label: 'تكامل WHO',
        icon: <PublicHealthIconSafe />,
        children: [
          { label: 'لوحة WHO', target: '/app/integration/who', icon: <PublicHealthIconSafe /> },
          { label: 'أحداث IHR (مراقبة)', target: '/app/integration/who/events', icon: <MedicalServicesIcon /> },
          { label: 'أمراض ICD-11', target: '/app/integration/who/diseases', icon: <BiotechIcon /> },
        ],
      },
      { label: 'الدعم الفني', target: '/dashboard/national/it', icon: <SupportAgentIconSafe /> },
      { label: 'التقارير التنفيذية', target: '/dashboard/national/it/systems', icon: <DescriptionIcon /> },
      { label: 'التنبيهات', target: '/dashboard/national/it', icon: <NotificationsIcon /> },
      { label: 'الإعدادات', target: '/app/account', icon: <SettingsIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
};