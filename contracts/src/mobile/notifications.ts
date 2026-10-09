/** عقد الإشعارات — /api/v1/mobile/notifications/* (مملوكة للمستخدم؛ بلا نص/مستلم داخلي) */
import { z } from 'zod';

export const MobileNotificationSchema = z.object({
  id: z.string().uuid(),
  channel: z.string(),
  status: z.string(),
  subject: z.string().optional().default(''),
  is_read: z.boolean(),
  read_at: z.string().nullable(),
  sent_at: z.string().nullable(),
  created_at: z.string(),
});

export const MobileNotificationListSchema = z.array(MobileNotificationSchema);

export type MobileNotification = z.infer<typeof MobileNotificationSchema>;