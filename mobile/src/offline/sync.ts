/**
 * M1.9 — آلة حالات المزامنة (بدون منطق تعارض أعمال في M1 — الخادم مرجعي دائماً).
 *
 * DRAFT → QUEUED → SYNCING → SYNCED | FAILED
 *                      └→ CONFLICT
 * FAILED → QUEUED (إعادة محاولة) · CONFLICT → QUEUED (بعد حلّ خارجي في M2)
 */
import type { SyncQueueItem, SyncState } from '../types';

export const SYNC_TRANSITIONS: Readonly<Record<SyncState, readonly SyncState[]>> = {
  DRAFT: ['QUEUED'],
  QUEUED: ['SYNCING'],
  SYNCING: ['SYNCED', 'FAILED', 'CONFLICT'],
  FAILED: ['QUEUED'],
  CONFLICT: ['QUEUED'],
  SYNCED: [],
  RECONNECTING: ['SYNCING', 'SYNCED', 'FAILED'],
};

export class InvalidSyncTransitionError extends Error {
  constructor(
    readonly from: SyncState,
    readonly to: SyncState,
  ) {
    super(`Invalid sync transition: ${from} → ${to}`);
    this.name = 'InvalidSyncTransitionError';
  }
}

export function canTransition(from: SyncState, to: SyncState): boolean {
  return SYNC_TRANSITIONS[from].includes(to);
}

export function transition(item: SyncQueueItem, to: SyncState): SyncQueueItem {
  if (!canTransition(item.state, to)) {
    throw new InvalidSyncTransitionError(item.state, to);
  }
  return { ...item, state: to };
}

/** مفتاح idempotency — يمنع التسليم المكرر تحت إعادة المحاولة (§M1.9). */
export function newIdempotencyKey(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  // UUID v4 layout
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function enqueue(
  queue: SyncQueueItem[],
  item: Omit<SyncQueueItem, 'state' | 'attempts' | 'createdAt' | 'idempotencyKey'> & {
    idempotencyKey?: string;
  },
): SyncQueueItem[] {
  const entry: SyncQueueItem = {
    ...item,
    idempotencyKey: item.idempotencyKey ?? newIdempotencyKey(),
    state: 'QUEUED',
    attempts: 0,
    createdAt: new Date().toISOString(),
  };
  // نفس المفتاح = نفس العنصر (لا تكرار تحت إعادة المحاولة)
  if (queue.some((q) => q.idempotencyKey === entry.idempotencyKey)) return queue;
  return [...queue, entry];
}

export function nextBatch(queue: SyncQueueItem[], limit = 10): SyncQueueItem[] {
  return queue.filter((q) => q.state === 'QUEUED').slice(0, limit);
}
