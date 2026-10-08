/**
 * تنظيف HTML القادم من الـ CMS قبل تصييره.
 *
 * محتوى الصفحات العامة (الخصوصية والشروط) يُحرَّر من لوحة الإدارة ويُصيَّر
 * بـ`dangerouslySetInnerHTML`، فأي وسم تنفيذي فيه يصبح XSS مخزّن يُنفَّذ لكل
 * زائر. نسمح فقط بوسوم النصوص المسموح بها ونُسقط كل شيء آخر
 * (script/style/iframe/object/embed) وكل معالجات onclick/onerror/... .
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre',
  'code', 'a', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'small',
]);

const ALLOWED_ATTRS = new Set(['href', 'title', 'target', 'rel', 'src', 'alt', 'colspan', 'rowspan']);
const URL_ATTRS = new Set(['href', 'src']);
const SAFE_URL = /^(https?:|mailto:|tel:|\/|#|\.\/|\.\.\/)/i;

/**
 * ينظّف HTML، ويسمح فقط بوسوم/سمات القائمة أعلاه.
 * مبني يدوياً (بدون اعتماد خارجي) لأن المشروع لا يملك مكتبة تعقيم.
 */
export const sanitizeHtml = (dirty: string | null | undefined): string => {
  if (!dirty) return '';

  // نُسقط وسوم الخطر ومحتواها بالكامل قبل التحليل، لأن المحلّل يحوّل
  // `javascript:` والوسوم المغلقة إلى نص داخل وسوم مسموحة.
  const stripped = dirty.replace(
    /<\s*(script|style|iframe|object|embed|noscript|template|svg|math|form)\b[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi,
    '',
  );

  if (typeof document === 'undefined') {
    // بيئة بلا DOM (SSR/اختبار): نعيد النص المُهرَّب بعد إسقاط الوسوم.
    return stripped
      .replace(/<\s*\/?\s*([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, name: string) =>
        ALLOWED_TAGS.has(name.toLowerCase()) ? tag : '')
      .replace(/on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/javascript\s*:/gi, '');
  }

  const doc = new DOMParser().parseFromString(`<body>${stripped}</body>`, 'text/html');
  const clean = (node: Element) => {
    Array.from(node.children).forEach((child) => {
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        // نستبدل الوسم غير المسموح بمحتواه النصي بدل حذفه كاملاً.
        const text = doc.createTextNode(child.textContent ?? '');
        child.replaceWith(text);
        return;
      }
      Array.from(child.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') || name === 'style' || !ALLOWED_ATTRS.has(name)) {
          child.removeAttribute(attr.name);
          return;
        }
        if (URL_ATTRS.has(name) && !SAFE_URL.test(attr.value.trim())) {
          child.removeAttribute(attr.name);
        }
      });
      if (tag === 'a' && child.getAttribute('target') === '_blank') {
        child.setAttribute('rel', 'noopener noreferrer');
      }
      clean(child);
    });
  };
  clean(doc.body);
  return doc.body.innerHTML;
};
