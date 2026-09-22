import Card, { type CardProps } from '@mui/material/Card';
import type { ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Collapse from '@mui/material/Collapse';

export const SectionCard = ({ id, variant = 'outlined', children, ...rest }: { id: string; variant?: CardProps['variant'] } & CardProps) => (
  <Card id={id} variant={variant} sx={{ borderRadius: 3, p: 3, mb: 0, ...rest.sx }} {...rest}>
    {children}
  </Card>
);

export const SectionHeading = ({
  icon, title, subtitle, action,
}: { icon?: ReactNode; title: string; subtitle?: string; action?: ReactNode }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1.5 }}>
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
      <Box sx={{ display: 'flex', color: 'primary.main' }}>{icon}</Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Stack>
    {action}
  </Box>
);

export const FieldGrid = ({ children }: { children: ReactNode }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
    {children}
  </Box>
);

export const ToggleForm = ({ open, onToggle, title, children }: { open?: boolean; onToggle?: () => void; title?: string; children: ReactNode }) => (
  <Card variant="outlined" sx={{ borderRadius: 3, p: 3, mb: 2 }}>
    {title && (
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2, color: 'primary.main' }}>{title}</Typography>
    )}
    {children}
  </Card>
);
