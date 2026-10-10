import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { describeLoadFailure } from './useServerTable';

const axiosErrorWith = (status?: number, data?: unknown) => {
  const headers = new AxiosHeaders();
  const error = new AxiosError('boom');
  if (status !== undefined) {
    error.response = { status, data, headers, statusText: '', config: {} } as never;
  }
  return error;
};

describe('describeLoadFailure — التمييز بين الصلاحية والشبكة', () => {
  it('403 ليس فشل شبكة: يستعمل نصّ الخادم', () => {
    expect(describeLoadFailure(axiosErrorWith(403, { detail: 'ليس لديك صلاحية للقيام بهذا الإجراء.' })))
      .toBe('ليس لديك صلاحية للقيام بهذا الإجراء.');
  });

  it('403 بلا detail يعطي رسالة صريحة', () => {
    expect(describeLoadFailure(axiosErrorWith(403, {})))
      .toBe('لا تملك صلاحية الوصول إلى هذه البيانات');
  });

  it('401 = جلسة منتهية، لا عطل تحميل', () => {
    expect(describeLoadFailure(axiosErrorWith(401, {})))
      .toBe('انتهت الجلسة، يرجى تسجيل الدخول من جديد');
  });

  it('رمز آخر يُذكر صراحةً بدل رسالة عامة', () => {
    expect(describeLoadFailure(axiosErrorWith(500, {})))
      .toBe('تعذر تحميل البيانات (خطأ 500)');
  });

  it('لا استجابة = فعلاً عطل اتصال، فيبقى النص العام', () => {
    expect(describeLoadFailure(axiosErrorWith(undefined)))
      .toBe('تعذر تحميل البيانات، حاول مرة أخرى');
  });

  it('خطأ غير Axios لا يسقط', () => {
    expect(describeLoadFailure(new Error('boom'))).toBe('تعذر تحميل البيانات، حاول مرة أخرى');
  });
});
