/**
 * التنقّل — M1: هيكل فقط حسب phase-12 (تبويبات: Home/Travel/Health/Certificates/Profile).
 * يُنفَّذ مع أول شاشات في M2 (مع React Navigation). الحالة: SCAFFOLDED.
 */
export const NAVIGATION_TABS = [
  'home',
  'travel',
  'health',
  'certificates',
  'profile',
] as const;

export type NavigationTab = (typeof NAVIGATION_TABS)[number];

export const NAVIGATION_STATUS = 'SCAFFOLDED' as const;
