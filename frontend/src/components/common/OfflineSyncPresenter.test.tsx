import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import OfflineSyncPresenter from './OfflineSyncPresenter';

vi.mock('../../utils/toast', () => ({
  notifyInfo: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('../../utils/vectorOffline', () => ({
  pendingCount: vi.fn(),
}));

import { notifyInfo, notifySuccess } from '../../utils/toast';
import { pendingCount } from '../../utils/vectorOffline';

describe('OfflineSyncPresenter — رسائل الحفظ المحلي والمزامنة', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => true });
    vi.mocked(pendingCount).mockReset();
    vi.mocked(pendingCount).mockResolvedValue(0);
    vi.mocked(notifyInfo).mockReset();
    vi.mocked(notifySuccess).mockReset();
    vi.clearAllMocks();
  });

  it('لا يعرض أي عنصر عندما يكون الاتصال سليماً والقائمة فارغة', () => {
    const { container } = render(<OfflineSyncPresenter />);
    expect(container.firstChild).toBeNull();
  });

  it('يعرض مؤشر مزامنة مع عدد العمليات المحفوظة محلياً', async () => {
    vi.mocked(pendingCount).mockResolvedValue(3);
    const { container } = render(<OfflineSyncPresenter />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent('vector:offline-queued'));
      await Promise.resolve();
    });
    expect(screen.getByText(/3 عمليات بانتظار المزامنة/)).toBeTruthy();
    expect(notifyInfo).toHaveBeenCalledWith('تم حفظ العملية محلياً وستتم مزامنتها عند عودة الاتصال.');
    expect(container.firstChild).not.toBeNull();
  });

  it('يُعلن اكتمال المزامنة بإشعار نجاح ويختفي بعد إفراغ القائمة', async () => {
    vi.mocked(pendingCount).mockResolvedValue(0);
    const { container } = render(<OfflineSyncPresenter />);
    await act(async () => {
      window.dispatchEvent(new CustomEvent('vector:offline-synced', { detail: 2 }));
    });
    expect(notifySuccess).toHaveBeenCalledWith('تمت مزامنة 2 عمليات مع الخادم.');
    // القائمة فارغة والاتصال سليم ⇒ لا عنصر دائم
    expect(container.firstChild).toBeNull();
  });

  it('يعرض «غير متصل بالإنترنت» عند انقطاع الاتصال', () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });
    render(<OfflineSyncPresenter />);
    expect(screen.getByText('غير متصل بالإنترنت')).toBeTruthy();
  });
});