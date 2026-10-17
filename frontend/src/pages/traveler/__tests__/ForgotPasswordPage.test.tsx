/**
 * ForgotPasswordPage (traveler) — submit, success, failure regression guard.
 *
 * Regression guard for the bug fixed in this PR: before the fix the page
 * swallowed API errors and always showed the success message ("تحقق من
 * بريدك الإلكتروني"). The failure test asserts the success message must
 * NOT be shown and the error is surfaced instead.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ForgotPasswordPage from '../ForgotPasswordPage';

const travelers = vi.hoisted(() => ({ travelerForgotPassword: vi.fn() }));
vi.mock('../../../api/endpoints/travelers', () => travelers);

// Keep the real extractErrorMessage, stub the toast side effects.
const toast = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('../../../utils/toast', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/toast')>();
  return { ...actual, ...toast };
});

const wrap = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>
    </MemoryRouter>,
  );

const emailField = () => screen.getByLabelText(/البريد الإلكتروني/);
const submit = () => screen.getByRole('button', { name: /إرسال رابط إعادة التعيين/ });

beforeEach(() => {
  vi.resetAllMocks();
  travelers.travelerForgotPassword.mockResolvedValue({} as never);
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
});

describe('ForgotPasswordPage — traveler', () => {
  it('renders the email field and submit button', () => {
    wrap(<ForgotPasswordPage />);
    expect(emailField()).toBeTruthy();
    expect(submit()).toBeTruthy();
  });

  it('calls travelerForgotPassword and shows the success message on success', async () => {
    wrap(<ForgotPasswordPage />);
    fireEvent.change(emailField(), { target: { value: 'ahmed@example.com' } });
    fireEvent.click(submit());
    await waitFor(() =>
      expect(travelers.travelerForgotPassword).toHaveBeenCalledWith('ahmed@example.com'),
    );
    await waitFor(() => expect(screen.getByText('تحقق من بريدك الإلكتروني')).toBeTruthy());
    expect(screen.getByText('ahmed@example.com')).toBeTruthy();
  });

  it('does NOT show the success message when the API fails (regression guard)', async () => {
    travelers.travelerForgotPassword.mockRejectedValueOnce(new Error('boom'));
    wrap(<ForgotPasswordPage />);
    fireEvent.change(emailField(), { target: { value: 'ahmed@example.com' } });
    fireEvent.click(submit());
    await waitFor(() =>
      expect(screen.getByText('تعذر إرسال رابط إعادة التعيين')).toBeTruthy(),
    );
    expect(screen.queryByText('تحقق من بريدك الإلكتروني')).toBeNull();
    expect(toast.notifyError).toHaveBeenCalledWith('تعذر إرسال رابط إعادة التعيين');
  });

  it('shows a loading state while the request is in flight', async () => {
    let resolvePending: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      resolvePending = resolve;
    });
    travelers.travelerForgotPassword.mockReturnValue(pending as never);
    wrap(<ForgotPasswordPage />);
    fireEvent.change(emailField(), { target: { value: 'ahmed@example.com' } });
    // Grab the node before submitting (its label is replaced by a spinner).
    const button = submit() as HTMLButtonElement;
    fireEvent.click(button);
    expect(button.disabled).toBe(true);
    resolvePending();
    await waitFor(() => expect(screen.getByText('تحقق من بريدك الإلكتروني')).toBeTruthy());
  });
});
