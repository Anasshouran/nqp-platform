import { describe, expect, it } from 'vitest';
import { ROLE_LAYOUT_CONFIG } from './index';
import type { RoleNavItem } from './core';
import { canRoleReach } from '../../testUtils/routeGuards';

const collectTargets = (items: RoleNavItem[], out: string[]): void => {
  for (const item of items) {
    if (item.target) out.push(item.target);
    if (item.children) collectTargets(item.children, out);
  }
};

describe('قوائم الأدوار — كل رابط يقود إلى مسار يستطيع دوره بلوغه (F16)', () => {
  it('لا عنصر تنقّل في أي تخطيط يحذفه حارس مسار لدور صاحبه', () => {
    const failures: string[] = [];
    for (const [role, config] of Object.entries(ROLE_LAYOUT_CONFIG)) {
      const targets: string[] = [];
      collectTargets(config.nav, targets);
      for (const target of targets) {
        if (!canRoleReach(role, target)) failures.push(`${role} -> ${target}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('قائمة ADMIN خالية من المسارات المحجوبة، مع بقاء /app/integration المتاح', () => {
    const targets: string[] = [];
    collectTargets(ROLE_LAYOUT_CONFIG.ADMIN.nav, targets);
    expect(targets).not.toContain('/app/carrier');
    expect(targets).not.toContain('/app/integration/portal');
    expect(targets.some((t) => t.startsWith('/app/integration/who'))).toBe(false);
    expect(targets).toContain('/app/integration');
  });

  it('مجموعات بوابة المنظمات وWHO باقية لDG_MANAGER (لم تُحذف من المصدر — حارسها يسمح له)', () => {
    const targets: string[] = [];
    collectTargets(ROLE_LAYOUT_CONFIG.DG_MANAGER.nav, targets);
    expect(targets).toContain('/app/integration/portal');
    expect(targets).toContain('/app/integration/who/events');
    expect(canRoleReach('DG_MANAGER', '/app/integration/portal')).toBe(true);
    expect(canRoleReach('DG_MANAGER', '/app/integration/who')).toBe(true);
  });
});
