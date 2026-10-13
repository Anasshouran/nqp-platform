/**
 * features/ scaffold — the domain is intentionally gated until M2.
 * This test pins that decision so an accidental change is caught.
 */
import { FEATURES_STATUS } from '../src/features';

describe('features/ scaffold', () => {
  it('is marked SCAFFOLDED (not implemented yet)', () => {
    expect(FEATURES_STATUS).toBe('SCAFFOLDED');
  });

  it('exposes a narrow literal type (compile-time assertion)', () => {
    const isScaffolded: 'SCAFFOLDED' = FEATURES_STATUS;
    expect(isScaffolded).toBe('SCAFFOLDED');
  });
});
