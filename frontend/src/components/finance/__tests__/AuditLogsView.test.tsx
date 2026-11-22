/**
 * F15 — AuditLogsView had no test coverage at all.
 * The view uses the real `useServerTable` hook, so only the finance endpoint
 * is mocked; the response keeps the real envelope shape
 * `{ data: { data: { results, count } } }`.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import AuditLogsView from '../AuditLogsView';
import * as financeApi from '../../../api/endpoints/finance';

vi.mock('../../../api/endpoints/finance', () => ({
  getFinanceAuditLogs: vi.fn(),
}));

const ok = (results: unknown[]) => ({
  data: { data: { results, count: results.length } },
  status: 200,
});

const row = {
  id: 'a-1',
  action: 'CREATE',
  actor_name: 'مستخدم اختبار',
  actor_role: 'FINANCE_DIRECTOR',
  resource_type: 'Invoice',
  resource_id: 'inv-12345678',
  invoice_ref: 'INV-001',
  occurred_at: '2026-01-01T00:00:00Z',
  old_value: '',
  new_value: 'PAID',
  ip_address: '127.0.0.1',
};

const wrap = async (lang: 'ar' | 'en') => {
  await i18n.changeLanguage(lang);
  return render(
    <I18nextProvider i18n={i18n}>
      <AuditLogsView />
    </I18nextProvider>,
  );
};

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage('ar');
  vi.mocked(financeApi.getFinanceAuditLogs).mockResolvedValue(ok([row]) as never);
});

describe('AuditLogsView — F15 coverage', () => {
  it('renders the Arabic header', async () => {
    await wrap('ar');
    expect(await screen.findByText('سجل التدقيق المالي')).toBeInTheDocument();
    expect(screen.getByText('سجل التدقيق')).toBeInTheDocument();
    expect(financeApi.getFinanceAuditLogs).toHaveBeenCalledTimes(1);
  });

  it('renders English localized labels when language=en', async () => {
    await wrap('en');
    // The section title is still hardcoded Arabic in this view (i18n of
    // AuditLogsView is out of F15 scope); the action label is localized via
    // AUDIT_ACTION_LABELS + the active locale.
    expect(await screen.findByText('سجل التدقيق المالي')).toBeInTheDocument();
    expect(await screen.findByText('Create')).toBeInTheDocument();
  });

  it('renders an empty state when the list is empty', async () => {
    vi.mocked(financeApi.getFinanceAuditLogs).mockResolvedValue(ok([]) as never);
    await wrap('ar');
    expect(await screen.findByText('لا توجد سجلات')).toBeInTheDocument();
    expect(screen.getByText('لم يتم توثيق عمليات مالية بعد')).toBeInTheDocument();
    expect(financeApi.getFinanceAuditLogs).toHaveBeenCalledTimes(1);
  });

  it('calls getFinanceAuditLogs exactly once on mount', async () => {
    await wrap('ar');
    await waitFor(() => {
      expect(financeApi.getFinanceAuditLogs).toHaveBeenCalledTimes(1);
    });
  });
});
