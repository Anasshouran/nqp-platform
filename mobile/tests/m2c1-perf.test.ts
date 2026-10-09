/**
 * M2-C1 — قياس LOCAL لطرف الكاش (JS في بيئة الاختبار؛ ليس جهازاً حقيقياً).
 * هذه ليست تأكيدات أداء: تُطبع للمرجع فقط وتُصنَّف LOCAL.
 */
import { it } from '@jest/globals';
import { PersistentCache, type DatasetStorage } from '../src/offline/persist/persistentCache';

class Mem implements DatasetStorage {
  private m = new Map<string, string>();
  async getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  async setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  async removeItem(k: string) {
    this.m.delete(k);
  }
}

it('LOCAL cache micro-benchmark (reference only)', async () => {
  const cache = new PersistentCache(new Mem(), 'v1');
  const payload = { items: Array.from({ length: 50 }, (_, i) => ({ id: `c${i}`, value: 'x'.repeat(64) })) };

  const writeStart = Date.now();
  for (let i = 0; i < 200; i += 1) {
    await cache.save('scope', 'certificates', payload, 60);
  }
  const writeTotal = Date.now() - writeStart;

  const readStart = Date.now();
  for (let i = 0; i < 200; i += 1) {
    await cache.load('scope', 'certificates');
  }
  const readTotal = Date.now() - readStart;

  // eslint-disable-next-line no-console
  console.log(
    `[LOCAL] cache write avg ${(writeTotal / 200).toFixed(2)} ms/op; read avg ${(readTotal / 200).toFixed(2)} ms/op (in-memory adapter, jest env)`,
  );
});