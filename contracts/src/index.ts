/** @afyatna/contracts — مصدر واحد لعقود API الجوال (Zod + أنواع TypeScript). */

export * from './envelope';
export * from './classification';
export * from './mobile/auth';
export * from './mobile/profile';
export * from './mobile/trips';
export * from './mobile/requirements';
export * from './mobile/certificates';
export * from './mobile/declarations';
export * from './mobile/notifications';
export * from './mobile/sync';

/** أسماء مسارات API الجوال — تُقارن بمسارات OpenAPI في اختبارات العقد. */
export const MOBILE_API_PATHS = {
  authLogin: '/api/v1/mobile/auth/login/',
  authRefresh: '/api/v1/mobile/auth/refresh/',
  profile: '/api/v1/mobile/profile/',
  trips: '/api/v1/mobile/trips/',
  tripDetail: (id: string) => `/api/v1/mobile/trips/${id}/`,
  requirements: '/api/v1/mobile/requirements/',
  certificates: '/api/v1/mobile/certificates/',
  certificateDetail: (id: string) => `/api/v1/mobile/certificates/${id}/`,
  declarations: '/api/v1/mobile/declarations/',
  notifications: '/api/v1/mobile/notifications/',
  notificationRead: (id: string) => `/api/v1/mobile/notifications/${id}/read/`,
  syncStatus: '/api/v1/mobile/sync/status/',
} as const;
