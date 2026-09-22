import { describe, it, expect } from 'vitest';
import { formatDate, formatTemperature, formatPercent } from './formatters';

describe('formatters', () => {
  it('formatDate returns — for empty input', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });

  it('formatTemperature formats one decimal in Celsius', () => {
    expect(formatTemperature(36.7)).toBe('36.7°C');
    expect(formatTemperature(0)).toBe('0.0°C');
    expect(formatTemperature(null)).toBe('—');
    expect(formatTemperature(undefined)).toBe('—');
  });

  it('formatPercent appends % and handles empty input', () => {
    expect(formatPercent(85)).toBe('85%');
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(undefined)).toBe('—');
  });
});
