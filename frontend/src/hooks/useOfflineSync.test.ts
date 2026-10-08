import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOfflineSync } from './useOfflineSync';

vi.mock('../utils/vectorOffline', () => ({
  pendingCount: vi.fn(),
}));

import { pendingCount } from '../utils/vectorOffline';

describe('useOfflineSync — حالة الاتصال والمزامنة للواجهة', () => {
  beforeEach(() => {
    // استعادة online افتراضياً؛ useOfflineSync يقرأ navigator مرة واحدة عند التركيب.
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => true });
    vi.mocked(pendingCount).mockReset();
    vi.mocked(pendingCount).mockResolvedValue(0);
    window.dispatchEvent(new Event('online'));
    vi.clearAllTimers();
  });

  it('يبدأ بالحالة ONLINE عندما يكون المتصفح متصلاً والقائمة فارغة', () => {
    const { result } = renderHook(() => useOfflineSync());
    expect(result.current.online).toBe(true);
    expect(result.current.pending).toBe(0);
    expect(result.current.status).toBe('ONLINE');
  });

  it('يتحول إلى OFFLINE عند حدث المتصفح offline', () => {
    const { result } = renderHook(() => useOfflineSync());
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current.online).toBe(false);
    expect(result.current.status).toBe('OFFLINE');
  });

  it('يعرض SYNC_PENDING عندما توجد عمليات محفوظة محلياً', async () => {
    vi.mocked(pendingCount).mockResolvedValue(3);
    const { result } = renderHook(() => useOfflineSync());
    await act(async () => {
      window.dispatchEvent(new CustomEvent('vector:offline-queued'));
      await Promise.resolve();
    });
    expect(result.current.pending).toBe(3);
    expect(result.current.status).toBe('SYNC_PENDING');
  });

  it('يعود إلى ONLINE بعد اكتمال المزامنة وإفراغ القائمة', async () => {
    vi.mocked(pendingCount).mockResolvedValue(0);
    const { result } = renderHook(() => useOfflineSync());
    await act(async () => {
      window.dispatchEvent(new CustomEvent('vector:offline-synced', { detail: 2 }));
      await Promise.resolve();
    });
    expect(result.current.pending).toBe(0);
    expect(result.current.status).toBe('ONLINE');
  });

  it('يُحدّث عدد العمليات المزامَنة عند حدث المزامنة', async () => {
    vi.mocked(pendingCount).mockResolvedValue(0);
    const { result } = renderHook(() => useOfflineSync());
    act(() => {
      window.dispatchEvent(new CustomEvent('vector:offline-synced', { detail: 5 }));
    });
    expect(result.current.lastSyncedCount).toBe(5);
  });
});