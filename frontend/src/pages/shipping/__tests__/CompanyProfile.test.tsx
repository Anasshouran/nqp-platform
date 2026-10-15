/**
 * CompanyProfile — loading / success / error / edit+submit / save error.
 * Mocks the typed carriers API module.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const carriers = vi.hoisted(() => ({
  getCompanyProfile: vi.fn(),
  updateCompanyProfile: vi.fn(),
}));
vi.mock('../../../api/endpoints/carriers', () => carriers);

import { CompanyProfile } from '../components/CompanyProfile';

const profile = {
  id: 'c1',
  name: 'سودان إير',
  iata_code: 'SU',
  icao_code: 'SUD',
  email: 'info@sudanair.example',
  phone: '+249 123',
  address: 'الخرطوم',
  logo_url: 'http://example.test/logo.png',
  is_active: true,
};

const wrapped = (data: unknown) => ({ data: { data } });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
  carriers.getCompanyProfile.mockResolvedValue(wrapped(profile));
  carriers.updateCompanyProfile.mockResolvedValue(wrapped(profile));
});

describe('CompanyProfile', () => {
  it('shows a loading skeleton initially', () => {
    carriers.getCompanyProfile.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<CompanyProfile />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders the read-only identity fields from the API', async () => {
    render(<CompanyProfile />);

    expect(await screen.findByText('سودان إير')).toBeTruthy();
    expect(screen.getByText('SU')).toBeTruthy();
    expect(screen.getByText('SUD')).toBeTruthy();
    expect(screen.getByText('نشِطة')).toBeTruthy();
  });

  it('shows the error state when loading fails', async () => {
    carriers.getCompanyProfile.mockRejectedValue(new Error('boom'));
    render(<CompanyProfile />);

    expect(await screen.findByText('تعذّر تحميل البيانات الآن')).toBeTruthy();
  });

  it('fills the editable contact fields from the profile', async () => {
    render(<CompanyProfile />);

    expect(await screen.findByDisplayValue('info@sudanair.example')).toBeTruthy();
    expect(screen.getByDisplayValue('+249 123')).toBeTruthy();
  });

  it('submits the edited contact payload and shows a success alert', async () => {
    render(<CompanyProfile />);

    const email = (await screen.findByLabelText('البريد الإلكتروني')) as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'new@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    expect(await screen.findByText('تم حفظ بيانات التواصل بنجاح.')).toBeTruthy();
    expect(carriers.updateCompanyProfile).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'new@example.com' })
    );
  });

  it('shows an error alert when saving fails', async () => {
    carriers.updateCompanyProfile.mockRejectedValue(new Error('nope'));
    render(<CompanyProfile />);

    const email = await screen.findByLabelText('البريد الإلكتروني');
    fireEvent.change(email, { target: { value: 'bad@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    expect(await screen.findByText(/تعذّر حفظ بيانات التواصل/)).toBeTruthy();
  });
});
