/**
 * غلاف الاستجابة المعتمد لـ API الجوال (عقد المرحلة الأولى §11).
 *
 * نجاح: { status: 'success', data, message: null }
 * خطأ:  { status: 'error', data: null, message: { code, ar, en } }
 *
 * عربي أول: رسالة المستخدم الأساسية بالعربية، والإنجليزية ثانوية.
 */
import { z } from 'zod';

/** رموز الأخطاء المعتمدة — يجب أن تطابق backend/apps/mobile_api/envelope.py */
export const ERROR_CODES = [
  'AUTH_REQUIRED',
  'AUTH_INVALID',
  'FORBIDDEN',
  'NOT_FOUND',
  'METHOD_NOT_ALLOWED',
  'RATE_LIMITED',
  'NOT_IMPLEMENTED',
  'VALIDATION_ERROR',
  'SERVER_ERROR',
  'CONTRACT_VERSION_UNSUPPORTED',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const ErrorMessageSchema = z.object({
  code: z.enum(ERROR_CODES),
  ar: z.string().min(1),
  en: z.string().min(1),
});

export type ErrorMessage = z.infer<typeof ErrorMessageSchema>;

export function successEnvelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    status: z.literal('success'),
    data,
    message: z.string().nullable().optional().default(null),
  });
}

export function errorEnvelope() {
  return z.object({
    status: z.literal('error'),
    data: z.null(),
    message: ErrorMessageSchema,
  });
}

/** غلاف موحّد: إمّا نجاح أو خطأ (يُستخدم لتفكيك أي استجابة عامة). */
export function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.union([successEnvelope(data), errorEnvelope()]);
}

export type SuccessEnvelope<T> = { status: 'success'; data: T; message: string | null };
export type ErrorEnvelope = { status: 'error'; data: null; message: ErrorMessage };
