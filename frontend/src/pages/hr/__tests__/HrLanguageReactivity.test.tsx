/**
 * HR Round 2 — language reactivity (Phase 5a).
 */
import type { ReactNode } from 'react';
import { describe, it, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import i18n from '../../../i18n';
import authReducer from '../../../store/slices/authSlice';
import arLocale from '../../../i18n/locales/ar.json';
import enLocale from '../../../i18n/locales/en.json';

i18n.addResourceBundle('ar', 'translation', arLocale, true, true);
i18n.addResourceBundle('en', 'translation', enLocale, true, true);

import EmployeeTimelinePage from '../EmployeeTimelinePage';
import TrainingEnrollmentsPage from '../TrainingEnrollmentsPage';
import LeaveRequestsPage from '../LeaveRequestsPage';
import EstablishmentsPage from '../EstablishmentsPage';
import PerformanceReviewsPage from '../PerformanceReviewsPage';
import PostingRequestsPage from '../PostingRequestsPage';
import PerformanceCycleDetailPage from '../PerformanceCycleDetailPage';
import PostingRequestDetailPage from '../PostingRequestDetailPage';
import AttendanceRecordsPage from '../AttendanceRecordsPage';
import EmployeesPage from '../EmployeesPage';
import PerformanceReviewDetailPage from '../PerformanceReviewDetailPage';
import LeaveRequestDetailPage from '../LeaveRequestDetailPage';
import HrDashboardPage from '../HrDashboardPage';
import PerformanceCyclesPage from '../PerformanceCyclesPage';
import TrainingDetailPage from '../TrainingDetailPage';
import EmployeeDetailPage from '../EmployeeDetailPage';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
  };
});

vi.mock('../../../api/endpoints/organization', () => ({
  getDepartments: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
}));

vi.mock('../../../api/endpoints/hr', () => ({
  getEmployeeTimelineList: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getTrainingEnrollments: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getLeaveRequests: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getHrEstablishments: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getPerformanceReviews: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getPerformanceCycles: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  getPostingRequests: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getPerformanceReview: vi.fn().mockResolvedValue({ data: { data: {
    id: '1', employee_name: 'أحمد علي', cycle_name: 'الدورة الأولى',
    total_score: 85, rating: 4, status: 'DRAFT', cycle_kpis: [],
    reviewed_by_name: 'ماري विलيم', decided_by_name: null, decided_at: null,
    strengths: '', improvements: '', comments: '', rejection_reason: null
  } } }),
  getPerformanceCycle: vi.fn().mockResolvedValue({ data: { data: {
    id: '1', name: 'الدورة الأولى', period_start: '2026-01-01', period_end: '2026-12-31',
    status: 'OPEN', review_count: 5, approved_count: 3
  } } }),
  getCycleKpis: vi.fn().mockResolvedValue({ data: { data: [] } }),
  getPostingRequest: vi.fn().mockResolvedValue({ data: { data: {
    id: '1', employee_name: 'أحمد علي', employee_number: 'E001',
    kind: 'TRANSFER', kind_display: 'نقل', status: 'PENDING', status_display: 'قيد الانتظار',
    target_summary: 'القسم الزراعي', effective_date: '2026-01-15',
    reason: 'نقل داخلي', requested_by: '1', requested_by_name: 'أحمد علي',
    is_self_service: false, is_approver: false,
    decided_by_name: null, decided_at: null, decision_note: null,
    rejection_reason: null,
    status_logs: []
  } } }),
  getAttendanceRecords: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getEmployees: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getLeaveRequest: vi.fn().mockResolvedValue({ data: { data: {
    id: '1', employee_name: 'أحمد علي', employee_number: 'E001',
    leave_type_name: 'إجازة سنوية', days: 5, start_date: '2026-01-10', end_date: '2026-01-14',
    status: 'PENDING', status_display: 'قيد الانتظار', document: null,
    leave_type_requires_document: false, is_self_service: false, is_half_day: false,
    leave_type_is_paid: true, reason: 'إجازة شخصية',
    requested_by: '1', requested_by_name: 'أحمد علي',
    decided_by_name: null, decided_at: null, decision_note: null,
    rejection_reason: null, status_logs: []
  } } }),
  approvePerformanceReview: vi.fn().mockResolvedValue({}),
  rejectPerformanceReview: vi.fn().mockResolvedValue({}),
  returnPerformanceReview: vi.fn().mockResolvedValue({}),
  submitPerformanceReview: vi.fn().mockResolvedValue({}),
  updatePerformanceReview: vi.fn().mockResolvedValue({}),
  approvePostingRequest: vi.fn().mockResolvedValue({}),
  rejectPostingRequest: vi.fn().mockResolvedValue({}),
  cancelPostingRequest: vi.fn().mockResolvedValue({}),
  submitPostingRequest: vi.fn().mockResolvedValue({}),
  approveAttendanceRecord: vi.fn().mockResolvedValue({}),
  unapproveAttendanceRecord: vi.fn().mockResolvedValue({}),
  approveLeaveRequest: vi.fn().mockResolvedValue({}),
  rejectLeaveRequest: vi.fn().mockResolvedValue({}),
  cancelLeaveRequest: vi.fn().mockResolvedValue({}),
  submitLeaveRequest: vi.fn().mockResolvedValue({}),
  // Round 3 pages
  getHrDashboard: vi.fn().mockResolvedValue({ data: { data: {
    id: '1', total_employees: 100, active_employees: 80, new_hires_30d: 5,
    probations_ending_30d: 3, on_leave: 10, suspended: 2, terminated: 3,
    is_national: true, generated_at: '2026-01-01T00:00:00Z',
    by_employment_type: [], by_department: [], by_sector: [], recent_events: []
  } } }),
  closePerformanceCycle: vi.fn().mockResolvedValue({}),
  openPerformanceCycle: vi.fn().mockResolvedValue({}),
  getTrainingEnrollment: vi.fn().mockResolvedValue({ data: { data: {
    id: '1', plan_name: 'الدورة التدريبية', plan_code: 'TRN-001',
    employee_name: 'أحمد علي', employee_number: 'E001',
    status: 'REQUESTED', is_self_service: false,
    requested_date: '2026-01-01', start_date: '2026-02-01', end_date: '2026-06-01',
    score: null, pass_score: 60, passed: null, certificate_ref: null,
    rejection_reason: null, requested_by_name: 'أحمد علي', decided_by_name: null,
    decided_at: null, enrollment_date: null
  } } }),
  submitTrainingEnrollment: vi.fn().mockResolvedValue({}),
  approveTrainingEnrollment: vi.fn().mockResolvedValue({}),
  rejectTrainingEnrollment: vi.fn().mockResolvedValue({}),
  completeTrainingEnrollment: vi.fn().mockResolvedValue({}),
  getEmployee: vi.fn().mockResolvedValue({ data: { data: {
    id: '1', full_name: 'أحمد علي', employee_number: 'E001',
    job_title: 'موظف', department_name: 'القسم', sector_name: 'القطاع',
    hire_date: '2026-01-01', probation_end_date: null, manager_name: 'مدير',
    office: 'المكتب', email: 'ahmed@nqp.gov.sd', phone: '123456789',
    internal_phone: '100', home_address: 'العنوان', degree: 'البكالوريوس',
    specialization: 'التخصص', employment_status: 'ACTIVE', employment_type: 'PERMANENT',
    photo: null, emergency_contact_name: 'زوجتي', emergency_contact_relation: 'زوجة',
    emergency_contact_phone: '987654321', timeline_count: 0, assignments: []
  } } }),
  getEmployeeTimeline: vi.fn().mockResolvedValue({ data: { data: [] } }),
  createTimelineEvent: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: '1', full_name: 'أحمد علي', email: 'hr@nqp.gov.sd', role: 'HR_OFFICER' } }),
}));

vi.mock('../../../hooks/useServerTable', () => ({
  useServerTable: () => ({
    rows: [], count: 0, loading: false, error: null,
    searchInput: '', setSearchInput: vi.fn(),
    sortBy: '', sortOrder: '', setSorting: vi.fn(),
    setPage: vi.fn(), rowsPerPage: 10, setRowsPerPage: vi.fn(),
    refresh: vi.fn(), page: 1, pageSizeOptions: [10, 25, 50],
    setFilter: vi.fn(), fetchAllRows: vi.fn(),
  }),
}));

vi.mock('../../../hooks/useTableExport', () => ({
  useTableExport: () => ({ exporting: false, exportAll: vi.fn() }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const store = configureStore({ reducer: { auth: authReducer as any } });
const wrap = (ui: ReactNode) => (
  <Provider store={store}>
    <MemoryRouter>{ui}</MemoryRouter>
  </Provider>
);

describe('HR pages language reactivity (Round 1)', () => {
  vi.setConfig({ testTimeout: 15000 });
  afterEach(() => {
    i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('EmployeeTimelinePage AR→EN', async () => {
    render(wrap(<EmployeeTimelinePage />));
    await screen.findByText('المسار الوظيفي');
    await i18n.changeLanguage('en');
    await screen.findByText('Employee Timeline');
  });

  it('TrainingEnrollmentsPage AR→EN', async () => {
    render(wrap(<TrainingEnrollmentsPage />));
    await screen.findByText('تسجيلات التدريب');
    await i18n.changeLanguage('en');
    await screen.findByText('Training Enrollments');
  });

  it('LeaveRequestsPage AR→EN', async () => {
    render(wrap(<LeaveRequestsPage />));
    await screen.findByText('طلبات الإجازات');
    await i18n.changeLanguage('en');
    await screen.findByText('Leave Requests');
  });

  it('EstablishmentsPage AR→EN', async () => {
    render(wrap(<EstablishmentsPage />));
    await screen.findByText('الوحدات التأسيسية');
    await i18n.changeLanguage('en');
    await screen.findByText('Establishments');
  });

  it('PerformanceReviewsPage AR→EN', async () => {
    render(wrap(<PerformanceReviewsPage />));
    await screen.findByText('تقييمات الأداء');
    await i18n.changeLanguage('en');
    await screen.findByText('Performance Reviews');
  });

  it('PostingRequestsPage AR→EN', async () => {
    render(wrap(<PostingRequestsPage />));
    await screen.findByText('طلبات النقل والترقية');
    await i18n.changeLanguage('en');
    await screen.findByText('Posting Requests');
  });
});

describe('HR pages language reactivity (Round 2)', () => {
  vi.setConfig({ testTimeout: 15000 });
  afterEach(() => {
    i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('PerformanceCycleDetailPage AR→EN', async () => {
    render(wrap(<PerformanceCycleDetailPage />));
    await screen.findByText('الدورة الأولى');
    await i18n.changeLanguage('en');
    await screen.findByText('Performance KPIs');
  });

  it('PostingRequestDetailPage AR→EN', async () => {
    render(wrap(<PostingRequestDetailPage />));
    await screen.findByText('طلب نقل');
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    await screen.findByText(/Posting Request Transfer/);
  });

  it('AttendanceRecordsPage AR→EN', async () => {
    render(wrap(<AttendanceRecordsPage />));
    await screen.findByText('سجلات الحضور');
    await i18n.changeLanguage('en');
    await screen.findByText('Attendance Records');
  });

  it('EmployeesPage AR→EN', async () => {
    render(wrap(<EmployeesPage />));
    await screen.findByText('الملفات الوظيفية');
    await i18n.changeLanguage('en');
    await screen.findByText('Employee Files');
  });

  it('PerformanceReviewDetailPage AR→EN', async () => {
    render(wrap(<PerformanceReviewDetailPage />));
    await screen.findByText('تقييم — أحمد علي');
    await i18n.changeLanguage('en');
    await screen.findByText('Back');
  });

  it('LeaveRequestDetailPage AR→EN', async () => {
    render(wrap(<LeaveRequestDetailPage />));
    await screen.findByText('طلب إجازة سنوية');
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    await screen.findByText(/Leave Request/);
  });
});

describe('HR pages language reactivity (Round 3)', () => {
  vi.setConfig({ testTimeout: 15000 });
  afterEach(() => {
    i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('HrDashboardPage AR→EN', async () => {
    render(wrap(<HrDashboardPage />));
    await screen.findByText('لوحة الموارد البشرية');
    await i18n.changeLanguage('en');
    await screen.findByText('HR Dashboard');
  });

  it('PerformanceCyclesPage AR→EN', async () => {
    render(wrap(<PerformanceCyclesPage />));
    await screen.findByText('دورات تقييم الأداء');
    await i18n.changeLanguage('en');
    await screen.findByText('Performance Cycles');
  });

  it('TrainingDetailPage AR→EN', async () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/app/hr/training/1']}>
          <TrainingDetailPage />
        </MemoryRouter>
      </Provider>,
    );
    await screen.findByText(/تسجيل تدريب/);
    await i18n.changeLanguage('en');
    await screen.findByText(/Training Registration/);
  });

  it('EmployeeDetailPage AR→EN', async () => {
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/app/hr/employees/1']}>
          <EmployeeDetailPage />
        </MemoryRouter>
      </Provider>,
    );
    await screen.findByText('رجوع للقائمة');
    await i18n.changeLanguage('en');
    await screen.findByText('Back to List');
  });
});
