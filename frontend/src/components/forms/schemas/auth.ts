import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z.string().min(3, 'أدخل البريد الإلكتروني أو رقم الجوال'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
