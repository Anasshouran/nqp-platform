/**
 * DocumentList — render / empty / search / filter / detail (read-only).
 * Mocks the typed carriers API module.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const carriers = vi.hoisted(() => ({ getCarrierDocuments: vi.fn() }));
vi.mock('../../../api/endpoints/carriers', () => carriers);

import { DocumentList } from '../components/DocumentList';

const paged = (results: unknown[], count = results.length) => ({
  data: { data: { results, count, next: null, previous: null } },
});

const base = {
  id: 'd1',
  carrier: 'AA',
  carrier_name: 'Alpha Air',
  flight: 'f1',
  flight_number: 'AA123',
  document_type: 'HEALTH_DOCUMENT',
  document_type_label: 'مستند صحي',
  title: 'تقرير صحي',
  file: 'http://example.test/health.pdf',
  original_filename: 'health.pdf',
  mime_type: 'application/pdf',
  file_size: 2048,
  uploaded_by: null,
  created_at: '2026-10-14T10:00:00Z',
  updated_at: '2026-10-14T10:00:00Z',
};

const row = (over: Partial<typeof base> = {}) => ({ ...base, ...over });

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
  carriers.getCarrierDocuments.mockResolvedValue(paged([]));
});

describe('DocumentList', () => {
  it('shows a loading skeleton initially', () => {
    carriers.getCarrierDocuments.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<DocumentList />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders rows from the API', async () => {
    carriers.getCarrierDocuments.mockResolvedValue(paged([row()]));
    render(<DocumentList />);

    expect(await screen.findByText('تقرير صحي')).toBeTruthy();
    expect(screen.getByText('مستند صحي')).toBeTruthy();
    expect(screen.getByText('Alpha Air')).toBeTruthy();
  });

  it('shows the empty state when there are no rows', async () => {
    carriers.getCarrierDocuments.mockResolvedValue(paged([]));
    render(<DocumentList />);

    expect(await screen.findByText('لا توجد مستندات')).toBeTruthy();
  });

  it('updates searchInput when searching (controlled)', async () => {
    carriers.getCarrierDocuments.mockResolvedValue(paged([]));
    render(<DocumentList />);

    const search = await screen.findByPlaceholderText('ابحث بالعنوان أو الشركة أو رقم الرحلة...');
    fireEvent.change(search, { target: { value: 'health' } });
    expect((search as HTMLInputElement).value).toBe('health');
  });

  it('applies document_type filter (changes value)', async () => {
    carriers.getCarrierDocuments.mockResolvedValue(paged([]));
    render(<DocumentList />);

    const combo = (await screen.findAllByRole('combobox'))[0];
    fireEvent.mouseDown(combo);
    const license = await screen.findByRole('option', { name: 'رخصة' });
    fireEvent.click(license);

    expect(screen.getAllByText('رخصة').length).toBeGreaterThan(0);
  });

  it('opens the detail dialog on row click', async () => {
    carriers.getCarrierDocuments.mockResolvedValue(paged([row()]));
    render(<DocumentList />);

    await screen.findByText('تقرير صحي');
    fireEvent.click(screen.getByRole('button', { name: 'عرض' }));

    expect(await screen.findByText('تفاصيل المستند')).toBeTruthy();
    expect(screen.getByText('application/pdf')).toBeTruthy();
    expect(screen.getAllByText('health.pdf').length).toBeGreaterThan(0);
  });

  it('requests the filtered page when a document type is selected', async () => {
    carriers.getCarrierDocuments.mockResolvedValue(paged([]));
    render(<DocumentList />);

    const typeFilter = (await screen.findAllByRole('combobox')).find(
      (el) => el.textContent === 'النوع',
    );
    fireEvent.mouseDown(typeFilter as HTMLElement);
    fireEvent.click(await screen.findByRole('option', { name: 'رخصة' }));

    await waitFor(() =>
      expect(carriers.getCarrierDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ document_type: 'LICENSE' }),
      ),
    );
  });

  it('sends a debounced search request', async () => {
    carriers.getCarrierDocuments.mockResolvedValue(paged([]));
    render(<DocumentList />);

    const search = await screen.findByPlaceholderText('ابحث بالعنوان أو الشركة أو رقم الرحلة...');
    fireEvent.change(search, { target: { value: 'health' } });

    await waitFor(() =>
      expect(carriers.getCarrierDocuments).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'health' }),
      ),
    );
  });

  it('refetches on refresh', async () => {
    carriers.getCarrierDocuments.mockResolvedValue(paged([]));
    render(<DocumentList />);

    await screen.findByText('لا توجد مستندات');
    fireEvent.click(screen.getByRole('button', { name: 'تحديث' }));

    await waitFor(() => expect(carriers.getCarrierDocuments).toHaveBeenCalledTimes(2));
  });

  it('renders file sizes in human-readable units', async () => {
    carriers.getCarrierDocuments.mockResolvedValue(
      paged([
        row({ id: 'd1', title: 'بايت', file_size: 500 }),
        row({ id: 'd2', title: 'كيلوبايت', file_size: 2048 }),
        row({ id: 'd3', title: 'ميجابايت', file_size: 3 * 1024 * 1024 }),
      ]),
    );
    render(<DocumentList />);

    expect(await screen.findByText('500 B')).toBeTruthy();
    expect(screen.getByText('2.0 KB')).toBeTruthy();
    expect(screen.getByText('3.0 MB')).toBeTruthy();
  });

  it('falls back to the original filename when the title is missing', async () => {
    carriers.getCarrierDocuments.mockResolvedValue(paged([row({ title: '', original_filename: 'doc.pdf' })]));
    render(<DocumentList />);

    await waitFor(() => expect(screen.getAllByText('doc.pdf').length).toBeGreaterThan(0));
  });

  it('falls back to the mapped then raw document type label', async () => {
    carriers.getCarrierDocuments.mockResolvedValue(
      paged([
        row({ id: 'd1', title: 'أول مستند', document_type: 'LICENSE', document_type_label: '' }),
        row({ id: 'd2', title: 'غريب', document_type: 'ZZZ', document_type_label: '' }),
      ]),
    );
    render(<DocumentList />);

    expect(await screen.findByText('رخصة')).toBeTruthy();
    expect(screen.getByText('ZZZ')).toBeTruthy();
  });

  it('renders — placeholders for missing optional fields and invalid dates', async () => {
    carriers.getCarrierDocuments.mockResolvedValue(
      paged([row({ carrier_name: '', flight_number: '', file_size: 0, created_at: 'not-a-date' })]),
    );
    render(<DocumentList />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
  });

  it('shows full document details and closes the dialog', async () => {
    carriers.getCarrierDocuments.mockResolvedValue(paged([row()]));
    render(<DocumentList />);

    await screen.findByText('تقرير صحي');
    fireEvent.click(screen.getByRole('button', { name: 'عرض' }));

    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('AA123')).toBeTruthy();
    expect(dialog.getByText('مستند صحي')).toBeTruthy();
    expect(dialog.getByText('2.0 KB')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    await waitFor(() => expect(screen.queryByText('تفاصيل المستند')).toBeNull());
  });
});