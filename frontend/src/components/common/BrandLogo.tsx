import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';

interface BrandLogoProps {
  compact?: boolean;
  light?: boolean;
  size?: 'sm' | 'md';
  product?: 'nqp' | 'afyatna';
  sx?: SxProps<Theme>;
}

const PRODUCT_COPY = {
  nqp: { title: 'الإدارة الاتحادية للحجر الصحي', subtitle: 'جمهورية السودان' },
  afyatna: { title: 'عافيتنا', subtitle: 'AFYATNA — منصة الحجر الصحي القومي' },
} as const;

const BrandLogo = ({ compact = false, light = false, size = 'md', product = 'nqp', sx }: BrandLogoProps) => {
  const { title, subtitle } = PRODUCT_COPY[product];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ...sx }}>
      <Box
        component="img"
        src="/logo.jpg"
        alt={title}
        sx={{
          width: size === 'md' ? 46 : 38,
          height: size === 'md' ? 46 : 38,
          borderRadius: 2,
          objectFit: 'cover',
          flexShrink: 0,
          boxShadow: light ? 'none' : '0 8px 18px rgba(12,127,106,0.32)',
        }}
      />
      {!compact && (
        <Box>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.2,
              color: light ? '#fff' : 'text.primary',
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: light ? 'rgba(255,255,255,0.75)' : 'text.secondary' }}
          >
            {subtitle}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default BrandLogo;
