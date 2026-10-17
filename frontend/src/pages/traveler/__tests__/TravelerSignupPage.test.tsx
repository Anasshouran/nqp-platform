/**
 * TravelerSignupPage — validation + submit + failure.
 *
 * The page dispatches setCredentials on success (needs a Redux Provider) and
 * navigates via useNavigate (needs a MemoryRouter). MUI renders the required
 * asterisk inside the <label>, so label queries use regex matchers.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { store } from '../../../store/store';
import TravelerSignupPage from '../TravelerSignupPage';

const auth = vi.hoisted(() => ({ register: vi.fn() }));
vi.mock('../../../api/endpoints/auth', () => auth);

const wrap = (ui: React.ReactElement) =>
  render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>
      </MemoryRouter>
    </Provider>,
  );

// Bypasses jsdom's native constraint validation so the React onSubmit handler
// runs even when required/email fields are empty or invalid.
const submitForm = () =>
  fireEvent.submit(document.querySelector('form') as HTMLFormElement);

const fillValid = () => {
  fireEvent.change(screen.getByLabelText(/الاسم الكامل/), {
    target: { value: 'أحمد محمد' },
  });
  fireEvent.change(screen.getByLabelText(/البريد الإلكتروني/), {
    target: { value: 'ahmed@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/رقم الجوال/), {
    target: { value: '+249123456789' },
  });
  fireEvent.change(screen.getByLabelText(/^كلمة المرور/), {
    target: { value: 'Password123' },
  });
  fireEvent.change(screen.getByLabelText(/تأكيد كلمة المرور/), {
    target: { value: 'Password123' },
  });
};

beforeEach(() => {
  vi.resetAllMocks();
  auth.register.mockResolvedValue({
    data: {
      data: {
        user: { id: 'u1', email: 'ahmed@example.com', full_name: 'أحمد محمد', role: 'TRAVELER' },
        access_token: 'tok',
        refresh_token: 'ref',
      },
    },
  } as never);
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

describe('TravelerSignupPage', () => {
  it('renders the signup form with required fields', () => {
    wrap(<TravelerSignupPage />);
    expect(screen.getByLabelText(/الاسم الكامل/)).toBeTruthy();
    expect(screen.getByLabelText(/البريد الإلكتروني/)).toBeTruthy();
    expect(screen.getByLabelText(/^كلمة المرور/)).toBeTruthy();
    expect(screen.getByLabelText(/تأكيد كلمة المرور/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /إنشاء الحساب/ })).toBeTruthy();
  });

  it('rejects an empty submit without calling the API', async () => {
    wrap(<TravelerSignupPage />);
    submitForm();
    await waitFor(() => expect(screen.getByText('الاسم الكامل مطلوب')).toBeTruthy());
    expect(screen.getByText('البريد الإلكتروني مطلوب')).toBeTruthy();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('rejects mismatched passwords without calling the API', async () => {
    wrap(<TravelerSignupPage />);
    fireEvent.change(screen.getByLabelText(/الاسم الكامل/), {
      target: { value: 'أحمد محمد' },
    });
    fireEvent.change(screen.getByLabelText(/البريد الإلكتروني/), {
      target: { value: 'ahmed@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^كلمة المرور/), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByLabelText(/تأكيد كلمة المرور/), {
      target: { value: 'Different123' },
    });
    submitForm();
    await waitFor(() =>
      expect(screen.getByText('كلمتا المرور غير متطابقتين')).toBeTruthy(),
    );
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('rejects an invalid email without calling the API', async () => {
    wrap(<TravelerSignupPage />);
    fireEvent.change(screen.getByLabelText(/الاسم الكامل/), {
      target: { value: 'أحمد محمد' },
    });
    fireEvent.change(screen.getByLabelText(/البريد الإلكتروني/), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(screen.getByLabelText(/^كلمة المرور/), {
      target: { value: 'Password123' },
    });
    fireEvent.change(screen.getByLabelText(/تأكيد كلمة المرور/), {
      target: { value: 'Password123' },
    });
    submitForm();
    await waitFor(() =>
      expect(screen.getByText('البريد الإلكتروني غير صحيح')).toBeTruthy(),
    );
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('calls register() with the right shape on success', async () => {
    wrap(<TravelerSignupPage />);
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: /إنشاء الحساب/ }));
    await waitFor(() => expect(auth.register).toHaveBeenCalledTimes(1));
    expect(auth.register).toHaveBeenCalledWith({
      full_name: 'أحمد محمد',
      email: 'ahmed@example.com',
      password: 'Password123',
      confirm_password: 'Password123',
      phone: '+249123456789',
      user_type: 'TRAVELER',
    });
  });

  it('surfaces an error when registration fails', async () => {
    auth.register.mockRejectedValueOnce(new Error('boom'));
    wrap(<TravelerSignupPage />);
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: /إنشاء الحساب/ }));
    await waitFor(() =>
      expect(screen.getByText('حدث خطأ أثناء إنشاء الحساب')).toBeTruthy(),
    );
    expect(auth.register).toHaveBeenCalledTimes(1);
  });
});
