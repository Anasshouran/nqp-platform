import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import PersonIcon from '@mui/icons-material/Person';
import type { RoleLayoutConfig } from './core';

/**
 * تخطيط أدوار بوابة الشحن البحري.
 *
 * الأدوار هنا تملك صلاحيات `shipping_*` الخلفية، ولكلٍّ مدخل إلى
 * `/app/shipping` وحسابه — على نمط بقية النطاقات. الصلاحيات الحقيقية
 * تُطبَّق في الـ backend؛ الاختلاف بين الدورين لفظي فقط.
 */
export const ROLE_LAYOUT_CONFIG: Partial<Record<string, RoleLayoutConfig>> = {
  SHIPPING_COMPANY: {
    title: 'بوابة شركات الشحن',
    subtitle: 'Shipping Company Portal',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0B5ED7',
    nav: [
      { label: 'بوابة الشحن', target: '/app/shipping', icon: <DirectionsBoatIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
  SHIPPING_AGENT: {
    title: 'بوابة وكلاء الشحن',
    subtitle: 'Shipping Agent Portal',
    brand: 'وزارة الصحة الاتحادية',
    color: '#0B5ED7',
    nav: [
      { label: 'بوابة الشحن', target: '/app/shipping', icon: <DirectionsBoatIcon /> },
      { label: 'حسابي', target: '/app/account', icon: <PersonIcon /> },
    ],
  },
};
