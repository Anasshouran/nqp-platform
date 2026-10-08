export * from './core';
import { ROLE_LAYOUT_CONFIG as ADMIN_ROLES } from './admin';
import { ROLE_LAYOUT_CONFIG as LABORATORY_ROLES } from './laboratory';
import { ROLE_LAYOUT_CONFIG as FOOD_ROLES } from './food';
import { ROLE_LAYOUT_CONFIG as HEALTH_ROLES } from './health';
import { ROLE_LAYOUT_CONFIG as IT_ROLES } from './it';
import { ROLE_LAYOUT_CONFIG as VACCINATION_ROLES } from './vaccination';
import { ROLE_LAYOUT_CONFIG as BORDERS_ROLES } from './borders';
import { ROLE_LAYOUT_CONFIG as HR_ROLES } from './hr';
import { type RoleLayoutConfig } from './core';

export type RoleLayoutSource = [owner: string, roles: Partial<Record<string, RoleLayoutConfig>>];

/** كل ملف تخطيط مع اسمه لرسائل التصادم الموضّحة. */
export const ROLE_LAYOUT_SOURCES: RoleLayoutSource[] = [
  ['admin', ADMIN_ROLES],
  ['laboratory', LABORATORY_ROLES],
  ['food', FOOD_ROLES],
  ['health', HEALTH_ROLES],
  ['it', IT_ROLES],
  ['vaccination', VACCINATION_ROLES],
  ['borders', BORDERS_ROLES],
  ['hr', HR_ROLES],
];

/**
 * دمج آمن لإعدادات الأدوار: كل دور يملك ملفاً واحداً مسؤولاً عنه.
 *
 * كان `Object.assign` يسمح لآخر ملف بسرقة أدوار ملفٍ سابق بصمت (مثل
 * borders يطغى على food/laboratory/health) — الآن التصادم يُصرخ في
 * التطوير والاختبارات، وفي الإنتاج يُسجَّل خطأ ويُحترم أول إعداد حتى
 * لا تسقط المنصة بصفحة بيضاء.
 */
export const mergeRoleLayoutConfig = (
  sources: RoleLayoutSource[],
  options: { production?: boolean } = {},
): Record<string, RoleLayoutConfig> => {
  const production =
    options.production ?? import.meta.env.MODE === 'production';
  const merged: Record<string, RoleLayoutConfig> = {};
  const ownerOf = new Map<string, string>();

  for (const [owner, roles] of sources) {
    for (const [role, config] of Object.entries(roles)) {
      if (!config) continue;
      const existing = ownerOf.get(role);
      if (existing !== undefined) {
        const message = `تصادم إعدادات الأدوار: الدور «${role}» معرَّف في '${existing}' و '${owner}'`;
        if (!production) throw new Error(message);
        console.error(message);
        continue;
      }
      ownerOf.set(role, owner);
      merged[role] = config;
    }
  }
  return merged;
};

export const ROLE_LAYOUT_CONFIG: Record<string, RoleLayoutConfig> =
  mergeRoleLayoutConfig(ROLE_LAYOUT_SOURCES);
