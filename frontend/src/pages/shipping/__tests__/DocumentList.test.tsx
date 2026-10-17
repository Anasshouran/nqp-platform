/**
 * DocumentList — vessel documents list + upload dialog + delete workflow.
 * Mocks the typed shipping + portHealth API modules and the toast helper.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shipping = vi.hoisted(() => ({
  getVesselDocuments: vi.fn(),
  createVesselDocument: vi.fn(),
  deleteVesselDocument: vi.fn(),
  VESSEL_DOCUMENT_TYPES: [
    'BILL_OF_LADING', 'CARGO_MANIFEST', 'CREW_LIST', 'PASSENGER_LIST',
    'HEALTH_CERTIFICATE', 'SANITATION_CERTIFICATE', 'AGENT_AUTHORISATION', 'OTHER',
  ],
  VESSEL_DOCUMENT_TYPE_LABELS: {
    BILL_OF_LADING: 'بوليصة الشحن',
    CARGO_MANIFEST: 'بيان الحمولة',
    CREW_LIST: 'قائمة الطاقم',
    PASSENGER_LIST: 'قائمة المسافرين',
    HEALTH_CERTIFICATE: 'شهادة صحية',
    SANITATION_CERTIFICATE: 'شهادة تعقيم',
    AGENT_AUTHORISATION: 'تفويض الوكيل',
    OTHER: 'أخرى',
  },
}));
vi.mock('../../../api/endpoints/shipping', () => shipping);

const portHealth = vi.hoisted(() => ({ getVesselVisits: vi.fn() }));
vi.mock('../../../api/endpoints/portHealth', () => portHealth);

const toast = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('../../../utils/toast', () => toast);

import { DocumentList } from '../components/DocumentList';

const paged = (results: unknown[], count = results.length) => ({
  data: { data: { results, count, next: null, previous: null } },
});

const base = {
  id: 'd1',
  vessel_visit: 'vv1',
  vessel_name: 'MV Document',
  vessel_imo: 'IMO-DOC-1',
  document_type: 'CARGO_MANIFEST',
  document_type_label: 'بيان الحمولة',
  title: 'Manifest May',
  file: '/media/shipping_documents/manifest.pdf',
  original_filename: 'manifest.pdf',
  mime_type: 'application/pdf',
  file_size: 2048,
  uploaded_by: 'u1',
  uploaded_by_name: 'أحمد',
  pre_arrival: null,
  clearance_decision: null,
  created_at: '2026-10-16T10:00:00Z',
  updated_at: '2026-10-16T10:00:00Z',
};

const row = (over: Partial<typeof base> = {}) => ({ ...base, ...over });

const bigFile = () => {
  const file = new File(['x'], 'big.pdf', { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
  return file;
};

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
  shipping.getVesselDocuments.mockResolvedValue(paged([]));
  portHealth.getVesselVisits.mockResolvedValue(paged([]));
});

describe('DocumentList', () => {
  it('shows a loading skeleton initially', () => {
    shipping.getVesselDocuments.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<DocumentList />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders rows from the API', async () => {
    shipping.getVesselDocuments.mockResolvedValue(paged([row()]));
    render(<DocumentList />);

    expect(await screen.findByText('Manifest May')).toBeTruthy();
    expect(screen.getByText('manifest.pdf')).toBeTruthy();
    expect(screen.getByText('بيان الحمولة')).toBeTruthy();
    expect(screen.getByText('IMO-DOC-1')).toBeTruthy();
  });

  it('shows the empty state when there are no rows', async () => {
    shipping.getVesselDocuments.mockResolvedValue(paged([]));
    render(<DocumentList />);

    expect(await screen.findByText('لا توجد مستندات')).toBeTruthy();
  });

  it('opens the upload dialog from the header action', async () => {
    render(<DocumentList />);

    const openBtn = await screen.findByText(/تحميل مستند/);
    fireEvent.click(openBtn);

    expect(await screen.findByText('رفع مستند جديد')).toBeTruthy();
    expect(screen.getByText('العنوان')).toBeTruthy();
    expect(screen.getByLabelText('الملف')).toBeTruthy();
  });

  it('rejects an oversize file client-side', async () => {
    render(<DocumentList />);

    fireEvent.click(await screen.findByText(/تحميل مستند/));
    const input = await screen.findByLabelText('الملف');
    fireEvent.change(input, { target: { files: [bigFile()] } });

    expect(await screen.findByText('حجم الملف يتجاوز 10MB')).toBeTruthy();
  });

  it('deletes a document after confirmation and refreshes', async () => {
    shipping.getVesselDocuments.mockResolvedValue(paged([row()]));
    shipping.deleteVesselDocument.mockResolvedValue({});
    render(<DocumentList />);

    await screen.findByText('Manifest May');
    fireEvent.click(screen.getByRole('button', { name: 'حذف' }));
    fireEvent.click(await screen.findByRole('button', { name: 'تأكيد الحذف' }));

    await waitFor(() => expect(shipping.deleteVesselDocument).toHaveBeenCalledWith('d1'));
    await waitFor(() => expect(toast.notifySuccess).toHaveBeenCalled());
  });

  it('reports the API failure when deletion fails', async () => {
    shipping.getVesselDocuments.mockResolvedValue(paged([row()]));
    shipping.deleteVesselDocument.mockRejectedValue(new Error('boom'));
    render(<DocumentList />);

    await screen.findByText('Manifest May');
    fireEvent.click(screen.getByRole('button', { name: 'حذف' }));
    fireEvent.click(await screen.findByRole('button', { name: 'تأكيد الحذف' }));

    await waitFor(() => expect(toast.notifyError).toHaveBeenCalled());
    expect(toast.notifySuccess).not.toHaveBeenCalled();
  });

  it('requests the filtered page when a document type is selected', async () => {
    shipping.getVesselDocuments.mockResolvedValue(paged([row()]));
    render(<DocumentList />);

    await screen.findByText('Manifest May');
    const typeFilter = screen.getAllByRole('combobox').find((el) => el.textContent === 'النوع');
    fireEvent.mouseDown(typeFilter as HTMLElement);
    fireEvent.click(await screen.findByRole('option', { name: 'قائمة الطاقم' }));

    await waitFor(() =>
      expect(shipping.getVesselDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ document_type: 'CREW_LIST' }),
      ),
    );
  });
});
