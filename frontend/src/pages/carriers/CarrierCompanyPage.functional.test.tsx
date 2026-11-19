import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getApiKey, getCompanyProfile, regenerateApiKey, updateCompanyProfile,
} from '../../api/endpoints/carriers';

vi.mock('../../api/endpoints/carriers', () => ({
  getCompanyProfile: vi.fn(),
  updateCompanyProfile: vi.fn(),
  getApiKey: vi.fn(),
  regenerateApiKey: vi.fn(),
}));

const CarrierCompanyPage = (await import('./CarrierCompanyPage')).default;

const profile = {
  id: 'c-1',
  name: 'الخطوط السودانية',
  iata_code: 'SD',
  email: 'ops@example.com',
  phone: '+249123456789',
  address: 'الخرطوم',
  logo_url: 'https://example.com/logo.png',
  is_active: true,
};

const apiInfo = {
  api_key: 'nqp_SECRET123',
  created_at: '2026-01-01T00:00:00Z',
  last_use_at: '2026-01-02T00:00:00Z',
  last_use_ip: '10.0.0.1',
};

const ok = (data: unknown) => ({ data: { data } });
const renderPage = () => render(<MemoryRouter><CarrierCompanyPage /></MemoryRouter>);

const primeHappyPath = () => {
  vi.mocked(getCompanyProfile).mockResolvedValue(ok(profile) as any);
  vi.mocked(getApiKey).mockResolvedValue(ok(apiInfo) as any);
  vi.mocked(updateCompanyProfile).mockResolvedValue(ok(profile) as any);
  vi.mocked(regenerateApiKey).mockResolvedValue(ok({ ...apiInfo, api_key: 'nqp_NEWKEY' }) as any);
};

beforeEach(() => {
  vi.clearAllMocks();
  primeHappyPath();
});

describe('CarrierCompanyPage — P3-A functional coverage', () => {
  it('renders loading skeletons before both requests settle', () => {
    vi.mocked(getCompanyProfile).mockReturnValue(new Promise(() => {}) as any);
    vi.mocked(getApiKey).mockReturnValue(new Promise(() => {}) as any);
    const { container } = renderPage();
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBe(3);
  });

  it('renders the company profile and a masked API key after load', async () => {
    renderPage();
    expect(await screen.findByText(/الخطوط السودانية/)).toBeTruthy();
    expect(screen.getByText('إعدادات الشركة')).toBeTruthy();
    expect(screen.getByText(/nqp_•+/)).toBeTruthy();
  });

  it('conflates a failed profile load with the no-company alert (documented gap)', async () => {
    vi.mocked(getCompanyProfile).mockRejectedValue(new Error('down'));
    renderPage();
    // production sets the load-error message but returns early on !profile,
    // so the visible alert is the no-company one — the error text never renders.
    expect(await screen.findByText('لم يتم العثور على شركة مرتبطة بحسابك.')).toBeTruthy();
    expect(screen.queryByText('تعذّر تحميل بيانات الشركة')).toBeNull();
  });

  it('shows the no-company alert when the profile is null', async () => {
    vi.mocked(getCompanyProfile).mockResolvedValue({ data: null } as any);
    renderPage();
    expect(await screen.findByText('لم يتم العثور على شركة مرتبطة بحسابك.')).toBeTruthy();
  });

  it('prefills the editable fields from the loaded profile', async () => {
    renderPage();
    await screen.findByText(/الخطوط السودانية/);
    expect(await screen.findByDisplayValue('ops@example.com')).toBeTruthy();
    expect(screen.getByDisplayValue('+249123456789')).toBeTruthy();
    expect(screen.getByDisplayValue('الخرطوم')).toBeTruthy();
    expect(screen.getByDisplayValue('https://example.com/logo.png')).toBeTruthy();
  });

  it('saves edited details and confirms success', async () => {
    renderPage();
    await screen.findByText(/الخطوط السودانية/);
    fireEvent.change(screen.getByDisplayValue('ops@example.com'), {
      target: { value: 'new@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));
    await waitFor(() => {
      expect(updateCompanyProfile).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
      );
    });
    expect(await screen.findByText('تم حفظ بيانات الشركة')).toBeTruthy();
  });

  it('shows an error alert when saving fails', async () => {
    vi.mocked(updateCompanyProfile).mockRejectedValue(new Error('bad payload'));
    renderPage();
    await screen.findByText(/الخطوط السودانية/);
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التغييرات' }));
    expect(await screen.findByText('فشل حفظ البيانات — تحقق من الحقول')).toBeTruthy();
  });

  it('toggles the API key between masked and visible', async () => {
    const { container } = renderPage();
    await screen.findByText(/الخطوط السودانية/);
    const visibilityButton = container.querySelector('[data-testid="VisibilityIcon"]')!.closest('button')!;
    fireEvent.click(visibilityButton);
    expect(await screen.findByText('nqp_SECRET123')).toBeTruthy();
    const hideButton = container.querySelector('[data-testid="VisibilityOffIcon"]')!.closest('button')!;
    fireEvent.click(hideButton);
    expect(screen.getByText(/nqp_•+/)).toBeTruthy();
  });

  it('copies the API key to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const { container } = renderPage();
    await screen.findByText(/الخطوط السودانية/);
    const copyButton = container.querySelector('[data-testid="ContentCopyIcon"]')!.closest('button')!;
    fireEvent.click(copyButton);
    expect(writeText).toHaveBeenCalledWith('nqp_SECRET123');
  });

  it('shows an error alert when clipboard copying fails', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    const { container } = renderPage();
    await screen.findByText(/الخطوط السودانية/);
    const copyButton = container.querySelector('[data-testid="ContentCopyIcon"]')!.closest('button')!;
    fireEvent.click(copyButton);
    expect(await screen.findByText('تعذّر النسخ')).toBeTruthy();
  });

  it('warns when the company has no API key yet', async () => {
    vi.mocked(getApiKey).mockResolvedValue(ok({ api_key: null }) as any);
    renderPage();
    expect(await screen.findByText(/لا يوجد مفتاح API بعد/)).toBeTruthy();
  });

  it('requires confirmation, then regenerates the API key', async () => {
    renderPage();
    await screen.findByText(/الخطوط السودانية/);
    fireEvent.click(screen.getByRole('button', { name: 'إعادة توليد المفتاح' }));
    fireEvent.click(await screen.findByRole('button', { name: 'إلغاء' }));
    expect(regenerateApiKey).not.toHaveBeenCalled();

    // MUI keeps the app root aria-hidden during the dialog exit transition.
    fireEvent.click(await screen.findByRole('button', { name: 'إعادة توليد المفتاح' }));
    fireEvent.click(await screen.findByRole('button', { name: 'إعادة التوليد' }));
    await waitFor(() => expect(regenerateApiKey).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/تم توليد مفتاح جديد/)).toBeTruthy();
    expect(screen.getByText('nqp_NEWKEY')).toBeTruthy();
  });

  it('shows an error alert when key regeneration fails', async () => {
    vi.mocked(regenerateApiKey).mockRejectedValue(new Error('rotation failed'));
    renderPage();
    await screen.findByText(/الخطوط السودانية/);
    fireEvent.click(screen.getByRole('button', { name: 'إعادة توليد المفتاح' }));
    fireEvent.click(await screen.findByRole('button', { name: 'إعادة التوليد' }));
    expect(await screen.findByText('فشل إعادة توليد المفتاح')).toBeTruthy();
  });
});
