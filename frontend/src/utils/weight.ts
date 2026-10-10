/**
 * تحويل الأوزان النصية إلى كيلوجرامات.
 *
 * حقل الوزن في طلبات الأغذية يُكتب بالعربية ("٢٥ طن") لكن الحقل في الخلفية
 * `weight_kg` بالكيلوجرام. كان الكود يأخذ الجزء الرقمي فقط فيرسل "٢٥ طن"
 * كـ25 كغ — خطأ وزن ×1000 في كل الرسوم والحسابات.
 */

const TON_PATTERN = /(طن|طنان|طنين|ton|t\b)/i;
const KG_PATTERN = /(كغ|كجم|جم|kg|kgs| kilogram)/i;
const GRAM_PATTERN = /(جرام|غرام|جم\b|g\b|gram)/i;

/** يحلّل وزناً نصياً ويعيده بالكيلوجرام، أو null إذا لم يوجد رقم. */
export const parseWeightToKg = (raw: string | number | null | undefined): number | null => {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  const text = String(raw).trim();
  if (!text) return null;

  // ندعم الأرقام العربية-الهندية قبل تحويلها.
  const normalized = text.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  const match = normalized.match(/-?\d+(?:[.,]\d+)?/);
  if (!match) return null;

  const value = Number(match[0].replace(',', '.'));
  if (!Number.isFinite(value)) return null;

  // الترتيب مهم: "كجم" تطابق TON_PATTERN؟ لا، لكن "جم" تُطابق GRAM_PATTERN.
  if (GRAM_PATTERN.test(normalized) && !KG_PATTERN.test(normalized)) return value / 1000;
  if (TON_PATTERN.test(normalized)) return value * 1000;
  if (KG_PATTERN.test(normalized)) return value;
  return value;
};
