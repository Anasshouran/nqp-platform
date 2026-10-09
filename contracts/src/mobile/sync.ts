/** عقد المزامنة — /api/v1/mobile/sync/status/ (الخادم مرجعي دائماً) */
import { z } from 'zod';

export const MobileSyncStatusSchema = z.object({
  last_synced_at: z.string().nullable(),
  pending_count: z.number().int().min(0),
  server_time: z.string(),
  server_version: z.string().optional(),
  contract_version: z.string().optional(),
  unread_notifications: z.number().int().min(0).optional(),
});

export type MobileSyncStatus = z.infer<typeof MobileSyncStatusSchema>;

/** حالات طابور المزامنة على الجهاز (M1.9 — بدون منطق تعارض في M1). */
export const SyncStateSchema = z.enum([
  'DRAFT',
  'QUEUED',
  'SYNCING',
  'SYNCED',
  'FAILED',
  'CONFLICT',
]);

export type SyncState = z.infer<typeof SyncStateSchema>;