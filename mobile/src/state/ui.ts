/** واجهة المستخدم — تبويب/لغة/اتصال/مزامنة (§17: حالت لا تُدمج في boolean واحد). */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Connectivity, Locale, SyncState } from '../types';

export type TabId = 'home' | 'travel' | 'health' | 'certificates' | 'profile';


export interface UiState {
  locale: Locale;
  activeTab: TabId;
  connectivity: Connectivity;
  syncState: SyncState;
}

const initialState: UiState = {
  locale: 'ar',
  activeTab: 'home',
  connectivity: 'unknown',
  syncState: 'SYNCED',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
    },
    setTab(state, action: PayloadAction<TabId>) {
      state.activeTab = action.payload;
    },
    setConnectivity(state, action: PayloadAction<Connectivity>) {
      state.connectivity = action.payload;
    },
    setSyncState(state, action: PayloadAction<SyncState>) {
      state.syncState = action.payload;
    },
  },
});

export const { setLocale, setTab, setConnectivity, setSyncState } = uiSlice.actions;
export default uiSlice.reducer;