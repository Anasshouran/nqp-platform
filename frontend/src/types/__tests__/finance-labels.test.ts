import { describe, it, expect } from 'vitest';
import {
  INVOICE_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  AUDIT_ACTION_LABELS,
  labelOf,
  optionsOf,
} from '../finance';

describe('labelOf', () => {
  it('returns ar label by default', () => {
    expect(labelOf(INVOICE_STATUS_LABELS, 'PAID')).toBe('مدفوعة');
  });

  it('returns en label when locale=en', () => {
    expect(labelOf(INVOICE_STATUS_LABELS, 'PAID', 'en')).toBe('Paid');
  });

  it('returns — for null/undefined/empty', () => {
    expect(labelOf(INVOICE_STATUS_LABELS, null)).toBe('—');
    expect(labelOf(INVOICE_STATUS_LABELS, undefined)).toBe('—');
    expect(labelOf(INVOICE_STATUS_LABELS, '')).toBe('—');
  });

  it('returns raw key for unknown', () => {
    expect(labelOf(INVOICE_STATUS_LABELS, 'UNKNOWN_KEY')).toBe('UNKNOWN_KEY');
  });
});

describe('optionsOf', () => {
  it('returns array of {value,label} in ar by default', () => {
    // Arabic wording is unchanged from the old string maps (regression-safe).
    expect(optionsOf(PAYMENT_METHOD_LABELS)).toContainEqual({ value: 'CASH', label: 'نقدي' });
  });

  it('returns en labels when locale=en', () => {
    expect(optionsOf(PAYMENT_METHOD_LABELS, 'en')).toContainEqual({ value: 'CASH', label: 'Cash' });
  });

  it('preserves insertion order', () => {
    expect(optionsOf(PAYMENT_METHOD_LABELS).map((o) => o.value)).toEqual([
      'CASH',
      'BANK_CARD',
      'BANK_TRANSFER',
      'ELECTRONIC',
    ]);
  });
});

describe('all label maps are complete', () => {
  it('every entry has non-empty ar and en', () => {
    const maps = {
      INVOICE_STATUS_LABELS,
      SERVICE_TYPE_LABELS,
      PAYMENT_METHOD_LABELS,
      AUDIT_ACTION_LABELS,
    };
    for (const [name, map] of Object.entries(maps)) {
      for (const [key, label] of Object.entries(map)) {
        expect(label.ar, `${name}.${key}.ar`).toBeTruthy();
        expect(label.en, `${name}.${key}.en`).toBeTruthy();
      }
    }
  });
});
