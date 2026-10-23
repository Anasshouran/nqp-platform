/**
 * VaccinationCertificatesPage — fee collection UI (SIVS-FIN-009-FE).
 * Mocks the typed vaccination API module.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import type { ReactElement } from 'react';

vi.stubGlobal('matchMedia', () => ({
  matches: false,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

const vaccinationApi = vi.hoisted(() => ({
  getCertificates: vi.fn(),
  getCertificateQr: vi.fn(),
  revokeCertificate: vi.fn(),
  replaceCertificate: vi.fn(),
  reissueCertificate: vi.fn(),
  createVaccinationInvoice: vi.fn(),
  payVaccinationInvoice: vi.fn(),
}));

vi.mock('../../../api/endpoints/vaccination', () => vaccinationApi);

const toast = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('../../../utils/toast', () => toast);

import VaccinationCertificatesPage from '../VaccinationCertificatesPage';

const wrap = (ui: ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/app/vaccination/certificates']}>
      <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>
    </MemoryRouter>,
  );

const certFixture = {
  id: 'cert-1',
  certificate_number: 'AFY-VAC-000001',
  traveler: { id: 't1', full_name: 'أحمد محمد', passport_number: 'P12345' },
  vaccine_name_ar: 'الحمى الصفراء',
  vaccine_code: 'YF',
  status: 'ACTIVE',
  issued_at: '2026-10-20T10:00:00Z',
  valid_until: '2036-10-20',
  validity_days: 3650,
  qr_token: 'qr-token-1',
  verification_path: '/verify/vaccination/AFY-VAC-000001',
  issued_by_name: 'Admin',
};

const paged = (results: unknown[]) => ({
  data: { data: { results, count: results.length, next: null, previous: null } },
});

beforeEach(() => {
  vi.resetAllMocks();
  vaccinationApi.getCertificates.mockResolvedValue(paged([certFixture]));
  vaccinationApi.createVaccinationInvoice.mockResolvedValue({
    data: { data: { id: 'inv-1', invoice_number: 'INV-001', status: 'PENDING_PAYMENT', net_amount: 5000, currency: 'SDG', receipt_number: '' } },
  });
  vaccinationApi.payVaccinationInvoice.mockResolvedValue({
    data: { data: { id: 'inv-1', invoice_number: 'INV-001', status: 'PAID', net_amount: 5000, currency: 'SDG', receipt_number: 'RCP-001' } },
  });
});

describe('VaccinationCertificatesPage — fee collection (SIVS-FIN-009-FE)', () => {
  it('renders the page shell', async () => {
    wrap(<VaccinationCertificatesPage />);
    expect(await screen.findByText('الشهادات')).toBeTruthy();
  });

  it('shows create invoice button when no invoice exists', async () => {
    wrap(<VaccinationCertificatesPage />);
    expect(await screen.findByRole('button', { name: /إنشاء فاتورة/ })).toBeTruthy();
  });

  it('create invoice calls API', async () => {
    wrap(<VaccinationCertificatesPage />);
    const btn = await screen.findByRole('button', { name: /إنشاء فاتورة/ });
    fireEvent.click(btn);
    await waitFor(() => expect(vaccinationApi.createVaccinationInvoice).toHaveBeenCalledWith('cert-1'));
  });

  it('shows pay button after invoice created', async () => {
    wrap(<VaccinationCertificatesPage />);
    const btn = await screen.findByRole('button', { name: /إنشاء فاتورة/ });
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByRole('button', { name: /تحصيل/ })).toBeTruthy());
  });

  it('pay invoice calls API with method', async () => {
    wrap(<VaccinationCertificatesPage />);
    const createBtn = await screen.findByRole('button', { name: /إنشاء فاتورة/ });
    fireEvent.click(createBtn);
    await waitFor(() => expect(screen.getByRole('button', { name: /تحصيل/ })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /تحصيل/ }));
    const confirmBtn = await screen.findByRole('button', { name: /تأكيد التحصيل/ });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(vaccinationApi.payVaccinationInvoice).toHaveBeenCalledWith('cert-1', expect.objectContaining({ method: 'CASH' })));
  });

  it('shows paid status after payment', async () => {
    vaccinationApi.getCertificates.mockResolvedValue(paged([certFixture]));
    wrap(<VaccinationCertificatesPage />);
    const createBtn = await screen.findByRole('button', { name: /إنشاء فاتورة/ });
    fireEvent.click(createBtn);
    await waitFor(() => expect(screen.getByRole('button', { name: /تحصيل/ })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /تحصيل/ }));
    const confirmBtn = await screen.findByRole('button', { name: /تأكيد التحصيل/ });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(screen.getByText(/مدفوع/)).toBeTruthy());
  });
});