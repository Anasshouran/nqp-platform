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

export const getShipInspections = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ShipInspection>>>('/port-health/ship-inspections/', { params });

export const createShipInspection = (data: Partial<ShipInspection>) =>
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
