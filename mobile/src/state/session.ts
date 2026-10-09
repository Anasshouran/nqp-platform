/**
 * جلسة المستخدم — موفرو هوية محايدون (§7)؛ SUDAPASS غير مفعّل.
 * التخزين آمن حصراً (SecureStore)؛ لا AsyncStorage/نص صريح (§8).
 */
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getRepos } from '../services/provider';
import { getTokenStorage } from './tokenStorage';
import { cancelRetries, purgeProtectedCache } from '../offline/engine';
import type { Repositories } from '../services/repositories';

export type SessionStatus = 'signed_out' | 'restoring' | 'signing_in' | 'signed_in' | 'session_expired';

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
}

export interface SessionState {
  status: SessionStatus;
  user: SessionUser | null;
  expiresAt: number | null; // epoch ms
  provider: 'password' | 'sudapass' | null;
}

const initialState: SessionState = {
  status: 'signed_out',
  user: null,
  expiresAt: null,
  provider: null,
};

export const restoreSession = createAsyncThunk('session/restore', async () => {
  const tokens = getTokenStorage();
  const access = await tokens.getAccessToken();
  if (!access) return { user: null as SessionUser | null, expiresAt: null as number | null };
  // نقرأ "بقاء الجلسة" من مرجع التخزين فقط؛ الانتهاء يُحصى لاحقاً في الحارس.
  return { user: null as SessionUser | null, expiresAt: null as number | null, hasToken: true };
});

export const login = createAsyncThunk(
  'session/login',
  async (credentials: { identifier: string; password: string }) => {
    const repos: Repositories = getRepos();
    const res = await repos.auth.login(credentials.identifier, credentials.password);
    const tokens = getTokenStorage();
    await tokens.setAccessToken(res.accessToken);
    if (res.refreshToken) await tokens.setRefreshToken(res.refreshToken);
    return {
      expiresAt: Date.now() + res.expiresInSeconds * 1000,
      provider: 'password' as const,
    };
  },
);

export const refreshSession = createAsyncThunk('session/refresh', async () => {
  const tokens = getTokenStorage();
  const refresh = await tokens.getRefreshToken();
  if (!refresh) throw new Error('no-refresh');
  const res = await getRepos().auth.refresh(refresh);
  await tokens.setAccessToken(res.accessToken);
  return { expiresAt: Date.now() + res.expiresInSeconds * 1000 };
});

export const logout = createAsyncThunk(
  'session/logout',
  async (_arg, { dispatch }) => {
    const tokens = getTokenStorage();
    const refresh = await tokens.getRefreshToken();
    // إبطال جلسة الخادم — نقطة /api/v1/auth/logout قائمة (إلغاء blacklist).
    if (refresh) {
      try {
        await getRepos().auth.logout(refresh);
      } catch {
        // لا نمنع الخروج المحلي عند تعذر الشبكة؛ نكمل التنظيف الحتمي.
      }
    }
    await tokens.clear(); // محو الرموز الآمنة حتماً
    cancelRetries();
    await purgeProtectedCache();
    dispatch(purgeUserData());
    return undefined;
  },
);

/** تنظيف كل بيانات المستخدم الحساسة من الذاكرة (تستمع له كل شرائح البيانات). */
export const purgeUserData = createAsyncThunk('data/purgeUserData', async () => undefined);

export const sessionExpired = createAsyncThunk(
  'session/expired',
  async (_arg, { dispatch }) => {
    const tokens = getTokenStorage();
    await tokens.clear();
    cancelRetries();
    await purgeProtectedCache();
    dispatch(purgeUserData());
    return undefined;
  },
);

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<SessionUser>) {
      state.user = action.payload;
    },
    setSignedIn(state, action: PayloadAction<{ expiresAt: number }>) {
      state.status = 'signed_in';
      state.expiresAt = action.payload.expiresAt;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.status = 'restoring';
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        // وجود رمز محفوظ = جلسة قابلة للاسترداد؛ التحقق الفعلي عبر API عند أول طلب.
        state.status = action.payload.hasToken ? 'signed_in' : 'signed_out';
      })
      .addCase(login.pending, (state) => {
        state.status = 'signing_in';
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'signed_in';
        state.provider = action.payload.provider;
        state.expiresAt = action.payload.expiresAt;
      })
      .addCase(login.rejected, (state) => {
        state.status = 'signed_out';
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.expiresAt = action.payload.expiresAt;
      })
      .addCase(logout.fulfilled, (state) => {
        state.status = 'signed_out';
        state.user = null;
        state.expiresAt = null;
        state.provider = null;
      })
      .addCase(sessionExpired.fulfilled, (state) => {
        state.status = 'session_expired';
        state.provider = null;
        state.expiresAt = null;
      });
  },
});

export const { setUser, setSignedIn } = sessionSlice.actions;
export default sessionSlice.reducer;