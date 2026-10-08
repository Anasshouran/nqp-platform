import { z } from 'zod';

/**
 * نموذج الموظف — يقبل مصدرين للحساب:
 *  - `newUserMode`: يُنشئ حساباً جديداً (بريد/اسم مستخدم/كلمة مرور).
 *  - ربط بحساب موجود عبر `userId`.
 * الخادم هو مصدر الحقيقة؛ هذه قيود UX مبكرة فقط.
 */
const optionalText = (max: number) => z.string().trim().max(max, `الحد الأقصى ${max} حرفاً`);

export const employeeSchema = z
  .object({
    // الحساب
    accountMode: z.enum(['new', 'existing']),
    userId: z.string().uuid().optional().or(z.literal('')),
    email: z.union([z.literal(''), z.string().trim().email('بريد إلكتروني غير صالح')]),
    username: optionalText(150),
    fullName: optionalText(255),
    phone: z.string().trim().optional(),
    password: z.string().optional(),

    // الملف الوظيفي
    employeeNumber: optionalText(32),
    fullNameAr: z.string().trim().min(1, 'الاسم بالعربية مطلوب'),
    fullNameEn: optionalText(255),
    jobTitle: optionalText(200),
    gender: z.enum(['MALE', 'FEMALE']),
    employmentType: z.enum(['PERMANENT', 'CONTRACT', 'TEMPORARY', 'CONSULTANT', 'INTERN']),
    employmentStatus: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']),
    hireDate: z.string().optional(),
    probationEndDate: z.string().optional(),
    birthDate: z.string().optional(),
    reportingManager: z.string().uuid().optional().or(z.literal('')),
    degree: optionalText(120),
    specialization: optionalText(120),
    office: optionalText(64),
    internalPhone: optionalText(32),

    // الاتصال
    homeAddress: optionalText(255),
    emergencyContactName: optionalText(120),
    emergencyContactPhone: optionalText(32),
    emergencyContactRelation: optionalText(64),
  })
  .superRefine((data, ctx) => {
    if (data.accountMode === 'new') {
      if (!data.email) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'البريد الإلكتروني مطلوب' });
      }
      if (data.password && data.password.length > 0 && data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'كلمة المرور 8 أحرف على الأقل',
        });
      }
    } else if (!data.userId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['userId'], message: 'اختر حساب الموظف' });
    }
    if (data.probationEndDate && data.hireDate && data.probationEndDate < data.hireDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['probationEndDate'],
        message: 'نهاية فترة الاختبار لا تسبق تاريخ التعيين',
      });
    }
    if (data.birthDate && data.hireDate && data.birthDate >= data.hireDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['birthDate'], message: 'تاريخ الميلاد يجب أن يسبق تاريخ التعيين' });
    }
  });

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

export const emptyEmployeeForm: EmployeeFormValues = {
  accountMode: 'new',
  userId: '',
  email: '',
  username: '',
  fullName: '',
  phone: '',
  password: '',
  employeeNumber: '',
  fullNameAr: '',
  fullNameEn: '',
  jobTitle: '',
  gender: 'MALE',
  employmentType: 'PERMANENT',
  employmentStatus: 'ACTIVE',
  hireDate: '',
  probationEndDate: '',
  birthDate: '',
  reportingManager: '',
  degree: '',
  specialization: '',
  office: '',
  internalPhone: '',
  homeAddress: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
};
