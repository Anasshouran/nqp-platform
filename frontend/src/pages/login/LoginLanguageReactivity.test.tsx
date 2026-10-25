import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import uiReducer from '../../store/slices/uiSlice';
import { changeLanguage } from 'i18next';

vi.mock('../../api/endpoints/auth', () => ({
  login: vi.fn(),
  travelerLogin: vi.fn(),
  travelerRegister: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
  travelerForgotPassword: vi.fn(),
  travelerResetPassword: vi.fn(),
}));

const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer, ui: uiReducer },
    preloadedState: {
      auth: { user: null, token: null, refreshToken: null },
    },
  });

const wrap = (ui: React.ReactElement) =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </Provider>,
  );

describe('Login pages language reactivity', () => {
  beforeEach(async () => {
    await changeLanguage('ar');
  });

  it('LoginPage switches language without remount', async () => {
    const LoginPage = (await import('./LoginPage')).default;
    wrap(<LoginPage />);
    expect(screen.getAllByText('تسجيل الدخول').length).toBeGreaterThan(0);
    await changeLanguage('en');
    await waitFor(() => expect(screen.getAllByText('Login').length).toBeGreaterThan(0));
  });

  it('TravelerLoginPage switches language without remount', async () => {
    const TravelerLoginPage = (await import('../traveler/TravelerLoginPage')).default;
    wrap(<TravelerLoginPage />);
    expect(screen.getAllByText('دخول المسافر').length).toBeGreaterThan(0);
    await changeLanguage('en');
    await waitFor(() => expect(screen.getAllByText('Traveler Login').length).toBeGreaterThan(0));
  });

  it('TravelerSignupPage switches language without remount', async () => {
    const TravelerSignupPage = (await import('../traveler/TravelerSignupPage')).default;
    wrap(<TravelerSignupPage />);
    expect(screen.getAllByText('إنشاء حساب مسافر').length).toBeGreaterThan(0);
    await changeLanguage('en');
    await waitFor(() => expect(screen.getAllByText('Create Traveler Account').length).toBeGreaterThan(0));
  });

  it('traveler/ForgotPasswordPage switches language without remount', async () => {
    const ForgotPasswordPage = (await import('../traveler/ForgotPasswordPage')).default;
    wrap(<ForgotPasswordPage />);
    expect(screen.getAllByText('نسيت كلمة المرور؟').length).toBeGreaterThan(0);
    await changeLanguage('en');
    await waitFor(() => expect(screen.getAllByText('Forgot Password?').length).toBeGreaterThan(0));
  });

  it('traveler/ResetPasswordPage switches language without remount', async () => {
    const ResetPasswordPage = (await import('../traveler/ResetPasswordPage')).default;
    wrap(<ResetPasswordPage />);
    await changeLanguage('en');
    await waitFor(() => {
      const texts = screen.getAllByText(/Reset Password/i);
      expect(texts.length).toBeGreaterThan(0);
    });
  });

  it('login/ForgotPasswordPage switches language without remount', async () => {
    const ForgotPasswordPage = (await import('./ForgotPasswordPage')).default;
    wrap(<ForgotPasswordPage />);
    expect(screen.getAllByText('نسيت كلمة المرور؟').length).toBeGreaterThan(0);
    await changeLanguage('en');
    await waitFor(() => expect(screen.getAllByText('Forgot Password?').length).toBeGreaterThan(0));
  });

  it('login/ResetPasswordPage switches language without remount', async () => {
    const ResetPasswordPage = (await import('./ResetPasswordPage')).default;
    wrap(<ResetPasswordPage />);
    await changeLanguage('en');
    await waitFor(() => {
      const texts = screen.getAllByText(/Reset Password/i);
      expect(texts.length).toBeGreaterThan(0);
    });
  });
});
