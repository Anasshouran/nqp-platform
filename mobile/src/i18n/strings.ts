/**
 * i18n — عربي أول (RTL) + إنجليزي ثانوي (§22).
 * لا تُنتَج محتوى قانوني/صحي محلياً؛ نصوص لغوية فقط.
 */
import type { Locale } from '../types';

export const DEFAULT_LOCALE: Locale = 'ar';

export const STRINGS = {
  ar: {
    appName: 'عافيتنا',
    login: 'تسجيل الدخول',
    identifier: 'رقم الهوية أو البريد',
    password: 'كلمة المرور',
    signInSubtitle: 'دخول المسافر إلى المنصة',
    logout: 'تسجيل الخروج',
    logoutConfirm: 'هل تريد تسجيل الخروج؟',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    retry: 'إعادة المحاولة',
    loading: 'جارٍ التحميل…',
    error: 'حدث خطأ مؤقت',
    empty: 'لا توجد بيانات بعد',
    offlineNotify: 'أنت غير متصل — قد تكون البيانات المعروضة محفوظة من آخر مزامنة',
    sessionExpiredTitle: 'انتهت الجلسة',
    sessionExpiredBody: 'يرجى إعادة تسجيل الدخول',
    home: 'الرئيسية',
    travel: 'السفر',
    health: 'الصحة',
    certificates: 'الشهادات',
    profile: 'الملف الشخصي',
    notifications: 'الإشعارات',
    requirements: 'متطلبات السفر',
    syncStateOnline: 'متصل',
    syncStateOffline: 'غير متصل',
    syncStateSyncing: 'جارٍ المزامنة',
    syncStateSynced: 'مُزامَن',
    syncStateError: 'فشلت المزامنة',
    syncStatePending: 'بانتظار المزامنة',
    syncStateConflict: 'تعارض',
    syncStateReconnecting: 'جارٍ إعادة الاتصال…',
    cachedLabel: 'بيانات محفوظة من آخر مزامنة (غير حديثة)',
    syncStateDraft: 'مسودة',
    contractVersionLabel: 'إصدار العقد',
    serverTimeLabel: 'وقت الخادم',
    unreadLabel: 'غير مقروء',
    greeting: 'أهلاً',
    certificateSummary: 'شهاداتي',
    declarationSummary: 'إقرار الصحة',
    travelPlaceholderTitle: 'رحلاتك قريباً',
    travelPlaceholderBody: 'خدمة إدارة الرحلات مازالت قيد الإعداد',
    requirementSource: 'من إشعار رسمي',
    requirementNoEnglish: 'التفاصيل بالعربية فقط حالياً',
    declaredYes: 'مُقدَّم',
    declaredNo: 'لم يُقدَّم بعد',
    symptomsLabel: 'الأعراض المصرَّح بها',
    readNow: 'تمت القراءة',
    language: 'اللغة',
    languageArabic: 'العربية',
    languageEnglish: 'English',
    emptyCertificates: 'لا توجد شهادات تطعيم',
    emptyNotifications: 'لا إشعارات',
    emptyRequirements: 'لا متطلبات حالياً',
    certificateNumber: 'رقم الشهادة',
    vaccineName: 'اللقاح',
    issuedAt: 'تاريخ الإصدار',
    validUntil: 'صالحة حتى',
    statusActive: 'سارية',
    statusRevoked: 'ملغاة',
    statusExpired: 'منتهية',
    createdLabel: 'التاريخ',
    errorPrefix: 'خطأ',
    notImplemented: 'هذه الميزة قيد الإعداد ولم تُفعَّل بعد',
    warning: 'تنبيه',
    status: 'الحالة',
  },
  en: {
    appName: 'AFYATNA',
    login: 'Sign in',
    identifier: 'National ID or email',
    password: 'Password',
    signInSubtitle: 'Traveler sign-in',
    logout: 'Sign out',
    logoutConfirm: 'Do you want to sign out?',
    cancel: 'Cancel',
    confirm: 'Confirm',
    retry: 'Retry',
    loading: 'Loading…',
    error: 'A temporary error occurred',
    empty: 'No data yet',
    offlineNotify: 'You are offline — shown data may be cached',
    sessionExpiredTitle: 'Session expired',
    sessionExpiredBody: 'Please sign in again',
    home: 'Home',
    travel: 'Travel',
    health: 'Health',
    certificates: 'Certificates',
    profile: 'Profile',
    notifications: 'Notifications',
    requirements: 'Travel requirements',
    syncStateOnline: 'Online',
    syncStateOffline: 'Offline',
    syncStateSyncing: 'Syncing',
    syncStateSynced: 'Synced',
    syncStateError: 'Sync failed',
    syncStatePending: 'Pending sync',
    syncStateConflict: 'Conflict',
    syncStateReconnecting: 'Reconnecting…',
    cachedLabel: 'Cached from last sync (not current)',
    syncStateDraft: 'Draft',
    contractVersionLabel: 'Contract version',
    serverTimeLabel: 'Server time',
    unreadLabel: 'Unread',
    greeting: 'Hello',
    certificateSummary: 'My certificates',
    declarationSummary: 'Health declaration',
    travelPlaceholderTitle: 'Your trips — coming soon',
    travelPlaceholderBody: 'Trip management is being prepared',
    requirementSource: 'From official notice',
    requirementNoEnglish: 'Details available in Arabic only for now',
    declaredYes: 'Submitted',
    declaredNo: 'Not submitted yet',
    symptomsLabel: 'Declared symptoms',
    readNow: 'Marked as read',
    language: 'Language',
    languageArabic: 'العربية',
    languageEnglish: 'English',
    emptyCertificates: 'No vaccination certificates',
    emptyNotifications: 'No notifications',
    emptyRequirements: 'No requirements right now',
    certificateNumber: 'Certificate number',
    vaccineName: 'Vaccine',
    issuedAt: 'Issued at',
    validUntil: 'Valid until',
    statusActive: 'Active',
    statusRevoked: 'Revoked',
    statusExpired: 'Expired',
    createdLabel: 'Date',
    errorPrefix: 'Error',
    notImplemented: 'This feature is not implemented yet',
    warning: 'Warning',
    status: 'Status',
  },
} as const;

export type StringKey = keyof (typeof STRINGS)['ar'];

export function t(key: StringKey, locale: Locale = DEFAULT_LOCALE): string {
  return STRINGS[locale][key] ?? STRINGS.ar[key];
}

export function isRTL(locale: Locale): boolean {
  return locale === 'ar';
}

export function errorMessageFor(locale: Locale, ar: string, en: string): string {
  return locale === 'ar' ? ar : en;
}

export function localizedStatus(locale: Locale, status: string): string {
  const map: Record<string, { ar: string; en: string }> = {
    ACTIVE: { ar: t('statusActive', 'ar'), en: t('statusActive', 'en') },
    REVOKED: { ar: t('statusRevoked', 'ar'), en: t('statusRevoked', 'en') },
    EXPIRED: { ar: t('statusExpired', 'ar'), en: t('statusExpired', 'en') },
  };
  const entry = map[status];
  return entry ? (locale === 'ar' ? entry.ar : entry.en) : status;
}