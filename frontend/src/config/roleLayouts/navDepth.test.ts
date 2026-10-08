import { describe, expect, it } from 'vitest';
import { ROLE_LAYOUT_CONFIG } from './index';
import type { RoleNavItem } from './core';

/** أقصى عمق مسموح: مستوى ثانٍ فقط (المجموعة ثم العنصر). */
const MAX_NAV_DEPTH = 2;

const maxDepth = (items: RoleNavItem[], depth = 1): number =>
  items.reduce((deepest, item) => {
    const childDepth = item.children ? maxDepth(item.children, depth + 1) : depth;
    return Math.max(deepest, childDepth);
  }, depth);

describe('عمق القوائم الجانبية — مستويان فقط (F06)', () => {
  it('لا تخطيط يتجاوز مستويين (مجموعة ثم عنصر بلا أحفاد)', () => {
    const tooDeep: string[] = [];
    for (const [role, config] of Object.entries(ROLE_LAYOUT_CONFIG)) {
      const depth = maxDepth(config.nav);
      if (depth > MAX_NAV_DEPTH) tooDeep.push(`${role} (depth=${depth})`);
    }
    expect(tooDeep).toEqual([]);
  });

  it('كل مجموعة لها أبناء (لا مجموعة فارغة تُظهر سهماً بلا محتوى)', () => {
    const emptyGroups: string[] = [];
    const walk = (role: string, items: RoleNavItem[]) => {
      for (const item of items) {
        if (item.children) {
          if (item.children.length === 0) emptyGroups.push(`${role} -> ${item.label}`);
          walk(role, item.children);
        }
      }
    };
    for (const [role, config] of Object.entries(ROLE_LAYOUT_CONFIG)) {
      walk(role, config.nav);
    }
    expect(emptyGroups).toEqual([]);
  });
});
