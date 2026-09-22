import { useCallback } from 'react';
import { useApi } from './useApi';
import {
  getScreenings,
  getScreening,
  createScreening,
} from '../api/endpoints/screening';
import type { HealthScreening } from '../types/screening';
import type { ApiResponse, PaginatedResponse } from '../types/api';

export interface UseScreeningOptions {
  params?: Record<string, unknown>;
  autoFetch?: boolean;
}

export const useScreening = (options: UseScreeningOptions = {}) => {
  const { params, autoFetch = true } = options;

  const fetchScreenings = useCallback(
    async () => (await getScreenings(params)).data,
    [params]
  );

  const fallback = useCallback(
    async (): Promise<ApiResponse<PaginatedResponse<HealthScreening>>> => ({
      data: { count: 0, next: null, previous: null, results: [] },
      status: 'success',
    }),
    []
  );

  const {
    data: response,
    loading,
    error,
    retry,
  } = useApi<ApiResponse<PaginatedResponse<HealthScreening>>>(
    autoFetch ? fetchScreenings : fallback
  );

  const screenings = response?.data?.results ?? [];
  const count = response?.data?.count ?? 0;

  return { screenings, count, loading, error, retry };
};

export const useScreeningDetail = (id: string | null) => {
  const fetchScreening = useCallback(
    async () => (await getScreening(id!)).data,
    [id]
  );

  const fallback = useCallback(
    async (): Promise<ApiResponse<HealthScreening>> => ({
      data: { id: '', traveler: null, traveler_name: '', passport_number: '', port: null, officer: null, body_temperature: null, oxygen_saturation: null, systolic_bp: null, diastolic_bp: null, observed_symptoms: [], officer_notes: '', screened_at: '' },
      status: 'success',
    }),
    []
  );

  const { data: response, loading, error, retry } = useApi<ApiResponse<HealthScreening>>(
    id ? fetchScreening : fallback
  );

  return { screening: response?.data ?? null, loading, error, retry };
};

export { createScreening };