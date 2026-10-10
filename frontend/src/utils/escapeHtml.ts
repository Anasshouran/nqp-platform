/**
 * يهرّب النص قبل إدراجه في قوالب HTML مُركّبة كنصوص (وثائق الطباعة).
 *
 * قوالب الطباعة تُبنى كسلاسل ثم تُكتب بـ`document.write` في نافذة من نفس
 * الأصل، فأي قيمة قادمة من الخادم (اسم المصدّر، وصف المادة، سبب القرار، اسم
 * المسافر…) تصبح XSS مخزّناً يستطيع قراءة رموز الجلسة من `localStorage`.
 * التهريب هنا إلزامي لكل قيمة غير ثابتة تدخل القالب.
 */
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
};

/**
 * يهرّب قيمة ويستبدلها ببديل عند الغياب، لاستخدامها في حقول قوالب الطباعة.
 */
export const escapeHtmlOr = (value: unknown, placeholder = '—'): string =>
  value === null || value === undefined || value === '' ? placeholder : escapeHtml(value);