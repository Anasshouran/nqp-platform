/**
 * CompanyProfile — loading / success / error / edit+submit / save error.
 * Mocks the typed carriers API module.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('recovers from the error state on retry', async () => {
    carriers.getCompanyProfile.mockRejectedValueOnce(new Error('boom'));
    render(<CompanyProfile />);

    expect(await screen.findByText('تعذّر تحميل البيانات الآن')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    expect(await screen.findByText('سودان إير')).toBeTruthy();
  });

  it('renders — fallbacks for missing IATA/ICAO codes', async () => {
    carriers.getCompanyProfile.mockResolvedValue(
      wrapped({ ...profile, iata_code: null, icao_code: null }),
    );
    render(<CompanyProfile />);

    await screen.findByText('سودان إير');
    expect(screen.getAllByText('—').length).toBe(2);
  });

  it('shows موقوفة when the company is inactive', async () => {
    carriers.getCompanyProfile.mockResolvedValue(wrapped({ ...profile, is_active: false }));
    render(<CompanyProfile />);

    expect(await screen.findByText('موقوفة')).toBeTruthy();
    expect(screen.queryByText('نشِطة')).toBeNull();
  });

  it('fills address and logo_url contact fields from the profile', async () => {
    render(<CompanyProfile />);

    expect(await screen.findByDisplayValue('الخرطوم')).toBeTruthy();
    expect(screen.getByDisplayValue('http://example.test/logo.png')).toBeTruthy();
  });

  it('clears the success alert when a field is edited again', async () => {
    render(<CompanyProfile />);

    const email = (await screen.findByLabelText('البريد الإلكتروني')) as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'a@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await screen.findByText('تم حفظ بيانات التواصل بنجاح.');

    fireEvent.change(email, { target: { value: 'b@example.com' } });
    expect(screen.queryByText('تم حفظ بيانات التواصل بنجاح.')).toBeNull();
  });

  it('clears the save error alert when a field is edited again', async () => {
    carriers.updateCompanyProfile.mockRejectedValueOnce(new Error('nope'));
    render(<CompanyProfile />);

    const email = (await screen.findByLabelText('البريد الإلكتروني')) as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'bad@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await screen.findByText(/تعذّر حفظ بيانات التواصل/);

    fireEvent.change(email, { target: { value: 'fixed@example.com' } });
    expect(screen.queryByText(/تعذّر حفظ بيانات التواصل/)).toBeNull();
  });

  it('shows a loading state on the save button while saving', async () => {
    carriers.updateCompanyProfile.mockReturnValue(new Promise(() => undefined));
    render(<CompanyProfile />);

    fireEvent.click(await screen.findByRole('button', { name: 'حفظ' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /جارٍ الحفظ/ })).toBeTruthy(),
    );
  });

  it('submits the full contact payload, not just email', async () => {
    render(<CompanyProfile />);

    await screen.findByDisplayValue('info@sudanair.example');
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

    await waitFor(() =>
      expect(carriers.updateCompanyProfile).toHaveBeenCalledWith({
        email: 'info@sudanair.example',
        phone: '+249 123',
        address: 'الخرطوم',
        logo_url: 'http://example.test/logo.png',
      }),
    );
  });
});
