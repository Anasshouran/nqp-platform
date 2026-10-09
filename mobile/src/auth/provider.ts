/**
 * M1.7 — تجريد مزوّد الهوية (Provider-agnostic).
 *
 * الواجهة لا تعرف SUDAPASS ولا كلمة المرور؛ الشاشات تستدعي الواجهة فقط
 * (لا تُضمَّن SUDAPASS في الواجهات (§15: do not hard-code SUDAPASS in UI).
 *
 * الحدود غير القابلة للتجاوز (§1.2):
 * - لا هوية جديدة تُنشأ دون اتصال بمزوّد موثوق.
 * - تعذّر المزوّد لا يُضعف المصادقة ولا يتجاوز التفويض.
 */
import type { AuthSessionState } from '../types';

export interface LoginRequest {
  identifier?: string;
  password?: string;
  /** مسار تفويض SUDAPASS (يُملأ من الإعدادات عند توفّر المزوّد). */
  sudapassRedirectUri?: string;
}

export interface AuthProvider {
  readonly id: 'password' | 'sudapass';
  login(request: LoginRequest): Promise<AuthSessionState>;
  refresh(session: AuthSessionState): Promise<AuthSessionState>;
  logout(session: AuthSessionState): Promise<void>;
}

/** يُرمى حين يكون المزوّد غير متاح/محجوباً — لا يُنقَّل إلى مزوّد آخر تلقائياً. */
export class AuthProviderBlockedError extends Error {
  constructor(
    readonly providerId: string,
    readonly reason: 'SUDAPASS_IMPLEMENTATION' | 'PROVIDER_UNAVAILABLE',
    readonly ar: string,
    readonly en: string,
  ) {
    super(`${providerId}: ${reason}`);
    this.name = 'AuthProviderBlockedError';
  }
}

/**
 * SUDAPASS = مزوّد هوية المسافر فقط (§1.1) — ومحجوب حالياً:
 * D-P0-1 = BLOCKED (لا بيانات اعتماد/مواصفة رسمية في المستودع).
 * هذا المُفصل هو "الحاجز/الدرز" المعتمد: واجهة كاملة، تنفيذ صفر.
 * لا يُنشأ أي عميل SUDAPASS وهمي "شبه جاهز".
 */
export class SudapassAuthProvider implements AuthProvider {
  readonly id = 'sudapass' as const;

  async login(_request: LoginRequest): Promise<AuthSessionState> {
    throw new AuthProviderBlockedError(
      'sudapass',
      'SUDAPASS_IMPLEMENTATION',
      'تسجيل الدخول عبر SUDAPASS غير متاح حالياً — لم يُربط الهوية الرسمية بعد.',
      'SUDAPASS sign-in is unavailable — the official identity provider is not wired yet.',
    );
  }

  async refresh(_session: AuthSessionState): Promise<AuthSessionState> {
    throw new AuthProviderBlockedError(
      'sudapass',
      'SUDAPASS_IMPLEMENTATION',
      'تجديد جلسة SUDAPASS غير متاح حالياً.',
      'SUDAPASS session refresh is unavailable.',
    );
  }

  async logout(_session: AuthSessionState): Promise<void> {
    // إلغاء جلسة محلياً لا يحتاج اتصالاً — آمن دائماً.
  }
}
