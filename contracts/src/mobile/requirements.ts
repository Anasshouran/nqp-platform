/** عقد المتطلبات — /api/v1/mobile/requirements/ (إسقاط HealthNotice؛ بلا ترجمة مخترعة) */
import { z } from 'zod';

export const MobileRequirementSchema = z.object({
  code: z.string().min(1),
  title_ar: z.string().min(1),
  title_en: z.string().optional().default(''),
  description_ar: z.string().optional().default(''),
  priority: z.string().optional().default(''),
  category: z.string().optional().default(''),
  effective_from: z.string().nullable().optional(),
  effective_until: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
});

export const MobileRequirementListSchema = z.array(MobileRequirementSchema);

export type MobileRequirement = z.infer<typeof MobileRequirementSchema>;