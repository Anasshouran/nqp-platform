import type { ReactNode } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import type { SxProps, Theme } from '@mui/material/styles';

export interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  sx?: SxProps<Theme>;
  children: ReactNode;
}

const SectionCard = ({ title, subtitle, action, sx, children }: SectionCardProps) => (
  <Card
    sx={{
      borderRadius: 4,
      border: '1px solid rgba(16,40,34,0.07)',
      bgcolor: 'rgba(255,255,255,0.86)',
      backdropFilter: 'blur(18px) saturate(1.35)',
      boxShadow: '0 1px 2px rgba(16,40,34,0.03), 0 10px 30px rgba(16,40,34,0.06)',
      overflow: 'hidden',
      ...sx,
    }}
  >
    {(title || action) && (
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ px: 3, pt: 2.75, pb: title ? 1 : 2.75, gap: 2, flexWrap: 'wrap' }}
      >
        <BoxTitle title={title} subtitle={subtitle} />
        {action}
      </Stack>
    )}
    <CardContent sx={{ pt: title ? 0.5 : 2.75 }}>{children}</CardContent>
  </Card>
);

const BoxTitle = ({ title, subtitle }: { title?: string; subtitle?: string }) => (
  <Stack spacing={0.25}>
    {title && (
      <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
        {title}
      </Typography>
    )}
    {subtitle && (
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    )}
  </Stack>
);

export default SectionCard;