import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import FavoriteIcon from '@mui/icons-material/Favorite';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
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
  const heart = product === 'afyatna';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ...sx }}>
      <Box
        sx={{
          width: size === 'md' ? 46 : 38,
          height: size === 'md' ? 46 : 38,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
          background: light ? 'rgba(255,255,255,0.15)' : 'linear-gradient(135deg, #0c7f6a, #0a6b58)',
          boxShadow: light ? 'none' : '0 8px 18px rgba(12,127,106,0.32)',
          color: '#fff',
          flexShrink: 0,
        }}
      >
        {heart && (
          <VerifiedUserIcon
            sx={{
              position: 'absolute',
              fontSize: size === 'md' ? 34 : 28,
              color: 'rgba(255,255,255,0.4)',
            }}
          />
        )}
        {heart && (
          <FavoriteIcon sx={{ fontSize: size === 'md' ? 24 : 20, color: '#ffd9d9', zIndex: 1 }} />
        )}
        {!heart && <HealthAndSafetyIcon sx={{ fontSize: size === 'md' ? 26 : 22 }} />}
      </Box>
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
