import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';

export type ContentStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

export interface CmsNews {
  id: string;
  title: string;
  title_en?: string;
  slug?: string;
  summary?: string;
  content: string;
  category: string;
  image?: string | null;
  status: ContentStatus;
  is_published: boolean;
  is_urgent?: boolean;
  is_featured?: boolean;
  keywords?: string[];
  expires_at?: string | null;
  published_at?: string | null;
  author?: string;
  reviewer?: string;
  approver?: string;
  sector?: string | null;
}

export interface CmsCircular {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  status: ContentStatus;
  reference_number?: string;
  published_at?: string | null;
  author?: string;
  reviewer?: string;
  approver?: string;
  attachment?: string | null;
  sector?: string | null;
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  sector?: string | null;
}

export interface CmsAnnouncement {
  id: string;
  title: string;
  title_en?: string;
  slug?: string;
  body: string;
  priority: string;
  audience?: string[];
  start_at?: string | null;
  end_at?: string | null;
  status: ContentStatus;
  is_published: boolean;
  published_at?: string | null;
  author?: string;
  reviewer?: string;
  approver?: string;
  sector?: string | null;
}

export interface CmsFaq {
  id: string;
  question: string;
  answer: string;
  order: number;
  is_active: boolean;
  sector?: string | null;
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
  is_active?: boolean;
  sector?: string | null;
}

export interface CmsSlider {
  id: string;
  title_ar?: string;
  title_en?: string;
  subtitle_ar?: string;
  subtitle_en?: string;
  image?: string | null;
  button_text?: string;
  button_link?: string;
  sort_order: number;
  is_active: boolean;
  sector?: string | null;
}

export interface CmsMedia {
  id: string;
  title: string;
  file: string;
  url?: string | null;
  kind: string;
  mime_type?: string;
  file_size?: number;
  sector?: string | null;
  created_at?: string;
}

export interface CmsSetting {
  id: string;
  key: string;
  value: Record<string, unknown>;
  sector?: string | null;
}

type Pag<T> = ApiResponse<PaginatedResponse<T>>;

const paramsOf = (params?: Record<string, unknown>) => (params ?? undefined);

export const getCmsNews = (params?: Record<string, unknown>) =>
  apiClient.get<Pag<CmsNews>>('/cms/news/', { params: paramsOf(params) });
export const getCmsNewsById = (id: string) =>
  apiClient.get<ApiResponse<CmsNews>>(`/cms/news/${id}/`);
export const createCmsNews = (data: Partial<CmsNews>) =>
  apiClient.post<ApiResponse<CmsNews>>('/cms/news/', data);
export const updateCmsNews = (id: string, data: Partial<CmsNews>) =>
  apiClient.patch<ApiResponse<CmsNews>>(`/cms/news/${id}/`, data);
export const deleteCmsNews = (id: string) => apiClient.delete(`/cms/news/${id}/`);

export const getCmsCirculars = (params?: Record<string, unknown>) =>
  apiClient.get<Pag<CmsCircular>>('/cms/circulars/', { params: paramsOf(params) });
export const createCmsCircular = (data: Partial<CmsCircular>) =>
  apiClient.post<ApiResponse<CmsCircular>>('/cms/circulars/', data);
export const updateCmsCircular = (id: string, data: Partial<CmsCircular>) =>
  apiClient.patch<ApiResponse<CmsCircular>>(`/cms/circulars/${id}/`, data);
export const deleteCmsCircular = (id: string) => apiClient.delete(`/cms/circulars/${id}/`);

export const getCmsAnnouncements = (params?: Record<string, unknown>) =>
  apiClient.get<Pag<CmsAnnouncement>>('/cms/announcements/', { params: paramsOf(params) });
export const createCmsAnnouncement = (data: Partial<CmsAnnouncement>) =>
  apiClient.post<ApiResponse<CmsAnnouncement>>('/cms/announcements/', data);
export const updateCmsAnnouncement = (id: string, data: Partial<CmsAnnouncement>) =>
  apiClient.patch<ApiResponse<CmsAnnouncement>>(`/cms/announcements/${id}/`, data);
export const deleteCmsAnnouncement = (id: string) => apiClient.delete(`/cms/announcements/${id}/`);

export const getCmsPages = (params?: Record<string, unknown>) =>
  apiClient.get<Pag<CmsPage>>('/cms/pages/', { params: paramsOf(params) });
export const createCmsPage = (data: Partial<CmsPage>) =>
  apiClient.post<ApiResponse<CmsPage>>('/cms/pages/', data);
export const updateCmsPage = (slug: string, data: Partial<CmsPage>) =>
  apiClient.patch<ApiResponse<CmsPage>>(`/cms/pages/${slug}/`, data);
export const deleteCmsPage = (slug: string) => apiClient.delete(`/cms/pages/${slug}/`);

export const getCmsFaq = (params?: Record<string, unknown>) =>
  apiClient.get<Pag<CmsFaq>>('/cms/faq/', { params: paramsOf(params) });
export const createCmsFaq = (data: Partial<CmsFaq>) =>
  apiClient.post<ApiResponse<CmsFaq>>('/cms/faq/', data);
export const updateCmsFaq = (id: string, data: Partial<CmsFaq>) =>
  apiClient.patch<ApiResponse<CmsFaq>>(`/cms/faq/${id}/`, data);
export const deleteCmsFaq = (id: string) => apiClient.delete(`/cms/faq/${id}/`);

export const getCmsDocuments = (params?: Record<string, unknown>) =>
  apiClient.get<Pag<CmsDocument>>('/cms/documents/', { params: paramsOf(params) });
export const createCmsDocument = (data: FormData) =>
  apiClient.post<ApiResponse<CmsDocument>>('/cms/documents/', data);
export const updateCmsDocument = (id: string, data: FormData) =>
  apiClient.patch<ApiResponse<CmsDocument>>(`/cms/documents/${id}/`, data);
export const deleteCmsDocument = (id: string) => apiClient.delete(`/cms/documents/${id}/`);

export const getCmsSliders = (params?: Record<string, unknown>) =>
  apiClient.get<Pag<CmsSlider>>('/cms/sliders/', { params: paramsOf(params) });
export const createCmsSlider = (data: Partial<CmsSlider>) =>
  apiClient.post<ApiResponse<CmsSlider>>('/cms/sliders/', data);
export const updateCmsSlider = (id: string, data: Partial<CmsSlider>) =>
  apiClient.patch<ApiResponse<CmsSlider>>(`/cms/sliders/${id}/`, data);
export const deleteCmsSlider = (id: string) => apiClient.delete(`/cms/sliders/${id}/`);

export const getCmsMedia = (params?: Record<string, unknown>) =>
  apiClient.get<Pag<CmsMedia>>('/cms/media/', { params: paramsOf(params) });
export const uploadCmsMedia = (data: FormData) =>
  apiClient.post<ApiResponse<CmsMedia>>('/cms/media/', data);
export const deleteCmsMedia = (id: string) => apiClient.delete(`/cms/media/${id}/`);

export const getCmsSettings = (params?: Record<string, unknown>) =>
  apiClient.get<Pag<CmsSetting>>('/cms/settings/', { params: paramsOf(params) });
export const upsertCmsSetting = (data: { key: string; value: Record<string, unknown> }) =>
  apiClient.post<ApiResponse<CmsSetting>>('/cms/settings/', data);
