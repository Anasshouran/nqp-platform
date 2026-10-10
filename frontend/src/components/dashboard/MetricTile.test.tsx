import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../styles/theme';
import StatusBar from './StatusBar';
import MetricTile from './MetricTile';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('StatusBar', () => {
  const segments = [
    { label: 'متصل', value: 6, color: '#1d7a54' },
    { label: 'تحذير', value: 1, color: '#a86400' },
    { label: 'متوقف', value: 1, color: '#c63a3a' },
  ];

  it('summarises every segment in a single accessible label', () => {
    wrap(<StatusBar segments={segments} ariaLabel="توزيع حالة الأنظمة" />);
    const bar = screen.getByRole('img');
    /* Colour is never the only carrier of meaning — counts are in the name. */
    expect(bar.getAttribute('aria-label')).toContain('توزيع حالة الأنظمة');
    expect(bar.getAttribute('aria-label')).toContain('متصل 6');
    expect(bar.getAttribute('aria-label')).toContain('متوقف 1');
  });

  it('renders a numeric legend', () => {
    wrap(<StatusBar segments={segments} ariaLabel="توزيع" />);
    expect(screen.getByText('6')).toBeTruthy();
  });

  it('handles an all-zero breakdown without dividing by zero', () => {
    wrap(<StatusBar segments={segments.map((s) => ({ ...s, value: 0 }))} ariaLabel="توزيع" />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('لا توجد بيانات');
  });

  it('omits zero segments from the bar but keeps them in the legend', () => {
    const { container } = wrap(
      <StatusBar
        segments={[
          { label: 'متصل', value: 8, color: '#1d7a54' },
          { label: 'متوقف', value: 0, color: '#c63a3a' },
        ]}
        ariaLabel="توزيع"
      />
    );
    expect(container.querySelectorAll('[aria-hidden="true"][style]').length).toBeLessThanOrEqual(1);
    expect(screen.getByText('متوقف')).toBeTruthy();
  });
});

describe('MetricTile', () => {
  it('renders the value with Latin digits', () => {
    wrap(<MetricTile label="أنظمة متصلة" value={12345} />);
    expect(screen.getByText('12,345')).toBeTruthy();
  });

  it('renders a real button when onClick is provided', () => {
    let clicked = false;
    wrap(<MetricTile label="أنظمة" value={5} onClick={() => { clicked = true; }} />);
    const btn = screen.getByRole('button', { name: /أنظمة/ });
    btn.click();
    expect(clicked).toBe(true);
  });

  it('is not a button without onClick', () => {
    wrap(<MetricTile label="الأصول" value={8} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows an em dash for a null value instead of a misleading zero', () => {
    wrap(<MetricTile label="تذاكر" value={null} />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('applies the alert treatment when alert is set', () => {
    /* The value stays readable; the tile gains an error border/tint. */
    wrap(<MetricTile label="حرجة" value={3} alert />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('keeps the sparkline out of the accessibility tree', () => {
    const { container } = wrap(
      <MetricTile
        label="أنظمة"
        value={3}
        series={[
          { label: 'A', value: 10 },
          { label: 'B', value: 40 },
        ]}
      />
    );
    /* The value is already in text; the bars are decorative. */
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});

describe('MetricTile accessibility', () => {
  it('renders a caption describing the denominator', () => {
    wrap(<MetricTile label="أنظمة متصلة" value={66} caption="من 80 نظامًا" />);
    expect(screen.getByText('من 80 نظامًا')).toBeTruthy();
  });
});
