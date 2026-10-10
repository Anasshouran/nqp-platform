import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../store/slices/authSlice';
import uiReducer from '../../store/slices/uiSlice';
import RoleLayout from './RoleLayout';

const makeStore = (role: string | null) =>
  configureStore({
    reducer: { auth: authReducer, ui: uiReducer },
    preloadedState: {
      auth: {
        user: role
          ? {
              id: 'u1',
              email: 'user@example.com',
              full_name: 'مستخدم الاختبار',
              role,
            }
          : null,
        token: role ? 'test-token' : null,
        refreshToken: null,
      },
    },
  });

const renderRoleLayout = (role: string | null) => {
  const store = makeStore(role);
  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/app" element={<RoleLayout />}>
            <Route index element={<div>page-content</div>} />
            <Route path="*" element={<div>page-content</div>} />
          </Route>
          <Route path="/login" element={<div>LOGIN_PAGE</div>} />
          <Route path="/traveler/dashboard" element={<div>TRAVELER_HOME</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return { ...utils, store };
};

const NO_WORKSPACE = 'لا توجد مساحة عمل متاحة لدورك';

describe('RoleLayout — دور بلا إعداد تخطيط', () => {
  it('دور موثَّق بلا إعداد يعرض حالة «مساحة العمل غير متاحة» ولا يُسقط إلى /login', () => {
    renderRoleLayout('VECTOR_INSPECTOR');
    expect(screen.getByText(NO_WORKSPACE)).toBeDefined();
    expect(screen.getByText('VECTOR_INSPECTOR')).toBeDefined();
    expect(screen.queryByText('LOGIN_PAGE')).toBeNull();
  });

  it('رمز دور غير معروفاً كلياً يعرض الحالة نفسها (إعداد مفقود/تلف)', () => {
    renderRoleLayout('DOES_NOT_EXIST_123');
    expect(screen.getByText(NO_WORKSPACE)).toBeDefined();
    expect(screen.getByText('DOES_NOT_EXIST_123')).toBeDefined();
    expect(screen.queryByText('LOGIN_PAGE')).toBeNull();
  });

  it('دور بلا دور أصلاً (user.role=null) يعرض الحالة ولا يُرسَل للدخول', () => {
    renderRoleLayout(null);
    expect(screen.getByText(NO_WORKSPACE)).toBeDefined();
    expect(screen.queryByText('LOGIN_PAGE')).toBeNull();
  });

  it('دور له مسار رئيسي خارج تخطيط /app (TRAVELER) يعرض زر الانتقال إليه', () => {
    renderRoleLayout('TRAVELER');
    expect(screen.getByText(NO_WORKSPACE)).toBeDefined();
    const homeBtn = screen.getByRole('button', { name: /الذهاب للصفحة الرئيسية لحسابي/ });
    fireEvent.click(homeBtn);
    expect(screen.getByText('TRAVELER_HOME')).toBeDefined();
  });
});

describe('RoleLayout — دور بإعداد تخطيط', () => {
  it('دور مدعوم يعرض تخطيطه ولا يعرض حالة عدم توفّر المساحة', () => {
    renderRoleLayout('PORT_OFFICER');
    expect(screen.queryByText(NO_WORKSPACE)).toBeNull();
    expect(screen.queryByText('LOGIN_PAGE')).toBeNull();
    expect(screen.getAllByText('موظف الحجر الصحي').length).toBeGreaterThan(0);
    expect(screen.getByText('page-content')).toBeDefined();
  });
});
