/** عقد مسارات المصادقة — /api/v1/mobile/auth/* */
import { z } from 'zod';

export const MobileAuthLoginResponseSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number().int().positive(),
});

export const MobileAuthRefreshResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
});

/** طلب الدخول: مزوّد الهوية يُحدَّد عبر AuthProvider (M1.7) — SUDAPASS محجوب. */
export const MobileAuthLoginRequestSchema = z.object({
  provider: z.enum(['password', 'sudapass']),
  identifier: z.string().optional(),
  password: z.string().optional(),
});

export type MobileAuthLoginResponse = z.infer<typeof MobileAuthLoginResponseSchema>;
export type MobileAuthRefreshResponse = z.infer<typeof MobileAuthRefreshResponseSchema>;
export type MobileAuthLoginRequest = z.infer<typeof MobileAuthLoginRequestSchema>;
