/**
 * AppShell — component test (navigation/ scaffold).
 *
 * Renders under a real Redux Provider with a fresh store and mocks the
 * offline engine's bootstrapOffline so the mount effect stays inert
 * (AppShell only ever calls bootstrapOffline from that effect).
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';

import { makeStore } from '../src/state/store';
import { restoreSession } from '../src/state';
import { AppShell } from '../src/navigation/AppShell';
import { bootstrapOffline } from '../src/offline/engine';

jest.mock('../src/offline/engine', () => ({
  bootstrapOffline: jest.fn(() => ({ type: '@mock/bootstrapOffline' })),
}));

const mockBootstrapOffline = jest.mocked(bootstrapOffline);

const renderShell = (store = makeStore()) =>
  render(
    <Provider store={store}>
      <AppShell />
    </Provider>,
  );

describe('navigation/AppShell', () => {
  beforeEach(() => {
    mockBootstrapOffline.mockClear();
  });

  it('renders LoadingView while session is restoring', async () => {
    const store = makeStore();
    store.dispatch(restoreSession.pending('test', undefined));
    await renderShell(store);
    expect(screen.getByTestId('loading-view')).toBeTruthy();
  });

  it('renders LoginScreen when signed out', async () => {
    await renderShell();
    expect(screen.getByTestId('login-submit')).toBeTruthy();
  });

  it('dispatches bootstrapOffline exactly once on mount', async () => {
    await renderShell();
    expect(mockBootstrapOffline).toHaveBeenCalledTimes(1);
    expect(mockBootstrapOffline).toHaveBeenCalledWith('online');
  });
});
