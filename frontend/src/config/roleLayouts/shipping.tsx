import DashboardIcon from '@mui/icons-material/Dashboard';
import DescriptionIcon from '@mui/icons-material/Description';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import AnchorIcon from '@mui/icons-material/Anchor';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssignmentIcon from '@mui/icons-material/Assignment';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PeopleIcon from '@mui/icons-material/People';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PersonIcon from '@mui/icons-material/Person';
import type { RoleLayoutConfig, RoleNavItem } from './core';

/**
 * تخطيط أدوار بوابة الشحن البحري.
 *
 * التنقل التشغيلي (الأقسام التسعة) يعيش في القائمة الجانبية للدور عبر
 * أهداف `#hash` — على نمط laboratory/borders — وتقرأه الصفحة لتختار
 * القسم، فلا توجد قائمة جانبية ثانية داخل الصفحة.
 *
 * الصلاحيات الحقيقية تُطبَّق في الـ backend عبر `shipping_*`؛ الدوران
 * يشتركان في نفس القائمة (الاختلاف لفظي في العنوان فقط).
 */
const SHIPPING_NAV: RoleNavItem[] = [
  { label: 'بوابة الشحن', target: '/app/shipping', icon: <DirectionsBoatIcon /> },
  { label: 'لوحة التحكم', target: '/app/shipping#dashboard', icon: <DashboardIcon /> },
  { label: 'السفن', target: '/app/shipping#vessels', icon: <AnchorIcon /> },
  { label: 'الزيارات', target: '/app/shipping#visits', icon: <LocalShippingIcon /> },
  { label: 'المغادرات', target: '/app/shipping#departures', icon: <DirectionsBoatIcon /> },
  { label: 'ما قبل الوصول', target: '/app/shipping#pre-arrivals', icon: <AssignmentIcon /> },
  { label: 'التخليص', target: '/app/shipping#clearance', icon: <FactCheckIcon /> },
  { label: 'الإشعارات', target: '/app/shipping#notifications', icon: <NotificationsActiveIcon /> },
  { label: 'المستندات', target: '/app/shipping#documents', icon: <DescriptionIcon /> },
  { label: 'الوكلاء', target: '/app/shipping#agents', icon: <PeopleIcon /> },
  { label: 'العلاقات', target: '/app/shipping#relationships', icon: <AccountTreeIcon /> },
  { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
];

export const ROLE_LAYOUT_CONFIG: Partial<Record<string, RoleLayoutConfig>> = {
  SHIPPING_COMPANY: {
    title: 'بوابة شركات الشحن',
    subtitle: 'Shipping Company Portal',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0B5ED7',
    nav: SHIPPING_NAV,
  },
  SHIPPING_AGENT: {
    title: 'بوابة وكلاء الشحن',
    subtitle: 'Shipping Agent Portal',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0B5ED7',
    nav: SHIPPING_NAV,
  },
};
