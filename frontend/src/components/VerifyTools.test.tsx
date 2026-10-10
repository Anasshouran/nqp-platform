import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import VerifyTools from './VerifyTools';

describe('VerifyTools — ارتباطات تبويبات سليمة (a11y)', () => {
  it('كل تبويب يملك id و aria-controls يشيران إلى لوحة موجودة، وكل لوحة مرتبطة بتبويبها', () => {
    const { container } = render(<VerifyTools />);

    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBeGreaterThan(0);

    for (const tab of Array.from(tabs)) {
      const id = tab.getAttribute('id');
      const controls = tab.getAttribute('aria-controls');
      expect(id).toBeTruthy();
      expect(controls).toBeTruthy();
      // لا علاقات معلّقة: يجب أن توجد اللوحة المُشار إليها فعلاً.
      const panel = container.querySelector(`#${controls}`);
      expect(panel).not.toBeNull();
      expect(panel?.getAttribute('role')).toBe('tabpanel');
      expect(panel?.getAttribute('aria-labelledby')).toBe(id);
    }
  });
});