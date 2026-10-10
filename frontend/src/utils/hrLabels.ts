import type {
  AttendanceStatus,
  CycleStatus,
  EnrollmentStatus,
  LeaveRequestStatus,
  ReviewStatus,
  EmploymentStatus,
  EmploymentType,
  PostingKind,
  PostingStatus,
  TimelineEventType,
} from '../types/hr';
import type { StatusTone } from '../components/ui/StatusChip';

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  ACTIVE: 'على رأس العمل',
  ON_LEAVE: 'في إجازة',
  SUSPENDED: 'موقوف',
  TERMINATED: 'منتهي الخدمة',
};

export const EMPLOYMENT_STATUS_TONES: Record<EmploymentStatus, StatusTone> = {
  ACTIVE: 'success',
  ON_LEAVE: 'warning',
  SUSPENDED: 'error',
  TERMINATED: 'neutral',
};

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  PERMANENT: 'دائم',
  CONTRACT: 'بعقد',
  TEMPORARY: 'مؤقت',
  CONSULTANT: 'استشاري',
  INTERN: 'تدريب',
};

export const TIMELINE_EVENT_LABELS: Record<TimelineEventType, string> = {
  HIRE: 'توظيف',
  PROMOTION: 'ترقية',
  TRANSFER: 'نقل',
  DEMOTION: 'خفض',
  LEAVE_START: 'بدء إجازة',
  LEAVE_END: 'انتهاء إجازة',
  SUSPENSION: 'إيقاف',
  TERMINATION: 'إنهاء خدمة',
  REINSTATE: 'إعادة تعيين',
  PROBATION_END: 'نهاية فترة الاختبار',
  CONTRACT_RENEWAL: 'تجديد عقد',
};

export const TIMELINE_EVENT_TONES: Record<TimelineEventType, StatusTone> = {
  HIRE: 'success',
  PROMOTION: 'primary',
  TRANSFER: 'info',
  DEMOTION: 'warning',
  LEAVE_START: 'info',
  LEAVE_END: 'neutral',
  SUSPENSION: 'error',
  TERMINATION: 'error',
  REINSTATE: 'success',
  PROBATION_END: 'neutral',
  CONTRACT_RENEWAL: 'primary',
};

export const GENDER_LABELS: Record<string, string> = {
  MALE: 'ذكر',
  FEMALE: 'أنثى',
};

export const genderLabel = (gender: string): string => GENDER_LABELS[gender] ?? '';

/** تسمية نصية لحدث المسار، مع بديل آمن للقيم غير المعروفة. */
export const timelineEventLabel = (event: string, fallback?: string): string =>
  TIMELINE_EVENT_LABELS[event as TimelineEventType] ?? fallback ?? event;

export const employmentStatusLabel = (status: string): string =>
  EMPLOYMENT_STATUS_LABELS[status as EmploymentStatus] ?? status;

export const employmentStatusTone = (status: string): StatusTone =>
  EMPLOYMENT_STATUS_TONES[status as EmploymentStatus] ?? 'neutral';

export const employmentTypeLabel = (type: string): string =>
  EMPLOYMENT_TYPE_LABELS[type as EmploymentType] ?? type;

export const POSTING_KIND_LABELS: Record<PostingKind, string> = {
  TRANSFER: 'نقل',
  PROMOTION: 'ترقية',
  DEMOTION: 'خفض',
};

export const POSTING_STATUS_LABELS: Record<PostingStatus, string> = {
  DRAFT: 'مسودة',
  SUBMITTED: 'مُقدَّم',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
  CANCELLED: 'ملغى',
};

export const POSTING_STATUS_TONES: Record<PostingStatus, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'neutral',
};

export const postingKindLabel = (v: string) =>
  POSTING_KIND_LABELS[v as PostingKind] ?? v;
export const postingStatusLabel = (v: string) =>
  POSTING_STATUS_LABELS[v as PostingStatus] ?? v;

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  LATE: 'متأخر',
  EARLY_LEAVE: 'انصراف مبكر',
  REMOTE: 'عمل عن بُعد',
  ON_LEAVE: 'إجازة',
  OFF_DAY: 'يوم راحة',
};

export const ATTENDANCE_STATUS_TONES: Record<AttendanceStatus, StatusTone> = {
  PRESENT: 'success',
  ABSENT: 'error',
  LATE: 'warning',
  EARLY_LEAVE: 'warning',
  REMOTE: 'info',
  ON_LEAVE: 'info',
  OFF_DAY: 'neutral',
};

/** الحالات التي تُشتق من التوقيت فلا تقبل ساعة دخول/خروج (نفس قيد الخادم). */
export const ATTENDANCE_NO_PUNCH: AttendanceStatus[] = ['ABSENT', 'ON_LEAVE', 'OFF_DAY'];

/** الحالات التي تعني أن الموظف كان في العمل، فتتطلّب وقت حضور. */
export const ATTENDANCE_NEEDS_PUNCH: AttendanceStatus[] = [
  'PRESENT', 'LATE', 'EARLY_LEAVE', 'REMOTE',
];

export const attendanceStatusLabel = (v: string) =>
  ATTENDANCE_STATUS_LABELS[v as AttendanceStatus] ?? v;

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  DRAFT: 'مسودة',
  SUBMITTED: 'مُقدَّم',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
  CANCELLED: 'ملغى',
};

export const LEAVE_STATUS_TONES: Record<LeaveRequestStatus, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'neutral',
};

export const leaveStatusLabel = (v: string) =>
  LEAVE_STATUS_LABELS[v as LeaveRequestStatus] ?? v;

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  DRAFT: 'مسودة',
  REQUESTED: 'مطلوب',
  APPROVED: 'معتمد',
  IN_PROGRESS: 'جارٍ',
  COMPLETED: 'مكتمل',
  FAILED: 'راسب',
  CANCELLED: 'ملغى',
  REJECTED: 'مرفوض',
};

export const ENROLLMENT_STATUS_TONES: Record<EnrollmentStatus, StatusTone> = {
  DRAFT: 'neutral',
  REQUESTED: 'info',
  APPROVED: 'success',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELLED: 'neutral',
  REJECTED: 'error',
};

export const enrollmentStatusLabel = (v: string) =>
  ENROLLMENT_STATUS_LABELS[v as EnrollmentStatus] ?? v;

export const DELIVERY_MODE_LABELS: Record<string, string> = {
  INTERNAL: 'داخلي',
  EXTERNAL: 'خارجي',
  ONLINE: 'عن بُعد',
  ON_THE_JOB: 'تدريب ميداني',
};

export const CYCLE_STATUS_LABELS: Record<CycleStatus, string> = {
  DRAFT: 'مسودة',
  OPEN: 'مفتوحة',
  CLOSED: 'مغلقة',
  ARCHIVED: 'مؤرشفة',
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  DRAFT: 'مسودة',
  SUBMITTED: 'مُقدَّم',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
  RETURNED: 'مُعادة',
};

export const REVIEW_STATUS_TONES: Record<ReviewStatus, StatusTone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  RETURNED: 'warning',
};

export const reviewStatusLabel = (v: string) =>
  REVIEW_STATUS_LABELS[v as ReviewStatus] ?? v;

export const RATING_LABELS: Record<string, string> = {
  EXCELLENT: 'ممتاز',
  VERY_GOOD: 'جيد جداً',
  GOOD: 'جيد',
  ACCEPTABLE: 'مقبول',
  NEEDS_IMPROVEMENT: 'يحتاج تحسين',
};

export const ratingLabel = (v: string) => RATING_LABELS[v] ?? v;
