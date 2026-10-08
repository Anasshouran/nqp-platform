/**
 * M1.7 — قواعد الجلسة الموثوقة (§1.2: لا انتحال هوية، لا جلسة جديدة دون ثقة).
 *
 * الوضع دون اتصال (§1.2):
 *   "متابعة جلسة موثوقة قائمة + عمليات مخزَّنة مصرّح بها"
 *   وليس "إنشاء هوية جديدة دون اتصال".
 */
import type { AuthSessionState, ConnectivityState } from '../types';

export function isSessionActive(session: AuthSessionState | null, now = Date.now()): boolean {
  if (!session || !session.accessToken) return false;
  return session.expiresAt > now;
}

/**
 * هل يجوز العمل دون اتصال؟ فقط مع جلسة موثوقة قائمة وغير منتهية.
 * لا يُستقبل أي "توكن محفوظ" منتهٍ كافية لإنشاء ثقة جديدة.
 */
export function canOperateOffline(
  session: AuthSessionState | null,
  connectivity: ConnectivityState,
  now = Date.now(),
): boolean {
  if (connectivity === 'online') return true;
  return isSessionActive(session, now);
}

/**
 * خريطة المزوّدين: المسافر فقط. المستخدمون المؤسسيون خارج هذا التطبيق
 * (المصادقة المؤسسية/RBAC القائمة تبقى الحد — §1.1).
 */
export type ProviderId = 'password' | 'sudapass';

export const TRAVELER_ONLY_PROVIDERS: readonly ProviderId[] = ['password', 'sudapass'];

export function assertTravelerProvider(provider: string): asserts provider is ProviderId {
  if (!TRAVELER_ONLY_PROVIDERS.includes(provider as ProviderId)) {
    throw new Error(
      `Unknown provider '${provider}' — mobile app is traveler-identity-only (§1.1)`,
    );
  }
}
