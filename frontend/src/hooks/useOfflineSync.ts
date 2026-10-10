import { useCallback, useEffect, useState } from 'react';
import { pendingCount } from '../utils/vectorOffline';

/**
 * حالة الاتصال والمزامنة المركزية لواجهة الاستخدام.
 *
 * يستمع إلى أحداث المتصفح (online/offline) وإلى أحداث قائمة الانتظار
 * (`vector:offline-queued` / `vector:offline-synced`) الصادرة من
 * `vectorOffline` عند حفظ عملية محلياً أو مزامنتها مع الخادم.
 *
 * لا يُغيَّر سلوك القائمة نفسها — يعرض ما يحدث فقط.
 */
export type ConnectivityStatus = 'ONLINE' | 'OFFLINE' | 'SYNC_PENDING' | 'SYNCED';

export const useOfflineSync = () => {
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [pending, setPending] = useState(0);
  const [lastSyncedCount, setLastSyncedCount] = useState(0);

  const refreshPending = useCallback(async () => {
    try {
      setPending(await pendingCount());
    } catch {
      /* القائمة غير مدعومة — اعتبر فارغة */
      setPending(0);
    }
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onQueued = () => {
      setLastSyncedCount(0);
      void refreshPending();
    };
    const onSynced = (e: Event) => {
      const count = (e as CustomEvent<number>).detail;
      setLastSyncedCount(typeof count === 'number' ? count : 0);
      void refreshPending();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('vector:offline-queued', onQueued);
    window.addEventListener('vector:offline-synced', onSynced);
    void refreshPending();

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('vector:offline-queued', onQueued);
      window.removeEventListener('vector:offline-synced', onSynced);
    };
  }, [refreshPending]);

  let status: ConnectivityStatus = 'ONLINE';
  if (!online) {
    status = 'OFFLINE';
  } else if (pending > 0) {
    status = 'SYNC_PENDING';
  }

  return { online, pending, lastSyncedCount, status, refreshPending };
};