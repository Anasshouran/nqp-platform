/**
 * M1.10/M1.18 — كشط الحساسية قبل خروج أي بيانات من التطبيق (LOG/TELEMETRY SCRUB).
 *
 * القاعدة (§14/§18): SENSITIVE_HEALTH → SCRUBBED قبل مغادرة التطبيق.
 * هذا تنفيذ حقيقي بوحدة نقية (IMPLEMENTED) واختبارات صريحة.
 */
import {
  MOBILE_FIELD_CLASSIFICATION,
  MOBILE_FORBIDDEN_FIELDS,
  type ClassificationLevel,
} from '@afyatna/contracts';

export const SCRUBBED = 'SCRUBBED';

const NEVER_LOG_LEVELS: ReadonlySet<ClassificationLevel> = new Set([
  'SENSITIVE_HEALTH',
  'SECURITY_SENSITIVE',
  'INTERNAL',
]);

/**
 * يبحث عن مستوى تصنيف حقل بالاسم.
 * أسماء الحقول مشتركة بين مخططات (مثل ``status``) — لذلك يُرجَع
 * **الأكثر تحريماً** بين التطابقات (INTERNAL > SECURITY_SENSITIVE >
 * SENSITIVE_HEALTH > PERSONAL > PUBLIC). عدم اليقين = الحماية الأشد.
 */
const LEVEL_RANK: Readonly<Record<ClassificationLevel, number>> = {
  PUBLIC: 0,
  PERSONAL: 1,
  SENSITIVE_HEALTH: 2,
  SECURITY_SENSITIVE: 3,
  INTERNAL: 4,
};

export function levelOfField(fieldName: string): ClassificationLevel | 'UNCLASSIFIED' {
  if (MOBILE_FORBIDDEN_FIELDS.has(fieldName)) return 'INTERNAL';
  let best: ClassificationLevel | null = null;
  for (const [key, level] of Object.entries(MOBILE_FIELD_CLASSIFICATION)) {
    const registeredField = key.slice(key.lastIndexOf('.') + 1);
    if (registeredField !== fieldName) continue;
    if (best === null || LEVEL_RANK[level] > LEVEL_RANK[best]) best = level;
  }
  return best ?? 'UNCLASSIFIED';
}

export function isScrubbedField(fieldName: string): boolean {
  if (MOBILE_FORBIDDEN_FIELDS.has(fieldName)) return true;
  const level = levelOfField(fieldName);
  return level === 'UNCLASSIFIED' ? false : NEVER_LOG_LEVELS.has(level);
}

/**
 * يُنكِّس أي قيمة حسّاسة قبل الإرسال/التسجيل:
 * - حقل مصنَّف SENSITIVE_HEALTH/SECURITY_SENSITIVE/INTERNAL → 'SCRUBBED'
 * - حقل في قائمة الحظر → يُحذف كلياً
 * - غائب عن السجل → يبقى كما هو (سجل الحقول المعتمدة هو مصدر الحقيقة)
 */
export function scrub<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map((item) => scrub(item)) as unknown as T;
  }
  if (payload !== null && typeof payload === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (MOBILE_FORBIDDEN_FIELDS.has(key)) continue;
      if (isScrubbedField(key)) {
        out[key] = SCRUBBED;
      } else if (value !== null && typeof value === 'object') {
        out[key] = scrub(value);
      } else {
        out[key] = value;
      }
    }
    return out as unknown as T;
  }
  return payload;
}
