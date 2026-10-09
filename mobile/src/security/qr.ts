/**
 * M1.8 — عقد التحقق من QR (واجهة عميل فقط).
 *
 * ⚠️ التحقق الفعلي يتم في الخادم ولا يُعتمَد على تحققٍ محلي وحده أبداً؛
 * الواجهة هنا تُمثِّل العقد فقط ولا تحقق التوقيع محلياً.
 *
 * التنفيذ الخادمي (فشل-إغلاق إلزامي عبر HMAC-SHA256):
 *   backend/apps/vaccination/models.py
 *   backend/apps/vaccination/views.py
 *   backend/apps/public/views.py
 *   backend/core/utils/qr_payload.py
 */

export type QrVerificationVerdict =
  | { ok: true; certificateNumber: string; validUntil: string }
  | { ok: false; reason: 'SIGNATURE_INVALID' | 'EXPIRED' | 'REVOKED' | 'UNKNOWN'; ar: string; en: string };

export interface QrVerificationService {
  /** يتحقق عبر الخادم المعتمد فقط — لا تحقق محلي وحده. */
  verify(rawQr: string): Promise<QrVerificationVerdict>;
}

/** حالة ضابط التحقق: الخادم هو السلطة النهائية، والفشل-إغلاق إلزامي. */
export const QR_VERIFICATION_STATUS = 'SERVER_AUTHORITATIVE_FAIL_CLOSED' as const;