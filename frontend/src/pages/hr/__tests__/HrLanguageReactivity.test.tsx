/**
 * HR Round 1 — language reactivity (Phase 5a).
 */
import type { ReactNode } from 'react';
import { describe, it, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

vi.mock('../../../api/endpoints/hr', () => ({
  getEmployeeTimelineList: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getTrainingEnrollments: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getLeaveRequests: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getHrEstablishments: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getPerformanceReviews: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
  getPerformanceCycles: vi.fn().mockResolvedValue({ data: { data: { results: [] } } }),
  getPostingRequests: vi.fn().mockResolvedValue({ data: { data: { results: [], count: 0 } } }),
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
