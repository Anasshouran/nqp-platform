import type { ReactNode } from 'react';

export interface RoleNavItem {
  label: string;
  /** مسار التنقل — اختياري لعناصر المجموعات (الأب) لأن الطي يكفي */
  target?: string;
  /** مطابقة دقيقة للمسار (بدون اعتبار بادئة /app/*) */
  exact?: boolean;
  icon?: ReactNode;
  badge?: number | 'micro';
  children?: RoleNavItem[];
}

export interface RoleLayoutConfig {
  /** الاسم الظاهر في شريط التطبيق */
  title: string;
  /** الاسم الإنجليزي أسفل العنوان */
  subtitle: string;
  /** اسم الجهة في أعلى القائمة الجانبية */
  brand: string;
  /** اللون الأساسي */
  color: string;
  /** سطر ترويسة اختياري أعلى العنوان في شريط التطبيق */
  overline?: string;
  /** محتوى إضافي فوق شريط الأدوات (مثال: الترويسة الحكومية) */
  logo?: ReactNode;
  nav: RoleNavItem[];
}

/** يحلّل أهداف التنقل المحسوسة بالقطاع (مسبوقة بـ /dashboard/sector/red-sea)
 *  إلى أساس لوحة المستخدم المعيَّن (مثل /dashboard/sector/khartoum) مع بقاء
 *  المسارات القطاعية الخاصة دون تغيير حتى تُبنى في قطاعاتها. */
export const rewriteSectorNav = (items: RoleNavItem[], sectorBase: string): RoleNavItem[] => {
  const resolve = (target?: string): string | undefined => {
    if (!target?.startsWith('/dashboard/sector/red-sea')) return target;
    const suffix = target.slice('/dashboard/sector/red-sea'.length);
    return suffix === '' || suffix === '/content' || suffix.startsWith('/content?')
      ? `${sectorBase}${suffix}`
      : target;
  };
  return items.map((item) => ({
    ...item,
    target: resolve(item.target),
    children: item.children ? rewriteSectorNav(item.children, sectorBase) : item.children,
  }));
};