import { describe, expect, it, vi } from 'vitest';
import {
  ROLE_LAYOUT_CONFIG,
  ROLE_LAYOUT_SOURCES,
  mergeRoleLayoutConfig,
  type RoleLayoutSource,
} from './index';
import { ROLE_LAYOUT_CONFIG as FOOD_ROLES } from './food';
import { ROLE_LAYOUT_CONFIG as LABORATORY_ROLES } from './laboratory';
import { ROLE_LAYOUT_CONFIG as HEALTH_ROLES } from './health';
import { ROLE_LAYOUT_CONFIG as BORDERS_ROLES } from './borders';
import type { RoleLayoutConfig } from './core';

const sampleConfig: RoleLayoutConfig = {
  title: 'عنوان',
  subtitle: 'Subtitle',
  brand: 'الجهة',
  color: '#000',
  nav: [{ label: 'الرئيسية', target: '/app' }],
};

describe('دمج إعدادات الأدوار — ملكية واضحة لكل دور (F09)', () => {
  it('FOOD_INSPECTOR يعود لإعداد food لا لإعداد borders', () => {
    expect(ROLE_LAYOUT_CONFIG.FOOD_INSPECTOR).toBe(FOOD_ROLES.FOOD_INSPECTOR);
    expect(ROLE_LAYOUT_CONFIG.FOOD_INSPECTOR.title).toBe('مفتش الغذاء');
    expect(ROLE_LAYOUT_CONFIG.FOOD_INSPECTOR.nav[0].target).toBe('/app/inspector-dashboard');
    expect(BORDERS_ROLES.FOOD_INSPECTOR).toBeUndefined();
  });

  it('LAB_TECHNICIAN يعود لإعداد laboratory لا لإعداد borders', () => {
    expect(ROLE_LAYOUT_CONFIG.LAB_TECHNICIAN).toBe(LABORATORY_ROLES.LAB_TECHNICIAN);
    expect(ROLE_LAYOUT_CONFIG.LAB_TECHNICIAN.nav[0].target).toBe('/app/laboratory');
    expect(BORDERS_ROLES.LAB_TECHNICIAN).toBeUndefined();
  });

  it('QUARANTINE_INSPECTOR يعود لإعداد health لا لإعداد borders', () => {
    expect(ROLE_LAYOUT_CONFIG.QUARANTINE_INSPECTOR).toBe(HEALTH_ROLES.QUARANTINE_INSPECTOR);
    expect(ROLE_LAYOUT_CONFIG.QUARANTINE_INSPECTOR.nav[0].target).toBe('/app/quarantine-inspector');
    expect(BORDERS_ROLES.QUARANTINE_INSPECTOR).toBeUndefined();
  });

  it('مصادر المشروع الفعلية بلا تصادمات (الاستيراد نفسه يُصرخ لولا ذلك)', () => {
    expect(() => mergeRoleLayoutConfig(ROLE_LAYOUT_SOURCES)).not.toThrow();
    expect(Object.keys(ROLE_LAYOUT_CONFIG).length).toBeGreaterThan(0);
  });

  it('التصادم يُصرّح برسالة تحدد الدور والملفين المتعارضين', () => {
    const sources: RoleLayoutSource[] = [
      ['alpha', { SHARED_ROLE: sampleConfig }],
      ['beta', { SHARED_ROLE: sampleConfig }],
    ];
    expect(() => mergeRoleLayoutConfig(sources, { production: false })).toThrow(
      /SHARED_ROLE[\s\S]*alpha[\s\S]*beta/,
    );
  });

  it('في الإنتاج: التصادم يُسجَّل ويُحترم أول إعداد بدل إسقاط التطبيق', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const first: RoleLayoutConfig = { ...sampleConfig, title: 'الأول' };
    const second: RoleLayoutConfig = { ...sampleConfig, title: 'الثاني' };
    const merged = mergeRoleLayoutConfig(
      [
        ['alpha', { SHARED_ROLE: first }],
        ['beta', { SHARED_ROLE: second }],
      ],
      { production: true },
    );
    expect(merged.SHARED_ROLE.title).toBe('الأول');
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});
