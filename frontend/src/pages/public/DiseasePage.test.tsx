import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PublicDisease } from '../../api/endpoints/public';

const useApi = vi.fn();
const retry = vi.fn();

vi.mock('../../hooks/useApi', () => ({
  useApi: (...args: unknown[]) => useApi(...args),
}));

const DiseasePage = (await import('./DiseasePage')).default;

const base: PublicDisease = {
  id: 'd1',
  icd_11_code: '1A00',
  name_ar: 'الكوليرا',
  name_en: 'Cholera',
  symptoms: ['إسهال مائي حاد', 'قيء'],
  incubation_period_min: 1,
  incubation_period_max: 5,
  transmission_methods: ['ماء ملوث', 'أغذية ملوثة'],
  ihr_category: 'SURVEILLANCE_ONLY',
};

const respond = (diseases: PublicDisease[], total = diseases.length) =>
  useApi.mockReturnValue({
    data: { count: total, next: null, previous: null, results: diseases },
    loading: false,
    error: null,
    retry,
  });

describe('DiseasePage', () => {
  beforeEach(() => {
    useApi.mockReset();
    retry.mockReset();
  });

  it('does not render an empty description paragraph', () => {
    respond([{ ...base, description: '' }]);
    const { container } = render(<DiseasePage />);

    const paragraphs = [...container.querySelectorAll('p')].map((el) => (el.textContent ?? '').trim());
    expect(paragraphs.filter((t) => t.length === 0)).toEqual([]);
    expect(screen.getByText('Cholera')).toBeTruthy();
  });

  it('treats a whitespace-only description as absent', () => {
    respond([{ ...base, description: '   ' }]);
    const { container } = render(<DiseasePage />);

    const paragraphs = [...container.querySelectorAll('p')].map((el) => (el.textContent ?? '').trim());
    expect(paragraphs.filter((t) => t.length === 0)).toEqual([]);
    expect(paragraphs).toContain('Cholera');
  });

  it('renders the description when present', () => {
    respond([{ ...base, description: 'مرض بكتيري معوي حاد' }]);
    render(<DiseasePage />);

    expect(screen.getByText('مرض بكتيري معوي حاد')).toBeTruthy();
  });

  it('renders transmission methods with the backend label', () => {
    respond([base]);
    render(<DiseasePage />);

    expect(screen.getByText('طرق الانتقال')).toBeTruthy();
    for (const method of base.transmission_methods!) {
      expect(screen.getByText(method)).toBeTruthy();
    }
  });

  it('renders both detail groups when present', () => {
    respond([base]);
    render(<DiseasePage />);

    expect(screen.getByText('الأعراض الرئيسية')).toBeTruthy();
    expect(screen.getByText('طرق الانتقال')).toBeTruthy();
    expect(screen.getAllByRole('separator').length).toBeGreaterThanOrEqual(2);
  });

  it('omits the transmission group when the API returns an empty list', () => {
    respond([{ ...base, transmission_methods: [] }]);
    render(<DiseasePage />);

    expect(screen.queryByText('طرق الانتقال')).toBeNull();
    expect(screen.getByText('الأعراض الرئيسية')).toBeTruthy();
  });

  it('omits the transmission group when the field is absent', () => {
    const without: PublicDisease = {
      id: base.id,
      icd_11_code: base.icd_11_code,
      name_ar: base.name_ar,
      name_en: base.name_en,
      symptoms: base.symptoms,
      ihr_category: base.ihr_category,
    };
    respond([without]);
    render(<DiseasePage />);

    expect(screen.queryByText('طرق الانتقال')).toBeNull();
  });

  it('translates every ihr_category instead of leaking the raw enum', () => {
    respond([{ ...base, ihr_category: 'PHEIC' }]);
    render(<DiseasePage />);

    expect(screen.getByText('طوارئ صحية عامة')).toBeTruthy();
    expect(screen.queryByText('PHEIC')).toBeNull();
  });

  it('renders the English name inside an LTR lang=en wrapper', () => {
    respond([base]);
    const { container } = render(<DiseasePage />);

    const en = container.querySelector('[lang="en"]');
    expect(en).not.toBeNull();
    expect(en?.getAttribute('dir')).toBe('ltr');
    expect(within(en as HTMLElement).getByText('Cholera')).toBeTruthy();
  });

  it('shows the search-specific empty state when a query returns nothing', () => {
    respond([], 0);
    render(<DiseasePage />);

    expect(screen.getByText('لا توجد أمراض مسجلة')).toBeTruthy();
  });

  it('refetches with the debounced query after typing', async () => {
    vi.useFakeTimers();
    try {
      respond([base]);
      render(<DiseasePage />);

      const input = screen.getByLabelText('ابحث عن مرض');
      fireEvent.change(input, { target: { value: 'كوليرا' } });

      // Debounce window has not elapsed yet.
      expect(retry).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      expect(retry).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders a pagination control when there is more than one page', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      ...base,
      id: `d${i}`,
      icd_11_code: `C${i}`,
    }));
    respond(many, 45);
    render(<DiseasePage />);

    const nav = screen.getByRole('navigation', { name: 'التنقل بين صفحات الأمراض' });
    expect(within(nav).getByText('1')).toBeTruthy();
    expect(within(nav).getByText('2')).toBeTruthy();
    expect(within(nav).getByText('3')).toBeTruthy();
  });

  it('hides pagination when everything fits on one page', () => {
    respond([base], 1);
    render(<DiseasePage />);

    expect(screen.queryByRole('navigation', { name: 'التنقل بين صفحات الأمراض' })).toBeNull();
  });
});
