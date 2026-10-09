/**
 * M1.8 — تثبيت شهادة TLS (SCAFFOLDED: إعداد + عقد؛ التنفيذ في M2 عبر EAS).
 *
 * قواعد (phase-10/phase-14): pin أساسي + pin احتياطي + تدوير عبر نقطة إعداد
 * غير سرّية؛ فشل التطابق = رفض الاتصال (لا إلغاء تحقق).
 */

export interface PinningConfig {
  primaryPinSha256: string;
  backupPinSha256: string;
  /** مصدر تدوير الأ_pins (لا محتوى سرّي). */
  pinsConfigUrl: string;
  /** عند فقدان كل الأ Pins: هل نرفض؟ الافتراضي: نرفض (فشل-إغلاق). */
  failClosed: true;
}

export const PINNING_STATUS = 'SCAFFOLDED' as const;
