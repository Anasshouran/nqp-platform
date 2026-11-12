vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar', changeLanguage: vi.fn() },
  }),
}));

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NodeEditModal } from '../NodeEditModal';

vi.mock('../../../../api/endpoints/registry', () => ({
  updateNode: vi.fn(),
}));

import * as api from '../../../../api/endpoints/registry';

const node = { id: 'n1', kind: 'STATE', code: 'KRT', name_ar: 'الخرطوم', name_en: 'Khartoum', depth: 1, facility_id: null, children: [] } as any;

describe('NodeEditModal', () => {
  it('does not render when closed', () => {
    render(<NodeEditModal open={false} node={node} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('pre-fills form with node data', () => {
    render(<NodeEditModal open={true} node={node} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByDisplayValue('الخرطوم')).toBeInTheDocument();
    expect(screen.getByDisplayValue('KRT')).toBeInTheDocument();
  });

  it('kind & parent are disabled', () => {
    render(<NodeEditModal open={true} node={node} onClose={vi.fn()} onSaved={vi.fn()} />);
    const kindField = screen.getByDisplayValue('STATE');
    expect(kindField).toBeDisabled();
  });

  it('submits patch on save', async () => {
    vi.mocked(api.updateNode).mockResolvedValue({ id: 'n1' } as any);
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<NodeEditModal open={true} node={node} onClose={vi.fn()} onSaved={onSaved} />);
    const saveBtn = screen.getByRole('button', { name: /save|حفظ|update/i });
    await user.click(saveBtn);
    await waitFor(() => expect(api.updateNode).toHaveBeenCalled());
  });

  it('shows error on API failure', async () => {
    vi.mocked(api.updateNode).mockRejectedValue(new Error('fail'));
    const user = userEvent.setup();
    render(<NodeEditModal open={true} node={node} onClose={vi.fn()} onSaved={vi.fn()} />);
    const saveBtn = screen.getByRole('button', { name: /save|حفظ|update/i });
    await user.click(saveBtn);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
