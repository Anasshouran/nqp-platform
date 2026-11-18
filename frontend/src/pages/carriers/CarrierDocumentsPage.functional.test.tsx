import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteCarrierDocument, downloadCarrierDocument,
  getCarrierDocuments, uploadCarrierDocument,
} from '../../api/endpoints/carriers';
import * as toast from '../../utils/toast';

vi.mock('../../api/endpoints/carriers', () => ({
  getCarrierDocuments: vi.fn(), uploadCarrierDocument: vi.fn(),
  deleteCarrierDocument: vi.fn(), downloadCarrierDocument: vi.fn(),
}));
vi.mock('../../utils/toast', () => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));

const CarrierDocumentsPage = (await import('./CarrierDocumentsPage')).default;

const doc = {
  id: 'd-1', title: 'مستند اختبار', original_filename: 'a.pdf',
  document_type: 'OTHER', file_size: 1024,
  created_at: '2026-01-01T00:00:00Z',
};

const mockList = (arr: any[]) => {
  const a: any = [...arr];
  a.data = a; a.results = a; a.items = a;
  a.count = arr.length; a.total = arr.length;
  a.meta = { total: arr.length, count: arr.length };
  return { data: a, status: 200 };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCarrierDocuments).mockResolvedValue(mockList([doc]) as any);
});

describe('CarrierDocumentsPage', () => {
  it('renders documents list', async () => {
    render(<CarrierDocumentsPage />);
    await waitFor(() => expect(getCarrierDocuments).toHaveBeenCalled());
    expect(await screen.findByText(/مستند اختبار/)).toBeInTheDocument();
  });

  it('reloads with filter when type changes', async () => {
    render(<CarrierDocumentsPage />);
    await screen.findByText(/مستند اختبار/);

    const filter = screen.getByLabelText(/تصفية النوع/);
    fireEvent.mouseDown(filter);

    // الاسم بالضبط لتجنب تطابق "مستند طائرة" و"مستند رحلة" و"مستند كشف"...
    const option = await screen.findByRole('option', { name: 'رخصة' });
    fireEvent.click(option);

    await waitFor(() => {
      expect(getCarrierDocuments).toHaveBeenLastCalledWith(
        expect.objectContaining({ document_type: 'LICENSE' }),
      );
    });
  });

  it('triggers download', async () => {
    vi.mocked(downloadCarrierDocument).mockResolvedValue({ data: new Blob() } as any);
    render(<CarrierDocumentsPage />);
    await screen.findByText(/مستند اختبار/);
    fireEvent.click(screen.getByRole('button', { name: 'تنزيل' }));
    await waitFor(() => expect(downloadCarrierDocument).toHaveBeenCalledWith('d-1'));
  });

  it('asks confirmation before delete', async () => {
    vi.mocked(deleteCarrierDocument).mockResolvedValue({ data: {} } as any);
    render(<CarrierDocumentsPage />);
    await screen.findByText(/مستند اختبار/);
    fireEvent.click(screen.getByRole('button', { name: 'حذف' }));
    const confirm = await screen.findByRole('button', { name: /تأكيد|نعم|حذف/i });
    fireEvent.click(confirm);
    await waitFor(() => expect(deleteCarrierDocument).toHaveBeenCalledWith('d-1'));
  });

  it('calls uploadCarrierDocument on file select + submit', async () => {
    vi.mocked(uploadCarrierDocument).mockResolvedValue({ data: mockList([doc]) } as any);
    render(<CarrierDocumentsPage />);
    await screen.findByText(/مستند اختبار/);

    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    fireEvent.change(fileInput, { target: { files: [file] } });

    const titleInput = document.querySelector('input[type="text"]') as HTMLInputElement | null;
    if (titleInput && !titleInput.value) {
      fireEvent.change(titleInput, { target: { value: 'مستند جديد' } });
    }

    fireEvent.click(await screen.findByRole('button', { name: /^رفع$/ }));
    await waitFor(() => expect(uploadCarrierDocument).toHaveBeenCalled());
  });
});
