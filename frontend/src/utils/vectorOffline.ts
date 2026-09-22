import apiClient from '../api/client';

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  data?: unknown;
  queuedAt: string;
}

const DB_NAME = 'afyatna-offline';
const DB_VERSION = 1;
const STORE = 'vector-queue';

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function putQueued(item: QueuedRequest): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore storage errors */
  }
}

export async function listPending(): Promise<QueuedRequest[]> {
  try {
    const db = await openDb();
    return await new Promise<QueuedRequest[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const items: QueuedRequest[] = [];
      const cur = tx.objectStore(STORE).openCursor();
      cur.onsuccess = () => {
        const cursor = cur.result;
        if (cursor) {
          items.push(cursor.value as QueuedRequest);
          cursor.continue();
        } else {
          resolve(items);
        }
      };
      cur.onerror = () => reject(cur.error);
    }).then((items) => {
      db.close();
      return items;
    });
  } catch {
    return [];
  }
}

async function removeQueued(id: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export async function pendingCount(): Promise<number> {
  return (await listPending()).length;
}

export class OfflineQueuedError extends Error {
  queued = true;
  constructor(message = 'غير متصل — حُفظت العملية محليًا وستُرسل تلقائيًا عند عودة الاتصال') {
    super(message);
    this.name = 'OfflineQueuedError';
  }
}

export function notifyOfflineQueued(): void {
  window.dispatchEvent(new CustomEvent('vector:offline-queued', { detail: Date.now() }));
}

export function notifyOfflineSynced(count: number): void {
  window.dispatchEvent(new CustomEvent('vector:offline-synced', { detail: count }));
}

/**
 * ينفّذ عملية كتابة (POST/PATCH/DELETE) لنظام مكافحة النواقل.
 * إذا كان الجهاز دون اتصال تُحفظ العملية في IndexedDB وتُرسل لاحقًا تلقائيًا
 * (الوضع الميداني)، بدلًا من فشل الطلب.
 */
export async function vectorMutation(config: { url: string; method: 'POST' | 'PATCH' | 'DELETE'; data?: unknown }): Promise<unknown> {
  if (!isOnline()) {
    await putQueued({
      id: (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`) as string,
      url: config.url,
      method: config.method,
      data: config.data,
      queuedAt: new Date().toISOString(),
    });
    notifyOfflineQueued();
    throw new OfflineQueuedError();
  }
  return apiClient(config);
}

export async function flushPendingMutations(): Promise<number> {
  if (!isOnline()) return 0;
  const items = await listPending();
  let synced = 0;
  for (const item of items) {
    try {
      await apiClient({ url: item.url, method: item.method, data: item.data });
      await removeQueued(item.id);
      synced += 1;
    } catch {
      break;
    }
  }
  if (synced > 0) notifyOfflineSynced(synced);
  return synced;
}

export function initVectorOffline(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  window.addEventListener('online', () => {
    flushPendingMutations();
  });
  if (!isOnline()) {
    window.addEventListener('load', () => flushPendingMutations());
  }
}

export default { initVectorOffline, isOnline, pendingCount, flushPendingMutations };