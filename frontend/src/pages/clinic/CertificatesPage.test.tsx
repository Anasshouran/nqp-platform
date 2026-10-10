import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth as useAuthModule } from '../../hooks/useAuth';
import { getCertificateQr, getCertificates, revokeCertificate } from '../../api/endpoints/clinic';

const CertificatesPage = (await import('./CertificatesPage')).default;

vi.mock('../../api/endpoints/clinic', () => ({
  getCertificates: vi.fn(),
  getCertificateQr: vi.fn(),
  revokeCertificate: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('../../utils/toast', () => ({
  extractErrorMessage: (_: unknown, fallback: string) => fallback,
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

/** نافذة صيد تلتقط HTML المُكتب عبر document.write في شهادة الطباعة. */
const capturedWrite = { html: '' };

vi.spyOn(window, 'open').mockImplementation(() => {
  const write = (html: string) => {
    capturedWrite.html = html;
  };
  const captured = {
    document: { write, close: vi.fn() },
    focus: vi.fn(),
    print: vi.fn(),
    onload: null as (() => void) | null,
  };
  return captured as unknown as Window;
});

const activeCert = {
  id: 'c1',
  visit: 'v1',
  certificate_number: '<script>alert(1)</script>',
  certificate_type: 'CLEARANCE',
  verdict: 'RELEASE',
  status: 'ACTIVE',
  issued_by_name: 'د. طبيب',
  issued_at: '2026-10-03T08:00:00Z',
  valid_until: '2026-10-10T08:00:00Z',
  qr_token: 'tok',
  verification_path: '/public/certificates/c1/verify/',
  traveler_name: 'مسافر',
  passport_number: 'P123',
  clinic_name: 'عيادة المطار',
};

beforeEach(() => {
  vi.clearAllMocks();
  capturedWrite.html = '';
  vi.mocked(getCertificates).mockResolvedValue({
    data: { data: { count: 1, results: [activeCert] } },
  } as never);
  vi.mocked(getCertificateQr).mockResolvedValue({ data: { data: { qr_png: 'aGVsbG8=' } } } as never);
  vi.mocked(revokeCertificate).mockResolvedValue({ data: { data: {} } } as never);
  vi.mocked(useAuthModule).mockReturnValue({
    user: { id: 'u1', full_name: 'مستخدم', email: 'u@nqp.sd', role: 'CLINIC_OFFICER', is_active: true },
    token: 't',
    isAuthenticated: true,
  } as never);
});

describe('CertificatesPage — تجاوز XSS في شهادة الطباعة', () => {
  it('يُهرّب certificate_number في <title> ويمنع حقن <script> في HTML المطبوع', async () => {
    render(<CertificatesPage />);

    await waitFor(() => expect(getCertificates).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole('button', { name: 'عرض الشهادة' })[0]);

    const printButton = await screen.findByRole('button', { name: 'طباعة' });
    fireEvent.click(printButton);

    await waitFor(() => expect(capturedWrite.html).toContain('<title>'));
    const written = capturedWrite.html;

    expect(written).toContain('<title>شهادة صحية - &lt;script&gt;alert(1)&lt;/script&gt;</title>');
    expect(written).not.toMatch(/<title>[^<]*<script>/);
  });

  it('يحافظ على تهريب رقم الشهادة في صف الشهادة داخل المطبوع', async () => {
    render(<CertificatesPage />);

    await waitFor(() => expect(getCertificates).toHaveBeenCalled());
    fireEvent.click(screen.getAllByRole('button', { name: 'عرض الشهادة' })[0]);

    const printButton = await screen.findByRole('button', { name: 'طباعة' });
    fireEvent.click(printButton);

    await waitFor(() => expect(capturedWrite.html).toContain('<b>'));
    expect(capturedWrite.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(capturedWrite.html).not.toMatch(/<b>[\s\S]*<script>/);
  });
});