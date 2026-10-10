import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ScreeningForm from './ScreeningForm';
import { getTravelers } from '../../api/endpoints/travelers';
import { getMasterEntryPoints } from '../../api/endpoints/masterdata';
import { createScreening } from '../../api/endpoints/screening';

vi.mock('../../api/endpoints/travelers', () => ({ getTravelers: vi.fn() }));
vi.mock('../../api/endpoints/masterdata', () => ({ getMasterEntryPoints: vi.fn() }));
vi.mock('../../api/endpoints/screening', () => ({ createScreening: vi.fn() }));
vi.mock('../../utils/toast', () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  extractErrorMessage: (_: unknown, fallback: string) => fallback,
}));

const traveler = { id: 't1', full_name: 'أحمد النور', passport_number: 'P100' };
const port = { id: 'p1', name_ar: 'مطار الخرطوم' };
const assessment = {
  id: 'a1',
  screening: 's1',
  risk_level: 'RED',
  risk_score: 42,
  recommendation: 'QUARANTINE',
  decision_factors: {},
  assessed_at: '2026-10-03T08:00:00Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTravelers).mockResolvedValue({
    data: { data: { count: 1, results: [traveler] } },
  } as never);
  vi.mocked(getMasterEntryPoints).mockResolvedValue({
    data: { data: { count: 1, results: [port] } },
  } as never);
});

const setup = () => {
  const onSaved = vi.fn();
  const utils = render(<ScreeningForm open onClose={() => {}} onSaved={onSaved} />);
  return { onSaved, ...utils };
};

describe('ScreeningForm — تسجيل الفحص الصحي', () => {
  it('يعرض النموذج مع الحقول الأساسية', async () => {
    setup();
    await waitFor(() => expect(getMasterEntryPoints).toHaveBeenCalled());
    expect(screen.getByText('تسجيل فحص صحي')).toBeTruthy();
    expect(screen.getByText('درجة الحرارة (°C)')).toBeTruthy();
    expect(screen.getByText('تشبع الأكسجين (%)')).toBeTruthy();
  });

  it('يمنع الإرسال دون اختيار مسافر ومنفذ (تحقق إلزامي)', async () => {
    setup();
    await waitFor(() => expect(getMasterEntryPoints).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'حفظ الفحص' }));
    expect(await screen.findByText('اختر المسافر')).toBeTruthy();
    expect(createScreening).not.toHaveBeenCalled();
  });

  it('يحدّث تقييم المخاطر وينشئ الفحص عند النجاح', async () => {
    vi.mocked(createScreening).mockResolvedValue({
      data: { data: { screening_id: 's-new', risk_assessment: assessment } },
    } as never);
    const { onSaved } = setup();
    await waitFor(() => expect(getMasterEntryPoints).toHaveBeenCalled());

    const dialog = screen.getByRole('dialog');
    const travelerCombo = within(dialog).getAllByRole('combobox')[0];
    fireEvent.focus(travelerCombo);
    fireEvent.change(travelerCombo, { target: { value: 'أحمد' } });
    await waitFor(() => expect(getTravelers).toHaveBeenCalled());
    fireEvent.click(await screen.findByText('أحمد النور — P100'));

    const portCombo = within(screen.getByRole('dialog')).getAllByRole('combobox')[1];
    fireEvent.mouseDown(portCombo);
    fireEvent.click(await screen.findByText('مطار الخرطوم'));

    fireEvent.click(screen.getByRole('button', { name: 'حفظ الفحص' }));

    await waitFor(() => expect(createScreening).toHaveBeenCalledWith(
      expect.objectContaining({ traveler: 't1', port: 'p1' }),
    ));
    // تقييم الخادم يظهر مع المستوى والتوصية
    expect(await screen.findByText('أحمر')).toBeTruthy();
    expect(screen.getByText('حجر صحي')).toBeTruthy();
    expect(onSaved).toHaveBeenCalledWith('s-new');
  });

  it('يعرض خطأ الخادم عند فشل الحفظ', async () => {
    vi.mocked(createScreening).mockRejectedValue(new Error('boom'));
    setup();
    await waitFor(() => expect(getMasterEntryPoints).toHaveBeenCalled());

    const dialog = screen.getByRole('dialog');
    const travelerCombo = within(dialog).getAllByRole('combobox')[0];
    fireEvent.focus(travelerCombo);
    fireEvent.change(travelerCombo, { target: { value: 'أحمد' } });
    await waitFor(() => expect(getTravelers).toHaveBeenCalled());
    fireEvent.click(await screen.findByText('أحمد النور — P100'));

    const portCombo = within(screen.getByRole('dialog')).getAllByRole('combobox')[1];
    fireEvent.mouseDown(portCombo);
    fireEvent.click(await screen.findByText('مطار الخرطوم'));

    fireEvent.click(screen.getByRole('button', { name: 'حفظ الفحص' }));
    expect(await screen.findByText(/تعذر حفظ الفحص الصحي/)).toBeTruthy();
  });
});