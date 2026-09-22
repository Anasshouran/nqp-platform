import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface UiState {
  sidebarOpen: boolean;
  language: 'ar' | 'en';
  theme: 'light' | 'dark';
  notifications: Notification[];
  globalLoading: boolean;
}

const initialState: UiState = {
  sidebarOpen: true,
  language: 'ar',
  theme: 'light',
  notifications: [],
  globalLoading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
    setLanguage(state, action: PayloadAction<'ar' | 'en'>) {
      state.language = action.payload;
      document.documentElement.dir = action.payload === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.lang = action.payload;
    },
    setTheme(state, action: PayloadAction<'light' | 'dark'>) {
      state.theme = action.payload;
    },
    addNotification(state, action: PayloadAction<Notification>) {
      state.notifications.push(action.payload);
    },
    removeNotification(state, action: PayloadAction<string>) {
      state.notifications = state.notifications.filter((n) => n.id !== action.payload);
    },
    clearNotifications(state) {
      state.notifications = [];
    },
    setGlobalLoading(state, action: PayloadAction<boolean>) {
      state.globalLoading = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  setLanguage,
  setTheme,
  addNotification,
  removeNotification,
  clearNotifications,
  setGlobalLoading,
} = uiSlice.actions;

export default uiSlice.reducer;
