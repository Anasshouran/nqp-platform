import { describe, expect, it } from 'vitest';

import { regionForSector, SUDAN_MAP_POINTS } from './sudanMapPoints';

/**
 * القطاعات كما يبذرها `manage.py seed_organization` (code, region, name_ar).
 * القائمة مرجع معرّف في الخادم، والاختبار يفشل إن أُضيف قطاع دون نقطة خريطة.
 */
const SEEDED_SECTORS: Array<[code: string, region: string, nameAr: string]> = [
  ['RED_SEA', 'البحر الأحمر', 'قطاع البحر الأحمر'],
  ['KHARTOUM', 'الخرطوم', 'قطاع الخرطوم'],
  ['NORTHERN', 'الشمالية', 'القطاع الشمالي'],
  ['KASSALA', 'كسلا', 'قطاع كسلا'],
  ['GEDAREF', 'القضارف', 'قطاع القضارف'],
  ['KORDOFAN', 'كردفان', 'قطاع كردفان'],
  ['EL_OBEID', 'شمال كردفان', 'قطاع الأبيض'],
];

describe('regionForSector', () => {
  it('resolves every seeded sector to its own code', () => {
    for (const [code, region, nameAr] of SEEDED_SECTORS) {
      expect(regionForSector(region, nameAr), `${nameAr} (${region})`).toBe(code);
    }
  });

  it('never places two sectors on the same map point', () => {
    const keys = SEEDED_SECTORS.map(([, region, nameAr]) => regionForSector(region, nameAr));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('does not fall back to KHARTOUM for any seeded sector', () => {
    const missed = SEEDED_SECTORS.filter(
      ([, region, nameAr]) => nameAr !== 'قطاع الخرطوم' && regionForSector(region, nameAr) === 'KHARTOUM',
    );
    expect(missed.map(([, , nameAr]) => nameAr)).toEqual([]);
  });

  it('accepts a latin region code when the key is known', () => {
    expect(regionForSector('KASSALA', 'أي اسم')).toBe('KASSALA');
    expect(regionForSector('kassala', 'أي اسم')).toBe('KASSALA');
  });

  it('does not treat الأبيض as كردفان despite the shared region text', () => {
    expect(regionForSector('شمال كردفان', 'قطاع الأبيض')).toBe('EL_OBEID');
  });

  it('keeps every point inside the 0-100 percent space', () => {
    for (const [key, point] of Object.entries(SUDAN_MAP_POINTS)) {
      expect(point.x, key).toBeGreaterThanOrEqual(0);
      expect(point.x, key).toBeLessThanOrEqual(100);
      expect(point.y, key).toBeGreaterThanOrEqual(0);
      expect(point.y, key).toBeLessThanOrEqual(100);
    }
  });
});
