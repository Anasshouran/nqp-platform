import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const AssistantFab = (await import('./AssistantFab')).default;

vi.mock('../api/endpoints/notifications', () => ({
  getNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  markNotificationRead: vi.fn(),
  notifyNotificationsChanged: vi.fn(),
  NOTIFICATIONS_CHANGED_EVENT: 'notifications:changed',
}));

describe('AssistantFab — وصولية اللوحة العائمة', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('الزر يملك اسماً وصيغة توسيع مرتبطة باللوحة', () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <AssistantFab />
      </MemoryRouter>,
    );
    const fab = screen.getByRole('button', { name: /المساعد الذكي/i });
    expect(fab).toBeTruthy();
    expect(fab.getAttribute('aria-expanded')).toBe('false');
  });

  it('المساعد يفتح لوحة بمعرّف ووصف حوار، ويوفر إغلاق Escape', () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <AssistantFab />
      </MemoryRouter>,
    );
    const fab = screen.getByRole('button', { name: /المساعد الذكي/i });
    fireEvent.click(fab);
    expect(fab.getAttribute('aria-expanded')).toBe('true');
    const panel = screen.getByRole('dialog');
    expect(panel.id).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});