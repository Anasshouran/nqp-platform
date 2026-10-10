import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createEmployee, getEmployees, getLinkableUsers } from '../../api/endpoints/hr';

vi.mock('../../api/endpoints/hr', () => ({
  createEmployee: vi.fn(),
  getEmployee: vi.fn(),
  getEmployees: vi.fn(),
  getLinkableUsers: vi.fn(),
}));

vi.mock('../../store/auth', () => ({
  useAuthSelector: vi.fn(() => ({ hasPermission: () => true })),
}));

vi.mock('../../utils/toast', () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  extractErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

const EmployeeFormPage = (await import('./EmployeeFormPage')).default;

const type = (label: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const click = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

/** يملأ كل الحقول الإلزامية في وضع "حساب جديد". */
function fillRequired() {
  type(/الاسم بالعربية/, 'أحمد علي');
  type(/البريد الإلكتروني/, 'ahmed@nqp.sd');
  type(/المسمى الوظيفي/, 'مهندس');
  type(/الرقم الوظيفي/, 'EMP-001');
  type(/تاريخ التعيين/, '2026-01-15');
}

const setup = () =>
  render(
    <MemoryRouter>
      <EmployeeFormPage />
    </MemoryRouter>,
  );

describe('EmployeeFormPage — وضع الحساب', () => {
  beforeEach(() => {
    vi.mocked(createEmployee).mockReset();
    vi.mocked(createEmployee).mockResolvedValue({ data: { status: 'success' } } as never);
    vi.mocked(getEmployees).mockResolvedValue({
      data: { data: { count: 0, results: [] } },
    } as never);
    vi.mocked(getLinkableUsers).mockResolvedValue({
      data: {
        data: {
          count: 1,
          results: [
            {
              id: '11111111-2222-3333-4444-555555555555',
              username: 'linkable.one',
              full_name: 'حساب قابل للربط',
              email: 'linkable@nqp.sd',
              phone: '',
              is_active: true,
              label: 'حساب قابل للربط',
            },
          ],
        },
      },
    } as never);
  });

  it('يرسل new_user افتراضياً', async () => {
    setup();
    fillRequired();
    click(/إنشاء الملف/);

    await waitFor(() => expect(createEmployee).toHaveBeenCalled());
    const body = vi.mocked(createEmployee).mock.calls[0][0] as Record<string, unknown>;
    expect(body.new_user).toMatchObject({ email: 'ahmed@nqp.sd' });
    expect(body.user).toBeUndefined();
  });

  it('يرسل user عند التبديل إلى "ربط حساب موجود"', async () => {
    // This is the regression: the toggle used to live in a separate useState,
    // so `onSubmit` kept reading the RHF value ("new") and sent new_user
    // with an empty email even though the user picked "existing".
    setup();
    click(/ربط حساب موجود/);
    await waitFor(() => expect(screen.queryByLabelText(/البريد الإلكتروني/)).toBeNull());

    type(/الاسم بالعربية/, 'أحمد علي');
    type(/المسمى الوظيفي/, 'مهندس');
    type(/الرقم الوظيفي/, 'EMP-002');
    type(/تاريخ التعيين/, '2026-01-15');

    // pick the linkable account from the autocomplete
    fireEvent.click(screen.getByLabelText(/الحساب المرتبط/));
    fireEvent.change(screen.getByLabelText(/الحساب المرتبط/), { target: { value: 'حساب' } });
    const opt = await screen.findByRole('option');
    fireEvent.click(opt);

    click(/إنشاء الملف/);

    await waitFor(() => expect(createEmployee).toHaveBeenCalled());
    const body = vi.mocked(createEmployee).mock.calls[0][0] as Record<string, unknown>;
    expect(body.new_user).toBeUndefined();
    expect(body.user).toBe('11111111-2222-3333-4444-555555555555');
  });

  it('يتبدّل بين الوضعين ذهاباً وإياباً', async () => {
    setup();
    click(/ربط حساب موجود/);
    await waitFor(() => expect(screen.queryByLabelText(/البريد الإلكتروني/)).toBeNull());

    click(/حساب جديد/);
    await waitFor(() => expect(screen.getByLabelText(/البريد الإلكتروني/)).toBeTruthy());
  });
});
