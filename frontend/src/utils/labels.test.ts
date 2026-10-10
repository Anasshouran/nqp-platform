import { describe, expect, it } from 'vitest';
import { colorOf, labelOf, toneOf } from './labels';

const meta = {
  OPEN: { label: 'مفتوحة', tone: 'success' as const },
  CLOSED: { label: 'مغلقة', tone: 'info' as const },
};
const typeMap = { SEA: 'بحري' };

describe('labelOf', () => {
  it('يعيد التسمية للقيم المعروفة', () => {
    expect(labelOf(meta, 'OPEN')).toBe('مفتوحة');
  });

  it('يدعم خرائط قيمها نصوص مباشرة', () => {
    expect(labelOf(typeMap, 'SEA')).toBe('بحري');
  });

  it('يرجع القيمة نفسها عند غيابها من الخريطة بدل التعطل', () => {
    expect(labelOf(meta, 'UNKNOWN')).toBe('UNKNOWN');
  });

  it('يعيد fallback / «—» للقيم الفارغة', () => {
    expect(labelOf(meta, null)).toBe('—');
    expect(labelOf(meta, undefined)).toBe('—');
    expect(labelOf(meta, '') ).toBe('—');
    expect(labelOf(meta, '', 'بديل')).toBe('بديل');
  });
});

describe('toneOf', () => {
  it('يعيد النغمة للقيم المعروفة و undefined عند الغياب', () => {
    expect(toneOf(meta, 'OPEN')).toBe('success');
    expect(toneOf(meta, 'UNKNOWN')).toBeUndefined();
    expect(toneOf(meta, null)).toBeUndefined();
  });
});

describe('colorOf', () => {
  const colors = { A: { bg: '#000', color: '#fff' } };
  it('يعيد الخاصية الملونة إن وُجدت', () => {
    expect(colorOf(colors, 'A', 'bg')).toBe('#000');
  });
  it('يعيد fallback عند غياب المفتاح أو الخاصية', () => {
    expect(colorOf(colors, 'Z', 'bg')).toBe('');
    expect(colorOf(colors, 'A', 'missing')).toBe('');
    expect(colorOf(colors, null, 'bg', '#f00')).toBe('#f00');
  });
});