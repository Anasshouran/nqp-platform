import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../i18n';

import {
  activateCarrierMember, createCarrierMember, deactivateCarrierMember,
  deleteCarrierDocument, downloadCarrierDocument, getCarrierDocuments,
  getCarriers, getFlight, getFlightTimeline, listCarrierMembers,
  uploadCarrierDocument,
} from '../../api/endpoints/carriers';
import { useAuth } from '../../hooks/useAuth';
import * as toast from '../../utils/toast';

vi.mock('../../api/endpoints/carriers', () => ({
  getCarrierDocuments: vi.fn(), uploadCarrierDocument: vi.fn(),
  deleteCarrierDocument: vi.fn(), downloadCarrierDocument: vi.fn(),
  getFlight: vi.fn(), getFlightTimeline: vi.fn(),
  listCarrierMembers: vi.fn(), createCarrierMember: vi.fn(),
  updateCarrierMember: vi.fn(), activateCarrierMember: vi.fn(),
  deactivateCarrierMember: vi.fn(), getCarriers: vi.fn(),
}));
vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../../utils/toast', () => ({
  notifySuccess: vi.fn(), notifyError: vi.fn(),
  extractErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));
vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  const t = (k: string, o?: object) => i18n.t(k, o as never);
  return { ...actual, useTranslation: () => ({ t, i18n }) };
});

const CarrierDocumentsPage = (await import('./CarrierDocumentsPage')).default;
const CarrierFlightDetailPage = (await import('./CarrierFlightDetailPage')).default;
const CarrierMembersPage = (await import('./CarrierMembersPage')).default;

const ok = (data: unknown) => ({ data: { data } });
const listResp = (arr: any[]) => ({ data: { data: { results: arr, count: arr.length } } });
const mockList = (arr: any[]) => {
  const a: any = [...arr];
  a.data = a; a.results = a; a.items = a;
  a.count = arr.length; a.total = arr.length;
  a.meta = { total: arr.length, count: arr.length };
  return { data: a, status: 200 };
};

const flight = {
  id: 'f-1', flight_number: 'SD123', carrier_name: 'Sudan Airways',
  aircraft_type: 'A320', origin_country_name: 'السودان',
  destination_port_name: 'بورتسودان', status: 'SCHEDULED',
  scheduled_departure: '2026-01-01T10:00:00Z',
  scheduled_arrival: '2026-01-01T12:00:00Z',
};

const activeMember = {
  id: 'm-1', user_full_name: 'عضو اختبار', is_active: true,
  carrier_id: 'c-1',
};

const renderDocuments = () => render(<CarrierDocumentsPage />);
const renderFlight = () => render(
  <MemoryRouter initialEntries={['/flights/f-1']}>
    <Routes><Route path="/flights/:id" element={<CarrierFlightDetailPage />} /></Routes>
  </MemoryRouter>,
);
const renderMembers = () => render(<MemoryRouter><CarrierMembersPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCarrierDocuments).mockResolvedValue(listResp([]) as any);
  vi.mocked(uploadCarrierDocument).mockResolvedValue({ data: {} } as any);
  vi.mocked(deleteCarrierDocument).mockResolvedValue({ data: {} } as any);
  vi.mocked(downloadCarrierDocument).mockResolvedValue({ data: {} } as any);
  vi.mocked(getFlight).mockResolvedValue(ok(flight) as any);
  vi.mocked(getFlightTimeline).mockResolvedValue(ok({ events: [] }) as any);
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'u-1', full_name: 'مدير الشركة', email: 'admin@carrier.test',
      is_active: true,
      role_assignments: [{
        scope_type: 'COMPANY', scope_id: 'c-1', is_active: true,
        role_code: 'CARRIER_ADMIN', role: 'CARRIER_ADMIN',
      }],
    },
    hasRole: () => true, hasAnyRole: () => true, hasPermission: () => true,
    isLoading: false,
  } as any);
  vi.mocked(getCarriers).mockResolvedValue(mockList([{ id: 'c-1', name: 'شركة اختبار' }]) as any);
  vi.mocked(listCarrierMembers).mockResolvedValue(mockList([activeMember]) as any);
});

const pickFile = (container: HTMLElement, name = 'a.pdf') => {
  const input = container.querySelector('input[type="file"]')!;
  const file = new File(['content'], name, { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
  return file;
};

describe('P3-D — CarrierDocuments upload gap', () => {
  it('disables upload until a file is selected', async () => {
    renderDocuments();
    await screen.findByText('المستندات');
    expect(screen.getByRole('button', { name: 'رفع' })).toBeDisabled();
    expect(uploadCarrierDocument).not.toHaveBeenCalled();
  });

  it('shows an error alert when the upload request fails', async () => {
    vi.mocked(uploadCarrierDocument).mockRejectedValueOnce(new Error('bad file'));
    const { container } = renderDocuments();
    pickFile(container);
    fireEvent.click(screen.getByRole('button', { name: 'رفع' }));
    expect(await screen.findByText('تعذر رفع المستند')).toBeTruthy();
  });

  it('sends document type, title, flight and file in the upload FormData', async () => {
    const { container } = renderDocuments();
    const file = pickFile(container);
    fireEvent.change(screen.getByLabelText('العنوان'), { target: { value: 'عنوان جديد' } });
    fireEvent.change(screen.getByLabelText('Flight ID (اختياري)'), { target: { value: 'f-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'رفع' }));
    await waitFor(() => expect(uploadCarrierDocument).toHaveBeenCalledTimes(1));
    const form = vi.mocked(uploadCarrierDocument).mock.calls[0][0] as FormData;
    expect(form.get('document_type')).toBe('OTHER');
    expect(form.get('title')).toBe('عنوان جديد');
    expect(form.get('flight')).toBe('f-1');
    expect(form.get('file')).toBeTruthy();
    expect((form.get('file') as File).name).toBe(file.name);
  });
});

describe('P3-D — CarrierFlightDetail timeline gap', () => {
  it('renders timeline events with operational/health category labels', async () => {
    vi.mocked(getFlightTimeline).mockResolvedValue(ok({ events: [
      {
        source_type: 'health_declaration_log', source_id: 'e1',
        category: 'health', title: 'إقرار صحي', status: 'APPROVED',
        timestamp: '2026-01-01T11:00:00Z', actor_name: 'مفتش',
      },
      {
        source_type: 'flight_log', source_id: 'e2',
        category: 'operational', title: 'هبوط', timestamp: '2026-01-01T12:00:00Z',
      },
    ] }) as any);
    renderFlight();
    expect(await screen.findByText('سجل أحداث الرحلة')).toBeTruthy();
    expect(screen.getByText('إقرار صحي')).toBeTruthy();
    expect(screen.getByText('صحي / إداري')).toBeTruthy();
    expect(screen.getByText('تشغيلي')).toBeTruthy();
    expect(screen.getAllByText(/APPROVED/).length).toBeGreaterThan(0);
  });

  it('keeps the page rendered with a local alert when only the timeline fails', async () => {
    vi.mocked(getFlightTimeline).mockRejectedValueOnce(new Error('timeline down'));
    renderFlight();
    expect(await screen.findByText('سجل أحداث الرحلة')).toBeTruthy();
    expect(screen.getByText('تعذّر تحميل سجل أحداث الرحلة')).toBeTruthy();
    expect(screen.queryByText('تعذر تحميل تفاصيل الرحلة')).toBeNull();
  });

  it('keeps the page rendered with a local alert when only the documents fail', async () => {
    vi.mocked(getCarrierDocuments).mockRejectedValueOnce(new Error('documents down'));
    renderFlight();
    expect(await screen.findByText('سجل أحداث الرحلة')).toBeTruthy();
    expect(screen.getByText('تعذّر تحميل المستندات')).toBeTruthy();
    expect(screen.queryByText('تعذر تحميل تفاصيل الرحلة')).toBeNull();
  });

  it('still shows a full-page error when the flight request itself fails', async () => {
    vi.mocked(getFlight).mockRejectedValueOnce(new Error('flight down'));
    renderFlight();
    expect(await screen.findByText('تعذر تحميل تفاصيل الرحلة')).toBeTruthy();
    expect(screen.queryByText('سجل أحداث الرحلة')).toBeNull();
  });
});

describe('P3-D — CarrierMembers empty field and lifecycle gaps', () => {
  it('requires a user UUID before adding a member', async () => {
    renderMembers();
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة عضو' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ العضو' }));
    expect(toast.notifyError).toHaveBeenCalledWith('مطلوب معرّف المستخدم');
    expect(createCarrierMember).not.toHaveBeenCalled();
  });

  it('shows an error alert when adding a member fails', async () => {
    vi.mocked(createCarrierMember).mockRejectedValueOnce(new Error('duplicate'));
    renderMembers();
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة عضو' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('معرّف المستخدم'), {
      target: { value: 'u-2' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ العضو' }));
    await waitFor(() => {
      expect(toast.notifyError).toHaveBeenCalledWith('تعذّرت إضافة العضو');
    });
  });

  it('shows an error alert when deactivating a member fails', async () => {
    vi.mocked(deactivateCarrierMember).mockRejectedValueOnce(new Error('in use'));
    renderMembers();
    await screen.findByText(/عضو اختبار/);
    fireEvent.click(await screen.findByLabelText('تعطيل'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'تعطيل' }));
    await waitFor(() => {
      expect(toast.notifyError).toHaveBeenCalledWith('تعذّرت تعطيل العضو');
    });
  });

  it('shows an error alert when activating a member fails', async () => {
    vi.mocked(listCarrierMembers).mockResolvedValueOnce(
      mockList([{ ...activeMember, is_active: false }]) as any,
    );
    vi.mocked(activateCarrierMember).mockRejectedValueOnce(new Error('locked'));
    renderMembers();
    await screen.findByText(/عضو اختبار/);
    fireEvent.click(await screen.findByLabelText('تفعيل'));
    await waitFor(() => {
      expect(toast.notifyError).toHaveBeenCalledWith('تعذّر تفعيل العضو');
    });
  });
});
