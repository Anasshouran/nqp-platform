/**
 * تحسين الحد الأدنى من البيانات في واجهات التحقق العامة.
 *
 * يُخفّي الهوية الجزئية نحو «الاسم الأول + أول حرف من الاسم الأخير»، مع
 * المُخفّي للمسافات، دون كشف الاسم الكامل أو التفاصيل الصحية الحساسة.
 */
export const maskIdentity = (value: string | null | undefined): string => {
  const text = (value ?? '').trim();
  if (!text) return '—';
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) {
    const single = parts[0];
    return single.length <= 2 ? `${single}•••` : `${single.slice(0, 1)}•••`;
  }
  const first = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0) || '';
  return `${first} ${lastInitial}•••`;
};