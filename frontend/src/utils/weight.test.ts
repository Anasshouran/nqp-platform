import { describe, expect, it } from 'vitest';
import { parseWeightToKg } from './weight';

describe('parseWeightToKg', () => {
  it('converts tons to kilograms', () => {
    expect(parseWeightToKg('25 طن')).toBe(25000);
    expect(parseWeightToKg('1.5 ton')).toBe(1500);
  });

  it('keeps kilograms as-is', () => {
    expect(parseWeightToKg('25 كجم')).toBe(25);
    expect(parseWeightToKg('25 kg')).toBe(25);
  });

  it('converts grams to kilograms', () => {
    expect(parseWeightToKg('500 جرام')).toBe(0.5);
  });

  it('treats a bare number as kilograms', () => {
    expect(parseWeightToKg('25')).toBe(25);
  });

  it('supports Arabic-Indic digits and comma decimals', () => {
    expect(parseWeightToKg('٢٥ طن')).toBe(25000);
    expect(parseWeightToKg('1,5 طن')).toBe(1500);
  });

  it('returns null when there is no number', () => {
    expect(parseWeightToKg('—')).toBeNull();
    expect(parseWeightToKg('')).toBeNull();
    expect(parseWeightToKg(null)).toBeNull();
    expect(parseWeightToKg('طن')).toBeNull();
  });

  it('passes numbers through', () => {
    expect(parseWeightToKg(12.5)).toBe(12.5);
  });
});
