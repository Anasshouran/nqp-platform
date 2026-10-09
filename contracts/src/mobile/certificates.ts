/** عقد الشهادات — /api/v1/mobile/certificates/ (SENSITIVE_HEALTH) */
import { z } from 'zod';

export const MobileCertificateSchema = z.object({
  id: z.string().uuid(),
  certificate_number: z.string().min(1),
  vaccine_name: z.string(),
  issued_at: z.string(),
  valid_until: z.string(),
  status: z.string(),
});

export const MobileCertificateListSchema = z.array(MobileCertificateSchema);

export type MobileCertificate = z.infer<typeof MobileCertificateSchema>;
