/**
 * DocumentList — render / empty / search / filter / detail (read-only).
 * Mocks the typed carriers API module.
 */
import { fireEvent, render, screen } from '@testing-library/react';
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
});