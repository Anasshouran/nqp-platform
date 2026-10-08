/**
 * مزوّد انتقالي بكلمة المرور ضد نقطة الدخول القائمة ``POST /api/v1/auth/login/``
 * (JWT 30د/7ي — phase-01 [FOUND]).
 *
 * ليس بديلاً عن SUDAPASS: مسار انتقالي صريح يُستبدَل عند اكتمال D-P0-1.
 * لا يمنح أي نطاق مؤسسي — هذا المزوّد لحسابات المسافرين فقط (§1.1).
 */
import { MobileAuthLoginResponseSchema, MobileAuthRefreshResponseSchema } from '@afyatna/contracts';
import { MobileApiClient, ApiContractError } from '../api/client';
import type { AuthSessionState } from '../types';
import { AuthProviderBlockedError, type AuthProvider, type LoginRequest } from './provider';

export class PasswordAuthProvider implements AuthProvider {
  readonly id = 'password' as const;

  constructor(private readonly api: MobileApiClient) {}

  async login(request: LoginRequest): Promise<AuthSessionState> {
    if (!request.identifier || !request.password) {
      throw new ApiContractError(400, {
        code: 'VALIDATION_ERROR',
        ar: 'يرجى إدخال البريد الإلكتروني أو رقم الجوال أو الرقم القومي وكلمة المرور',
        en: 'Please enter your email, phone, or national ID and password',
      });
    }
    // نقطة الدخول الحالية باسمها الحقيقي: /api/v1/auth/login/ (ليست 501).
    const data = await this.api.request('POST', '/api/v1/auth/login/', {
      body: { identifier: request.identifier, password: request.password },
      schema: MobileAuthLoginResponseSchema,
      authenticated: false,
    });
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
      userId: '',
      provider: 'password',
    };
  }

  async refresh(session: AuthSessionState): Promise<AuthSessionState> {
    if (!session.refreshToken) {
      throw new AuthProviderBlockedError(
        'password',
        'PROVIDER_UNAVAILABLE',
        'لا يوجد رمز تحديث محفوظ — يلزم تسجيل الدخول من جديد.',
        'No refresh token stored — a new sign-in is required.',
      );
    }
    const data = await this.api.request('POST', '/api/v1/auth/refresh/', {
      body: { refresh: session.refreshToken },
      schema: MobileAuthRefreshResponseSchema,
      authenticated: false,
    });
    return {
      ...session,
      accessToken: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }

  async logout(): Promise<void> {
    // إلغاء الرموز يتم في طبقة الجلسة (session.ts) — الخادم يُبطل رمز التحديث عند الطلب.
  }
}
