import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

interface CommandSectionProps {
  /** Must match an id in the sections passed to useCommandSections. */
  id: string;
  /** Supply register(id) from useCommandSections. */
  register: (id: string) => (el: HTMLElement | null) => void;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * Scroll-anchor wrapper for a dashboard section. Renders a block with a
 * data-section attribute observed by the rail's IntersectionObserver.
 */
const CommandSection = ({ id, register, children, sx }: CommandSectionProps) => (
  <Box
    ref={register(id)}
    data-section={id}
    sx={{ scrollMarginTop: { xs: 104, md: 88 }, ...sx }}
  >
    {children}
  </Box>
);

export default CommandSection;