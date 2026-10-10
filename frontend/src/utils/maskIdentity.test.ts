import { describe, expect, it } from 'vitest';
import { maskIdentity } from './maskIdentity';

describe('maskIdentity — تحسين الحد الأدنى من البيانات للتحقق العام', () => {
  it('يُخفي الاسم إلى الاسم الأول وأول حرف من الاسم الأخير', () => {
    expect(maskIdentity('أحمد محمد عبد الله')).toBe('أحمد ا•••');
  });

  it('يُخفي الاسم العربي الكامل دون كشف الاسم الأوسط', () => {
    expect(maskIdentity('سارة النور')).toBe('سارة ا•••');
  });

  it('يتعامل مع الاسم المكوَّن من كلمة واحدة', () => {
    expect(maskIdentity('محمد')).toBe('م•••');
  });

  it('يتعامل مع القيم الفارغة وغير المعرّفة', () => {
    expect(maskIdentity('')).toBe('—');
    expect(maskIdentity(null)).toBe('—');
    expect(maskIdentity(undefined)).toBe('—');
  });

  it('يتعامل مع الاسم اللاتيني', () => {
    expect(maskIdentity('Ahmed Osman')).toMatch(/^Ahmed O/);
    expect(maskIdentity('Ahmed Osman')).not.toContain('Osman');
  });

  it('لا يُرجع الاسم الكامل أبداً', () => {
    const masked = maskIdentity('محمد أحمد علي عمر');
    expect(masked).not.toContain('علي');
    expect(masked).not.toContain('عمر');
  });
});