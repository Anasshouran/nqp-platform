import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAlerts,
  getKillSwitchStatus,
  createAlert,
  closeAlert,
} from '../../api/endpoints/emergency';
import { getMasterEntryPoints } from '../../api/endpoints/masterdata';
import { useAuth } from '../../hooks/useAuth';
import { notifySuccess } from '../../utils/toast';

vi.mock('../../api/endpoints/emergency', () => ({
  getAlerts: vi.fn(),
  getKillSwitchStatus: vi.fn(),
  createAlert: vi.fn(),
  closeAlert: vi.fn(),
}));

vi.mock('../../api/endpoints/masterdata', () => ({ getMasterEntryPoints: vi.fn() }));

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }));

vi.mock('../../utils/toast', async () => {
  const actual = await vi.importActual<typeof import('../../utils/toast')>('../../utils/toast');
  return { ...actual, notifySuccess: vi.fn(), notifyError: vi.fn() };
});

const EmergencyPage = (await import('./EmergencyPage')).default;

const alert = (over: Record<string, unknown> = {}) => ({
  id: 'a-1',
  traveler: null,
  port: null,
  alert_type: 'RED_ALERT',
  description: 'تفشي محتمل في المعبر',
  location_geo: null,
  status: 'NEW',
  triggered_at: '2026-09-01T10:00:00Z',
  resolved_at: null,
  ...over,
});

const listOk = (results: unknown[]) => ({
  data: { status: 'success', data: { count: results.length, next: null, previous: null, results } },
});

const grant = (perms: string[]) =>
  vi.mocked(useAuth).mockReturnValue({
    user: {
      id: 'u-1',
      email: 'eoc@nqp.sd',
      full_name: 'عامل غرفة العمليات',
      role: 'POE_MANAGER',
      permissions: perms,
      role_assignments: [],
    },
  } as never);

const grantFull = () => grant(['surveillance:view', 'surveillance:add', 'surveillance:edit']);
const grantViewer = () => grant(['surveillance:view']);

const renderPage = () =>
  render(
    <MemoryRouter>
      <EmergencyPage />
    </MemoryRouter>,
  );

const selectOption = (combobox: HTMLElement, name: string | RegExp) => {
  fireEvent.mouseDown(combobox);
  fireEvent.click(screen.getByRole('option', { name }));
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getKillSwitchStatus).mockResolvedValue({
    data: { status: 'success', data: { active: false, switch: null } },
  } as never);
  vi.mocked(getMasterEntryPoints).mockResolvedValue({
    data: {
      status: 'success',
      data: { count: 1, results: [{ id: 'p-1', code: 'SUD', name_ar: 'بورتسودان' }] },
    },
  } as never);
});

describe('EmergencyPage — regression (read-only list)', () => {
  it('renders alerts, status chips and filters from the list contract', async () => {
    grantFull();
    vi.mocked(getAlerts).mockResolvedValue(listOk([alert()]) as never);
    renderPage();
    await screen.findByText('تفشي محتمل في المعبر');
    expect(screen.getByText('جديد')).toBeTruthy();
    expect(screen.getByText('إنذار أحمر')).toBeTruthy();
    expect(screen.getByText('الإنذارات')).toBeTruthy();
  });
});

describe('EmergencyPage — Create (surveillance:add)', () => {
  it('shows the Create button to an authorized user', async () => {
    grantFull();
    vi.mocked(getAlerts).mockResolvedValue(listOk([]) as never);
    renderPage();
    await screen.findByText('لا توجد إنذارات');
    expect(screen.getByRole('button', { name: 'إنذار جديد' })).toBeTruthy();
  });

  it('hides the Create button from a user without surveillance:add', async () => {
    grantViewer();
    vi.mocked(getAlerts).mockResolvedValue(listOk([alert()]) as never);
    renderPage();
    await screen.findByText('تفشي محتمل في المعبر');
    expect(screen.queryByRole('button', { name: 'إنذار جديد' })).toBeNull();
  });

  it('validates: submit is disabled until alert_type is chosen and no request is sent', async () => {
    grantFull();
    vi.mocked(getAlerts).mockResolvedValue(listOk([]) as never);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'إنذار جديد' }));
    const dialog = await screen.findByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'إنشاء الإنذار' });
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(submit as HTMLButtonElement);
    expect(createAlert).not.toHaveBeenCalled();
  });

  it('posts the exact backend contract on success, then closes and revalidates', async () => {
    grantFull();
    let calls = 0;
    vi.mocked(getAlerts).mockImplementation(() => {
      calls += 1;
      return Promise.resolve(listOk([])) as never;
    });
    vi.mocked(createAlert).mockResolvedValue({
      data: { status: 'success', data: alert({ id: 'a-9' }) },
    } as never);

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'إنذار جديد' }));
    const dialog = await screen.findByRole('dialog');
    const combos = within(dialog).getAllByRole('combobox');
    selectOption(combos[0], 'إنذار أحمر');
    fireEvent.change(within(dialog).getByRole('textbox'), {
      target: { value: 'اشتباه عينات مختبرية' },
    });
    selectOption(combos[1], /بورتسودان/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'إنشاء الإنذار' }));

    await waitFor(() =>
      expect(createAlert).toHaveBeenCalledWith({
        alert_type: 'RED_ALERT',
        description: 'اشتباه عينات مختبرية',
        port: 'p-1',
      }),
    );
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('تم إنشاء الإنذار بنجاح'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('shows server-side validation errors and keeps the dialog open', async () => {
    grantFull();
    vi.mocked(getAlerts).mockResolvedValue(listOk([]) as never);
    vi.mocked(createAlert).mockRejectedValue({
      response: { data: { alert_type: ['هذا الحقل مطلوب.'] } },
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'إنذار جديد' }));
    const dialog = await screen.findByRole('dialog');
    const combos = within(dialog).getAllByRole('combobox');
    selectOption(combos[0], 'فاشية');
    fireEvent.click(within(dialog).getByRole('button', { name: 'إنشاء الإنذار' }));

    expect(await screen.findByText('هذا الحقل مطلوب.')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(createAlert).toHaveBeenCalledTimes(1);
  });

  it('shows a truthful fallback on network failure and never fabricates success', async () => {
    grantFull();
    vi.mocked(getAlerts).mockResolvedValue(listOk([]) as never);
    vi.mocked(createAlert).mockRejectedValue(new Error('Network Error'));

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'إنذار جديد' }));
    const dialog = await screen.findByRole('dialog');
    const combos = within(dialog).getAllByRole('combobox');
    selectOption(combos[0], 'إنذار أحمر');
    fireEvent.click(within(dialog).getByRole('button', { name: 'إنشاء الإنذار' }));

    expect(await screen.findByText('تعذّر إنشاء الإنذار، حاول مرة أخرى')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('prevents duplicate submit while a create is in flight', async () => {
    grantFull();
    vi.mocked(getAlerts).mockResolvedValue(listOk([]) as never);
    vi.mocked(createAlert).mockImplementation(() => new Promise(() => {})) as never;

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'إنذار جديد' }));
    const dialog = await screen.findByRole('dialog');
    const combos = within(dialog).getAllByRole('combobox');
    selectOption(combos[0], 'إنذار أحمر');
    const submit = within(dialog).getByRole('button', { name: 'إنشاء الإنذار' });
    fireEvent.click(submit as HTMLButtonElement);
    await screen.findByText('جارٍ الحفظ...');
    fireEvent.click(submit as HTMLButtonElement);
    await waitFor(() => expect(createAlert).toHaveBeenCalledTimes(1));
  });
});

describe('EmergencyPage — Resolve/Close (surveillance:edit)', () => {
  const closeTestAlert = () => listOk([alert()]);

  it('shows the Resolve action for an open (non-resolved) alert to an authorized user', async () => {
    grantFull();
    vi.mocked(getAlerts).mockResolvedValue(closeTestAlert() as never);
    renderPage();
    await screen.findByText('تفشي محتمل في المعبر');
    expect(screen.getByRole('button', { name: /إنهاء/ })).toBeTruthy();
  });

  it('hides the Resolve action from a user without surveillance:edit', async () => {
    grantViewer();
    vi.mocked(getAlerts).mockResolvedValue(closeTestAlert() as never);
    renderPage();
    await screen.findByText('تفشي محتمل في المعبر');
    expect(screen.queryByRole('button', { name: /إنهاء/ })).toBeNull();
  });

  it('does not expose Resolve when the backend state already is RESOLVED', async () => {
    grantFull();
    vi.mocked(getAlerts).mockResolvedValue(
      listOk([alert(), alert({ id: 'a-2', status: 'RESOLVED', resolved_at: '2026-09-02T09:00:00Z' })]) as never,
    );
    renderPage();
    const descriptions = await screen.findAllByText('تفشي محتمل في المعبر');
    expect(descriptions.length).toBeGreaterThanOrEqual(2);
    await screen.findByText('تم الحل');
    expect(screen.getAllByRole('button', { name: /إنهاء/ })).toHaveLength(1);
  });

  it('confirms before closing, posts, notifies, and revalidates authoritatively', async () => {
    grantFull();
    let calls = 0;
    vi.mocked(getAlerts).mockImplementation(() => {
      calls += 1;
      const resolved = calls >= 2;
      return Promise.resolve(
        listOk([alert({ status: resolved ? 'RESOLVED' : 'NEW' })]) as never,
      ) as never;
    });
    vi.mocked(closeAlert).mockResolvedValue({
      data: { status: 'success', data: alert({ status: 'RESOLVED', resolved_at: '2026-09-02T09:00:00Z' }) },
    } as never);

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /إنهاء/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/سيُنهى الإنذار/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'إنهاء' }));

    await waitFor(() => expect(closeAlert).toHaveBeenCalledWith('a-1'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('تم إنهاء الإنذار واعتماد الحالة عند الخادم'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(screen.getByText('تم الحل')).toBeTruthy());
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('preserves state and surfaces the backend rejection instead of optimistically resolving', async () => {
    grantFull();
    vi.mocked(getAlerts).mockResolvedValue(closeTestAlert() as never);
    vi.mocked(closeAlert).mockRejectedValue({
      response: { data: { detail: 'لا تملك الصلاحية لإنهاء هذا الإنذار' } },
    });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /إنهاء/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'إنهاء' }));

    expect(await screen.findByText('لا تملك الصلاحية لإنهاء هذا الإنذار')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(screen.getByText('جديد')).toBeTruthy();
  });

  it('shows a truthful fallback on network failure during close', async () => {
    grantFull();
    vi.mocked(getAlerts).mockResolvedValue(closeTestAlert() as never);
    vi.mocked(closeAlert).mockRejectedValue(new Error('Network Error'));

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /إنهاء/ }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'إنهاء' }));

    expect(await screen.findByText('تعذّر إنهاء الإنذار، حاول مرة أخرى')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('prevents duplicate submit while a close is in flight', async () => {
    grantFull();
    vi.mocked(getAlerts).mockResolvedValue(closeTestAlert() as never);
    vi.mocked(closeAlert).mockImplementation(() => new Promise(() => {})) as never;

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /إنهاء/ }));
    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'إنهاء' });
    fireEvent.click(confirm as HTMLButtonElement);
    fireEvent.click(confirm as HTMLButtonElement);
    await waitFor(() => expect(closeAlert).toHaveBeenCalledTimes(1));
  });
});

describe('EmergencyPage — unsupported operations', () => {
  it('exposes no ESCALATE control and no formal ACKNOWLEDGE control', async () => {
    grantFull();
    vi.mocked(getAlerts).mockResolvedValue(closeTestAlert() as never);
    renderPage();
    await screen.findByText('تفشي محتمل في المعبر');

    expect(screen.queryByRole('button', { name: /ترقية/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /اعتماد|استلام/i })).toBeNull();
    expect(screen.queryByText(/تصعيد/i)).toBeNull();
    expect(screen.queryByText(/إقرار الإنذار|قبول الإنذار/i)).toBeNull();
  });

  it('handles PROCESSING per existing status semantics only (no ack lifecycle UI)', async () => {
    grantFull();
    vi.mocked(getAlerts).mockResolvedValue(
      listOk([alert({ id: 'a-3', status: 'PROCESSING' })]) as never,
    );
    renderPage();
    await screen.findByText('قيد المعالجة');
    expect(screen.getByText('قيد المعالجة')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /اعتماد/i })).toBeNull();
  });
});

function closeTestAlert() {
  return listOk([alert()]);
}