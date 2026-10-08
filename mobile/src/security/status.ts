/**
 * M1.8 — سجل حالة ضوابط الأمن.
 *
 * ⚠️ قاعدة (§16): لا يُدّعى أن الواجهة = تنفيذ. كل بند يحمل حالته الحقيقية:
 *   IMPLEMENTED | SCAFFOLDED | BLOCKED | NOT STARTED
 */

export type ControlStatus = 'IMPLEMENTED' | 'SCAFFOLDED' | 'BLOCKED' | 'NOT STARTED';

export interface SecurityControl {
  id: string;
  titleAr: string;
  status: ControlStatus;
  evidence: string;
}

export const SECURITY_CONTROLS: readonly SecurityControl[] = [
  {
    id: 'token-storage',
    titleAr: 'تخزين الرموز في التخزين الآمن للمنصة',
    status: 'SCAFFOLDED',
    evidence: 'src/security/secureStorage.ts (واجهة + محول expo-secure-store)؛ لا اختبار جهاز بعد',
  },
  {
    id: 'encrypted-sensitive-store',
    titleAr: 'تخزين مشفّر للبيانات الحساسة (SENSITIVE_HEALTH)',
    status: 'SCAFFOLDED',
    evidence: 'واجهة EncryptedSensitiveStore في src/offline/storage.ts؛ محرك M2',
  },
  {
    id: 'biometric-app-lock',
    titleAr: 'قفل التطبيق بالبصمة',
    status: 'SCAFFOLDED',
    evidence: 'واجهة في src/security/biometric.ts فقط — لا تكامل native في M1',
  },
  {
    id: 'device-risk-signals',
    titleAr: 'إشارات مخاطرة الجهاز (jailbreak/root)',
    status: 'NOT STARTED',
    evidence: 'لا يوجد تنفيذ — M2 مع D-P0-3',
  },
  {
    id: 'certificate-pinning',
    titleAr: 'تثبيت شهادة TLS (pinning + backup pin)',
    status: 'SCAFFOLDED',
    evidence: 'إعداد/واجهة في src/security/pinning.ts؛ التنفيذ يتطلب EAS/config M2',
  },
  {
    id: 'qr-signature-verification',
    titleAr: 'التحقق من توقيع QR (فشل-إغلاق)',
    status: 'BLOCKED',
    evidence: 'NG-04 مفتوح: الخادم يقبل بلا توقيع (vaccination/views.py:523) — D-P0-3 في M2',
  },
  {
    id: 'log-scrubbing',
    titleAr: 'كشط السجلات/التلمترية (SENSITIVE_HEALTH → SCRUBBED)',
    status: 'IMPLEMENTED',
    evidence: 'src/security/scrub.ts + اختبارات tests/security.test.ts (SCRUBBED مُختبَر)',
  },
];

export function controlStatus(id: string): ControlStatus | undefined {
  return SECURITY_CONTROLS.find((c) => c.id === id)?.status;
}
