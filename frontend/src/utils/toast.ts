import { toast } from 'react-toastify';
import { AxiosError } from 'axios';

const baseOptions = { rtl: true } as const;

export const notifySuccess = (message: string) => toast.success(message, baseOptions);
export const notifyError = (message: string) => toast.error(message, baseOptions);
export const notifyInfo = (message: string) => toast.info(message, baseOptions);
export const notifyWarning = (message: string) => toast.warning(message, baseOptions);

const throttleMessage = (error: AxiosError): string | null => {
  if (error.response?.status !== 429) return null;
  // نقرأ `Retry-After`؛ ونصّ DRF الإنجليزي لا يُعرض للمستخدم.
  const retryAfter = Number(error.response.headers?.['retry-after']);
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    const minutes = Math.ceil(retryAfter / 60);
    return minutes <= 1
      ? 'تم تقييد الطلب. أعد المحاولة بعد دقيقة.'
      : `تم تقييد الطلب. أعد المحاولة بعد ${minutes} دقيقة.`;
  }
  return 'تم تقييد الطلب. أعد المحاولة بعد قليل.';
};

export const extractErrorMessage = (error: unknown, fallback = 'حدث خطأ غير متوقع'): string => {
  if (error instanceof AxiosError) {
    const throttled = throttleMessage(error);
    if (throttled) return throttled;
    const data = error.response?.data as
      | { message?: string; detail?: string }
      | string
      | undefined;
    if (typeof data === 'string') {
      return data.trim() || fallback;
    }
    if (data?.message) return data.message;
    if (data?.detail) return data.detail;
  }
  return fallback;
};
