import apiClient from '../client';
import type { ApiResponse } from '../../types/api';

export type ServiceAudience = 'PUBLIC' | 'INDIVIDUAL' | 'BUSINESS' | 'GOVERNMENT' | 'EMPLOYEE';

export type IdentityProvider = 'NONE' | 'CREDENTIALS';

export type ServiceStatus = 'ACTIVE' | 'COMING_SOON';

export interface Service {
  id: string;
  code: string;
  category: string;
  category_code: string;
  name_ar: string;
  name_en?: string;
  description_ar?: string;
  icon: string;
  route?: string;
  external_url?: string;
  audience: ServiceAudience;
  requires_auth: boolean;
  identity_provider: IdentityProvider;
  target_system?: string;
  status: ServiceStatus;
  sort_order?: number;
  is_active: boolean;
}

export interface ServiceCategory {
  id: string;
  code: string;
  name_ar: string;
  name_en?: string;
  description_ar?: string;
  icon: string;
  sort_order?: number;
  is_active: boolean;
  sector_codes?: string[];
  services: Service[];
}

export const getServiceCategories = (params?: { sector?: string }) =>
  apiClient.get<ApiResponse<ServiceCategory[]>>('/public/service-categories/', { params });

export const getServices = (params?: { category?: string; search?: string }) =>
  apiClient.get<ApiResponse<Service[]>>('/public/services/', { params });

export const getService = (code: string) =>
  apiClient.get<ApiResponse<Service>>(`/public/services/${code}/`);
