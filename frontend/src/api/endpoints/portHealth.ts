import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  Berth,
  CargoInspection,
  CrewMember,
  FoodWaterInspection,
  HealthCertificate,
  HealthDeclaration,
  IsolationRecord,
  Passenger,
  PortEmergency,
  PortHealthOverview,
  SanitationCertificate,
  SeaPort,
  ShipInspection,
  ShipInspectionCreate,
  SurveillanceCase,
  VectorControl,
  Vessel,
  VesselVisit,
  WasteInspection,
} from '../../types/portHealth';

export const getPortHealthOverview = () =>
  apiClient.get<ApiResponse<PortHealthOverview>>('/port-health/dashboard/overview/');

export const getSeaPorts = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<SeaPort>>>('/port-health/seaports/', { params });

export const getBerths = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Berth>>>('/port-health/berths/', { params });

export const getVessels = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Vessel>>>('/port-health/vessels/', { params });

export const getVesselVisits = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VesselVisit>>>('/port-health/visits/', { params });

export const getCrewMembers = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<CrewMember>>>('/port-health/crew/', { params });

export const getPassengers = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Passenger>>>('/port-health/passengers/', { params });

export const getHealthDeclarations = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<HealthDeclaration>>>('/port-health/declarations/', { params });

/**
 * Lifecycle actions (Phase 1D-6B). `status` is server-owned: a declaration
 * moves RECEIVED -> REVIEWED -> {APPROVED, REJECTED} only through these.
 * REJECTED is terminal — re-submission means creating a NEW declaration.
 */
export const submitDeclarationReview = (id: string, note?: string) =>
  apiClient.post<ApiResponse<HealthDeclaration>>(`/port-health/declarations/${id}/submit-review/`, { note });

export const approveDeclaration = (id: string, note?: string) =>
  apiClient.post<ApiResponse<HealthDeclaration>>(`/port-health/declarations/${id}/approve/`, { note });

/** `rejection_reason` is mandatory and must be non-blank. */
export const rejectDeclaration = (id: string, rejectionReason: string) =>
  apiClient.post<ApiResponse<HealthDeclaration>>(`/port-health/declarations/${id}/reject/`, {
    rejection_reason: rejectionReason,
  });

export const getShipInspections = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ShipInspection>>>('/port-health/ship-inspections/', { params });

/**
 * `ShipInspectionCreate` omits the server-owned fields (`overall_status`,
 * `inspection_date`, `inspector`, `certificate_issued`), so the verdict can no
 * longer be supplied by the client even at the type level.
 */
export const createShipInspection = (data: ShipInspectionCreate) =>
  apiClient.post<ApiResponse<ShipInspection>>('/port-health/ship-inspections/', data);

export const getFoodWaterInspections = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FoodWaterInspection>>>('/port-health/food-water-inspections/', { params });

export const getSanitationCertificates = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<SanitationCertificate>>>('/port-health/sanitation-certificates/', { params });

export const getIsolationRecords = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<IsolationRecord>>>('/port-health/isolation-records/', { params });

export const getSurveillanceCases = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<SurveillanceCase>>>('/port-health/surveillance-cases/', { params });

export const getVectorControls = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<VectorControl>>>('/port-health/vector-controls/', { params });

export const getCargoInspections = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<CargoInspection>>>('/port-health/cargo-inspections/', { params });

export const getWasteInspections = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<WasteInspection>>>('/port-health/waste-inspections/', { params });

export const getPortEmergencies = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<PortEmergency>>>('/port-health/emergencies/', { params });

export const getHealthCertificates = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<HealthCertificate>>>('/port-health/certificates/', { params });
