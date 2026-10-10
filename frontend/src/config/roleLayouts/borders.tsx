import PublicIcon from '@mui/icons-material/Public';
import GroupsIcon from '@mui/icons-material/Groups';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ContactMailIcon from '@mui/icons-material/ContactMail';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import BadgeIcon from '@mui/icons-material/Badge';
import BiotechIcon from '@mui/icons-material/Biotech';
import ApartmentIcon from '@mui/icons-material/Apartment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import type { RoleLayoutConfig } from './core';

/**
 * تخطيط أدوار نظام صحة المعابر البرية.
 *
 * كل الأدوار هنا تشير إلى `/app/borders-health` — لوحة واحدة بأقسام
 * متحركة (لوحة القيادة، المعابر، الفحص، الشحنات، الحجر، التتبع...).
 * الصلاحيات الحقيقية تُطبَّق في الـ backend عبر `borders_health:*`؛
 * الاختلاف بين الأدوار هنا في **التسلسل البصري** فقط.
 */

const STAFF_NAV = [
  { label: 'مركز قيادة المعابر', target: '/app/borders-health', icon: <PublicIcon /> },
  { label: 'المعابر والمرافق', target: '/app/borders-health', icon: <ApartmentIcon /> },
  { label: 'الورديات والكادر', target: '/app/borders-health', icon: <AssignmentIcon /> },
  { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
];

const OFFICER_NAV = [
  { label: 'مركز قيادة المعابر', target: '/app/borders-health', icon: <DashboardIcon /> },
  { label: 'المسافرون والفحص', target: '/app/borders-health', icon: <FactCheckIcon /> },
  { label: 'المركبات', target: '/app/borders-health', icon: <DirectionsBusIcon /> },
  { label: 'الشحنات والعيّنات', target: '/app/borders-health', icon: <LocalShippingIcon /> },
  { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
];

const MEDICAL_NAV = [
  { label: 'مركز قيادة المعابر', target: '/app/borders-health', icon: <DashboardIcon /> },
  { label: 'الفحص الطبي', target: '/app/borders-health', icon: <FactCheckIcon /> },
  { label: 'الحجر والعزل', target: '/app/borders-health', icon: <HealthAndSafetyIcon /> },
  { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
];

const EPIDEMIOLOGY_NAV = [
  { label: 'مركز قيادة المعابر', target: '/app/borders-health', icon: <DashboardIcon /> },
  { label: 'الحجر والعزل', target: '/app/borders-health', icon: <HealthAndSafetyIcon /> },
  { label: 'تتبع المخالطين', target: '/app/borders-health', icon: <ContactMailIcon /> },
  { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
];

const EMERGENCY_NAV = [
  { label: 'مركز قيادة المعابر', target: '/app/borders-health', icon: <DashboardIcon /> },
  { label: 'الطوارئ والحوادث', target: '/app/borders-health', icon: <WarningAmberIcon /> },
  { label: 'العيّنات', target: '/app/borders-health', icon: <BiotechIcon /> },
  { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
];

const INSPECTION_NAV = [
  { label: 'مركز قيادة المعابر', target: '/app/borders-health', icon: <DashboardIcon /> },
  { label: 'الفحص والتفتيش', target: '/app/borders-health', icon: <FactCheckIcon /> },
  { label: 'الشحنات والعيّنات', target: '/app/borders-health', icon: <LocalShippingIcon /> },
  { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
];

const READONLY_NAV = [
  { label: 'مركز قيادة المعابر', target: '/app/borders-health', icon: <PublicIcon /> },
  { label: 'المسافرون', target: '/app/borders-health', icon: <GroupsIcon /> },
  { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
];

const LEADERSHIP_NAV = [
  { label: 'مركز قيادة المعابر', target: '/app/borders-health', icon: <DashboardIcon /> },
  { label: 'المعابر والأداء', target: '/app/borders-health', icon: <ApartmentIcon /> },
  { label: 'الحجر والعزل', target: '/app/borders-health', icon: <HealthAndSafetyIcon /> },
  { label: 'الطوارئ', target: '/app/borders-health', icon: <WarningAmberIcon /> },
  { label: 'الشهادات', target: '/app/borders-health', icon: <BadgeIcon /> },
  { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
];

export const ROLE_LAYOUT_CONFIG: Partial<Record<string, RoleLayoutConfig>> = {
  BORDER_SYSTEM_ADMIN: {
    title: 'مدير نظام صحة المعابر',
    subtitle: 'Border Health System Administrator',
    brand: 'وزارة الصحة الاتحادية',
    color: '#16855B',
    nav: STAFF_NAV,
  },
  BORDER_STATION_MANAGER: {
    title: 'مدير محطة المعبر',
    subtitle: 'Border Station Manager',
    brand: 'وزارة الصحة الاتحادية',
    color: '#16855B',
    nav: STAFF_NAV,
  },
  BORDER_HEALTH_OFFICER: {
    title: 'ضابط الصحة الحدودية',
    subtitle: 'Border Health Officer',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0B5ED7',
    nav: OFFICER_NAV,
  },
  QUARANTINE_DOCTOR: {
    title: 'طبيب الحجر',
    subtitle: 'Quarantine Doctor',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0e7490',
    nav: MEDICAL_NAV,
  },
  TRAVELER_REGISTRATION_OFFICER: {
    title: 'موظف تسجيل المسافرين',
    subtitle: 'Traveler Registration Officer',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0B5ED7',
    nav: READONLY_NAV,
  },
  ENV_INSPECTOR: {
    title: 'مفتش الصحة البيئية',
    subtitle: 'Environmental Health Inspector',
    brand: 'وزارة الصحة الاتحادية',
    color: '#16855B',
    nav: INSPECTION_NAV,
  },
  EPIDEMIOLOGY_OFFICER: {
    title: 'ضابط الترصد',
    subtitle: 'Epidemiology Officer',
    brand: 'وزارة الصحة الاتحادية',
    color: '#7C3AED',
    nav: EPIDEMIOLOGY_NAV,
  },
  EMERGENCY_OFFICER: {
    title: 'ضابط الطوارئ',
    subtitle: 'Emergency Officer',
    brand: 'وزارة الصحة الاتحادية',
    color: '#c1121f',
    nav: EMERGENCY_NAV,
  },
  CUSTOMS_OFFICER: {
    title: 'ضابط الجمارك',
    subtitle: 'Customs Officer',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0B5ED7',
    nav: READONLY_NAV,
  },
  IMMIGRATION_OFFICER: {
    title: 'ضابط الهجرة',
    subtitle: 'Immigration Officer',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0B5ED7',
    nav: READONLY_NAV,
  },
  BORDER_DIRECTOR: {
    title: 'مدير صحة المعابر',
    subtitle: 'Border Health Director',
    brand: 'وزارة الصحة الاتحادية',
    color: '#16855B',
    nav: LEADERSHIP_NAV,
  },
  QUARANTINE_SECTOR_DIRECTOR: {
    title: 'مدير قطاع الحجر الصحي',
    subtitle: 'Quarantine Sector Director',
    brand: 'وزارة الصحة الاتحادية',
    color: '#7C3AED',
    nav: LEADERSHIP_NAV,
  },
  NATIONAL_QUARANTINE_DIRECTOR: {
    title: 'المدير الوطني للحجر الصحي',
    subtitle: 'National Quarantine Director',
    brand: 'وزارة الصحة الاتحادية',
    color: '#06463c',
    nav: LEADERSHIP_NAV,
  },
};
