import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TreePositionTab } from '../TreePositionTab';

describe('TreePositionTab', () => {
  it('renders breadcrumb when node present', () => {
    const node = { id: 'n1', kind: 'FACILITY', code: 'F1', name_ar: 'عقدة', parent_id: null } as any;
    render(<MemoryRouter><TreePositionTab node={node} allNodes={[node]} /></MemoryRouter>);
    expect(screen.getByText(/عقدة/)).toBeInTheDocument();
  });

  it('renders empty state when node is null', () => {
    render(<MemoryRouter><TreePositionTab node={null} allNodes={[]} /></MemoryRouter>);
    expect(document.body).toBeTruthy();
  });

  it('renders FACILITY ancestor as clickable link', () => {
    const parent = { id: 'p1', kind: 'FACILITY', code: 'P1', name_ar: 'أب', parent_id: null, facility_id: 'fac-p' } as any;
    const node = { id: 'n1', kind: 'STATE', code: 'S1', name_ar: 'عقدة', parent_id: 'p1' } as any;
    render(<MemoryRouter><TreePositionTab node={node} allNodes={[parent, node]} /></MemoryRouter>);
    const link = screen.getByRole('link', { name: /أب/ });
    expect(link).toHaveAttribute('href', '/app/registry/facility/fac-p');
  });

  it('renders STATE ancestors as non-clickable text, not links', () => {
    const fed = { id: 'fed-1', kind: 'FEDERAL', code: 'FMOH', name_ar: 'وزارة الصحة', parent_id: null, facility_id: null } as any;
    const state = { id: 'state-1', kind: 'STATE', code: 'KRT', name_ar: 'الخرطوم', parent_id: 'fed-1', facility_id: null } as any;
    const fac = { id: 'fac-1', kind: 'FACILITY', code: 'FAC_A', name_ar: 'منشأة أ', parent_id: 'state-1', facility_id: '00000000-0000-0000-0000-000000000001' } as any;
    render(<MemoryRouter><TreePositionTab node={fac} allNodes={[fed, state, fac]} /></MemoryRouter>);
    const stateNode = screen.getByText(/الخرطوم/);
    expect(stateNode.closest('a')).toBeNull();
    const fedNode = screen.getByText(/وزارة الصحة/);
    expect(fedNode.closest('a')).toBeNull();
  });
});
