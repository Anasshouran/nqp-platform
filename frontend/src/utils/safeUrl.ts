/**
 * يُعيد الرابط فقط إن كان من مخطط آمن (http/https/mailto/tel)، وإلا `null`.
 *
 * روابط كثيرة تأتي من الخادم (ملفات، موقع جهة، رابط واجهة خارجية، معرّف
 * ICD-11). مخطط مثل `javascript:` أو `data:` في `href` يصبح تنفيذاً عند
 * الضغط، فنبقي فقط المخططات المعروفة.
 */
const SAFE_PROTOCOLS = /^(https?:|mailto:|tel:)/i;

/** الروابط النسبية الآمنة داخل التطبيق (لا ../ ولا روابط بدون بروتوكول). */
const RELATIVE = /^(?!\/\/)(\/|#|\.\/)/;

export const safeExternalUrl = (
  url: string | null | undefined,
): string | undefined => {
  if (!url) return undefined;
  const value = url.trim();
  if (!value) return undefined;
  // روابط نسبية آمنة داخل التطبيق (لا تُنفّذ مخططات).
  if (RELATIVE.test(value)) return value;
  if (SAFE_PROTOCOLS.test(value)) return value;
  return undefined;
};

/** يُعيد هل الرابط آمناً للاستخدام كـ`href` خارجي. */
export const isSafeExternalUrl = (url: string | null | undefined): boolean =>
  safeExternalUrl(url) !== undefined;