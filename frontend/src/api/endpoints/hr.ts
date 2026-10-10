import apiClient from '../client';
import type { ApiResponse, PaginatedResponse } from '../../types/api';
import type {
  AttendanceRecord,
  AttendanceSummary,
  Employee,
  EmployeeDetail,
  EmployeeTimelineEntry,
  HrDashboard,
  HrEstablishment,
  HrPing,
  LeaveBalance,
  LeaveBalanceSummary,
  LeaveRequest,
  LeaveType,
  LinkableUser,
  PerformanceCycle,
  PerformanceKPI,
  PerformanceReview,
  TrainingEnrollment,
  TrainingPlan,
  PostingRequest,
  PostingStatusLogEntry,
} from '../../types/hr';

export const getHrPing = () => apiClient.get<ApiResponse<HrPing>>('/hr/ping/');

export const getEmployees = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<Employee>>>('/hr/employees/', { params });

export const getEmployee = (id: string) =>
  apiClient.get<ApiResponse<EmployeeDetail>>(`/hr/employees/${id}/`);

export const createEmployee = (payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<EmployeeDetail>>('/hr/employees/', payload);

export const updateEmployee = (id: string, payload: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<EmployeeDetail>>(`/hr/employees/${id}/`, payload);

export const getEmployeeTimeline = (id: string) =>
  apiClient.get<ApiResponse<EmployeeTimelineEntry[]>>(`/hr/employees/${id}/timeline/`);

export const getEmployeeTimelineList = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<EmployeeTimelineEntry>>>('/hr/employee-timeline/', {
    params,
  });

export const createTimelineEvent = (payload: Record<string, unknown>) =>
  apiClient.post<ApiResponse<EmployeeTimelineEntry>>('/hr/employee-timeline/', payload);

export const getHrDashboard = () => apiClient.get<ApiResponse<HrDashboard>>('/hr/dashboard/');

export const getHrEstablishments = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<HrEstablishment>>>('/hr/establishments/', { params });

export const getLinkableUsers = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<LinkableUser>>>('/hr/linkable-users/', { params });

export const getPostingRequests = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<PostingRequest>>>('/hr/posting-requests/', { params });

export const getPostingRequest = (id: string) =>
  apiClient.get<ApiResponse<PostingRequest>>(`/hr/posting-requests/${id}/`);

export const createPostingRequest = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<PostingRequest>>('/hr/posting-requests/', data);

export const updatePostingRequest = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<PostingRequest>>(`/hr/posting-requests/${id}/`, data);

export const submitPostingRequest = (id: string) =>
  apiClient.post<ApiResponse<PostingRequest>>(`/hr/posting-requests/${id}/submit/`, {});

export const cancelPostingRequest = (id: string, note = '') =>
  apiClient.post<ApiResponse<PostingRequest>>(`/hr/posting-requests/${id}/cancel/`, { note });

export const approvePostingRequest = (id: string, note = '') =>
  apiClient.post<ApiResponse<PostingRequest>>(`/hr/posting-requests/${id}/approve/`, { note });

export const rejectPostingRequest = (id: string, rejectionReason: string, note = '') =>
  apiClient.post<ApiResponse<PostingRequest>>(`/hr/posting-requests/${id}/reject/`, {
    rejectionReason,
    rejection_reason: rejectionReason,
    note,
  });

export const getPostingTimeline = (id: string) =>
  apiClient.get<ApiResponse<PostingStatusLogEntry[]>>(`/hr/posting-requests/${id}/timeline/`);

export const getAttendanceRecords = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<AttendanceRecord>>>('/hr/attendance/', { params });

export const createAttendanceRecord = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<AttendanceRecord>>('/hr/attendance/', data);

export const updateAttendanceRecord = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<AttendanceRecord>>(`/hr/attendance/${id}/`, data);

export const approveAttendanceRecord = (id: string, note = '') =>
  apiClient.post<ApiResponse<AttendanceRecord>>(`/hr/attendance/${id}/approve/`, { note });

export const unapproveAttendanceRecord = (id: string, note = '') =>
  apiClient.post<ApiResponse<AttendanceRecord>>(`/hr/attendance/${id}/unapprove/`, { note });

export const getMyAttendanceSummary = (days = 30) =>
  apiClient.get<ApiResponse<AttendanceSummary>>('/hr/attendance/summary/', { params: { days } });

export const getLeaveTypes = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<LeaveType>>>('/hr/leave-types/', { params });

export const getLeaveBalances = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<LeaveBalance>>>('/hr/leave-balances/', { params });

export const getMyLeaveSummary = (year?: number) =>
  apiClient.get<ApiResponse<LeaveBalanceSummary>>('/hr/leave-balances/summary/', {
    params: year ? { year } : undefined,
  });

export const getLeaveRequests = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<LeaveRequest>>>('/hr/leave-requests/', { params });

export const getLeaveRequest = (id: string) =>
  apiClient.get<ApiResponse<LeaveRequest>>(`/hr/leave-requests/${id}/`);

export const createLeaveRequest = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<LeaveRequest>>('/hr/leave-requests/', data);

export const submitLeaveRequest = (id: string) =>
  apiClient.post<ApiResponse<LeaveRequest>>(`/hr/leave-requests/${id}/submit/`, {});

export const cancelLeaveRequest = (id: string, note = '') =>
  apiClient.post<ApiResponse<LeaveRequest>>(`/hr/leave-requests/${id}/cancel/`, { note });

export const approveLeaveRequest = (id: string, note = '') =>
  apiClient.post<ApiResponse<LeaveRequest>>(`/hr/leave-requests/${id}/approve/`, { note });

export const rejectLeaveRequest = (id: string, rejectionReason: string, note = '') =>
  apiClient.post<ApiResponse<LeaveRequest>>(`/hr/leave-requests/${id}/reject/`, {
    rejectionReason,
    rejection_reason: rejectionReason,
    note,
  });

export const getTrainingPlans = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<TrainingPlan>>>('/hr/training-plans/', { params });

export const getTrainingEnrollments = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<TrainingEnrollment>>>('/hr/training-enrollments/', { params });

export const getTrainingEnrollment = (id: string) =>
  apiClient.get<ApiResponse<TrainingEnrollment>>(`/hr/training-enrollments/${id}/`);

export const createTrainingEnrollment = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<TrainingEnrollment>>('/hr/training-enrollments/', data);

export const submitTrainingEnrollment = (id: string) =>
  apiClient.post<ApiResponse<TrainingEnrollment>>(`/hr/training-enrollments/${id}/submit/`, {});

export const approveTrainingEnrollment = (id: string, note = '') =>
  apiClient.post<ApiResponse<TrainingEnrollment>>(`/hr/training-enrollments/${id}/approve/`, { note });

export const rejectTrainingEnrollment = (id: string, rejectionReason: string, note = '') =>
  apiClient.post<ApiResponse<TrainingEnrollment>>(`/hr/training-enrollments/${id}/reject/`, {
    rejectionReason, rejection_reason: rejectionReason, note,
  });

export const completeTrainingEnrollment = (id: string, score: number, certificateRef = '') =>
  apiClient.post<ApiResponse<TrainingEnrollment>>(`/hr/training-enrollments/${id}/complete/`, {
    score, certificate_ref: certificateRef,
  });

export const getPerformanceCycles = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<PerformanceCycle>>>('/hr/performance-cycles/', { params });

export const createPerformanceCycle = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<PerformanceCycle>>('/hr/performance-cycles/', data);

export const getPerformanceCycle = (id: string) =>
  apiClient.get<ApiResponse<PerformanceCycle>>(`/hr/performance-cycles/${id}/`);

export const getCycleKpis = (id: string) =>
  apiClient.get<ApiResponse<PerformanceKPI[]>>(`/hr/performance-cycles/${id}/kpis/`);

export const addCycleKpi = (id: string, data: { name: string; weight: number; description?: string }) =>
  apiClient.post<ApiResponse<PerformanceKPI>>(`/hr/performance-cycles/${id}/kpis/`, data);

export const deleteCycleKpi = (kpiId: string) =>
  apiClient.delete(`/hr/performance-cycle-kpis/${kpiId}/`);

export const openPerformanceCycle = (id: string) =>
  apiClient.post<ApiResponse<PerformanceCycle>>(`/hr/performance-cycles/${id}/open/`, {});

export const closePerformanceCycle = (id: string, note = '') =>
  apiClient.post<ApiResponse<PerformanceCycle>>(`/hr/performance-cycles/${id}/close/`, { note });

export const getPerformanceReviews = (params?: Record<string, unknown>) =>
  apiClient.get<ApiResponse<PaginatedResponse<PerformanceReview>>>('/hr/performance-reviews/', { params });

export const getPerformanceReview = (id: string) =>
  apiClient.get<ApiResponse<PerformanceReview>>(`/hr/performance-reviews/${id}/`);

export const createPerformanceReview = (data: Record<string, unknown>) =>
  apiClient.post<ApiResponse<PerformanceReview>>('/hr/performance-reviews/', data);

export const updatePerformanceReview = (id: string, data: Record<string, unknown>) =>
  apiClient.patch<ApiResponse<PerformanceReview>>(`/hr/performance-reviews/${id}/`, data);

export const submitPerformanceReview = (id: string) =>
  apiClient.post<ApiResponse<PerformanceReview>>(`/hr/performance-reviews/${id}/submit/`, {});

export const approvePerformanceReview = (id: string, note = '') =>
  apiClient.post<ApiResponse<PerformanceReview>>(`/hr/performance-reviews/${id}/approve/`, { note });

export const rejectPerformanceReview = (id: string, rejectionReason: string, note = '') =>
  apiClient.post<ApiResponse<PerformanceReview>>(`/hr/performance-reviews/${id}/reject/`, {
    rejectionReason, rejection_reason: rejectionReason, note,
  });

export const returnPerformanceReview = (id: string, note = '') =>
  apiClient.post<ApiResponse<PerformanceReview>>(`/hr/performance-reviews/${id}/return_for_revision/`, { note });
