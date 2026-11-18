import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCarrier, getCarriers, getCarrierApiKey, getFlights, getHealthNotices,
  regenerateCarrierApiKey, uploadManifest,
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

const renderPage = () => render(<MemoryRouter><CarriersPage /></MemoryRouter>);

const primeHappyPath = () => {
  vi.mocked(getFlights).mockResolvedValue(mockList([]) as any);
  vi.mocked(getCarriers).mockResolvedValue(mockList([]) as any);
  vi.mocked(getHealthNotices).mockResolvedValue(mockList([]) as any);
  vi.mocked(getCountries).mockResolvedValue({ data: { data: [] } } as any);
  vi.mocked(getMasterEntryPoints).mockResolvedValue({ data: { data: [] } } as any);
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u-1', role: 'ADMIN', role_assignments: [] },
    hasRole: () => true, hasAnyRole: () => true, hasPermission: () => true,
    isLoading: false,
  } as any);
};

beforeEach(() => {
  vi.clearAllMocks();
  primeHappyPath();
});

// ============================================================
// Initial API errors
// ============================================================

describe('CarriersPage — initial API errors', () => {
  it('handles flights failure without crash', async () => {
    vi.mocked(getFlights).mockRejectedValueOnce(new Error('flights boom'));
    renderPage();
    await waitFor(() => expect(getFlights).toHaveBeenCalled());
    expect(screen.getAllByRole('heading')[0]).toBeInTheDocument();
  });

  it('handles carriers failure without crash', async () => {
    vi.mocked(getCarriers).mockRejectedValueOnce(new Error('carriers boom'));
    renderPage();
    await waitFor(() => expect(getCarriers).toHaveBeenCalled());
    expect(screen.getAllByRole('heading')[0]).toBeInTheDocument();
  });

  it('handles health notices failure without crash', async () => {
    vi.mocked(getHealthNotices).mockRejectedValueOnce(new Error('notices boom'));
    renderPage();
    await waitFor(() => expect(getHealthNotices).toHaveBeenCalled());
    expect(screen.getAllByRole('heading')[0]).toBeInTheDocument();
  });
});

// ============================================================
// API key dialog
// ============================================================

describe('CarriersPage — API key dialog', () => {
  const carrier = {
    id: 'c-1', name: 'شركة اختبار', code: 'TEST',
    api_key_set: true, is_active: true,
  };

  beforeEach(() => {
    vi.mocked(getCarriers).mockResolvedValue(mockList([carrier]) as any);
  });

  const switchToCarriersTab = async () => {
    const tabs = await screen.findAllByRole('tab');
    const carriersTab = tabs.find((t) =>
      /شركات النقل|companies|carriers/i.test(t.textContent ?? ''),
    );
    expect(carriersTab, 'لم يُعثر على تبويب شركات النقل').toBeTruthy();
    fireEvent.click(carriersTab!);
  };

  const findKeyBtn = async () => {
    const all = await screen.findAllByRole('button');
    return all.find(
      (b) =>
        /مفتاح|API|key/i.test(b.textContent ?? '') ||
        /مفتاح|API|key/i.test(b.getAttribute('aria-label') ?? '') ||
        /مفتاح|API|key/i.test(b.getAttribute('title') ?? ''),
    );
  };

  /** فتح الحوار ثم تأكيد إعادة التوليد داخل ConfirmDialog. */
  const openAndConfirmRegeneration = async () => {
    const openBtn = await findKeyBtn();
    expect(openBtn, 'لم يُعثر على زر فتح حوار المفتاح').toBeTruthy();
    fireEvent.click(openBtn!);

    // الزر الأول داخل الحوار يفتح ConfirmDialog (لأن api_key موجود)
    const regen = await screen.findByRole('button', { name: /توليد|تجديد|generate/i });
    fireEvent.click(regen);

    // تأكيد داخل ConfirmDialog — confirmLabel من production: "نعم، أعِد التوليد"
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'نعم، أعِد التوليد' });
    fireEvent.click(confirm);
  };

  it('loads existing key on open', async () => {
    vi.mocked(getCarrierApiKey).mockResolvedValue({
      data: { data: { api_key: 'EXISTING_KEY' } },
    } as any);
    renderPage();
    await switchToCarriersTab();
    await screen.findByText(/شركة اختبار/);

    const openBtn = await findKeyBtn();
    fireEvent.click(openBtn!);

    await waitFor(() => expect(getCarrierApiKey).toHaveBeenCalledWith('c-1'));
  });

  it('regenerates key and notifies', async () => {
    vi.mocked(getCarrierApiKey).mockResolvedValue({
      data: { data: { api_key: 'OLD_KEY' } },
    } as any);
    vi.mocked(regenerateCarrierApiKey).mockResolvedValue({
      data: { data: { api_key: 'NEW_KEY' } },
    } as any);
    renderPage();
    await switchToCarriersTab();
    await screen.findByText(/شركة اختبار/);

    await openAndConfirmRegeneration();

    await waitFor(() => {
      expect(regenerateCarrierApiKey).toHaveBeenCalledWith('c-1');
      expect(toast.notifySuccess).toHaveBeenCalled();
    });
  });

  it('copies key to clipboard after regeneration', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    vi.mocked(getCarrierApiKey).mockResolvedValue({
      data: { data: { api_key: 'OLD' } },
    } as any);
    vi.mocked(regenerateCarrierApiKey).mockResolvedValue({
      data: { data: { api_key: 'COPY_ME' } },
    } as any);

    renderPage();
    await switchToCarriersTab();
    await screen.findByText(/شركة اختبار/);

    await openAndConfirmRegeneration();

    // الآن newKey موجود وزر النسخ يظهر
    const copyBtn = await screen.findByLabelText('نسخ المفتاح');
    fireEvent.click(copyBtn);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('COPY_ME'));
  });
});

// ============================================================
// Manifest upload
// ============================================================

describe('CarriersPage — manifest upload', () => {
  it('has an upload-manifest affordance for each flight row', async () => {
    vi.mocked(getFlights).mockResolvedValue(mockList([{
      id: 'f-1', flight_number: 'SD123', carrier_name: 'Test',
      flight_type: 'INTERNATIONAL', status: 'SCHEDULED',
      scheduled_arrival: new Date().toISOString(),
      origin_country_name: 'السودان',
      destination_port_name: 'بورتسودان',
    }]) as any);

    renderPage();

    await waitFor(() => {
      const btns = screen.getAllByRole('button');
      const manifestBtn = btns.find(
        (b) => /رفع كشف المسافرين/i.test(b.getAttribute('aria-label') ?? ''),
      );
      expect(manifestBtn).toBeTruthy();
    });
  });
});
