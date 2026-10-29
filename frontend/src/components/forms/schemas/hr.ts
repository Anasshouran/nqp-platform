import { z } from 'zod';
import type { TFunction } from 'i18next';

/**
 * نموذج الموظف — يقبل مصدرين للحساب:
 *  - `newUserMode`: يُنشئ حساباً جديداً (بريد/اسم مستخدم/كلمة مرور).
 *  - ربط بحساب موجود عبر `userId`.
 * الخادم هو مصدر الحقيقة؛ هذه قيود UX مبكرة فقط.
 */
const optionalText = (max: number, t: TFunction) => z.string().trim().max(max, t('hr.employeeSchema.validation.maxLength', { max }));

export const createEmployeeSchema = (t: TFunction) => z
  .object({
    // الحساب
    accountMode: z.enum(['new', 'existing']),
    userId: z.string().uuid().optional().or(z.literal('')),
    email: z.union([z.literal(''), z.string().trim().email(t('hr.employeeSchema.validation.invalidEmail'))]),
    username: optionalText(150, t),
    fullName: optionalText(255, t),
    phone: z.string().trim().optional(),
    password: z.string().optional(),

    // الملف الوظيفي
    employeeNumber: optionalText(32, t),
    fullNameAr: z.string().trim().min(1, t('hr.employeeSchema.validation.fullNameArRequired')),
    fullNameEn: optionalText(255, t),
    jobTitle: optionalText(200, t),
    gender: z.enum(['MALE', 'FEMALE']),
    employmentType: z.enum(['PERMANENT', 'CONTRACT', 'TEMPORARY', 'CONSULTANT', 'INTERN']),
    employmentStatus: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']),
    hireDate: z.string().optional(),
    probationEndDate: z.string().optional(),
    birthDate: z.string().optional(),
    reportingManager: z.string().uuid().optional().or(z.literal('')),
    degree: optionalText(120, t),
    specialization: optionalText(120, t),
    office: optionalText(64, t),
    internalPhone: optionalText(32, t),

    // الاتصال
    homeAddress: optionalText(255, t),
    emergencyContactName: optionalText(120, t),
    emergencyContactPhone: optionalText(32, t),
    emergencyContactRelation: optionalText(64, t),
  })
  .superRefine((data, ctx) => {
    if (data.accountMode === 'new') {
      if (!data.email) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: t('hr.employeeSchema.validation.emailRequired') });
      }
      if (data.password && data.password.length > 0 && data.password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: t('hr.employeeSchema.validation.passwordMinLength'),
        });
      }
    } else if (!data.userId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['userId'], message: t('hr.employeeSchema.validation.selectUserAccount') });
    }
    if (data.probationEndDate && data.hireDate && data.probationEndDate < data.hireDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['probationEndDate'],
        message: t('hr.employeeSchema.validation.probationBeforeHire'),
      });
    }
    if (data.birthDate && data.hireDate && data.birthDate >= data.hireDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['birthDate'], message: t('hr.employeeSchema.validation.birthDateBeforeHire') });
    }
  });

export type EmployeeFormValues = z.infer<ReturnType<typeof createEmployeeSchema>>;

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
