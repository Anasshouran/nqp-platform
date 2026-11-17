import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../i18n';
import arLocale from '../../i18n/locales/ar.json';
import enLocale from '../../i18n/locales/en.json';
import ReportsByStatePage from './ReportsByStatePage';

i18n.addResourceBundle('ar', 'translation', arLocale, true, true);
i18n.addResourceBundle('en', 'translation', enLocale, true, true);

const { getByStateMock } = vi.hoisted(() => ({ getByStateMock: vi.fn() }));

vi.mock('../../api/endpoints/surveillance', () => ({
  getSurveillanceByState: (...args: unknown[]) => getByStateMock(...args),
}));

const REPORT = {
  total: 50,
  matched: 40,
  node_no_state: 0,
  unassigned_node: 5,
  unassigned_facility: 5,
  by_state: [
    { state_id: '1', state_code: 'KRT', state_name_ar: 'الخرطوم', state_name_en: 'Khartoum', count: 28 },
    { state_id: '2', state_code: 'RS', state_name_ar: 'البحر الأحمر', state_name_en: 'Red Sea', count: 12 },
  ],
  scoped: false,
  reconciliation_ok: true,
  note: '',
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <ReportsByStatePage />
    </MemoryRouter>,
  );

describe('ReportsByStatePage — M7-A2b-lite', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('ar');
  });

  beforeEach(() => {
    getByStateMock.mockReset();
    getByStateMock.mockResolvedValue({ data: { status: 'success', data: REPORT } });
  });

  it('يعرض شريط المصالحة وصفوف الولايات وصفوف «غير معيَّن»', async () => {
    renderPage();

    expect(await screen.findByText('الخرطوم')).toBeInTheDocument();
    expect(screen.getByText('البحر الأحمر')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();

    // المصالحة: المجموع والفئات الثلاث
    expect(screen.getByText(/الإجمالي: 50/)).toBeInTheDocument();
    expect(screen.getByText(/مطابق: 40/)).toBeInTheDocument();
    expect(screen.getByText(/غير معيَّن \(عقدة\): 5/)).toBeInTheDocument();
    expect(screen.getByText(/غير معيَّن \(منشأة\): 5/)).toBeInTheDocument();
    expect(screen.getByText('المصالحة سليمة')).toBeInTheDocument();
  });

  it('زر التحديث يعيد جلب التقرير', async () => {
    renderPage();
    await screen.findByText('الخرطوم');
    expect(getByStateMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /تحديث/ }));

    await waitFor(() => expect(getByStateMock).toHaveBeenCalledTimes(2));
  });

  it('يعرض رسالة خطأ عند فشل الجلب', async () => {
    getByStateMock.mockRejectedValueOnce(new Error('boom'));
    renderPage();

    expect(await screen.findByText('تعذّر تحميل التقرير')).toBeInTheDocument();
  });
});
