import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatTemperature,
  formatPercent,
  formatNumber,
  formatCompact,
  formatRelativeTime,
  isFutureStamp,
  formatStamp,
  sharePercent,
} from './formatters';

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

  describe('formatNumber', () => {
    it('uses Latin digits so values align with Latin system codes', () => {
      expect(formatNumber(12345)).toBe('12,345');
      expect(formatNumber(80)).toBe('80');
      expect(formatNumber(0)).toBe('0');
    });

    it('handles empty input', () => {
      expect(formatNumber(null)).toBe('—');
      expect(formatNumber(undefined)).toBe('—');
    });

    it('keeps negatives signed', () => {
      expect(formatNumber(-5)).toBe('-5');
    });

    it('strips the invisible bidi marks Intl injects in RTL locales', () => {
      /* U+200E/U+200F/U+061C are invisible but survive into copied text and
         CSV exports, so they must never reach a rendered value. */
      [formatNumber(-5), formatNumber(-12345), formatCompact(-4200)].forEach((out) => {
        expect(out).not.toMatch(/[\u200e\u200f\u061c]/);
      });
    });

    it('does not double up the sign when stripping the mark', () => {
      expect(formatNumber(-5)).not.toMatch(/--/);
      expect(formatNumber(-5)).not.toMatch(/‎-/);
    });
  });

  describe('formatCompact', () => {
    it('leaves values under 1000 unabbreviated', () => {
      expect(formatCompact(999)).toBe('999');
    });

    it('abbreviates thousands and millions', () => {
      expect(formatCompact(1500)).toMatch(/1[,.]5/);
      expect(formatCompact(2_400_000)).toMatch(/2[,.]4/);
    });

    it('handles empty input', () => {
      expect(formatCompact(null)).toBe('—');
    });
  });

  describe('formatRelativeTime', () => {
    const now = new Date('2026-09-28T12:00:00Z');

    it('returns — for empty or invalid input', () => {
      expect(formatRelativeTime(null, now)).toBe('—');
      expect(formatRelativeTime(undefined, now)).toBe('—');
      expect(formatRelativeTime('not-a-date', now)).toBe('—');
    });

    it('reports recent past as الآن to avoid noisy seconds', () => {
      expect(formatRelativeTime('2026-09-28T11:59:50Z', now)).toBe('الآن');
    });

    it('reports minutes, hours and days in Arabic', () => {
      expect(formatRelativeTime('2026-09-28T11:55:00Z', now)).toContain('5');
      expect(formatRelativeTime('2026-09-28T10:00:00Z', now)).toContain('ساعتين');
      expect(formatRelativeTime('2026-09-27T12:00:00Z', now)).toBe('أمس');
    });

    it('absorbs small clock skew into الآن', () => {
      /* Sync stamps routinely land a few seconds ahead of the browser clock. */
      expect(formatRelativeTime('2026-09-28T12:00:05Z', now)).toBe('الآن');
    });

    it('reports a far-future stamp truthfully instead of masking it', () => {
      /* A stamp an hour ahead is a real clock/data fault. Hiding it behind
         "الآن" would hide the fault, so the future direction is reported. */
      expect(formatRelativeTime('2026-09-28T13:00:00Z', now)).toContain('ساعة');
    });
  });

  describe('isFutureStamp', () => {
    const now = new Date('2026-09-28T12:00:00Z');

    it('detects a materially future stamp', () => {
      expect(isFutureStamp('2026-09-28T13:00:00Z', now)).toBe(true);
    });

    it('tolerates small clock skew', () => {
      expect(isFutureStamp('2026-09-28T12:00:30Z', now)).toBe(false);
    });

    it('is false for past and missing stamps', () => {
      expect(isFutureStamp('2026-09-28T11:00:00Z', now)).toBe(false);
      expect(isFutureStamp(null, now)).toBe(false);
      expect(isFutureStamp('not-a-date', now)).toBe(false);
    });
  });

  describe('formatStamp', () => {
    const now = new Date('2026-09-28T12:00:00Z');

    it('flags a broken clock as an explicit anomaly', () => {
      const stamp = formatStamp('2026-09-28T13:00:00Z', now);
      expect(stamp.anomaly).toBe(true);
      expect(stamp.text).toBe('وقت غير صالح');
    });

    it('does not flag a normal past stamp', () => {
      const stamp = formatStamp('2026-09-28T10:00:00Z', now);
      expect(stamp.anomaly).toBe(false);
      expect(stamp.text).toContain('ساعتين');
    });

    it('does not flag benign skew', () => {
      expect(formatStamp('2026-09-28T12:00:20Z', now).anomaly).toBe(false);
    });
  });

  describe('sharePercent', () => {
    it('computes a percentage', () => {
      expect(sharePercent(66, 80)).toBeCloseTo(82.5);
    });

    it('guards against zero and negative totals', () => {
      expect(sharePercent(5, 0)).toBe(0);
      expect(sharePercent(5, -10)).toBe(0);
    });

    it('clamps to the 0–100 range', () => {
      expect(sharePercent(120, 80)).toBe(100);
      expect(sharePercent(-5, 80)).toBe(0);
    });
  });
});
