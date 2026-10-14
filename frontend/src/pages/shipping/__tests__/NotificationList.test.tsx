/**
 * NotificationList — render / empty / search / unread filter / detail.
 * Uses useApi (bare-array response, no pagination).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const notifications = vi.hoisted(() => ({ getNotifications: vi.fn() }));
vi.mock('../../../api/endpoints/notifications', () => notifications);

import { NotificationList } from '../components/NotificationList';

const arr = (rows: unknown[]) => ({ data: { data: rows } });

const base = {
  id: 'n1',
  channel: 'email',
  recipient: 'ops@nqp.gov.sd',
  subject: 'تنبيه وصول',
  body: 'وصلت السفينة إلى الميناء',
  status: 'sent',
  is_read: false,
  created_at: '2026-10-14T10:00:00Z',
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
  notifications.getNotifications.mockResolvedValue(arr([]));
});

describe('NotificationList', () => {
  it('shows a loading skeleton initially', () => {
    notifications.getNotifications.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<NotificationList />);
    expect(container.querySelector('[class*=Skeleton]')).not.toBeNull();
  });

  it('renders rows from the API', async () => {
    notifications.getNotifications.mockResolvedValue(arr([row()]));
    render(<NotificationList />);

    expect(await screen.findByText('تنبيه وصول')).toBeTruthy();
    expect(screen.getByText('بريد إلكتروني')).toBeTruthy();
    expect(screen.getByText('أُرسل')).toBeTruthy();
  });

  it('shows the empty state when there are no rows', async () => {
    notifications.getNotifications.mockResolvedValue(arr([]));
    render(<NotificationList />);

    expect(await screen.findByText('لا توجد إشعارات')).toBeTruthy();
  });

  it('filters rows with client-side search', async () => {
    notifications.getNotifications.mockResolvedValue(
      arr([row({ id: 'n1', subject: 'Alpha' }), row({ id: 'n2', subject: 'Beta', created_at: '2026-10-14T09:00:00Z' })]),
    );
    render(<NotificationList />);

    await screen.findByText('Alpha');
    fireEvent.change(screen.getByPlaceholderText(/ابحث/), { target: { value: 'Alpha' } });

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.queryByText('Beta')).toBeNull();
  });

  it('hides read notifications when the unread filter is on', async () => {
    notifications.getNotifications.mockResolvedValue(
      arr([
        row({ id: 'n1', subject: 'غير مقروء', is_read: false }),
        row({ id: 'n2', subject: 'مقروء', is_read: true, created_at: '2026-10-14T09:00:00Z' }),
      ]),
    );
    render(<NotificationList />);

    await screen.findByText('غير مقروء');
    const toggle = screen.getByRole('checkbox', { name: /غير مقروء/ });
    fireEvent.click(toggle);

    await waitFor(() => expect(screen.queryByText('مقروء')).toBeNull());
    expect(screen.getByText('غير مقروء')).toBeTruthy();
  });

  it('opens the detail dialog on row click', async () => {
    notifications.getNotifications.mockResolvedValue(
      arr([row({ id: 'n1', subject: 'تفاصيل', body: 'النص الكامل للإشعار' })]),
    );
    render(<NotificationList />);

    await screen.findByText('تفاصيل');
    fireEvent.click(screen.getByText('تفاصيل'));

    expect(await screen.findByText('النص الكامل للإشعار')).toBeTruthy();
    expect(screen.getByText('تفاصيل الإشعار')).toBeTruthy();
  });
});