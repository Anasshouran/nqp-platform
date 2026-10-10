import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

describe('sanitizeHtml', () => {
  it('keeps allowed text markup', () => {
    const out = sanitizeHtml('<p>مقدمة <strong>مهمة</strong></p><ul><li>بند</li></ul>');
    expect(out).toContain('<strong>مهمة</strong>');
    expect(out).toContain('<li>بند</li>');
  });

  it('drops script tags and their content', () => {
    const out = sanitizeHtml('<p>سليم</p><script>alert(document.cookie)</script>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert');
    expect(out).toContain('سليم');
  });

  it('drops inline event handlers', () => {
    const out = sanitizeHtml('<p onclick="steal()">نص</p><img src="x.png" onerror="steal()">');
    expect(out.toLowerCase()).not.toContain('onclick');
    expect(out.toLowerCase()).not.toContain('onerror');
  });

  it('rejects javascript: urls', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">اضغط</a>');
    expect(out.toLowerCase()).not.toContain('javascript:');
  });

  it('adds rel=noopener on target=_blank links', () => {
    const out = sanitizeHtml('<a href="https://example.gov.sd" target="_blank">رابط</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('drops style attributes and unknown tags', () => {
    const out = sanitizeHtml('<p style="position:fixed">نص</p><marquee>تمرير</marquee>');
    expect(out.toLowerCase()).not.toContain('style=');
    expect(out.toLowerCase()).not.toContain('marquee');
    expect(out).toContain('نص');
  });

  it('handles empty input', () => {
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
    expect(sanitizeHtml('')).toBe('');
  });
});
