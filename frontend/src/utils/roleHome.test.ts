import { describe, expect, it } from 'vitest';
import { ROLE_HOME, roleHomePath } from './roleHome';
import { canRoleReach } from '../testUtils/routeGuards';
import { ROLE_LAYOUT_CONFIG } from '../config/roleLayouts';

describe('ROLE_HOME — مسارات الدور الرئيسي', () => {
  it('كل مسار رئيسي معرَّف يستطيع دوره الوصول إليه عبر حراسة المسارات', () => {
    const unreachable = Object.entries(ROLE_HOME).filter(
      ([role, home]) => !canRoleReach(role, home),
    );
    expect(unreachable).toEqual([]);
  });

  it('كل دور له إعداد تخطيط يملك مساراً رئيسيّاً صريحاً في ROLE_HOME', () => {
    const missing = Object.keys(ROLE_LAYOUT_CONFIG).filter((role) => !(role in ROLE_HOME));
    expect(missing).toEqual([]);
  });

  it('دور غير معروف يعود للمسار العام /app — حيث تُعرض الحالة الصريحة', () => {
    expect(roleHomePath('SOME_UNKNOWN_ROLE')).toBe('/app');
    expect(roleHomePath(null)).toBe('/app');
    expect(roleHomePath(undefined)).toBe('/app');
  });

  it('أدوار المعابر وأدوار الموارد البشرية والمختبر لها بيوت صريحة تطابق أول عنصر في قوائمها', () => {
    for (const role of [
      'BORDER_HEALTH_OFFICER',
      'QUARANTINE_DOCTOR',
      'CUSTOMS_OFFICER',
      'ENV_INSPECTOR',
      'EMERGENCY_OFFICER',
      'HR_MANAGER',
      'HR_SPECIALIST',
      'HR_APPROVER',
      'FOOD_WINDOW_CLERK',
      'FOOD_WINDOW_SUPERVISOR',
      'NATIONAL_LAB_ADMIN',
    ] as const) {
      const nav = ROLE_LAYOUT_CONFIG[role]?.nav ?? [];
      const firstTarget = nav.find((item) => item.target)?.target;
      expect(firstTarget, `${role} nav[0].target`).toBeDefined();
      expect(roleHomePath(role)).toBe(firstTarget);
    }
  });
});
