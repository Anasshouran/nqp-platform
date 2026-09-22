import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  AnalysisCertificate,
  AnalyticalMethod,
  ApplicableLimits,
  ApplicableStandardResponse,
  AuditLog,
  ChainOfCustody,
  ChemistryDashboard,
  CpaRecord,
  DisposalRequest,
  FoodInspection,
  FoodLabDashboard,
  FoodProduct,
  FoodSample,
  FoodSampleInput,
  LabDirectorDashboard,
  LabEquipment,
  LabParameter,
  MaterialCatalog,
  MaterialIssue,
  MaterialLot,
  MaterialManagementDashboard,
  MicrobiologicalSpecification,
  MicroDashboard,
  MicroEvaluation,
  MicroUnitInput,
  Microorganism,
  NonConformity,
  QaDashboard,
  QCRecord,
  ReceptionDashboard,
  ReferenceSample,
  StationDashboardItem,
  ReferenceSampleInput,
  Reagent,
  RegulatoryRule,
  SampleInvoice,
  SampleSource,
  SampleTest,
  Solution,
  Standard,
  StandardRequirement,
  StandardVersion,
  StandardsComparison,
  StandardsDashboard,
  StandardsEvaluation,
  StorageLocation,
  WorkloadItem,
} from '../../types/food';

export const getLabInspections = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FoodInspection>>>('/food/inspections/', { params });

export const getLabSamples = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FoodSample>>>('/food/samples/', { params });

export const getLabSample = (id: string) =>
  apiClient.get<ApiResponse<FoodSample>>(`/food/samples/${id}/`);

export const createLabSample = (data: FoodSampleInput) =>
  apiClient.post<ApiResponse<FoodSample>>('/food/samples/', data);

export const deleteLabSample = (id: string) =>
  apiClient.delete(`/food/samples/${id}/`);

export const setSampleParameters = (id: string, parameters: string[]) =>
  apiClient.post<ApiResponse<{ added: number; status: string }>>(`/food/samples/${id}/set-parameters/`, { parameters });

export const setSamplePriority = (id: string, priority: string) =>
  apiClient.post<ApiResponse<FoodSample>>(`/food/samples/${id}/set-priority/`, { priority });

export const updateLabSample = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<FoodSample>>(`/food/samples/${id}/`, data);

/* سلسلة الحيازة — خطوات دورة العمل */
export const coordinateSample = (id: string, coordinator: string) =>
  apiClient.post<ApiResponse<FoodSample>>(`/food/samples/${id}/coordinate/`, { coordinator });

/* قرار الاستلام: قبول / قبول مشروط / رفض */
export const acceptSample = (id: string, receptionNote?: string, checklist?: Record<string, boolean>) =>
  apiClient.post<ApiResponse<FoodSample>>(`/food/samples/${id}/accept/`, {
    reception_note: receptionNote ?? '',
    reception_checklist: checklist ?? {},
  });

export const conditionalAcceptSample = (id: string, receptionNote?: string, checklist?: Record<string, boolean>) =>
  apiClient.post<ApiResponse<FoodSample>>(`/food/samples/${id}/conditional-accept/`, {
    reception_note: receptionNote ?? '',
    reception_checklist: checklist ?? {},
  });

export const rejectSample = (id: string, rejectionReason: string, receptionNote?: string) =>
  apiClient.post<ApiResponse<FoodSample>>(`/food/samples/${id}/reject/`, {
    rejection_reason: rejectionReason,
    reception_note: receptionNote ?? '',
  });

export const assignSampleSection = (id: string, bench: string, departmentHead?: string) =>
  apiClient.post<ApiResponse<FoodSample>>(`/food/samples/${id}/assign-section/`, { bench, department_head: departmentHead });

export const assignSampleAnalyst = (id: string, analyst: string) =>
  apiClient.post<ApiResponse<FoodSample>>(`/food/samples/${id}/assign-analyst/`, { analyst });

export const transferSample = (id: string, data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<ChainOfCustody>>(`/food/samples/${id}/transfer/`, data);

export const submitForApproval = (id: string) =>
  apiClient.post<ApiResponse<FoodSample>>(`/food/samples/${id}/submit-for-approval/`);

export const approveSample = (id: string) =>
  apiClient.post<ApiResponse<FoodSample>>(`/food/samples/${id}/approve/`);

export const dispatchResult = (id: string, data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<FoodSample>>(`/food/samples/${id}/dispatch/`, data);

export const collectSampleFee = (id: string, feeAmount: number) =>
  apiClient.post<ApiResponse<FoodSample>>(`/food/samples/${id}/collect-fee/`, {
    fee_amount: feeAmount,
    collection_status: 'PAID',
  });

/* فاتورة رسوم العينة */
export const generateSampleInvoice = (id: string) =>
  apiClient.post<ApiResponse<SampleInvoice>>(`/food/samples/${id}/generate-invoice/`);

export const paySampleFee = (id: string, paymentReference?: string) =>
  apiClient.post<ApiResponse<SampleInvoice>>(`/food/samples/${id}/pay-sample-fee/`, {
    payment_reference: paymentReference ?? '',
  });

export const exemptSampleFee = (id: string, exemptionReason?: string) =>
  apiClient.post<ApiResponse<SampleInvoice>>(`/food/samples/${id}/exempt-sample-fee/`, {
    exemption_reason: exemptionReason ?? 'إعفاء حكومي معتمد',
  });

export const getSampleSlaStatus = (id: string) =>
  apiClient.get<ApiResponse<{ tests: Array<{ id: string; sla: string; tat_hours: number | null }> }>>(`/food/samples/${id}/sla-status/`);

export const reportSample = (id: string) =>
  apiClient.post<ApiResponse<{ sample_status: string; shipment_status: string; certificate_number?: string }>>(`/food/samples/${id}/report/`);

export const certifySample = (id: string) =>
  apiClient.post<ApiResponse<AnalysisCertificate>>(`/food/samples/${id}/certify/`);

export const getLabDashboard = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<FoodLabDashboard>>('/food/samples/dashboard/', { params });

export const getStationDashboard = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<StationDashboardItem[]>>('/food/samples/station-dashboard/', { params });

export const getReceptionDashboard = () =>
  apiClient.get<ApiResponse<ReceptionDashboard>>('/food/samples/reception-dashboard/');

export const enterSampleTestResult = (id: string, data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<SampleTest>>(`/food/sample-tests/${id}/enter-result/`, data);

export const saveSampleTestResult = (id: string, data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<SampleTest>>(`/food/sample-tests/${id}/save-result/`, data);

export const reviewSampleTest = (id: string, data?: Record<string, unknown>) =>
  apiClient.post<ApiResponse<SampleTest>>(`/food/sample-tests/${id}/review/`, data ?? {});

export const approveSampleTest = (id: string) =>
  apiClient.post<ApiResponse<SampleTest>>(`/food/sample-tests/${id}/approve/`);

export const reviseSampleTest = (id: string, data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<SampleTest>>(`/food/sample-tests/${id}/revise/`, data);

export const startSampleTest = (id: string) =>
  apiClient.post<ApiResponse<SampleTest>>(`/food/sample-tests/${id}/start/`);

export const returnSampleTest = (id: string, reason: string) =>
  apiClient.post<ApiResponse<SampleTest>>(`/food/sample-tests/${id}/return-result/`, { reason });

export const markSampleTestQC = (id: string, data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<SampleTest>>(`/food/sample-tests/${id}/mark-qc/`, data);

export const getLabSampleTests = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<SampleTest>>>('/food/sample-tests/', { params });

/* قسم الكيمياء — لوحة رئيس القسم */
export const getChemistryDashboard = () =>
  apiClient.get<ApiResponse<ChemistryDashboard>>('/food/samples/chemistry-dashboard/');

/* قسم الأحياء الدقيقة — لوحة رئيس القسم */
export const getMicroBiologyDashboard = () =>
  apiClient.get<ApiResponse<MicroDashboard>>('/food/samples/micro-dashboard/');

export const getMicroWorkload = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<{ bench: string; workload: WorkloadItem[] }>>('/food/sample-tests/analyst-workload/', { params });

/* مدير المختبر — لوحة تنفيذية شاملة */
export const getLabDirectorDashboard = () =>
  apiClient.get<ApiResponse<LabDirectorDashboard>>('/food/samples/lab-director-dashboard/');

export const getLabEquipment = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<LabEquipment>>>('/food/lab-equipment/', { params });

export const createLabEquipment = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<LabEquipment>>('/food/lab-equipment/', data);

export const updateLabEquipment = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<LabEquipment>>(`/food/lab-equipment/${id}/`, data);

export const deleteLabEquipment = (id: string) =>
  apiClient.delete(`/food/lab-equipment/${id}/`);

export const markLabEquipmentCalibrated = (id: string, nextDue?: string) =>
  apiClient.post<ApiResponse<LabEquipment>>(`/food/lab-equipment/${id}/mark-calibrated/`, {
    next_calibration_due: nextDue ?? '',
  });

/* النظام الوطني للمعايير الميكروبيولوجية — التقييم الآلي */
export const getApplicableLimits = (testId: string) =>
  apiClient.get<ApiResponse<ApplicableLimits>>(`/food/sample-tests/${testId}/applicable-limits/`);

export const evaluateSampleTest = (testId: string, data: { limit?: string; units: MicroUnitInput[] }) =>
  apiClient.post<ApiResponse<MicroEvaluation>>(`/food/sample-tests/${testId}/evaluate/`, data);

export const getLabParameters = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<LabParameter>>>('/food/parameters/', { params });

export const createLabParameter = (data: Partial<LabParameter>) =>
  apiClient.post<ApiResponse<LabParameter>>('/food/parameters/', data);

export const updateLabParameter = (id: string, data: Partial<LabParameter>) =>
  apiClient.patch<ApiResponse<LabParameter>>(`/food/parameters/${id}/`, data);

export const deleteLabParameter = (id: string) =>
  apiClient.delete<ApiResponse<null>>(`/food/parameters/${id}/`);

export const getMicroorganisms = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Microorganism>>>('/food/microorganisms/', { params });

export const getMicroSpecifications = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<MicrobiologicalSpecification>>>('/food/micro-specifications/', { params });

export const getCertificates = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<AnalysisCertificate>>>('/food/certificates/', { params });

/* مصادر العينات */
export const getSampleSources = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<SampleSource[]>>('/food/sample-sources/', { params });

export const createSampleSource = (data: Partial<SampleSource>) =>
  apiClient.post<ApiResponse<SampleSource>>('/food/sample-sources/', data);

export const updateSampleSource = (id: string, data: Partial<SampleSource>) =>
  apiClient.patch<ApiResponse<SampleSource>>(`/food/sample-sources/${id}/`, data);

export const deleteSampleSource = (id: string) =>
  apiClient.delete(`/food/sample-sources/${id}/`);

/* سجل الأصناف — جلب بيانات المنتج تلقائياً من الكتالوج */
export const getFoodProducts = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<FoodProduct>>>('/food/products/', { params });

/* العينات المرجعية */
export const getReferenceSamples = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<ReferenceSample[]>>('/food/reference-samples/', { params });

export const createReferenceSample = (data: ReferenceSampleInput) =>
  apiClient.post<ApiResponse<ReferenceSample>>('/food/reference-samples/', data);

export const deleteReferenceSample = (id: string) =>
  apiClient.delete(`/food/reference-samples/${id}/`);

export const retrieveReferenceSample = (id: string, remarks?: string) =>
  apiClient.post<ApiResponse<ReferenceSample>>(`/food/reference-samples/${id}/retrieve-ref/`, { remarks });

export const discardReferenceSample = (id: string, remarks?: string) =>
  apiClient.post<ApiResponse<ReferenceSample>>(`/food/reference-samples/${id}/discard/`, { remarks });

/* سلسلة الحيازة — الأحداث والاستلام */
export const getCustodyEvents = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<ChainOfCustody>>>('/food/chain-of-custody/', { params });

export const acknowledgeCustody = (id: string) =>
  apiClient.post<ApiResponse<ChainOfCustody>>(`/food/chain-of-custody/${id}/acknowledge/`);

/* ---------- إدارة الجودة (Quality Assurance) ---------- */
export const getQaDashboard = () =>
  apiClient.get<ApiResponse<QaDashboard>>('/food/qa/dashboard/');

export const getQcRecords = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<QCRecord>>>('/food/qa/qc-records/', { params });

export const createQcRecord = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<QCRecord>>('/food/qa/qc-records/', data);

export const updateQcRecord = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<QCRecord>>(`/food/qa/qc-records/${id}/`, data);

export const reviewQcRecord = (id: string, data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<QCRecord>>(`/food/qa/qc-records/${id}/review/`, data);

export const getReagents = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Reagent>>>('/food/qa/reagents/', { params });

export const createReagent = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<Reagent>>('/food/qa/reagents/', data);

export const updateReagent = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<Reagent>>(`/food/qa/reagents/${id}/`, data);

export const getNonConformities = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<NonConformity>>>('/food/qa/nonconformities/', { params });

export const createNonConformity = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<NonConformity>>('/food/qa/nonconformities/', data);

export const updateNonConformity = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<NonConformity>>(`/food/qa/nonconformities/${id}/`, data);

export const openCapa = (id: string, data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<CpaRecord>>(`/food/qa/nonconformities/${id}/open-capa/`, data);

export const closeNonConformity = (id: string) =>
  apiClient.post<ApiResponse<NonConformity>>(`/food/qa/nonconformities/${id}/close/`);

export const getCapaRecords = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<CpaRecord>>>('/food/qa/capa/', { params });

export const createCapaRecord = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<CpaRecord>>('/food/qa/capa/', data);

export const updateCapaRecord = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<CpaRecord>>(`/food/qa/capa/${id}/`, data);

export const verifyCloseCapa = (id: string, data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<CpaRecord>>(`/food/qa/capa/${id}/verify-close/`, data);

export const getAuditLogs = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<AuditLog>>>('/food/qa/audit-logs/', { params });

export const getMaterialManagementDashboard = () =>
  apiClient.get<ApiResponse<MaterialManagementDashboard>>('/food/reagent-management/dashboard/');

export const getExpiryReport = () =>
  apiClient.get<ApiResponse<{ expired: MaterialLot[]; expiring_30: MaterialLot[]; expiring_90: MaterialLot[] }>>('/food/reagent-management/expiry-report/');

export const getTraceability = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<{ issues: MaterialIssue[] }>>('/food/reagent-management/traceability/', { params });

export const getMaterials = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<MaterialCatalog>>>('/food/materials/', { params });

export const createMaterial = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<MaterialCatalog>>('/food/materials/', data);

export const updateMaterial = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<MaterialCatalog>>(`/food/materials/${id}/`, data);

export const getMaterialLots = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<MaterialLot>>>('/food/material-lots/', { params });

export const createMaterialLot = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<MaterialLot>>('/food/material-lots/', data);

export const updateMaterialLot = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<MaterialLot>>(`/food/material-lots/${id}/`, data);

export const getSolutions = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Solution>>>('/food/solutions/', { params });

export const createSolution = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<Solution>>('/food/solutions/', data);

export const updateSolution = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<Solution>>(`/food/solutions/${id}/`, data);

export const verifySolution = (id: string, data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<Solution>>(`/food/solutions/${id}/verify/`, data);

export const getMaterialIssues = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<MaterialIssue>>>('/food/material-issues/', { params });

export const createMaterialIssue = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<MaterialIssue>>('/food/material-issues/', data);

export const getDisposalRequests = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<DisposalRequest>>>('/food/disposal-requests/', { params });

export const createDisposalRequest = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<DisposalRequest>>('/food/disposal-requests/', data);

export const disposeRequestAction = (id: string, data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<DisposalRequest>>(`/food/disposal-requests/${id}/approve/`, data);

export const getStorageLocations = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<StorageLocation>>>('/food/storage-locations/', { params });

// ============================================================
//  المواصفات والمعايير (Standards & Compliance)
// ============================================================

export const getStandards = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Standard>>>('/food/standards/', { params });

export const createStandard = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<Standard>>('/food/standards/', data);

export const updateStandard = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<Standard>>(`/food/standards/${id}/`, data);

export const deleteStandard = (id: string) =>
  apiClient.delete(`/food/standards/${id}/`);

export const getStandardVersions = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<StandardVersion>>>('/food/standard-versions/', { params });

export const createStandardVersion = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<StandardVersion>>('/food/standard-versions/', data);

export const updateStandardVersion = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<StandardVersion>>(`/food/standard-versions/${id}/`, data);

export const getStandardRequirements = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<StandardRequirement>>>('/food/standard-requirements/', { params });

export const createStandardRequirement = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<StandardRequirement>>('/food/standard-requirements/', data);

export const updateStandardRequirement = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<StandardRequirement>>(`/food/standard-requirements/${id}/`, data);

export const getAnalyticalMethods = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<AnalyticalMethod>>>('/food/analytical-methods/', { params });

export const createAnalyticalMethod = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<AnalyticalMethod>>('/food/analytical-methods/', data);

export const updateAnalyticalMethod = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<AnalyticalMethod>>(`/food/analytical-methods/${id}/`, data);

export const getRegulatoryRules = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<RegulatoryRule>>>('/food/regulatory-rules/', { params });

export const createRegulatoryRule = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<RegulatoryRule>>('/food/regulatory-rules/', data);

export const updateRegulatoryRule = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<RegulatoryRule>>(`/food/regulatory-rules/${id}/`, data);

// Standards Management endpoints
export const getStandardsDashboard = () =>
  apiClient.get<ApiResponse<StandardsDashboard>>('/food/standards-management/dashboard/');

export const getStandardsComparison = (parameterId: string) =>
  apiClient.get<ApiResponse<StandardsComparison>>(`/food/standards-management/comparison/?parameter=${parameterId}`);

export const getApplicableStandard = (testId: string) =>
  apiClient.get<ApiResponse<ApplicableStandardResponse>>(`/food/standards-management/applicable-standard/?test=${testId}`);

export const evaluateStandard = (data: { test: string; result_value?: number; units?: MicroUnitInput[] }) =>
  apiClient.post<ApiResponse<StandardsEvaluation>>('/food/standards-management/evaluate/', data);

export const autoEvaluateStandard = (testId: string) =>
  apiClient.post<ApiResponse<{ test: SampleTest } & StandardsEvaluation>>(`/food/standards-management/auto-evaluate/`, { test: testId });