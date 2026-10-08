/** عقد الملف الشخصي — /api/v1/mobile/profile/ */
import { z } from 'zod';

export const MobileProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string(),
  national_id: z.string(),
  user_type: z.string(),
});

export type MobileProfile = z.infer<typeof MobileProfileSchema>;
