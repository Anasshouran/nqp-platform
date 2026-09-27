import type { ReactNode } from 'react';

export type Density = 'comfortable' | 'compact';

export interface DensityProviderProps {
  density?: Density;
  children: ReactNode;
}

/**
 * Scopes layout density to a subtree.
 *
 * The comfortable scale (28px card padding, 48px controls) is tuned for the
 * public site. Operational screens — port counters, lab benches, clerk queues —
 * need the vertical budget for rows, so they opt into `compact` (16px / 40px).
 *
 * Implemented as a `data-density` attribute rather than a nested ThemeProvider,
 * so it composes with the existing theme, needs no re-merge, and costs nothing
 * at runtime. Any descendant can nest a different density to opt back out.
 *
 * ```tsx
 * <DensityProvider density="compact">
 *   <DataTable ... />
 * </DensityProvider>
 * ```
 */
const DensityProvider = ({ density = 'comfortable', children }: DensityProviderProps) => (
  <div data-density={density} style={{ display: 'contents' }}>
    {children}
  </div>
);

export default DensityProvider;
