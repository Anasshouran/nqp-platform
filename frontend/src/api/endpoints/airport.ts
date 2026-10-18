import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
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
