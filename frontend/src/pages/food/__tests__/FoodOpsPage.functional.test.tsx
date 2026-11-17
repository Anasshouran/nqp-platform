/**
 * M5-D-ج-2b Phase 1 — functional coverage for FoodOpsPage.
 *
 * Five command sections, their actions, and the API/error paths.
 * Selectors use the real Arabic accessible names restored in PR #211.
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import FoodOpsPage from '../FoodOpsPage';
import authReducer from '../../../store/slices/authSlice';
import * as foodApi from '../../../api/endpoints/food';
import * as usersApi from '../../../api/endpoints/users';
import * as publicApi from '../../../api/endpoints/public';
import * as toast from '../../../utils/toast';
import type { FoodShipment } from '../../../types/food';

vi.mock('../../../api/endpoints/food', () => ({
  getShipments: vi.fn(),
  getSamplingPolicies: vi.fn(),
  getExportForm: vi.fn(),
  getAccountingReport: vi.fn(),
  createShipment: vi.fn(),
  submitShipment: vi.fn(),
  inspectShipment: vi.fn(),
  createSample: vi.fn(),
  assignInspector: vi.fn(),
  toDecision: vi.fn(),
  payInvoice: vi.fn(),
  reviewShipment: vi.fn(),
  decideShipment: vi.fn(),
}));

vi.mock('../../../api/endpoints/users', () => ({ getUsers: vi.fn() }));
vi.mock('../../../api/endpoints/public', () => ({ getPorts: vi.fn() }));

vi.mock('../../../utils/toast', () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  notifyInfo: vi.fn(),
  notifyWarning: vi.fn(),
}));

type ApiMocks = Record<string, ReturnType<typeof vi.fn>>;
const food = foodApi as unknown as ApiMocks;
const users = usersApi as unknown as ApiMocks;
const ports = publicApi as unknown as ApiMocks;
const toasts = toast as unknown as ApiMocks;

const ok = (data: unknown) => Promise.resolve({ data: { data } });

const makeShipment = (id: string, manifest: string, status: string): FoodShipment => ({
  id,
  manifest_number: manifest,
  port: 'PORT-1',
  port_name: 'ميناء اختبار',
  port_type: 'SEA',
  supplier_name: 'مورد اختبار',
  origin_country: 'السودان',
  product_list: [],
  arrival_date: '2026-01-01',
  shipment_type: 'IMPORT',
  status,
  customs_number: '',
  certificate_no: '',
  vessel_name: '',
  clearing_agent: '',
  exporter_name: '',
  message_type: 'COMMERCIAL',
  loading_port: '',
  bill_of_lading: '',
  transport_data: {},
  total_weight_kg: 1200,
  samples_required: 2,
  inspection_required: true,
  submitted_at: null,
  items: [],
  attachments: [],
  fee_preview: { total: 500 } as FoodShipment['fee_preview'],
  assigned_inspector: null,
  assigned_inspector_name: null,
  assigned_at: null,
  recorded_by: null,
  recorded_by_name: null,
  final_decision: '',
  decided_by: null,
  decided_by_name: null,
  decided_at: null,
  decision_reason: '',
  fees_paid: false,
  referred_from: '',
  referral_reference: '',
  referred_by: null,
  referred_by_name: null,
  referred_at: null,
});

const clerkRow = makeShipment('sh-clerk', 'MAN-001', 'DRAFT');
const accountantRow = makeShipment('sh-accountant', 'MAN-002', 'FEES_DUE');
const inspectorRow = makeShipment('sh-inspector', 'MAN-003', 'AWAITING_INSPECTION');
const managerRow = makeShipment('sh-manager', 'MAN-004', 'AWAITING_DECISION');
const exportRow = makeShipment('sh-export', 'MAN-005', 'EXPORT');
exportRow.shipment_type = 'EXPORT';

const shipmentsFor = (params?: Record<string, unknown>): FoodShipment[] => {
  if (params?.shipment_type === 'EXPORT') return [exportRow];
  if (params?.status === 'FEES_DUE') return [accountantRow];
  if (typeof params?.status__in === 'string' && params.status__in.includes('AWAITING_INSPECTION')) return [inspectorRow];
  if (typeof params?.status__in === 'string' && params.status__in.includes('AWAITING_DECISION')) return [managerRow];
  return [clerkRow];
};

const renderPage = () => render(
  <Provider store={configureStore({ reducer: { auth: authReducer } })}>
    <MemoryRouter>
      <FoodOpsPage />
    </MemoryRouter>
  </Provider>,
);

describe('FoodOpsPage — functional', () => {
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
    Element.prototype.scrollIntoView = vi.fn();
    class IO {
      observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
    }
    class RO {
      observe() {} unobserve() {} disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', IO);
    vi.stubGlobal('ResizeObserver', RO);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    food.getShipments.mockImplementation((params?: Record<string, unknown>) => ok({ results: shipmentsFor(params), count: 1 }));
    food.getAccountingReport.mockResolvedValue(ok({ period: 'day', receipts: [], paid_count: 0, pending_count: 1, total_collected: 0 }));
    food.getSamplingPolicies.mockResolvedValue(ok({ results: [] }));
    food.getExportForm.mockResolvedValue(ok({
      shipment: { manifest_number: 'MAN-005', supplier_name: 'مورد اختبار', origin_country: 'السودان' },
      items: [],
      samples: [],
      inspection: null,
      decision: null,
      certificate: null,
    }));
    food.createShipment.mockResolvedValue(ok({ id: 'sh-new' }));
    food.submitShipment.mockResolvedValue(ok({}));
    food.inspectShipment.mockResolvedValue(ok({}));
    food.createSample.mockResolvedValue(ok({}));
    food.payInvoice.mockResolvedValue(ok({}));
    users.getUsers.mockResolvedValue(ok({ results: [{ id: 'insp-1', full_name: 'مفتش اختبار' }] }));
    ports.getPorts.mockResolvedValue(ok([{ id: 'p-1', code: 'PT1', name_ar: 'ميناء اختبار' }]));
  });

  // --- R-F1: sections & navigation ---

  it('renders all five command sections with their rail labels', async () => {
    renderPage();
    expect(document.querySelectorAll('[data-section]')).toHaveLength(5);
    expect(await screen.findByRole('button', { name: 'المفتش' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'الكاتب' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'مدير القسم' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'استمارة الكشف' })).toBeInTheDocument();
  });

  it('scrolls to the selected section from the rail', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'المفتش' }));
    const section = document.querySelector('[data-section="inspector"]');
    expect(section).not.toBeNull();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  // --- R-F1: clerk dialog & creation ---

  it('opens the new-request dialog from the clerk panel', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'طلب وارد جديد' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('تسجيل طلب وارد (الكاتب)');
  });

  it('reports missing required fields without calling the API', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'طلب وارد جديد' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    expect(toasts.notifyError).toHaveBeenCalledWith('أكمل الحقول الأساسية');
    expect(food.createShipment).not.toHaveBeenCalled();
  });

  it('creates a shipment and submits it', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'طلب وارد جديد' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/رقم البيان/), 'MAN-NEW');
    await user.type(within(dialog).getByLabelText(/اسم المورد/), 'مورد جديد');
    await user.click(within(dialog).getByLabelText(/المنفذ/));
    await user.click(await screen.findByRole('option', { name: /ميناء اختبار/ }));
    await user.click(within(dialog).getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(food.createShipment).toHaveBeenCalled());
    expect(food.submitShipment).toHaveBeenCalledWith('sh-new', expect.any(Array));
    expect(toasts.notifySuccess).toHaveBeenCalledWith('تم تسجيل الطلب وإحالته لتحصيل الرسوم');
  });

  // --- R-F1 / R-F4: inspector actions ---

  it('opens the inspection dialog from the inspector table', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'تفتيش' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('التفتيش الميداني');
  });

  it('gates the sampling submit button on a sample type', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'سحب عينة' }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'حفظ' });
    expect(submit).toBeDisabled();
    await user.type(within(dialog).getByLabelText('نوع العينة'), 'MICRO');
    expect(submit).toBeEnabled();
  });

  // --- R-F5: accountant API success / failure ---

  it('collects the fee and reports success', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'تحصيل وإصدار إيصال' }));
    await waitFor(() => expect(food.payInvoice).toHaveBeenCalledWith('sh-accountant', expect.objectContaining({ payment_reference: expect.stringMatching(/^REF-/) })));
    expect(toasts.notifySuccess).toHaveBeenCalled();
  });

  it('reports a failed fee collection', async () => {
    food.payInvoice.mockRejectedValue(new Error('payment down'));
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'تحصيل وإصدار إيصال' }));
    await waitFor(() => expect(toasts.notifyError).toHaveBeenCalled());
  });

  // --- R-F1: export form dialog ---

  it('loads and opens the export inspection form', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'عرض الاستمارة' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('استمارة كشف الموارد الغذائية الصادرة');
    expect(food.getExportForm).toHaveBeenCalledWith('sh-export');
  });
});
