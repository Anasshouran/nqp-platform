import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type { Flight } from '../../types/carrier';
import type {
  AircraftInspection,
  AirportActivityLog,
  AirportDashboard,
  AirportPort,
  AirportScreening,
  AirportStaff,
  AirportTerminal,
  CrewHealthRecord,
  ScreeningPoint,
} from '../../types/airport';
import { getFlights } from './carriers';

export const getAirportDashboard = () =>
  apiClient.get<ApiResponse<AirportDashboard>>('/airport/dashboard/');

export const getAirportPorts = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<AirportPort>>>('/airport/ports/', { params });

export const getAirportTerminals = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<AirportTerminal>>>('/airport/terminals/', { params });

export const getScreeningPoints = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ScreeningPoint>>>('/airport/screening-points/', { params });

export const getAirportScreenings = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<AirportScreening>>>('/airport/screenings/', { params });

export const getAircraftInspections = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<AircraftInspection>>>('/airport/aircraft-inspections/', { params });

export const getCrewHealthRecords = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<CrewHealthRecord>>>('/airport/crew-records/', { params });

// موظفو المطار (AirportStaff — #71). الواجهة الحالية تقرأ dashboard.staff،
// وهذه العميل الكامل مُهيّأ لصفحة CRUD لاحقة.
export const getAirportStaff = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<AirportStaff>>>('/airport/staff/', { params });

export const createAirportStaff = (input: Partial<AirportStaff>) =>
  apiClient.post<ApiResponse<AirportStaff>>('/airport/staff/', input);

export const updateAirportStaff = (id: string, input: Partial<AirportStaff>) =>
  apiClient.patch<ApiResponse<AirportStaff>>(`/airport/staff/${id}/`, input);

export const deleteAirportStaff = (id: string) =>
  apiClient.delete(`/airport/staff/${id}/`);

// سجل النشاط الإداري للمطار (قراءة فقط — #78).
export const getAirportActivityLog = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<AirportActivityLog>>>(
    '/airport/activity-log/',
    { params },
  );

/* ============================ رحلات المنافذ الجوية ============================
 * لا يوجد مسار رحلات خاص بالمطار في الـ backend؛ نعيد استخدام `/carriers/flights/`
 * مع قصّ النطاق على منافذ المطار (`destination_port__in`) لأن الواجهة العامة
 * تُرجع رحلات كل المنافذ (بحرية وجوية). معرّفات منافذ المطار تُجلب مرة واحدة
 * وتُخزَّن في الذاكرة لتجنّب طلب إضافي مع كل صفحة.
 */

let airportPortIdsPromise: Promise<string[]> | null = null;

/**
 * معرّفات منافذ المطار (EntryPoint kind=AIRPORT) في نطاق المستخدم — تُستعمل
 * لتمرير فلتر `port` إلى الموارد التي تقبل قيمة نقطة دخول واحدة أو أكثر
 * (مثل `/surveillance/contacts/` و`/emergency/alerts/`).
 */
export const getAirportPortIds = (): Promise<string[]> => {
  if (!airportPortIdsPromise) {
    airportPortIdsPromise = getAirportPorts({ kind: 'AIRPORT', page_size: 200 })
      .then((res) => {
        const data = res.data.data as unknown as { results?: AirportPort[] } | AirportPort[];
        const ports = Array.isArray(data) ? data : data.results ?? [];
        return ports.map((p) => p.id);
      })
      .catch(() => {
        // لا نُخزّن فشلاً دائماً: محاولة لاحقة قد تنجح بعد عودة الاتصال.
        airportPortIdsPromise = null;
        return [];
      });
  }
  return airportPortIdsPromise;
};

/** رحلات المنافذ الجوية فقط — `destination_port__in` عبر فلتر متعدد القيم. */
export const getAirportFlights = async (
  params?: Record<string, unknown>,
): Promise<{ data: ApiResponse<PaginatedResponse<Flight>> }> => {
  const portIds = await getAirportPortIds();
  if (portIds.length === 0) {
    // بلا منافذ جوية في نطاق المستخدم لا نُظهر رحلات المنافذ البحرية؛ نُعيد فراغاً صادقاً.
    return { data: { status: 'success', data: { count: 0, next: null, previous: null, results: [] } } };
  }
  return getFlights({ ...params, destination_port: portIds.join(',') });
};
