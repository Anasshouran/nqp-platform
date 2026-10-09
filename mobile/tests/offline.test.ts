/**
 * M1.9 — اختبارات آلة المزامنة والمفاتيح وحالة عدم الاتصال.
 */
import {
  InvalidSyncTransitionError,
  canTransition,
  enqueue,
  newIdempotencyKey,
  nextBatch,
  transition,
} from '../src/offline/sync';
import type { SyncQueueItem } from '../src/types';
import { canOperateOffline, isSessionActive } from '../src/auth/session';

const baseItem: SyncQueueItem = {
  id: '1',
  idempotencyKey: 'k-1',
  kind: 'declaration',
  payload: {},
  state: 'DRAFT',
  attempts: 0,
  createdAt: '2026-10-07T00:00:00.000Z',
};

describe('sync state machine', () => {
  it('allows the happy path', () => {
    expect(canTransition('DRAFT', 'QUEUED')).toBe(true);
    expect(canTransition('QUEUED', 'SYNCING')).toBe(true);
    expect(canTransition('SYNCING', 'SYNCED')).toBe(true);
  });

  it('allows failure and retry paths', () => {
    expect(canTransition('SYNCING', 'FAILED')).toBe(true);
    expect(canTransition('FAILED', 'QUEUED')).toBe(true);
    expect(canTransition('SYNCING', 'CONFLICT')).toBe(true);
    expect(canTransition('CONFLICT', 'QUEUED')).toBe(true);
  });

  it('rejects illegal transitions', () => {
    expect(canTransition('DRAFT', 'SYNCED')).toBe(false);
    expect(canTransition('SYNCED', 'QUEUED')).toBe(false);
    expect(canTransition('SYNCING', 'DRAFT')).toBe(false);
    expect(() => transition(baseItem, 'SYNCED')).toThrow(InvalidSyncTransitionError);
  });

  it('does not mutate the original item', () => {
    const next = transition({ ...baseItem, state: 'QUEUED' }, 'SYNCING');
    expect(next.state).toBe('SYNCING');
    expect(baseItem.state).toBe('DRAFT');
  });
});

describe('idempotency keys', () => {
  it('are unique UUID-v4 shaped', () => {
    const keys = new Set(Array.from({ length: 100 }, () => newIdempotencyKey()));
    expect(keys.size).toBe(100);
    for (const key of keys) {
      expect(key).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
  });

  it('deduplicates enqueued items by idempotency key', () => {
    let queue = enqueue([], { id: '1', idempotencyKey: 'same', kind: 'draft', payload: {} });
    queue = enqueue(queue, { id: '2', idempotencyKey: 'same', kind: 'draft', payload: {} });
    expect(queue).toHaveLength(1);
    queue = enqueue(queue, { id: '3', idempotencyKey: 'other', kind: 'draft', payload: {} });
    expect(queue).toHaveLength(2);
    expect(queue.every((q) => q.state === 'QUEUED')).toBe(true);
  });

  it('batches only QUEUED items', () => {
    let queue = enqueue([], { id: '1', kind: 'draft', payload: {} });
    const syncing = transition(queue[0]!, 'SYNCING');
    queue = [syncing, ...queue.slice(1)];
    queue = [...queue, ...enqueue([], { id: '2', kind: 'draft', payload: {} })];
    const batch = nextBatch(queue);
    expect(batch.map((i) => i.id)).toEqual(['2']);
  });
});

describe('offline rules (§1.2: no new trusted identity offline)', () => {
  const session = {
    accessToken: 'a',
    expiresAt: Date.now() + 60_000,
    userId: 'u1',
    provider: 'password' as const,
  };

  it('active session can operate offline', () => {
    expect(isSessionActive(session)).toBe(true);
    expect(canOperateOffline(session, 'offline')).toBe(true);
  });

  it('no session => cannot operate offline', () => {
    expect(canOperateOffline(null, 'offline')).toBe(false);
  });

  it('expired session cannot create offline trust', () => {
    const expired = { ...session, expiresAt: Date.now() - 1 };
    expect(isSessionActive(expired)).toBe(false);
    expect(canOperateOffline(expired, 'offline')).toBe(false);
    expect(canOperateOffline(expired, 'online')).toBe(true); // سيُطلب تجديد/دخول
  });
});
