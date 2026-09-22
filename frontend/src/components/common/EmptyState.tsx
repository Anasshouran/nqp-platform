import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

const EmptyState = ({ icon, title, description, action }: EmptyStateProps) => (
  <Box
    sx={{
      textAlign: 'center',
      py: 8,
      px: 3,
      borderRadius: 4,
      border: '1.5px dashed rgba(12,127,106,0.3)',
      bgcolor: 'rgba(12,127,106,0.03)',
      backgroundImage: 'radial-gradient(circle, rgba(12,127,106,0.12) 1px, transparent 1px)',
      backgroundSize: '22px 22px',
    }}
  >
    {icon && (
      <Box
        aria-hidden
        sx={{
          width: 76,
          height: 76,
          mx: 'auto',
          mb: 2,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          color: 'primary.main',
          bgcolor: 'primary.lighter',
          border: '1px solid rgba(12,127,106,0.18)',
          boxShadow: '0 12px 32px -12px rgba(12,127,106,0.35)',
        }}
      >
        {icon}
      </Box>
    )}
    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: action ? 2.5 : 0, mx: 'auto', maxWidth: 420 }}>
        {description}
      </Typography>
    )}
    {action}
  </Box>
);

export default EmptyState;