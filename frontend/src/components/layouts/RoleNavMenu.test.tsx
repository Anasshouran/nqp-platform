import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { RoleNavItem } from '../../config/roleLayouts';
import RoleNavMenu from './RoleNavMenu';

const WHO_NAV: RoleNavItem[] = [
  { label: 'لوحة WHO', target: '/app/integration/who', permission: 'who_integration:view' },
  { label: 'أحداث IHR', target: '/app/integration/who/events', permission: 'ihr_event:view' },
  { label: 'أمراض ICD-11', target: '/app/integration/who/diseases', permission: 'who_diseases:view' },
  { label: 'بلا تقييد', target: '/dashboard/national/it' },
];

const renderNav = (permissions?: string[], items: RoleNavItem[] = WHO_NAV) =>
  render(
    <RoleNavMenu
      sections={[{ items }]}
      permissions={permissions}
      accent="#0c7f6a"
      currentPathname="/app/integration/who"
      currentSearch=""
      onNavigate={() => {}}
    />,
  );

describe('RoleNavMenu — التصفية بالصلاحيات', () => {
  it('يخفي العنصر الذي لا يملك المستخدم صلاحيته', () => {
    // مدير تقنية المعلومات: بلا أي صلاحية IHR
    renderNav(['who_integration:view', 'who_logs:view', 'who_diseases:view']);
    expect(screen.getByText('لوحة WHO')).toBeDefined();
    expect(screen.getByText('أمراض ICD-11')).toBeDefined();
    expect(screen.queryByText('أحداث IHR')).toBeNull();
  });

  it('يعرض كل ما يملكه المستخدم', () => {
    renderNav(['who_integration:view', 'ihr_event:view', 'who_diseases:view']);
    expect(screen.getByText('أحداث IHR')).toBeDefined();
  });

  it('لا يبقي عنصراً بلا تقييد بلا ترشيح', () => {
    renderNav([]);
    expect(screen.getByText('بلا تقييد')).toBeDefined();
  });

  it('fail-open: قائمة صلاحيات فارغة تعني «لا تقييد» لا «لا شيء»', () => {
    // موظفو is_staff يتجاوزون فحص الصلاحيات في الخادم وقد لا تُحمَّل قائمتهم.
    // إخفاء كل شيء لهم يبني قائمة فارغة بلا سبب — سلوك غير مقبول.
    renderNav([]);
    expect(screen.getByText('لوحة WHO')).toBeDefined();
    expect(screen.getByText('أحداث IHR')).toBeDefined();
  });

  it('fail-open: permissions غير معرَّفة تعني «لا تقييد»', () => {
    renderNav(undefined);
    expect(screen.getByText('أحداث IHR')).toBeDefined();
  });

  it('يُسقط المجموعة التي لم يتبقَّ منها أي عنصر ظاهر', () => {
    const grouped: RoleNavItem[] = [
      {
        label: 'تكامل WHO',
        children: [
          { label: 'أحداث IHR', target: '/app/integration/who/events', permission: 'ihr_event:view' },
          { label: 'مؤشرات SPAR', target: '/app/integration/who/spar', permission: 'ihr_spar:view' },
        ],
      },
    ];
    renderNav(['who_integration:view'], grouped);
    expect(screen.queryByText('تكامل WHO')).toBeNull();
  });

  it('يُبقي المجموعة ما دام فيها عنصر واحد مرئي', () => {
    const grouped: RoleNavItem[] = [
      {
        label: 'تكامل WHO',
        children: [
          { label: 'لوحة WHO', target: '/app/integration/who', permission: 'who_integration:view' },
          { label: 'أحداث IHR', target: '/app/integration/who/events', permission: 'ihr_event:view' },
        ],
      },
    ];
    renderNav(['who_integration:view'], grouped);
    expect(screen.getByText('تكامل WHO')).toBeDefined();
    expect(screen.queryByText('أحداث IHR')).toBeNull();
  });
});
