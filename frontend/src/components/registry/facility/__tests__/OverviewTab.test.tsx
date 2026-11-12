vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return {
    useTranslation: () => ({
      t,
      i18n: { language: 'ar', changeLanguage: vi.fn() },
    }),
  };
});

import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewTab } from '../OverviewTab';

describe('OverviewTab', () => {
  it('renders sector/locality/entry_point names', () => {
    const node = { id: 'n1', kind: 'FACILITY', code: 'N1', name_ar: 'عقدة' } as any;
    const facility = { id: 'f1', name_ar: 'منشأة', code: 'F1', kind: 'HOSPITAL', sector: { name_ar: 'قطاع' }, locality: { name_ar: 'محلية' }, entry_point: { name_ar: 'منفذ' } } as any;
    render(<OverviewTab node={node} facility={facility} />);
    expect(screen.getByText('منشأة')).toBeInTheDocument();
    expect(screen.getByText('قطاع')).toBeInTheDocument();
    expect(screen.getByText('محلية')).toBeInTheDocument();
    expect(screen.getByText('منفذ')).toBeInTheDocument();
  });

  it('renders empty-ish (fallbacks) when data missing', () => {
    render(<OverviewTab node={null} facility={null} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
