import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  FinanceAuditLog,
  FinanceFee,
  FinanceInvoice,
  FinancePayment,
  FinanceReceipt,
  FinanceReceiptPrint,
  FinanceReconciliation,
  ReconciliationPreview,
  FinanceSummaryReport,
  MonthlyRevenueReport,
  NationalRevenueTree,
  OverdueInvoice,
  ByChannelReport,
  VariationReport,
  MatrixReport,
  ArrearsAgingReport,
} from '../../types/finance';
import apiClient from '../client';

/* بنود الرسوم (Master Data) */
export const getFinanceFees = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FinanceFee>>>('/finance/fees/', { params });

export const createFinanceFee = (data: Partial<FinanceFee>) =>
  apiClient.post<ApiResponse<FinanceFee>>('/finance/fees/', data);

export const updateFinanceFee = (id: string, data: Partial<FinanceFee>) =>
  apiClient.patch<ApiResponse<FinanceFee>>(`/finance/fees/${id}/`, data);

export const deactivateFinanceFee = (id: string) =>
  apiClient.delete(`/finance/fees/${id}/`);

/* الفواتير الموحدة + دورة الحياة */
export const getFinanceInvoices = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FinanceInvoice>>>('/finance/invoices/', { params });

export const payFinanceInvoice = (id: string, payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<FinanceInvoice>>(`/finance/invoices/${id}/pay/`, payload);

export const reviewFinanceInvoice = (id: string) =>
  apiClient.post<ApiResponse<FinanceInvoice>>(`/finance/invoices/${id}/review/`);

export const cancelFinanceInvoice = (id: string, payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<FinanceInvoice>>(`/finance/invoices/${id}/cancel/`, payload);

export const refundFinanceInvoice = (id: string, payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<FinanceInvoice>>(`/finance/invoices/${id}/refund/`, payload);

/* التحصيل والإيصالات */
export const getFinancePayments = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FinancePayment>>>('/finance/payments/', { params });

export const getFinanceReceipts = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FinanceReceipt>>>('/finance/receipts/', { params });

export const getFinanceReceiptPrint = (id: string) =>
  apiClient.get<ApiResponse<FinanceReceiptPrint>>(`/finance/receipts/${id}/print/`);

/* التسويات */
export const getFinanceReconciliations = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FinanceReconciliation>>>('/finance/reconciliations/', { params });

export const createFinanceReconciliation = (payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<FinanceReconciliation>>('/finance/reconciliations/', payload);

export const getFinanceReconciliationPreview = (params: Record<string, unknown>) =>
  apiClient.get<ApiResponse<ReconciliationPreview>>('/finance/reconciliations/preview/', { params });

export const sealFinanceReconciliation = (id: string, payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<FinanceReconciliation>>(`/finance/reconciliations/${id}/seal/`, payload);

export const resolveFinanceReconciliation = (id: string, payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<FinanceReconciliation>>(`/finance/reconciliations/${id}/resolve/`, payload);

/* سجل التدقيق المالي */
export const getFinanceAuditLogs = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FinanceAuditLog>>>('/finance/audit-logs/', { params });

/* التقارير المالية */
export const getFinanceSummary = () =>
  apiClient.get<ApiResponse<FinanceSummaryReport>>('/finance/reports/summary/');

export const getFinanceMonthly = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<MonthlyRevenueReport>>('/finance/reports/monthly/', { params });

export const getFinanceNational = () =>
  apiClient.get<ApiResponse<NationalRevenueTree>>('/finance/reports/national/');

export const getFinanceArrears = () =>
  apiClient.get<ApiResponse<{ items: OverdueInvoice[]; total: number }>>('/finance/reports/arrears/');

export const getFinanceByChannel = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<ByChannelReport>>('/finance/reports/by-channel/', { params });

export const getFinanceVariation = () =>
  apiClient.get<ApiResponse<VariationReport>>('/finance/reports/variation/');

export const getFinanceMatrix = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<MatrixReport>>('/finance/reports/matrix/', { params });

export const getFinanceArrearsAging = () =>
  apiClient.get<ApiResponse<ArrearsAgingReport>>('/finance/reports/arrears-aging/');

export const getFinanceReportsExport = (params?: Record<string, unknown>) =>
  apiClient.get<string>('/finance/reports/export/', { params, responseType: 'blob' });