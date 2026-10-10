import { describe, expect, it } from 'vitest';
import { escapeHtml, escapeHtmlOr } from './escapeHtml';

describe('escapeHtml — منع XSS في منشئات المطبوعات', () => {
  it('يهرب الرموز الخاصة بـ HTML', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(escapeHtml('a > b & c')).toBe('a &gt; b &amp; c');
    expect(escapeHtml('a"b\'c')).toBe('a&quot;b&#39;c');
  });

  it('يرجع النص كما هو عندما لا يحتوي على رموز خاصة', () => {
    expect(escapeHtml('سلام 123')).toBe('سلام 123');
    expect(escapeHtml('')).toBe('');
  });

  it('لا يعيد تهرب النص المهرب مسبقاً — التهريب مرة واحدة عند المصدر يكفي', () => {
    // القيم تأتي من الخادم مرة واحدة وتُهرّب مرة واحدة؛ التهريب المكرّر غير ضار.
    expect(escapeHtml('&lt;script&gt;')).toBe('&amp;lt;script&amp;gt;');
  });
});

describe('escapeHtmlOr — قيمة افتراضية للفقرات فارغة', () => {
  it('يهرب القيم غير الفارغة', () => {
    expect(escapeHtmlOr('<b>x</b>', '-')).toBe('&lt;b&gt;x&lt;/b&gt;');
  });

  it('يرجع القيمة الافتراضية لقيم فارغة أو غير معرفة', () => {
    expect(escapeHtmlOr(null, '-')).toBe('-');
    expect(escapeHtmlOr(undefined, '-')).toBe('-');
    expect(escapeHtmlOr('', '-')).toBe('-');
  });
});
