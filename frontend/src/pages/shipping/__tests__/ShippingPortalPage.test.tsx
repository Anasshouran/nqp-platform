/**
 * ShippingPortalPage — hash-driven section dispatch.
 *
 * Child components are stubbed to markers so each test asserts exactly which
 * section the `#hash` selects; unknown/missing hashes fall back to the dashboard.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../components/VesselList', () => ({ VesselList: () => <div>VesselList</div> }));
vi.mock('../components/VesselVisitList', () => ({ VesselVisitList: () => <div>VesselVisitList</div> }));
vi.mock('../components/PreArrivalList', () => ({ PreArrivalList: () => <div>PreArrivalList</div> }));
vi.mock('../components/ClearanceList', () => ({ ClearanceList: () => <div>ClearanceList</div> }));
vi.mock('../components/DepartureList', () => ({ DepartureList: () => <div>DepartureList</div> }));
vi.mock('../components/NotificationList', () => ({ NotificationList: () => <div>NotificationList</div> }));
vi.mock('../components/AgentManagement', () => ({ AgentManagement: () => <div>AgentManagement</div> }));
vi.mock('../components/VesselRelationships', () => ({ VesselRelationships: () => <div>VesselRelationships</div> }));
vi.mock('../components/ShippingDashboard', () => ({ ShippingDashboard: () => <div>ShippingDashboard</div> }));

import ShippingPortalPage from '../ShippingPortalPage';

const renderAt = (hash: string) =>
  render(
    <MemoryRouter initialEntries={[`/app/shipping${hash}`]}>
      <ShippingPortalPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }));
});

describe('ShippingPortalPage', () => {
  it.each([
    ['#vessels', 'VesselList'],
    ['#visits', 'VesselVisitList'],
    ['#pre-arrivals', 'PreArrivalList'],
    ['#clearance', 'ClearanceList'],
    ['#departures', 'DepartureList'],
    ['#notifications', 'NotificationList'],
    ['#agents', 'AgentManagement'],
    ['#relationships', 'VesselRelationships'],
    ['#dashboard', 'ShippingDashboard'],
  ])('routes %s to the matching section', (hash, marker) => {
    renderAt(hash);
    expect(screen.getByText(marker)).toBeTruthy();
  });

  it('falls back to the dashboard for an unknown hash', () => {
    renderAt('#nope');
    expect(screen.getByText('ShippingDashboard')).toBeTruthy();
  });

  it('falls back to the dashboard when there is no hash', () => {
    renderAt('');
    expect(screen.getByText('ShippingDashboard')).toBeTruthy();
  });
});
