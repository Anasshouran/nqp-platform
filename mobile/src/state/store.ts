/** مخزن التطبيق — موحد وحتمي. */
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import sessionReducer from './session';
import uiReducer from './ui';
import {
  certificatesReducer,
  declarationsReducer,
  notificationsReducer,
  profileReducer,
  requirementsReducer,
  syncReducer,
} from './data';

export const rootReducer = combineReducers({
  session: sessionReducer,
  ui: uiReducer,
  profile: profileReducer,
  certificates: certificatesReducer,
  requirements: requirementsReducer,
  declarations: declarationsReducer,
  notifications: notificationsReducer,
  sync: syncReducer,
});

export function makeStore() {
  return configureStore({ reducer: rootReducer });
}

export const store = makeStore();

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;