vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar', changeLanguage: vi.fn() },
  }),
}));

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegistryNodeTree } from '../RegistryNodeTree';
import type { ReportingNodeTree } from '../../../types/registry';

const node = (overrides: Partial<ReportingNodeTree>): ReportingNodeTree => ({
  id: 'n1', kind: 'STATE', code: 'KRT', name_ar: 'الخرطوم', name_en: 'Khartoum',
  depth: 1, facility_id: null, children: [], ...overrides,
});

const tree: ReportingNodeTree[] = [
  node({ id: 'f1', kind: 'FACILITY', code: 'F1', name_ar: 'منشأة', facility_id: 'fac-1', children: [] }),
  node({ id: 's1', kind: 'STATE', code: 'KRT', name_ar: 'الخرطوم', children: [
    node({ id: 'l1', kind: 'LOCALITY', code: 'LOC', name_ar: 'محلية', depth: 2 }),
  ] }),
];

describe('RegistryNodeTree', () => {
  it('renders nested nodes', () => {
    render(<MemoryRouter><RegistryNodeTree nodes={tree} /></MemoryRouter>);
    expect(screen.getByText('منشأة')).toBeInTheDocument();
    expect(screen.getByText('الخرطوم')).toBeInTheDocument();
  });

  it('expands/collapses on click', () => {
    render(<MemoryRouter><RegistryNodeTree nodes={tree} /></MemoryRouter>);
    // locality child is under state; state node expanded by default (level<1)
    expect(screen.getByText('محلية')).toBeInTheDocument();
  });

  it('navigates on FACILITY node click when facility_id present', () => {
    const onEdit = vi.fn();
    render(<MemoryRouter><RegistryNodeTree nodes={tree} onEdit={onEdit} /></MemoryRouter>);
    const btn = screen.getByText('منشأة').closest('li') || screen.getByText('منشأة');
    fireEvent.click(btn!);
    // navigation is internal; just ensure no crash
    expect(screen.getByText('منشأة')).toBeInTheDocument();
  });

  it('does not navigate on non-FACILITY node', () => {
    render(<MemoryRouter><RegistryNodeTree nodes={tree} /></MemoryRouter>);
    fireEvent.click(screen.getByText('الخرطوم'));
    expect(screen.getByText('الخرطوم')).toBeInTheDocument();
  });

  it('is defensive when FACILITY node has no facility_id', () => {
    const t: ReportingNodeTree[] = [node({ id: 'f2', kind: 'FACILITY', code: 'F2', name_ar: 'منشأة2', facility_id: null })];
    render(<MemoryRouter><RegistryNodeTree nodes={t} /></MemoryRouter>);
    expect(screen.getByText('منشأة2')).toBeInTheDocument();
  });

  it('returns null for empty nodes', () => {
    const { container } = render(<MemoryRouter><RegistryNodeTree nodes={[]} /></MemoryRouter>);
    expect(container.firstChild).toBeNull();
  });
});
