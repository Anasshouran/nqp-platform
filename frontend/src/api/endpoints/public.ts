import apiClient from '../client';
import type { AxiosResponse } from 'axios';
import type { ApiResponse, PaginatedResponse } from '../../types/api';

export interface Sector {
  id: string;
  code: string;
  slug?: string;
  name_ar: string;
  name_en: string;
  description_ar?: string;
  description_en?: string;
  region: string;
  color: string;
  ports_count: number;
  phone?: string;
  email?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  logo?: string | null;
  website?: string;
  working_hours?: string;
  is_active: boolean;
}

export interface PublicPort {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  type: 'AIRPORT' | 'SEAPORT' | 'LAND_PORT';
  country_code?: string;
  country_name?: string;
  location_geo?: Record<string, unknown>;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  image?: string | null;
  published_at?: string | null;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface CmsDocument {
  id: string;
  title: string;
  description?: string;
  category: string;
  file: string;
  file_name?: string | null;
  file_size?: number | null;
  file_type?: string | null;
}

export interface PublicDisease {
  id: string;
  icd_11_code: string;
  name_ar: string;
  name_en: string;
  description?: string;
  symptoms?: string[];
  incubation_period_min?: number | null;
  incubation_period_max?: number | null;
  transmission_methods?: string[];
  ihr_category?: string;
}

export interface HealthNotice {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  published_at: string;
  expiry_date?: string | null;
}

export interface TravelRequirement {
  country_code: string;
  country_name_ar: string;
  country_name_en: string;
  risk_level: string;
  requirements: Array<{ title: string; description: string; priority: string }>;
}

export interface PublicCountry {
  code: string;
  name: string;
  name_ar: string;
  risk_level: string;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
}

export const getCmsPage = (slug: string, sector?: string) =>
  apiClient.get<ApiResponse<CmsPage>>(`/cms/pages/${slug}/`, {
    params: sector ? { sector } : undefined,
  });

export interface DirectorProfile {
  id: string;
  name_ar: string;
  name_en: string;
  title: string;
  qualification: string;
  specialization: string;
  summary: string;
  message?: string | null;
  photo?: string | null;
  is_confirmed?: boolean;
  confirmation_note?: string | null;
}

export const getDirectorProfile = async (sectorCode?: string) => {
  const response = await apiClient.get<ApiResponse<DirectorProfile>>('/cms/director/current/', {
    params: sectorCode ? { sector: sectorCode } : undefined,
  });
  return response.data.data;
};

export const getCountries = () =>
  apiClient.get<ApiResponse<PublicCountry[]>>('/public/countries/');

let sectorsPromise: Promise<AxiosResponse<ApiResponse<Sector[]>>> | null = null;

export const getSectors = () => {
  sectorsPromise ??= apiClient.get<ApiResponse<Sector[]>>('/public/sectors/');
  return sectorsPromise;
};

export const getSector = (id: string) =>
  apiClient.get<ApiResponse<Sector>>(`/public/sectors/${id}/`);

const sectorPortsPromises = new Map<string, Promise<AxiosResponse<ApiResponse<PublicPort[]>>>>();

export const getSectorPorts = (id: string) => {
  let promise = sectorPortsPromises.get(id);
  if (!promise) {
    promise = apiClient.get<ApiResponse<PublicPort[]>>(`/public/sectors/${id}/ports/`);
    sectorPortsPromises.set(id, promise);
  }
  return promise;
};

export const getPorts = () =>
  apiClient.get<ApiResponse<PublicPort[]>>('/public/ports/');

export const getPort = (id: string) =>
  apiClient.get<ApiResponse<PublicPort>>(`/public/ports/${id}/`);

export const getPortsMap = () =>
  apiClient.get<ApiResponse<Record<string, unknown>>>('/public/ports/map/');

export const getNews = async (sector?: string) => {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<NewsArticle>>>('/cms/news/', {
    params: sector ? { sector } : undefined,
  });
  return response.data.data.results;
};

export const getNewsById = async (id: string, sector?: string) => {
  const response = await apiClient.get<ApiResponse<NewsArticle>>(`/cms/news/${id}/`, {
    params: sector ? { sector } : undefined,
  });
  return response.data.data;
};

export const getFaq = async (sector?: string) => {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<FaqItem>>>('/cms/faq/', {
    params: sector ? { sector } : undefined,
  });
  return response.data.data.results;
};

export const getDocuments = async (sector?: string) => {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<CmsDocument>>>('/cms/documents/', {
    params: sector ? { sector } : undefined,
  });
  return response.data.data.results;
};

export interface ContactInfo {
  official_phone?: string;
  official_email?: string;
  address?: string;
  website?: string;
}

export const getContactSettings = async (sector?: string): Promise<ContactInfo> => {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<{ key: string; value: Record<string, unknown> }>>>(
    '/cms/settings/',
    { params: sector ? { sector } : undefined },
  );
  const item = response.data.data.results.find((s) => s.key === 'contact');
  const v = (item?.value ?? {}) as Record<string, string>;
  return {
    official_phone: v.official_phone ?? '',
    official_email: v.official_email ?? '',
    address: v.address ?? '',
    website: v.website ?? '',
  };
};

export const getDiseases = () =>
  apiClient.get<ApiResponse<PublicDisease[]>>('/public/diseases/');

let noticesPromise: Promise<AxiosResponse<ApiResponse<HealthNotice[]>>> | null = null;

export const getNotices = () => {
  noticesPromise ??= apiClient.get<ApiResponse<HealthNotice[]>>('/public/notices/');
  return noticesPromise;
};

export const getTravelRequirements = (country?: string) =>
  apiClient.get<ApiResponse<TravelRequirement[]>>('/public/travel-requirements/', {
    params: country ? { country } : undefined,
  });

export interface PublicFlight {
  flight_number: string;
  carrier_code: string;
  carrier_name: string;
  flight_type: string;
  origin_code: string;
  destination_code: string;
  destination_name: string;
  scheduled_departure?: string | null;
  scheduled_arrival?: string | null;
  status: string;
  status_label: string;
}

export const getFlightStatus = (flightNumber: string) =>
  apiClient.get<ApiResponse<PublicFlight[]>>('/public/flights/', {
    params: { flight_number: flightNumber },
  });

export interface FoodShipmentTrack {
  manifest_number: string;
  status: string;
  status_label: string;
  decision: string;
  port_code: string;
  port_name: string;
  arrival_date?: string | null;
  supplier_name: string;
  origin_country: string;
  vessel_name: string;
  total_weight_kg: number;
  products: Array<{ name: string; quantity: string | number }>;
  release_certificate: string;
  decided_at?: string | null;
}

export const trackFoodShipment = (reference: string) =>
  apiClient.get<ApiResponse<FoodShipmentTrack>>('/public/food/shipments/lookup/', {
    params: { reference },
  });

export interface CarrierRegistrationPayload {
  company_name: string;
  iata_code?: string;
  icao_code?: string;
  contact_name: string;
  email: string;
  phone?: string;
  address?: string;
  documents?: string[];
  requested_scopes?: string[];
}

export interface CarrierRegistrationResult {
  id: string;
  company_name: string;
  iata_code?: string;
  icao_code?: string;
  contact_name: string;
  email: string;
  status: string;
  created_at: string;
}

export const submitCarrierRegistration = (payload: CarrierRegistrationPayload) =>
  apiClient.post<ApiResponse<CarrierRegistrationResult>>('/carriers/registrations/', payload);

export interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export const sendContactMessage = (payload: ContactPayload) =>
  apiClient.post<ApiResponse<{ id: string }>>('/public/contact/', payload);

export interface TravelerLookupResult {
  found: boolean;
  error?: string;
  traveler_id?: string;
  passport_number?: string;
  full_name?: string;
  nationality?: string | null;
  registration_status?: string;
  qr_issued?: boolean;
  rejection_reason?: string | null;
}

export const lookupTraveler = (passport: string, dob: string) =>
  apiClient.get<ApiResponse<TravelerLookupResult>>('/public/lookup/', {
    params: { passport, dob },
  });

export interface QrVerifyPayload {
  traveler_id?: string;
  passport_hash?: string;
  issued_at?: string;
  expires_at?: string;
  signature?: string;
}

export interface QrVerifyResult {
  valid: boolean;
  reason?: string;
  traveler?: {
    passport_number: string;
    full_name: string;
    registration_status: string;
  };
}

export const verifyQr = (payload: QrVerifyPayload) =>
  apiClient.post<ApiResponse<QrVerifyResult>>('/public/verify-qr/', payload);

export interface DemoQrResult {
  qr_data: QrVerifyPayload;
  passport_number: string;
  full_name: string;
}

export const getDemoQr = () =>
  apiClient.get<ApiResponse<DemoQrResult>>('/public/demo-qr/');

export interface WebPushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export const getWebPushVapidKey = () =>
  apiClient.get<ApiResponse<{ vapid_public_key: string }>>('/public/webpush/vapid-key/');

export const subscribeWebPush = (payload: WebPushSubscriptionPayload) =>
  apiClient.post<ApiResponse<{ subscribed: boolean; id?: string }>>('/public/webpush/subscribe/', payload);

export interface CertificateVerifyResult {
  valid: boolean;
  reason?: string;
  certificate?: {
    certificate_number: string;
    traveler_name: string;
    passport_number: string;
    certificate_type: string;
    disease: string;
    issued_date: string;
    expiry_date: string | null;
  };
}

export const verifyCertificate = (certificate_number: string) =>
  apiClient.post<ApiResponse<CertificateVerifyResult>>('/public/verify-certificate/', {
    certificate_number,
  });

export interface LabResultTest {
  test_name: string;
  disease_name: string;
  outcome: string;
  outcome_label: string;
  result_value?: number | null;
  result_text: string;
  unit: string;
  reference_range: string;
  is_critical: boolean;
  approved_at: string | null;
}

export interface LabResultLookupResult {
  found: boolean;
  error?: string;
  sample?: {
    sample_number: string;
    verification_code: string;
    sample_type: string;
    sample_type_label: string;
    collected_at: string;
    public_issued_at: string | null;
    sector_name?: string | null;
    section_name?: string | null;
  };
  tests?: LabResultTest[];
}

export const lookupLabResult = (reference: string, code: string) =>
  apiClient.post<ApiResponse<LabResultLookupResult>>('/public/laboratory/results/lookup/', {
    reference,
    code,
  });

export interface PublicStatistics {
  period: string;
  sector?: string | null;
  entry_points: number;
  sectors: number;
  travelers: number;
  screenings: number;
  certificates: number;
  food_shipments: number;
  lab_samples: number;
  diseases: number;
  vector_activities: number;
  notices: number;
  news: number;
  faq: number;
}

export const getPublicStatistics = (
  params?: { sector?: string; period?: string },
) =>
  apiClient.get<ApiResponse<PublicStatistics>>('/public/statistics/', { params });

export interface PortStats {
  port_id: string;
  screenings_total: number;
  active_alerts: number;
  flights_total: number;
}

export const getPortStats = (id: string) =>
  apiClient.get<ApiResponse<PortStats>>(`/public/ports/${id}/stats/`);

export interface Circular {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  status: string;
  reference_number: string;
  published_at: string;
  author: string;
  reviewer: string;
  approver: string;
  attachment?: string | null;
}

export const getCirculars = async (sector?: string) => {
  const response = await apiClient.get<ApiResponse<PaginatedResponse<Circular>>>(
    '/cms/circulars/',
    { params: sector ? { sector } : undefined },
  );
  return response.data.data.results;
};

export const getCircularById = async (id: string, sector?: string) => {
  const response = await apiClient.get<ApiResponse<Circular>>(`/cms/circulars/${id}/`, {
    params: sector ? { sector } : undefined,
  });
  return response.data.data;
};

export interface SectorStatistics {
  sector: string;
  entry_points: number;
  screenings: number;
  certificates: number;
  food_shipments: number;
  lab_samples: number;
}

export const getSectorStatistics = (sectorId: string) =>
  apiClient.get<ApiResponse<SectorStatistics>>(`/public/sectors/${sectorId}/statistics/`);

export const getSectorNews = (sectorId: string) =>
  apiClient.get<ApiResponse<NewsArticle[]>>(`/public/sectors/${sectorId}/news/`);
