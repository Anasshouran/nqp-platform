/**
 * ReportsPageShell — shared report-page chrome.
 * Verifies the header, KPI grid, content sections and optional slots render.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportsPageShell } from '../ReportsPageShell';

describe('ReportsPageShell', () => {
  it('renders the header, KPI grid and content sections', () => {
    render(
      <ReportsPageShell title="تقرير تجريبي" subtitle="وصف التقرير" kpis={<div>KPI1</div>}>
        <div>SEC1</div>
      </ReportsPageShell>,
    );

    expect(screen.getByText('تقرير تجريبي')).toBeTruthy();
    expect(screen.getByText('وصف التقرير')).toBeTruthy();
    expect(screen.getByText('KPI1')).toBeTruthy();
    expect(screen.getByText('SEC1')).toBeTruthy();
  });

  it('exposes the eyebrow chip', () => {
    render(
      <ReportsPageShell eyebrow="التقارير" title="T" kpis={null}>
        <div>S</div>
      </ReportsPageShell>,
    );

    expect(screen.getByText('التقارير')).toBeTruthy();
  });

  it('renders the action and headerExtra slots', () => {
    render(
      <ReportsPageShell
        title="T"
        action={<button type="button">ACT</button>}
        headerExtra={<div>EXTRA</div>}
        kpis={<div>K</div>}
      >
        <div>S</div>
      </ReportsPageShell>,
    );

    expect(screen.getByRole('button', { name: 'ACT' })).toBeTruthy();
    expect(screen.getByText('EXTRA')).toBeTruthy();
  });
});
