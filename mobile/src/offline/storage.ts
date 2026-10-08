/**
 * M1.9 — واجهات التخزين دون اتصال.
 *
 * الحالة: SCAFFOLDED — البنية والعقود معرَّفة؛ محرك SQLite الأصلي يُضاف في M2
 * (لا يُدّعى تنفيذه هنا).
 */
import type { SyncQueueItem } from '../types';

export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface StructuredStore {
  /** يحفظ عنصر طابور مجدولاً (SQLite لاحقاً). */
  saveItem(item: SyncQueueItem): Promise<void>;
  loadByState(state: SyncQueueItem['state']): Promise<SyncQueueItem[]>;
  clearSynced(): Promise<void>;
}

/** تخزين مشفّر للمحتوى الحسّاس (SENSITIVE_HEALTH) — مشفّر دائماً. */
export interface EncryptedSensitiveStore {
  setJson(key: string, value: unknown): Promise<void>;
  getJson<T>(key: string): Promise<T | null>;
  wipe(): Promise<void>;
}

/** ذاكرة داخلية للتطوير/الاختبار فقط — لا تُستخدم في الإنتاج. */
export class InMemoryKeyValueStore implements KeyValueStore {
  private readonly map = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.map.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.map.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.map.delete(key);
  }
}
