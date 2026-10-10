import { describe, expect, it } from 'vitest';

/**
 * حماية من تلف النصوص العربية بمحارف CJK (F02/F03):
 *
 * ظهرت محارف صينية داخل نصوص واجهة عربية (تضمين خاطئ في وسط جملة عربية)
 * نتيجة لصق خاطئ، وهو تلف صامت لا يكشفه أي اختبار وظيفي. هذا الاختبار
 * يمسح مصادر الواجهة كلها ويرفض أي ظهور لمحارف CJK خارج الملفات المسموح بها.
 *
 * التزمَّ (لا حظر كاذب): المحتوى المشروع في هذه المنصة عربي/إنجليزي فقط.
 * إن ظهر محتوى شرعي يحتوي محارف CJK (اسم صيني مثلاً) أضِف ملفه إلى
 * CJK_ALLOWLIST مع تعليق يبرره — فلا يُمسح باقي الملف.
 *
 * الملفات تُقرأ عبر `import.meta.glob` (Vite) بلا `node:fs` — حزمة
 * `@types/node` غير مثبتة ولا يُسمح بتغيير التبعيات.
 */

/** ملفات يُسمح فيها بمحارف CJK — مبرَّر لكل إدخال (مسار نسبي لـ src/). */
const CJK_ALLOWLIST: string[] = [];

const CJK_RE = /[一-鿿㐀-䶿]/;

const sources = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('سلامة النصوص — لا محارف CJK في مصادر الواجهة', () => {
  it('لا يحتوي أي ملف مصدر على محارف CJK تلفّ نصوصاً عربية', () => {
    const violations: string[] = [];
    for (const [key, content] of Object.entries(sources)) {
      const rel = key.replace(/^\.\.\//, '');
      if (CJK_ALLOWLIST.includes(rel)) continue;
      content.split('\n').forEach((line: string, idx: number) => {
        if (CJK_RE.test(line)) violations.push(`${rel}:${idx + 1}: ${line.trim()}`);
      });
    }
    expect(violations).toEqual([]);
  });
});
