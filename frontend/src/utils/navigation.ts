/** مسارات الدخول لا تُستخدم كوجهة إن لم تكن مساراً داخلياً صالحاً. */
const AUTH_PATHS = new Set(['/login', '/forgot-password', '/reset-password']);

/**
 * ينظّف قيمة `?next=` القادمة من رابط الدخول إلى مسار داخلي آمن.
 *
 * تُرفض الروابط الخارجية (`//host`, `\\host`)، والمسارات غير البادئة بـ`/`،
 * والقفزات (`..`)، ومسارات الدخول نفسها حتى لا يُنشئ المستخدم توجيهاً دوريّاً
 * بين `/login` ووجهة تعيد إليه.
 */
export const sanitizeNextPath = (raw?: string | null): string | null => {
  if (!raw) return null;
  const value = raw.trim();
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//') || value.includes('\\')) return null;
  const pathOnly = value.split(/[?#]/)[0];
  if (AUTH_PATHS.has(pathOnly)) return null;
  if (pathOnly.split('/').some((seg) => seg === '..')) return null;
  return value;
};
