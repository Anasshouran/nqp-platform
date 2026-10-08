/**
 * اختبارات مكوّنات (M1): ثنائي اللغة + RTL أساس + لا تسريب داخلي.
 */
import { render, screen } from '@testing-library/react-native';
import { ErrorBanner } from '../src/components/ErrorBanner';
import { SyncStatusBadge } from '../src/components/SyncStatusBadge';
import { isRTL, t } from '../src/i18n';

describe('ErrorBanner', () => {
  const error = {
    code: 'AUTH_REQUIRED' as const,
    ar: 'يجب تسجيل الدخول',
    en: 'Authentication required',
  };

  it('renders Arabic by default (primary locale)', async () => {
    await render(<ErrorBanner error={error} />);
    expect(screen.getByText(/يجب تسجيل الدخول/)).toBeTruthy();
  });

  it('renders English when locale=en', async () => {
    await render(<ErrorBanner error={error} locale="en" />);
    expect(screen.getByText(/Authentication required/)).toBeTruthy();
  });

  it('exposes an accessible alert role', async () => {
    await render(<ErrorBanner error={error} />);
    expect(screen.getByTestId('error-banner')).toBeTruthy();
  });

  it('never renders raw internal fields', async () => {
    await render(<ErrorBanner error={error} />);
    const text = screen.getByTestId('error-banner').props.children.join?.(' ') ?? '';
    expect(String(text)).not.toMatch(/traceback|sql|stack/i);
  });
});

describe('SyncStatusBadge', () => {
  it('shows pending count', async () => {
    await render(<SyncStatusBadge state="QUEUED" pendingCount={3} />);
    expect(screen.getByText(/بانتظار المزامنة \(3\)/)).toBeTruthy();
  });

  it('renders nothing when synced with no pending work', async () => {
    const { toJSON } = await render(<SyncStatusBadge state="SYNCED" pendingCount={0} />);
    expect(toJSON()).toBeNull();
  });

  it('shows failure state', async () => {
    await render(<SyncStatusBadge state="FAILED" pendingCount={1} locale="en" />);
    expect(screen.getByText(/Sync failed/)).toBeTruthy();
  });
});

describe('i18n', () => {
  it('Arabic is default and RTL', async () => {
    expect(t('login')).toBe('تسجيل الدخول');
    expect(isRTL('ar')).toBe(true);
    expect(isRTL('en')).toBe(false);
  });

  it('falls back to Arabic for missing locale keys', async () => {
    expect(t('login', 'en')).toBe('Sign in');
  });
});
