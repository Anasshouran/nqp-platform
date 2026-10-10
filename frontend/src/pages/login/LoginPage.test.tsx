import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import uiReducer from '../../store/slices/uiSlice';
import LoginPage from './LoginPage';
import ProtectedRoute from '../../components/ProtectedRoute';

const makeStore = (authed: boolean, role = 'ADMIN') =>
  configureStore({
    reducer: { auth: authReducer, ui: uiReducer },
    preloadedState: {
      auth: {
        user: authed
          ? { id: 'u1', email: 'admin@example.com', full_name: 'المدير', role }
          : null,
        token: authed ? 'test-token' : null,
        refreshToken: null,
      },
    },
  });

const renderLogin = (entry: string, authed: boolean, role = 'ADMIN') => {
  render(
    <Provider store={makeStore(authed, role)}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<div>APP_HOME</div>} />
            <Route path="/app/users" element={<div>USERS_PAGE</div>} />
            <Route element={<ProtectedRoute roles={['CARRIER']} />}>
              <Route path="/app/carrier" element={<div>CARRIER_PAGE</div>} />
            </Route>
          </Route>
          <Route path="*" element={<div>NOT_FOUND</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

describe('LoginPage — مستخدم موثَّق يصل إلى /login', () => {
  it('يُوجَّه لمساره الرئيسي بدل عرض نموذج دخول جديد', () => {
    renderLogin('/login', true);
    expect(screen.getByText('APP_HOME')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'تسجيل الدخول' })).toBeNull();
  });

  it('يحافظ على ?next= الآمن ويستخدمه كوجهة', () => {
    renderLogin('/login?next=/app/users', true);
    expect(screen.getByText('USERS_PAGE')).toBeDefined();
    expect(screen.queryByText('APP_HOME')).toBeNull();
  });

  it('next لمسار يمنعه حارس الدور يُستبدل بمسار الدور بدل حلقة أو صفحة دخول', () => {
    // VECTOR_INSPECTOR لا يملك /app/carrier (حارس CARRIER) — الحارس يعيده لمساره
    renderLogin('/login?next=/app/carrier', true, 'VECTOR_INSPECTOR');
    expect(screen.queryByText('CARRIER_PAGE')).toBeNull();
    expect(screen.getByText('APP_HOME')).toBeDefined();
    expect(screen.queryByRole('button', { name: 'تسجيل الدخول' })).toBeNull();
    expect(screen.queryByText('NOT_FOUND')).toBeNull();
  });

  it('يرفض ?next= خارجياً ويعود للمسار العام (لا توجيه لطريق خارجي)', () => {
    renderLogin('/login?next=//evil.example/phish', true);
    expect(screen.getByText('APP_HOME')).toBeDefined();
    expect(screen.queryByText('NOT_FOUND')).toBeNull();
  });

  it('يرفض ?next= يشير إلى /login ذاته (حلقة توجيه دائري)', () => {
    renderLogin('/login?next=/login', true);
    expect(screen.getByText('APP_HOME')).toBeDefined();
  });

  it('next غير صالح لا يمنع توجيه الدور الافتراضي', () => {
    renderLogin('/login?next=https://evil.example', true);
    expect(screen.getByText('APP_HOME')).toBeDefined();
  });
});

describe('LoginPage — زائر غير موثَّق', () => {
  it('يعرض نموذج الدخول ويراعي ?next= للاستعمال بعد النجاح', () => {
    renderLogin('/login?next=/app/users', false);
    expect(screen.getByRole('button', { name: 'تسجيل الدخول' })).toBeDefined();
    expect(screen.queryByText('USERS_PAGE')).toBeNull();
    expect(screen.queryByText('APP_HOME')).toBeNull();
  });
});
