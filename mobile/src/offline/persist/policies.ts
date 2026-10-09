/** سياسات الكاش لكل مجموعة بيانات (C1-02/§5). */
export type CacheDisposition = 'SAFE_TO_CACHE' | 'CACHE_WITH_EXPIRY' | 'NEVER_CACHE' | 'SERVER_ONLY';

export type DatasetKey =
  | 'profile'
  | 'requirements'
  | 'certificates'
  | 'declarations'
  | 'notifications'
  | 'sync';

export interface CachePolicy {
  disposition: CacheDisposition;
  /** ثوانٍ حتى انتهاء الصلاحية؛ يلزم للحساس/المؤقَّت. null = بلا انتهاء. */
  ttlSeconds: number | null;
  sensitive: boolean;
}

/** مصفوفة التصنيف — أي تغيير يجب أن يُفحص مع classification (الخادم). */
export const CACHE_POLICY: Record<DatasetKey, CachePolicy> = {
  // ملف شخصي — بيانات شخصية، يُسمح للاستخدام دون اتصال لفترة محدودة.
  profile: { disposition: 'CACHE_WITH_EXPIRY', ttlSeconds: 24 * 3600, sensitive: true },
  // متطلبات عامة — آمنة للتخزين (PUBLIC) مع انتهاء معقول.
  requirements: { disposition: 'SAFE_TO_CACHE', ttlSeconds: 24 * 3600, sensitive: false },
  // شهادات — SENSITIVE_HEALTH: يحفظ في التخزين المشفّر فقط، لفترة قصيرة.
  certificates: { disposition: 'CACHE_WITH_EXPIRY', ttlSeconds: 12 * 3600, sensitive: true },
  // إقرار صحي — SENSITIVE_HEALTH: مشفّر، فترة قصيرة.
  declarations: { disposition: 'CACHE_WITH_EXPIRY', ttlSeconds: 12 * 3600, sensitive: true },
  // إشعارات — حساسة (subject): مشفّرة، فترة أسبوع.
  notifications: { disposition: 'CACHE_WITH_EXPIRY', ttlSeconds: 7 * 24 * 3600, sensitive: true },
  // حالة المزامنة — بيانات خادم فورية؛ لا تُخزَّن.
  sync: { disposition: 'SERVER_ONLY', ttlSeconds: null, sensitive: false },
};

export const NEVER_CACHED_DATASETS: ReadonlySet<DatasetKey> = new Set(['sync']);