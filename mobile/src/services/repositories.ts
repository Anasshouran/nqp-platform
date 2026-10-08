/**
 * طبقة المستودعات (Repository layer) — M2-B.
 *
 * الشاشات لا تلمس HTTP/رموز التفويض إطلاقاً (§6). كل استدعاء هنا:
 *   - يبني الطلب عبر عميل مركزي (مع حقن auth + غلاف + أخطاء ثنائية)؛
 *   - يستخدم مخططات @afyatna/contracts فقط (لا DTO مكررة يدوياً)؛
 *   - يعوّد أخطاء الشبكة/العقد إلى ApiContractError الموحد.
 */
import { MobileApiClient } from '../api/client';
import {
  MobileAuthLoginResponseSchema,
  MobileAuthRefreshResponseSchema,
  MobileCertificate,
  MobileCertificateListSchema,
  MobileCertificateSchema,
  MobileDeclaration,
  MobileDeclarationListSchema,
  MobileNotification,
  MobileNotificationListSchema,
  MobileNotificationSchema,
  MobileProfile,
  MobileProfileSchema,
  MobileRequirement,
  MobileRequirementListSchema,
  MobileSyncStatus,
  MobileSyncStatusSchema,
  MobileTrip,
} from '@afyatna/contracts';

export interface SessionCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds: number;
}

export interface Repositories {
  auth: {
    login(identifier: string, password: string): Promise<SessionCredentials>;
    refresh(refreshToken: string): Promise<{ accessToken: string; expiresInSeconds: number }>;
    logout(refreshToken: string): Promise<void>;
  };
  profile: { get(): Promise<MobileProfile> };
  certificates: { list(): Promise<MobileCertificate[]>; detail(id: string): Promise<MobileCertificate> };
  requirements: { list(): Promise<MobileRequirement[]> };
  declarations: { list(): Promise<MobileDeclaration[]> };
  notifications: {
    list(): Promise<MobileNotification[]>;
    markRead(id: string): Promise<MobileNotification>;
  };
  sync: { status(): Promise<MobileSyncStatus> };
  trips: { list(): Promise<MobileTrip[]> }; // DEFERRED — يرمي NotAvailableError
}

export function createRepositories(client: MobileApiClient): Repositories {
  return {
    auth: {
      async login(identifier, password) {
        // المسار القائم المعتمد (national-ID/email + كلمة مرور) — وليس SUDAPASS.
        const data = await client.request('POST', '/api/v1/auth/login/', {
          body: { identifier: identifier.trim(), password },
          schema: MobileAuthLoginResponseSchema,
          authenticated: false,
        });
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresInSeconds: data.expires_in,
        };
      },
      async refresh(refreshToken) {
        const data = await client.request('POST', '/api/v1/auth/refresh/', {
          body: { refresh: refreshToken },
          schema: MobileAuthRefreshResponseSchema,
          authenticated: false,
        });
        return { accessToken: data.access_token, expiresInSeconds: data.expires_in };
      },
      async logout(refreshToken) {
        await client.request('POST', '/api/v1/auth/logout/', {
          body: { refresh: refreshToken },
          schema: MobileAuthRefreshResponseSchema, // إسقاط الشكل فقط — الاستجابة 204
          authenticated: false,
        });
      },
    },
    profile: {
      get: () =>
        client.request('GET', '/api/v1/mobile/profile/', { schema: MobileProfileSchema }),
    },
    certificates: {
      list: () =>
        client.request('GET', '/api/v1/mobile/certificates/', {
          schema: MobileCertificateListSchema,
        }) as Promise<MobileCertificate[]>,
      detail: (id) =>
        client.request('GET', `/api/v1/mobile/certificates/${id}/`, {
          schema: MobileCertificateSchema,
        }),
    },
    requirements: {
      list: () =>
        client.request('GET', '/api/v1/mobile/requirements/', {
          schema: MobileRequirementListSchema,
        }) as Promise<MobileRequirement[]>,
    },
    declarations: {
      list: () =>
        client.request('GET', '/api/v1/mobile/declarations/', {
          schema: MobileDeclarationListSchema,
        }) as Promise<MobileDeclaration[]>,
    },
    notifications: {
      list: () =>
        client.request('GET', '/api/v1/mobile/notifications/', {
          schema: MobileNotificationListSchema,
        }) as Promise<MobileNotification[]>,
      markRead: (id) =>
        client.request('PATCH', `/api/v1/mobile/notifications/${id}/read/`, {
          schema: MobileNotificationSchema,
        }) as Promise<MobileNotification>,
    },
    sync: {
      status: () =>
        client.request('GET', '/api/v1/mobile/sync/status/', { schema: MobileSyncStatusSchema }),
    },
    trips: {
      list: async () => {
        // DEFERRED: /api/v1/mobile/trips/* = 501 (D-P1-1). لا واجهة جاهزة.
        throw Object.assign(new Error('trips unavailable'), { code: 'NOT_IMPLEMENTED' });
      },
    },
  };
}