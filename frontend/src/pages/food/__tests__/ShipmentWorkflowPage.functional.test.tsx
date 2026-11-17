/**
 * M5-D-ج-2b Phase 1 — functional coverage for ShipmentWorkflowPage.
 *
 * Action buttons, dialogs and validation after the PR #211 selector fix.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ShipmentWorkflowPage from '../ShipmentWorkflowPage';
import * as foodApi from '../../../api/endpoints/food';
import * as usersApi from '../../../api/endpoints/users';
import * as toast from '../../../utils/toast';
import type { FoodShipment } from '../../../types/food';

vi.mock('../../../api/endpoints/food', () => ({
  getShipments: vi.fn(),
  createInvoice: vi.fn(),
  payInvoice: vi.fn(),
  assignInspector: vi.fn(),
  decideShipment: vi.fn(),
  referShipment: vi.fn(),
}));

vi.mock('../../../api/endpoints/users', () => ({ getUsers: vi.fn() }));

vi.mock('../../../utils/toast', () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  notifyInfo: vi.fn(),
  notifyWarning: vi.fn(),
}));

type ApiMocks = Record<string, ReturnType<typeof vi.fn>>;
const food = foodApi as unknown as ApiMocks;
const users = usersApi as unknown as ApiMocks;
const toasts = toast as unknown as ApiMocks;

const ok = (data: unknown) => Promise.resolve({ data: { data } });

const shipment = {
  id: 'sh-workflow',
  manifest_number: 'MAN-WF-001',
  supplier_name: 'مورد اختبار',
  origin_country: 'السودان',
  status: 'AWAITING_DECISION',
  shipment_type: 'IMPORT',
  port: 'PORT-1',
  port_name: 'ميناء اختبار',
  port_type: 'SEA',
  final_decision: '',
  fees_paid: false,
  referred_from: '',
  referral_reference: '',
  assigned_inspector_name: null,
  assigned_at: null,
  recorded_by_name: null,
  decision_reason: '',
  arrival_date: '2026-01-01',
  total_weight_kg: 800,
  samples_required: 1,
  items: [],
  fee_preview: { total: 300 },
} as unknown as FoodShipment;

const renderPage = () => render(
  <MemoryRouter initialEntries={['/sh-workflow']}>
    <Routes>
      <Route path="/:id" element={<ShipmentWorkflowPage />} />
    </Routes>
  </MemoryRouter>,
);

describe('ShipmentWorkflowPage — functional', () => {
  beforeAll(() => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('min-width'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    food.getShipments.mockResolvedValue(ok({ results: [shipment], count: 1 }));
    users.getUsers.mockResolvedValue(ok({ results: [{ id: 'insp-1', full_name: 'مفتش اختبار' }] }));
    food.createInvoice.mockResolvedValue(ok({}));
    food.payInvoice.mockResolvedValue(ok({ receipt_number: 'RCP-1', data: { data: {} } }));
    food.assignInspector.mockResolvedValue(ok({}));
    food.decideShipment.mockResolvedValue(ok({}));
    food.referShipment.mockResolvedValue(ok({}));
  });

  it('renders the shipment details and all action buttons', async () => {
    renderPage();
    expect((await screen.findAllByText('MAN-WF-001')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'العودة إلى الشحنات' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أصدار الفاتورة' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تسجيل الدفع' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تعيين المفتش' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'القرار النهائي' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إحالة من معبر' })).toBeInTheDocument();
    expect(screen.getByText('بيانات الشحنة')).toBeInTheDocument();
  });

  it('keeps the loading message when no shipment matches the route id', async () => {
    food.getShipments.mockResolvedValue(ok({ results: [], count: 0 }));
    renderPage();
    await waitFor(() => expect(food.getShipments).toHaveBeenCalledWith({ search: '', page_size: 100 }));
    expect(screen.getByText('جاري تحميل الشحنة...')).toBeInTheDocument();
  });

  it('requires at least one invoice item before creating an invoice', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'أصدار الفاتورة' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('إصدار الفاتورة');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(toasts.notifyError).toHaveBeenCalledWith('أضف بنداً واحداً على الأقل');
    expect(food.createInvoice).not.toHaveBeenCalled();
  });

  it('creates an invoice from a filled line item', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'أصدار الفاتورة' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('بند الخدمة'), 'رسوم كشف');
    await user.type(within(dialog).getByLabelText('المبلغ'), '250');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => {
      expect(food.createInvoice).toHaveBeenCalledWith('sh-workflow', [{ name: 'رسوم كشف', amount: 250 }]);
    });
    expect(toasts.notifySuccess).toHaveBeenCalled();
  });

  it('gates inspector assignment on a selected inspector', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'تعيين المفتش' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('تعيين مفتش');
    const submit = within(dialog).getByRole('button', { name: 'حفظ' });
    expect(submit).toBeDisabled();
    await user.click(within(dialog).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'مفتش اختبار' }));
    expect(submit).toBeEnabled();
    await user.click(submit);
    await waitFor(() => expect(food.assignInspector).toHaveBeenCalledWith('sh-workflow', 'insp-1'));
  });

  it('reports a failed payment', async () => {
    food.payInvoice.mockRejectedValue(new Error('pay down'));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'تسجيل الدفع' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('تسجيل الدفع');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(toasts.notifyError).toHaveBeenCalledWith('تعذر تسجيل الدفع'));
  });
});
