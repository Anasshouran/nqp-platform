/**
 * navigation/ tab definitions — pure data.
 * Pins the exact tab list + order consumed by TabBar / AppShell.
 */
import {
  NAVIGATION_TABS,
  NAVIGATION_STATUS,
  type NavigationTab,
} from '../src/navigation';

describe('navigation/ tabs', () => {
  it('exposes the expected tab set in stable order', () => {
    expect(NAVIGATION_TABS).toEqual([
      'home',
      'travel',
      'health',
      'certificates',
      'profile',
    ]);
  });

  it('reports SCAFFOLDED status', () => {
    expect(NAVIGATION_STATUS).toBe('SCAFFOLDED');
  });

  it('every tab string is assignable to NavigationTab', () => {
    NAVIGATION_TABS.forEach((tab) => {
      const typed: NavigationTab = tab;
      expect(typeof typed).toBe('string');
    });
  });

  it('has no duplicates', () => {
    const unique = new Set(NAVIGATION_TABS);
    expect(unique.size).toBe(NAVIGATION_TABS.length);
  });
});
