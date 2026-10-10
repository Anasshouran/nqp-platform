import Box from '@mui/material/Box';
import type { BoxProps } from '@mui/material/Box';

export interface EnProps extends Omit<BoxProps, 'dir'> {
  /** Render as a different element (default: span, so it is valid inline). */
  component?: BoxProps['component'];
}

/**
 * Wraps English content inside an Arabic (RTL) document.
 *
 * Without `lang="en"` a screen reader falls back to the document language and reads
 * "Cholera" or "Sudan" with Arabic phonetics, which is unintelligible. `dir="ltr"`
 * is also set because English runs left-to-right even inside RTL flow.
 *
 * Use for prose only (names, descriptions). Alphanumeric identifiers such as
 * ICD-11 codes, passport numbers, and flight numbers are not English text —
 * give those `dir="ltr"` and `fontVariantNumeric: 'tabular-nums'` instead,
 * which the tables already do.
 */
const En = ({ component = 'span', sx, children, ...rest }: EnProps) => (
  <Box component={component} lang="en" dir="ltr" sx={sx} {...rest}>
    {children}
  </Box>
);

export default En;
