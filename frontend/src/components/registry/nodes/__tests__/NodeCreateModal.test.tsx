vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar', changeLanguage: vi.fn() },
  }),
}));

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NodeCreateModal } from '../NodeCreateModal';

vi.mock('../../../../api/endpoints/registry', () => ({
  createNode: vi.fn(),
}));

import * as api from '../../../../api/endpoints/registry';

const nodes = [{ id: 'root-1', kind: 'FEDERAL', code: 'FMOH', name_ar: 'وزارة', name_en: 'MOH', depth: 0, facility_id: null, children: [] }] as any;

describe('NodeCreateModal', () => {
  it('does not render when closed', () => {
    render(<NodeCreateModal open={false} allNodes={nodes} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders form when open', () => {
    render(<NodeCreateModal open={true} allNodes={nodes} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('submits when form complete', async () => {
    vi.mocked(api.createNode).mockResolvedValue({ id: 'n1' } as any);
    const onSaved = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<NodeCreateModal open={true} allNodes={nodes} onClose={onClose} onSaved={onSaved} />);
    // fill code + name
    const codeInput = screen.getByLabelText(/registry\.nodes\.field\.code/i);
    const nameInput = screen.getByLabelText(/registry\.nodes\.field\.name_ar/i);
    await user.type(codeInput, 'NEW');
    await user.type(nameInput, 'جديد');
    // select parent
    const parentSelect = screen.getAllByRole('combobox')[1];
    await user.click(parentSelect);
    await user.click(screen.getByText(/وزارة/));
    const saveBtn = screen.getByRole('button', { name: /save|حفظ|create/i });
    await user.click(saveBtn);
    await waitFor(() => expect(api.createNode).toHaveBeenCalled());
  });

  it('shows error on API failure', async () => {
    vi.mocked(api.createNode).mockRejectedValue(new Error('fail'));
    const user = userEvent.setup();
    render(<NodeCreateModal open={true} allNodes={nodes} onClose={vi.fn()} onSaved={vi.fn()} />);
    const codeInput = screen.getByLabelText(/registry\.nodes\.field\.code/i);
    const nameInput = screen.getByLabelText(/registry\.nodes\.field\.name_ar/i);
    await user.type(codeInput, 'NEW');
    await user.type(nameInput, 'جديد');
    const parentSelect = screen.getAllByRole('combobox')[1];
    await user.click(parentSelect);
    await user.click(screen.getByText(/وزارة/));
    const saveBtn = screen.getByRole('button', { name: /save|حفظ|create/i });
    await user.click(saveBtn);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
