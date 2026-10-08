/** عقد الرحلات — /api/v1/mobile/trips/ (D-P1-1: نظير موحّد لكل وسائل النقل) */
import { z } from 'zod';

export const MobileTripSchema = z.object({
  id: z.string().uuid(),
  destination: z.string(),
  transport_mode: z.string(),
  departure_date: z.string(),
  return_date: z.string().nullable(),
  status: z.string(),
});

export const MobileTripListSchema = z.array(MobileTripSchema);

export type MobileTrip = z.infer<typeof MobileTripSchema>;
