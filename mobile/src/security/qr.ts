/**
 * M1.8 — عقد التحقق من QR (واجهة عميل فقط).
 *
 * ⚠️ التحقق الفعلي يتم في الخادم (فشل-إغلاق مطلوب) — والحالة الحالية BLOCKED
 * لأن الخادم يقبل توقيعاً غائباً (NG-04). لا يُبنَى هنا اعتماد على تحقق
 * عميل وحده أبداً.
 */

export type QrVerificationVerdict =
  | { ok: true; certificateNumber: string; validUntil: string }
  | { ok: false; reason: 'SIGNATURE_INVALID' | 'EXPIRED' | 'REVOKED' | 'UNKNOWN'; ar: string; en: string };

export interface QrVerificationService {
  /** يتحقق عبر الخادم المعتمد فقط (لا تحقق محلي وحده). */
  verify(rawQr: string): Promise<QrVerificationVerdict>;
}

export const QR_VERIFICATION_STATUS = 'BLOCKED' as const;
