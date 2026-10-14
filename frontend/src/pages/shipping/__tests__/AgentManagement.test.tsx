/**
 * AgentManagement — render / empty / search / filter / detail (read-only).
 * Mocks the typed shipping API module.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shipping = vi.hoisted(() => ({ getAgents: vi.fn() }));
vi.mock('../../../api/endpoints/shipping', () => shipping);

import { AgentManagement } from '../components/AgentManagement';

const paged = (results: unknown[], count = results.length) => ({
  data: { data: { results, count, next: null, previous: null } },
});

const base = {
  id: 'a1',
  company: 'c1',
  company_id: 'c1',
  company_name: 'Alpha Shipping Co.',
  name: 'وكيل الميناء',
  name_en: 'Port Agent One',
  agent_type: 'PORT_AGENT',
  license_number: 'LIC-001',
  contact_name: 'Ahmed',
  email: 'agent@example.com',
  phone: '+249900000000',
  address: 'بورتسودان',
  status: 'ACTIVE',
  valid_from: '2026-01-01',
  valid_until: '2026-12-31',
  ports: [],
  ports_count: 2,
  user: null,
  user_email: 'user@example.com',
  is_active: true,
  is_valid: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const row = (over: Partial<typeof base> = {}) => ({ ...base, ...over });

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
  shipping.getAgents.mockResolvedValue(paged([]));
});

describe('AgentManagement', () => {
  it('shows a loading skeleton initially', () => {
    shipping.getAgents.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<AgentManagement />);
    expect(container.querySelector('.MuiSkeleton-root')).not.toBeNull();
  });

  it('renders rows from the API', async () => {
    shipping.getAgents.mockResolvedValue(paged([row({ status: 'ACTIVE' })]));
    render(<AgentManagement />);

    expect(await screen.findByText('وكيل الميناء')).toBeTruthy();
    expect(screen.getByText('LIC-001')).toBeTruthy();
    expect(screen.getByText('نشط')).toBeTruthy();
  });

  it('shows the empty state when there are no rows', async () => {
    shipping.getAgents.mockResolvedValue(paged([]));
    render(<AgentManagement />);

    expect(await screen.findByText('لا يوجد وكلاء')).toBeTruthy();
  });

  it('updates searchInput when searching (controlled)', async () => {
    shipping.getAgents.mockResolvedValue(paged([]));
    render(<AgentManagement />);

    const search = await screen.findByPlaceholderText('ابحث بالاسم أو رقم الترخيص...');
    fireEvent.change(search, { target: { value: 'alpha' } });
    expect((search as HTMLInputElement).value).toBe('alpha');
  });

  it('applies status filter (changes value)', async () => {
    shipping.getAgents.mockResolvedValue(paged([]));
    render(<AgentManagement />);

    const combo = (await screen.findAllByRole('combobox'))[0];
    fireEvent.mouseDown(combo);
    const suspended = await screen.findByRole('option', { name: 'موقوف' });
    fireEvent.click(suspended);

    expect(screen.getAllByText('موقوف').length).toBeGreaterThan(0);
  });

  it('opens the detail dialog on row click', async () => {
    shipping.getAgents.mockResolvedValue(paged([row({ status: 'SUSPENDED' })]));
    render(<AgentManagement />);

    await screen.findByText('وكيل الميناء');
    fireEvent.click(screen.getByRole('button', { name: 'عرض' }));

    expect(await screen.findByText('تفاصيل الوكيل')).toBeTruthy();
    expect(screen.getByText('بورتسودان')).toBeTruthy();
    expect(screen.getAllByText('Alpha Shipping Co.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('موقوف').length).toBeGreaterThan(0);
  });
});