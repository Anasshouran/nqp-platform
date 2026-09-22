import { toast } from 'react-toastify';
import { AxiosError } from 'axios';

const baseOptions = { rtl: true } as const;

export const notifySuccess = (message: string) => toast.success(message, baseOptions);
export const notifyError = (message: string) => toast.error(message, baseOptions);
export const notifyInfo = (message: string) => toast.info(message, baseOptions);
export const notifyWarning = (message: string) => toast.warning(message, baseOptions);

export const extractErrorMessage = (error: unknown, fallback = 'حدث خطأ غير متوقع'): string => {
  if (error instanceof AxiosError) {
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
