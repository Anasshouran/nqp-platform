/**
 * شرائح بيانات المستخدم (M2-B) — غير مسموح بتقاطع مستخدمين.
 * كل شريحة: قائمة/وحدة + حالة تحميل + خطأ موحد + طابع الجلب؛ وتُصفَّر عند
 * purgeUserData (خروج/انتهاء جلسة) لضمان عزل بعد تبديل الحساب (§18).
 */
import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  MobileCertificate,
  MobileDeclaration,
  MobileNotification,
  MobileProfile,
  MobileRequirement,
  MobileSyncStatus,
} from '@afyatna/contracts';
import { getRepos } from '../services/provider';
import { normalizeError, isUnauthorizedError, type NormalizedError } from '../services/errors';
import { purgeUserData, sessionExpired } from './session';
import { setConnectivity, setSyncState } from './ui';

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface FetchMeta<T> {
  status: FetchStatus;
  data: T | null;
  error: NormalizedError | null;
  lastFetchedAt: string | null;
  /** صح عندما يُعرض محتوى من الكاش المستديم (غير مؤكد الخادم). */
  isCached: boolean;
  /** لحظة ملء الكاش/البيانات المعروضة. */
  cachedAt: string | null;
}

const initialMeta = <T>(): FetchMeta<T> => ({
  status: 'idle',
  data: null,
  error: null,
  lastFetchedAt: null,
  isCached: false,
  cachedAt: null,
});

async function guard(e: unknown, dispatch: (arg: unknown) => void) {
  if (isUnauthorizedError(e)) {
    // رفع الحالة إلى الجلسة: لا نعود ببيانات حساسة (تُنفَّذ حتمياً قبل الإرجاع).
    await dispatch(sessionExpired());
  }
}

function finish<T>(meta: PayloadAction<T>): FetchMeta<T>;
function finish(meta: PayloadAction<unknown>): unknown;
function finish(meta: PayloadAction<unknown>): unknown {
  return {
    status: 'success',
    data: meta.payload,
    error: null,
    lastFetchedAt: new Date().toISOString(),
    isCached: false,
    cachedAt: null,
  };
}

function fail(state: { status: FetchStatus; error: NormalizedError | null }, e: unknown) {
  state.status = 'error';
  state.error = normalizeError(e);
}

async function runFetch<T>(dispatch: (a: unknown) => void, fn: () => Promise<T>): Promise<T> {
  dispatch(setSyncState('SYNCING'));
  dispatch(setConnectivity('online'));
  try {
    const data = await fn();
    dispatch(setSyncState('SYNCED'));
    return data;
  } catch (e) {
    dispatch(setSyncState('FAILED'));
    if (!isUnauthorizedError(e)) {
      const normalized = normalizeError(e);
      dispatch(setConnectivity(normalized.httpStatus === 0 ? 'offline' : 'online'));
    }
    throw e;
  }
}

// ---------------------------------------------------------------- profile --
export const fetchProfile = createAsyncThunk('data/profile', async (_a, { dispatch }) => {
  try {
    return await runFetch(dispatch, () => getRepos().profile.get());
  } catch (e) {
    await guard(e, dispatch);
    throw e;
  }
});

const profileSlice = createSlice({
  name: 'profile',
  initialState: initialMeta<MobileProfile>(),
  reducers: {
    cached(state, action: PayloadAction<MobileProfile>) {
      state.status = 'success';
      state.data = action.payload;
      state.error = null;
      state.lastFetchedAt = null;
      state.isCached = true;
      state.cachedAt = new Date().toISOString();
    },
    server(state, action: PayloadAction<MobileProfile>) {
      state.status = 'success';
      state.data = action.payload;
      state.error = null;
      state.lastFetchedAt = new Date().toISOString();
      state.isCached = false;
      state.cachedAt = null;
    },
  },
  extraReducers: (b) => {
    b
      .addCase(fetchProfile.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchProfile.fulfilled, (s, a) => Object.assign(s, finish(a)))
      .addCase(fetchProfile.rejected, (s, a) => fail(s, a.payload ?? a.error))
      .addCase(purgeUserData.fulfilled, () => initialMeta<MobileProfile>());
  },
});

// ------------------------------------------------------------ certificates --
export const fetchCertificates = createAsyncThunk('data/certificates', async (_a, { dispatch }) => {
  try {
    return await runFetch(dispatch, () => getRepos().certificates.list());
  } catch (e) {
    await guard(e, dispatch);
    throw e;
  }
});

const certificatesSlice = createSlice({
  name: 'certificates',
  initialState: initialMeta<MobileCertificate[]>(),
  reducers: {
    cached(state, action: PayloadAction<MobileCertificate[]>) {
      state.status = 'success';
      state.data = action.payload;
      state.error = null;
      state.lastFetchedAt = null;
      state.isCached = true;
      state.cachedAt = new Date().toISOString();
    },
    server(state, action: PayloadAction<MobileCertificate[]>) {
      state.status = 'success';
      state.data = action.payload;
      state.error = null;
      state.lastFetchedAt = new Date().toISOString();
      state.isCached = false;
      state.cachedAt = null;
    },
  },
  extraReducers: (b) => {
    b
      .addCase(fetchCertificates.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchCertificates.fulfilled, (s, a) => Object.assign(s, finish(a)))
      .addCase(fetchCertificates.rejected, (s, a) => fail(s, a.payload ?? a.error))
      .addCase(purgeUserData.fulfilled, () => initialMeta<MobileCertificate[]>());
  },
});

// ------------------------------------------------------------ requirements --
export const fetchRequirements = createAsyncThunk('data/requirements', async (_a, { dispatch }) => {
  try {
    return await runFetch(dispatch, () => getRepos().requirements.list());
  } catch (e) {
    await guard(e, dispatch);
    throw e;
  }
});

const requirementsSlice = createSlice({
  name: 'requirements',
  initialState: initialMeta<MobileRequirement[]>(),
  reducers: {
    cached(state, action: PayloadAction<MobileRequirement[]>) {
      state.status = 'success';
      state.data = action.payload;
      state.error = null;
      state.lastFetchedAt = null;
      state.isCached = true;
      state.cachedAt = new Date().toISOString();
    },
    server(state, action: PayloadAction<MobileRequirement[]>) {
      state.status = 'success';
      state.data = action.payload;
      state.error = null;
      state.lastFetchedAt = new Date().toISOString();
      state.isCached = false;
      state.cachedAt = null;
    },
  },
  extraReducers: (b) => {
    b
      .addCase(fetchRequirements.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchRequirements.fulfilled, (s, a) => Object.assign(s, finish(a)))
      .addCase(fetchRequirements.rejected, (s, a) => fail(s, a.payload ?? a.error))
      .addCase(purgeUserData.fulfilled, () => initialMeta<MobileRequirement[]>());
  },
});

// ------------------------------------------------------------ declarations --
export const fetchDeclarations = createAsyncThunk('data/declarations', async (_a, { dispatch }) => {
  try {
    return await runFetch(dispatch, () => getRepos().declarations.list());
  } catch (e) {
    await guard(e, dispatch);
    throw e;
  }
});

const declarationsSlice = createSlice({
  name: 'declarations',
  initialState: initialMeta<MobileDeclaration[]>(),
  reducers: {
    cached(state, action: PayloadAction<MobileDeclaration[]>) {
      state.status = 'success';
      state.data = action.payload;
      state.error = null;
      state.lastFetchedAt = null;
      state.isCached = true;
      state.cachedAt = new Date().toISOString();
    },
    server(state, action: PayloadAction<MobileDeclaration[]>) {
      state.status = 'success';
      state.data = action.payload;
      state.error = null;
      state.lastFetchedAt = new Date().toISOString();
      state.isCached = false;
      state.cachedAt = null;
    },
  },
  extraReducers: (b) => {
    b
      .addCase(fetchDeclarations.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchDeclarations.fulfilled, (s, a) => Object.assign(s, finish(a)))
      .addCase(fetchDeclarations.rejected, (s, a) => fail(s, a.payload ?? a.error))
      .addCase(purgeUserData.fulfilled, () => initialMeta<MobileDeclaration[]>());
  },
});

// ------------------------------------------------------------ notifications --
export const fetchNotifications = createAsyncThunk('data/notifications', async (_a, { dispatch }) => {
  try {
    return await runFetch(dispatch, () => getRepos().notifications.list());
  } catch (e) {
    await guard(e, dispatch);
    throw e;
  }
});

export const markNotificationRead = createAsyncThunk(
  'data/notificationRead',
  async (id: string, { dispatch }) => {
    try {
      return await runFetch(dispatch, () => getRepos().notifications.markRead(id));
    } catch (e) {
      await guard(e, dispatch);
      throw e;
    }
  },
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: initialMeta<MobileNotification[]>(),
  reducers: {
    cached(state, action: PayloadAction<MobileNotification[]>) {
      state.status = 'success';
      state.data = action.payload;
      state.error = null;
      state.lastFetchedAt = null;
      state.isCached = true;
      state.cachedAt = new Date().toISOString();
    },
    server(state, action: PayloadAction<MobileNotification[]>) {
      state.status = 'success';
      state.data = action.payload;
      state.error = null;
      state.lastFetchedAt = new Date().toISOString();
      state.isCached = false;
      state.cachedAt = null;
    },
  },
  extraReducers: (b) => {
    b
      .addCase(fetchNotifications.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchNotifications.fulfilled, (s, a) => Object.assign(s, finish(a)))
      .addCase(fetchNotifications.rejected, (s, a) => fail(s, a.payload ?? a.error))
      .addCase(markNotificationRead.fulfilled, (s, a) => {
        if (s.data) {
          const i = s.data.findIndex((n) => n.id === a.payload.id);
          if (i !== -1) s.data[i] = a.payload; // قراءة تعتمد فقط على رد الخادم (§15)
        }
      })
      .addCase(purgeUserData.fulfilled, () => initialMeta<MobileNotification[]>());
  },
});

// ------------------------------------------------------------------ sync ----
export const fetchSyncStatus = createAsyncThunk('data/sync', async (_a, { dispatch }) => {
  try {
    return await runFetch(dispatch, () => getRepos().sync.status());
  } catch (e) {
    await guard(e, dispatch);
    throw e;
  }
});

const syncSlice = createSlice({
  name: 'sync',
  initialState: initialMeta<MobileSyncStatus>(),
  reducers: {},
  extraReducers: (b) => {
    b
      .addCase(fetchSyncStatus.pending, (s) => {
        s.status = 'loading';
      })
      .addCase(fetchSyncStatus.fulfilled, (s, a) => Object.assign(s, finish(a)))
      .addCase(fetchSyncStatus.rejected, (s, a) => fail(s, a.payload ?? a.error))
      .addCase(purgeUserData.fulfilled, () => initialMeta<MobileSyncStatus>());
  },
});

export const profileReducer = profileSlice.reducer;
export const certificatesReducer = certificatesSlice.reducer;
export const requirementsReducer = requirementsSlice.reducer;
export const declarationsReducer = declarationsSlice.reducer;
export const notificationsReducer = notificationsSlice.reducer;
export const syncReducer = syncSlice.reducer;

export const profileCached = profileSlice.actions.cached;
export const certificatesCached = certificatesSlice.actions.cached;
export const requirementsCached = requirementsSlice.actions.cached;
export const declarationsCached = declarationsSlice.actions.cached;
export const notificationsCached = notificationsSlice.actions.cached;

export const profileServer = profileSlice.actions.server;
export const certificatesServer = certificatesSlice.actions.server;
export const requirementsServer = requirementsSlice.actions.server;
export const declarationsServer = declarationsSlice.actions.server;
export const notificationsServer = notificationsSlice.actions.server;