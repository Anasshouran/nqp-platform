import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiClient from '../../api/client';

const CertificateVerifyPage = (await import('./CertificateVerifyPage')).default;

vi.mock('../../api/client', () => ({
  default: { get: vi.fn() },
}));

const validResult = {
  verified: true,
  status: 'ACTIVE',
  certificate_type: 'CLEARANCE',
  traveler_name: 'أحمد محمد عبد الله النور',
  passport_number: 'P12345678',
  verdict: 'ISOLATION',
  decision: 'تم التحويل إلى العزل بسبب ارتفاع الحرارة',
  clinic_name: 'عيادة مطار الخرطوم',
  issued_at: '2026-10-03T08:00:00Z',
};

const renderPage = (number = 'NQP-2026-0001') =>
  render(
    <MemoryRouter initialEntries={[`/verify/certificates/${number}`]}>
      <Routes>
        <Route path="/verify/certificates/:number" element={<CertificateVerifyPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CertificateVerifyPage — خصوصية التحقق العام', () => {
  it('لا يعرض الاسم الكامل — يُخفيه جزئياً', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: validResult } } as never);
    renderPage();

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    // لا يظهر الاسم الكامل أبداً
    expect(screen.queryByText('أحمد محمد عبد الله النور')).toBeNull();
    expect(screen.queryByText(/عبد الله النور/)).toBeNull();
    // تعرض تمثيلاً مُخفياً
    expect(await screen.findByText('أحمد ا•••')).toBeTruthy();
  });

  it('لا يعرض نتائج سريرية حساسة (التوصية/القرار الحر) في التحقق العام', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: validResult } } as never);
    renderPage();

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(screen.queryByText(/عزل\/حجر صحي/)).toBeNull();
    expect(screen.queryByText(/تحويل للمستشفى/)).toBeNull();
    await waitFor(() =>
      expect(screen.queryByText('تم التحويل إلى العزل بسبب ارتفاع الحرارة')).toBeNull(),
    );
    // تعرض تاريخ الإصدار والجهة المصدرة فقط
    expect(await screen.findByText(/عيادة مطار الخرطوم/)).toBeTruthy();
  });
});