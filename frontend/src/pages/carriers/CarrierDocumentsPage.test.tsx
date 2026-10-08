import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteCarrierDocument,
  downloadCarrierDocument,
  getCarrierDocuments,
  uploadCarrierDocument,
} from '../../api/endpoints/carriers';

const CarrierDocumentsPage = (await import('./CarrierDocumentsPage')).default;

vi.mock('../../api/endpoints/carriers', () => ({
  getCarrierDocuments: vi.fn(),
  uploadCarrierDocument: vi.fn(),
  downloadCarrierDocument: vi.fn(),
  deleteCarrierDocument: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CarrierDocumentsPage', () => {
  it('يعرض المستندات ويعرض حالة التحميل', () => {
    vi.mocked(getCarrierDocuments).mockReturnValue(new Promise(() => {}) as never);
    render(<CarrierDocumentsPage />);
    expect(screen.getByRole('progressbar')).toBeTruthy();
  });

  it('يعرض قائمة المستندات بعد النجاح', async () => {
    vi.mocked(getCarrierDocuments).mockResolvedValue({
      data: {
        data: {
          count: 1,
          results: [{
            id: 'd1',
            document_type: 'FLIGHT_DOCUMENT',
            document_type_label: 'مستند رحلة',
            title: 'رحلة 123',
            file_size: 1024,
            created_at: '2026-10-03T08:00:00Z',
          }],
        },
      },
    } as never);

    render(<CarrierDocumentsPage />);

    await waitFor(() => expect(getCarrierDocuments).toHaveBeenCalled());
    expect(await screen.findByText('رحلة 123')).toBeTruthy();
    expect(screen.getByText(/مستند رحلة/)).toBeTruthy();
  });

  it('يعرض حالة عدم وجود مستندات', async () => {
    vi.mocked(getCarrierDocuments).mockResolvedValue({ data: { data: { count: 0, results: [] } } } as never);

    render(<CarrierDocumentsPage />);

    expect(await screen.findByText('لا توجد مستندات')).toBeTruthy();
  });

  it('يعرض رسالة خطأ عند فشل التحميل', async () => {
    vi.mocked(getCarrierDocuments).mockRejectedValue(new Error('boom') as never);

    render(<CarrierDocumentsPage />);

    expect(await screen.findByText('تعذر تحميل المستندات')).toBeTruthy();
  });

  it('يتطلب تأكيداً صريحاً قبل حذف المستند', async () => {
    vi.mocked(getCarrierDocuments).mockResolvedValue({
      data: {
        data: {
          count: 1,
          results: [{
            id: 'd1',
            document_type: 'FLIGHT_DOCUMENT',
            document_type_label: 'مستند رحلة',
            title: 'رحلة 123',
            file_size: 1024,
            created_at: '2026-10-03T08:00:00Z',
          }],
        },
      },
    } as never);
    vi.mocked(deleteCarrierDocument).mockResolvedValue({} as never);

    render(<CarrierDocumentsPage />);
    await screen.findByText('رحلة 123');

    fireEvent.click(screen.getByRole('button', { name: 'حذف' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('حذف المستند')).toBeTruthy();
    expect(within(dialog).getByText(/رحلة 123/)).toBeTruthy();
    expect(deleteCarrierDocument).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'إلغاء' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(deleteCarrierDocument).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'حذف' }));
    const reopened = await screen.findByRole('dialog');
    fireEvent.click(within(reopened).getByRole('button', { name: 'حذف' }));

    await waitFor(() => expect(deleteCarrierDocument).toHaveBeenCalledWith('d1'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
