/**
 * أنواع مشتركة داخل التطبيق (ليست عقداً مع الخادم — عقد الخادم في @afyatna/contracts).
 */

export type Locale = 'ar' | 'en';

/** حالة اتصال مبسطة للواجهات (online/offline/unknown). */
export type Connectivity = 'online' | 'offline' | 'unknown';

/** حالة الاتصال كما يراها التطبيق (M1.9). */
export type ConnectivityState = 'online' | 'offline' | 'capping' | 'unknown';

/** مرحلة المزامنة على الجهاز (M1.9). */
export type SyncState =
  | 'DRAFT'
  | 'QUEUED'
  | 'SYNCING'
  | 'SYNCED'
  | 'FAILED'
  | 'CONFLICT'
  | 'RECONNECTING';

/** عنصر في طابور المزامنة (الخادم مرجعي دائماً). */
export interface SyncQueueItem {
  id: string;
  idempotencyKey: string;
  kind: 'declaration' | 'draft' | 'preference';
  payload: unknown;
  state: SyncState;
  attempts: number;
  lastError?: { code: string; ar: string; en: string };
  createdAt: string;
}

/** حالة الجلسة الموثوقة (لا تُنشأ أبداً بدون اتصال بمزوّد هوية موثوق). */
export interface AuthSessionState {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
  userId: string;
  provider: 'password' | 'sudapass';
}
