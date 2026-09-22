import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  AccountingSummaryReport,
  ClerkDashboardData,
  ExportInspectionForm,
  FoodDecisionCertificate,
  FoodInspection,
  FoodInvoice,
  FoodOrderItem,
  FoodSample,
  FoodShipment,
  FoodShipmentEvent,
  InspectorWorkload,
  QuarantineFee,
  QuarantineFeeCategory,
  QuarantineFeeSchedule,
  SamplingPolicy,
  PublicPort,
  ShipmentAttachment,
  SupervisorStats,
  DeptHeadDashboard,
  SectorHeadDashboard,
  FoodDirectorDashboard,
} from '../../types/food';

export const getPublicPorts = () =>
  apiClient.get<ApiResponse<PublicPort[]>>('/public/ports/');

export const getShipments = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FoodShipment>>>('/food/shipments/', { params });

export const getShipment = (id: string) =>
  apiClient.get<ApiResponse<FoodShipment>>(`/food/shipments/${id}/`);

export const createShipment = (payload: Record<string, unknown>, asDraft = false) =>
  apiClient.post<ApiResponse<FoodShipment>>('/food/shipments/', { ...payload, as_draft: asDraft });

export const updateShipment = (id: string, payload: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<FoodShipment>>(`/food/shipments/${id}/`, payload);

export const deleteShipment = (id: string) =>
  apiClient.delete<ApiResponse<null>>(`/food/shipments/${id}/`);

export const submitShipment = (id: string, items?: FoodOrderItem[]) =>
  apiClient.post<ApiResponse<FoodShipment>>(`/food/shipments/${id}/submit/`, { items });

export const reviewShipment = (id: string, decision?: 'APPROVE' | 'RETURN') =>
  apiClient.post<ApiResponse<FoodShipment>>(`/food/shipments/${id}/review/`, { decision });

export const feePreview = (id: string) =>
  apiClient.get<ApiResponse<unknown>>(`/food/shipments/${id}/fee-preview/`);

export const getClerkStats = () =>
  apiClient.get<ApiResponse<ClerkDashboardData>>('/food/shipments/clerk-stats/');

export const uploadAttachment = (shipmentId: string, file: File, docType: string) => {
  const formData = new FormData();
  formData.append('shipment', shipmentId);
  formData.append('doc_type', docType);
  formData.append('file', file);
  return apiClient.post<ApiResponse<ShipmentAttachment>>(
    '/food/shipment-attachments/',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
};

export const deleteAttachment = (attachmentId: string) =>
  apiClient.delete<ApiResponse<null>>(`/food/shipment-attachments/${attachmentId}/`);

export const getShipmentTimeline = (id: string) =>
  apiClient.get<ApiResponse<FoodShipmentEvent[]>>(`/food/shipments/${id}/timeline/`);

export const updateDocumentStatus = (
  shipmentId: string,
  attachmentId: string,
  action: 'accept' | 'reject' | 'request-correction' | 'mark-received' | 'under-review',
  body: Record<string, unknown> = {},
) =>
  apiClient.post<ApiResponse<ShipmentAttachment>>(
    `/food/shipments/${shipmentId}/attachments/${attachmentId}/${action}/`,
    body,
  );


export const getExportForm = (id: string) =>
  apiClient.get<ApiResponse<ExportInspectionForm>>(`/food/shipments/${id}/export-form/`);

export const toDecision = (id: string) =>
  apiClient.post<ApiResponse<FoodShipment>>(`/food/shipments/${id}/to-decision/`, {});

export const getAccountingReport = (period = 'day') =>
  apiClient.get<ApiResponse<AccountingSummaryReport>>('/food/shipments/accounting/', { params: { period } });

export const getSamplingPolicies = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<SamplingPolicy>>>('/food/sampling-policies/', { params });

export const getInspections = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FoodInspection>>>('/food/inspections/', { params });

export const inspectShipment = (id: string, payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<FoodInspection>>(`/food/shipments/${id}/inspection/`, payload);

export const createSample = (id: string, payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<FoodSample>>(`/food/shipments/${id}/samples/`, payload);

export const getSamples = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FoodSample>>>('/food/samples/', { params });

export const assignInspector = (id: string, assigned_inspector: string) =>
  apiClient.post<ApiResponse<FoodShipment>>(`/food/shipments/${id}/assign-inspector/`, { assigned_inspector });

export const getInspectorsWorkload = () =>
  apiClient.get<ApiResponse<InspectorWorkload[]>>('/food/shipments/inspectors/');

export const getSupervisorStats = () =>
  apiClient.get<ApiResponse<SupervisorStats>>('/food/shipments/supervisor-stats/');

export const reviewInspection = (id: string, action: 'APPROVE' | 'RETURN', notes?: string) =>
  apiClient.post<ApiResponse<FoodInspection>>(`/food/inspections/${id}/review/`, { action, notes });

export const createInvoice = (id: string, items: Array<{ name: string; amount: number }>) =>
  apiClient.post<ApiResponse<FoodInvoice>>(`/food/shipments/${id}/invoice/`, { items });

export const payInvoice = (
  id: string,
  payload: { payment_method?: string; payment_reference?: string; notes?: string } = {},
) => apiClient.post<ApiResponse<FoodInvoice>>(`/food/shipments/${id}/pay/`, payload);

export const getInvoices = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FoodInvoice>>>('/food/invoices/', { params });

export const decideShipment = (id: string, decision: string, reason: string) =>
  apiClient.post<ApiResponse<FoodDecisionCertificate>>(`/food/shipments/${id}/decide/`, { decision, reason });

export const referShipment = (id: string, referred_from: string, referral_reference?: string) =>
  apiClient.post<ApiResponse<FoodShipment>>(`/food/shipments/${id}/refer/`, { referred_from, referral_reference });

export const getQuarantineFees = (year: number = 2025) =>
  apiClient.get<ApiResponse<QuarantineFeeSchedule>>('/food/quarantine-fees/', { params: { year } });
export const getDeptHeadDashboard = (period = 'MONTH') =>
  apiClient.get<ApiResponse<DeptHeadDashboard>>('/food/shipments/department-head-dashboard/', {
    params: { period },
  });

export const getSectorHeadDashboard = (period = 'MONTH') =>
  apiClient.get<ApiResponse<SectorHeadDashboard>>('/food/shipments/sector-head-dashboard/', {
    params: { period },
  });

export const getFoodDirectorDashboard = (period = 'MONTH') =>
  apiClient.get<ApiResponse<FoodDirectorDashboard>>('/food/shipments/food-director-dashboard/', {
    params: { period },
  });
