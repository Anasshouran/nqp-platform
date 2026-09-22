import apiClient from '../client';
import type { ApiResponse } from '../../types/api';

export type CmsContentRole =
  | 'writer'
  | 'reviewer'
  | 'approver'
  | 'admin'
  | 'none';

export type CmsWorkflowAction = 'submit' | 'reject' | 'approve' | 'publish' | 'archive';

export interface CmsWorkflowResponse<T> extends ApiResponse<T> {
  detail?: string;
}

export const cmsContentRole = (roleCode?: string | null): CmsContentRole => {
  switch (roleCode) {
    case 'SECTOR_CONTENT_APPROVER':
    case 'NATIONAL_CONTENT_ADMIN':
    case 'SECTOR_MANAGER':
    case 'SECTOR_HEAD':
    case 'IT_ADMIN':
    case 'ADMIN':
      return 'approver';
    case 'SECTOR_CONTENT_REVIEWER':
      return 'reviewer';
    case 'SECTOR_CONTENT_CONTRIBUTOR':
    case 'SECTOR_CONTENT_EDITOR':
      return 'writer';
    default:
      return 'none';
  }
};

export const cmsWorkflow = {
  submit: (endpoint: string, id: string) =>
    apiClient.post<CmsWorkflowResponse<unknown>>(`${endpoint}${id}/submit/`),
  reject: (endpoint: string, id: string) =>
    apiClient.post<CmsWorkflowResponse<unknown>>(`${endpoint}${id}/reject/`),
  approve: (endpoint: string, id: string) =>
    apiClient.post<CmsWorkflowResponse<unknown>>(`${endpoint}${id}/approve/`),
  publish: (endpoint: string, id: string) =>
    apiClient.post<CmsWorkflowResponse<unknown>>(`${endpoint}${id}/publish/`),
  archive: (endpoint: string, id: string) =>
    apiClient.post<CmsWorkflowResponse<unknown>>(`${endpoint}${id}/archive/`),
};

export const CMS_ENDPOINTS = {
  news: '/cms/news/',
  circulars: '/cms/circulars/',
  announcements: '/cms/announcements/',
} as const;

export type CmsEndpoint = (typeof CMS_ENDPOINTS)[keyof typeof CMS_ENDPOINTS];