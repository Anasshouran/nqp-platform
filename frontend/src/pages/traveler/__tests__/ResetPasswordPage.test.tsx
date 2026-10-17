/**
 * ResetPasswordPage (traveler) — token presence, validation, submit.
 *
 * uidb64/token are read from the query string via useSearchParams, so each
 * test mounts a MemoryRouter with the relevant initial entry.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ResetPasswordPage from '../ResetPasswordPage';

const travelers = vi.hoisted(() => ({ travelerResetPassword: vi.fn() }));
vi.mock('../../../api/endpoints/travelers', () => travelers);

const wrap = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ThemeProvider theme={createTheme()}>
        <ResetPasswordPage />
      </ThemeProvider>
    </MemoryRouter>,
  );

const validEntry = '/traveler/reset-password?uidb64=abc123&token=tok-xyz';

const fillPasswords = (password: string, confirm: string) => {
  fireEvent.change(screen.getByLabelText(/كلمة المرور الجديدة/), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText(/تأكيد كلمة المرور/), {
    target: { value: confirm },
  });
};

const submit = () => screen.getByRole('button', { name: /إعادة تعيين كلمة المرور/ });

beforeEach(() => {
  vi.resetAllMocks();
  travelers.travelerResetPassword.mockResolvedValue({} as never);
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

describe('ResetPasswordPage — traveler', () => {
  it('renders the password + confirm fields when uidb64 and token are present', () => {
    wrap(validEntry);
    expect(screen.getByLabelText(/كلمة المرور الجديدة/)).toBeTruthy();
    expect(screen.getByLabelText(/تأكيد كلمة المرور/)).toBeTruthy();
    expect(submit()).toBeTruthy();
  });

  it('shows an invalid-link error when uidb64/token are missing, without calling the API', async () => {
    wrap('/traveler/reset-password');
    fillPasswords('Password123', 'Password123');
    fireEvent.click(submit());
    await waitFor(() =>
      expect(screen.getByText('رابط إعادة التعيين غير صالح أو منتهي الصلاحية')).toBeTruthy(),
    );
    expect(travelers.travelerResetPassword).not.toHaveBeenCalled();
  });

  it('rejects a short password without calling the API', async () => {
    wrap(validEntry);
    fillPasswords('short', 'short');
    fireEvent.click(submit());
    await waitFor(() =>
      expect(screen.getByText('كلمة المرور يجب أن تكون 8 أحرف على الأقل')).toBeTruthy(),
    );
    expect(travelers.travelerResetPassword).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords without calling the API', async () => {
    wrap(validEntry);
    fillPasswords('Password123', 'Different123');
    fireEvent.click(submit());
    await waitFor(() => expect(screen.getByText('كلمتا المرور غير متطابقتين')).toBeTruthy());
    expect(travelers.travelerResetPassword).not.toHaveBeenCalled();
  });

  it('calls travelerResetPassword with the correct args and shows success', async () => {
    wrap(validEntry);
    fillPasswords('Password123', 'Password123');
    fireEvent.click(submit());
    await waitFor(() =>
      expect(travelers.travelerResetPassword).toHaveBeenCalledWith(
        'abc123',
        'tok-xyz',
        'Password123',
        'Password123',
      ),
    );
    await waitFor(() => expect(screen.getByText('تم إعادة تعيين كلمة المرور')).toBeTruthy());
  });
});
