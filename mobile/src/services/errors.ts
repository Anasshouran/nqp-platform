/** أدوات خطأ موحدة لطبقة الولاية (§25) — لا تسريب داخلي. */
import { ApiContractError } from '../api/client';
import type { ErrorMessage } from '@afyatna/contracts';

export type NormalizedError = {
  httpStatus: number;
  code: string;
  ar: string;
  en: string;
};

export const GENERIC_ERROR: ErrorMessage = {
  code: 'SERVER_ERROR',
  ar: 'حدث خطأ مؤقت — يرجى المحاولة لاحقاً',
  en: 'A temporary error occurred — please try again later',
};

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof ApiContractError) {
    return {
      httpStatus: error.httpStatus,
      ...error.message_,
    };
  }
  return { httpStatus: 0, ...GENERIC_ERROR };
}

/** هل الخطأ يعني انتهاء/غزل الجلسة؟ (401). لا يتخذ قرار سلطة أخرى. */
export function isUnauthorizedError(error: unknown): boolean {
  if (error instanceof ApiContractError) {
    return (
      error.httpStatus === 401 &&
      (error.message_.code === 'AUTH_REQUIRED' || error.message_.code === 'AUTH_INVALID')
    );
  }
  return false;
}