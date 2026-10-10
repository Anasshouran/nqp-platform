import { describe, expect, it } from 'vitest';
import { safeExternalUrl } from './safeUrl';

describe('safeExternalUrl — منع التحويل الخارجي غير الآمن في src= و href=', () => {
  it('يقبل الروابط الآمنة', () => {
    expect(safeExternalUrl('https://example.com')).toBe('https://example.com');
    expect(safeExternalUrl('http://example.com')).toBe('http://example.com');
    expect(safeExternalUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    expect(safeExternalUrl('tel:+249123456789')).toBe('tel:+249123456789');
  });

  it('يرفض روابط بروتوكول جافا سكريبت', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeExternalUrl('JavaScript:void(0)')).toBeUndefined();
  });

  it('يرفض روابط data: التي قد تسرب بيانات أو تشغّل كود', () => {
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(safeExternalUrl('data:image/png;base64,ABC')).toBeUndefined();
  });

  it('يرفض المسارات النسبية إلى مضيف (protocol-relative)', () => {
    expect(safeExternalUrl('//evil.example/file')).toBeUndefined();
    expect(safeExternalUrl('///evil.example/file')).toBeUndefined();
  });

  it('يرفض الروابط بدون بروتوكول (قد تكون خارجية)', () => {
    expect(safeExternalUrl('example.com')).toBeUndefined();
    expect(safeExternalUrl('evil.example')).toBeUndefined();
  });

  it('يرفض المسارات النسبية إلى مجلدات أبوية', () => {
    expect(safeExternalUrl('../admin')).toBeUndefined();
    expect(safeExternalUrl('../../etc/passwd')).toBeUndefined();
  });
});

describe('safeExternalUrl — السماح بالمسارات المحلية', () => {
  it('يقبل المسارات النسبية المحلية الآمنة', () => {
    expect(safeExternalUrl('./downloads/file.pdf')).toBe('./downloads/file.pdf');
    expect(safeExternalUrl('/downloads/file.pdf')).toBe('/downloads/file.pdf');
  });

  it('يقبل روابط المراسلة والهاتف', () => {
    expect(safeExternalUrl('mailto:contact@nqp.gov.sd')).toBe('mailto:contact@nqp.gov.sd');
    expect(safeExternalUrl('tel:+249111234567')).toBe('tel:+249111234567');
  });

  it('يرجع undefined للمدخل غير المعرّف', () => {
    expect(safeExternalUrl(null)).toBeUndefined();
    expect(safeExternalUrl(undefined)).toBeUndefined();
  });
});
