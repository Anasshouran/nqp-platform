vi.mock('react-i18next', () => {
  const t = (key: string) => key;
  return {
    useTranslation: () => ({
      t,
      i18n: { language: 'ar', changeLanguage: vi.fn() },
    }),
  };
});

vi.mock('../../../api/endpoints/registry', () => ({
  getRegistryTree: vi.fn(),
}));

import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { RegistryTreeSelector, type SelectedNode } from '../RegistryTreeSelector';
import { getRegistryTree } from '../../../api/endpoints/registry';
import type { ReportingNodeTree } from '../../../types/registry';

const mockTree: ReportingNodeTree[] = [
  {
    id: 'fed-1',
    kind: 'FEDERAL',
    code: 'FMOH',
    name_ar: 'وزارة الصحة',
    name_en: 'MoH',
    depth: 0,
    facility_id: null,
    children: [
      {
        id: 'st-1',
        kind: 'STATE',
        code: 'KRT',
        name_ar: 'الخرطوم',
        name_en: 'Khartoum',
        depth: 1,
        facility_id: null,
        children: [
          {
            id: 'loc-1',
            kind: 'LOCALITY',
            code: 'KRT_C',
            name_ar: 'محلية الخرطوم',
            name_en: 'Khartoum Central',
            depth: 2,
            facility_id: null,
            children: [
              {
                id: 'fac-1',
                kind: 'FACILITY',
                code: 'FAC_A',
                name_ar: 'منشأة أ',
                name_en: 'Facility A',
                depth: 3,
                facility_id: 'hf-1',
                children: [],
              },
              {
                id: 'fac-2',
                kind: 'FACILITY',
                code: 'FAC_B',
                name_ar: 'منشأة ب',
                name_en: 'Facility B',
                depth: 3,
                facility_id: 'hf-2',
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
];

const setup = (props: Partial<Parameters<typeof RegistryTreeSelector>[0]> = {}) => {
  const onChange = vi.fn();
  const utils = render(<RegistryTreeSelector value={null} onChange={onChange} {...props} />);
  return { onChange, ...utils };
};

describe('RegistryTreeSelector', () => {
  beforeEach(() => {
    vi.mocked(getRegistryTree).mockReset();
  });

  it('renders FACILITY nodes only by default', async () => {
    vi.mocked(getRegistryTree).mockResolvedValue(mockTree);
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole('combobox'));

    expect(await screen.findByRole('option', { name: /منشأة أ/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /منشأة ب/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /محلية الخرطوم/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /الخرطوم/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /وزارة الصحة/ })).not.toBeInTheDocument();
  });

  it('filters by kind when kindFilter is provided', async () => {
    vi.mocked(getRegistryTree).mockResolvedValue(mockTree);
    const user = userEvent.setup();
    setup({ kindFilter: ['LOCALITY'] });

    await user.click(await screen.findByRole('combobox'));

    expect(await screen.findByRole('option', { name: /محلية الخرطوم/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /منشأة أ/ })).not.toBeInTheDocument();
  });

  it('calls onChange with nodeId + facilityId on select', async () => {
    vi.mocked(getRegistryTree).mockResolvedValue(mockTree);
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.click(await screen.findByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /منشأة أ/ }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: 'fac-1',
        facilityId: 'hf-1',
        code: 'FAC_A',
        nameAr: 'منشأة أ',
        kind: 'FACILITY',
      }),
    );
  });

  it('calls onChange(null) on clear', async () => {
    vi.mocked(getRegistryTree).mockResolvedValue(mockTree);
    const user = userEvent.setup();
    const onChange = vi.fn();

    // Harness: قيمة محكومة — إعادة render بعد الاختيار حتى يظهر زر المسح (كما في الواقع).
    let current: SelectedNode | null = null;
    const Harness = () => {
      const [, set] = useState<SelectedNode | null>(null);
      const handle = (n: SelectedNode | null) => { current = n; onChange(n); set(n); };
      return <RegistryTreeSelector value={current} onChange={handle} />;
    };
    const { container } = render(<Harness />);

    await user.click(await screen.findByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: /منشأة أ/ }));
    expect(onChange).toHaveBeenCalledTimes(1);

    await user.click(container.querySelector('.MuiAutocomplete-clearIndicator') as HTMLElement);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('shows loading while fetching', async () => {
    vi.mocked(getRegistryTree).mockImplementation(() => new Promise(() => {}));
    setup();

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });
});
