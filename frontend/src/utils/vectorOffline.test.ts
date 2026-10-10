import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  OfflineQueuedError,
  clearPendingMutations,
  initVectorOffline,
  isOnline,
  notifyOfflineQueued,
  notifyOfflineSynced,
  vectorMutation,
} from './vectorOffline';

const queuedHandler = vi.fn();
const syncedHandler = vi.fn();

beforeEach(() => {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => true });
});

afterEach(() => {
  window.removeEventListener('vector:offline-queued', queuedHandler);
  window.removeEventListener('vector:offline-synced', syncedHandler);
  vi.restoreAllMocks();
});

describe('vectorOffline — الزامات الحرجة', () => {
  it('isOnline يعيد قيمة منطقية دون تعطل', () => {
    expect(typeof isOnline()).toBe('boolean');
  });

  it('الإشعارات تطلق أحداثاً بمحتواها دون رمي أخطاء', () => {
    window.addEventListener('vector:offline-queued', queuedHandler);
    window.addEventListener('vector:offline-synced', syncedHandler);

    expect(() => notifyOfflineQueued()).not.toThrow();
    expect(() => notifyOfflineSynced(3)).not.toThrow();
    expect(queuedHandler).toHaveBeenCalledTimes(1);
    expect(syncedHandler).toHaveBeenCalledWith(
      expect.objectContaining({ detail: 3 }),
    );
  });

  it('vectorMutation دون اتصال يرمي OfflineQueuedError حتى مع غياب IndexedDB', async () => {
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });
    await expect(vectorMutation({ url: '/x', method: 'POST', data: {} })).rejects.toBeInstanceOf(OfflineQueuedError);
  });

  it('initVectorOffline لا يرمي في بيئة المتصفح', () => {
    expect(() => initVectorOffline()).not.toThrow();
  });

  it('clearPendingMutations يلتقط عدم دعم IndexedDB بسلام', async () => {
    await expect(clearPendingMutations()).resolves.toBeUndefined();
  });
});