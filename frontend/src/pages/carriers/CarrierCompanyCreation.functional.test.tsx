import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCarrier, getCarriers, getFlights, getHealthNotices,
} from '../../api/endpoints/carriers';
import { getCountries } from '../../api/endpoints/public';
import { getMasterEntryPoints } from '../../api/endpoints/masterdata';
import { useAuth } from '../../hooks/useAuth';
import * as toast from '../../utils/toast';

vi.mock('../../api/endpoints/carriers', () => ({
  createCarrier: vi.fn(), getCarriers: vi.fn(), getCarrierApiKey: vi.fn(),
  getFlights: vi.fn(), getHealthNotices: vi.fn(),
  regenerateCarrierApiKey: vi.fn(), uploadManifest: vi.fn(),
}));
vi.mock('../../api/endpoints/public', () => ({ getCountries: vi.fn() }));
vi.mock('../../api/endpoints/masterdata', () => ({ getMasterEntryPoints: vi.fn() }));
vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../utils/toast', () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));

const CarriersPage = (await import('./CarriersPage')).default;

const mockList = (arr: any[]) => {
  const a: any = [...arr];
  a.data = a; a.results = a; a.items = a;
  a.count = arr.length; a.total = arr.length;
  a.meta = { total: arr.length, count: arr.length };
  return { data: a, status: 200 };
};

const ok = (data: unknown) => ({ data: { data } });

const primeHappyPath = () => {
  vi.mocked(getFlights).mockResolvedValue(mockList([]) as any);
  vi.mocked(getCarriers).mockResolvedValue(mockList([]) as any);
  vi.mocked(getHealthNotices).mockResolvedValue(mockList([]) as any);
  vi.mocked(getCountries).mockResolvedValue(ok([{ code: 'SD', name: 'Sudan', name_ar: 'السودان' }]) as any);
  vi.mocked(getMasterEntryPoints).mockResolvedValue(ok([{
    id: 'p1', code: 'KHRT', name_en: 'Khartoum', name_ar: 'الخرطوم',
    kind: 'AIRPORT', is_active: true,
  }]) as any);
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u-1', role: 'ADMIN', role_assignments: [] },
    hasRole: () => true, hasAnyRole: () => true, hasPermission: () => true,
    isLoading: false,
  } as any);
  vi.mocked(createCarrier).mockResolvedValue(ok({ name: 'شركة النيل', iata_code: 'NL' }) as any);
};

const openForm = async () => {
  render(<MemoryRouter><CarriersPage /></MemoryRouter>);
  // The companies tab is admin-only and is not the default (flights is index 0).
  fireEvent.click(await screen.findByRole('tab', { name: /شركات النقل/ }));
  const addButton = await screen.findByRole('button', { name: 'إضافة شركة طيران' });
  fireEvent.click(addButton);
  return screen.findByRole('dialog');
};

const fillRequiredName = (dialog: HTMLElement) => {
  fireEvent.change(within(dialog).getByLabelText(/الاسم بالعربية/), {
    target: { value: 'شركة النيل' },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  primeHappyPath();
});

describe('CarrierCompanyCreation — P3-C functional coverage', () => {
  it('loads countries and entry points when the form opens', async () => {
    const dialog = await openForm();
    expect(getCountries).toHaveBeenCalledTimes(1);
    expect(getMasterEntryPoints).toHaveBeenCalledWith({ page_size: 500 });
    expect(within(dialog).getByLabelText('الدولة')).toBeTruthy();
    expect(within(dialog).getByLabelText('المنافذ')).toBeTruthy();
  });

  it('requires the Arabic name and blocks creation when it is empty', async () => {
    const dialog = await openForm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ واعتماد' }));
    expect(await within(dialog).findByText('الاسم بالعربية مطلوب')).toBeTruthy();
    expect(createCarrier).not.toHaveBeenCalled();
  });

  it('uppercases IATA/ICAO codes in the submitted payload', async () => {
    const dialog = await openForm();
    fillRequiredName(dialog);
    fireEvent.change(within(dialog).getByLabelText('رمز IATA'), { target: { value: 'j4' } });
    fireEvent.change(within(dialog).getByLabelText('رمز ICAO'), { target: { value: 'bdr' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ واعتماد' }));
    await waitFor(() => {
      expect(createCarrier).toHaveBeenCalledWith(expect.objectContaining({
        name: 'شركة النيل',
        iata_code: 'J4',
        icao_code: 'BDR',
        company_type: 'NATIONAL',
      }));
    });
  });

  it('notifies success with the saved carrier and closes the dialog', async () => {
    const dialog = await openForm();
    fillRequiredName(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ واعتماد' }));
    await waitFor(() => {
      expect(toast.notifySuccess).toHaveBeenCalledWith('تم اعتماد «شركة النيل» (ID: NL)');
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('shows the duplicate-code error and keeps the dialog open on failure', async () => {
    vi.mocked(createCarrier).mockRejectedValue(new Error('duplicate IATA'));
    const dialog = await openForm();
    fillRequiredName(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ واعتماد' }));
    expect(await within(dialog).findByText('تعذّر الحفظ — تحقق من عدم تكرار كود IATA/ICAO')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
