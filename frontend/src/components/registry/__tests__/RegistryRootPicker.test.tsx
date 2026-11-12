vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar', changeLanguage: vi.fn() },
  }),
}));

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegistryRootPicker } from '../RegistryRootPicker';
import type { ReportingNodeTree } from '../../../types/registry';

const roots: ReportingNodeTree[] = [
  { id: 'r1', kind: 'FEDERAL', code: 'FMOH', name_ar: 'وزارة الصحة', name_en: 'MOH', depth: 0, facility_id: null, children: [] },
  { id: 'r2', kind: 'FEDERAL', code: 'FMOI', name_ar: 'وزارة الداخلية', name_en: 'MOI', depth: 0, facility_id: null, children: [] },
];

describe('RegistryRootPicker', () => {
  it('renders options from roots', async () => {
    const user = userEvent.setup();
    render(<RegistryRootPicker roots={roots} value={null} onChange={vi.fn()} />);
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByText(/وزارة الصحة/)).toBeInTheDocument();
    expect(screen.getByText(/وزارة الداخلية/)).toBeInTheDocument();
  });

  it('calls onChange with id when selecting a root', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RegistryRootPicker roots={roots} value={null} onChange={onChange} />);
    const select = screen.getByRole('combobox');
    await user.click(select);
    await user.click(screen.getByText(/وزارة الصحة/));
    expect(onChange).toHaveBeenCalledWith('r1');
  });

  it('calls onChange(null) when selecting "all"', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RegistryRootPicker roots={roots} value="r1" onChange={onChange} />);
    const select = screen.getByRole('combobox');
    await user.click(select);
    await user.click(screen.getByText(/registry\.tree\.picker\.all/i));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
