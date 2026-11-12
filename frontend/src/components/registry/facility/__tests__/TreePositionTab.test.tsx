vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar', changeLanguage: vi.fn() },
  }),
}));

import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TreePositionTab } from '../TreePositionTab';

describe('TreePositionTab', () => {
  it('renders breadcrumb when node present', () => {
    const node = { id: 'n1', kind: 'FACILITY', code: 'F1', name_ar: 'عقدة', parent: null } as any;
    render(<TreePositionTab node={node} allNodes={[node]} />);
    expect(screen.getByText(/عقدة/)).toBeInTheDocument();
  });

  it('renders empty state when node is null', () => {
    render(<TreePositionTab node={null} allNodes={[]} />);
    // component renders nothing/empty — just no crash
    expect(document.body).toBeTruthy();
  });
});
