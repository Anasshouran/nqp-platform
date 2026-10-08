import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { purgeServiceWorkerCaches } from '../../api/client';
import { clearPendingMutations } from '../../utils/vectorOffline';

interface AuthRoleAssignment {
  role: string;
  role_name?: string;
  /** رمز الدور (CARRIER_ADMIN, SHIPPING_COMPANY, …) — المصدر: `RoleAssignmentSerializer.role_code`. */
  role_code?: string;
  scope_type: string;
  scope_id?: string | null;
  is_active?: boolean;
}

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  national_id?: string | null;
  role?: string | null;
  role_id?: string | null;
  sector?: string | null;
  sector_name?: string | null;
  sector_code?: string | null;
    sector_codes?: string[];
  permissions?: string[];
  role_assignments?: AuthRoleAssignment[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  refreshToken: string | null;
}

function restoreUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

const initialState: AuthState = {
  user: restoreUser(),
  token: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{
        user: AuthUser;
        token: string;
        refreshToken?: string;
      }>
    ) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      localStorage.setItem('access_token', action.payload.token);
      localStorage.setItem('auth_user', JSON.stringify(action.payload.user));
      if (action.payload.refreshToken) {
        localStorage.setItem('refresh_token', action.payload.refreshToken);
      }
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      localStorage.setItem('access_token', action.payload);
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_user');
      purgeServiceWorkerCaches();
      clearPendingMutations().catch(() => {
        /* ignore — clearing queue on logout must never throw */
      });
    },
  },
});

export const { setCredentials, setUser, setToken, logout } = authSlice.actions;
export default authSlice.reducer;
