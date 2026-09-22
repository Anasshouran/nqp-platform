import { useCallback } from 'react';
import { useApi } from './useApi';
import {
  getTravelers,
  getTraveler,
  getTravelerStatus,
  getTravelerTimeline,
  getTravelerDeclaration,
} from '../api/endpoints/travelers';
import type { Traveler } from '../types/traveler';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type {
  TravelerStatusResult,
  TravelerStatusLog,
  TravelerDeclaration,
} from '../api/endpoints/travelers';

export interface UseTravelersOptions {
  params?: Record<string, unknown>;
  autoFetch?: boolean;
}

export const useTravelers = (options: UseTravelersOptions = {}) => {
  const { params, autoFetch = true } = options;

  const fetchTravelers = useCallback(
    async () => (await getTravelers(params)).data,
    [params]
  );

  const fallback = useCallback(
    async (): Promise<ApiResponse<PaginatedResponse<Traveler>>> => ({
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
  } = useApi<ApiResponse<PaginatedResponse<Traveler>>>(
    autoFetch ? fetchTravelers : fallback
  );

  const travelers = response?.data?.results ?? [];
  const count = response?.data?.count ?? 0;

  return { travelers, count, loading, error, retry };
};

export const useTravelerDetail = (id: string | null) => {
  const fetchTraveler = useCallback(
    async () => (await getTraveler(id!)).data,
    [id]
  );

  const fallback = useCallback(
    async (): Promise<ApiResponse<Traveler>> => ({
      data: { id: '', passport_number: '', first_name: '', last_name: '', full_name: '', date_of_birth: '', nationality: '', phone: '', email: '', medical_history: {}, registration_status: '', rejection_reason: '', created_at: '', updated_at: '' },
      status: 'success',
    }),
    []
  );

  const { data: response, loading, error, retry } = useApi<ApiResponse<Traveler>>(
    id ? fetchTraveler : fallback
  );

  return { traveler: response?.data ?? null, loading, error, retry };
};

export const useTravelerStatus = (id: string | null) => {
  const fetchStatus = useCallback(
    async () => (await getTravelerStatus(id!)).data,
    [id]
  );

  const fallback = useCallback(
    async (): Promise<ApiResponse<TravelerStatusResult>> => ({
      data: { registration_status: '', qr_code_issued: false, rejection_reason: null, action_required: false },
      status: 'success',
    }),
    []
  );

  const { data: response, loading, error, retry } = useApi<ApiResponse<TravelerStatusResult>>(
    id ? fetchStatus : fallback
  );

  return { status: response?.data ?? null, loading, error, retry };
};

export const useTravelerTimeline = (id: string | null) => {
  const fetchTimeline = useCallback(
    async () => (await getTravelerTimeline(id!)).data,
    [id]
  );

  const fallback = useCallback(
    async (): Promise<ApiResponse<TravelerStatusLog[]>> => ({
      data: [],
      status: 'success',
    }),
    []
  );

  const { data: response, loading, error, retry } = useApi<ApiResponse<TravelerStatusLog[]>>(
    id ? fetchTimeline : fallback
  );

  return { timeline: response?.data ?? [], loading, error, retry };
};

export const useTravelerDeclaration = (id: string | null) => {
  const fetchDeclaration = useCallback(
    async () => (await getTravelerDeclaration(id!)).data,
    [id]
  );

  const fallback = useCallback(
    async (): Promise<ApiResponse<TravelerDeclaration>> => ({
      data: { declared: false, submitted_at: null },
      status: 'success',
    }),
    []
  );

  const { data: response, loading, error, retry } = useApi<ApiResponse<TravelerDeclaration>>(
    id ? fetchDeclaration : fallback
  );

  return { declaration: response?.data ?? null, loading, error, retry };
};