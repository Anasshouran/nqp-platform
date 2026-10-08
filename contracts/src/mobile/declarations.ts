/** عقد الإقرارات الصحية — /api/v1/mobile/declarations/ (SENSITIVE_HEALTH، بلا حقول مخاطرة) */
import { z } from 'zod';

export const MobileDeclarationSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  declared: z.boolean(),
  symptoms: z.array(z.string()).default([]),
  submitted_at: z.string().nullable(),
});

export const MobileDeclarationListSchema = z.array(MobileDeclarationSchema);

export type MobileDeclaration = z.infer<typeof MobileDeclarationSchema>;